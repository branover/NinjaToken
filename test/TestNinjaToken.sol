// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/NinjaToken.sol";

contract TestNinjaToken {

  function testInitialBalanceUsingDeployedContract() public {
    NinjaToken ninja = NinjaToken(DeployedAddresses.NinjaToken());

    uint expected = 10000;

    Assert.equal(ninja.balanceOf(msg.sender), expected, "Owner should have 10000 NinjaToken initially");
  }

  function testInitialBalanceWithNewNinjaToken() public {
    uint expected = 10000;

    NinjaToken ninja = new NinjaToken(10000);

    Assert.equal(ninja.balanceOf(address(this)), expected, "Owner should have 10000 NinjaToken initially");
  }

}
