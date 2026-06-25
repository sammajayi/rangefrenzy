"use client";

import { useState } from "react";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { celo } from "viem/chains";
import { rangeFrenzyMarketAbi } from "@/lib/contracts";

export type SellStep = "idle" | "selling" | "success" | "error";

export function useSell(marketAddress: `0x${string}` | undefined) {
  const { address: userAddress, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [step, setStep] = useState<SellStep>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sellTxHash, setSellTxHash] = useState<`0x${string}` | undefined>();
  const { writeContractAsync } = useWriteContract();

  const sell = async () => {
    if (!marketAddress || !userAddress) return;
    setStep("idle");
    setErrorMsg(null);
    try {
      if (chainId && chainId !== celo.id) {
        await switchChainAsync({ chainId: celo.id });
      }
      setStep("selling");
      const hash = await writeContractAsync({
        address: marketAddress,
        abi: rangeFrenzyMarketAbi,
        functionName: "sell",
        args: [],
      });
      setSellTxHash(hash);
      await waitForTx(hash);
      setStep("success");
    } catch (err: any) {
      setErrorMsg(parseSellError(err));
      setStep("error");
    }
  };

  const reset = () => {
    setStep("idle");
    setErrorMsg(null);
    setSellTxHash(undefined);
  };

  return { sell, reset, step, errorMsg, sellTxHash };
}

async function waitForTx(hash: `0x${string}`) {
  const { createPublicClient, http } = await import("viem");
  const { celo } = await import("viem/chains");
  const client = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });
  await client.waitForTransactionReceipt({ hash });
}

function parseSellError(err: any): string {
  const msg: string = err?.message ?? err?.shortMessage ?? String(err);
  if (msg.includes("NoActivePosition")) return "You have no active position to sell.";
  if (msg.includes("AlreadyResolvedOrCancelled")) return "Cannot sell after market is resolved or cancelled.";
  if (msg.includes("User rejected")) return "Transaction cancelled.";
  return "Transaction failed. Please try again.";
}
