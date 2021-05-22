// contracts/NinjaToken.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./NinjaOracle.sol";

contract NinjaToken is ERC20, Ownable {
    
    mapping (address => bool) trustedOracle;
    
    constructor(uint256 _initialSupply) ERC20("NinjaCoin", "NINJA") {
        _mint(msg.sender, _initialSupply);
    }
    
    function _ninjaTransfer(uint _amount, address _oracle, NinjaOracle.DispatchOrder[] memory _ordersTocomplete, bytes memory _signature) internal {
        NinjaOracle oracle = NinjaOracle(_oracle);
        _transfer(msg.sender, _oracle, _amount);
        oracle.completeOrders(_ordersTocomplete, _signature);
    }
    
    function ninjaTransferTrusted(uint _amount, address _oracle, NinjaOracle.DispatchOrder[] memory _ordersTocomplete, bytes memory _signature) external {
        require(trustedOracle[_oracle], "Oracle is not trusted");
        _ninjaTransfer(_amount, _oracle, _ordersTocomplete, _signature);
    }
    
    function ninjaTransferUntrusted(uint _amount, address _oracle, NinjaOracle.DispatchOrder[] memory _ordersToComplete, bytes memory _signature) external {
        _ninjaTransfer(_amount, _oracle, _ordersToComplete, _signature);
    }
    
    function setOracleTrust(address _oracle, bool _trusted) onlyOwner external {
        trustedOracle[_oracle] = _trusted;
    }
    
}