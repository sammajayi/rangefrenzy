"use client";

import { useEffect, useState } from "react";
import { CheckmarkCircle02Icon } from "hugeicons-react";
import { useExperience } from "@/lib/experience-store";

const PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const distance = 54 + (i % 3) * 14;
  return { x: Math.round(Math.cos(angle) * distance), y: Math.round(Math.sin(angle) * distance), delay: (i % 4) * 40 };
});

interface Props {
  title: string;
  body: string;
  /** Plays the burst once per key on this device; later renders are still. */
  celebrateKey: string;
}

/** A confirmed moment: a check that pops, a short burst, and what just happened. */
export function Celebration({ title, body, celebrateKey }: Props) {
  const played = useExperience((s) => !!s.celebrated[celebrateKey]);
  const markCelebrated = useExperience((s) => s.markCelebrated);
  // Capture the first render's answer: marking it played must not stop this burst mid-flight.
  const [animate] = useState(!played);

  useEffect(() => {
    markCelebrated(celebrateKey);
  }, [celebrateKey, markCelebrated]);

  return (
    <div role="status" className="flex items-center gap-4 rounded-2xl border border-brand/30 bg-brand/5 p-4">
      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
        {animate &&
          PARTICLES.map((p, i) => (
            <span
              key={i}
              aria-hidden
              className="animate-burst absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-brand"
              style={{ "--bx": `${p.x}px`, "--by": `${p.y}px`, animationDelay: `${p.delay}ms` } as React.CSSProperties}
            />
          ))}
        <CheckmarkCircle02Icon aria-hidden className={animate ? "animate-pop h-12 w-12 text-brand" : "h-12 w-12 text-brand"} />
      </div>
      <div className="min-w-0">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
