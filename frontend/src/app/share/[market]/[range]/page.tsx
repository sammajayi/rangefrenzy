import type { Metadata } from "next";
import Link from "next/link";
import { getShareData } from "./share-data";

type Params = { market: string; range: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { market, range } = await params;
  const data = await getShareData(market, Number(range));

  if (!data) {
    return {
      title: "Prediction · RangeFrenzy",
      description: "Predict outcome ranges. Stake G$. Win big.",
    };
  }

  const title = `My prediction: ${data.rangeLabel}`;
  const description = `${data.question} — I'm predicting ${data.rangeLabel}. Think I'm wrong? Take the other side on RangeFrenzy.`;
  const url = `/share/${market}/${range}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${data.question}`,
      description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${data.question}`,
      description,
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { market, range } = await params;
  const data = await getShareData(market, Number(range));

  const marketHref = data ? `/?market=${data.marketAddress}` : "/";

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 py-16 text-center">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-sm">
        {data?.category && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            {data.category}
          </span>
        )}
        <h1 className="mt-4 font-display text-2xl font-bold leading-tight text-foreground">
          {data?.question ?? "Predict the range. Win big."}
        </h1>

        {data && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              The prediction
            </p>
            <div className="mt-2 inline-flex items-center rounded-2xl border-2 border-primary bg-primary/10 px-6 py-3 font-display text-2xl font-bold text-foreground">
              {data.rangeLabel}
            </div>
          </div>
        )}

        <Link
          href={marketHref}
          className="mt-8 flex w-full items-center justify-center rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-md transition hover:brightness-105 active:scale-[0.99]"
        >
          Take the other side →
        </Link>
        <p className="mt-3 text-xs text-muted-foreground">
          Range-based prediction markets on Celo · Stake G$
        </p>
      </div>
    </main>
  );
}
