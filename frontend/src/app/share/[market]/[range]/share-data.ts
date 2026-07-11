import { supabase } from "@/lib/supabase";

export type ShareData = {
  question: string;
  rangeLabel: string;
  category: string | null;
  imageUrl: string | null;
  marketAddress: string;
};

/**
 * Loads the market heading + the label of the predicted range for a share card.
 * Keyed by (contract address, range index) so it works the moment a bet lands,
 * without waiting on the per-user stake row to be written. Returns null when the
 * market isn't found so callers can render a graceful fallback / 404.
 */
export async function getShareData(
  market: string,
  rangeIdx: number,
): Promise<ShareData | null> {
  const { data } = await supabase
    .from("markets")
    .select("title, category, ranges, image_url, contract_address")
    .eq("contract_address", market.toLowerCase())
    .maybeSingle();

  if (!data) return null;

  const ranges = (data.ranges ?? []) as Array<{ label?: string }>;
  const rangeLabel = ranges[rangeIdx]?.label ?? `Range ${rangeIdx + 1}`;

  return {
    question: data.title,
    rangeLabel,
    category: (data.category as string | null) ?? null,
    imageUrl: (data.image_url as string | null) ?? null,
    marketAddress: (data.contract_address as string | null) ?? market.toLowerCase(),
  };
}
