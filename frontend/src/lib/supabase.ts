import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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