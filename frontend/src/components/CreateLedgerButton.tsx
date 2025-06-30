import React, { useState } from "react";
import { ethers } from "ethers";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import LedgerFactoryABI from "../abi/LedgerFactory.json";

const LEDGER_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_LEDGER_FACTORY_ADDRESS;

export function CreateLedgerButton() {
    const [name, setName] = useState("My Ledger");
    const [approveAmount, setApproveAmount] = useState("1000");
    const [maxDaily, setMaxDaily] = useState("100");
    const [maxMonthly, setMaxMonthly] = useState("2000");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [ledgerAddress, setLedgerAddress] = useState<string | null>(null);

    async function handleCreateLedger(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLedgerAddress(null);
        setLoading(true);
        try {
            if (!LEDGER_FACTORY_ADDRESS) throw new Error("LedgerFactory address is not set in environment variables.");
            if (!(window as any).ethereum) throw new Error("No wallet found");
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(
                LEDGER_FACTORY_ADDRESS,
                LedgerFactoryABI.abi,
                signer
            );
            const approve = ethers.parseUnits(approveAmount, 6); // USDC has 6 decimals
            const daily = ethers.parseUnits(maxDaily, 6);
            const monthly = ethers.parseUnits(maxMonthly, 6);
            const tx = await contract.createLedger(name, approve, daily, monthly);
            const receipt = await tx.wait();

            // Find the LedgerCreated event in the logs
            const event = receipt.logs
                .map((log: any) => {
                    try {
                        return contract.interface.parseLog(log);
                    } catch {
                        return null;
                    }
                })
                .find((parsed: any) => parsed && parsed.name === "LedgerCreated");

            if (event) {
                setLedgerAddress(event.args.ledgerAddress);
                setSuccess("Ledger created successfully!");
            } else {
                setSuccess("Ledger created, but address not found in logs.");
            }

            setName("My Ledger");
            setApproveAmount("1000");
            setMaxDaily("100");
            setMaxMonthly("2000");
        } catch (err: any) {
            setError(err.message || "Transaction failed");
        } finally {
            setLoading(false);
        }
    }

    if (!LEDGER_FACTORY_ADDRESS) {
        return <div className="text-red-500">LedgerFactory address is not set. Please set NEXT_PUBLIC_LEDGER_FACTORY_ADDRESS in your .env file.</div>;
    }

    return (
        <>
            <form onSubmit={handleCreateLedger} className="space-y-4 max-w-md p-4 border rounded-md">
                <div>
                    <Label htmlFor="ledger-name">Ledger Name</Label>
                    <Input id="ledger-name" value={name} onChange={e => setName(e.target.value)} required disabled={loading} />
                </div>
                <div>
                    <Label htmlFor="approve-amount">Approve Amount (USDC)</Label>
                    <Input id="approve-amount" type="number" value={approveAmount} onChange={e => setApproveAmount(e.target.value)} required disabled={loading} min="0" step="any" />
                </div>
                <div>
                    <Label htmlFor="max-daily">Max Daily (USDC)</Label>
                    <Input id="max-daily" type="number" value={maxDaily} onChange={e => setMaxDaily(e.target.value)} required disabled={loading} min="0" step="any" />
                </div>
                <div>
                    <Label htmlFor="max-monthly">Max Monthly (USDC)</Label>
                    <Input id="max-monthly" type="number" value={maxMonthly} onChange={e => setMaxMonthly(e.target.value)} required disabled={loading} min="0" step="any" />
                </div>
                <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Ledger"}</Button>
                {error && <div className="text-red-500 text-sm">{error}</div>}
                {success && <div className="text-green-600 text-sm">{success}</div>}
            </form>
            {ledgerAddress && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full text-center">
                        <h2 className="text-xl font-bold mb-2">Ledger Created!</h2>
                        <div className="mb-2 break-all">Address:<br />{ledgerAddress}</div>
                        <Button onClick={() => setLedgerAddress(null)}>Close</Button>
                    </div>
                </div>
            )}
        </>
    );
}

export default CreateLedgerButton;
