import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { PredictionRange } from "@/lib/markets";

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const AVATAR_BUCKET = "avatars";
const MARKET_IMAGES_BUCKET = "market-images";

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
  // GoodDollar / onboarding fields (added via migration)
  is_whitelisted_gd: boolean;
  has_seen_onboarding: boolean;
  role: "user" | "admin";
};

export type Market = {
  id: string;
  title: string;
  asset?: string;
  category: string;
  window_label: string;
  volume_label: string;
  ranges: PredictionRange[];
  status: "active" | "resolved";
  winning_value: number | null;
  winning_outcome?: string | null;
  image_url: string | null;
  deadline: string;
  created_at: string;
  contract_address: string | null;
};

export type Stake = {
  id: string;
  wallet_address: string;
  market_id: string;
  range_index: number;
  range_label: string;
  amount_gd: string;
  tx_hash: string;
  status: "open" | "won" | "lost" | "refunded";
  payout_gd: string | null;
  created_at: string;
  market?: Pick<Market, "title" | "asset" | "category" | "deadline" | "status" | "winning_value">;
};

export async function ensureMarketImagesBucket() {
  const res = await fetch("/api/ensure-bucket", { method: "POST" });
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error ?? "Failed to ensure storage bucket");
  }
}

export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type BonusEarning = {
  id: string;
  wallet_address: string;
  source: BonusSource;
  amount_gd: number;
  status: "pending" | "claimed";
  metadata: Record<string, any> | null;
  created_at: string;
};

export type BonusSource =
  | "first_bet"
  | "streak_7"
  | "streak_30"
  | "referral_bonus"
  | "referral_reward"
  | "social_twitter"
  | "social_telegram";

export const BONUS_AMOUNTS: Record<BonusSource, number> = {
  first_bet: 10,
  streak_7: 25,
  streak_30: 100,
  referral_bonus: 15,
  referral_reward: 15,
  social_twitter: 5,
  social_telegram: 5,
};

export const BONUS_LABELS: Record<BonusSource, string> = {
  first_bet: "First Bet Bonus",
  streak_7: "7-Day Streak",
  streak_30: "30-Day Streak",
  referral_bonus: "Referral Bonus (You)",
  referral_reward: "Referral Reward (Friend)",
  social_twitter: "Follow on X / Twitter",
  social_telegram: "Join Telegram",
};

export type Referral = {
  id: string;
  referrer_wallet: string;
  referee_wallet: string;
  bonus_credited: boolean;
  created_at: string;
};

export async function sendNotification(
  username: string,
  title: string,
  body?: string,
) {
  const { error } = await supabase.from("notifications").insert({
    username: username.toLowerCase(),
    title,
    body: body ?? null,
  });
  if (error) console.error("sendNotification error:", error);
}