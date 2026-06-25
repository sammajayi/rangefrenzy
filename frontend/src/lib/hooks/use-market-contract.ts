"use client";

import { useReadContracts } from "wagmi";
import { rangeFrenzyMarketAbi, type OnChainMarketSummary, type OnChainRange, type OnChainUserStake } from "@/lib/contracts";

export function useMarketContract(
  contractAddress: `0x${string}` | undefined,
  userAddress?: `0x${string}`
) {
  const enabled = !!contractAddress;

  const { data: marketData, isLoading: marketLoading, isError, refetch } = useReadContracts({
    contracts: [
      { address: contractAddress!, abi: rangeFrenzyMarketAbi, functionName: "getMarketSummary" },
      { address: contractAddress!, abi: rangeFrenzyMarketAbi, functionName: "getAllRanges" },
    ] as any[],
    query: { enabled },
  });

  const { data: userData, isLoading: userLoading } = useReadContracts({
    contracts: [
      { address: contractAddress!, abi: rangeFrenzyMarketAbi, functionName: "userStakes", args: [userAddress!] },
      { address: contractAddress!, abi: rangeFrenzyMarketAbi, functionName: "hasActivePosition", args: [userAddress!] },
    ] as any[],
    query: { enabled: enabled && !!userAddress },
  });

  let summary: OnChainMarketSummary | undefined;
  const s0 = marketData?.[0] as { status: string; result: unknown } | undefined;
  if (s0?.status === "success" && s0.result) {
    const [question, cat, deadline, marketStatus, pool, numStakers, outcome, isPaused] =
      s0.result as [string, number, bigint, number, bigint, bigint, bigint, boolean];
    summary = { question, category: cat, deadline, status: marketStatus as any, pool, numStakers, outcome, isPaused, ranges: [] };
  }

  let ranges: OnChainRange[] = [];
  const s1 = marketData?.[1] as { status: string; result: unknown } | undefined;
  if (s1?.status === "success" && s1.result) {
    ranges = s1.result as OnChainRange[];
    if (summary) summary.ranges = ranges;
  }

  let userStake: OnChainUserStake | undefined;
  const u0 = userData?.[0] as { status: string; result: unknown } | undefined;
  if (u0?.status === "success" && u0.result) {
    const [rangeIndex, shares, pricePaid, amountStaked, claimed] =
      u0.result as [bigint, bigint, bigint, bigint, boolean];
    userStake = { rangeIndex, shares, pricePaid, amountStaked, claimed };
  }

  const u1 = userData?.[1] as { status: string; result: unknown } | undefined;
  const hasActivePosition = u1?.status === "success" ? (u1.result as boolean) : false;

  return { summary, ranges, userStake, hasActivePosition, isLoading: marketLoading || userLoading, isError, refetch };
}
