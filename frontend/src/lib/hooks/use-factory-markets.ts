"use client";

import { useState, useEffect } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { marketFactoryAbi, rangeFrenzyMarketAbi, FACTORY_ADDRESS, MarketStatus } from "@/lib/contracts";
import { formatDeadline } from "@/lib/markets";
import { supabase } from "@/lib/supabase";

const MAX_UINT_255 = BigInt(1n << 255n);

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
  imageUrl: string | null;
};

const CATEGORY_LABELS = ["Crypto", "Sports", "Local", "Weather", "Stocks", "Social Media"];

function fmtNum(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${+(n / 1_000_000).toPrecision(3)}M`;
  if (Math.abs(n) >= 1_000) return `${+(n / 1_000).toPrecision(3)}k`;
  return Number.isInteger(n) ? n.toString() : n.toFixed(2);
}

export function formatRangeLabel(r: { lowerBound: bigint; upperBound: bigint; label?: string }): string {
  const isMax = r.upperBound >= MAX_UINT_255;
  const lower = parseFloat(formatUnits(r.lowerBound, 18));
  const upper = isMax ? null : parseFloat(formatUnits(r.upperBound, 18));
  if (upper === null) return `${fmtNum(lower)}+`;
  return `${fmtNum(lower)} – ${fmtNum(upper)}`;
}

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

  const [imageMap, setImageMap] = useState<Record<string, string | null>>({});
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase
      .from("markets")
      .select("contract_address, image_url, category")
      .not("contract_address", "is", null)
      .then(({ data }) => {
        if (!data) return;
        const imgs: Record<string, string | null> = {};
        const cats: Record<string, string> = {};
        for (const m of data) {
          if (m.contract_address) {
            imgs[m.contract_address.toLowerCase()] = m.image_url ?? null;
            if (m.category) cats[m.contract_address.toLowerCase()] = m.category;
          }
        }
        setImageMap(imgs);
        setCategoryMap(cats);
      });
  }, []);

  const markets: OnChainMarket[] = addresses.flatMap((addr, i) => {
    const summaryResult = batchData?.[i * 2];
    const rangesResult = batchData?.[i * 2 + 1];
    if (summaryResult?.status !== "success" || !summaryResult.result) return [];

    const [question, cat, deadline, status, pool, numStakers] =
      summaryResult.result as [string, number, bigint, number, bigint, bigint, bigint, boolean];

    const rawRanges = rangesResult?.status === "success" && rangesResult.result
      ? (rangesResult.result as unknown as Array<{ label: string; lowerBound: bigint; upperBound: bigint; totalStaked: bigint }>)
      : [];

    const poolFloat = parseFloat(formatUnits(pool, 18));
    const poolLabel = poolFloat === 0 ? "No stakes yet" : `${poolFloat.toFixed(2)} G$`;
    const deadlineLabel = formatDeadline(new Date(Number(deadline) * 1000).toISOString());

    return [{
      address: addr,
      question,
      category: cat,
      categoryLabel: categoryMap[addr.toLowerCase()] ?? CATEGORY_LABELS[cat] ?? "Other",
      deadline,
      deadlineLabel,
      status,
      pool,
      poolLabel,
      numStakers: Number(numStakers),
      isActive: status === MarketStatus.OPEN || status === MarketStatus.CLOSED,
      isResolved: status === MarketStatus.RESOLVED || status === MarketStatus.CANCELLED,
      imageUrl: imageMap[addr.toLowerCase()] ?? null,
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
