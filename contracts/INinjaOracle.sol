// contracts/INinjaOracle.sol
// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;


interface INinjaOracle {
    
    struct DispatchOrder {
        address to;
        uint amount;
        uint nonce;
        bytes signature;
    }
    
    function storeOrders(DispatchOrder[] memory _ordersToStore) external;
    
    function completeOrders(bytes32[] memory _ordersToSend) external;


}