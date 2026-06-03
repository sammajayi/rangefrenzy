"use client";

import { useState } from "react";
import { useConnect } from "wagmi";
import { Button } from "@/components/ui/button";

interface AuthPageProps {
  onAuthenticated: () => void;
}

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const { connect, connectors } = useConnect();

  const handleConnectWallet = () => {
    const connector = connectors.find((c) => c.id === "injected") || connectors[0];
    if (connector) {
      connect({ connector });
    }
    onAuthenticated();
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      onAuthenticated();
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#07955F] shadow-lg">
            <span className="text-3xl font-bold text-white">RF</span>
          </div>
          <h1 className="mb-2 font-display text-3xl font-bold tracking-tight">
            Welcome to RangeFrenzy
          </h1>
          <p className="mb-10 text-sm text-muted-foreground">
            Sign in to start predicting markets
          </p>
        </div>

        {!showEmail ? (
          <div className="space-y-3">
            <Button
              className="h-12 w-full text-base font-semibold"
              size="lg"
              onClick={handleConnectWallet}
            >
              <svg
                className="mr-2 h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" />
                <path d="M1 10h22" />
              </svg>
              Connect Wallet
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              className="h-12 w-full text-base font-semibold"
              size="lg"
              onClick={() => setShowEmail(true)}
            >
              <svg
                className="mr-2 h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 4L12 13 2 4" />
              </svg>
              Continue with Email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Email address
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none ring-2 ring-transparent focus:ring-primary/30"
                required
              />
            </div>
            <Button
              type="submit"
              className="h-12 w-full text-base font-semibold"
              size="lg"
              disabled={!email}
            >
              Continue
            </Button>
            <button
              type="button"
              onClick={() => setShowEmail(false)}
              className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Back to all options
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
