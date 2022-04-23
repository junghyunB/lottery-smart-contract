const Lottery = artifacts.require("Lottery");
const { assert } = require("chai");
const assertRevert = require("./assertRevet");
const expectEvent = require("./expectEvent");

contract("Lottery", function([deployer, user1, user2]){
    let lottery;
    let betAmount = 5 * 10 ** 15;
    let bet_block_interval = 3;
    let betAmountBN = new web3.utils.BN("5000000000000000");
    beforeEach(async () => {
        lottery = await Lottery.new();
    })
    it("getPot should return current pot", async() => {
        let pot = await lottery.getPot();
        assert.equal(pot, 0);
    }) 
    describe("Bet", function () {
        it("should fail when the bet money is not 0.005 ETH", async() => {
            // Fail transaction
           await assertRevert(lottery.bet('0xab', {from : user1, value: 4 * 10 * 15}));
            // transaction object ( chainId, value, to from, gasLimit, gasPrice)
        }) 
        it("should put the bet to the bet queue with 1 bet", async() => {
           // bet
           let receipt = await lottery.bet('0xab', {from : user1, value: betAmount});
        //    console.log(receipt);
           let pot = await lottery.getPot();
           assert.equal(pot, 0);
           // check contract Balance == 0.005
           let contractBalance = await web3.eth.getBalance(lottery.address);
           assert.equal(contractBalance, betAmount);
           // check bet info
            let currentBlockNumber = await web3.eth.getBlockNumber();
            let bet = await lottery.getBetInfo(0);
            assert.equal(bet.answerBlockNumber, currentBlockNumber + bet_block_interval);
            assert.equal(bet.bettor, user1);
            assert.equal(bet.challenges, '0xab');

           // check log
            await expectEvent.inLogs(receipt.logs, "BET");
        })   
    })

    describe("Distribute", function() {
        describe("when the answer is checkable", function () {
            it("should give the user the pot when the answer mathces", async() => {
                // 두 글자 다 맞혔을 떄
                // 베팅, 분배가 여러번 일어날때               
     
                await lottery.setAnswerForTest("0xab439950a17c26eb3ae0d0c55ae8d6e61e5313650b14c6f26632280af6459c8a", {from : deployer});
                await lottery.betAndDistribute("0xef", {from : user2, value: betAmount}); //1 -> 4
                await lottery.betAndDistribute("0xef", {from : user2, value: betAmount}); //2 -> 5
                await lottery.betAndDistribute("0xab", {from : user1, value: betAmount}); //3 -> 6
                await lottery.betAndDistribute("0xef", {from : user2, value: betAmount}); //4 -> 7
                await lottery.betAndDistribute("0xef", {from : user2, value: betAmount}); //5 -> 8
                await lottery.betAndDistribute("0xef", {from : user2, value: betAmount}); //6 -> 9

                let potBefore = await lottery.getPot(); // 0.01 ETH
                let user1BalanceBefore = await web3.eth.getBalance(user1);
                let receipt7 = await lottery.betAndDistribute("0xef", {from : user2, value: betAmount}); //7 -> 10 7번블록에서 정답을 체크하고 user1에게 팟머니를 전달 할 수 있음

                let potAfter = await lottery.getPot(); // 0 ETH
                let user1BalanceAfter = await web3.eth.getBalance(user1); // before에 비해서 0.015 ETH만큼 증가

                // 팟 머니의 변화량 확인
                assert.equal(potBefore.toString(), new web3.utils.BN("10000000000000000").toString());
                assert.equal(potAfter.toString(), new web3.utils.BN("0").toString());

                // 승리한 유저의 보유금액을 확인
                user1BalanceBefore = new web3.utils.BN(user1BalanceBefore);
                assert.equal(user1BalanceBefore.add(potBefore).add(betAmountBN).toString(), new web3.utils.BN(user1BalanceAfter).toString());

            })
            it("should give the user the amount he or she bet when a single character matches", async() => {
                // 한 글자 맞혔을 떄
                await lottery.setAnswerForTest("0xab439950a17c26eb3ae0d0c55ae8d6e61e5313650b14c6f26632280af6459c8a", {from : deployer});
                await lottery.betAndDistribute("0xef", {from : user2, value: betAmount}); //1 -> 4
                await lottery.betAndDistribute("0xef", {from : user2, value: betAmount}); //2 -> 5
                await lottery.betAndDistribute("0xaf", {from : user1, value: betAmount}); //3 -> 6
                await lottery.betAndDistribute("0xef", {from : user2, value: betAmount}); //4 -> 7
                await lottery.betAndDistribute("0xef", {from : user2, value: betAmount}); //5 -> 8
                await lottery.betAndDistribute("0xef", {from : user2, value: betAmount}); //6 -> 9

                let potBefore = await lottery.getPot(); // 0.01 ETH
                let user1BalanceBefore = await web3.eth.getBalance(user1);
                let receipt7 = await lottery.betAndDistribute("0xef", {from : user2, value: betAmount}); //7 -> 10 7번블록에서 정답을 체크하고 user1에게 팟머니를 전달 할 수 있음

                let potAfter = await lottery.getPot(); // 0.01 ETH
                let user1BalanceAfter = await web3.eth.getBalance(user1); // before에 비해서 0.005 ETH만큼 증가

                // 팟 머니의 변화량 확인
                assert.equal(potBefore.toString(), potAfter.toString());

                // 무승부 유저의 보유금액을 확인
                user1BalanceBefore = new web3.utils.BN(user1BalanceBefore);
                assert.equal(user1BalanceBefore.add(betAmountBN).toString(), new web3.utils.BN(user1BalanceAfter).toString());
            })
            it.only("should get the eth user when the anser does not match at all", async() => {
                // 두 글자 다 틀렸을 떄
                await lottery.setAnswerForTest("0xab439950a17c26eb3ae0d0c55ae8d6e61e5313650b14c6f26632280af6459c8a", {from : deployer});
                await lottery.betAndDistribute("0xef", {from : user2, value: betAmount}); //1 -> 4
                await lottery.betAndDistribute("0xef", {from : user2, value: betAmount}); //2 -> 5
                await lottery.betAndDistribute("0xef", {from : user1, value: betAmount}); //3 -> 6
                await lottery.betAndDistribute("0xef", {from : user2, value: betAmount}); //4 -> 7
                await lottery.betAndDistribute("0xef", {from : user2, value: betAmount}); //5 -> 8
                await lottery.betAndDistribute("0xef", {from : user2, value: betAmount}); //6 -> 9

                let potBefore = await lottery.getPot(); // 0.01 ETH
                let user1BalanceBefore = await web3.eth.getBalance(user1);
                let receipt7 = await lottery.betAndDistribute("0xef", {from : user2, value: betAmount}); //7 -> 10 7번블록에서 정답을 체크하고 user1에게 팟머니를 전달 할 수 있음

                let potAfter = await lottery.getPot(); // 0.015 ETH
                let user1BalanceAfter = await web3.eth.getBalance(user1); // before

                // 팟 머니의 변화량 확인
                assert.equal(potBefore.add(betAmountBN).toString(), potAfter.toString());

                // 실패 유저의 보유금액을 확인
                user1BalanceBefore = new web3.utils.BN(user1BalanceBefore);
                assert.equal(user1BalanceBefore.toString(), new web3.utils.BN(user1BalanceAfter).toString());
            })
        })
        describe("When the answer is not revealed(Not Mined)", function () {

        })
        describe("When the answer is not revealed(Block limit is passed)", function () {

        })
    })


    describe("isMatch", function () {
        let blockHash = '0xab439950a17c26eb3ae0d0c55ae8d6e61e5313650b14c6f26632280af6459c8a'
        it("should be BettingResult.Win when two characters match", async () => {           
            let matchingResult = await lottery.isMatch("0xab", blockHash);
            assert.equal(matchingResult, 1);
        })

        it("should be BettingResult.Fail when two characters match", async () => {           
            let matchingResult = await lottery.isMatch("0xbc", blockHash);
            assert.equal(matchingResult, 0);
        })

        it("should be BettingResult.Draw when two characters match", async () => {           
            let matchingResult = await lottery.isMatch("0xac", blockHash);
            assert.equal(matchingResult, 2);
        })
    })
});