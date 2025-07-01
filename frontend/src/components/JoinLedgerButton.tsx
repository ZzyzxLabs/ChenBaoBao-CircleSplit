import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
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

export function JoinLedgerButton() {
    const [ledgerAddress, setLedgerAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [userLedgers, setUserLedgers] = useState<LedgerInfo[]>([]);
    const [userAddress, setUserAddress] = useState("");
    const [fetchingLedgers, setFetchingLedgers] = useState(false);
    const router = useRouter();

    // Fetch user's ledgers (created and joined)
    useEffect(() => {
        async function fetchLedgers() {
            setFetchingLedgers(true);
            setUserLedgers([]);
            try {
                if (!(window as any).ethereum) return;
                const provider = new ethers.BrowserProvider((window as any).ethereum);
                const signer = await provider.getSigner();
                const address = await signer.getAddress();
                setUserAddress(address);
                const factoryAddress = process.env.NEXT_PUBLIC_LEDGER_FACTORY_ADDRESS;
                if (!factoryAddress) return;
                const factory = new ethers.Contract(factoryAddress, LedgerFactoryABI.abi, signer);
                const createdLedgers = await factory.getUserLedgers(address);
                const memberLedgers = await factory.getUserMemberLedgers(address);
                const allLedgerAddresses = [...new Set([...createdLedgers, ...memberLedgers])];
                const details: LedgerInfo[] = [];
                for (const ledgerAddr of allLedgerAddresses) {
                    try {
                        const ledger = new ethers.Contract(ledgerAddr, LedgerABI.abi, signer);
                        const members = await ledger.listMembers();
                        const owner = await ledger.owner();
                        details.push({
                            address: ledgerAddr,
                            members,
                            owner,
                            isOwner: owner.toLowerCase() === address.toLowerCase(),
                        });
                    } catch { }
                }
                setUserLedgers(details);
            } catch (err) {
                // ignore
            } finally {
                setFetchingLedgers(false);
            }
        }
        fetchLedgers();
    }, []);

    async function handleJoinLedger(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            if (!(window as any).ethereum) throw new Error("No wallet found");
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();

            // Create ledger contract instance
            const ledger = new ethers.Contract(ledgerAddress, LedgerABI.abi, signer);

            // Get the required approval amount from the ledger
            const [approveAmount] = await ledger.getSettings();

            // Get USDC token address from the ledger
            const usdcAddress = await ledger.usdc();

            // Create USDC contract instance
            const usdc = new ethers.Contract(usdcAddress, [
                "function approve(address spender, uint256 amount) external returns (bool)",
                "function allowance(address owner, address spender) external view returns (uint256)"
            ], signer);

            // Check current allowance
            const currentAllowance = await usdc.allowance(await signer.getAddress(), ledgerAddress);

            // Approve USDC if needed
            if (currentAllowance < approveAmount) {
                const approveTx = await usdc.approve(ledgerAddress, approveAmount);
                await approveTx.wait();
            }

            // Join the ledger
            const joinTx = await ledger.join();
            await joinTx.wait();

            setSuccess("Successfully joined the ledger!");
            setLedgerAddress("");

        } catch (err: any) {
            setError(err.message || "Failed to join ledger");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-4 max-w-md">
            <div className="mb-4">
                <h3 className="font-bold text-lg mb-2">Your Ledgers</h3>
                {fetchingLedgers ? (
                    <div className="text-gray-500">Loading your ledgers...</div>
                ) : userLedgers.length === 0 ? (
                    <div className="text-gray-500">You haven't created or joined any ledgers yet.</div>
                ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {userLedgers.map((ledger) => (
                            <button
                                key={ledger.address}
                                type="button"
                                className="w-full text-left p-2 bg-gray-50 rounded border flex flex-col items-start relative hover:bg-gray-100 transition cursor-pointer focus:outline-none"
                                onClick={() => router.push(`/dashboard?ledger=${ledger.address}`)}
                                aria-label="Ledger info"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs">{ledger.isOwner ? "(Owner)" : "(Member)"}</span>
                                    <span className="text-xs text-gray-500 break-all">{ledger.address}</span>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                    Members: {ledger.members.length > 0 ? ledger.members.slice(0, 2).map((m, i) => (
                                        <span key={i}>{m === userAddress ? "You" : m.slice(0, 6) + "..." + m.slice(-4)}{i < ledger.members.length - 1 ? ", " : ""}</span>
                                    )) : "None"}
                                    {ledger.members.length > 2 && `, +${ledger.members.length - 2} more`}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <form onSubmit={handleJoinLedger} className="space-y-4 p-4 border rounded-md">
                <div>
                    <Label htmlFor="ledger-address">Ledger Address</Label>
                    <Input
                        id="ledger-address"
                        value={ledgerAddress}
                        onChange={e => setLedgerAddress(e.target.value)}
                        placeholder="0x..."
                        required
                        disabled={loading}
                    />
                </div>
                <Button type="submit" disabled={loading}>
                    {loading ? "Joining..." : "Join Ledger"}
                </Button>
                {error && <div className="text-red-500 text-sm">{error}</div>}
                {success && <div className="text-green-600 text-sm">{success}</div>}
            </form>
        </div>
    );
}

export default JoinLedgerButton; 