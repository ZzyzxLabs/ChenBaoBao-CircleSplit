import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Caveat } from "next/font/google";

const caveat = Caveat({ subsets: ["latin"], weight: ["700"] });

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-[420px] p-10 flex flex-col items-center border-2 border-black rounded-2xl shadow-lg">
        <h1
          className={`text-3xl mb-12 text-center font-bold ${caveat.className}`}
        >
          Welcome to ChenBaoBao-CircleSplit
        </h1>
        <div className="flex flex-col gap-8 w-full items-center">
          <Button
            className="w-64 h-20 text-xl rounded-xl border-2 border-black"
            variant="outline"
          >
            create a ledger
          </Button>
          <Button
            className="w-64 h-20 text-xl rounded-xl border-2 border-black"
            variant="outline"
          >
            join a ledger
          </Button>
          <Button
            className="w-64 h-20 text-xl rounded-xl border-2 border-black"
            variant="outline"
          >
            wallet sign in
          </Button>
        </div>
      </Card>
    </main>
  );
}
