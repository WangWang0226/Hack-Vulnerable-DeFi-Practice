// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ClimberVault.sol";

/**
 * @title ClimberVaultV2
 * @dev This contract is an upgrade to the ClimberVault contract, adding functionality to withdraw all tokens.
 */
contract ClimberVaultV2 is ClimberVault {
    /**
     * @notice Withdraws all tokens of the specified ERC20 token from the contract.
     * @dev This function can only be called by the owner of the contract.
     * @param tokenAddress The address of the ERC20 token to withdraw.
     */
    function withdrawAll(address tokenAddress) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        require(token.transfer(msg.sender, token.balanceOf(address(this))), "Transfer failed");
    }
}
