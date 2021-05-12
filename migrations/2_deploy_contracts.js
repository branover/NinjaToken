const NinjaToken = artifacts.require("NinjaToken");
const NinjaOracle = artifacts.require("NinjaOracle");
const ECDSA = artifacts.require("ECDSA");

module.exports = function(deployer) {
  deployer.deploy(ECDSA);
  deployer.link(ECDSA, NinjaOracle);
  deployer.deploy(NinjaToken, 10000).then(function() {
    return deployer.deploy(NinjaOracle, NinjaToken.address);
  });

  // deployer.link(NinjaToken, NinjaOracle);
  // deployer.deploy(NinjaOracle, NinjaToken.address);
};
