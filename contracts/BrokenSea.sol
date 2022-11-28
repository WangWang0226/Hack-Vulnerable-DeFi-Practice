pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract BrokenSea_P {
    using SafeERC20 for ERC20;

    struct Offer {
        address erc721Address;
        uint256 nftID;
        address erc20Address;
        uint256 amount;
    }
    mapping(address => Offer) offers;

    //買 nft
    function createOffer(
        ERC721 erc721Token,
        uint256 erc721TokenId,
        ERC20 erc20Token,
        uint256 amount
    )
        external
    {
        require(erc721Token.ownerOf(erc721TokenId) != msg.sender, "BrokenSea::createOffer/OWNER_ALREADY_HAVE_THIS_NFT");
        Offer memory offer = Offer(address(erc721Token), erc721TokenId, address(erc20Token), amount);
        offers[msg.sender]= offer;
    }

    //正常設計：賣 nft
    //漏洞：seller = attacker ，變成把 erc20 token 轉給買家，拿走買家的 nft
    function acceptOffer(
        address maker,
        ERC721 erc721Token,
        uint erc721TokenId, //3
        ERC20 erc20Token,
        uint256 amount //1
    )
        external
    {

        Offer memory offer = offers[maker];

        require(offer.amount != 0, "BrokenSea::fillBid/BID_PRICE_ZERO");
        require(offer.amount >= amount, "BrokenSea::fillBid/BID_TOO_LOW");
        require(offer.nftID == erc721TokenId, "BrokenSea::fillBid/WRONG_TOKEN_ID");

        delete offers[maker];

        erc721Token.transferFrom(msg.sender, maker, erc721TokenId);
        erc20Token.safeTransferFrom(maker, msg.sender, amount);
    }
}