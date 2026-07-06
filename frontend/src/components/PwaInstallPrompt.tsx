"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "pwa-install-dismissed";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as any).standalone === true)
  );
}

function isIos() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function PwaInstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const ios = isIos();

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler as any);

    // Show after a short delay so the page loads first
    const timer = setTimeout(() => setShow(true), 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler as any);
      clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setShow(false);
        return;
      }
    }
    dismiss();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={dismiss} />
      <div className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl mx-4 mb-0 sm:mb-0">
        <div className="flex items-center gap-3 mb-4">
          <img src="/icons/icon-192.svg" alt="RangeFrenzy" className="h-12 w-12 rounded-2xl shadow-sm" />
          <div>
            <p className="font-display text-lg font-bold leading-tight">Install RangeFrenzy</p>
            <p className="text-xs text-muted-foreground">Stake. Predict. Win G$.</p>
          </div>
        </div>

        {ios ? (
          <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground mb-5">
            Tap <span className="font-semibold text-foreground">Share</span> in your browser, then{" "}
            <span className="font-semibold text-foreground">Add to Home Screen</span> to install the app.
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-5">
            Add RangeFrenzy to your home screen for a faster, full-screen experience — no app store needed.
          </p>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={dismiss}>
            Not now
          </Button>
          {!ios && (
            <Button
              type="button"
              className="flex-1 bg-[#07955F] hover:bg-[#068050] text-white"
              onClick={install}
            >
              Install
            </Button>
          )}
          {ios && (
            <Button type="button" className="flex-1 bg-[#07955F] hover:bg-[#068050] text-white" onClick={dismiss}>
              Got it
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
