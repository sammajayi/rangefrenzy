"use client";

import { useQuery } from "@tanstack/react-query";
import { subgraphClient } from "@/lib/subgraph";
import { USER_STAKES_QUERY, type SubgraphStake } from "@/lib/subgraph-queries";

export function useUserStakes(address: string | undefined) {
  const normalized = address?.toLowerCase();

  return useQuery({
    queryKey: ["user-stakes", normalized],
    queryFn: async () => {
      const data = await subgraphClient.request<{ stakes: SubgraphStake[] }>(
        USER_STAKES_QUERY,
        { address: normalized }
      );
      return data.stakes;
    },
    enabled: !!normalized,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
