"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  computeStandings,
  phaseOf,
  type Contest,
  type StakeRow,
  type Standing,
} from "@/lib/contest";

/** Dev-only sample, so the screens can be reviewed without a database. Open /?contest=demo. */
function demoContest(): { contest: Contest; standings: Standing[] } {
  const now = Date.now();
  const names = ["amara", "tunde", "ngozi", "kofi", "zainab", "chidi", "lola", "emeka"];
  return {
    contest: {
      id: "demo",
      title: "Week 44 contest",
      description: "Stake across any live market. Most G$ staked this week wins.",
      starts_at: new Date(now - 2 * 86_400_000).toISOString(),
      ends_at: new Date(now + 4 * 86_400_000 + 3 * 3_600_000).toISOString(),
      prize_pool_gd: 250,
      prizes: [
        { rank: 1, amount: 120 },
        { rank: 2, amount: 80 },
        { rank: 3, amount: 50 },
      ],
      min_picks: 3,
      status: "active",
    },
    standings: names.map((n, i) => ({
      wallet: `0x${String(i + 1).repeat(40)}`,
      username: n,
      avatarUrl: null,
      staked: 212 - i * 23.4,
      picks: 9 - i,
    })),
  };
}

export interface ContestState {
  contest: Contest | null;
  /** Everyone who has staked in the window, ranked. Includes people below the pick minimum. */
  standings: Standing[];
  loading: boolean;
  error: boolean;
  reload: () => void;
}

/** The contest players should see: the running one, else the next one, else the latest finished. */
export function useContest(): ContestState {
  const [state, setState] = useState<Omit<ContestState, "reload">>({
    contest: null,
    standings: [],
    loading: true,
    error: false,
  });
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const done = (next: Partial<Omit<ContestState, "reload">>) => {
      if (!cancelled) setState((s) => ({ ...s, loading: false, error: false, ...next }));
    };

    if (process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).get("contest") === "demo") {
      const demo = demoContest();
      done({ contest: demo.contest, standings: demo.standings });
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .order("starts_at", { ascending: false })
        .limit(10);
      if (error) {
        // The table may not exist yet. Treat that as "no contest" rather than a broken screen.
        done({ contest: null, standings: [], error: error.code !== "42P01" && error.code !== "PGRST205" });
        return;
      }
      const all = (data ?? []).map((c) => ({ ...c, prize_pool_gd: Number(c.prize_pool_gd) })) as Contest[];
      const pick =
        all.find((c) => phaseOf(c) === "running") ??
        [...all].reverse().find((c) => phaseOf(c) === "upcoming") ??
        all[0] ??
        null;
      if (!pick) {
        done({ contest: null, standings: [] });
        return;
      }
      const { data: rows, error: stakeError } = await supabase
        .from("stakes")
        .select("wallet_address, amount_gd, status, profile:profiles!stakes_wallet_address_fkey(username, avatar_url)")
        .gte("created_at", pick.starts_at)
        .lt("created_at", pick.ends_at)
        .neq("status", "refunded");
      if (stakeError) {
        done({ contest: pick, standings: [], error: true });
        return;
      }
      done({ contest: pick, standings: computeStandings((rows ?? []) as unknown as StakeRow[]) });
    })();

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  return { ...state, reload };
}
