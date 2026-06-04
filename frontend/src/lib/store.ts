"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Profile } from "@/lib/supabase";

export type Phase = "splash" | "auth" | "home";

interface AppState {
  phase: Phase;
  address: string;
  profile: Profile | null;
  setPhase: (phase: Phase) => void;
  setAddress: (address: string) => void;
  setProfile: (profile: Profile | null) => void;
  setAuthenticated: (address: string, profile: Profile | null) => void;
  signOut: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      phase: "splash",
      address: "",
      profile: null,

      setPhase: (phase) => set({ phase }),

      setAddress: (address) => set({ address }),

      setProfile: (profile) => set({ profile }),

      setAuthenticated: (address, profile) =>
        set({ phase: "home", address, profile }),

      signOut: () =>
        set({ phase: "auth", address: "", profile: null }),
    }),
    {
      name: "rangefrenzy-auth",
      partialize: (state) => ({
        address: state.address,
        profile: state.profile,
      }),
    }
  )
);
