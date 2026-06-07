import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  const BUCKET = "market-images";
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.find((b) => b.name === BUCKET);
    if (!exists) {
      await supabase.storage.createBucket(BUCKET, { public: true });
    } else if (!exists.public) {
      await supabase.storage.updateBucket(BUCKET, { public: true });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("ensure-bucket error:", err);
    return NextResponse.json({ error: "Failed to ensure bucket" }, { status: 500 });
  }
}
