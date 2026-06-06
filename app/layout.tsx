import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const appId  = process.env.NEXT_PUBLIC_WORLD_APP_ID ?? "";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: "PULSE",
  title: "PULSE — Human Prediction Network",
  description:
    "The only prediction market where every forecaster is a verified World ID human. Zero bots. Bet WLD on YES/NO markets, challenge anyone 1v1 Clash, copy top forecasters. Pure signal.",
  keywords: [
    "prediction market",
    "World App",
    "World ID",
    "WLD",
    "crypto predictions",
    "sports betting",
    "verified humans",
    "mini app",
  ],
  authors: [{ name: "PULSE", url: appUrl }],
  creator: "PULSE",
  publisher: "PULSE",
  manifest: "/manifest.webmanifest",
  other: { "world-app-id": appId },
  openGraph: {
    type: "website",
    url: appUrl,
    siteName: "PULSE",
    title: "PULSE — Human Prediction Network",
    description:
      "Zero bots. Pure signal. Bet WLD on real-world events with verified humans. Crypto, Sports, World Events, Culture. Challenge anyone 1v1.",
    images: [
      {
        url: "/meta-tag.png",
        width: 1200,
        height: 630,
        alt: "PULSE — Human Prediction Network",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "PULSE — Human Prediction Network",
    description:
      "The prediction market for verified humans. Bet WLD. Challenge 1v1. Copy top forecasters. Zero bots — World ID only.",
    images: ["/meta-tag.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: appUrl,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#6366f1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo-512.png" sizes="any" />
        <link rel="apple-touch-icon" href="/logo-512.png" />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
