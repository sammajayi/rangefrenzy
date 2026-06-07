import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { wallet_address, platform } = await req.json();
    const addr = (wallet_address ?? "").toLowerCase();

    if (!addr || !platform || !["twitter", "telegram"].includes(platform)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const source = platform === "twitter" ? "social_twitter" : "social_telegram" as const;

    const { data: existing } = await supabase
      .from("bonus_earnings")
      .select("id")
      .eq("wallet_address", addr)
      .eq("source", source)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ bonus_credited: false, reason: "already_credited" });
    }

    const { error } = await supabase.from("bonus_earnings").insert({
      wallet_address: addr,
      source,
      amount_gd: 5,
      status: "pending",
    });

    if (error) throw error;

    await supabase.from("social_rewards").upsert(
      {
        wallet_address: addr,
        platform,
        reward_amount: 5,
        status: "pending",
      },
      { onConflict: "wallet_address,platform", ignoreDuplicates: true }
    );

    return NextResponse.json({ bonus_credited: true });
  } catch (err) {
    console.error("social-follow error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
