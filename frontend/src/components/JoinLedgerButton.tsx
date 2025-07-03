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
import { FiCopy, FiCheck } from "react-icons/fi";

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

export function JoinLedgerButton({ initialLedgerAddress }: { initialLedgerAddress?: string }) {
  const [ledgerAddress, setLedgerAddress] = useState(initialLedgerAddress || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [approveDone, setApproveDone] = useState(false);
  const [usdcAddress, setUsdcAddress] = useState<`0x${string}` | null>(null);
  const [currentStep, setCurrentStep] = useState<"idle" | "approving" | "joining">("idle");
  const [approvalHash, setApprovalHash] = useState<`0x${string}` | null>(null);
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

  // Read USDC address from ledger
  const { data: ledgerUsdc } = useReadContract({
    address: ledgerAddress as `0x${string}`,
    abi: LedgerABI.abi,
    functionName: "usdc",
    query: {
      enabled: !!ledgerAddress,
    },
  });

  // Update USDC address when ledger USDC changes
  useEffect(() => {
    if (ledgerUsdc) {
      setUsdcAddress(ledgerUsdc as `0x${string}`);
    }
  }, [ledgerUsdc]);

  // If initialLedgerAddress changes (e.g. modal opens with a new address), update state
  useEffect(() => {
    if (initialLedgerAddress) {
      setLedgerAddress(initialLedgerAddress);
    }
  }, [initialLedgerAddress]);

  // Fetch user's ledgers (created and joined)
  async function fetchLedgers() {
    if (!userAddress || !LEDGER_FACTORY_ADDRESS || !publicClient) return;

    setFetchingLedgers(true);
    setUserLedgers([]);
    try {
      // Get ledgers where user is a member
      const memberLedgers = (await publicClient.readContract({
        address: LEDGER_FACTORY_ADDRESS,
        abi: LedgerFactoryABI.abi,
        functionName: "getUserMemberLedgers",
        args: [userAddress as `0x${string}`],
      })) as `0x${string}`[];

      const allLedgers: LedgerInfo[] = [];

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

  useEffect(() => {
    fetchLedgers();
  }, [userAddress]);

  // Handle transaction success
  useEffect(() => {
    if (isSuccess && hash) {
      if (currentStep === "approving") {
        setApprovalHash(hash);
        setApproveDone(true);
        setCurrentStep("idle");
        setSuccess("Approval successful! Now you can join the ledger.");
      } else if (currentStep === "joining") {
        setSuccess("Successfully joined the ledger!");
        fetchLedgers();
        setLedgerAddress("");
        setCurrentStep("idle");
        setApprovalHash(null);
        setApproveDone(false);
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

  // Check on-chain allowance when relevant addresses change
  useEffect(() => {
    async function checkAllowance() {
      if (!usdcAddress || !userAddress || !ledgerAddress || !publicClient) {
        setApproveDone(false);
        return;
      }
      try {
        const allowance = await publicClient.readContract({
          address: usdcAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [userAddress as `0x${string}`, ledgerAddress as `0x${string}`],
        });
        setApproveDone(BigInt(allowance) > BigInt(0));
      } catch (err) {
        setApproveDone(false);
      }
    }
    checkAllowance();
  }, [usdcAddress, userAddress, ledgerAddress, publicClient]);

  const [copiedLedger, setCopiedLedger] = useState<string | null>(null);

  function handleCopy(address: string) {
    navigator.clipboard.writeText(address);
    setCopiedLedger(address);
    setTimeout(() => setCopiedLedger(null), 1200);
  }

  async function handleApprove() {
    setError("");
    setSuccess("");
    if (!ledgerAddress) {
      setError("Please enter a ledger address");
      return;
    }
    if (!usdcAddress) {
      setError("Loading ledger information...");
      return;
    }
    if (!userAddress) {
      setError("Please connect your wallet");
      return;
    }
    setCurrentStep("approving");
    try {
      await writeContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [ledgerAddress as `0x${string}`, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")],
      });
    } catch (err: any) {
      setError(err.message || "Transaction failed");
      setCurrentStep("idle");
      setApprovalHash(null);
    }
  }

  async function handleJoinLedger() {
    setError("");
    setSuccess("");
    if (!ledgerAddress) {
      setError("Please enter a ledger address");
      return;
    }
    setCurrentStep("joining");
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

  const isApproveDisabled = loading || !ledgerAddress || !usdcAddress || !userAddress || approveDone;
  const isJoinDisabled = loading || !ledgerAddress || !approveDone;

  return (
    <div className="space-y-4 max-w-md">
      <div className="mb-4">
        <h3 className="font-bold text-lg mb-2">Your Ledgers</h3>
        <button
          type="button"
          className="mb-2 px-3 py-1 rounded border text-xs bg-gray-50 hover:bg-gray-100 transition disabled:opacity-50"
          onClick={fetchLedgers}
          disabled={fetchingLedgers}
          aria-label="Refresh ledgers"
        >
          {fetchingLedgers ? "Refreshing..." : "Refresh"}
        </button>
        {fetchingLedgers ? (
          <div className="text-gray-500">Loading your ledgers...</div>
        ) : userLedgers.length === 0 ? (
          <div className="text-gray-500">
            You haven't created or joined any ledgers yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {userLedgers.map((ledger) => (
              <div key={ledger.address}>
                <button
                  type="button"
                  className="w-full text-left p-2 bg-gray-50 rounded border flex flex-col items-start hover:bg-gray-100 transition cursor-pointer focus:outline-none"
                  onClick={() => router.push(`/dashboard?ledger=${ledger.address}`)}
                  aria-label="Ledger info"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs">
                      {ledger.isOwner ? "(Owner)" : "(Member)"}
                    </span>
                    <span className="text-xs text-gray-500 break-all">
                      {ledger.address}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="ml-1 p-1 rounded hover:bg-gray-200 transition cursor-pointer"
                      onClick={e => { e.stopPropagation(); handleCopy(ledger.address); }}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleCopy(ledger.address); } }}
                      aria-label="Copy ledger address"
                    >
                      {copiedLedger === ledger.address ? (
                        <FiCheck className="text-green-600" size={14} />
                      ) : (
                        <FiCopy size={14} />
                      )}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Members: {ledger.members.length > 0
                      ? ledger.members.slice(0, 2).map((m, i) => (
                        <span key={i}>
                          {m === userAddress
                            ? "You"
                            : m.slice(0, 6) + "..." + m.slice(-4)}
                          {i < ledger.members.length - 1 ? ", " : ""}
                        </span>
                      ))
                      : "None"}
                    {ledger.members.length > 2 && `, +${ledger.members.length - 2} more`}
                  </div>
                </button>
              </div>
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
          <Button
            onClick={handleApprove}
            disabled={isApproveDisabled}
            className="w-full"
            size="lg"
            variant={approveDone ? "secondary" : "default"}
          >
            {loading && currentStep === "approving"
              ? "Approving..."
              : approveDone
                ? "Approved"
                : "Approve USDC"}
          </Button>
          <Button
            onClick={handleJoinLedger}
            disabled={isJoinDisabled}
            className="w-full"
            size="lg"
          >
            {loading && currentStep === "joining" ? "Joining..." : "Join Ledger"}
          </Button>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
        </div>
      </div>
    </div>
  );
}

export default JoinLedgerButton;
