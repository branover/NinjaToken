import Web3 from "web3";
import NinjaToken from "./contracts/NinjaToken.json";
import NinjaOracle from "./contracts/NinjaOracle.json";
import NinjaGovernance from "./contracts/NinjaGovernance.json";

const options = {
  web3: {
    block: false,
    customProvider: new Web3("ws://localhost:9545"),
  },
  contracts: [ 
    NinjaGovernance,
    NinjaOracle,
    NinjaToken,
  ],
  events: {
    NinjaToken: ["Transfer"],
    NinjaOracle: ["OrderCompleted"],

  },
};

export default options;
