import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToSubscription } from "@/lib/push-server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { title, category, market_id } = await req.json();
    if (!title) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }

    const notifTitle = "New market live";
    const notifBody = category ? `${title} (${category})` : title;
    const url = market_id ? `/?market=${market_id}` : "/";

    // 1. In-app notifications — one row per user that has a username.
    const { data: profiles } = await supabase
      .from("profiles")
      .select("username")
      .not("username", "is", null);

    const usernames = (profiles ?? [])
      .map((p) => (p as { username: string | null }).username)
      .filter((u): u is string => !!u);

    if (usernames.length > 0) {
      const rows = usernames.map((username) => ({
        username: username.toLowerCase(),
        title: notifTitle,
        body: notifBody,
      }));
      const { error: insertError } = await supabase.from("notifications").insert(rows);
      if (insertError) console.error("notify-new: notifications insert error:", insertError);
    }

    // 2. Web Push — best-effort, prune subscriptions that are no longer valid.
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth");

    let pushed = 0;
    const staleIds: string[] = [];
    for (const sub of subs ?? []) {
      const result = await sendPushToSubscription(sub, { title: notifTitle, body: notifBody, url });
      if (result === "ok") pushed++;
      if (result === "gone") staleIds.push(sub.id);
    }

    if (staleIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", staleIds);
    }

    return NextResponse.json({ notified: usernames.length, pushed });
  } catch (err) {
    console.error("notify-new error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
