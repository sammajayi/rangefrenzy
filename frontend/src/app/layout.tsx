import type { Metadata, Viewport } from "next";
import "./globals.css";

import { WalletProvider } from "@/components/wallet-provider";
import RegisterSW from "@/components/register-sw";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.rangefrenzy.xyz"),
  title: {
    default: "RangeFrenzy — Range-based prediction markets on Celo",
    template: "%s · RangeFrenzy",
  },
  description:
    "A range-based prediction market on Celo. Stake G$ on outcome ranges for crypto, sports, and local events.",
  applicationName: "RangeFrenzy",
  keywords: [
    "prediction market",
    "range prediction",
    "Celo",
    "GoodDollar",
    "G$",
    "crypto betting",
    "onchain",
  ],
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RangeFrenzy",
  },
  openGraph: {
    type: "website",
    siteName: "RangeFrenzy",
    url: "https://app.rangefrenzy.xyz",
    title: "RangeFrenzy — Predict outcome ranges. Stake G$. Win big.",
    description:
      "Stake G$ on outcome ranges for crypto, sports, and local events. A range-based prediction market on Celo.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "RangeFrenzy — Predict outcome ranges. Stake G$. Win big.",
    description:
      "Stake G$ on outcome ranges for crypto, sports, and local events. A range-based prediction market on Celo.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#07955F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="talentapp:project_verification" content="97b86451041e1f4ce8c5f94b1c2820be64ac2e14715561dbdd2a8cde1ac7150fdb31461c2599f0f13d27a786bf4750a0573d2ccc6b39a0babab81933c66254" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <div className="relative flex min-h-screen flex-col">
          <WalletProvider>
            <main className="flex-1">{children}</main>
          </WalletProvider>
        </div>
        <RegisterSW />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
