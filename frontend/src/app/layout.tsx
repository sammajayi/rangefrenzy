import type { Metadata, Viewport } from "next";
import { Archivo, DM_Sans } from "next/font/google";
import "./globals.css";

import { WalletProvider } from "@/components/wallet-provider";
import RegisterSW from "@/components/register-sw";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://app.rangefrenzy.xyz"),
  title: {
    default: "RangeFrenzy: range-based prediction markets on Celo",
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
    title: "RangeFrenzy: predict outcome ranges. Stake G$. Win.",
    description:
      "Stake G$ on outcome ranges for crypto, sports, and local events. A range-based prediction market on Celo.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "RangeFrenzy: predict outcome ranges. Stake G$. Win.",
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${archivo.variable} ${dmSans.variable}`}>
      <head>
        <meta name="talentapp:project_verification" content="97b86451041e1f4ce8c5f94b1c2820be64ac2e14715561dbdd2a8cde1ac7150fdb31461c2599f0f13d27a786bf4750a0573d2ccc6b39a0babab81933c66254" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-background font-sans text-foreground antialiased">
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
