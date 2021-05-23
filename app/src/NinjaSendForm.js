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
        this.handleRequestOrders = this.handleRequestOrders.bind(this);
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

                for (var j = 0; j < this.inputs.length; j++) {
                    if (this.inputs[j].name === "_oracle") {
                        initialState[this.inputs[j].name] = this.props.oracleAddress;
                    }
                    else if (this.inputs[j].name === "_ordersToComplete") {
                        initialState[this.inputs[j].name] = [["0xbd1102691192aB35bD8835b98761162c73cD0C6F", "1", nonce]];
                    }
                    else if (this.inputs[j].name === "_signature") {
                        initialState[this.inputs[j].name] = "0x41101010101010"
                    }
                    else {
                        initialState[this.inputs[j].name] = "";
                    }
                }

                break;
            }
        }

        this.state = initialState;
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
        console.log(this.state)

    }

    handleSubmit(event) {
        nonce = getRandomInt(0xffffffff);
        event.preventDefault();

        const convertedInputs = this.inputs.map(input => {
            if (input.type === "bytes32") {
                return this.utils.toHex(this.state[input.name]);
            }
            return this.state[input.name];
        });
        console.log(convertedInputs);
        let txid = this.contracts.NinjaToken.methods.ninjaTransferUntrusted.cacheSend(...convertedInputs, this.props.sendArgs);      

        return txid;
    }

    handleInputChange(event) {
        const value =
            event.target.type === "checkbox"
                ? event.target.checked
                : event.target.value;
        this.setState({ [event.target.name]: value });
    }

    handleSend(event) {
        let data = {
            type: "NinjaTransfer",
            fromAddr: this.props.drizzleState.accounts[0],
            toAddr: this.state.toAddr,
            amount: this.state.amount
        }
        this.props.drizzle.ws.send(JSON.stringify(data));
    }

    handleRequestOrders(event) {
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
                {this.inputs.map((input, index) => {
                    if (input.name === "_oracle" || input.name === "_ordersToComplete") {
                        return "";
                    }
                    var inputType = translateType(input.type);
                    var inputLabel = this.props.labels
                        ? this.props.labels[index]
                        : input.name;
                    // check if input type is struct and if so loop out struct fields as well
                    return (
                        <input
                            key={input.name}
                            type={inputType}
                            name={input.name}
                            value={this.state[input.name]}
                            placeholder={inputLabel}
                            onChange={this.handleInputChange}
                        />
                    );
                })}
                <button
                    key="submit"
                    className="pure-button"
                    type="button"
                    onClick={this.handleSubmit}
                >
                    Submit
                </button>

                <h3>Send to Web Socket</h3>
                <p>
                <input
                    name="toAddr"
                    type="text"
                    value={this.state.toAddr}
                    placeholder="To Address"
                    onChange={this.handleInputChange}
                    >

                </input>
                <input
                    name="amount"
                    type="text"
                    value={this.state.amount}
                    placeholder="Amount"
                    onChange={this.handleInputChange}
                    >

                </input>
                <button
                    key="send"
                    className="pure-button"
                    type="button"
                    onClick={this.handleSend}
                >
                    Send
                </button></p>

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
