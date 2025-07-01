import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { Caveat } from "next/font/google";

const caveat = Caveat({ subsets: ["latin"], weight: "700" });

interface Chain {
    id: string;
    name: string;
    symbol: string;
}

interface Token {
    symbol: string;
    name: string;
    decimals: number;
}

const CHAINS: Chain[] = [
    { id: "1", name: "Ethereum", symbol: "ETH" },
    { id: "137", name: "Polygon", symbol: "MATIC" },
    { id: "42161", name: "Arbitrum", symbol: "ARB" },
    { id: "10", name: "Optimism", symbol: "OP" },
    { id: "56", name: "BNB Chain", symbol: "BNB" },
];

const TOKENS: Token[] = [
    { symbol: "USDC", name: "USD Coin", decimals: 6 },
    { symbol: "USDT", name: "Tether", decimals: 6 },
    { symbol: "ETH", name: "Ethereum", decimals: 18 },
    { symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
    { symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
];

export function CrossChainTransferForm() {
    const [showForm, setShowForm] = useState(false);
    const [fromChain, setFromChain] = useState("");
    const [token, setToken] = useState("");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            // 驗證輸入
            if (!fromChain || !token || !amount) {
                throw new Error("Please fill in all fields");
            }

            const parsedAmount = parseFloat(amount);
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                throw new Error("Please enter a valid amount");
            }

            // 這裡添加您的跨鏈轉帳邏輯
            // 例如使用 Li.Fi SDK 或其他跨鏈協議
            console.log("Transfer details:", {
                fromChain,
                token,
                amount: parsedAmount
            });

            // 模擬交易延遲
            await new Promise(resolve => setTimeout(resolve, 2000));

            setSuccess("Cross chain transfer successful!");
            
            // 重置表單
            setFromChain("");
            setToken("");
            setAmount("");
            
            // 3秒後關閉表單
            setTimeout(() => {
                setShowForm(false);
                setSuccess("");
            }, 3000);

        } catch (err: any) {
            setError(err.message || "提交失敗");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <Button
                className="w-full h-14 text-lg rounded-xl border-2 border-black shadow-md hover:shadow-lg transition-all"
                variant="outline"
                onClick={() => setShowForm(true)}
            >
                Cross Chain Transfer
            </Button>

            {/* 向上彈出的表單 Modal */}
            {showForm && (
                <div className="fixed inset-0 flex items-end justify-center bg-black bg-opacity-40 z-50 animate-in fade-in duration-200">
                    <div className="bg-white p-8 rounded-t-3xl shadow-2xl w-full max-w-lg animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className={`text-3xl font-bold ${caveat.className}`}>
                                Cross Chain Transfer
                            </h2>
                            <button
                                className="text-gray-500 hover:text-black text-3xl transition-colors"
                                onClick={() => setShowForm(false)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* From Chain 選擇 */}
                            <div>
                                <Label htmlFor="from-chain" className="text-lg mb-2">
                                    From Chain
                                </Label>
                                <Select
                                    value={fromChain}
                                    onValueChange={setFromChain}
                                    disabled={loading}
                                >
                                    <SelectTrigger className="h-12 text-base border-2 border-black rounded-xl">
                                        <SelectValue placeholder="選擇來源鏈" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CHAINS.map((chain) => (
                                            <SelectItem key={chain.id} value={chain.id}>
                                                {chain.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Token 選擇 */}
                            <div>
                                <Label htmlFor="token" className="text-lg mb-2">
                                    Token
                                </Label>
                                <Select
                                    value={token}
                                    onValueChange={setToken}
                                    disabled={loading}
                                >
                                    <SelectTrigger className="h-12 text-base border-2 border-black rounded-xl">
                                        <SelectValue placeholder="選擇幣種" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TOKENS.map((t) => (
                                            <SelectItem key={t.symbol} value={t.symbol}>
                                                {t.symbol} - {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Amount 輸入 */}
                            <div>
                                <Label htmlFor="amount" className="text-lg mb-2">
                                    Amount
                                </Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    required
                                    disabled={loading}
                                    min="0"
                                    step="any"
                                    className="h-12 text-base border-2 border-black rounded-xl"
                                />
                            </div>

                            {/* 錯誤和成功訊息 */}
                            {error && (
                                <div className="text-red-500 text-sm p-3 bg-red-50 rounded-lg border border-red-200">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="text-green-600 text-sm p-3 bg-green-50 rounded-lg border border-green-200">
                                    {success}
                                </div>
                            )}

                            {/* 提交按鈕 */}
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 text-lg rounded-xl border-2 border-black bg-primary hover:bg-primary/90"
                            >
                                {loading ? "處理中..." : "確認轉帳"}
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}