"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { rangeFrenzyMarketAbi, erc20Abi, STAKE_TOKEN_ADDRESS } from "@/lib/contracts";

export type StakeStep = "idle" | "approving" | "staking" | "success" | "error";

export function useStake(marketAddress: `0x${string}` | undefined) {
  const { address: userAddress } = useAccount();
  const [step, setStep] = useState<StakeStep>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Read current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: STAKE_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [userAddress!, marketAddress!],
    query: { enabled: !!userAddress && !!marketAddress },
  });

  // Read token symbol + decimals for display
  const { data: symbol } = useReadContract({
    address: STAKE_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "symbol",
  });

  const { data: decimals } = useReadContract({
    address: STAKE_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "decimals",
  });

  const { writeContractAsync } = useWriteContract();

  // Approval tx tracking
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    query: { enabled: !!approveTxHash },
  });

  // Stake tx tracking
  const [stakeTxHash, setStakeTxHash] = useState<`0x${string}` | undefined>();
  const { isSuccess: stakeConfirmed } = useWaitForTransactionReceipt({
    hash: stakeTxHash,
    query: { enabled: !!stakeTxHash },
  });

  const stake = async (rangeIndex: number, amount: bigint) => {
    if (!marketAddress || !userAddress) return;
    setStep("idle");
    setErrorMsg(null);

    try {
      // Step 1: approve if needed
      const currentAllowance = (allowance ?? 0n) as bigint;
      if (currentAllowance < amount) {
        setStep("approving");
        const hash = await writeContractAsync({
          address: STAKE_TOKEN_ADDRESS,
          abi: erc20Abi,
          functionName: "approve",
          args: [marketAddress, amount],
        });
        setApproveTxHash(hash);
        // Wait inline for approval confirmation
        await waitForTx(hash);
        await refetchAllowance();
      }

      // Step 2: stake
      setStep("staking");
      const hash = await writeContractAsync({
        address: marketAddress,
        abi: rangeFrenzyMarketAbi,
        functionName: "stake",
        args: [BigInt(rangeIndex), amount],
      });
      setStakeTxHash(hash);
      await waitForTx(hash);
      setStep("success");
    } catch (err: any) {
      const msg = parseContractError(err);
      setErrorMsg(msg);
      setStep("error");
    }
  };

  const reset = () => {
    setStep("idle");
    setErrorMsg(null);
    setApproveTxHash(undefined);
    setStakeTxHash(undefined);
  };

  return {
    stake,
    reset,
    step,
    errorMsg,
    approveTxHash,
    stakeTxHash,
    stakeConfirmed,
    symbol: symbol as string | undefined,
    decimals: decimals as number | undefined,
  };
}

async function waitForTx(hash: `0x${string}`) {
  // Polling fallback — wagmi's useWaitForTransactionReceipt is hook-based,
  // so we poll the RPC directly for inline awaiting inside async functions.
  const { createPublicClient, http } = await import("viem");
  const { celo } = await import("viem/chains");
  const client = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });
  await client.waitForTransactionReceipt({ hash });
}

function parseContractError(err: any): string {
  const msg: string = err?.message ?? err?.shortMessage ?? String(err);
  if (msg.includes("AlreadyStaked")) return "You have already staked on this market.";
  if (msg.includes("BelowMinStake")) return "Amount is below the minimum stake.";
  if (msg.includes("MarketNotOpen")) return "This market is no longer accepting stakes.";
  if (msg.includes("DeadlinePassed")) return "The betting deadline has passed.";
  if (msg.includes("InvalidRangeIndex")) return "Invalid range selected.";
  if (msg.includes("User rejected")) return "Transaction cancelled.";
  if (msg.includes("insufficient funds")) return "Insufficient balance to stake.";
  return "Transaction failed. Please try again.";
}
