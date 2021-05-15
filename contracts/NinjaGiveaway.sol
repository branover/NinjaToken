// contracts/NinjaGiveaway.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./NinjaGovernance.sol";

contract NinjaGiveaway is Ownable {
    mapping (address => uint) internal claimed;
    IERC20 internal ninjaToken;
    NinjaGovernance internal ninjaGovernance;

    bool public active;
    uint public claimablePerAddress;
    uint public totalClaimed;
    uint public totalAllocated;
    
    constructor(address _ninjaToken, address _ninjaGovernance, uint _claimablePerAddress, uint _totalAllocated) {
        ninjaToken = IERC20(_ninjaToken);
        claimablePerAddress = _claimablePerAddress;
        ninjaGovernance = NinjaGovernance(_ninjaGovernance);
        totalAllocated = _totalAllocated;
    }
    
    function setActive(bool _active) external onlyOwner {
        active = _active;
    }
    
    function setGiveawayAmount(uint _claimablePerAddress, uint _totalAllocated) external onlyOwner {
        require(_totalAllocated >= totalClaimed, "Can't lower allocation below amount claimed");
        claimablePerAddress = _claimablePerAddress;
        totalAllocated = _totalAllocated;
    }
    
    function getClaimable(address _addr) public view returns (uint) {
        return Math.min(claimablePerAddress - claimed[_addr], totalAllocated - totalClaimed);
    }
    
    function claim() external {
        require(active, "Giveaway is not active");
        require(claimed[msg.sender] < claimablePerAddress, "Can't claim any more");
        uint toClaim = getClaimable(msg.sender);
        require(toClaim > 0, "Can't claim any more");
        totalClaimed += toClaim;
        claimed[msg.sender] = claimablePerAddress;
        ninjaToken.transferFrom(address(ninjaGovernance), msg.sender, toClaim);
        ninjaGovernance.reportGiveawayClaimed(toClaim);
    }
    
}

