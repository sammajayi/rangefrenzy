import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function asProfile(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    current_streak: typeof r.current_streak === "number" ? r.current_streak : 0,
    last_active_date: typeof r.last_active_date === "string" ? r.last_active_date : null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { wallet_address } = await req.json();
    const addr = (wallet_address ?? "").toLowerCase();
    if (!addr) {
      return NextResponse.json({ error: "wallet_address required" }, { status: 400 });
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    let currentStreak = 0;
    let lastDate: string | null = null;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("current_streak, last_active_date")
        .eq("wallet_address", addr)
        .maybeSingle();
      const p = asProfile(data);
      if (p) {
        currentStreak = p.current_streak;
        lastDate = p.last_active_date?.slice(0, 10) ?? null;
      }
    } catch {
      // columns may not exist yet — start from scratch
    }

    let newStreak = 1;
    if (lastDate === todayStr) {
      newStreak = currentStreak || 1;
    } else if (lastDate) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      newStreak = lastDate === yesterday.toISOString().slice(0, 10) ? currentStreak + 1 : 1;
    }

    // Best-effort update — column may not exist
    try {
      await supabase
        .from("profiles")
        .update({ current_streak: newStreak })
        .eq("wallet_address", addr);
    } catch (e) {
      console.warn("streak update skipped (columns missing?):", e);
    }

    try {
      await supabase
        .from("profiles")
        .update({ last_active_date: todayStr })
        .eq("wallet_address", addr);
    } catch {
      // last_active_date column may not exist
    }

    const bonusesCredited: string[] = [];
    const milestones = [
      { source: "streak_7" as const, amount: 25, streak: 7 },
      { source: "streak_30" as const, amount: 100, streak: 30 },
    ];

    for (const ms of milestones) {
      if (newStreak >= ms.streak) {
        const { data: existing } = await supabase
          .from("bonus_earnings")
          .select("id")
          .eq("wallet_address", addr)
          .eq("source", ms.source)
          .maybeSingle();

        if (!existing) {
          await supabase.from("bonus_earnings").insert({
            wallet_address: addr,
            source: ms.source,
            amount_gd: ms.amount,
            status: "pending",
            metadata: { streak: newStreak },
          });
          bonusesCredited.push(ms.source);
        }
      }
    }

    return NextResponse.json({ streak: newStreak, bonuses_credited: bonusesCredited });
  } catch (err) {
    console.error("streak error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
