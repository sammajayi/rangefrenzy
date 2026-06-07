import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get("wallet")?.toLowerCase();
    if (!wallet) {
      return NextResponse.json({ error: "wallet param required" }, { status: 400 });
    }
    return NextResponse.json({ referral_code: wallet, referral_link: `https://rangefrenzy.xyz/ref/${wallet}` });
  } catch (err) {
    console.error("referral GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { wallet_address, referrer_code } = await req.json();
    const addr = (wallet_address ?? "").toLowerCase();
    const refCode = (referrer_code ?? "").toLowerCase();

    if (!addr || !refCode) {
      return NextResponse.json({ error: "wallet_address and referrer_code required" }, { status: 400 });
    }

    if (addr === refCode) {
      return NextResponse.json({ error: "cannot refer yourself" }, { status: 400 });
    }

    const { data: existingReferral } = await supabase
      .from("referrals")
      .select("id")
      .eq("referee_wallet", addr)
      .maybeSingle();

    if (existingReferral) {
      return NextResponse.json({ success: false, reason: "already_referred" });
    }

    const { data: referrerProfile } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("wallet_address", refCode)
      .maybeSingle();

    if (!referrerProfile) {
      return NextResponse.json({ error: "invalid referral code" }, { status: 400 });
    }

    await supabase.from("referrals").insert({
      referrer_wallet: refCode,
      referee_wallet: addr,
    });

    await supabase
      .from("profiles")
      .update({ referred_by: refCode })
      .eq("wallet_address", addr);

    return NextResponse.json({ success: true, referrer: refCode });
  } catch (err) {
    console.error("referral POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
