"use client";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export const ConnectButton = () => {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

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

  const handleSwitchToSepolia = () => {
    switchChain({ chainId: sepolia.id });
  };

  const isOnSepolia = chainId === sepolia.id;

  return (
    <div className="flex flex-col gap-2">
      {address ? (
        <div className="flex flex-col gap-2">
          <div className="text-sm text-gray-600">
            Connected: {address.slice(0, 6)}...{address.slice(-4)}
          </div>
          
          {isConnected && !isOnSepolia && (
            <Button 
              onClick={handleSwitchToSepolia}
              disabled={isSwitchingChain}
              className="w-64 h-12 text-lg rounded-xl border-2 border-orange-500 bg-orange-100 hover:bg-orange-200"
            >
              {isSwitchingChain ? "Switching..." : "Switch to Sepolia"}
            </Button>
          )}
          
          {isOnSepolia && (
            <div className="text-sm text-green-600 font-medium">
              ✓ Connected to Sepolia
            </div>
          )}
          
          <Button 
            onClick={() => disconnect()}
            className="w-64 h-12 text-lg rounded-xl"
          >
            Disconnect
          </Button>
        </div>
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
