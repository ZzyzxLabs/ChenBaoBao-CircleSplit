"use client";
import { ConnectButton } from "@/components/ConnectButton";
import { CreateLedgerButton } from "@/components/CreateLedgerButton";
import { JoinLedgerButton } from "@/components/JoinLedgerButton";
import { Card } from "@/components/ui/card";
import { Caveat } from "next/font/google";
import { Button } from "@/components/ui/button";
import { useAccount } from "wagmi";
import React, { useState } from "react";
// import  LifiWidgetButton  from "@/components/lifi/lifiButton";
const caveat = Caveat({ subsets: ["latin"], weight: ["700"] });

export default function Home() {
  const { address } = useAccount();
  const [showCreateLedger, setShowCreateLedger] = useState(false);
  const [showJoinLedger, setShowJoinLedger] = useState(false);
  const [joinLedgerAddress, setJoinLedgerAddress] = useState<string>("");

  // Callback for when a ledger is created
  const handleLedgerCreated = (ledgerAddress: string) => {
    setShowCreateLedger(false);
    setJoinLedgerAddress(ledgerAddress);
    setShowJoinLedger(true);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-[420px] p-10 flex flex-col items-center border-2 border-black rounded-2xl shadow-lg">
        <h1
          className={`text-3xl mb-3 text-center font-bold ${caveat.className}`}
        >
          Welcome to ChenBaoBao-CircleSplit
        </h1>
        {address && (
          <h1 className={`text-2xl font-bold text-center ${caveat.className}`}>
            Welcome Bao Bao: {address.slice(0, 6)}...{address.slice(-4)}
          </h1>
        )}
        <div className="flex flex-col gap-8 w-full items-center">
          <Button
            className="w-64 h-20 text-xl rounded-xl border-2 border-black"
            variant="outline"
            onClick={() => setShowCreateLedger(true)}
          >
            create a ledger
          </Button>
          <Button
            className="w-64 h-20 text-xl rounded-xl border-2 border-black"
            variant="outline"
            onClick={() => setShowJoinLedger(true)}
          >
            join a ledger
          </Button>
          <ConnectButton />
        </div>
      </Card>

      {/* Create Ledger Modal */}
      {/* <LifiWidgetButton /> */}
      {showCreateLedger && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full text-center relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-black text-2xl"
              onClick={() => setShowCreateLedger(false)}
              aria-label="Close"
            >
              ×
            </button>
            <CreateLedgerButton onLedgerCreated={handleLedgerCreated} />
          </div>
        </div>
      )}

      {/* Join Ledger Modal */}
      {showJoinLedger && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full text-center relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-black text-2xl"
              onClick={() => setShowJoinLedger(false)}
              aria-label="Close"
            >
              ×
            </button>
            <JoinLedgerButton initialLedgerAddress={joinLedgerAddress} />
          </div>
        </div>
      )}
    </main>
  );
}
