import React, { Component } from 'react'
import { newContextComponents } from "@drizzle/react-components"
import { NinjaSendForm } from "./NinjaSendForm"
import logo from "./logo.png"


const { AccountData, ContractData, ContractForm } = newContextComponents;


export class NinjaSendComponent extends Component {
    state = {
        oracleContractAddress: null,
        mutex: false,
    };

    componentDidMount() {
        const { drizzle, drizzleState } = this.props;
        const { NinjaGovernance, NinjaToken, NinjaOracle } = drizzle.contracts;
    }

    render() {
        const { drizzle, drizzleState } = this.props;
        const { NinjaGovernance, NinjaToken, NinjaOracle } = drizzle.contracts;

        return (
            <div>
                <NinjaSendForm
                    drizzle={drizzle}
                    drizzleState={drizzleState}
                    contract="NinjaToken"
                    method="ninjaTransferUntrusted"
                    oracleAddress={NinjaOracle.address}
                    labels={["Amount to Send", "Oracle", "Orders To Complete", "Signature"]}
                    sendArgs={{ from: drizzleState.accounts[0], gas: 550000 }}
                />
            </div>

        );
    }

}