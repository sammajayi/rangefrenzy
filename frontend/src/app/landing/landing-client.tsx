"use client";

import {
  StarAward01Icon,
  Coins01Icon,
  GlobeIcon,
  Target01Icon,
  ChartIncreaseIcon,
  CoinsSwapIcon,
  GiftIcon,
  Fire03Icon,
  ShieldUserIcon,
  MapPinIcon,
  CheckmarkBadge04Icon,
  SmartPhone01Icon,
  BitcoinCircleIcon,
  ArrowRight01Icon,
  GithubIcon,
  SendToMobileIcon,
  Menu01Icon,
  CancelCircleIcon,
} from "hugeicons-react";
import { useState, useEffect, useRef } from "react";

/* Scroll-reveal hook */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function RevealSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* tiny helpers */
function GlowBtn({
  children,
  className = "",
  href = "#",
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#22C55E] px-8 py-4 text-base font-semibold text-white shadow-[0_0_24px_rgba(34,197,94,0.35)] transition-all duration-300 hover:shadow-[0_0_32px_rgba(34,197,94,0.5)] hover:scale-105 ${className}`}
    >
      {children}
    </a>
  );
}

function StatPill({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur-sm">
      {icon}
      {label}
    </span>
  );
}

function SectionDivider() {
  return (
    <div className="mx-auto h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
  );
}

/* NAVBAR */
function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0A0A0F]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#" className="flex items-center gap-2.5">
          <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="10" fill="#12102A" />
            <rect x="13" y="17" width="22" height="14" rx="2.5" fill="#22C55E" opacity="0.15" />
            <line x1="14" y1="16" x2="14" y2="32" stroke="#22C55E" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="14" y1="16" x2="18" y2="16" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
            <line x1="14" y1="32" x2="18" y2="32" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
            <line x1="34" y1="16" x2="34" y2="32" stroke="#22C55E" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="34" y1="16" x2="30" y2="16" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
            <line x1="34" y1="32" x2="30" y2="32" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
            <polyline points="15,31 19,27.5 24,24 29,21.5 33,20" stroke="#22C55E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
            <circle cx="24" cy="24" r="4" fill="#22C55E" />
            <circle cx="24" cy="24" r="1.8" fill="white" opacity="0.92" />
          </svg>
          <span className="text-lg font-bold text-white">RangeFrenzy</span>
        </a>

        {/* desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          <a href="#how-it-works" className="text-sm text-white/60 transition hover:text-white">How it works</a>
          <a href="#markets" className="text-sm text-white/60 transition hover:text-white">Markets</a>
          <a href="#features" className="text-sm text-white/60 transition hover:text-white">Features</a>
          <GlowBtn href="https://app.rangefrenzy.xyz" className="!px-5 !py-2.5 !text-sm">
            Launch app
          </GlowBtn>
        </div>

        {/* mobile toggle */}
        <button
          type="button"
          className="text-white md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {open ? <CancelCircleIcon className="h-6 w-6" /> : <Menu01Icon className="h-6 w-6" />}
        </button>
      </div>

      {/* mobile menu */}
      {open && (
        <div id="mobile-menu" className="border-t border-white/5 bg-[#0A0A0F]/95 px-6 py-6 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-4">
            <a href="#how-it-works" onClick={() => setOpen(false)} className="text-sm text-white/60 transition hover:text-white">How it works</a>
            <a href="#markets" onClick={() => setOpen(false)} className="text-sm text-white/60 transition hover:text-white">Markets</a>
            <a href="#features" onClick={() => setOpen(false)} className="text-sm text-white/60 transition hover:text-white">Features</a>
            <GlowBtn href="https://app.rangefrenzy.xyz" className="!text-sm">
              Launch app
            </GlowBtn>
          </div>
        </div>
      )}
    </nav>
  );
}

/* HERO */
function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-20">
      {/* Background image overlay */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1920&q=80')",
        }}
      />
      {/* gradient overlays */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#0A0A0F]/80 to-[#0A0A0F]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.08)_0%,transparent_70%)]" />

      {/* Animated floating orbs */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-72 w-72 animate-float-slow rounded-full bg-[#22C55E]/5 blur-[120px]" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/3 h-64 w-64 animate-float-medium rounded-full bg-[#7C3AED]/8 blur-[100px]" />
      <div className="pointer-events-none absolute top-1/3 right-1/3 h-48 w-48 animate-float-fast rounded-full bg-[#22C55E]/4 blur-[80px]" />

      {/* Floating stat pills — top */}
      <div className="relative z-10 mb-8 flex flex-wrap items-center justify-center gap-3">
        <StatPill icon={<StarAward01Icon className="h-4 w-4 text-[#22C55E]" />} label="500+ Predictions Made" />
        <StatPill icon={<Coins01Icon className="h-4 w-4 text-[#22C55E]" />} label="G$ Distributed" />
        <StatPill icon={<GlobeIcon className="h-4 w-4 text-[#22C55E]" />} label="Built for Africa" />
      </div>

      {/* Headline */}
      <h1 className="relative z-10 text-center font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
        Predict. Stake. Win.
      </h1>

      {/* Subheadline */}
      <p className="relative z-10 mt-6 max-w-2xl text-center text-base text-white/60 sm:text-lg md:text-xl">
        The range-based prediction market built for GoodDollar users across
        Africa. Stake G$ on crypto, sports and local events. Pick the right
        range and win a share of the pool.
      </p>

      {/* CTA */}
      <div className="relative z-10 mt-10">
        <GlowBtn href="https://app.rangefrenzy.xyz">
          Launch app
          <ArrowRight01Icon className="h-5 w-5" />
        </GlowBtn>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce">
        <ArrowRight01Icon className="h-6 w-6 rotate-90 text-white/30" />
      </div>
    </section>
  );
}

/* HOW IT WORKS */
const steps = [
  {
    num: "1",
    title: "Verify & Claim",
    desc: "Verify your identity with GoodDollar and claim your free daily G$ UBI directly inside the app.",
    img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80",
  },
  {
    num: "2",
    title: "Pick Your Range",
    desc: "Browse active markets across crypto, sports, and local African events. Pick a range and stake your G$.",
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80",
  },
  {
    num: "3",
    title: "Win & Earn",
    desc: "If the outcome lands in your range, you win a share of the prize pool. Earlier stakes cost less per share, so they can return more.",
    img: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&q=80",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <RevealSection>
          <h2 className="text-center font-display text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-white/50">
            Verify once, claim your daily G$, then stake it on a range.
          </p>
        </RevealSection>

        <div className="relative mt-16 grid gap-8 md:grid-cols-3">
          {/* Connector line (desktop) */}
          <div className="pointer-events-none absolute top-16 left-[20%] right-[20%] hidden h-px bg-gradient-to-r from-[#22C55E]/40 via-[#22C55E]/20 to-[#22C55E]/40 md:block" />

          {steps.map((s, i) => (
            <RevealSection key={s.num} delay={i * 150}>
              <div
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#12102A] transition-all duration-300 hover:border-[#22C55E]/30 hover:shadow-[0_0_24px_rgba(34,197,94,0.12)]"
              >
                {/* image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={s.img}
                    alt={s.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12102A] via-[#12102A]/60 to-transparent" />
                  {/* number badge */}
                  <span className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#22C55E] text-sm font-bold text-white shadow-[0_0_16px_rgba(34,197,94,0.4)]">
                    {s.num}
                  </span>
                </div>

                {/* content */}
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-xl font-bold text-white">{s.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-white/50">
                    {s.desc}
                  </p>
                </div>
              </div>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* EXAMPLE MARKETS */
const markets = [
  {
    category: "Sports",
    categoryIcon: <StarAward01Icon className="h-3.5 w-3.5" />,
    question: "How many goals will the winning team score in the final?",
    ranges: ["0–1", "2–3", "4–5", "6+"],
  },
  {
    category: "Crypto",
    categoryIcon: <BitcoinCircleIcon className="h-3.5 w-3.5" />,
    question: "What will the ETH price be on 31 December?",
    ranges: ["$1.5k–2k", "$2k–2.5k", "$2.5k–3k", "$3k+"],
  },
  {
    category: "Local",
    categoryIcon: <MapPinIcon className="h-3.5 w-3.5" />,
    question: "How many people will attend the Lagos Tech Meetup?",
    ranges: ["0–500", "500–1k", "1k–2k", "2k+"],
  },
];

function LiveMarkets() {
  return (
    <section id="markets" className="relative py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <RevealSection>
          <h2 className="text-center font-display text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Example markets
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-white/50">
            Every market splits an outcome into ranges. Open the app to see
            what is live today.
          </p>
        </RevealSection>

        <div className="mt-14 flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3">
          {markets.map((m, i) => (
            <RevealSection key={m.question} delay={i * 120}>
              <div className="group flex h-full min-w-[280px] snap-start flex-col rounded-2xl border border-white/5 bg-[#12102A] p-6 transition-colors duration-300 hover:border-[#22C55E]/30 sm:min-w-0">
                <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                  {m.categoryIcon}
                  {m.category}
                </span>

                <h3 className="text-base font-bold leading-snug text-white">
                  {m.question}
                </h3>

                <div className="mt-4 flex flex-1 flex-wrap content-start gap-2">
                  {m.ranges.map((r) => (
                    <span
                      key={r}
                      className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60"
                    >
                      {r}
                    </span>
                  ))}
                </div>

                <p className="mt-5 border-t border-white/5 pt-4 text-xs text-white/40">
                  Example only. Not a live market.
                </p>
              </div>
            </RevealSection>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <a
            href="https://app.rangefrenzy.xyz"
            className="inline-flex items-center gap-2 rounded-full border border-[#22C55E]/30 px-6 py-3 text-sm font-semibold text-[#22C55E] transition-colors duration-300 hover:bg-[#22C55E]/10"
          >
            See live markets
            <ArrowRight01Icon className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* FEATURES */
const features = [
  {
    icon: <Target01Icon className="h-7 w-7" />,
    title: "Range Betting",
    desc: "Not just yes or no. Pick a range and win a share of the pool if the outcome lands inside it.",
  },
  {
    icon: <ChartIncreaseIcon className="h-7 w-7" />,
    title: "Earlier stakes cost less",
    desc: "A range gets more expensive as more people stake on it, so early stakers get more shares for the same G$.",
  },
  {
    icon: <CoinsSwapIcon className="h-7 w-7" />,
    title: "Open Positions",
    desc: "Changed your mind? Sell your position and switch to a different range before the market closes.",
  },
  {
    icon: <GiftIcon className="h-7 w-7" />,
    title: "Daily G$ Rewards",
    desc: "Claim your free GoodDollar UBI daily and put it straight to work on live markets.",
  },
  {
    icon: <Fire03Icon className="h-7 w-7" />,
    title: "Streak & Referral Rewards",
    desc: "Build daily streaks and refer friends to earn bonus G$ on top of your winnings.",
  },
  {
    icon: <ShieldUserIcon className="h-7 w-7" />,
    title: "Verified Humans Only",
    desc: "GoodDollar verifies that each account belongs to a real person, so bots can't claim or stake.",
  },
];

function Features() {
  return (
    <section id="features" className="relative py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <RevealSection>
          <h2 className="text-center font-display text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Why RangeFrenzy
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-white/50">
            Stake on a range of outcomes, not just yes or no.
          </p>
        </RevealSection>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <RevealSection key={f.title} delay={i * 100}>
              <div
                className="group rounded-2xl border border-white/5 bg-[#12102A] p-6 transition-all duration-300 hover:border-[#22C55E]/30 hover:shadow-[0_0_24px_rgba(34,197,94,0.12)]"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#22C55E]/10 text-[#22C55E] transition-colors duration-300 group-hover:bg-[#22C55E]/20">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">
                  {f.desc}
                </p>
              </div>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* CTA */
function CTASection() {
  return (
    <section className="relative py-24 px-6">
      <div className="mx-auto max-w-4xl">
        <RevealSection>
          <div className="animate-gradient-border relative overflow-hidden rounded-3xl bg-[#12102A] px-8 py-16 text-center sm:px-16">
            {/* glow behind */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[500px] -translate-x-1/2 rounded-full bg-[#22C55E]/10 blur-[100px]" />

            <h2 className="relative z-10 font-display text-3xl font-bold text-white sm:text-4xl md:text-5xl">
              Ready to put your G$ to work?
            </h2>
          <p className="relative z-10 mx-auto mt-4 max-w-lg text-white/50">
            Claim your daily G$, pick a range and stake it on a live market.
          </p>

          <div className="relative z-10 mt-8">
            <GlowBtn href="https://app.rangefrenzy.xyz">
              Launch app
              <ArrowRight01Icon className="h-5 w-5" />
            </GlowBtn>
          </div>

          {/* trust badges */}
          <div className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <CheckmarkBadge04Icon className="h-4 w-4 text-[#22C55E]" />
              Live on Celo Mainnet
            </span>
            <span className="flex items-center gap-1.5">
              <Coins01Icon className="h-4 w-4 text-[#22C55E]" />
              Powered by GoodDollar
            </span>
            <span className="flex items-center gap-1.5">
              <SmartPhone01Icon className="h-4 w-4 text-[#22C55E]" />
              MiniPay Compatible
            </span>
          </div>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}

/* FOOTER */
function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#0A0A0F] px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 md:grid-cols-3">
          {/* brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="10" fill="#12102A" />
                <rect x="13" y="17" width="22" height="14" rx="2.5" fill="#22C55E" opacity="0.15" />
                <line x1="14" y1="16" x2="14" y2="32" stroke="#22C55E" strokeWidth="2.4" strokeLinecap="round" />
                <line x1="14" y1="16" x2="18" y2="16" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
                <line x1="14" y1="32" x2="18" y2="32" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
                <line x1="34" y1="16" x2="34" y2="32" stroke="#22C55E" strokeWidth="2.4" strokeLinecap="round" />
                <line x1="34" y1="16" x2="30" y2="16" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
                <line x1="34" y1="32" x2="30" y2="32" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
                <circle cx="24" cy="24" r="4" fill="#22C55E" />
                <circle cx="24" cy="24" r="1.8" fill="white" opacity="0.92" />
              </svg>
              <span className="text-lg font-bold text-white">RangeFrenzy</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-white/40">
              The range-based prediction market built for GoodDollar users across
              Africa.
            </p>
            <p className="mt-2 text-xs text-white/30">
              Powered by GoodDollar · Built on Celo
            </p>
          </div>

          {/* links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Explore</h4>
            <ul className="flex flex-col gap-3">
              {[
                { label: "How it works", href: "#how-it-works" },
                { label: "Example markets", href: "#markets" },
                { label: "Why RangeFrenzy", href: "#features" },
                { label: "Launch app", href: "https://app.rangefrenzy.xyz" },
              ].map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm text-white/40 transition hover:text-[#22C55E]"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* social */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Community</h4>
            <div className="flex items-center gap-4">
              <a
                href="https://x.com/rangefrenzy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/40 transition hover:bg-[#22C55E]/10 hover:text-[#22C55E]"
                aria-label="X (Twitter)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
                  <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
                </svg>
              </a>
              <a
                href="https://t.me/rangefrenzy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/40 transition hover:bg-[#22C55E]/10 hover:text-[#22C55E]"
                aria-label="Telegram"
              >
                <SendToMobileIcon className="h-4 w-4" />
              </a>
              <a
                href="https://github.com/rangefrenzy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/40 transition hover:bg-[#22C55E]/10 hover:text-[#22C55E]"
                aria-label="GitHub"
              >
                <GithubIcon className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* bottom bar */}
        <div className="mt-12 border-t border-white/5 pt-6 text-center text-xs text-white/40">
          <p className="mx-auto max-w-xl text-pretty">
            Staking carries risk. You can lose the G$ you stake, so only stake
            what you can afford to lose.
          </p>
          <p className="mt-3">&copy; {new Date().getFullYear()} RangeFrenzy</p>
        </div>
      </div>
    </footer>
  );
}

/* PAGE */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] font-body text-white">
      <Navbar />
      <Hero />
      <SectionDivider />
      <HowItWorks />
      <SectionDivider />
      <LiveMarkets />
      <SectionDivider />
      <Features />
      <SectionDivider />
      <CTASection />
      <Footer />
    </div>
  );
}
