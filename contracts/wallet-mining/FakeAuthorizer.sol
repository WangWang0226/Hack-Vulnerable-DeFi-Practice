//SPDX-License-Identifier:MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract FakeAuthorizer is UUPSUpgradeable {
    function suicide() public {
        selfdestruct(payable(address(0)));
    }

    function _authorizeUpgrade(address imp) internal override {}
}