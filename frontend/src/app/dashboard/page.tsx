import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Caveat } from "next/font/google";

const caveat = Caveat({ subsets: ["latin"], weight: "400" });

const transactions = [
  { id: 1, label: "tx1" },
  { id: 2, label: "tx2" },
  { id: 3, label: "tx3" },
  // Add more transactions as needed
];

export default function DashboardPage() {
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
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="w-full bg-white border border-black rounded-lg py-6 text-center text-lg font-medium shadow-sm"
              >
                {tx.label}
              </div>
            ))}
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
            >
              add payment
            </Button>
          </div>
        </div>
      </Card>
    </main>
  );
}
