"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * What this device has already been shown. Kept apart from the auth store on purpose:
 * signing out must not make the guide or a celebration play again.
 */
interface ExperienceState {
  guideSeen: boolean;
  /** Keys of celebrations already played (a claim, a stake transaction). */
  celebrated: Record<string, true>;
  markGuideSeen: () => void;
  markCelebrated: (key: string) => void;
}

export const useExperience = create<ExperienceState>()(
  persist(
    (set) => ({
      guideSeen: false,
      celebrated: {},
      markGuideSeen: () => set({ guideSeen: true }),
      markCelebrated: (key) => set((s) => ({ celebrated: { ...s.celebrated, [key]: true } })),
    }),
    { name: "rangefrenzy-experience" }
  )
);
