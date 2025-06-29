// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Ledger.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title LedgerFactory
 * @dev Factory contract for creating and managing Ledger contracts
 */
contract LedgerFactory {
    // State variables
    address public immutable usdcToken;
    mapping(address => address[]) public userLedgers;
    mapping(address => address[]) public userMemberLedgers;
    
    // Events
    event LedgerCreated(
        address indexed creator,
        address indexed ledgerAddress,
        string name
    );
    
    /**
     * @dev Constructor to initialize the LedgerFactory
     * @param _usdcToken The USDC token address
     */
    constructor(address _usdcToken) {
        require(_usdcToken != address(0), "Invalid USDC token address");
        usdcToken = _usdcToken;
    }
    
    /**
     * @dev Create a new Ledger contract
     * @param name The name identifier for the ledger
     * @param approveAmount The required approval amount for members
     * @param maxDaily Maximum usage per day
     * @param maxMonthly Maximum usage per month
     */
    function createLedger(
        string calldata name,
        uint256 approveAmount,
        uint256 maxDaily,
        uint256 maxMonthly
    ) external {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(approveAmount > 0, "Approve amount must be greater than 0");
        require(maxDaily > 0, "Max daily must be greater than 0");
        require(maxMonthly > 0, "Max monthly must be greater than 0");
        require(maxDaily <= maxMonthly, "Daily limit cannot exceed monthly limit");
        
        // Deploy new Ledger contract with msg.sender as owner
        Ledger newLedger = new Ledger(
            usdcToken,
            approveAmount,
            maxDaily,
            maxMonthly,
            msg.sender,
            address(this)
        );
        
        address ledgerAddress = address(newLedger);
        
        // Add to user's ledger list
        userLedgers[msg.sender].push(ledgerAddress);
        
        // Emit event
        emit LedgerCreated(msg.sender, ledgerAddress, name);
    }
    
    /**
     * @dev Get all ledgers created by a user
     * @param user The user address
     * @return Array of ledger addresses
     */
    function getUserLedgers(address user) external view returns (address[] memory) {
        return userLedgers[user];
    }
    
    /**
     * @dev Get the count of ledgers created by a user
     * @param user The user address
     * @return Number of ledgers created by the user
     */
    function getUserLedgersCount(address user) external view returns (uint256) {
        return userLedgers[user].length;
    }
    
    /**
     * @dev Get a specific ledger by index for a user
     * @param user The user address
     * @param idx The index of the ledger
     * @return The ledger address at the specified index
     */
    function getUserLedgerByIndex(address user, uint256 idx) external view returns (address) {
        require(idx < userLedgers[user].length, "Index out of bounds");
        return userLedgers[user][idx];
    }
    
    /**
     * @dev Add user as member to a ledger (called by Ledger contract)
     * @param user The user address
     * @param ledgerAddress The ledger address
     */
    function addMemberToLedger(address user, address ledgerAddress) external {
        // Only allow calls from existing ledger contracts
        require(_isValidLedger(msg.sender), "Only ledger contracts can call this");
        
        // Check if user is already in the member list for this ledger
        address[] storage memberLedgers = userMemberLedgers[user];
        for (uint256 i = 0; i < memberLedgers.length; i++) {
            if (memberLedgers[i] == ledgerAddress) {
                return; // Already exists, no need to add again
            }
        }
        
        userMemberLedgers[user].push(ledgerAddress);
    }
    
    /**
     * @dev Remove user as member from a ledger (called by Ledger contract)
     * @param user The user address
     * @param ledgerAddress The ledger address
     */
    function removeMemberFromLedger(address user, address ledgerAddress) external {
        // Only allow calls from existing ledger contracts
        require(_isValidLedger(msg.sender), "Only ledger contracts can call this");
        
        address[] storage memberLedgers = userMemberLedgers[user];
        for (uint256 i = 0; i < memberLedgers.length; i++) {
            if (memberLedgers[i] == ledgerAddress) {
                // Move last element to current position and remove last element
                memberLedgers[i] = memberLedgers[memberLedgers.length - 1];
                memberLedgers.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Get all ledgers where user is a member
     * @param user The user address
     * @return Array of ledger addresses where user is a member
     */
    function getUserMemberLedgers(address user) external view returns (address[] memory) {
        return userMemberLedgers[user];
    }
    
    /**
     * @dev Get the count of ledgers where user is a member
     * @param user The user address
     * @return Number of ledgers where user is a member
     */
    function getUserMemberLedgersCount(address user) external view returns (uint256) {
        return userMemberLedgers[user].length;
    }
    
    /**
     * @dev Get a specific member ledger by index for a user
     * @param user The user address
     * @param idx The index of the ledger
     * @return The ledger address at the specified index
     */
    function getUserMemberLedgerByIndex(address user, uint256 idx) external view returns (address) {
        require(idx < userMemberLedgers[user].length, "Index out of bounds");
        return userMemberLedgers[user][idx];
    }
    
    /**
     * @dev Check if the given address is a valid ledger created by this factory
     * @param ledgerAddress The ledger address to check
     * @return True if it's a valid ledger
     */
    function _isValidLedger(address ledgerAddress) internal view returns (bool) {
        // Simple validation - in production you might want to maintain a more sophisticated registry
        // This checks if the ledger has the correct USDC token address
        try Ledger(ledgerAddress).usdc() returns (IERC20 ledgerUSDC) {
            return address(ledgerUSDC) == usdcToken;
        } catch {
            return false;
        }
    }
} 