import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-session";
import { validateContest, type Prize } from "@/lib/contest";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Create a contest. Admin only: the browser has no write access to this table. */
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const input = {
      title: String(body.title ?? ""),
      description: body.description ? String(body.description) : null,
      starts_at: String(body.starts_at ?? ""),
      ends_at: String(body.ends_at ?? ""),
      prize_pool_gd: Number(body.prize_pool_gd ?? 0),
      prizes: (Array.isArray(body.prizes) ? body.prizes : []).map((p: Prize) => ({
        rank: Number(p.rank),
        amount: Number(p.amount),
      })) as Prize[],
      min_picks: Number(body.min_picks ?? 1),
    };
    const problem = validateContest(input);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const { data, error } = await supabase
      .from("contests")
      .insert({
        ...input,
        title: input.title.trim(),
        starts_at: new Date(input.starts_at).toISOString(),
        ends_at: new Date(input.ends_at).toISOString(),
      })
      .select()
      .single();
    if (error) {
      console.error("create contest:", error);
      return NextResponse.json({ error: "Couldn't save the contest." }, { status: 500 });
    }
    return NextResponse.json({ contest: data });
  } catch (err) {
    console.error("create contest:", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

/** End a contest now, or mark it paid. Admin only. */
export async function PATCH(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const { id, action } = await req.json();
    if (typeof id !== "string" || (action !== "end" && action !== "paid")) {
      return NextResponse.json({ error: "id and a valid action are required." }, { status: 400 });
    }
    const patch =
      action === "end"
        ? { status: "ended", ends_at: new Date().toISOString() }
        : { status: "paid" };
    const { error } = await supabase.from("contests").update(patch).eq("id", id);
    if (error) {
      console.error("update contest:", error);
      return NextResponse.json({ error: "Couldn't update the contest." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
