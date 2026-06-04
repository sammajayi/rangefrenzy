import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const AVATAR_BUCKET = "avatars";

export async function ensureAvatarBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find((b) => b.name === AVATAR_BUCKET)) {
    await supabase.storage.createBucket(AVATAR_BUCKET, {
      public: true,
    });
  }
}

export async function uploadAvatar(
  walletAddress: string,
  file: File
): Promise<string> {
  await ensureAvatarBucket();
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${walletAddress.toLowerCase()}/avatar.${ext}`;
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: publicUrl } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(path);
  return publicUrl.publicUrl;
}

export type Profile = {
  wallet_address: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type PredictionRange = {
  id: string;
  label: string;
  minPct: number;
  maxPct: number | null;
};

export type Market = {
  id: string;
  title: string;
  asset: string;
  category: string;
  window_label: string;
  volume_label: string;
  ranges: PredictionRange[];
  status: "active" | "resolved";
  winning_value: number | null;
  image_url: string | null;
  deadline: string;
  created_at: string;
};