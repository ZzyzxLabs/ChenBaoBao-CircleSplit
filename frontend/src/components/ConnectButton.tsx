"use client";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export const ConnectButton = () => {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  // Auto-switch to Sepolia when connected but on wrong network
  useEffect(() => {
    if (isConnected && chainId !== sepolia.id) {
      switchChain({ chainId: sepolia.id });
    }
  }, [isConnected, chainId, switchChain]);

  const handleConnect = async () => {
    try {
      await connect({ connector: connectors[0] });
      // The useEffect will handle network switching after connection
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {address ? (
        <Button
          onClick={() => disconnect()}
          className="w-64 h-12 text-lg rounded-xl"
        >
          Disconnect
        </Button>
      ) : (
        <Button
          className="w-64 h-20 text-xl rounded-xl border-2 border-black"
          onClick={handleConnect}
        >
          Connect to Sepolia
        </Button>
      )}
    </div>
  );
};
