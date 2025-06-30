"use client";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";

export const ConnectButton = () => {
  const { address } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <div>
      {address ? (
        <Button onClick={() => disconnect()}>Disconnect</Button>
      ) : (
        <Button
          className="w-64 h-20 text-xl rounded-xl border-2 border-black"
          onClick={() => connect({ connector: connectors[0] })}
        >
          Connect
        </Button>
      )}
    </div>
  );
};
