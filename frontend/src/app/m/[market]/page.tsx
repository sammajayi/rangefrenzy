import type { Metadata } from "next";
import Link from "next/link";
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

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 py-16 text-center">
      <MarketRedirect href={marketHref} />
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-sm">
        {data?.category && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            {data.category}
          </span>
        )}
        <h1 className="mt-4 font-display text-2xl font-bold leading-tight text-foreground">
          {data?.question ?? "Predict the range. Win big."}
        </h1>

        {data?.rangeLabels.length ? (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pick your range
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {data.rangeLabels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center rounded-xl border-2 border-primary/50 bg-primary/10 px-4 py-2 font-display text-base font-bold text-foreground"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <Link
          href={marketHref}
          className="mt-8 flex w-full items-center justify-center rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-md transition hover:brightness-105 active:scale-[0.99]"
        >
          Place your bet →
        </Link>
        <p className="mt-3 text-xs text-muted-foreground">
          Range-based prediction markets on Celo · Stake G$
        </p>
      </div>
    </main>
  );
}
