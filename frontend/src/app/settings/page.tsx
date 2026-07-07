"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useWallets, useLogout } from "@privy-io/react-auth";
import {
  ArrowLeft01Icon,
  Copy01Icon,
  Tick01Icon,
  Logout01Icon,
  CheckmarkCircle01Icon,
  UserCheck01Icon,
  Notification03Icon,
  PencilEdit01Icon,
} from "hugeicons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { VerificationGate } from "@/components/gooddollar/VerificationGate";
import { usePushNotifications } from "@/hooks/usePushNotifications";

function SettingsRow({
  icon,
  label,
  description,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { wallets } = useWallets();
  const { logout } = useLogout();
  const address = useAppStore((s) => s.address);
  const profile = useAppStore((s) => s.profile);
  const isVerifiedStore = useAppStore((s) => s.isVerified);
  const setProfile = useAppStore((s) => s.setProfile);
  const setPendingTab = useAppStore((s) => s.setPendingTab);
  const storeSignOut = useAppStore((s) => s.signOut);

  const [copied, setCopied] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);

  const {
    supported: pushSupported,
    permission: pushPermission,
    subscribed: pushSubscribed,
    loading: pushLoading,
    error: pushError,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushNotifications(address, profile?.username);

  // Wait for zustand's persisted state to rehydrate before deciding whether
  // the user is authenticated. `getServerSnapshot` never touches `.persist`,
  // so this is safe during prerendering (unlike a useState+useEffect gate).
  const hydrated = useSyncExternalStore(
    (onChange) => useAppStore.persist.onFinishHydration(onChange),
    () => useAppStore.persist.hasHydrated(),
    () => false
  );

  useEffect(() => {
    if (hydrated && !address) router.replace("/");
  }, [hydrated, address, router]);

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const displayAddress = embeddedWallet?.address ?? address;

  const goBack = () => {
    setPendingTab("profile");
    router.push("/");
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(displayAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
    storeSignOut();
    router.push("/");
  };

  const openUsernameEdit = () => {
    setNewUsername(profile?.username ?? "");
    setUsernameError("");
    setShowUsernameEdit(true);
  };

  const saveUsername = async () => {
    const trimmed = newUsername.trim().toLowerCase().replace(/\s+/g, "_");
    if (trimmed.length < 3 || trimmed.length > 30) {
      setUsernameError("Username must be 3–30 characters.");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      setUsernameError("Only letters, numbers, and underscores allowed.");
      return;
    }
    setUsernameSaving(true);
    setUsernameError("");
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: trimmed })
        .eq("wallet_address", address.toLowerCase());
      if (error) {
        if (error.code === "23505") setUsernameError("That username is already taken.");
        else setUsernameError("Failed to update username. Please try again.");
        return;
      }
      if (profile) setProfile({ ...profile, username: trimmed });
      setShowUsernameEdit(false);
    } finally {
      setUsernameSaving(false);
    }
  };

  if (!hydrated || !address) return null;

  const isVerified = isVerifiedStore || !!profile?.is_whitelisted_gd;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-lg items-center gap-2 px-4">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft01Icon className="h-4 w-4" />
            Back
          </button>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-sm font-semibold">Settings</span>
        </div>
      </header>

      <div className="container mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Wallet */}
        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Wallet
          </p>
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
            <code className="truncate text-sm font-mono">{displayAddress}</code>
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                copied ? "text-brand" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-label="Copy wallet address"
            >
              {copied ? <Tick01Icon className="h-4 w-4" /> : <Copy01Icon className="h-4 w-4" />}
            </button>
          </div>
        </section>

        {/* Account */}
        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Account
          </p>
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            <SettingsRow
              icon={<PencilEdit01Icon className="h-4 w-4" />}
              label="Username"
              description={profile?.username ? `@${profile.username}` : undefined}
              action={
                <Button type="button" variant="outline" size="sm" onClick={openUsernameEdit}>
                  Edit
                </Button>
              }
            />

            {pushSupported && pushPermission !== "denied" && (
              <SettingsRow
                icon={<Notification03Icon className="h-4 w-4" />}
                label="Push notifications"
                description={pushSubscribed ? "Enabled" : "Get notified on outcomes and rewards"}
                action={
                  <Button
                    type="button"
                    variant={pushSubscribed ? "outline" : "default"}
                    size="sm"
                    disabled={pushLoading}
                    onClick={() => (pushSubscribed ? unsubscribePush() : subscribePush())}
                  >
                    {pushLoading ? "…" : pushSubscribed ? "Disable" : "Enable"}
                  </Button>
                }
              />
            )}

            <SettingsRow
              icon={
                isVerified ? (
                  <CheckmarkCircle01Icon className="h-4 w-4 text-brand" />
                ) : (
                  <UserCheck01Icon className="h-4 w-4" />
                )
              }
              label="GoodDollar verification"
              description={isVerified ? "Verified" : "Verify to unlock daily G$ UBI claiming"}
              action={
                isVerified ? (
                  <span className="text-xs font-semibold text-brand">Verified</span>
                ) : (
                  <Button type="button" size="sm" onClick={() => setShowVerification(true)}>
                    Verify
                  </Button>
                )
              }
            />
          </div>
          {pushError && <p className="mt-2 px-1 text-[11px] text-destructive">{pushError}</p>}
        </section>

        {/* Sign out */}
        <section>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive transition hover:bg-destructive/10"
          >
            <Logout01Icon className="h-4 w-4" />
            Sign out
          </button>
        </section>
      </div>

      {/* GoodDollar verification overlay */}
      {showVerification && (
        <VerificationGate onVerified={() => setShowVerification(false)} />
      )}

      {/* Username edit modal */}
      {showUsernameEdit && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowUsernameEdit(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-card p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold mb-1">Change username</h3>
            <p className="text-sm text-muted-foreground mb-4">3–30 chars, letters, numbers, and underscores only.</p>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => { setNewUsername(e.target.value); setUsernameError(""); }}
              placeholder="new_username"
              maxLength={30}
              autoFocus
              className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/50"
            />
            {usernameError && <p className="mt-2 text-xs text-destructive">{usernameError}</p>}
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowUsernameEdit(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={saveUsername}
                disabled={usernameSaving}
              >
                {usernameSaving ? "Updating…" : "Update"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
