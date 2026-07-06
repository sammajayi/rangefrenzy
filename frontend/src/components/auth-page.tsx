"use client";

import { useState, useRef, useEffect } from "react";
import { usePrivy, useLoginWithEmail, useConnectWallet, useWallets, useCreateWallet } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { supabase, uploadAvatar } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import { Mail01Icon, Wallet01Icon, Upload01Icon, ArrowLeft01Icon } from "hugeicons-react";
import { Logo } from "@/components/logo";

function privyErrorMessage(error: any): string {
  const code: string = error?.code ?? error?.privyErrorCode ?? "";
  const msg: string = error?.message ?? "";
  if (
    ["invalid_credentials", "invalid_code", "incorrect_code", "wrong_code"].includes(code) ||
    /invalid.*(code|otp)|incorrect.*(code|otp)/i.test(msg)
  ) {
    return "Incorrect code. Please check your email and try again.";
  }
  if (
    ["expired_code", "code_expired"].includes(code) ||
    /expired/i.test(msg)
  ) {
    return "Your code has expired. Please request a new one.";
  }
  if (code === "too_many_requests" || /too.many/i.test(msg)) {
    return "Too many attempts. Please wait a moment before trying again.";
  }
  try {
    const parsed = JSON.parse(msg);
    return parsed?.error ?? parsed?.message ?? "Something went wrong.";
  } catch {
    return msg || "Something went wrong. Please try again.";
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
  const [resendLoading, setResendLoading] = useState(false);
  const otpSubmitted = useRef(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const hasProceeded = useRef(false);

  const { ready, authenticated, user: privyUser } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const { connectWallet } = useConnectWallet({
    onSuccess: async (result: any) => {
      const wallet = result?.wallet ?? result;
      const addr = wallet?.address ?? wallet?.accounts?.[0]?.address;
      if (addr) {
        await checkAndProceed(addr);
      } else {
        setAuthError("Could not get wallet address. Please try again.");
        setConnectLoading(false);
      }
    },
    onError: (error: any) => {
      setAuthError(privyErrorMessage(error));
      setConnectLoading(false);
    },
  });
  const walletCreated = useRef(false);

  const authenticatedRef = useRef(authenticated);
  const privyUserRef = useRef(privyUser);
  const walletsRef = useRef(wallets);
  useEffect(() => { authenticatedRef.current = authenticated; }, [authenticated]);
  useEffect(() => { privyUserRef.current = privyUser; }, [privyUser]);
  useEffect(() => { walletsRef.current = wallets; }, [wallets]);

  const getEmbeddedAddr = (user: any): string | undefined =>
    (user?.linkedAccounts as any[] ?? []).find(
      (a: any) => a.type === "wallet" && a.walletClientType === "privy"
    )?.address;

  const ensureEmbeddedWallet = async (isEmailAuth: boolean): Promise<string | null> => {
    if (!isEmailAuth) {
      return walletsRef.current[0]?.address ?? null;
    }

    let addr = getEmbeddedAddr(privyUserRef.current) ?? walletsRef.current.find((w) => w.walletClientType === "privy")?.address;
    if (addr) return addr;

    if (!walletCreated.current) {
      walletCreated.current = true;
      try {
        const wallet = await createWallet() as any;
        if (wallet?.address) return wallet.address;
      } catch {
        // wallet creation might fail if already exists
      }
    }

    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 500));
      addr = getEmbeddedAddr(privyUserRef.current) ?? walletsRef.current.find((w) => w.walletClientType === "privy")?.address;
      if (addr) return addr;
    }

    return walletsRef.current[0]?.address ?? null;
  };

  const checkAndProceed = async (addr: string, resolvedEmail: string | null = null) => {
    if (hasProceeded.current) return;
    hasProceeded.current = true;
    try {
      let data: Profile | null = null;
      let foundByEmail = false;

      if (resolvedEmail) {
        const { data: emailData } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", resolvedEmail)
          .maybeSingle();
        if (emailData) {
          data = emailData as Profile;
          foundByEmail = true;
        }
      }

      if (!data) {
        const { data: addrData } = await supabase
          .from("profiles")
          .select("*")
          .eq("wallet_address", addr.toLowerCase())
          .maybeSingle();
        if (addrData) data = addrData as Profile;
      }

      if (data) {
        if (foundByEmail && data.wallet_address !== addr.toLowerCase()) {
          const { error: updateErr } = await supabase
            .from("profiles")
            .update({ wallet_address: addr.toLowerCase() })
            .eq("wallet_address", data.wallet_address);
          if (updateErr) {
            // RLS may block update — try upsert as fallback
            await supabase
              .from("profiles")
              .upsert({ ...data, wallet_address: addr.toLowerCase() }, { onConflict: "wallet_address" });
          }
        }
        onAuthenticated(addr, data);
      } else {
        setPendingAddress(addr);
        setPendingEmail(resolvedEmail);
        hasProceeded.current = false;
        setStep("profile_setup");
      }
    } catch {
      hasProceeded.current = false;
    }
  };

  useEffect(() => {
    if (!ready || !authenticated || !privyUser) return;
    if (step === "profile_setup" || hasProceeded.current) return;
    (async () => {
      const isEmail = !!(privyUser as any)?.email?.address;
      const addr = await ensureEmbeddedWallet(isEmail);
      if (addr) {
        checkAndProceed(addr, (privyUser as any)?.email?.address ?? null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, wallets]);

  useEffect(() => {
    if (!ready || !authenticated || !privyUser) return;
    if (step !== "choose" || hasProceeded.current) return;
    (async () => {
      const isEmail = !!(privyUser as any)?.email?.address;
      const addr = await ensureEmbeddedWallet(isEmail);
      if (addr) {
        checkAndProceed(addr, (privyUser as any)?.email?.address ?? null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, wallets]);

  const { sendCode, loginWithCode, state: emailState } = useLoginWithEmail({
    onComplete: async ({ user }) => {
      otpSubmitted.current = true;
      const resolvedEmail = (user as any).email?.address ?? email;
      const addr = await ensureEmbeddedWallet(true);
      if (addr) checkAndProceed(addr, resolvedEmail);
    },
    onError: (error: any) => {
      if (!otpSubmitted.current) setAuthError(privyErrorMessage(error));
    },
  });

  useEffect(() => {
    if (!ready || !authenticated || !privyUser) return;
    if (step === "profile_setup" || hasProceeded.current) return;
    (async () => {
      const isEmail = !!(privyUser as any)?.email?.address;
      const addr = await ensureEmbeddedWallet(isEmail);
      if (addr) {
        checkAndProceed(addr, (privyUser as any)?.email?.address ?? null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, wallets]);

  const handleSendOtp = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!ready || !email) return;
    setAuthError("");
    try {
      await sendCode({ email });
      setStep("otp_input");
    } catch (err: any) {
      // Never silently retry — a second sendCode call invalidates the first code,
      // causing "invalid_credentials" when the user enters the code from the first email.
      setAuthError(privyErrorMessage(err) || "Failed to send code. Please try again.");
    }
  };

  const handleVerifyOtp = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (!ready || otp.length < 6 || isSubmittingCode) return;

    if (authenticatedRef.current) {
      hasProceeded.current = false;
      const addr = await ensureEmbeddedWallet(true);
      if (addr) {
        checkAndProceed(addr, (privyUserRef.current as any)?.email?.address ?? null);
      }
      return;
    }

    otpSubmitted.current = false;
    setAuthError("");
    try {
      await loginWithCode({ code: otp });
    } catch (err: any) {
      if (!otpSubmitted.current) {
        setAuthError(privyErrorMessage(err));
      }
    }
  };

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    if (otp.length === 6 && step === "otp_input" && !isSubmittingCode) {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleResendCode = async () => {
    if (!email || resendLoading) return;
    setResendLoading(true);
    setAuthError("");
    setOtp("");
    try {
      await sendCode({ email });
    } catch {
      // ignore network errors
    } finally {
      setResendLoading(false);
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

  const handleProfileSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!pendingAddress || !username.trim()) return;
    setUsernameError("");
    setProfileLoading(true);
    try {
      let avatarUrl: string | null = null;
      if (avatarFile) avatarUrl = await uploadAvatar(pendingAddress, avatarFile);

      const profile: Profile = {
        wallet_address: pendingAddress.toLowerCase(),
        username: username.trim().toLowerCase(),
        email: pendingEmail,
        avatar_url: avatarUrl,
        created_at: new Date().toISOString(),
        is_whitelisted_gd: false,
        has_seen_onboarding: false,
        role: "user",
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
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">

        {/* Logo + heading */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 w-fit">
            <Logo size={68} />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {step === "profile_setup" ? "Set up your profile" : "Welcome to RangeFrenzy"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === "profile_setup"
              ? "Choose a username to get started"
              : "Stake G$ on outcome ranges for crypto, sports, weather & more"}
          </p>
        </div>

        {/* ── CHOOSE ── */}
        {step === "choose" && (
          <div className="space-y-3">
            <Button
              className="h-12 w-full rounded-xl bg-brand text-base font-semibold text-white hover:bg-brand-dark"
              size="lg"
              onClick={() => setStep("email_input")}
            >
              <Mail01Icon className="mr-2 h-5 w-5" />
              Continue with Email
            </Button>

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground tracking-wider">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="h-12 w-full rounded-xl text-base font-semibold"
              size="lg"
              onClick={handleConnectWallet}
              disabled={connectLoading}
            >
              {connectLoading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-foreground" />
                  Connecting…
                </>
              ) : (
                <>
                  <Wallet01Icon className="mr-2 h-5 w-5" />
                  Connect Wallet
                </>
              )}
            </Button>


            {authError && (
              <p className="rounded-lg bg-destructive/8 px-3 py-2 text-center text-xs text-destructive">
                {authError}
              </p>
            )}

            <p className="pt-1 text-center text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        )}

        {/* ── EMAIL INPUT ── */}
        {step === "email_input" && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Email address
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-xl border border-input bg-muted/40 pl-4 pr-20 text-base outline-none ring-2 ring-transparent transition focus:ring-brand/25"
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  disabled={!email || isSendingCode}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-brand transition disabled:opacity-40 hover:opacity-70"
                >
                  {isSendingCode ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand/40 border-t-brand inline-block" />
                  ) : "Submit"}
                </button>
              </div>
            </div>
            {authError && (
              <p className="rounded-lg bg-destructive/8 px-3 py-2 text-xs text-destructive">
                {authError}
              </p>
            )}
            <button
              type="button"
              onClick={() => setStep("choose")}
              className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft01Icon className="h-3.5 w-3.5" />
              Back
            </button>
          </form>
        )}

        {/* ── OTP INPUT ── */}
        {step === "otp_input" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">
                We sent a code to{" "}
                <span className="font-semibold text-foreground">{email}</span>
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Verification code
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-14 w-full rounded-xl border border-input bg-muted/40 px-4 text-center text-2xl font-bold tracking-[0.35em] outline-none ring-2 ring-transparent transition focus:ring-brand/25"
                autoFocus
                required
                maxLength={6}
              />
            </div>
            {authError && (
              <p className="rounded-lg bg-destructive/8 px-3 py-2 text-xs text-destructive">
                {authError}
              </p>
            )}
            {isSubmittingCode && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
                Verifying…
              </div>
            )}
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendLoading || isSendingCode}
              className="flex w-full items-center justify-center gap-1.5 text-sm text-brand transition hover:opacity-70 disabled:opacity-40"
            >
              {resendLoading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand/40 border-t-brand" />
              ) : null}
              Resend code
            </button>
            <button
              type="button"
              onClick={() => { setStep("email_input"); setOtp(""); setAuthError(""); }}
              className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft01Icon className="h-3.5 w-3.5" />
              Use a different email
            </button>
          </form>
        )}

        {/* ── PROFILE SETUP ── */}
        {step === "profile_setup" && (
          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Username</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-muted-foreground">@</span>
                <input
                  type="text"
                  placeholder="range_queen"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s/g, "_").toLowerCase())}
                  className="h-12 w-full rounded-xl border border-input bg-muted/40 pl-8 pr-4 text-base outline-none ring-2 ring-transparent transition focus:ring-brand/25"
                  autoFocus
                  required
                  minLength={3}
                  maxLength={30}
                />
              </div>
              {usernameError && (
                <p className="mt-1.5 rounded-lg bg-destructive/8 px-3 py-2 text-xs text-destructive">
                  {usernameError}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Avatar <span className="text-muted-foreground">(optional)</span>
              </label>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted/30 transition hover:border-brand/50"
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
              className="h-12 w-full rounded-xl bg-brand text-base font-semibold text-white hover:bg-brand-dark"
              size="lg"
              disabled={!username.trim() || profileLoading}
            >
              {profileLoading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Creating profile…
                </>
              ) : "Create profile"}
            </Button>
          </form>
        )}

      </div>
    </div>
  );
}
