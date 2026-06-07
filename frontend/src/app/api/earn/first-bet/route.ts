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

    const { count: betCount } = await supabase
      .from("stakes")
      .select("*", { count: "exact", head: true })
      .eq("wallet_address", addr);

    if (betCount && betCount > 1) {
      return NextResponse.json({ bonus_credited: false, reason: "not_first_bet" });
    }

    const { data: existing } = await supabase
      .from("bonus_earnings")
      .select("id")
      .eq("wallet_address", addr)
      .eq("source", "first_bet")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ bonus_credited: false, reason: "already_credited" });
    }

    await supabase.from("bonus_earnings").insert({
      wallet_address: addr,
      source: "first_bet",
      amount_gd: 10,
      status: "pending",
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("referred_by, username")
      .eq("wallet_address", addr)
      .maybeSingle();

    if (profile?.referred_by) {
      const { data: referral } = await supabase
        .from("referrals")
        .select("id, bonus_credited")
        .eq("referee_wallet", addr)
        .maybeSingle();

      if (referral && !referral.bonus_credited) {
        const refAddr = profile.referred_by.toLowerCase();

        await supabase.from("bonus_earnings").insert({
          wallet_address: refAddr,
          source: "referral_bonus",
          amount_gd: 15,
          status: "pending",
          metadata: { referee: addr },
        });

        await supabase.from("bonus_earnings").insert({
          wallet_address: addr,
          source: "referral_reward",
          amount_gd: 15,
          status: "pending",
          metadata: { referrer: refAddr },
        });

        await supabase
          .from("referrals")
          .update({ bonus_credited: true })
          .eq("id", referral.id);
      }
    }

    return NextResponse.json({ bonus_credited: true });
  } catch (err) {
    console.error("first-bet error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
