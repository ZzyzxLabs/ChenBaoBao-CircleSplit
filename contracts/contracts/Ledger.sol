// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ILedgerFactory {
    function addMemberToLedger(address user, address ledgerAddress) external;
    function removeMemberFromLedger(address user, address ledgerAddress) external;
}

/**
 * @title Ledger
 * @dev A contract for managing group payments and tracking member usage
 */
contract Ledger is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // State variables
    IERC20 public immutable usdc;
    address public immutable factory;
    uint256 public approveAmount;
    uint256 public maxUsagePerDay;
    uint256 public maxUsagePerMonth;
    mapping(address => bool) public members;
    address[] public membersList;
    
    struct Usage {
        uint256 windowStart;
        uint256 accumulated;
    }
    
    mapping(address => Usage) public dailyUsage;
    mapping(address => Usage) public monthlyUsage;
    uint256 public currentPaymentId;
    mapping(uint256 => PaymentInfo) public paymentHistory;
    mapping(uint256 => uint256) public externalIdToInternal;
    uint256[] public externalIds;
    
    uint256 private constant DAY = 86400;
    uint256 private constant MONTH = 86400 * 30;
    
    struct PaymentInfo {
        uint256 paymentId;
        uint256 externalId;
        address initiator;
        address vendor;
        address[] participants;
        uint256[] amounts;
        uint256 timestamp;
        address[] failedParticipants;
        uint256[] failedAmounts;
    }
    
    // Events
    event MemberJoined(address indexed member);
    event MemberLeft(address indexed member);
    event SettingsUpdated(uint256 approveAmount, uint256 maxDaily, uint256 maxMonthly);
    event PaymentProcessed(
        uint256 indexed paymentId,
        uint256 externalId,
        address indexed initiator,
        address vendor,
        address[] participants,
        uint256[] amounts,
        address[] failedParticipants,
        uint256[] failedAmounts
    );
    
    // Modifiers
    modifier onlyMember() {
        require(members[msg.sender], "Not a member");
        _;
    }
    
    /**
     * @dev Constructor to initialize the Ledger contract
     * @param _usdc The USDC token address
     * @param _approveAmount The required approval amount for members
     * @param _maxDaily Maximum usage per day
     * @param _maxMonthly Maximum usage per month
     * @param _owner The owner of the contract
     * @param _factory The factory contract address
     */
    constructor(
        address _usdc,
        uint256 _approveAmount,
        uint256 _maxDaily,
        uint256 _maxMonthly,
        address _owner,
        address _factory
    ) Ownable(_owner) {
        usdc = IERC20(_usdc);
        factory = _factory;
        approveAmount = _approveAmount;
        maxUsagePerDay = _maxDaily;
        maxUsagePerMonth = _maxMonthly;
    }
    
    /**
     * @dev Join the ledger as a member
     */
    function join() external {
        require(!members[msg.sender], "Already a member");
        require(usdc.allowance(msg.sender, address(this)) >= approveAmount, "Approve USDC first");
        
        members[msg.sender] = true;
        membersList.push(msg.sender);
        
        // Notify factory about new member
        ILedgerFactory(factory).addMemberToLedger(msg.sender, address(this));
        
        emit MemberJoined(msg.sender);
    }
    
    /**
     * @dev Leave the ledger
     */
    function leave() external {
        require(members[msg.sender], "Not a member");
        
        members[msg.sender] = false;
        
        // Remove from membersList array
        for (uint256 i = 0; i < membersList.length; i++) {
            if (membersList[i] == msg.sender) {
                membersList[i] = membersList[membersList.length - 1];
                membersList.pop();
                break;
            }
        }
        
        // Notify factory about member leaving
        ILedgerFactory(factory).removeMemberFromLedger(msg.sender, address(this));
        
        emit MemberLeft(msg.sender);
    }

    /**
     * @dev Split payment among participants
     * @param externalId External payment ID
     * @param vendor The vendor address to receive payments
     * @param participants Array of participant addresses
     * @param amounts Array of amounts for each participant
     */
    function splitPayment(
        uint256 externalId,
        address vendor,
        address[] calldata participants,
        uint256[] calldata amounts
    ) external onlyMember nonReentrant {
        require(participants.length == amounts.length, "Array length mismatch");
        require(participants.length > 0, "No participants");
        require(vendor != address(0), "Invalid vendor address");
        
        address[] memory failedParticipants = new address[](participants.length);
        uint256[] memory failedAmounts = new uint256[](participants.length);
        uint256 failedCount = 0;
        
        for (uint256 i = 0; i < participants.length; i++) {
            address participant = participants[i];
            uint256 amount = amounts[i];
            
            if (amount == 0) continue;
            
            // Reset usage windows if needed
            _resetWindow(dailyUsage[participant], DAY);
            _resetWindow(monthlyUsage[participant], MONTH);
            
            // Check usage limits
            if (dailyUsage[participant].accumulated + amount > maxUsagePerDay ||
                monthlyUsage[participant].accumulated + amount > maxUsagePerMonth) {
                revert("Daily or monthly usage limit exceeded");
            }
            
            // Check if participant has sufficient allowance and balance
            if (usdc.allowance(participant, address(this)) < amount || 
                usdc.balanceOf(participant) < amount) {
                failedParticipants[failedCount] = participant;
                failedAmounts[failedCount] = amount;
                failedCount++;
                continue;
            }
            
            // Transfer tokens (using low-level call to handle failures)
            (bool success, ) = address(usdc).call(
                abi.encodeWithSelector(
                    usdc.transferFrom.selector,
                    participant,
                    vendor,
                    amount
                )
            );
            
            if (success) {
                // Update usage tracking on successful transfer
                dailyUsage[participant].accumulated += amount;
                monthlyUsage[participant].accumulated += amount;
            } else {
                failedParticipants[failedCount] = participant;
                failedAmounts[failedCount] = amount;
                failedCount++;
            }
        }
        
        // Resize failed arrays to actual count
        address[] memory actualFailedParticipants = new address[](failedCount);
        uint256[] memory actualFailedAmounts = new uint256[](failedCount);
        for (uint256 i = 0; i < failedCount; i++) {
            actualFailedParticipants[i] = failedParticipants[i];
            actualFailedAmounts[i] = failedAmounts[i];
        }
        
        // Store payment info
        PaymentInfo storage payment = paymentHistory[currentPaymentId];
        payment.paymentId = currentPaymentId;
        payment.externalId = externalId;
        payment.initiator = msg.sender;
        payment.vendor = vendor;
        payment.participants = participants;
        payment.amounts = amounts;
        payment.timestamp = block.timestamp;
        payment.failedParticipants = actualFailedParticipants;
        payment.failedAmounts = actualFailedAmounts;
        
        externalIdToInternal[externalId] = currentPaymentId;
        externalIds.push(externalId);
        
        emit PaymentProcessed(
            currentPaymentId,
            externalId,
            msg.sender,
            vendor,
            participants,
            amounts,
            actualFailedParticipants,
            actualFailedAmounts
        );
        
        currentPaymentId++;
    }
    
    /**
     * @dev Reset usage window if expired
     * @param usage Usage struct reference
     * @param windowSize Window size in seconds
     */
    function _resetWindow(
        Usage storage usage,
        uint256 windowSize
    ) internal {
        if (block.timestamp >= usage.windowStart + windowSize) {
            usage.windowStart = block.timestamp;
            usage.accumulated = 0;
        } else if (usage.windowStart == 0) {
            usage.windowStart = block.timestamp;
        }
    }
    
    // View functions
    
    /**
     * @dev Check if address is a member
     * @param user User address to check
     * @return True if user is a member
     */
    function isMember(address user) external view returns (bool) {
        return members[user];
    }
    
    /**
     * @dev Get current ledger settings
     * @return approveAmount, maxUsagePerDay, maxUsagePerMonth
     */
    function getSettings() external view returns (uint256, uint256, uint256) {
        return (approveAmount, maxUsagePerDay, maxUsagePerMonth);
    }
    
    /**
     * @dev Get list of all active members
     * @return Array of member addresses
     */
    function listMembers() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        // Count active members
        for (uint256 i = 0; i < membersList.length; i++) {
            if (members[membersList[i]]) {
                activeCount++;
            }
        }
        
        // Create array of active members
        address[] memory activeMembers = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < membersList.length; i++) {
            if (members[membersList[i]]) {
                activeMembers[index] = membersList[i];
                index++;
            }
        }
        
        return activeMembers;
    }
    
    /**
     * @dev Get daily usage for a user
     * @param user User address
     * @return windowStart The start time of the current window
     * @return accumulated The accumulated usage in the current window
     */
    function getDailyUsage(address user) external view returns (uint256 windowStart, uint256 accumulated) {
        return (dailyUsage[user].windowStart, dailyUsage[user].accumulated);
    }
    
    /**
     * @dev Get monthly usage for a user
     * @param user User address
     * @return windowStart The start time of the current window
     * @return accumulated The accumulated usage in the current window
     */
    function getMonthlyUsage(address user) external view returns (uint256 windowStart, uint256 accumulated) {
        return (monthlyUsage[user].windowStart, monthlyUsage[user].accumulated);
    }
    
    /**
     * @dev Get total payment count
     * @return Number of payments processed
     */
    function getPaymentCount() external view returns (uint256) {
        return currentPaymentId;
    }
    
    /**
     * @dev Get payment info by payment ID
     * @param paymentId Internal payment ID
     * @return PaymentInfo struct
     */
    function getPaymentInfo(uint256 paymentId) external view returns (PaymentInfo memory) {
        return paymentHistory[paymentId];
    }
    
    /**
     * @dev Get internal payment ID by external ID
     * @param externalId External payment ID
     * @return Internal payment ID
     */
    function getPaymentIdByExternal(uint256 externalId) external view returns (uint256) {
        return externalIdToInternal[externalId];
    }
    
    /**
     * @dev Get list of all external IDs
     * @return Array of external IDs
     */
    function listExternalIds() external view returns (uint256[] memory) {
        return externalIds;
    }
    
    /**
     * @dev Get successful participants for a payment
     * @param paymentId Internal payment ID
     * @return Array of successful participant addresses
     */
    function getSuccessfulParticipants(uint256 paymentId) external view returns (address[] memory) {
        PaymentInfo memory payment = paymentHistory[paymentId];
        address[] memory successful = new address[](payment.participants.length);
        uint256 successfulCount = 0;
        
        // Check each participant against failed participants
        for (uint256 i = 0; i < payment.participants.length; i++) {
            bool isFailed = false;
            
            // Check if this participant is in the failed list
            for (uint256 j = 0; j < payment.failedParticipants.length; j++) {
                if (payment.participants[i] == payment.failedParticipants[j]) {
                    isFailed = true;
                    break;
                }
            }
            
            if (!isFailed) {
                successful[successfulCount] = payment.participants[i];
                successfulCount++;
            }
        }
        
        // Resize array to actual count
        address[] memory result = new address[](successfulCount);
        for (uint256 i = 0; i < successfulCount; i++) {
            result[i] = successful[i];
        }
        
        return result;
    }
    
    /**
     * @dev Get failed participant details for a payment
     * @param paymentId Internal payment ID
     * @return failedParticipants Array of failed participant addresses
     * @return failedAmounts Array of failed amounts
     */
    function getFailedDetails(uint256 paymentId) external view returns (
        address[] memory failedParticipants,
        uint256[] memory failedAmounts
    ) {
        PaymentInfo memory payment = paymentHistory[paymentId];
        return (payment.failedParticipants, payment.failedAmounts);
    }
} 