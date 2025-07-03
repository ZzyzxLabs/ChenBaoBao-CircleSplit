import React, { useState } from "react";
import { Button } from "../ui/button";
import { parseEther } from "viem";
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";

export function SendTransactionButton() {
  const { address } = useAccount();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [txHash, setTxHash] = useState("");

  const {
    data: hash,
    sendTransaction,
    isPending,
    error: sendError,
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const loading = isPending || isConfirming;

  async function handleSendTransaction() {
    setError("");
    setSuccess("");
    setTxHash("");

    try {
      if (!address) throw new Error("Please connect your wallet first");

      // Send transaction to yourself as an example
      sendTransaction({
        to: address,
        value: parseEther("0.001"), // 0.001 ETH
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Transaction failed";
      setError(errorMessage);
    }
  }

  // Handle transaction success
  React.useEffect(() => {
    if (isSuccess && hash) {
      setTxHash(hash);
      setSuccess("Transaction successful!");
    }
  }, [isSuccess, hash]);

  // Handle send errors
  React.useEffect(() => {
    if (sendError) {
      setError(sendError.message || "Transaction failed");
    }
  }, [sendError]);

  return (
    <div className="flex flex-col gap-4">
      <Button
        className="w-full h-14 text-lg rounded-xl border-2 border-black shadow-md hover:shadow-lg transition-shadow"
        variant="outline"
        onClick={handleSendTransaction}
        disabled={loading || !address}
      >
        {loading ? "Sending..." : "Send Transaction"}
      </Button>

      {error && (
        <div className="text-red-500 text-sm text-center p-2 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="text-green-600 text-sm text-center p-2 bg-green-50 rounded-lg">
          {success}
          {txHash && (
            <div className="text-xs mt-1 break-all">
              Transaction Hash: {txHash}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
