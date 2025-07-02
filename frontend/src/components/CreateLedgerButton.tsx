import React, { useState } from "react";
import { parseUnits } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import LedgerFactoryABI from "../abi/LedgerFactory.json";

const LEDGER_FACTORY_ADDRESS = process.env
  .NEXT_PUBLIC_LEDGER_FACTORY_ADDRESS as `0x${string}`;

export function CreateLedgerButton() {
  const [name, setName] = useState("My Ledger");
  const [approveAmount, setApproveAmount] = useState("1000");
  const [maxDaily, setMaxDaily] = useState("100");
  const [maxMonthly, setMaxMonthly] = useState("2000");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [ledgerAddress, setLedgerAddress] = useState<string | null>(null);

  const {
    data: hash,
    writeContract,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const loading = isPending || isConfirming;

  async function handleCreateLedger(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLedgerAddress(null);

    try {
      if (!LEDGER_FACTORY_ADDRESS) {
        throw new Error(
          "LedgerFactory address is not set in environment variables."
        );
      }

      const approve = parseUnits(approveAmount, 6); // USDC has 6 decimals
      const daily = parseUnits(maxDaily, 6);
      const monthly = parseUnits(maxMonthly, 6);

      writeContract({
        address: LEDGER_FACTORY_ADDRESS,
        abi: LedgerFactoryABI.abi,
        functionName: "createLedger",
        args: [name, approve, daily, monthly],
      });
    } catch (err: any) {
      setError(err.message || "Transaction failed");
    }
  }

  // Handle transaction success
  React.useEffect(() => {
    if (isSuccess && hash) {
      // For now, we'll show success without the ledger address
      // In a real implementation, you might want to query the contract for the created ledger
      setSuccess("Ledger created successfully!");
      setName("My Ledger");
      setApproveAmount("1000");
      setMaxDaily("100");
      setMaxMonthly("2000");
    }
  }, [isSuccess, hash]);

  // Handle write errors
  React.useEffect(() => {
    if (writeError) {
      setError(writeError.message || "Transaction failed");
    }
  }, [writeError]);

  if (!LEDGER_FACTORY_ADDRESS) {
    return (
      <div className="text-red-500">
        LedgerFactory address is not set. Please set
        NEXT_PUBLIC_LEDGER_FACTORY_ADDRESS in your .env file.
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={handleCreateLedger}
        className="space-y-4 max-w-md p-4 border rounded-md"
      >
        <div>
          <Label htmlFor="ledger-name">Ledger Name</Label>
          <Input
            id="ledger-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div>
          <Label htmlFor="approve-amount">Approve Amount (USDC)</Label>
          <Input
            id="approve-amount"
            type="number"
            value={approveAmount}
            onChange={(e) => setApproveAmount(e.target.value)}
            required
            disabled={loading}
            min="0"
            step="any"
          />
        </div>
        <div>
          <Label htmlFor="max-daily">Max Daily (USDC)</Label>
          <Input
            id="max-daily"
            type="number"
            value={maxDaily}
            onChange={(e) => setMaxDaily(e.target.value)}
            required
            disabled={loading}
            min="0"
            step="any"
          />
        </div>
        <div>
          <Label htmlFor="max-monthly">Max Monthly (USDC)</Label>
          <Input
            id="max-monthly"
            type="number"
            value={maxMonthly}
            onChange={(e) => setMaxMonthly(e.target.value)}
            required
            disabled={loading}
            min="0"
            step="any"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Ledger"}
        </Button>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">{success}</div>}
      </form>
      {ledgerAddress && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full text-center">
            <h2 className="text-xl font-bold mb-2">Ledger Created!</h2>
            <div className="mb-2 break-all">
              Address:
              <br />
              {ledgerAddress}
            </div>
            <Button onClick={() => setLedgerAddress(null)}>Close</Button>
          </div>
        </div>
      )}
    </>
  );
}

export default CreateLedgerButton;
