import type { Metadata } from "next";
import LandingPage from "./landing-client";

export const metadata: Metadata = {
  title: "RangeFrenzy - Predict. Stake. Win.",
  description:
    "The range-based prediction market built for GoodDollar users across Africa. Stake G$ on crypto, sports, and local events, and win big.",
  openGraph: {
    title: "RangeFrenzy - Predict. Stake. Win.",
    description:
      "The range-based prediction market built for GoodDollar users across Africa. Stake G$ on crypto, sports, and local events, and win big.",
    url: "https://app.rangefrenzy.xyz/landing",
    siteName: "RangeFrenzy",
  },
  twitter: {
    card: "summary_large_image",
    title: "RangeFrenzy - Predict. Stake. Win.",
    description:
      "The range-based prediction market built for GoodDollar users across Africa. Stake G$ on crypto, sports, and local events, and win big.",
  },
};

export default function Page() {
  return <LandingPage />;
}
