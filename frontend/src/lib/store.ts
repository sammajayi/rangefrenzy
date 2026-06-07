"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Profile } from "@/lib/supabase";

export type Phase = "splash" | "auth" | "verify" | "home";
export type Tab = "play" | "board" | "earn" | "profile";

interface AppState {
  phase: Phase;
  address: string;
  profile: Profile | null;
  isVerified: boolean;
  hasSkippedVerification: boolean;
  hasSeenOnboarding: boolean;
  claimBadgeActive: boolean;
  role: "user" | "admin";
  pendingTab: Tab | null;

  setPhase: (phase: Phase) => void;
  setAddress: (address: string) => void;
  setProfile: (profile: Profile | null) => void;
  setAuthenticated: (address: string, profile: Profile | null) => void;
  setVerified: (verified: boolean) => void;
  setHasSkippedVerification: (skipped: boolean) => void;
  setHasSeenOnboarding: (seen: boolean) => void;
  setClaimBadge: (active: boolean) => void;
  setRole: (role: "user" | "admin") => void;
  setPendingTab: (tab: Tab | null) => void;
  signOut: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      phase: "splash",
      address: "",
      profile: null,
      isVerified: false,
      hasSkippedVerification: false,
      hasSeenOnboarding: false,
      claimBadgeActive: false,
      role: "user",
      pendingTab: null,

      setPhase: (phase) => set({ phase }),
      setAddress: (address) => set({ address }),
      setProfile: (profile) => set({ profile }),
      setAuthenticated: (address, profile) =>
        set({ phase: "home", address, profile }),
      setVerified: (isVerified) => set({ isVerified }),
      setHasSkippedVerification: (hasSkippedVerification) => set({ hasSkippedVerification }),
      setHasSeenOnboarding: (hasSeenOnboarding) => set({ hasSeenOnboarding }),
      setClaimBadge: (claimBadgeActive) => set({ claimBadgeActive }),
      setRole: (role) => set({ role }),
      setPendingTab: (pendingTab) => set({ pendingTab }),

      signOut: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("rangefrenzy-auth");
        }
        set({
          phase: "auth",
          address: "",
          profile: null,
          isVerified: false,
          hasSkippedVerification: false,
          hasSeenOnboarding: false,
          claimBadgeActive: false,
          role: "user",
          pendingTab: null,
        });
      },
    }),
    {
      name: "rangefrenzy-auth",
      partialize: (state) => ({
        address: state.address,
        profile: state.profile,
        hasSkippedVerification: state.hasSkippedVerification,
        hasSeenOnboarding: state.hasSeenOnboarding,
        role: state.role,
      }),
    }
  )
);
