"use client";

import { useState } from "react";
import {
  Share01Icon,
  Download04Icon,
  CheckmarkCircle01Icon,
  Loading03Icon,
} from "hugeicons-react";
import { cn } from "@/lib/utils";

interface Props {
  marketAddress: string;
  rangeIndex: number;
  rangeLabel: string;
  question: string;
}

/**
 * Post-bet share card. Encourages users to challenge friends with their
 * prediction. Uses the native share sheet on mobile (with a link whose preview
 * is the per-bet OG image), falls back to copying the link on desktop, and lets
 * users download the generated card image to post manually.
 */
export function ShareBetCard({ marketAddress, rangeIndex, rangeLabel, question }: Props) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/${marketAddress}/${rangeIndex}`
      : "";
  const shareText = `I'm predicting ${rangeLabel} on "${question}" 🎯 Think I'm wrong? Take the other side on RangeFrenzy.`;

  const handleShare = async () => {
    // Native share sheet (mobile / supported browsers).
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "My RangeFrenzy prediction", text: shareText, url: shareUrl });
        return;
      } catch {
        // user dismissed or share failed — fall through to copy
      }
    }
    // Desktop fallback: copy link.
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/share/${marketAddress}/${rangeIndex}/opengraph-image`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rangefrenzy-prediction-${rangeIndex}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="text-center text-sm font-semibold text-foreground">
        Challenge your friends 🎯
      </p>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        Share your prediction — see if they dare to take the other side.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:brightness-105 active:scale-[0.99]"
        >
          {copied ? (
            <>
              <CheckmarkCircle01Icon className="h-4 w-4" />
              Link copied
            </>
          ) : (
            <>
              <Share01Icon className="h-4 w-4" />
              Share
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted active:scale-[0.99]",
            downloading && "opacity-60",
          )}
          aria-label="Download prediction image"
        >
          {downloading ? (
            <Loading03Icon className="h-4 w-4 animate-spin" />
          ) : (
            <Download04Icon className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
