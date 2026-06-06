"use client";

import { useState } from "react";
import { useWriteContract } from "wagmi";
import { rangeFrenzyMarketAbi, MarketStatus } from "@/lib/contracts";

export type ClaimStep = "idle" | "claiming" | "success" | "error";

export function useClaim(marketAddress: `0x${string}` | undefined, marketStatus: number) {
  const [step, setStep] = useState<ClaimStep>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync } = useWriteContract();

  const claim = async () => {
    if (!marketAddress) return;
    setStep("claiming");
    setErrorMsg(null);

    try {
      // Resolved market → claim winnings; Cancelled market → refund stake
      const functionName = marketStatus === MarketStatus.CANCELLED ? "refund" : "claim";
      const hash = await writeContractAsync({
        address: marketAddress,
        abi: rangeFrenzyMarketAbi,
        functionName,
      });
      setTxHash(hash);

      const { createPublicClient, http } = await import("viem");
      const { celo } = await import("viem/chains");
      const client = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });
      await client.waitForTransactionReceipt({ hash });

      setStep("success");
    } catch (err: any) {
      const msg: string = err?.message ?? err?.shortMessage ?? String(err);
      if (msg.includes("NotAWinner")) setErrorMsg("Your range did not win this market.");
      else if (msg.includes("AlreadyClaimed")) setErrorMsg("You have already claimed.");
      else if (msg.includes("NoStakeFound")) setErrorMsg("No stake found for your address.");
      else if (msg.includes("User rejected")) setErrorMsg("Transaction cancelled.");
      else setErrorMsg("Transaction failed. Please try again.");
      setStep("error");
    }
  };

  const reset = () => { setStep("idle"); setErrorMsg(null); setTxHash(undefined); };

  return { claim, reset, step, errorMsg, txHash };
}
