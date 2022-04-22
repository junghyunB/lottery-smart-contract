// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

/* 
Lottery 규칙
1. + 3번쨰의 블록해쉬의 첫 두글자 맞추기 '0xab....'
a. 유저가 던진 트랜젝션이 들어가는 블록 + 3의 블록해쉬와 값을 비교

2. 팟 머니
a. 결과가 나왔을떄만 유저가 보낸 돈을 팟머니에 쌓기
b. 여러명이 맞추었을때는 가장 먼저 맞춘 사람이 팟 머니를 가져간다.
c. 두 글자 중 하나만 맞추었을 떄는 보낸 돈을 돌려준다. 0.005ETH : 5 * 10 ** 15 wei
d. 결과값을 검증 할 수 없을 떄에는 보낸 돈을 돌려준다.
*/

contract Lottery {
    struct BetInfo {
        uint256 answerBlockNumber; // 정답이 들어있는 블록 번호
        address payable bettor; // 배팅한사람 주소
        bytes challenges; // ex : 0xab Lottery 문제
    }

    uint256 private _tail; 
    uint256 private _head;
    mapping (uint256 => BetInfo) private _bets;  // bets라는 이름의 queue로 값이 들어오게 되면 tail이 증가 0번부터 head값부터 값을 정의
    address public owner; // contract 배포자


    uint256 constant internal BLOCK_LIMIT = 256; // 최대 256번쨰 블록까지 확인가능
    uint256 constant internal BET_BLOCK_INTERVAL = 3; // +3 번쨰 블록에 배팅
    uint256 constant internal BET_AMOUNT = 5 * 10 ** 15; // 배팅 머니
    uint256 private _pot; // 배팅 모금함

    event BET(uint256 index, address bettor, uint256 amount, bytes challenges, uint256 answerBlockNumber);

    constructor() {
        owner = msg.sender;
    }

    /** 
    * @dev 배팅을 한다. 유저는 0.005 ETH를 보내야 하고, 배팅을 1byte 글자를 보낸다.
    * 큐에 저장된 배팅 정보는 이후 distribute 함수에서 해결한다.
    */

    // 배팅 함수
    function bet(bytes memory challenges) public payable returns (bool result) {
        // 돈이 제대로 들어왔는지 확인
        require(msg.value == BET_AMOUNT, "Not enough ETH");
        // queue bet정보를 넣음
        require(pushBet(challenges), "Fail to add a new ");
        // 이벤트 로그
        emit BET(_tail -1, msg.sender, msg.value, challenges, block.number + BET_BLOCK_INTERVAL);
        return true;
    }



    // 배팅모금함 조회 함수
    function getPot() public view returns (uint256 pot) {
        return _pot;
    }

    // 배팅 함수() queue에 값을 저장

    // 검증 함수() 결과값을 검증 값이 틀리면은 팟머니에 넣고 값이 맞으면은 돌려주는 함수

    function getBetInfo(uint256 index) public view returns (uint256 answerBlockNumber, address bettor, bytes memory challenges) {
        BetInfo memory b = _bets[index];
        answerBlockNumber = b.answerBlockNumber;
        bettor = b.bettor;
        challenges = b.challenges;
    }

    function pushBet(bytes memory challenges) internal returns (bool) {
         BetInfo memory b;
         b.bettor = payable(msg.sender);
         b.answerBlockNumber = block.number + BET_BLOCK_INTERVAL;
         b.challenges = challenges;

         _bets[_tail] = b;
         _tail++;

         return true;
    }

    function popBet(uint256 index) internal returns (bool) {
        delete _bets[index];
        return true;
    }
}