import React, { useState, useEffect } from "react";
import { parseUnits } from "viem";
import {
  useWriteContract,
  useReadContract,
  useAccount,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import LedgerABI from "../abi/Ledger.json";
import LedgerFactoryABI from "../abi/LedgerFactory.json";
import { useRouter } from "next/navigation";

interface LedgerInfo {
  address: string;
  members: string[];
  owner: string;
  isOwner: boolean;
}

// Standard ERC20 ABI for USDC approval
const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      {
        name: "_spender",
        type: "address",
      },
      {
        name: "_value",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      {
        name: "_owner",
        type: "address",
      },
      {
        name: "_spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      {
        name: "_owner",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
] as const;

const LEDGER_FACTORY_ADDRESS = process.env
  .NEXT_PUBLIC_LEDGER_FACTORY_ADDRESS as `0x${string}`;

export function JoinLedgerButton() {
  const [ledgerAddress, setLedgerAddress] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [approveAmount, setApproveAmount] = useState<bigint>(BigInt(0));
  const [usdcAddress, setUsdcAddress] = useState<`0x${string}` | null>(null);
  const [currentStep, setCurrentStep] = useState<
    "idle" | "approving" | "joining"
  >("idle");
  const [approvalHash, setApprovalHash] = useState<`0x${string}` | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [userLedgers, setUserLedgers] = useState<LedgerInfo[]>([]);
  const [fetchingLedgers, setFetchingLedgers] = useState(false);
  const router = useRouter();
  const { address: userAddress } = useAccount();
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

  // Read ledger settings when address is provided
  const { data: ledgerSettings } = useReadContract({
    address: ledgerAddress as `0x${string}`,
    abi: LedgerABI.abi,
    functionName: "getSettings",
    query: {
      enabled: !!ledgerAddress,
    },
  });

  // Read USDC address from ledger
  const { data: ledgerUsdc } = useReadContract({
    address: ledgerAddress as `0x${string}`,
    abi: LedgerABI.abi,
    functionName: "usdc",
    query: {
      enabled: !!ledgerAddress,
    },
  });

  // Read current USDC allowance
  const { data: currentAllowance } = useReadContract({
    address: usdcAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [userAddress as `0x${string}`, ledgerAddress as `0x${string}`],
    query: {
      enabled: !!usdcAddress && !!userAddress && !!ledgerAddress,
    },
  });

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: usdcAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [userAddress as `0x${string}`],
    query: {
      enabled: !!usdcAddress && !!userAddress,
    },
  });

  // Fetch user's ledgers (created and joined)
  useEffect(() => {
    async function fetchLedgers() {
      if (!userAddress || !LEDGER_FACTORY_ADDRESS || !publicClient) return;

      setFetchingLedgers(true);
      setUserLedgers([]);
      try {
        // Get ledgers created by the user
        const createdLedgers = (await publicClient.readContract({
          address: LEDGER_FACTORY_ADDRESS,
          abi: LedgerFactoryABI.abi,
          functionName: "getUserLedgers",
          args: [userAddress as `0x${string}`],
        })) as `0x${string}`[];

        // Get ledgers where user is a member
        const memberLedgers = (await publicClient.readContract({
          address: LEDGER_FACTORY_ADDRESS,
          abi: LedgerFactoryABI.abi,
          functionName: "getUserMemberLedgers",
          args: [userAddress as `0x${string}`],
        })) as `0x${string}`[];

        const allLedgers: LedgerInfo[] = [];

        // Process created ledgers
        for (const ledgerAddress of createdLedgers) {
          try {
            const members = (await publicClient.readContract({
              address: ledgerAddress,
              abi: LedgerABI.abi,
              functionName: "listMembers",
            })) as `0x${string}`[];

            const owner = (await publicClient.readContract({
              address: ledgerAddress,
              abi: LedgerABI.abi,
              functionName: "owner",
            })) as `0x${string}`;

            allLedgers.push({
              address: ledgerAddress,
              members: members,
              owner: owner,
              isOwner: true,
            });
          } catch (err) {
            console.log(`Error fetching created ledger ${ledgerAddress}:`, err);
          }
        }

        // Process member ledgers (avoid duplicates)
        for (const ledgerAddress of memberLedgers) {
          // Skip if already added as created ledger
          if (allLedgers.some((ledger) => ledger.address === ledgerAddress)) {
            continue;
          }

          try {
            const members = (await publicClient.readContract({
              address: ledgerAddress,
              abi: LedgerABI.abi,
              functionName: "listMembers",
            })) as `0x${string}`[];

            const owner = (await publicClient.readContract({
              address: ledgerAddress,
              abi: LedgerABI.abi,
              functionName: "owner",
            })) as `0x${string}`;

            allLedgers.push({
              address: ledgerAddress,
              members: members,
              owner: owner,
              isOwner: false,
            });
          } catch (err) {
            console.log(`Error fetching member ledger ${ledgerAddress}:`, err);
          }
        }

        setUserLedgers(allLedgers);
      } catch (err) {
        console.log("Error fetching ledgers:", err);
      } finally {
        setFetchingLedgers(false);
      }
    }

    fetchLedgers();
  }, [userAddress]);

  // Update approve amount when ledger settings change
  useEffect(() => {
    if (ledgerSettings) {
      if (Array.isArray(ledgerSettings) && ledgerSettings.length >= 1) {
        setApproveAmount(ledgerSettings[0] as bigint);
      } else if (typeof ledgerSettings === "object" && "0" in ledgerSettings) {
        setApproveAmount(ledgerSettings[0] as bigint);
      }
    }
  }, [ledgerSettings]);

  // Update USDC address when ledger USDC changes
  useEffect(() => {
    if (ledgerUsdc) {
      setUsdcAddress(ledgerUsdc as `0x${string}`);
    }
  }, [ledgerUsdc]);

  // Update debug info
  useEffect(() => {
    let debug = "";
    if (ledgerAddress) debug += `Ledger: ${ledgerAddress}\n`;
    if (usdcAddress) debug += `USDC: ${usdcAddress}\n`;
    if (approveAmount)
      debug += `Required: ${(
        Number(approveAmount) / 1e6
      ).toLocaleString()} USDC\n`;
    if (currentAllowance)
      debug += `Allowance: ${(
        Number(currentAllowance) / 1e6
      ).toLocaleString()} USDC\n`;
    if (usdcBalance)
      debug += `Balance: ${(
        Number(usdcBalance) / 1e6
      ).toLocaleString()} USDC\n`;
    if (currentStep) debug += `Step: ${currentStep}\n`;
    if (approvalHash) debug += `Approval Hash: ${approvalHash}\n`;
    setDebugInfo(debug);
  }, [
    ledgerAddress,
    usdcAddress,
    approveAmount,
    currentAllowance,
    usdcBalance,
    currentStep,
    approvalHash,
  ]);

  // Handle transaction success
  useEffect(() => {
    if (isSuccess && hash) {
      if (currentStep === "approving") {
        // Approval transaction confirmed, now join the ledger
        setApprovalHash(hash);
        setCurrentStep("joining");
        // Small delay to ensure the approval is fully processed
        setTimeout(() => {
          handleJoinLedger();
        }, 2000);
      } else if (currentStep === "joining") {
        // Join successful
        setSuccess("Successfully joined the ledger!");
        setLedgerAddress("");
        setCurrentStep("idle");
        setApprovalHash(null);
      }
    }
  }, [isSuccess, hash, currentStep, userAddress]);

  // Handle write errors
  useEffect(() => {
    if (writeError) {
      setError(writeError.message || "Transaction failed");
      setCurrentStep("idle");
      setApprovalHash(null);
    }
  }, [writeError]);

  async function handleJoinLedger() {
    try {
      await writeContract({
        address: ledgerAddress as `0x${string}`,
        abi: LedgerABI.abi,
        functionName: "join",
      });
    } catch (err: any) {
      setError(err.message || "Failed to join ledger");
      setCurrentStep("idle");
      setApprovalHash(null);
    }
  }

  async function handleJoinLedgerWithApproval() {
    if (!ledgerAddress) {
      setError("Please enter a ledger address");
      return;
    }

    if (!usdcAddress || !approveAmount) {
      setError("Loading ledger information...");
      return;
    }

    if (!userAddress) {
      setError("Please connect your wallet");
      return;
    }

    // Check USDC balance
    if (usdcBalance && usdcBalance < approveAmount) {
      setError(
        `Insufficient USDC balance. You need at least ${(
          Number(approveAmount) / 1e6
        ).toLocaleString()} USDC`
      );
      return;
    }

    setError("");
    setSuccess("");

    try {
      // Always approve first, regardless of current allowance
      setCurrentStep("approving");
      await writeContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [ledgerAddress as `0x${string}`, approveAmount],
      });
    } catch (err: any) {
      setError(err.message || "Transaction failed");
      setCurrentStep("idle");
      setApprovalHash(null);
    }
  }

  const approvalAmountFormatted = approveAmount
    ? (Number(approveAmount) / 1e6).toLocaleString()
    : "0";

  const getButtonText = () => {
    if (loading) {
      if (currentStep === "approving") {
        return "Approving USDC...";
      } else if (currentStep === "joining") {
        return "Joining Ledger...";
      }
      return "Processing...";
    }

    if (!ledgerAddress) {
      return "Enter Ledger Address";
    }

    if (!approveAmount) {
      return "Loading...";
    }

    return `Approve ${approvalAmountFormatted} USDC & Join Ledger`;
  };

  const getStatusMessage = () => {
    if (currentStep === "approving" && approvalHash) {
      return `Approval transaction submitted: ${approvalHash.slice(
        0,
        10
      )}...${approvalHash.slice(-8)}`;
    }
    if (currentStep === "joining") {
      return "Approval confirmed! Now joining the ledger...";
    }
    return null;
  };

  const isButtonDisabled =
    loading || !ledgerAddress || !approveAmount || !userAddress;

  return (
    <div className="space-y-4 max-w-md">
      <div className="mb-4">
        <h3 className="font-bold text-lg mb-2">Your Ledgers</h3>
        {fetchingLedgers ? (
          <div className="text-gray-500">Loading your ledgers...</div>
        ) : userLedgers.length === 0 ? (
          <div className="text-gray-500">
            You haven't created or joined any ledgers yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {userLedgers.map((ledger) => (
              <button
                key={ledger.address}
                type="button"
                className="w-full text-left p-2 bg-gray-50 rounded border flex flex-col items-start relative hover:bg-gray-100 transition cursor-pointer focus:outline-none"
                onClick={() =>
                  router.push(`/dashboard?ledger=${ledger.address}`)
                }
                aria-label="Ledger info"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs">
                    {ledger.isOwner ? "(Owner)" : "(Member)"}
                  </span>
                  <span className="text-xs text-gray-500 break-all">
                    {ledger.address}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Members:{" "}
                  {ledger.members.length > 0
                    ? ledger.members.slice(0, 2).map((m, i) => (
                        <span key={i}>
                          {m === userAddress
                            ? "You"
                            : m.slice(0, 6) + "..." + m.slice(-4)}
                          {i < ledger.members.length - 1 ? ", " : ""}
                        </span>
                      ))
                    : "None"}
                  {ledger.members.length > 2 &&
                    `, +${ledger.members.length - 2} more`}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border rounded-md">
        <h3 className="font-bold text-lg mb-4">Join a Ledger</h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="ledger-address">Ledger Address</Label>
            <Input
              id="ledger-address"
              value={ledgerAddress}
              onChange={(e) => setLedgerAddress(e.target.value)}
              placeholder="0x..."
              disabled={loading}
            />
          </div>

          {ledgerAddress && approveAmount > 0 && (
            <div className="p-3 bg-blue-50 rounded border">
              <div className="text-sm text-blue-800">
                <strong>Required USDC Approval:</strong>{" "}
                {approvalAmountFormatted} USDC
              </div>
              {usdcBalance && (
                <div className="text-xs text-gray-600 mt-1">
                  Your Balance: {(Number(usdcBalance) / 1e6).toLocaleString()}{" "}
                  USDC
                </div>
              )}
              <div className="text-xs text-blue-600 mt-1">
                ⚠️ USDC approval is always required before joining
              </div>
            </div>
          )}

          <Button
            onClick={handleJoinLedgerWithApproval}
            disabled={isButtonDisabled}
            className="w-full"
            size="lg"
          >
            {getButtonText()}
          </Button>

          {getStatusMessage() && (
            <div className="text-blue-600 text-sm bg-blue-50 p-2 rounded">
              {getStatusMessage()}
            </div>
          )}

          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}

          {/* Debug information - remove in production */}
          {process.env.NODE_ENV === "development" && debugInfo && (
            <details className="mt-4">
              <summary className="text-xs text-gray-500 cursor-pointer">
                Debug Info
              </summary>
              <pre className="text-xs text-gray-600 mt-2 bg-gray-100 p-2 rounded whitespace-pre-wrap">
                {debugInfo}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

export default JoinLedgerButton;
