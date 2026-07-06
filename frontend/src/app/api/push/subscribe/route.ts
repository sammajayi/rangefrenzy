import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { wallet_address, username, subscription } = await req.json();
    const addr = (wallet_address ?? "").toLowerCase();
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;

    if (!addr || !endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Missing wallet_address or subscription" }, { status: 400 });
    }

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        wallet_address: addr,
        username: username ? String(username).toLowerCase() : null,
        endpoint,
        p256dh,
        auth,
      },
      { onConflict: "endpoint" },
    );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("push subscribe error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (!endpoint) {
      return NextResponse.json({ error: "endpoint required" }, { status: 400 });
    }
    const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("push unsubscribe error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
