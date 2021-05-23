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
    }
    //TODO Delete after testing
    DispatchOrder[] orders;
    
    mapping (bytes32 => bool) public alreadyCompleted;
    
    address public signingAddress;
    NinjaToken public ninjaToken;
    
    event OrderCompleted(bytes32 hash);
    
    constructor(address _ninjaToken) {
        signingAddress = msg.sender;
        ninjaToken = NinjaToken(_ninjaToken);
    }
	
    function _completeOrders(DispatchOrder[] memory _ordersToComplete, bytes memory _signature) internal {
        bytes32 all_hashes = 0;
        bytes32 order_hash = 0;
        uint numOrders = _ordersToComplete.length;
        for (uint i = 0; i < numOrders; i++) {
            DispatchOrder memory order = _ordersToComplete[i];
            order_hash = keccak256(abi.encodePacked(order.to, order.amount, order.nonce));
            all_hashes = keccak256(abi.encodePacked(order_hash, all_hashes));
            
            // Skip invalid orders or ones that have already been fulfilled
            if (!_validateOrder(order, order_hash)) {
                if (alreadyCompleted[order_hash] == false) {
                    alreadyCompleted[order_hash] = true;
                }
                continue;
            }

            // Complete the order
            alreadyCompleted[order_hash] = true;
            ninjaToken.transfer(order.to, order.amount);

            emit OrderCompleted(order_hash);
        } 
        // Revert if the signature is invalid
        //TODO Reenable
        // require(_validateSignature(_signature, all_hashes), "Invalid signature");  
    }
    
    function completeOrders(DispatchOrder[] memory _ordersToComplete, bytes memory _signature) external {
        _completeOrders(_ordersToComplete, _signature);
    }    

    function _validateSignature(bytes memory _signature, bytes32 _hash) internal view returns (bool) {
        // Check that the order was actually signed by the off-chain oracle
        if (ECDSA.recover(ECDSA.toEthSignedMessageHash(_hash), _signature) != signingAddress) {
            return false;
        }
        return true;     
    }
    
    function _validateOrder(DispatchOrder memory order, bytes32 _hash) internal view returns (bool) {
        if (order.to == address(0) && order.amount == 0) {
            // Don't allow replay attacks of empty stub address
            require(alreadyCompleted[_hash] == false, "Can't replay empty transaction");
            return false;
        }        
        if (order.to == address(0) || order.amount == 0) {
            return false;
        }
        // If the order has already been completed in the past (prevent replay attacks), skip it
        if (alreadyCompleted[_hash] == true) {
            return false;
        }
        return true;
    }

    //TODO Delete, just for testing
    enum OrderStatus{ NULL, COMPLETED }
    function getOrderStatus(bytes32 hash) public view returns (OrderStatus) {
        if (alreadyCompleted[hash] == true) {
            return OrderStatus.COMPLETED;
        }
        return OrderStatus.NULL;
    }    
    
    //TODO Delete, just for testing
    function completeOrder(address _to, uint _amount, uint _nonce, bytes memory _signature) external {
        DispatchOrder memory order = DispatchOrder(_to, _amount, _nonce);
        orders.push(order);
        _completeOrders(orders, _signature);
        orders.pop();
    }	
}