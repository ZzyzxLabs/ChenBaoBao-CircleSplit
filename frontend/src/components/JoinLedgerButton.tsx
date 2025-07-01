import React, { useState } from "react";
import { ethers } from "ethers";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import LedgerABI from "../abi/Ledger.json";

export function JoinLedgerButton() {
    const [ledgerAddress, setLedgerAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

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
                console.log("Approving USDC...");
                const approveTx = await usdc.approve(ledgerAddress, approveAmount);
                await approveTx.wait();
                console.log("USDC approved successfully");
            }

            // Join the ledger
            console.log("Joining ledger...");
            const joinTx = await ledger.join();
            await joinTx.wait();

            setSuccess("Successfully joined the ledger!");
            setLedgerAddress("");

        } catch (err: any) {
            setError(err.message || "Failed to join ledger");
            console.error("Join ledger error:", err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleJoinLedger} className="space-y-4 max-w-md p-4 border rounded-md">
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
    );
}

export default JoinLedgerButton; 