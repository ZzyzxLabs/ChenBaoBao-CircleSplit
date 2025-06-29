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
  const MAX_DAILY = ethers.parseUnits("100", 6);       // 100 USDC
  const MAX_MONTHLY = ethers.parseUnits("2000", 6);    // 2000 USDC

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
      expect(await ledgerFactory.usdcToken()).to.equal(await mockUSDC.getAddress());
    });

    it("Should revert with invalid USDC token address", async function () {
      const LedgerFactory = await ethers.getContractFactory("LedgerFactory");
      await expect(
        LedgerFactory.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid USDC token address");
    });

    it("Should create a new ledger", async function () {
      const tx = await ledgerFactory.createLedger(
        "Test Ledger",
        APPROVE_AMOUNT,
        MAX_DAILY,
        MAX_MONTHLY
      );

      await expect(tx)
        .to.emit(ledgerFactory, "LedgerCreated")
        .withArgs(owner.address, await ledgerFactory.getUserLedgerByIndex(owner.address, 0), "Test Ledger");

      const userLedgers = await ledgerFactory.getUserLedgers(owner.address);
      expect(userLedgers.length).to.equal(1);
      expect(await ledgerFactory.getUserLedgersCount(owner.address)).to.equal(1);
    });

    it("Should revert with invalid parameters", async function () {
      await expect(
        ledgerFactory.createLedger("", APPROVE_AMOUNT, MAX_DAILY, MAX_MONTHLY)
      ).to.be.revertedWith("Name cannot be empty");

      await expect(
        ledgerFactory.createLedger("Test", 0, MAX_DAILY, MAX_MONTHLY)
      ).to.be.revertedWith("Approve amount must be greater than 0");

      await expect(
        ledgerFactory.createLedger("Test", APPROVE_AMOUNT, 0, MAX_MONTHLY)
      ).to.be.revertedWith("Max daily must be greater than 0");

      await expect(
        ledgerFactory.createLedger("Test", APPROVE_AMOUNT, MAX_DAILY, 0)
      ).to.be.revertedWith("Max monthly must be greater than 0");

      await expect(
        ledgerFactory.createLedger("Test", APPROVE_AMOUNT, MAX_MONTHLY, MAX_DAILY)
      ).to.be.revertedWith("Daily limit cannot exceed monthly limit");
    });

    it("Should track multiple ledgers per user", async function () {
      await ledgerFactory.createLedger("Ledger 1", APPROVE_AMOUNT, MAX_DAILY, MAX_MONTHLY);
      await ledgerFactory.createLedger("Ledger 2", APPROVE_AMOUNT, MAX_DAILY, MAX_MONTHLY);

      expect(await ledgerFactory.getUserLedgersCount(owner.address)).to.equal(2);
      
      const ledger1 = await ledgerFactory.getUserLedgerByIndex(owner.address, 0);
      const ledger2 = await ledgerFactory.getUserLedgerByIndex(owner.address, 1);
      
      expect(ledger1).to.not.equal(ledger2);
    });

    it("Should revert when accessing invalid index", async function () {
      await expect(
        ledgerFactory.getUserLedgerByIndex(owner.address, 0)
      ).to.be.revertedWith("Index out of bounds");
    });

    describe("Member Tracking", function () {
      let ledgerAddress: string;

      beforeEach(async function () {
        await ledgerFactory.createLedger("Test Ledger", APPROVE_AMOUNT, MAX_DAILY, MAX_MONTHLY);
        ledgerAddress = await ledgerFactory.getUserLedgerByIndex(owner.address, 0);
      });

      it("Should track multiple ledgers for a user", async function () {
        // Create second ledger
        await ledgerFactory.createLedger("Second Ledger", APPROVE_AMOUNT, MAX_DAILY, MAX_MONTHLY);
        const secondLedgerAddress = await ledgerFactory.getUserLedgerByIndex(owner.address, 1);

        // Get both ledger contracts
        const LedgerContract = await ethers.getContractFactory("Ledger");
        const ledger1 = LedgerContract.attach(ledgerAddress) as any;
        const ledger2 = LedgerContract.attach(secondLedgerAddress) as any;

        // User1 joins both ledgers
        await mockUSDC.connect(user1).approve(ledgerAddress, APPROVE_AMOUNT);
        await mockUSDC.connect(user1).approve(secondLedgerAddress, APPROVE_AMOUNT);
        
        await ledger1.connect(user1).join();
        await ledger2.connect(user1).join();

        // Check tracking
        const memberLedgers = await (ledgerFactory as any).getUserMemberLedgers(user1.address);
        expect(memberLedgers.length).to.equal(2);
        expect(memberLedgers).to.include(ledgerAddress);
        expect(memberLedgers).to.include(secondLedgerAddress);
        expect(await (ledgerFactory as any).getUserMemberLedgersCount(user1.address)).to.equal(2);
      });

      it("Should provide access to member ledgers by index", async function () {
        const LedgerContract = await ethers.getContractFactory("Ledger");
        const testLedger = LedgerContract.attach(ledgerAddress) as any;

        await mockUSDC.connect(user1).approve(ledgerAddress, APPROVE_AMOUNT);
        await testLedger.connect(user1).join();

        const firstMemberLedger = await (ledgerFactory as any).getUserMemberLedgerByIndex(user1.address, 0);
        expect(firstMemberLedger).to.equal(ledgerAddress);

        await expect(
          (ledgerFactory as any).getUserMemberLedgerByIndex(user1.address, 1)
        ).to.be.revertedWith("Index out of bounds");
      });

      it("Should only allow valid ledgers to call member tracking functions", async function () {
        await expect(
          (ledgerFactory as any).addMemberToLedger(user1.address, ethers.ZeroAddress)
        ).to.be.reverted;

        await expect(
          (ledgerFactory as any).removeMemberFromLedger(user1.address, ethers.ZeroAddress)
        ).to.be.reverted;
      });
    });
  });

  describe("Ledger", function () {
    beforeEach(async function () {
      // Create a ledger for testing
      await ledgerFactory.createLedger("Test Ledger", APPROVE_AMOUNT, MAX_DAILY, MAX_MONTHLY);
      const ledgerAddress = await ledgerFactory.getUserLedgerByIndex(owner.address, 0);
      
      const LedgerContract = await ethers.getContractFactory("Ledger");
      ledger = LedgerContract.attach(ledgerAddress) as Ledger;
      // console.log("ledger", await ledger.owner());
    });

    describe("Initialization", function () {
      it("Should initialize with correct parameters", async function () {
        expect(await ledger.usdc()).to.equal(await mockUSDC.getAddress());
        expect(await ledger.owner()).to.equal(owner.address);
        
        const [approveAmount, maxDaily, maxMonthly] = await ledger.getSettings();
        expect(approveAmount).to.equal(APPROVE_AMOUNT);
        expect(maxDaily).to.equal(MAX_DAILY);
        expect(maxMonthly).to.equal(MAX_MONTHLY);
      });
    });

    describe("Member Management", function () {
      it("Should allow users to join after approving tokens", async function () {
        // User1 approves tokens
        await mockUSDC.connect(user1).approve(await ledger.getAddress(), APPROVE_AMOUNT);
        
        await expect(ledger.connect(user1).join())
          .to.emit(ledger, "MemberJoined")
          .withArgs(user1.address);

        expect(await ledger.isMember(user1.address)).to.be.true;
        
        const members = await ledger.listMembers();
        expect(members).to.include(user1.address);
        console.log("members", members);
        
        // Check that user is added to factory member tracking
        const memberLedgers = await (ledgerFactory as any).getUserMemberLedgers(user1.address);
        expect(memberLedgers).to.include(await ledger.getAddress());
        expect(await (ledgerFactory as any).getUserMemberLedgersCount(user1.address)).to.equal(1);
      });

      it("Should revert if user hasn't approved enough tokens", async function () {
        await expect(
          ledger.connect(user1).join()
        ).to.be.revertedWith("Approve USDC first");
      });

      it("Should revert if user is already a member", async function () {
        await mockUSDC.connect(user1).approve(await ledger.getAddress(), APPROVE_AMOUNT);
        await ledger.connect(user1).join();

        await expect(
          ledger.connect(user1).join()
        ).to.be.revertedWith("Already a member");
      });

      it("Should allow members to leave", async function () {
        // Join first
        await mockUSDC.connect(user1).approve(await ledger.getAddress(), APPROVE_AMOUNT);
        await ledger.connect(user1).join();

        await expect(ledger.connect(user1).leave())
          .to.emit(ledger, "MemberLeft")
          .withArgs(user1.address);

        expect(await ledger.isMember(user1.address)).to.be.false;
        
        const members = await ledger.listMembers();
        expect(members).to.not.include(user1.address);
        
        // Check that user is removed from factory member tracking
        const memberLedgers = await (ledgerFactory as any).getUserMemberLedgers(user1.address);
        expect(memberLedgers).to.not.include(await ledger.getAddress());
        expect(await (ledgerFactory as any).getUserMemberLedgersCount(user1.address)).to.equal(0);
      });

      it("Should revert if non-member tries to leave", async function () {
        await expect(
          ledger.connect(user1).leave()
        ).to.be.revertedWith("Not a member");
      });
    });


    describe("Payment Splitting", function () {
      beforeEach(async function () {
        // Setup members
        await mockUSDC.connect(user1).approve(await ledger.getAddress(), APPROVE_AMOUNT);
        await mockUSDC.connect(user2).approve(await ledger.getAddress(), APPROVE_AMOUNT);
        await mockUSDC.connect(user3).approve(await ledger.getAddress(), APPROVE_AMOUNT);
        
        await ledger.connect(user1).join();
        await ledger.connect(user2).join();
        await ledger.connect(user3).join();
      });

      it("Should split payment successfully", async function () {
        const participants = [user1.address, user2.address];
        const amounts = [ethers.parseUnits("50", 6), ethers.parseUnits("30", 6)];
        const externalId = 12345;

        const vendorBalanceBefore = await mockUSDC.balanceOf(vendor.address);
        await expect(
          ledger.connect(user1).splitPayment(externalId, vendor.address, participants, amounts)
        ).to.emit(ledger, "PaymentProcessed");

        
        const vendorBalanceAfter = await mockUSDC.balanceOf(vendor.address);
        expect(vendorBalanceAfter - vendorBalanceBefore).to.equal(
          ethers.parseUnits("80", 6)
        );

        // Check payment history
        expect(await ledger.getPaymentCount()).to.equal(1);
        const paymentInfo = await ledger.getPaymentInfo(0);
        expect(paymentInfo.externalId).to.equal(externalId);
        expect(paymentInfo.initiator).to.equal(user1.address);
        expect(paymentInfo.vendor).to.equal(vendor.address);

        // Check usage tracking
        const [, dailyAccumulated1] = await ledger.getDailyUsage(user1.address);
        const [, dailyAccumulated2] = await ledger.getDailyUsage(user2.address);
        expect(dailyAccumulated1).to.equal(ethers.parseUnits("50", 6));
        expect(dailyAccumulated2).to.equal(ethers.parseUnits("30", 6));
      });

      it("Should handle failed transfers gracefully", async function () {
        // User3 doesn't have enough balance
        await mockUSDC.connect(user3).transfer(owner.address, await mockUSDC.balanceOf(user3.address));

        const participants = [user1.address, user3.address];
        const amounts = [ethers.parseUnits("50", 6), ethers.parseUnits("30", 6)];
        const externalId = 12346;

        await ledger.connect(user1).splitPayment(externalId, vendor.address, participants, amounts);

        // Check that only successful transfers were processed
        const paymentInfo = await ledger.getPaymentInfo(0);
        expect(paymentInfo.failedParticipants.length).to.equal(1);
        expect(paymentInfo.failedParticipants[0]).to.equal(user3.address);
        expect(paymentInfo.failedAmounts[0]).to.equal(ethers.parseUnits("30", 6));


        // Check successful participants
        const successfulParticipants = await ledger.getSuccessfulParticipants(0);
        expect(successfulParticipants).to.include(user1.address);
        expect(successfulParticipants).to.not.include(user3.address);
      });

      it("Should respect daily usage limits", async function () {
        const participants = [user1.address];
        const amounts = [ethers.parseUnits("150", 6)]; // Exceeds daily limit
        const externalId = 12347;

        await expect(
          ledger.connect(user1).splitPayment(externalId, vendor.address, participants, amounts)
        ).to.be.revertedWith("Daily or monthly usage limit exceeded");
      });

      it("Should revert for non-members", async function () {
        const participants = [user1.address];
        const amounts = [ethers.parseUnits("50", 6)];

        await expect(
          ledger.connect(owner).splitPayment(12348, vendor.address, participants, amounts)
        ).to.be.revertedWith("Not a member");
      });

      it("Should revert with invalid parameters", async function () {
        const participants = [user1.address, user2.address];
        const amounts = [ethers.parseUnits("50", 6)]; // Mismatched array lengths

        await expect(
          ledger.connect(user1).splitPayment(12349, vendor.address, participants, amounts)
        ).to.be.revertedWith("Array length mismatch");

        await expect(
          ledger.connect(user1).splitPayment(12350, vendor.address, [], [])
        ).to.be.revertedWith("No participants");

        await expect(
          ledger.connect(user1).splitPayment(12351, ethers.ZeroAddress, [user1.address], [ethers.parseUnits("50", 6)])
        ).to.be.revertedWith("Invalid vendor address");
      });
    });

    describe("Usage Tracking", function () {
      beforeEach(async function () {
        await mockUSDC.connect(user1).approve(await ledger.getAddress(), APPROVE_AMOUNT);
        await ledger.connect(user1).join();
      });

      it("Should track usage correctly", async function () {
        const participants = [user1.address];
        const amounts = [ethers.parseUnits("50", 6)];

        await ledger.connect(user1).splitPayment(12352, vendor.address, participants, amounts);

        const [dailyStart, dailyAccumulated] = await ledger.getDailyUsage(user1.address);
        const [monthlyStart, monthlyAccumulated] = await ledger.getMonthlyUsage(user1.address);

        expect(dailyAccumulated).to.equal(ethers.parseUnits("50", 6));
        expect(monthlyAccumulated).to.equal(ethers.parseUnits("50", 6));
        expect(dailyStart).to.be.gt(0);
        expect(monthlyStart).to.be.gt(0);
      });
    });

    describe("Payment History", function () {
      beforeEach(async function () {
        await mockUSDC.connect(user1).approve(await ledger.getAddress(), APPROVE_AMOUNT);
        await ledger.connect(user1).join();
      });

      it("Should maintain payment history correctly", async function () {
        const externalId = 12353;
        await ledger.connect(user1).splitPayment(externalId, vendor.address, [user1.address], [ethers.parseUnits("50", 6)]);

        expect(await ledger.getPaymentCount()).to.equal(1);
        expect(await ledger.getPaymentIdByExternal(externalId)).to.equal(0);

        const externalIds = await ledger.listExternalIds();
        expect(externalIds).to.include(BigInt(externalId));

        const paymentInfo = await ledger.getPaymentInfo(0);
        expect(paymentInfo.paymentId).to.equal(0);
        expect(paymentInfo.externalId).to.equal(externalId);
        expect(paymentInfo.initiator).to.equal(user1.address);
        expect(paymentInfo.vendor).to.equal(vendor.address);
      });

      it("Should return failed details correctly", async function () {
        // Create a payment with failures
        await mockUSDC.connect(user2).approve(await ledger.getAddress(), APPROVE_AMOUNT);
        await ledger.connect(user2).join();
        
        // Remove user2's balance to cause failure
        await mockUSDC.connect(user2).transfer(owner.address, await mockUSDC.balanceOf(user2.address));

        await ledger.connect(user1).splitPayment(
          12354, 
          vendor.address, 
          [user1.address, user2.address], 
          [ethers.parseUnits("50", 6), ethers.parseUnits("30", 6)]
        );

        const [failedParticipants, failedAmounts] = await ledger.getFailedDetails(0);
        expect(failedParticipants).to.include(user2.address);
        expect(failedAmounts[0]).to.equal(ethers.parseUnits("30", 6));
      });
    });
  });
}); 