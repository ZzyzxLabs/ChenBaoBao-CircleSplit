import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { LedgerFactory, Ledger } from "../typechain-types";

describe("CircleSplit Contracts", function () {
  let ledgerFactory: LedgerFactory;
  let ledger: Ledger;
  let mockUSDC: any;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let vendor: SignerWithAddress;

  const APPROVE_AMOUNT = ethers.parseUnits("1000", 6); // 1000 USDC
  const MAX_DAILY = ethers.parseUnits("100", 6); // 100 USDC
  const MAX_MONTHLY = ethers.parseUnits("2000", 6); // 2000 USDC

  beforeEach(async function () {
    [owner, user1, user2, user3, vendor] = await ethers.getSigners();

    // Deploy a mock ERC20 token for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("Mock USDC", "USDC", 6);
    await mockUSDC.waitForDeployment();

    // Mint tokens to users
    const mintAmount = ethers.parseUnits("10000", 6);
    await mockUSDC.mint(user1.address, mintAmount);
    await mockUSDC.mint(user2.address, mintAmount);
    await mockUSDC.mint(user3.address, mintAmount);

    // Deploy LedgerFactory
    const LedgerFactory = await ethers.getContractFactory("LedgerFactory");
    ledgerFactory = await LedgerFactory.deploy(await mockUSDC.getAddress());
    await ledgerFactory.waitForDeployment();
  });

  describe("LedgerFactory", function () {
    it("Should initialize with correct USDC token", async function () {
      expect(await ledgerFactory.usdcToken()).to.equal(
        await mockUSDC.getAddress()
      );
    });

    it("Should revert with invalid USDC token address", async function () {
      const LedgerFactory = await ethers.getContractFactory("LedgerFactory");
      await expect(LedgerFactory.deploy(ethers.ZeroAddress)).to.be.revertedWith(
        "Invalid USDC token address"
      );
    });

    it("Should create a new ledger", async function () {
      const tx = await ledgerFactory.createLedger(
        "Test Ledger",
        APPROVE_AMOUNT,
        MAX_DAILY,
        MAX_MONTHLY
      );

      const receipt = await tx.wait();
      console.log("Gas used", receipt?.gasUsed.toString());

      await expect(tx)
        .to.emit(ledgerFactory, "LedgerCreated")
        .withArgs(
          owner.address,
          await ledgerFactory.getUserLedgerByIndex(owner.address, 0),
          "Test Ledger"
        );
      console.log(
        "ledger address",
        await ledgerFactory.getUserLedgerByIndex(owner.address, 0)
      );

      const userLedgers = await ledgerFactory.getUserLedgers(owner.address);
      expect(userLedgers.length).to.equal(1);
      expect(await ledgerFactory.getUserLedgersCount(owner.address)).to.equal(
        1
      );
    });
  });
});
