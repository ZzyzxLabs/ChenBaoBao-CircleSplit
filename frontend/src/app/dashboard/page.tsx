'use client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Caveat } from "next/font/google";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import LedgerABI from "@/abi/Ledger.json";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearchParams } from "next/navigation";

const caveat = Caveat({ subsets: ["latin"], weight: "400" });

const transactions = [
  { id: 1, label: "tx1" },
  { id: 2, label: "tx2" },
  { id: 3, label: "tx3" },
  // Add more transactions as needed
];

// Helper to shorten addresses
function shortAddr(addr: string) {
  if (!addr) return '';
  return addr.length > 12 ? addr.slice(0, 6) + '...' + addr.slice(-4) : addr;
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const ledgerAddress = searchParams.get("ledger") || "";
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [externalId, setExternalId] = useState("");
  const [vendor, setVendor] = useState("");
  const [amounts, setAmounts] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [fetchingMembers, setFetchingMembers] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [participantAmounts, setParticipantAmounts] = useState<{ [addr: string]: string }>({});
  const [transactions, setTransactions] = useState<any[]>([]);
  const [fetchingTxs, setFetchingTxs] = useState(false);

  useEffect(() => {
    if (showModal && ledgerAddress) {
      setFetchingMembers(true);
      (async () => {
        try {
          if (!(window as any).ethereum) throw new Error("No wallet found");
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const signer = await provider.getSigner();
          const contract = new ethers.Contract(ledgerAddress, LedgerABI.abi, signer);
          const membersList = await contract.listMembers();
          setMembers(membersList);
        } catch (err) {
          setMembers([]);
        } finally {
          setFetchingMembers(false);
        }
      })();
    }
  }, [showModal, ledgerAddress]);

  useEffect(() => {
    async function fetchTxs() {
      if (!ledgerAddress) return;
      setFetchingTxs(true);
      try {
        if (!(window as any).ethereum) throw new Error("No wallet found");
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(ledgerAddress, LedgerABI.abi, signer);
        const count: bigint = await contract.getPaymentCount();
        console.log('Payment count:', count.toString());
        const txs = await Promise.all(
          Array.from({ length: Number(count) }, async (_, i) => {
            try {
              const info = await contract.getPaymentInfo(i);
              console.log('Fetched payment info for paymentId', i, info);
              return info;
            } catch (err) {
              console.log('Error fetching payment info for paymentId', i, err);
              return null;
            }
          })
        );
        setTransactions(txs.filter(Boolean));
      } catch (err) {
        console.log('Error fetching transactions:', err);
        setTransactions([]);
      } finally {
        setFetchingTxs(false);
      }
    }
    fetchTxs();
  }, [ledgerAddress, showModal]);

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (!(window as any).ethereum) throw new Error("No wallet found");
      if (!ledgerAddress) throw new Error("Ledger address is required in URL");
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(ledgerAddress, LedgerABI.abi, signer);
      const parsedExternalId = ethers.toBigInt(externalId);
      const parsedVendor = vendor;
      const parsedParticipants = selectedParticipants;
      const parsedAmounts = selectedParticipants.map(addr => ethers.parseUnits(participantAmounts[addr] || "0", 6));
      if (parsedParticipants.length !== parsedAmounts.length) {
        throw new Error("Participants and amounts length mismatch");
      }
      if (parsedAmounts.some(a => a <= BigInt(0))) {
        throw new Error("All amounts must be greater than 0");
      }
      const tx = await contract.splitPayment(parsedExternalId, parsedVendor, parsedParticipants, parsedAmounts);
      await tx.wait();
      setSuccess("Payment added successfully!");
      setShowModal(false);
      // Optionally, refresh transactions here
    } catch (err: any) {
      setError(err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  }

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
            {fetchingTxs ? (
              <div className="text-center text-gray-500">Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center text-gray-400">No transactions found.</div>
            ) : (
              transactions.map((tx, i) => {
                // Handle both array and object return values
                const isArray = Array.isArray(tx);
                const paymentId = isArray ? tx[0] : tx.paymentId;
                const externalId = isArray ? tx[1] : tx.externalId;
                const vendor = isArray ? tx[3] : tx.vendor;
                const participants = isArray ? tx[4] : tx.participants;
                const amounts = isArray ? tx[5] : tx.amounts;
                const timestamp = isArray ? tx[6] : tx.timestamp;
                return (
                  <div
                    key={paymentId?.toString() || i}
                    className="w-full bg-white border border-black rounded-lg py-4 px-2 text-left text-base font-medium shadow-sm"
                  >
                    <div><b>Payment ID:</b> {paymentId?.toString()}</div>
                    <div><b>External ID:</b> {externalId?.toString()}</div>
                    <div><b>Vendor:</b> {shortAddr(vendor)}</div>
                    <div><b>Participants:</b> {participants?.map(shortAddr).join(", ")}</div>
                    <div><b>Amounts:</b> {amounts?.map((a: any) => (Number(a) / 1e6).toLocaleString()).join(", ")} USDC</div>
                    <div><b>Timestamp:</b> {timestamp ? new Date(Number(timestamp) * 1000).toLocaleString() : "-"}</div>
                  </div>
                );
              })
            )}
            <div className="text-center text-xl text-gray-400 select-none">
              . <br /> .
            </div>
          </div>
          <div className="flex w-full gap-8 mt-4 justify-center">
            <Button
              className="flex-1 h-14 text-lg rounded-xl border-2 border-black"
              variant="outline"
            >
              li.fi
            </Button>
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
            <button className="absolute top-2 right-2 text-xl" onClick={() => setShowModal(false)}>&times;</button>
            <h2 className="text-2xl font-bold mb-4">Add Payment</h2>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <Label>Ledger Address</Label>
                <div className="bg-gray-100 rounded px-2 py-1 text-sm break-all">{ledgerAddress || <span className="text-red-500">Not found in URL</span>}</div>
              </div>
              <div>
                <Label htmlFor="external-id">External ID</Label>
                <Input id="external-id" value={externalId} onChange={e => setExternalId(e.target.value)} required disabled={loading} placeholder="e.g. 123" />
              </div>
              <div>
                <Label htmlFor="vendor">Vendor Address</Label>
                <Input id="vendor" value={vendor} onChange={e => setVendor(e.target.value)} required disabled={loading} placeholder="0x..." />
              </div>
              <div>
                <Label htmlFor="participants">Participants</Label>
                {fetchingMembers ? (
                  <div className="text-gray-500 text-sm">Loading members...</div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto border rounded px-2 py-2">
                    {members.length === 0 && <div className="text-gray-400 text-sm">No members found.</div>}
                    {members.map(addr => (
                      <label key={addr} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          value={addr}
                          checked={selectedParticipants.includes(addr)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedParticipants(prev => [...prev, addr]);
                            } else {
                              setSelectedParticipants(prev => prev.filter(a => a !== addr));
                              setParticipantAmounts(prev => {
                                const copy = { ...prev };
                                delete copy[addr];
                                return copy;
                              });
                            }
                          }}
                          disabled={loading}
                        />
                        <span className="break-all text-sm">{shortAddr(addr)}</span>
                        {selectedParticipants.includes(addr) && (
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            className="w-24 ml-2"
                            placeholder="Amount"
                            value={participantAmounts[addr] || ""}
                            onChange={e => {
                              const value = e.target.value;
                              setParticipantAmounts(prev => ({ ...prev, [addr]: value }));
                            }}
                            disabled={loading}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">Check to select participants and enter an amount for each.</div>
              </div>
              <Button type="submit" disabled={loading || !ledgerAddress} className="w-full">{loading ? "Processing..." : "Submit Payment"}</Button>
              {error && <div className="text-red-500 text-sm">{error}</div>}
              {success && <div className="text-green-600 text-sm">{success}</div>}
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
