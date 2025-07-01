import React, { useState } from "react";
import { Button } from "../ui/button";
import { ethers } from "ethers";
import { useAccount } from "wagmi";

export function SendTransactionButton() {
    const { address } = useAccount();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [txHash, setTxHash] = useState("");

    async function handleSendTransaction() {
        setLoading(true);
        setError("");
        setSuccess("");
        setTxHash("");

        try {
            if (!address) throw new Error("請先連接錢包");
            if (!(window as any).ethereum) throw new Error("未找到錢包");

            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();

            // 這裡是示例交易，您可以根據需求修改
            const tx = await signer.sendTransaction({
                to: address, // 發送給自己作為示例
                value: ethers.parseEther("0.001") // 0.001 ETH
            });

            setTxHash(tx.hash);
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                setSuccess("交易成功！");
            } else {
                throw new Error("交易失敗");
            }
        } catch (err: any) {
            setError(err.message || "交易失敗");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <Button
                className="w-full h-14 text-lg rounded-xl border-2 border-black shadow-md hover:shadow-lg transition-shadow"
                variant="outline"
                onClick={handleSendTransaction}
                disabled={loading || !address}
            >
                {loading ? "發送中..." : "Send Transaction"}
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
                            交易哈希: {txHash}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}