import { Logo } from "@/components/logo";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Logo size={56} />
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">RangeFrenzy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A range-based prediction market on Celo. Stake G$ on outcome ranges
          for crypto, sports, and local events.
        </p>
      </div>
      <a
        href="https://app.rangefrenzy.xyz"
        className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        Launch app
      </a>
    </div>
  );
}
