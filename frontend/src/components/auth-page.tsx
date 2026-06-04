"use client";

import { useState, useRef } from "react";
import { useWeb3AuthConnect } from "@web3auth/modal/react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { supabase, uploadAvatar } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import { Mail01Icon, Wallet01Icon, Upload01Icon } from "hugeicons-react";

interface AuthPageProps {
  onAuthenticated: (address: string, profile: Profile | null) => void;
}

type Step = "choose" | "email_input" | "email_loading" | "profile_setup";

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [authError, setAuthError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { connectTo, connect, loading: connectLoading, error: connectError } = useWeb3AuthConnect();
  // address is populated by wagmi after a successful Web3Auth connection
  const { address: wagmiAddress } = useAccount();

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

  // Resolve wallet address from a connection object's ethereumProvider
  const getAddrFromConnection = async (connection: any): Promise<string | null> => {
    try {
      const provider = connection?.ethereumProvider;
      if (!provider) return wagmiAddress ?? null;
      const accounts: string[] = await provider.request({ method: "eth_accounts" });
      return accounts[0] ?? wagmiAddress ?? null;
    } catch {
      return wagmiAddress ?? null;
    }
  };

  // Open Web3Auth modal for external wallet connection
  const handleConnectWallet = async () => {
    setAuthError("");
    try {
      const connection = await connect();
      const addr = await getAddrFromConnection(connection);
      if (addr) await checkAndProceed(addr);
    } catch (err: any) {
      setAuthError(err?.message ?? "Wallet connection failed. Please try again.");
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setAuthError("");
    setStep("email_loading");
    try {
      if (wagmiAddress) {
        await checkAndProceed(wagmiAddress, email);
        return;
      }
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Login timed out. Please try again.")), 300_000)
      );
      const connection = await Promise.race([
        connectTo("auth", {
          authConnection: "email_passwordless",
          extraLoginOptions: { login_hint: email },
        } as any),
        timeout,
      ]);
      if (!connection) throw new Error("No connection returned");
      const addr = await getAddrFromConnection(connection);
      if (!addr) throw new Error("Could not get wallet address");
      await checkAndProceed(addr, email);
    } catch (err: any) {
      console.error("Web3Auth login error:", err);
      if (wagmiAddress && err?.message?.toLowerCase().includes("already connected")) {
        await checkAndProceed(wagmiAddress, email);
        return;
      }
      const msg = typeof err === "string" ? err : err?.message ?? "Login failed. Please try again.";
      setAuthError(msg);
      setStep("email_input");
    }
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
            >
              <Mail01Icon className="mr-2 h-5 w-5" />
              Continue with Email
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
              disabled={connectLoading}
            >
              <Wallet01Icon className="mr-2 h-5 w-5" />
              {connectLoading ? "Connecting…" : "Connect Wallet"}
            </Button>
            {(authError || connectError) && (
              <p className="text-center text-xs text-destructive">
                {authError || connectError?.message}
              </p>
            )}
            <p className="mt-2 text-center text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        )}

        {step === "email_input" && (
          <form onSubmit={handleEmailLogin} className="space-y-4">
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
            <Button type="submit" className="h-12 w-full text-base font-semibold" size="lg" disabled={!email}>
              Send OTP
            </Button>
            <button type="button" onClick={() => setStep("choose")} className="block w-full text-center text-sm text-muted-foreground hover:text-foreground">
              Back
            </button>
          </form>
        )}

        {step === "email_loading" && (
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Check your email</p>
              <p className="text-xs text-muted-foreground">
                We sent a magic link to <span className="font-medium text-foreground">{email}</span>.
              </p>
              <p className="text-xs text-muted-foreground">
                Click the link in the email — the popup will close automatically once you're signed in.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setStep("email_input"); setAuthError(""); }}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Use a different email
            </button>
            {authError && <p className="text-xs text-destructive">{authError}</p>}
          </div>
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
