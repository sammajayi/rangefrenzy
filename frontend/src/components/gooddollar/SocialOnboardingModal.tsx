"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

interface Props {
  onClose: () => void;
}

export function SocialOnboardingModal({ onClose }: Props) {
  const address = useAppStore((s) => s.address);
  const setHasSeenOnboarding = useAppStore((s) => s.setHasSeenOnboarding);
  const [twitterDone, setTwitterDone] = useState(false);
  const [telegramDone, setTelegramDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTwitter = async () => {
    window.open("https://twitter.com/rangefrenzy", "_blank");
    setTwitterDone(true);
    await fetch("/api/social-reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, platform: "twitter" }),
    });
  };

  const handleTelegram = async () => {
    window.open("https://t.me/+Vz9Ze9dNIww0OGY0", "_blank");
    setTelegramDone(true);
    await fetch("/api/social-reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, platform: "telegram" }),
    });
  };

  const handleFinish = async () => {
    setLoading(true);
    await supabase
      .from("profiles")
      .update({ has_seen_onboarding: true })
      .eq("wallet_address", address.toLowerCase());
    setHasSeenOnboarding(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl">
        <div className="text-center mb-6">
          <div className="mb-3 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <span className="font-display text-2xl font-black text-primary">🎉</span>
            </div>
          </div>
          <h2 className="font-display text-xl font-bold">Welcome to RangeFrenzy!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Stake G$ on outcome ranges for crypto, sports, weather and more.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Earn <span className="font-bold text-foreground">500 G$</span> for each action below.
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleTwitter}
            className="flex w-full items-center gap-4 rounded-2xl border border-border bg-background px-4 py-4 text-left transition hover:border-primary/40 hover:bg-muted/40"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Follow on X (Twitter)</p>
              <p className="text-xs text-muted-foreground">Earn 500 G$ reward</p>
            </div>
            {twitterDone && (
              <span className="text-xs font-bold text-green-600 bg-green-50 rounded-full px-2 py-0.5">Done</span>
            )}
          </button>

          <button
            type="button"
            onClick={handleTelegram}
            className="flex w-full items-center gap-4 rounded-2xl border border-border bg-background px-4 py-4 text-left transition hover:border-primary/40 hover:bg-muted/40"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Join Telegram</p>
              <p className="text-xs text-muted-foreground">Earn 500 G$ reward</p>
            </div>
            {telegramDone && (
              <span className="text-xs font-bold text-green-600 bg-green-50 rounded-full px-2 py-0.5">Done</span>
            )}
          </button>
        </div>

        <Button
          className="mt-6 w-full"
          onClick={handleFinish}
          disabled={loading}
        >
          {loading ? "Saving…" : "Continue to app"}
        </Button>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          You can skip this — rewards are distributed within 24 hours.
        </p>
      </div>
    </div>
  );
}
