# CircleSplit Smart Contracts

CircleSplit is a decentralized group expense management system built on Ethereum. It allows groups to manage shared expenses with automatic payment splitting and usage tracking.

## Overview

The system consists of two main contracts:

1. **LedgerFactory**: A factory contract for creating and managing multiple Ledger instances
2. **Ledger**: Individual expense ledgers with member management and payment splitting functionality

## Contracts

### LedgerFactory

The `LedgerFactory` contract serves as a central hub for creating and tracking Ledger contracts.

#### Key Features
- Deploy new Ledger contracts
- Track ledgers by creator
- Automatic member tracking across all ledgers
- Immutable USDC token configuration

#### State Variables
- `address public immutable usdcToken`: The USDC token address used across all ledgers
- `mapping(address => address[]) public userLedgers`: Maps users to their created ledgers
- `mapping(address => address[]) public userMemberLedgers`: Maps users to ledgers where they are members

#### Functions

##### `createLedger(string calldata name, uint256 approveAmount, uint256 maxDaily, uint256 maxMonthly)`
Creates a new Ledger contract with the specified parameters.

**Parameters:**
- `name`: Identifier for the ledger (for event logging)
- `approveAmount`: Required USDC approval amount for members to join
- `maxDaily`: Maximum USDC spending per day per member
- `maxMonthly`: Maximum USDC spending per month per member

**Emits:** `LedgerCreated(address indexed creator, address indexed ledgerAddress, string name)`

##### View Functions
- `getUserLedgers(address user)`: Returns array of ledger addresses created by user
- `getUserLedgersCount(address user)`: Returns count of ledgers created by user
- `getUserLedgerByIndex(address user, uint256 idx)`: Returns ledger address at specific index

##### Member Tracking Functions
- `getUserMemberLedgers(address user)`: Returns array of ledger addresses where user is a member
- `getUserMemberLedgersCount(address user)`: Returns count of ledgers where user is a member
- `getUserMemberLedgerByIndex(address user, uint256 idx)`: Returns member ledger address at specific index

### Ledger

The `Ledger` contract manages group expenses with member management and payment splitting.

#### Key Features
- Member management with USDC approval requirements
- Daily and monthly spending limits per member
- Automatic payment splitting with failure handling
- Comprehensive payment history tracking
- Usage window management (rolling periods)

#### Inheritance
- `Ownable`: Access control for administrative functions
- `ReentrancyGuard`: Protection against reentrancy attacks

#### State Variables
- `IERC20 public immutable usdc`: The USDC token contract
- `uint256 public approveAmount`: Required approval amount for joining
- `uint256 public maxUsagePerDay`: Daily spending limit per member
- `uint256 public maxUsagePerMonth`: Monthly spending limit per member
- `mapping(address => bool) public members`: Member status tracking
- `address[] public membersList`: Array of all members for enumeration

#### Structs

##### `Usage`
```solidity
struct Usage {
    uint256 windowStart;  // Start timestamp of current window
    uint256 accumulated;  // Accumulated usage in current window
}
```

##### `PaymentInfo`
```solidity
struct PaymentInfo {
    uint256 paymentId;              // Internal payment ID
    uint256 externalId;             // External reference ID
    address initiator;              // Who initiated the payment
    address vendor;                 // Payment recipient
    address[] participants;         // All participants
    uint256[] amounts;              // Corresponding amounts
    uint256 timestamp;              // Payment timestamp
    address[] failedParticipants;   // Participants whose payments failed
    uint256[] failedAmounts;        // Corresponding failed amounts
}
```

#### Core Functions

##### `join()`
Join the ledger as a member. Requires prior USDC approval. Automatically updates member tracking in the factory.

**Requirements:**
- Caller must not already be a member
- Caller must have approved at least `approveAmount` USDC to the contract

##### `leave()`
Leave the ledger (removes member status). Automatically updates member tracking in the factory.

##### `splitPayment(uint256 externalId, address vendor, address[] calldata participants, uint256[] calldata amounts)`
Split a payment among multiple participants with automatic failure handling.

**Parameters:**
- `externalId`: External reference ID for the payment
- `vendor`: Address to receive the payments
- `participants`: Array of participant addresses
- `amounts`: Array of amounts for each participant

**Behavior:**
- Validates usage limits for each participant
- Attempts to transfer USDC from each participant to vendor
- Tracks successful and failed transfers
- Updates usage tracking for successful transfers
- Records complete payment history

**Emits:** `PaymentProcessed` with complete transaction details

##### Administrative Functions (Owner Only)

##### `setSettings(uint256 _approveAmount, uint256 _maxDaily, uint256 _maxMonthly)`
Update ledger configuration parameters.

#### View Functions

##### Member Management
- `isMember(address user)`: Check if address is a member
- `listMembers()`: Get array of all active members

##### Settings
- `getSettings()`: Get current approval amount and limits

##### Usage Tracking
- `getDailyUsage(address user)`: Get daily usage window and accumulated amount
- `getMonthlyUsage(address user)`: Get monthly usage window and accumulated amount

##### Payment History
- `getPaymentCount()`: Total number of payments processed
- `getPaymentInfo(uint256 paymentId)`: Get complete payment information
- `getPaymentIdByExternal(uint256 externalId)`: Map external ID to internal payment ID
- `listExternalIds()`: Get array of all external IDs
- `getSuccessfulParticipants(uint256 paymentId)`: Get participants whose payments succeeded
- `getFailedDetails(uint256 paymentId)`: Get failed participants and amounts

## Usage Example

```solidity
// 1. Deploy LedgerFactory
LedgerFactory factory = new LedgerFactory(usdcTokenAddress);

// 2. Create a new Ledger
factory.createLedger(
    "Family Expenses",
    1000 * 10**6,  // 1000 USDC approval required
    100 * 10**6,   // 100 USDC daily limit
    2000 * 10**6   // 2000 USDC monthly limit
);

// 3. Get the created ledger
address[] memory userLedgers = factory.getUserLedgers(msg.sender);
Ledger ledger = Ledger(userLedgers[0]);

// 4. Members join (after approving USDC)
// Note: Each member must first approve USDC tokens
// usdc.approve(ledgerAddress, approveAmount);
ledger.join();

// 5. Split a payment
address[] memory participants = [member1, member2, member3];
uint256[] memory amounts = [50 * 10**6, 75 * 10**6, 25 * 10**6]; // USDC amounts
ledger.splitPayment(
    12345,      // External payment ID
    vendor,     // Vendor address
    participants,
    amounts
);
```

## Security Features

1. **Reentrancy Protection**: All state-changing functions are protected against reentrancy attacks
2. **Access Control**: Administrative functions are restricted to contract owner
3. **Input Validation**: Comprehensive parameter validation and bounds checking
4. **Graceful Failure Handling**: Failed transfers are tracked without reverting the entire transaction
5. **Usage Limits**: Per-member daily and monthly spending limits prevent abuse

## Gas Optimization

- **Member Tracking**: Efficient member enumeration with array management
- **Payment Batching**: Single transaction for multiple participant payments
- **Window Management**: Automatic reset of usage windows to minimize storage operations

## Development

### Prerequisites
- Node.js and npm
- Hardhat development environment
- OpenZeppelin contracts

### Installation
```bash
npm install @openzeppelin/contracts
npx hardhat compile
```

### Testing
```bash
npx hardhat run scripts/demo.ts
```

### Deployment
```bash
npx hardhat ignition deploy ignition/modules/Deploy.ts --network <network>
```

## Network Compatibility

These contracts are compatible with any EVM-compatible network. Ensure you use the correct USDC token address for your target network:

- **Ethereum Mainnet**: `0xA0b86a33E6441c8F59c7f5c4dA6c0c90E4bb4C5A`
- **Polygon**: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
- **Arbitrum**: `0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8`

For testnets, deploy a mock ERC20 token or use testnet USDC contracts.

## License

MIT License
