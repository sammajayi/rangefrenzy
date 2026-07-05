"use client";

import { useMarketPriceHistory } from "@/lib/hooks/use-market-price-history";

const COLORS = ["#07955F", "#f59e0b", "#3b82f6", "#a855f7", "#ef4444", "#14b8a6"];

interface Props {
  marketAddress: string;
  ranges: { index: number; label: string }[];
}

export function MiniPriceChart({ marketAddress, ranges }: Props) {
  const { data: points, isLoading } = useMarketPriceHistory(marketAddress);

  if (isLoading) {
    return (
      <div className="flex h-24 items-center justify-center rounded-xl bg-muted/30">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
      </div>
    );
  }

  const series = ranges.map((r, i) => ({
    ...r,
    color: COLORS[i % COLORS.length],
    values: (points ?? [])
      .filter((p) => p.rangeIndex === r.index)
      .map((p) => parseFloat(p.pricePaid)),
  }));

  const totalPoints = series.reduce((sum, s) => sum + s.values.length, 0);
  if (totalPoints < 2) {
    return (
      <div className="flex h-24 items-center justify-center rounded-xl bg-muted/30 text-center text-xs text-muted-foreground px-4">
        Not enough activity yet to chart price movement.
      </div>
    );
  }

  const allValues = series.flatMap((s) => s.values);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const width = 300;
  const height = 80;
  const pad = 4;

  const toPoints = (values: number[]) => {
    if (values.length === 1) {
      const y = height - pad - ((values[0] - min) / range) * (height - pad * 2);
      return `${pad},${y} ${width - pad},${y}`;
    }
    return values
      .map((v, i) => {
        const x = pad + (i / (values.length - 1)) * (width - pad * 2);
        const y = height - pad - ((v - min) / range) * (height - pad * 2);
        return `${x},${y}`;
      })
      .join(" ");
  };

  return (
    <div className="rounded-xl bg-muted/30 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20" preserveAspectRatio="none">
        {series.map((s) =>
          s.values.length > 0 ? (
            <polyline
              key={s.index}
              points={toPoints(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null
        )}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {series.map((s) => (
          <span key={s.index} className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
