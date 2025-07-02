"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Caveat } from "next/font/google";
import { useState, useEffect } from "react";
import { parseUnits } from "viem";
import {
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import LedgerABI from "@/abi/Ledger.json";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearchParams } from "next/navigation";
import LifiWidgetButton from "@/components/lifi/lifiButton";

const caveat = Caveat({ subsets: ["latin"], weight: "400" });

// Helper to shorten addresses
function shortAddr(addr: string) {
  if (!addr) return "";
  return addr.length > 12 ? addr.slice(0, 6) + "..." + addr.slice(-4) : addr;
}

// Helper to format timestamp
function formatTimestamp(timestamp: bigint) {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString();
}

// Helper to format USDC amount
function formatUSDC(amount: bigint) {
  return (Number(amount) / 1e6).toLocaleString();
}

interface PaymentInfo {
  paymentId: bigint;
  externalId: bigint;
  initiator: `0x${string}`;
  vendor: `0x${string}`;
  participants: `0x${string}`[];
  amounts: bigint[];
  timestamp: bigint;
  failedParticipants: `0x${string}`[];
  failedAmounts: bigint[];
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const ledgerAddress = searchParams.get("ledger") || "";
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [externalId, setExternalId] = useState("");
  const [vendor, setVendor] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    []
  );
  const [participantAmounts, setParticipantAmounts] = useState<{
    [addr: string]: string;
  }>({});
  const [payments, setPayments] = useState<PaymentInfo[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const publicClient = usePublicClient();

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

  // Read members when modal opens
  const { data: membersList } = useReadContract({
    address: ledgerAddress as `0x${string}`,
    abi: LedgerABI.abi,
    functionName: "listMembers",
    query: {
      enabled: showModal && !!ledgerAddress,
    },
  });

  // Read payment count
  const { data: paymentCount } = useReadContract({
    address: ledgerAddress as `0x${string}`,
    abi: LedgerABI.abi,
    functionName: "getPaymentCount",
    query: {
      enabled: !!ledgerAddress,
    },
  });

  // Fetch payment details
  useEffect(() => {
    async function fetchPayments() {
      if (!ledgerAddress || !publicClient || !paymentCount) return;

      setLoadingPayments(true);
      try {
        const paymentCountNum = Number(paymentCount);
        const paymentPromises = [];

        for (let i = 0; i < paymentCountNum; i++) {
          paymentPromises.push(
            publicClient.readContract({
              address: ledgerAddress as `0x${string}`,
              abi: LedgerABI.abi,
              functionName: "getPaymentInfo",
              args: [BigInt(i)],
            })
          );
        }

        const paymentResults = await Promise.all(paymentPromises);
        const validPayments = paymentResults
          .map((result, index) => {
            if (result && typeof result === "object" && "paymentId" in result) {
              return result as PaymentInfo;
            }
            return null;
          })
          .filter((payment): payment is PaymentInfo => payment !== null)
          .reverse(); // Show newest first

        setPayments(validPayments);
      } catch (err) {
        console.error("Error fetching payments:", err);
        setError("Failed to load payment details");
      } finally {
        setLoadingPayments(false);
      }
    }

    fetchPayments();
  }, [ledgerAddress, publicClient, paymentCount]);

  // Update members when data changes
  useEffect(() => {
    if (membersList) {
      setMembers(membersList as string[]);
    }
  }, [membersList]);

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (!ledgerAddress) throw new Error("Ledger address is required in URL");

      const parsedExternalId = BigInt(externalId);
      const parsedVendor = vendor;
      const parsedParticipants = selectedParticipants;
      const parsedAmounts = selectedParticipants.map((addr) =>
        parseUnits(participantAmounts[addr] || "0", 6)
      );

      if (parsedParticipants.length !== parsedAmounts.length) {
        throw new Error("Participants and amounts length mismatch");
      }

      if (parsedAmounts.some((a) => a <= BigInt(0))) {
        throw new Error("All amounts must be greater than 0");
      }

      await writeContract({
        address: ledgerAddress as `0x${string}`,
        abi: LedgerABI.abi,
        functionName: "splitPayment",
        args: [
          parsedExternalId,
          parsedVendor,
          parsedParticipants,
          parsedAmounts,
        ],
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    }
  }

  // Handle transaction success
  useEffect(() => {
    if (isSuccess) {
      setSuccess("Payment added successfully!");
      setShowModal(false);
      setExternalId("");
      setVendor("");
      setSelectedParticipants([]);
      setParticipantAmounts({});
      // Refresh payments after successful transaction
      if (paymentCount) {
        const newCount = Number(paymentCount) + 1;
        // Trigger a re-fetch by updating the dependency
        setPayments([]);
      }
    }
  }, [isSuccess, paymentCount]);

  // Handle write errors
  useEffect(() => {
    if (writeError) {
      setError(writeError.message || "Transaction failed");
    }
  }, [writeError]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-[480px] p-8 flex flex-col items-center border-2 border-black rounded-2xl shadow-lg">
        <h1
          className={`text-4xl mb-8 text-center font-bold ${caveat.className}`}
        >
          Transactions
        </h1>
        <div className="w-full flex-1 flex flex-col items-center">
          <div
            className="w-full max-h-64 overflow-y-auto flex flex-col gap-4 bg-white/60 border border-black rounded-xl p-4 mb-8"
            style={{ minHeight: 180 }}
          >
            {loadingPayments ? (
              <div className="text-center text-gray-400">
                Loading payments...
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center text-gray-400">
                {paymentCount && Number(paymentCount) > 0
                  ? "No payment details found."
                  : "No transactions found."}
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.paymentId.toString()}
                    className="bg-white/80 rounded-lg p-3 border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-semibold">
                        Payment #{payment.paymentId.toString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTimestamp(payment.timestamp)}
                      </div>
                    </div>
                    <div className="text-xs space-y-1">
                      <div>
                        <span className="font-medium">External ID:</span>{" "}
                        {payment.externalId.toString()}
                      </div>
                      <div>
                        <span className="font-medium">Initiator:</span>{" "}
                        {shortAddr(payment.initiator)}
                      </div>
                      <div>
                        <span className="font-medium">Vendor:</span>{" "}
                        {shortAddr(payment.vendor)}
                      </div>
                      <div>
                        <span className="font-medium">Participants:</span>{" "}
                        {payment.participants.length}
                      </div>
                      <div>
                        <span className="font-medium">Total Amount:</span>{" "}
                        {formatUSDC(
                          payment.amounts.reduce(
                            (sum, amount) => sum + amount,
                            BigInt(0)
                          )
                        )}{" "}
                        USDC
                      </div>
                      {payment.failedParticipants.length > 0 && (
                        <div className="text-red-600">
                          <span className="font-medium">Failed:</span>{" "}
                          {payment.failedParticipants.length} participants
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex w-full gap-8 mt-4 justify-center">
            <LifiWidgetButton />
            <Button
              className="flex-1 h-14 text-lg rounded-xl border-2 border-black"
              variant="outline"
              onClick={() => setShowModal(true)}
            >
              add payment
            </Button>
          </div>
        </div>
      </Card>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full relative">
            <button
              className="absolute top-2 right-2 text-xl"
              onClick={() => setShowModal(false)}
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4">Add Payment</h2>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <Label>Ledger Address</Label>
                <div className="bg-gray-100 rounded px-2 py-1 text-sm break-all">
                  {ledgerAddress || (
                    <span className="text-red-500">Not found in URL</span>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="external-id">External ID</Label>
                <Input
                  id="external-id"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="e.g. 123"
                />
              </div>
              <div>
                <Label htmlFor="vendor">Vendor Address</Label>
                <Input
                  id="vendor"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="0x..."
                />
              </div>
              <div>
                <Label htmlFor="participants">Participants</Label>
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto border rounded px-2 py-2">
                  {members.length === 0 && (
                    <div className="text-gray-400 text-sm">
                      No members found.
                    </div>
                  )}
                  {members.map((addr) => (
                    <label key={addr} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        value={addr}
                        checked={selectedParticipants.includes(addr)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedParticipants((prev) => [...prev, addr]);
                          } else {
                            setSelectedParticipants((prev) =>
                              prev.filter((a) => a !== addr)
                            );
                            setParticipantAmounts((prev) => {
                              const copy = { ...prev };
                              delete copy[addr];
                              return copy;
                            });
                          }
                        }}
                        disabled={loading}
                      />
                      <span className="break-all text-sm">
                        {shortAddr(addr)}
                      </span>
                      {selectedParticipants.includes(addr) && (
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="w-24 ml-2"
                          placeholder="Amount"
                          value={participantAmounts[addr] || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setParticipantAmounts((prev) => ({
                              ...prev,
                              [addr]: value,
                            }));
                          }}
                          disabled={loading}
                        />
                      )}
                    </label>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Check to select participants and enter an amount for each.
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading || !ledgerAddress}
                className="w-full"
              >
                {loading ? "Processing..." : "Submit Payment"}
              </Button>
              {error && <div className="text-red-500 text-sm">{error}</div>}
              {success && (
                <div className="text-green-600 text-sm">{success}</div>
              )}
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
