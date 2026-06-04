"use client";

import { useState, useRef, useEffect } from "react";
import { usePrivy, useLoginWithEmail, useConnectWallet, useWallets } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { supabase, uploadAvatar } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import { Mail01Icon, Wallet01Icon, Upload01Icon } from "hugeicons-react";

function privyErrorMessage(error: any): string {
  const code: string = error?.code ?? error?.privyErrorCode ?? "";
  switch (code) {
    case "invalid_credentials":
    case "invalid_code":
      return "Incorrect code. Please check your email and try again.";
    case "expired_code":
    case "code_expired":
      return "Your code has expired. Go back and request a new one.";
    case "too_many_requests":
      return "Too many attempts. Please wait a moment before trying again.";
    default: {
      const msg: string = error?.message ?? "";
      // Strip raw JSON if Privy passes it as the message
      try {
        const parsed = JSON.parse(msg);
        return parsed?.error ?? parsed?.message ?? "Something went wrong.";
      } catch {
        return msg || "Something went wrong. Please try again.";
      }
    }
  }
}

interface AuthPageProps {
  onAuthenticated: (address: string, profile: Profile | null) => void;
}

type Step = "choose" | "email_input" | "otp_input" | "profile_setup";

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [username, setUsername] = useState("");
  const [authError, setAuthError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { ready, authenticated, user: privyUser } = usePrivy();
  const { wallets } = useWallets();

  // If Privy already has a valid session (page refresh / returning user), skip the auth UI
  useEffect(() => {
    if (!ready || !authenticated || !privyUser) return;
    const embeddedWallet = (privyUser.linkedAccounts as any[]).find(
      (a: any) => a.type === "wallet" && a.walletClientType === "privy"
    );
    const addr = embeddedWallet?.address ?? wallets[0]?.address;
    if (addr) checkAndProceed(addr, (privyUser as any).email?.address ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  const checkAndProceed = async (addr: string, resolvedEmail: string | null = null) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("wallet_address", addr.toLowerCase())
      .single();

    if (data) {
      onAuthenticated(addr, data as Profile);
    } else {
      setPendingAddress(addr);
      setPendingEmail(resolvedEmail);
      setStep("profile_setup");
    }
  };

  const { sendCode, loginWithCode, state: emailState } = useLoginWithEmail({
    onComplete: async ({ user }) => {
      const embeddedWallet = user.linkedAccounts.find(
        (a) => a.type === "wallet" && (a as any).walletClientType === "privy"
      ) as any;
      const addr = embeddedWallet?.address ?? wallets[0]?.address;
      if (addr) await checkAndProceed(addr, email);
    },
    onError: (error: any) => {
      setAuthError(privyErrorMessage(error));
    },
  });

  const { connectWallet } = useConnectWallet({
    onSuccess: async (wallet: any) => {
      const addr = wallet?.address ?? wallet?.accounts?.[0]?.address;
      if (addr) await checkAndProceed(addr);
      setConnectLoading(false);
    },
    onError: (error: any) => {
      setAuthError(privyErrorMessage(error));
      setConnectLoading(false);
    },
  });

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || !email) return;
    setAuthError("");
    try {
      await sendCode({ email });
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      // Timeout/abort means the request reached Privy and the code was sent —
      // advance to OTP input so the user can still enter the code they received.
      const isTimeout = /timeout|abort|network/i.test(msg);
      if (!isTimeout) {
        setAuthError(privyErrorMessage(err));
        return;
      }
    }
    setStep("otp_input");
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || !otp) return;
    setAuthError("");
    try {
      await loginWithCode({ code: otp });
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      const isTimeout = /timeout|abort|network/i.test(msg);
      setAuthError(
        isTimeout
          ? "Connection is slow — you may still be signed in. Please wait a moment."
          : privyErrorMessage(err)
      );
    }
  };

  const handleConnectWallet = () => {
    if (!ready) return;
    setAuthError("");
    setConnectLoading(true);
    connectWallet();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAddress || !username.trim()) return;
    setUsernameError("");
    setProfileLoading(true);
    try {
      let avatarUrl: string | null = null;
      if (avatarFile) {
        avatarUrl = await uploadAvatar(pendingAddress, avatarFile);
      }

      const profile: Profile = {
        wallet_address: pendingAddress.toLowerCase(),
        username: username.trim().toLowerCase(),
        email: pendingEmail,
        avatar_url: avatarUrl,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").insert(profile);
      if (error) {
        if (error.code === "23505") {
          setUsernameError("That username is already taken. Try another.");
        } else {
          throw error;
        }
        return;
      }
      onAuthenticated(pendingAddress, profile);
    } catch (err) {
      console.error("Profile create error:", err);
      setUsernameError("Something went wrong. Please try again.");
    } finally {
      setProfileLoading(false);
    }
  };

  const isSendingCode = emailState.status === "sending-code";
  const isSubmittingCode = emailState.status === "submitting-code";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#07955F] shadow-lg">
            <span className="text-3xl font-bold text-white">RF</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {step === "profile_setup" ? "Set up your profile" : "Welcome to RangeFrenzy"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === "profile_setup"
              ? "Choose a username to get started"
              : "Sign in to start predicting markets"}
          </p>
        </div>

        {step === "choose" && (
          <div className="space-y-3">
            <Button
              className="h-12 w-full text-base font-semibold"
              size="lg"
              onClick={() => setStep("email_input")}
              disabled={!ready}
            >
              <Mail01Icon className="mr-2 h-5 w-5" />
              {ready ? "Continue with Email" : "Loading…"}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="h-12 w-full text-base font-semibold"
              size="lg"
              onClick={handleConnectWallet}
              disabled={!ready || connectLoading}
            >
              <Wallet01Icon className="mr-2 h-5 w-5" />
              {connectLoading ? "Connecting…" : "Connect Wallet"}
            </Button>
            {authError && (
              <p className="text-center text-xs text-destructive">{authError}</p>
            )}
            <p className="mt-2 text-center text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        )}

        {step === "email_input" && (
          <form onSubmit={handleSendOtp} className="space-y-4">
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
                autoFocus
                required
              />
            </div>
            {authError && <p className="text-xs text-destructive">{authError}</p>}
            <Button
              type="submit"
              className="h-12 w-full text-base font-semibold"
              size="lg"
              disabled={!ready || !email || isSendingCode}
            >
              {isSendingCode ? "Sending…" : "Send Code"}
            </Button>
            <button
              type="button"
              onClick={() => setStep("choose")}
              className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Back
            </button>
          </form>
        )}

        {step === "otp_input" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center space-y-1 mb-2">
              <p className="text-sm font-medium">Check your email</p>
              <p className="text-xs text-muted-foreground">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-foreground">{email}</span>.
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Verification code
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-12 w-full rounded-xl border border-input bg-background px-4 text-center text-xl tracking-widest outline-none ring-2 ring-transparent focus:ring-primary/30"
                autoFocus
                required
                maxLength={6}
              />
            </div>
            {authError && <p className="text-xs text-destructive">{authError}</p>}
            <Button
              type="submit"
              className="h-12 w-full text-base font-semibold"
              size="lg"
              disabled={!ready || otp.length < 6 || isSubmittingCode}
            >
              {isSubmittingCode ? "Verifying…" : "Verify"}
            </Button>
            <button
              type="button"
              onClick={() => { setStep("email_input"); setOtp(""); setAuthError(""); }}
              className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Use a different email
            </button>
          </form>
        )}

        {step === "profile_setup" && (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Username</label>
              <input
                type="text"
                placeholder="e.g. range_queen"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, "_").toLowerCase())}
                className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none ring-2 ring-transparent focus:ring-primary/30"
                autoFocus
                required
                minLength={3}
                maxLength={30}
              />
              {usernameError && <p className="mt-1 text-xs text-destructive">{usernameError}</p>}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Avatar <span className="text-xs">(optional)</span>
              </label>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted/30 hover:border-primary/50 transition"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <Upload01Icon className="h-6 w-6 text-muted-foreground" />
                )}
              </button>
            </div>
            <Button
              type="submit"
              className="h-12 w-full text-base font-semibold"
              size="lg"
              disabled={!username.trim() || profileLoading}
            >
              {profileLoading ? "Creating profile…" : "Create profile"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
