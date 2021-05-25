import React, { Component } from "react";
import PropTypes from "prop-types";

const translateType = type => {
    switch (true) {
        case /^uint/.test(type):
            return "number";
        case /^string/.test(type) || /^bytes/.test(type):
            return "text";
        case /^bool/.test(type):
            return "checkbox";
        default:
            return "text";
    }
};

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

var nonce = getRandomInt(0xffffffff)

export class NinjaSendForm extends Component {
    constructor(props) {
        super(props);

        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleSend = this.handleSend.bind(this);
        this.handleWSMessage = this.handleWSMessage.bind(this);

        props.drizzle.ws.addEventListener("message", this.handleWSMessage);

        this.contracts = props.drizzle.contracts;
        this.utils = props.drizzle.web3.utils;

        // Get the contract ABI
        const abi = this.contracts[this.props.contract].abi;

        this.inputs = [];
        var initialState = {};

        // Iterate over abi for correct function.
        for (var i = 0; i < abi.length; i++) {
            if (abi[i].name === this.props.method) {
                this.inputs = abi[i].inputs;
                break;
            }
        }
        this.state = {
            "_oracle": this.props.oracleAddress,
            "_ordersToComplete": [],
            "_signature": undefined,
            "_to": undefined,
            "_amount": undefined,
        }

        this.requestOrders();
    }

    handleWSMessage(event) {
        console.log("Handling WS message");
        let json_msg = JSON.parse(event.data);
        if (json_msg["Type"] === "DispatchOrders") {
            let orders = [];
            for(let i=0; i < json_msg["Orders"].length; i++) {
                let order = json_msg["Orders"][i];
                orders.push([order["to"], order["amount"], order["nonce"]]);
            }
            this.setState({
                _ordersToComplete: orders,
                _signature: json_msg["Signature"]})
        }
    }

    handleSubmit(event) {
        event.preventDefault();
        if (!this.state["_ordersToComplete"] || !this.state["_signature"]) {
            this.requestOrders();
            // TODO Tell the user that they need to resubmit, or auto-resubmit?
            return;
        }
        
        const convertedInputs = this.inputs.map(input => {
            if (input.type === "bytes32") {
                return this.utils.toHex(this.state[input.name]);
            }
            return this.state[input.name];
        });
        console.log(convertedInputs);
        this.contracts.NinjaToken.methods.ninjaTransferUntrusted.cacheSend(...convertedInputs, this.props.sendArgs);      
        this.setState({"_ordersToComplete": [], "_signature": ""});
        this.requestOrders();
    }

    handleInputChange(event) {
        event.preventDefault();
        const value =
            event.target.type === "checkbox"
                ? event.target.checked
                : event.target.value;
        this.setState({ [event.target.name]: value });
    }

    handleSend(event) {
        event.preventDefault();

        let data = {
            type: "NinjaTransfer",
            fromAddr: this.props.drizzleState.accounts[0],
            toAddr: this.state.toAddr,
            amount: this.state.amount
        }
        this.props.drizzle.ws.send(JSON.stringify(data));
    }

    requestOrders() {
        let data = {
            type: "RequestOrders",
            numOrders: 2
        }
        this.props.drizzle.ws.send(JSON.stringify(data));
    }

    render() {
        console.log("Transactions: ", this.props.drizzleState.transactions);
        if (this.props.render) {
            return this.props.render({
                inputs: this.inputs,
                inputTypes: this.inputs.map(input => translateType(input.type)),
                state: this.state,
                handleInputChange: this.handleInputChange,
                handleSubmit: this.handleSubmit,
            });
        }

        return (
            <form
                className="pure-form pure-form-stacked"
                onSubmit={this.handleSubmit}   
            >
            <input
                key="_amount"
                type="uint32"
                name="_amount"
                value={this.state["_amount"]}
                placeholder="Amount To Send"
                onChange={this.handleInputChange}
            />
            <input
                key="_to"
                type="address"
                name="_to"
                value={this.state["_to"]}
                placeholder="Destination Address"
                onChange={this.handleInputChange}
            />
            <button
                key="submit"
                className="pure-button"
                type="button"
                onClick={this.handleSubmit}
            >
                Submit
            </button>

            <h3>Get Orders</h3>
            <p>
                <button
                    key="requestorders"
                    className="pure-button"
                    type="button"
                    onClick={this.handleRequestOrders}
                >
                    Request Orders
                </button> 
            </p>
            </form>


        );
    }
}

NinjaSendForm.propTypes = {
    drizzle: PropTypes.object.isRequired,
    contract: PropTypes.string.isRequired,
    method: PropTypes.string.isRequired,
    sendArgs: PropTypes.object,
    labels: PropTypes.arrayOf(PropTypes.string),
    render: PropTypes.func,
};

// export NinjaSendForm;
