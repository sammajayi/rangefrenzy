"use client";

import { useState } from "react";
import { useAccount, useSwitchChain, useSendTransaction, useWriteContract } from "wagmi";
import { isAddress, parseEther } from "viem";
import { celo } from "viem/chains";
import { G_TOKEN_ADDRESS, ERC20_ABI } from "@/lib/contracts";

export type WithdrawToken = "CELO" | "GD";
export type WithdrawStep = "idle" | "sending" | "success" | "error";

export function useWithdraw() {
  const { address: userAddress, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [step, setStep] = useState<WithdrawStep>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  const withdraw = async (token: WithdrawToken, to: string, amount: string) => {
    if (!userAddress) return;
    setErrorMsg(null);

    if (!isAddress(to)) {
      setErrorMsg("Enter a valid wallet address.");
      setStep("error");
      return;
    }
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setErrorMsg("Enter an amount greater than 0.");
      setStep("error");
      return;
    }

    setStep("sending");
    try {
      if (chainId && chainId !== celo.id) {
        await switchChainAsync({ chainId: celo.id });
      }
      const amountWei = parseEther(amount);
      const hash =
        token === "CELO"
          ? await sendTransactionAsync({ to: to as `0x${string}`, value: amountWei })
          : await writeContractAsync({
              address: G_TOKEN_ADDRESS,
              abi: ERC20_ABI,
              functionName: "transfer",
              args: [to as `0x${string}`, amountWei],
            });
      setTxHash(hash);
      await waitForTx(hash);
      setStep("success");
    } catch (err: unknown) {
      setErrorMsg(parseWithdrawError(err));
      setStep("error");
    }
  };

  const reset = () => {
    setStep("idle");
    setErrorMsg(null);
    setTxHash(undefined);
  };

  return { withdraw, reset, step, errorMsg, txHash };
}

async function waitForTx(hash: `0x${string}`) {
  const { createPublicClient, http } = await import("viem");
  const client = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });
  await client.waitForTransactionReceipt({ hash });
}

function parseWithdrawError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("insufficient funds")) return "Insufficient balance for this withdrawal.";
  if (msg.includes("User rejected") || msg.includes("user rejected")) return "Transaction cancelled.";
  return "Transaction failed. Please try again.";
}
