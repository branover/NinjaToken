// contracts/NinjaOracle.sol
// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./NinjaToken.sol";

contract NinjaOracle is Ownable {
    
    struct DispatchOrder {
        address to;
        uint amount;
        uint nonce;
        bytes signature;
    }
    //TODO Delete after testing
    DispatchOrder[] orders;
    bytes32[] complete_orders;
    
    mapping (bytes32 => DispatchOrder) internal orderBacklog;
    mapping (bytes32 => bool) internal alreadyCompleted;
    
    address public signingAddress;
    NinjaToken private ninjaToken;
    
    event OrderStored(bytes32 hash);
    event OrderCompleted(bytes32 hash);
    
    constructor(address _ninjaToken) {
        signingAddress = msg.sender;
        ninjaToken = NinjaToken(_ninjaToken);
    }
	
    function _storeOrders(DispatchOrder[] memory _ordersToStore) internal {
        for (uint i = 0; i < _ordersToStore.length; i++) {
            DispatchOrder memory order = _ordersToStore[i];
            bytes32 hash = keccak256(abi.encodePacked(order.to, order.amount, order.nonce));

            //TODO Make just skip invalid order instead of reverting
            if (!_validateOrder(order.signature, hash)) {
                continue;
            }
            // require(_validateOrder(order.signature, hash), "Invalid order");
            orderBacklog[hash] = order;
            emit OrderStored(hash);
       } 
    }
    
    function storeOrders(DispatchOrder[] memory _ordersToStore) external {
        _storeOrders(_ordersToStore);
    }
    
    function _completeOrders(bytes32[] memory _ordersToSend) internal {
        for (uint i = 0; i < _ordersToSend.length; i++) {
            bytes32 hash = _ordersToSend[i];
            DispatchOrder memory order = orderBacklog[hash];
            // Make sure the order actually exists
            if (order.amount == 0) {
                continue;
            }
            ninjaToken.transfer(order.to, order.amount);
            //TODO vulnerable to replay attacks, need to remember that we already processed an order.
            //TODO This is done by alreadyCompleted mapping.  Test that it works
            delete orderBacklog[hash];
            alreadyCompleted[hash] = true;
            emit OrderCompleted(hash);
        }
    }
    
    function completeOrders(bytes32[] memory _ordersToSend) external {
        _completeOrders(_ordersToSend);
    }
    
    function _validateOrder(bytes memory _signature, bytes32 _hash) internal view returns (bool) {
        // If the order is already pending or has already been completed in the past (prevent replay attacks), skip it
        if (orderBacklog[_hash].to > address(0) || alreadyCompleted[_hash] == true) {
            return false;
        }
        // Check that the order was actually signed by the off-chain oracle
        // if (ECDSA.recover(ECDSA.toEthSignedMessageHash(_hash), _signature) != signingAddress) {
        //     return false;
        // }
        require(ECDSA.recover(ECDSA.toEthSignedMessageHash(_hash), _signature) == signingAddress, "Invalid ECDSA signature");
        return true;
    }

    //TODO Delete, just for testing
    enum OrderStatus{ NULL, SUBMITTED, COMPLETED }
    function getOrderStatus(bytes32 hash) public view returns (OrderStatus) {
        if (alreadyCompleted[hash] == true) {
            return OrderStatus.COMPLETED;
        }
        if (orderBacklog[hash].to > address(0)) {
            return OrderStatus.SUBMITTED;
        }
        return OrderStatus.NULL;
    }
    
    //TODO Delete, just for testing
    function getHash(address _to, uint _amount, uint _nonce) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_to, _amount, _nonce));
    }
    
    //TODO Delete, just for testing
    function storeOrder(address _to, uint _amount, uint _nonce, bytes memory _signature) external {
        DispatchOrder memory order = DispatchOrder(_to, _amount, _nonce, _signature);
        orders.push(order);
        _storeOrders(orders);
    }

    //TODO Delete, just for testing
    function completeOrder(bytes32 _hash) external {
        complete_orders.push(_hash);
        _completeOrders(complete_orders);
    }



	
}