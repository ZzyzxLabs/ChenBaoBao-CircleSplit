import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DeployModule = buildModule("DeployModule", (m) => {
  // Mock USDC token address (replace with actual USDC address for your network)
  // For mainnet: 0xA0b86a33E6441c8F59c7f5c4dA6c0c90E4bb4C5A (actual USDC address varies by network)
  // For testnets: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
  const usdcTokenAddress = m.getParameter("usdcToken", "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238");

  // Deploy LedgerFactory
  const ledgerFactory = m.contract("LedgerFactory", [usdcTokenAddress], {
    id: "LedgerFactory",
  });

  return { 
    ledgerFactory
  };
});

export default DeployModule; 