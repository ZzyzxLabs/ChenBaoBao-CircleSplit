# CircleSplit – Onchain Group Payment Splitter for MetaMask Card Users

For the **MetaMask Card Hackathon**, we built **CircleSplit**, a **smart contract-based group payment system** designed to help users **split and settle shared expenses onchain in USDC**.

---

## 💡 What We Built

### 🏗️ Ledger Factory

A **smart contract** that lets any user **create a new Ledger**, which acts as an **onchain group expense tracker**.

---

### 👥 User Join & Approval

Other users can **join a Ledger** and **approve USDC payments** they’re willing to contribute toward the group expense.

---

### ⚖️ Flexible Split Logic

The **Ledger owner (or group manager)** can **edit and configure how the total payment is split among members** —
supporting **custom allocations** such as:

* Equal split
* Ratio-based split
* Manual amount per user

---

### ✅ Onchain Settlement

Once all members approve, the system **executes the USDC transfers onchain**
from each member **directly to the recipient**, ensuring **transparency and automation**.

---

### 🌉 Cross-Chain Asset Support (via LI.FI)

For users whose **USDC is on a different chain**,
we’ve **integrated LI.FI**, allowing them to **bridge and swap their assets easily**
to the correct chain **before payment execution**.

---

## 🚀 MetaMask Card Vision (Future Work)

In the future, if **MetaMask Card** offers **programmable payment hooks or external settlement triggers**,
**CircleSplit will automatically:**

1. **Detect card purchases**
2. **Configure the Ledger**
3. **Initiate onchain USDC split and settlement across group members**

This will **seamlessly connect real-world card spending with onchain group payment management**.

---

## 🛠️ Tech Stack

* Solidity (Ledger Factory and Ledger contracts)
* Hardhat (development & testing)
* Wagmi + viem + Next.js (frontend)
* LI.FI SDK (cross-chain swap & bridge)
