"use client";

import { useQuery } from "@tanstack/react-query";
import { subgraphClient } from "@/lib/subgraph";
import { supabase } from "@/lib/supabase";
import { LEADERBOARD_QUERY, type SubgraphLeaderRow } from "@/lib/subgraph-queries";

export type LeaderboardEntry = SubgraphLeaderRow & {
  username: string;
  avatar_url: string | null;
};

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const data = await subgraphClient.request<{ users: SubgraphLeaderRow[] }>(
        LEADERBOARD_QUERY
      );
      const rows = data.users;
      if (!rows.length) return [] as LeaderboardEntry[];

      const addresses = rows.map((r) => r.address.toLowerCase());
      const { data: profiles } = await supabase
        .from("profiles")
        .select("wallet_address, username, avatar_url")
        .in("wallet_address", addresses);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.wallet_address.toLowerCase(), p])
      );

      return rows.map((row) => {
        const profile = profileMap.get(row.address.toLowerCase());
        return {
          ...row,
          username: profile?.username ?? `${row.address.slice(0, 6)}…${row.address.slice(-4)}`,
          avatar_url: profile?.avatar_url ?? null,
        };
      });
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
