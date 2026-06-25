"use client";

import { useState } from "react";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { celo } from "viem/chains";
import { rangeFrenzyMarketAbi } from "@/lib/contracts";

export type ClaimStep = "idle" | "claiming" | "success" | "error";

export function useClaim(marketAddress: `0x${string}` | undefined) {
  const { address: userAddress, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [step, setStep] = useState<ClaimStep>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { writeContractAsync } = useWriteContract();

  const execute = async (action: "claim" | "refund") => {
    if (!marketAddress || !userAddress) return;
    setStep("claiming");
    setErrorMsg(null);
    try {
      if (chainId && chainId !== celo.id) {
        await switchChainAsync({ chainId: celo.id });
      }
      const hash = await writeContractAsync({
        address: marketAddress,
        abi: rangeFrenzyMarketAbi,
        functionName: action,
        args: [],
      });
      setTxHash(hash);
      await waitForTx(hash);
      setStep("success");
    } catch (err: any) {
      setErrorMsg(parseClaimError(err));
      setStep("error");
    }
  };

  const reset = () => {
    setStep("idle");
    setErrorMsg(null);
    setTxHash(undefined);
  };

  return { execute, reset, step, errorMsg, txHash };
}

async function waitForTx(hash: `0x${string}`) {
  const { createPublicClient, http } = await import("viem");
  const { celo } = await import("viem/chains");
  const client = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });
  await client.waitForTransactionReceipt({ hash });
}

function parseClaimError(err: any): string {
  const msg: string = err?.message ?? err?.shortMessage ?? String(err);
  if (msg.includes("NotAWinner")) return "Your range did not win this market.";
  if (msg.includes("AlreadyClaimed")) return "You have already claimed.";
  if (msg.includes("NoStakeFound")) return "No stake found for your address.";
  if (msg.includes("MarketNotResolved")) return "Market has not been resolved yet.";
  if (msg.includes("MarketNotCancelled")) return "Market is not cancelled.";
  if (msg.includes("User rejected")) return "Transaction cancelled.";
  return "Transaction failed. Please try again.";
}
