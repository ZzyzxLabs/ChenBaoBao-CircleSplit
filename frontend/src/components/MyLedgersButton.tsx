import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Button } from "./ui/button";
import LedgerFactoryABI from "../abi/LedgerFactory.json";
import LedgerABI from "../abi/Ledger.json";

interface LedgerInfo {
    address: string;
    settings: {
        approveAmount: string;
        maxDaily: string;
        maxMonthly: string;
    };
    members: string[];
    owner: string;
    isOwner: boolean;
}

export function MyLedgersButton() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [ledgers, setLedgers] = useState<LedgerInfo[]>([]);
    const [userAddress, setUserAddress] = useState("");

    async function fetchMyLedgers() {
        setLoading(true);
        setError("");

        try {
            if (!(window as any).ethereum) throw new Error("No wallet found");
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            setUserAddress(address);

            // Get LedgerFactory address from environment
            const factoryAddress = process.env.NEXT_PUBLIC_LEDGER_FACTORY_ADDRESS;
            if (!factoryAddress) throw new Error("LedgerFactory address not configured");

            const factory = new ethers.Contract(factoryAddress, LedgerFactoryABI.abi, signer);

            // Get ledgers created by user
            const createdLedgers = await factory.getUserLedgers(address);
            console.log("Created ledgers:", createdLedgers);

            // Get ledgers where user is a member
            const memberLedgers = await factory.getUserMemberLedgers(address);
            console.log("Member ledgers:", memberLedgers);

            // Combine and deduplicate ledgers
            const allLedgerAddresses = [...new Set([...createdLedgers, ...memberLedgers])];

            // Fetch detailed info for each ledger
            const ledgerDetails: LedgerInfo[] = [];

            for (const ledgerAddress of allLedgerAddresses) {
                try {
                    const ledger = new ethers.Contract(ledgerAddress, LedgerABI.abi, signer);

                    const [approveAmount, maxDaily, maxMonthly] = await ledger.getSettings();
                    const members = await ledger.listMembers();
                    const owner = await ledger.owner();

                    ledgerDetails.push({
                        address: ledgerAddress,
                        settings: {
                            approveAmount: ethers.formatUnits(approveAmount, 6),
                            maxDaily: ethers.formatUnits(maxDaily, 6),
                            maxMonthly: ethers.formatUnits(maxMonthly, 6),
                        },
                        members,
                        owner,
                        isOwner: owner.toLowerCase() === address.toLowerCase(),
                    });
                } catch (err) {
                    console.error(`Error fetching ledger ${ledgerAddress}:`, err);
                }
            }

            setLedgers(ledgerDetails);

        } catch (err: any) {
            setError(err.message || "Failed to fetch ledgers");
            console.error("Fetch ledgers error:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchMyLedgers();
    }, []);

    return (
        <div className="space-y-4 max-w-2xl p-4 border rounded-md">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">My Ledgers</h3>
                <Button onClick={fetchMyLedgers} disabled={loading} size="sm">
                    {loading ? "Loading..." : "Refresh"}
                </Button>
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            {loading && <div className="text-gray-500">Loading your ledgers...</div>}

            {!loading && ledgers.length === 0 && (
                <div className="text-gray-500 text-center py-8">
                    You haven't created or joined any ledgers yet.
                </div>
            )}

            {ledgers.map((ledger, index) => (
                <div key={ledger.address} className="p-4 bg-gray-50 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">
                            Ledger {index + 1} {ledger.isOwner && "(Owner)"}
                        </h4>
                        <span className="text-xs text-gray-500 break-all">{ledger.address}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <strong>Settings:</strong>
                            <ul className="ml-4">
                                <li>Approve: {ledger.settings.approveAmount} USDC</li>
                                <li>Max Daily: {ledger.settings.maxDaily} USDC</li>
                                <li>Max Monthly: {ledger.settings.maxMonthly} USDC</li>
                            </ul>
                        </div>

                        <div>
                            <strong>Members ({ledger.members.length}):</strong>
                            {ledger.members.length > 0 ? (
                                <ul className="ml-4">
                                    {ledger.members.slice(0, 3).map((member, idx) => (
                                        <li key={idx} className="break-all text-xs">
                                            {member === userAddress ? "You" : member.slice(0, 6) + "..." + member.slice(-4)}
                                        </li>
                                    ))}
                                    {ledger.members.length > 3 && (
                                        <li className="text-xs text-gray-500">+{ledger.members.length - 3} more</li>
                                    )}
                                </ul>
                            ) : (
                                <div className="ml-4 text-gray-500">No members</div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default MyLedgersButton; 