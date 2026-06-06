"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { marketFactoryAbi, rangeFrenzyMarketAbi, FACTORY_ADDRESS, MarketStatus } from "@/lib/contracts";
import { formatDeadline } from "@/lib/markets";

export type OnChainRange = {
  index: number;
  label: string;
  lowerBound: bigint;
  upperBound: bigint;
  totalStaked: bigint;
};

export type OnChainMarket = {
  address: `0x${string}`;
  question: string;
  category: number;
  categoryLabel: string;
  deadline: bigint;
  deadlineLabel: string;
  status: number;
  pool: bigint;
  poolLabel: string;
  numStakers: number;
  isActive: boolean;
  isResolved: boolean;
  ranges: OnChainRange[];
};

const CATEGORY_LABELS = ["Crypto", "Sports", "Local"];

export function useFactoryMarkets() {
  const { data: addressesRaw, isLoading: loadingAddresses } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: marketFactoryAbi,
    functionName: "getMarketsPage",
    args: [0n, 50n],
    query: { enabled: !!FACTORY_ADDRESS },
  });

  const addresses = (addressesRaw as `0x${string}`[] | undefined) ?? [];

  const { data: batchData, isLoading: loadingBatch } = useReadContracts({
    contracts: addresses.flatMap((addr) => [
      { address: addr, abi: rangeFrenzyMarketAbi, functionName: "getMarketSummary" as const },
      { address: addr, abi: rangeFrenzyMarketAbi, functionName: "getAllRanges" as const },
    ]),
    query: { enabled: addresses.length > 0 },
  });

  const markets: OnChainMarket[] = addresses.flatMap((addr, i) => {
    const summaryResult = batchData?.[i * 2];
    const rangesResult = batchData?.[i * 2 + 1];
    if (summaryResult?.status !== "success" || !summaryResult.result) return [];

    const [question, cat, deadline, status, pool, numStakers] =
      summaryResult.result as [string, number, bigint, number, bigint, bigint, bigint, boolean];

    const rawRanges = rangesResult?.status === "success" && rangesResult.result
      ? (rangesResult.result as Array<{ label: string; lowerBound: bigint; upperBound: bigint; totalStaked: bigint }>)
      : [];

    const poolFloat = parseFloat(formatUnits(pool, 18));
    const poolLabel = poolFloat === 0 ? "No stakes yet" : `${poolFloat.toFixed(2)} G$`;
    const deadlineLabel = formatDeadline(new Date(Number(deadline) * 1000).toISOString());

    return [{
      address: addr,
      question,
      category: cat,
      categoryLabel: CATEGORY_LABELS[cat] ?? "Other",
      deadline,
      deadlineLabel,
      status,
      pool,
      poolLabel,
      numStakers: Number(numStakers),
      isActive: status === MarketStatus.OPEN || status === MarketStatus.CLOSED,
      isResolved: status === MarketStatus.RESOLVED || status === MarketStatus.CANCELLED,
      ranges: rawRanges.map((r, idx) => ({
        index: idx,
        label: r.label,
        lowerBound: r.lowerBound,
        upperBound: r.upperBound,
        totalStaked: r.totalStaked,
      })),
    }];
  });

  return {
    markets,
    isLoading: loadingAddresses || (addresses.length > 0 && loadingBatch),
  };
}
