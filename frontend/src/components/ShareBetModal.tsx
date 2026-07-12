"use client";

import { useState } from "react";
import {
  Cancel01Icon,
  WhatsappIcon,
  NewTwitterIcon,
  TelegramIcon,
  Facebook01Icon,
  Link01Icon,
  Download04Icon,
  Share08Icon,
  CheckmarkCircle01Icon,
  Loading03Icon,
} from "hugeicons-react";
import { cn } from "@/lib/utils";

interface Props {
  marketAddress: string;
  rangeIndex: number;
  rangeLabel: string;
  question: string;
  onClose: () => void;
}

/**
 * Post-bet share modal. Pops up once a stake confirms: shows the generated
 * prediction image and one-tap share options (WhatsApp, X, Telegram, Facebook)
 * with a ready-made caption, plus copy-link, the native share sheet, and a
 * save-image button. The shared link's preview is the same per-bet OG image.
 */
export function ShareBetModal({ marketAddress, rangeIndex, rangeLabel, question, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${origin}/share/${marketAddress}/${rangeIndex}`;
  const imageSrc = `/share/${marketAddress}/${rangeIndex}/opengraph-image`;
  const caption = `I'm predicting ${rangeLabel} on "${question}" — think I'm wrong? Take the other side on RangeFrenzy.`;

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(caption);
  const encodedTextUrl = encodeURIComponent(`${caption}\n${shareUrl}`);

  const platforms = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: WhatsappIcon,
      color: "bg-[#25D366]",
      href: `https://wa.me/?text=${encodedTextUrl}`,
    },
    {
      key: "x",
      label: "X",
      icon: NewTwitterIcon,
      color: "bg-black",
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      key: "telegram",
      label: "Telegram",
      icon: TelegramIcon,
      color: "bg-[#229ED9]",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: Facebook01Icon,
      color: "bg-[#1877F2]",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    },
  ];

  const openShare = (href: string) => {
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${caption}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "My RangeFrenzy prediction", text: caption, url: shareUrl });
      } catch {
        /* dismissed */
      }
    } else {
      void handleCopy();
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(imageSrc);
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
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-xl max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-bold">Prediction locked in</p>
            <p className="text-xs text-muted-foreground">Challenge a friend to take the other side</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-muted-foreground transition hover:text-foreground"
            aria-label="Close"
          >
            <Cancel01Icon className="h-5 w-5" />
          </button>
        </div>

        {/* Generated image preview */}
        <div className="overflow-hidden rounded-2xl border border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt="Your prediction card"
            width={1200}
            height={630}
            className="aspect-[1200/630] w-full object-cover"
          />
        </div>

        {/* Share platforms */}
        <p className="mt-4 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Share to
        </p>
        <div className="grid grid-cols-4 gap-2">
          {platforms.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => openShare(p.href)}
                className="flex flex-col items-center gap-1.5"
              >
                <span className={cn("flex h-12 w-12 items-center justify-center rounded-full text-white transition active:scale-95", p.color)}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Secondary actions */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted active:scale-[0.99]"
          >
            {copied ? (
              <>
                <CheckmarkCircle01Icon className="h-4 w-4 text-brand" />
                Copied
              </>
            ) : (
              <>
                <Link01Icon className="h-4 w-4" />
                Copy link
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted active:scale-[0.99]",
              downloading && "opacity-60",
            )}
          >
            {downloading ? (
              <Loading03Icon className="h-4 w-4 animate-spin" />
            ) : (
              <Download04Icon className="h-4 w-4" />
            )}
            Save
          </button>
          <button
            type="button"
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted active:scale-[0.99]"
          >
            <Share08Icon className="h-4 w-4" />
            More
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition hover:brightness-105 active:scale-[0.99]"
        >
          Done
        </button>
      </div>
    </div>
  );
}
