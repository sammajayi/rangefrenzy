import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { address, platform } = await req.json();

    if (!address || !platform || !["twitter", "telegram"].includes(platform)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Record the reward claim — idempotent via unique constraint on (wallet_address, platform)
    const { error } = await supabase.from("social_rewards").upsert(
      {
        wallet_address: address.toLowerCase(),
        platform,
        reward_amount: 500,
        status: "pending",
      },
      { onConflict: "wallet_address,platform", ignoreDuplicates: true }
    );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("social-reward error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
