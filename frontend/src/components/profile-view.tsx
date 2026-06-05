import { useState, useRef } from "react";
import { Copy01Icon, Logout01Icon, Setting07Icon, Upload01Icon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase, uploadAvatar } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { MyBets } from "@/components/MyBets";

interface Props {
  address: string;
  profile: Profile | null;
  onSignOut: () => void;
}

export function ProfileView({ address, profile, onSignOut }: Props) {
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const setProfile = useAppStore((s) => s.setProfile);

  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  const initials = (profile?.username ?? "PK").slice(0, 2).toUpperCase();
  const displayName = profile?.username
    ? profile.username.charAt(0).toUpperCase() + profile.username.slice(1)
    : "Player";
  const handle = profile?.username ? `@${profile.username}` : "@player";

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(address, file);
      if (profile) {
        await supabase.from("profiles").update({ avatar_url: url }).eq("wallet_address", address.toLowerCase());
        setProfile({ ...profile, avatar_url: url });
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
    } finally {
      setAvatarUploading(false);
    }
  };

  const copy = () => {
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = [
    { label: "Total P&L", value: "$0.00" },
    { label: "Open positions", value: "0" },
    { label: "Closed", value: "0" },
    { label: "Win rate", value: "—" },
  ];

  return (
    <div className="min-h-[calc(100dvh-8rem)] rounded-t-3xl bg-white pb-8 pt-1 text-foreground shadow-sm ring-1 ring-border relative">
      <div className="px-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="group relative"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
                    {initials}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <Upload01Icon className="h-5 w-5 text-white" />
                </div>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              {avatarUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </div>
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight">{displayName}</h2>
              <p className="text-sm text-muted-foreground">{handle}</p>
              <button
                type="button"
                onClick={copy}
                className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                {short}
                <Copy01Icon className="h-3 w-3" />
                {copied && <span className="text-primary">Copied</span>}
              </button>
            </div>
          </div>

          {/* Settings button */}
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full border-border"
              onClick={() => setShowSettings((v) => !v)}
              aria-label="Profile settings"
            >
              <Setting07Icon className="h-4 w-4" />
            </Button>

            {showSettings && (
              <>
                <div className="fixed inset-0 z-[80]" onClick={() => setShowSettings(false)} />
                <div className="absolute right-0 top-11 z-[90] min-w-[160px] rounded-2xl border border-border bg-card p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => { setShowSettings(false); avatarInputRef.current?.click(); }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-accent transition"
                  >
                    <Upload01Icon className="h-4 w-4" />
                    Change avatar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowSettings(false); onSignOut(); }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition"
                  >
                    <Logout01Icon className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-muted/30 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="mt-1 font-display text-base font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Wallet balances */}
        <section className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Wallet balances</h3>
          <div className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card">
            <BalanceRow label="CELO" sub="Native" value="0.00" />
            <BalanceRow label="G$" sub="Celo Dollar" value="0.00" />
          </div>
        </section>

        {/* My Bets */}
        <section className="mt-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">My Bets</h3>
          <MyBets address={address} />
        </section>
      </div>
    </div>
  );
}

function BalanceRow({ label, sub, value }: { label: string; sub: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </div>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}
