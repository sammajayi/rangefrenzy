"use client";

import { useAccount, useBalance, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const erc20BalanceAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const cUSD_ADDRESS = "0x765de816845861e75a25fca122bb6898b8b1282a" as `0x${string}`;
const USDC_ADDRESS = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`;
const USDT_ADDRESS = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" as `0x${string}`;

function NativeBalance({ address, symbol }: { address: `0x${string}`; symbol: string }) {
  const { data, isLoading } = useBalance({ address });
  const formatted = data ? parseFloat(formatUnits(data.value, data.decimals)).toFixed(4) : "0.0000";
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{symbol}</span>
      <span className="font-medium">{isLoading ? "Loading..." : formatted}</span>
    </div>
  );
}

function TokenBalance({
  address,
  token,
  symbol,
  decimals = 18,
}: {
  address: `0x${string}`;
  token: `0x${string}`;
  symbol: string;
  decimals?: number;
}) {
  const { data, isLoading } = useReadContract({
    address: token,
    abi: erc20BalanceAbi,
    functionName: "balanceOf",
    args: [address],
  });
  const formatted =
    data != null ? parseFloat(formatUnits(data, decimals)).toFixed(4) : "0.0000";
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{symbol}</span>
      <span className="font-medium">{isLoading ? "Loading..." : formatted}</span>
    </div>
  );
}

export function UserBalance() {
  const { address, isConnected } = useAccount();

  if (!isConnected || !address) return null;

  return (
    <Card className="w-full max-w-md mx-auto mb-8">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Connected Wallet</CardTitle>
        <p className="text-sm text-muted-foreground truncate pt-1">{address}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 pt-2 border-t">
          <NativeBalance address={address} symbol="CELO" />
          <TokenBalance address={address} token={cUSD_ADDRESS} symbol="USDm / cUSD" />
          <TokenBalance address={address} token={USDC_ADDRESS} symbol="USDC" />
          <TokenBalance address={address} token={USDT_ADDRESS} symbol="USDT" />
        </div>
      </CardContent>
    </Card>
  );
}
