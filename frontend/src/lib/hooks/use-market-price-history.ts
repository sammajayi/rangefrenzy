"use client";

import { useQuery } from "@tanstack/react-query";
import { subgraphClient } from "@/lib/subgraph";
import { MARKET_STAKES_QUERY, type SubgraphMarketStakePoint } from "@/lib/subgraph-queries";

export function useMarketPriceHistory(marketAddress: string | undefined) {
  const normalized = marketAddress?.toLowerCase();

  return useQuery({
    queryKey: ["market-price-history", normalized],
    queryFn: async () => {
      const data = await subgraphClient.request<{ stakes: SubgraphMarketStakePoint[] }>(
        MARKET_STAKES_QUERY,
        { marketId: normalized }
      );
      return data.stakes;
    },
    enabled: !!normalized,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
