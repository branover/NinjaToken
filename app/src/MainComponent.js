import React, { Component } from 'react'
import { newContextComponents } from "@drizzle/react-components"
import { NinjaSendComponent } from "./NinjaSendComponent"
import logo from "./logo.png"


const { AccountData, ContractData, ContractForm } = newContextComponents;


export default class MainComponent extends Component {
  state = {
    ninjaTokenLoaded: false,
    ninjaTokenAddress: null,
    mutex: false,
  };

  async setNinjaAddr() {
    this.state.mutex = true;

    const { drizzle, drizzleState } = this.props;
    const { NinjaGovernance, NinjaToken } = drizzle.contracts;
    let ninjaTokenAddress = await drizzle.contracts.NinjaGovernance.methods.ninjaToken().call();
    let newweb3Contract = new drizzle.web3.eth.Contract(drizzle.contracts.NinjaToken.abi, ninjaTokenAddress);
    let contractConfig = {
      contractName: "NinjaToken",
      web3Contract: newweb3Contract
    }
    let events = ['Transfer'];
    drizzle.deleteContract("NinjaToken");
    drizzle.store.dispatch({ type: 'ADD_CONTRACT', contractConfig, events });
    // drizzle.addContract({contractConfig, events});

    this.setState({ ninjaTokenLoaded: true, ninjaTokenAddress });
    this.setState({ mutex: false });
  }


  componentDidMount() {
    const { drizzle, drizzleState } = this.props;
    const { NinjaGovernance, NinjaToken } = drizzle.contracts;

    if (!this.state.ninjaTokenLoaded && !this.state.mutex) {
      this.setNinjaAddr();
    }

  }

  render() {
    const { NinjaGovernance, NinjaToken, NinjaOracle } = this.props.drizzleState.contracts;
    const { drizzle, drizzleState } = this.props;

    if (!this.state.ninjaTokenLoaded || this.state.mutex) {
      return (
        <p>Hi from Truffle! Here is your ninjaToken: {this.state.ninjaTokenAddress}</p>
      )
    }
    return (
      <div className="App">
        <div>
          <img src={logo} alt="drizzle-logo" />
          <h1>Drizzle Examples</h1>
          <p>
            Examples of how to get started with Drizzle in various situations.
        </p>
        </div>

        <div className="section">
          <h2>Active Account</h2>
          <AccountData
            drizzle={drizzle}
            drizzleState={drizzleState}
            accountIndex={0}
            units="ether"
            precision={3}
          />
        </div>

        <div className="section">
          <h2>NinjaGovernance</h2>
          <p>
            This shows a simple ContractData component with no arguments, along
            with a form to set its value.
        </p>
          <p>
            {/* <strong>Stored Value: </strong>
          <ContractData
            drizzle={drizzle}
            drizzleState={drizzleState}
            contract="NinjaGovernance"
            method="developerFund"
          /> */}
          </p>
          {/* <ContractForm drizzle={drizzle} contract="NinjaGovernance" method="set" /> */}
        </div>

        <div className="section">
          <h2>NinjaToken</h2>
          <p>
            Here we have a form with custom, friendly labels. Also note the token
            symbol will not display a loading indicator. We've suppressed it with
          the <code>hideIndicator</code> prop because we know this variable is
          constant.
        </p>
          <p>
            <strong>Total Supply: </strong>
            <ContractData
              drizzle={drizzle}
              drizzleState={drizzleState}
              contract="NinjaToken"
              method="totalSupply"
            />{" "}
            <ContractData
              drizzle={drizzle}
              drizzleState={drizzleState}
              contract="NinjaToken"
              method="symbol"
            />
          </p>
          <p>
            <strong>My Balance: </strong>
            <ContractData
              drizzle={drizzle}
              drizzleState={drizzleState}
              contract="NinjaToken"
              method="balanceOf"
              methodArgs={[drizzleState.accounts[0]]}
            />
          </p>
          <p>
            <strong>Account[1] Balance: </strong>
            <ContractData
                drizzle={drizzle}
                drizzleState={drizzleState}
                contract="NinjaToken"
                method="balanceOf"
                methodArgs={[drizzleState.accounts[1]]}
            />
          </p>
          <p>
            <strong>Oracle Balance: </strong>
            <ContractData
                drizzle={drizzle}
                drizzleState={drizzleState}
                contract="NinjaToken"
                method="balanceOf"
                methodArgs={[drizzle.contracts.NinjaOracle.address]}
            />
          </p>
          <h3>Send Tokens</h3>
          <ContractForm
            drizzle={drizzle}
            drizzleState={drizzleState}
            contract="NinjaToken"
            method="transfer"
            labels={["To Address", "Amount to Send"]}
            sendArgs={{ from: drizzleState.accounts[0] }}
          />
          <h3>Send Tokens Sneaky</h3>
          <NinjaSendComponent drizzle={drizzle} drizzleState={drizzleState} />
        </div>

        {/* <div className="section">
        <h2>ComplexStorage</h2>
        <p>
          Finally this contract shows data types with additional considerations.
          Note in the code the strings below are converted from bytes to UTF-8
          strings and the device data struct is iterated as a list.
        </p>
        <p>
          <strong>String 1: </strong>
          <ContractData
            drizzle={drizzle}
            drizzleState={drizzleState}
            contract="ComplexStorage"
            method="string1"
            toUtf8
          />
        </p>
        <p>
          <strong>String 2: </strong>
          <ContractData
            drizzle={drizzle}
            drizzleState={drizzleState}
            contract="ComplexStorage"
            method="string2"
            toUtf8
          />
        </p>
        <strong>Single Device Data: </strong>
        <ContractData
          drizzle={drizzle}
          drizzleState={drizzleState}
          contract="ComplexStorage"
          method="singleDD"
        />
      </div> */}
      </div>
    );
  };
};
    // return (
    //   <div>
    //   <p>Hi from Truffle! Here is your ninjaToken: {this.state.ninjaTokenAddress}</p>
    //   <p>NinjaToken supply</p>
    //   <ContractData
    //         drizzle={this.props.drizzle}
    //         drizzleState={this.props.drizzleState}
    //         contract="NinjaToken"
    //         method="totalSupply"
    //         // methodArgs={[{ from: this.props.drizzleState.accounts[0] }]}
    //        />
    //   </div>
    // )
//   }
// }



// export default ({ drizzle, drizzleState }) => {
//   var dataKey = drizzle.contracts.NinjaGovernance.methods.ninjaToken.cacheCall()

//   // Use the dataKey to display data from the store.
//   if (drizzleState.contracts.NinjaGovernance.ninjaToken[dataKey]) {
//     console.log("Ninjatoken address:" + drizzleState.contracts.NinjaGovernance.ninjaToken[dataKey].value)
//   }

//   // destructure drizzle and drizzleState from props
//   return (
//     <div className="App">
//       <div>
//         <img src={logo} alt="drizzle-logo" />
//         <h1>Drizzle Examples</h1>
//         <p>
//           Examples of how to get started with Drizzle in various situations.
//         </p>
//       </div>

//       <div className="section">
//         <h2>Active Account</h2>
//         <AccountData
//           drizzle={drizzle}
//           drizzleState={drizzleState}
//           accountIndex={0}
//           units="ether"
//           precision={3}
//         />
//       </div>

//       <div className="section">
//         <h2>NinjaGovernance</h2>
//         <p>
//           This shows a simple ContractData component with no arguments, along
//           with a form to set its value.
//         </p>
//         <p>
//           <strong>Stored Value: </strong>
//           <ContractData
//             drizzle={drizzle}
//             drizzleState={drizzleState}
//             contract="NinjaGovernance"
//             method="developerFund"
//           />
//         </p>
//         <ContractForm drizzle={drizzle} contract="NinjaGovernance" method="set" />
//       </div>

//       <div className="section">
//         <h2>NinjaToken</h2>
//         <p>
//           Here we have a form with custom, friendly labels. Also note the token
//           symbol will not display a loading indicator. We've suppressed it with
//           the <code>hideIndicator</code> prop because we know this variable is
//           constant.
//         </p>
//         <p>
//           <strong>Total Supply: </strong>
//           {/* <ContractData
//             drizzle={drizzle}
//             drizzleState={drizzleState}
//             contract="NinjaToken"
//             method="totalSupply"
//             methodArgs={[{ from: drizzleState.accounts[0] }]}
//           />{" "} */}
//           {/* <ContractData
//             drizzle={drizzle}
//             drizzleState={drizzleState}
//             contract="NinjaToken"
//             method="symbol"
//             hideIndicator
//           /> */}
//         </p>
//         <p>
//           <strong>My Balance: </strong>
//           {/* <ContractData
//             drizzle={drizzle}
//             drizzleState={drizzleState}
//             contract="NinjaToken"
//             method="balanceOf"
//             methodArgs={[drizzleState.accounts[0]]}
//           /> */}
//         </p>
//         <h3>Send Tokens</h3>
//         {/* <ContractForm
//           drizzle={drizzle}
//           contract="NinjaToken"
//           method="transfer"
//           labels={["To Address", "Amount to Send"]}
//         /> */}
//       </div>

//       {/* <div className="section">
//         <h2>ComplexStorage</h2>
//         <p>
//           Finally this contract shows data types with additional considerations.
//           Note in the code the strings below are converted from bytes to UTF-8
//           strings and the device data struct is iterated as a list.
//         </p>
//         <p>
//           <strong>String 1: </strong>
//           <ContractData
//             drizzle={drizzle}
//             drizzleState={drizzleState}
//             contract="ComplexStorage"
//             method="string1"
//             toUtf8
//           />
//         </p>
//         <p>
//           <strong>String 2: </strong>
//           <ContractData
//             drizzle={drizzle}
//             drizzleState={drizzleState}
//             contract="ComplexStorage"
//             method="string2"
//             toUtf8
//           />
//         </p>
//         <strong>Single Device Data: </strong>
//         <ContractData
//           drizzle={drizzle}
//           drizzleState={drizzleState}
//           contract="ComplexStorage"
//           method="singleDD"
//         />
//       </div> */}
//     </div>
//   );
// };

