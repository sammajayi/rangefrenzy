import type { Metadata } from "next";
import { getMarketShareData } from "./market-share-data";
import { MarketRedirect } from "./MarketRedirect";

type Params = { market: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { market } = await params;
  const data = await getMarketShareData(market);

  if (!data) {
    return {
      title: "Prediction market · RangeFrenzy",
      description: "Predict outcome ranges. Stake G$. Win big.",
    };
  }

  const description = data.rangeLabels.length
    ? `Pick your range — ${data.rangeLabels.slice(0, 4).join(", ")} — and stake G$ on RangeFrenzy.`
    : "Predict the outcome range and stake G$ on RangeFrenzy.";
  const url = `/m/${market}`;

  return {
    title: data.question,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: data.question,
      description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: data.question,
      description,
    },
  };
}

export default async function MarketSharePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { market } = await params;
  const data = await getMarketShareData(market);

  const marketHref = data ? `/?market=${data.marketAddress}` : "/";

  // Humans are redirected straight into the app on this market (no interstitial
  // card). Crawlers don't run the redirect, so they still read the metadata above.
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center">
      <MarketRedirect href={marketHref} />
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </main>
  );
}
