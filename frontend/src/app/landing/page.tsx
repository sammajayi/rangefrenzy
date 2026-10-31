import type { Metadata } from "next";
import LandingPage from "./landing-client";

export const metadata: Metadata = {
  title: { absolute: "RangeFrenzy: Predict. Stake. Win." },
  description:
    "The range-based prediction market built for GoodDollar users across Africa. Stake G$ on crypto, sports and local events. Pick the right range and win a share of the pool.",
  openGraph: {
    title: "RangeFrenzy: Predict. Stake. Win.",
    description:
      "The range-based prediction market built for GoodDollar users across Africa. Stake G$ on crypto, sports and local events. Pick the right range and win a share of the pool.",
    url: "https://app.rangefrenzy.xyz/landing",
    siteName: "RangeFrenzy",
  },
  twitter: {
    card: "summary_large_image",
    title: "RangeFrenzy: Predict. Stake. Win.",
    description:
      "The range-based prediction market built for GoodDollar users across Africa. Stake G$ on crypto, sports and local events. Pick the right range and win a share of the pool.",
  },
};

export default function Page() {
  return <LandingPage />;
}
