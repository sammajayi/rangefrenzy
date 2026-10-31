"use client";

import {
  StarAward01Icon,
  Target01Icon,
  ChartIncreaseIcon,
  CoinsSwapIcon,
  GiftIcon,
  Fire03Icon,
  ShieldUserIcon,
  MapPinIcon,
  BitcoinCircleIcon,
  ArrowRight01Icon,
  GithubIcon,
  SendToMobileIcon,
  Menu01Icon,
  CancelCircleIcon,
} from "hugeicons-react";
import { useState, useEffect, useRef } from "react";
import { Logo } from "@/components/logo";

const APP_URL = "https://app.rangefrenzy.xyz";

/* Scroll-reveal hook */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({
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
      className={`transition-[opacity,transform] duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* Buttons and links */
function PrimaryLink({
  children,
  href = APP_URL,
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-astra-brand px-6 py-3.5 text-base font-semibold text-astra-on-brand transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.98] ${className}`}
    >
      {children}
    </a>
  );
}

function SectionHeading({
  title,
  intro,
}: {
  title: string;
  intro: string;
}) {
  return (
    <>
      <h2 className="font-display text-3xl font-bold tracking-tight text-balance text-astra-text sm:text-4xl md:text-5xl">
        {title}
      </h2>
      <p className="mt-4 max-w-md text-pretty text-astra-muted">{intro}</p>
    </>
  );
}

/* NAVBAR */
const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Markets", href: "#markets" },
  { label: "Why RangeFrenzy", href: "#features" },
];

function Navbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-astra-line bg-astra-bg/85 backdrop-blur-xl">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"
      >
        <a href="#top" className="flex items-center gap-2.5">
          <Logo size={32} />
          <span className="font-display text-lg font-bold tracking-tight text-astra-text">
            RangeFrenzy
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-astra-muted transition-colors hover:text-astra-text"
            >
              {l.label}
            </a>
          ))}
          <PrimaryLink className="!px-4 !py-2 !text-sm">Launch app</PrimaryLink>
        </div>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center text-astra-text md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {open ? (
            <CancelCircleIcon className="h-6 w-6" />
          ) : (
            <Menu01Icon className="h-6 w-6" />
          )}
        </button>
      </nav>

      {open && (
        <div
          id="mobile-menu"
          className="border-t border-astra-line bg-astra-bg px-6 py-6 md:hidden"
        >
          <div className="flex flex-col gap-5">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-base text-astra-muted transition-colors hover:text-astra-text"
              >
                {l.label}
              </a>
            ))}
            <PrimaryLink>Launch app</PrimaryLink>
          </div>
        </div>
      )}
    </header>
  );
}

/* HERO */
const ladder = [
  { label: "$1.5k–2k", share: 14 },
  { label: "$2k–2.5k", share: 31 },
  { label: "$2.5k–3k", share: 44, picked: true },
  { label: "$3k+", share: 11 },
];

const maxShare = Math.max(...ladder.map((r) => r.share));

function RangeLadder() {
  const { ref, visible } = useReveal(0.3);
  return (
    <div
      ref={ref}
      role="img"
      aria-label="Example market with four price ranges. The $2.5k to $3k range is selected and holds the largest share of the pool."
      className="w-full max-w-md rounded-2xl border border-astra-line bg-astra-surface p-6"
    >
      <p aria-hidden className="text-xs font-medium text-astra-subtle">
        Example market
      </p>
      <p
        aria-hidden
        className="mt-1 font-display text-lg font-semibold leading-snug text-astra-text"
      >
        What will the ETH price be on 31 December?
      </p>

      <ul aria-hidden className="mt-6 space-y-3">
        {ladder.map((r, i) => (
          <li key={r.label} className="flex items-center gap-3">
            <span
              className={`w-20 shrink-0 text-sm tabular-nums ${
                r.picked ? "font-semibold text-astra-text" : "text-astra-muted"
              }`}
            >
              {r.label}
            </span>
            <span className="relative h-7 flex-1 overflow-hidden rounded-md bg-astra-surface-raised">
              <span
                className={`absolute inset-y-0 left-0 origin-left rounded-md transition-transform duration-700 ease-out motion-reduce:transition-none ${
                  r.picked ? "bg-astra-brand" : "bg-white/15"
                } ${visible ? "scale-x-100" : "scale-x-0 motion-reduce:scale-x-100"}`}
                style={{
                  width: `${(r.share / maxShare) * 100}%`,
                  transitionDelay: `${200 + i * 120}ms`,
                }}
              />
            </span>
            <span
              className={`w-10 shrink-0 text-right text-sm tabular-nums ${
                r.picked ? "font-semibold text-astra-brand" : "text-astra-subtle"
              }`}
            >
              {r.share}%
            </span>
          </li>
        ))}
      </ul>

      <p
        aria-hidden
        className="mt-6 border-t border-astra-line pt-4 text-xs text-astra-subtle"
      >
        Your range wins a share of the pool if the price lands inside it.
        Illustration only.
      </p>
    </div>
  );
}

function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-dvh items-center overflow-hidden px-6 pb-20 pt-28"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_15%_0%,rgba(34,197,94,0.10),transparent_70%)]" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-tighter text-balance text-astra-text sm:text-6xl lg:text-7xl xl:text-8xl">
            Predict. Stake. Win.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg text-astra-muted md:text-xl">
            The range-based prediction market built for GoodDollar users across
            Africa. Stake G$ on crypto, sports and local events. Pick the right
            range and win a share of the pool.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <PrimaryLink>
              Launch app
              <ArrowRight01Icon className="h-5 w-5" />
            </PrimaryLink>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-astra-muted underline-offset-4 transition-colors hover:text-astra-text hover:underline"
            >
              See how it works
            </a>
          </div>

          <p className="mt-10 text-sm text-astra-subtle">
            Live on Celo mainnet · Powered by GoodDollar · Works in MiniPay
          </p>
        </div>

        <div className="lg:justify-self-end">
          <RangeLadder />
        </div>
      </div>
    </section>
  );
}

/* HOW IT WORKS */
const steps = [
  {
    num: "01",
    title: "Verify and claim",
    desc: "Verify with GoodDollar, then claim your free daily G$ inside the app.",
  },
  {
    num: "02",
    title: "Pick a range",
    desc: "Browse markets across crypto, sports and local African events. Pick a range and stake your G$.",
  },
  {
    num: "03",
    title: "Win a share of the pool",
    desc: "If the outcome lands in your range, you win a share of the prize pool. Earlier stakes cost less per share, so they can return more.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <Reveal>
          <SectionHeading
            title="How it works"
            intro="Verify once, claim your daily G$, then stake it on a range."
          />
        </Reveal>

        <ol>
          {steps.map((s, i) => (
            <li key={s.num}>
              <Reveal delay={i * 120}>
                <div className="grid grid-cols-[3.5rem_1fr] gap-4 border-t border-astra-line py-8 first:border-t-0 first:pt-0">
                  <span className="font-display text-2xl font-bold tabular-nums text-astra-brand">
                    {s.num}
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-bold text-astra-text">
                      {s.title}
                    </h3>
                    <p className="mt-2 max-w-lg text-pretty text-astra-muted">
                      {s.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
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

function ExampleMarkets() {
  return (
    <section
      id="markets"
      className="border-t border-astra-line px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeading
            title="Example markets"
            intro="Every market splits an outcome into ranges. Open the app to see what is live today."
          />
        </Reveal>

        <div className="mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3">
          {markets.map((m, i) => (
            <Reveal
              key={m.question}
              delay={i * 100}
              className="min-w-[280px] snap-start sm:min-w-0"
            >
              <div className="flex h-full flex-col rounded-xl bg-astra-surface p-6 transition-colors duration-200 hover:bg-astra-surface-raised">
                <span className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-astra-brand">
                  {m.categoryIcon}
                  {m.category}
                </span>

                <h3 className="mt-4 font-display text-lg font-semibold leading-snug text-astra-text">
                  {m.question}
                </h3>

                <div className="mt-5 flex flex-1 flex-wrap content-start gap-2">
                  {m.ranges.map((r) => (
                    <span
                      key={r}
                      className="rounded-md border border-astra-line px-2.5 py-1 text-xs tabular-nums text-astra-muted"
                    >
                      {r}
                    </span>
                  ))}
                </div>

                <p className="mt-6 text-xs text-astra-subtle">
                  Example only. Not a live market.
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-10">
          <a
            href={APP_URL}
            className="inline-flex items-center gap-2 text-sm font-semibold text-astra-brand underline-offset-4 hover:underline"
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
    icon: <Target01Icon className="h-6 w-6" />,
    title: "Stake on ranges",
    desc: "Pick a range and win a share of the pool if the outcome lands inside it.",
  },
  {
    icon: <ChartIncreaseIcon className="h-6 w-6" />,
    title: "Earlier stakes cost less",
    desc: "A range gets more expensive as more people stake on it, so early stakers get more shares for the same G$.",
  },
  {
    icon: <CoinsSwapIcon className="h-6 w-6" />,
    title: "Open positions",
    desc: "Changed your mind? Sell your position and switch to a different range before the market closes.",
  },
  {
    icon: <GiftIcon className="h-6 w-6" />,
    title: "Daily G$ rewards",
    desc: "Claim your free GoodDollar UBI daily and put it straight to work on live markets.",
  },
  {
    icon: <Fire03Icon className="h-6 w-6" />,
    title: "Streak and referral rewards",
    desc: "Build daily streaks and refer friends to earn bonus G$ on top of your winnings.",
  },
  {
    icon: <ShieldUserIcon className="h-6 w-6" />,
    title: "Verified humans only",
    desc: "GoodDollar verifies that each account belongs to a real person, so bots can't claim or stake.",
  },
];

function Features() {
  return (
    <section
      id="features"
      className="border-t border-astra-line px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeading
            title="Why RangeFrenzy"
            intro="Stake on a range of outcomes, not just yes or no."
          />
        </Reveal>

        <ul className="mt-14 grid gap-x-16 md:grid-cols-2">
          {features.map((f, i) => (
            <li key={f.title}>
              <Reveal delay={(i % 2) * 100}>
                <div className="flex gap-5 border-t border-astra-line py-8">
                  <span className="mt-0.5 shrink-0 text-astra-brand">{f.icon}</span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-astra-text">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-pretty text-astra-muted">{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* CTA */
function CTASection() {
  return (
    <section className="px-6 pb-24 md:pb-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="rounded-2xl border border-astra-brand/25 bg-astra-surface px-8 py-14 sm:px-14">
            <h2 className="max-w-xl font-display text-3xl font-bold tracking-tight text-balance text-astra-text sm:text-4xl md:text-5xl">
              Ready to put your G$ to work?
            </h2>
            <p className="mt-4 max-w-lg text-pretty text-astra-muted">
              Claim your daily G$, pick a range and stake it on a live market.
            </p>
            <div className="mt-8">
              <PrimaryLink>
                Launch app
                <ArrowRight01Icon className="h-5 w-5" />
              </PrimaryLink>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* FOOTER */
const footerLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Example markets", href: "#markets" },
  { label: "Why RangeFrenzy", href: "#features" },
  { label: "Launch app", href: APP_URL },
];

const socials = [
  {
    label: "X",
    href: "https://x.com/rangefrenzy",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
        <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
      </svg>
    ),
  },
  {
    label: "Telegram",
    href: "https://t.me/rangefrenzy",
    icon: <SendToMobileIcon className="h-4 w-4" />,
  },
  {
    label: "GitHub",
    href: "https://github.com/rangefrenzy",
    icon: <GithubIcon className="h-4 w-4" />,
  },
];

function Footer() {
  return (
    <footer className="border-t border-astra-line px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo size={28} />
              <span className="font-display text-lg font-bold tracking-tight text-astra-text">
                RangeFrenzy
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-astra-muted">
              The range-based prediction market built for GoodDollar users
              across Africa.
            </p>
            <p className="mt-2 text-xs text-astra-subtle">
              Powered by GoodDollar · Built on Celo
            </p>
          </div>

          <nav aria-label="Footer">
            <h2 className="mb-4 text-sm font-semibold text-astra-text">Explore</h2>
            <ul className="flex flex-col gap-3">
              {footerLinks.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm text-astra-muted transition-colors hover:text-astra-brand"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="mb-4 text-sm font-semibold text-astra-text">Community</h2>
            <div className="flex items-center gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-11 w-11 items-center justify-center rounded-lg bg-astra-surface text-astra-muted transition-colors hover:bg-astra-surface-raised hover:text-astra-brand"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-astra-line pt-6 text-xs text-astra-subtle">
          <p className="max-w-xl text-pretty">
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
    <div className="min-h-dvh bg-astra-bg font-body text-astra-text [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-astra-brand [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-astra-brand">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-astra-brand focus:px-4 focus:py-2 focus:text-astra-on-brand"
      >
        Skip to content
      </a>
      <Navbar />
      <div id="content">
        <Hero />
        <HowItWorks />
        <ExampleMarkets />
        <Features />
        <CTASection />
      </div>
      <Footer />
    </div>
  );
}
