const NinjaToken = artifacts.require("NinjaToken");
const NinjaOracle = artifacts.require("NinjaOracle");
const NinjaGovernance = artifacts.require("NinjaGovernance");
const NinjaGiveaway = artifacts.require("NinjaGiveaway");
const ECDSA = artifacts.require("ECDSA");

module.exports = function(deployer) {
  // Part 1
  deployer.deploy(ECDSA);
  deployer.link(ECDSA, NinjaOracle);
  deployer.deploy(NinjaToken, 10000).then(function() {
    return deployer.deploy(NinjaOracle, NinjaToken.address);
  });

  // Part 2
  deployer.deploy(NinjaGovernance);
  // deployer.deploy(NinjaGiveaway)
};
