import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 600);
    }, 3200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[100] overflow-hidden transition-opacity duration-600 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{
        background:
          "radial-gradient(ellipse 80% 55% at 50% 50%, rgba(7,149,95,0.13) 0%, transparent 65%), #080D18",
      }}
    >
      {/* Subtle chart grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Corner bracket decorations */}
      <div className="pointer-events-none absolute inset-7">
        <svg
          className="absolute left-0 top-0 h-9 w-9"
          viewBox="0 0 36 36"
          fill="none"
        >
          <path
            d="M2 18 L2 2 L18 2"
            stroke="#07955F"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.25"
          />
        </svg>
        <svg
          className="absolute right-0 top-0 h-9 w-9"
          viewBox="0 0 36 36"
          fill="none"
        >
          <path
            d="M34 18 L34 2 L18 2"
            stroke="#07955F"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.25"
          />
        </svg>
        <svg
          className="absolute bottom-0 left-0 h-9 w-9"
          viewBox="0 0 36 36"
          fill="none"
        >
          <path
            d="M2 18 L2 34 L18 34"
            stroke="#07955F"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.25"
          />
        </svg>
        <svg
          className="absolute bottom-0 right-0 h-9 w-9"
          viewBox="0 0 36 36"
          fill="none"
        >
          <path
            d="M34 18 L34 34 L18 34"
            stroke="#07955F"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.25"
          />
        </svg>
      </div>

      {/* Center glow */}
      <div
        className="animate-splash-glow pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(7,149,95,0.22) 0%, transparent 70%)",
        }}
      />

      {/* Main content */}
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="animate-splash-logo">
          <Logo size={96} />
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <h1
            className="animate-splash-text font-display text-[2.25rem] font-bold tracking-tight text-white"
            style={{ animationDelay: "0.38s" }}
          >
            RangeFrenzy
          </h1>
          <p
            className="animate-splash-text text-sm font-medium tracking-wide text-white/40"
            style={{ animationDelay: "0.55s" }}
          >
            Predict the range. Win the game.
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 h-px w-32 overflow-hidden rounded-full bg-white/10">
        <div className="animate-splash-progress h-full rounded-full bg-[#07955F]" />
      </div>

      {/* Version / powered-by hint */}
      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium tracking-widest text-white/20 uppercase">
        Powered by GoodDollar
      </p>
    </div>
  );
}
