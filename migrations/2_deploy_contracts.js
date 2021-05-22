const NinjaToken = artifacts.require("NinjaToken");
const NinjaOracle = artifacts.require("NinjaOracle");
const NinjaGovernance = artifacts.require("NinjaGovernance");
const NinjaGiveaway = artifacts.require("NinjaGiveaway");
const ECDSA = artifacts.require("ECDSA");

module.exports = async function(deployer) {
  // Part 1
  await deployer.deploy(NinjaGovernance);
  let governance = await NinjaGovernance.deployed();
  let ninja_addr = await governance.ninjaToken();
  let ninja = await NinjaToken.at(ninja_addr);
  let owner = await governance.owner();
  // deployer.deploy(NinjaGiveaway)
  // Part 2
  // deployer.deploy(ECDSA);
  // deployer.link(ECDSA, NinjaOracle);
  // await deployer.deploy(NinjaToken, 10000);
  // await deployer.deploy(NinjaOracle, NinjaToken.address);
  await deployer.deploy(NinjaOracle, ninja_addr);

};
