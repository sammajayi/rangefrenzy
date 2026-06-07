import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { wallet_address } = await req.json();
    const addr = (wallet_address ?? "").toLowerCase();
    if (!addr) {
      return NextResponse.json({ error: "wallet_address required" }, { status: 400 });
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const { data: profile } = await supabase
      .from("profiles")
      .select("current_streak, last_active_date")
      .eq("wallet_address", addr)
      .maybeSingle();

    let newStreak = 1;
    const lastDate = profile?.last_active_date;
    const lastStr = lastDate ? lastDate.slice(0, 10) : null;

    if (lastStr === todayStr) {
      newStreak = profile?.current_streak ?? 1;
    } else if (lastStr) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      newStreak = lastStr === yesterdayStr ? (profile?.current_streak ?? 0) + 1 : 1;
    }

    await supabase
      .from("profiles")
      .update({ current_streak: newStreak, last_active_date: todayStr })
      .eq("wallet_address", addr);

    const bonusesCredited: string[] = [];
    const milestones: { source: "streak_7" | "streak_30"; amount: number; streak: number }[] = [
      { source: "streak_7", amount: 25, streak: 7 },
      { source: "streak_30", amount: 100, streak: 30 },
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
