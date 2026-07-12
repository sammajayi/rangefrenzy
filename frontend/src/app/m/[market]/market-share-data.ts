import { supabase } from "@/lib/supabase";

export type MarketShareData = {
  question: string;
  category: string | null;
  rangeLabels: string[];
  imageUrl: string | null;
  deadlineLabel: string | null;
  marketAddress: string;
};

/**
 * Loads a market's heading, category, and range labels for a share card,
 * keyed by on-chain contract address. Returns null when the market isn't
 * mirrored to Supabase so callers can fall back gracefully.
 */
export async function getMarketShareData(
  market: string,
): Promise<MarketShareData | null> {
  const { data } = await supabase
    .from("markets")
    .select("title, category, ranges, image_url, window_label, contract_address")
    .eq("contract_address", market.toLowerCase())
    .maybeSingle();

  if (!data) return null;

  const ranges = (data.ranges ?? []) as Array<{ label?: string }>;

  return {
    question: data.title,
    category: (data.category as string | null) ?? null,
    rangeLabels: ranges.map((r, i) => r.label ?? `Range ${i + 1}`),
    imageUrl: (data.image_url as string | null) ?? null,
    deadlineLabel: (data.window_label as string | null) ?? null,
    marketAddress: (data.contract_address as string | null) ?? market.toLowerCase(),
  };
}
