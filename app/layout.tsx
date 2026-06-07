import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const appId  = process.env.NEXT_PUBLIC_WORLD_APP_ID ?? "";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: "VeRdex",
  title: "VeRdex — Human Prediction Network",
  description:
    "The only prediction market where every forecaster is a verified World ID human. Zero bots. Bet WLD on YES/NO markets, challenge anyone 1v1 Clash, copy top forecasters. Pure signal.",
  keywords: [
    "prediction market", "World App", "World ID", "WLD",
    "crypto predictions", "sports betting", "verified humans", "mini app",
  ],
  authors: [{ name: "VeRdex", url: appUrl }],
  creator: "VeRdex",
  publisher: "VeRdex",
  manifest: "/manifest.webmanifest",
  other: { "world-app-id": appId },
  openGraph: {
    type: "website",
    url: appUrl,
    siteName: "VeRdex",
    title: "VeRdex — Human Prediction Network",
    description: "Zero bots. Pure signal. Bet WLD on real-world events with verified humans. Crypto, Sports, World Events, Culture. Challenge anyone 1v1.",
    images: [{ url: "/meta-tag.png", width: 1200, height: 630, alt: "VeRdex — Human Prediction Network" }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "VeRdex — Human Prediction Network",
    description: "The prediction market for verified humans. Bet WLD. Challenge 1v1. Copy top forecasters. Zero bots — World ID only.",
    images: ["/meta-tag.png"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  alternates: { canonical: appUrl },
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
        {/* Favicon */}
        <link rel="icon" href="/logo-512.png" sizes="any" />
        <link rel="apple-touch-icon" href="/logo-512.png" />

        {/*
          Preconnect to every external domain the app fetches from.
          Browser opens TCP + TLS handshake before JS even executes —
          shaves ~200-400ms off first API call inside World App WebView.
        */}
        <link rel="preconnect" href="https://developer.worldcoin.org" />
        <link rel="preconnect" href="https://developer.world.org" />
        <link rel="preconnect" href="https://usernames.worldcoin.org" crossOrigin="anonymous" />
        {/* Supabase URL prefix — replace with your actual project ref if different */}
        <link rel="dns-prefetch" href="https://supabase.co" />

        {/*
          Critical splash-screen CSS inlined — ensures the ⚡ splash
          appears INSTANTLY on first paint, before any JS loads.
          Without this, users see a blank white flash.
        */}
        <style dangerouslySetInnerHTML={{ __html: `
          *,*::before,*::after{box-sizing:border-box}
          html,body{margin:0;background:#07091a;color:#e8eaf6;
            font-family:system-ui,-apple-system,sans-serif;
            overscroll-behavior:none;overflow-x:hidden}
          .verdex-splash{
            position:fixed;inset:0;
            display:flex;flex-direction:column;
            align-items:center;justify-content:center;gap:12px;
            background:radial-gradient(ellipse at 50% 40%,#1a1440 0%,#07091a 70%);
            z-index:9999}
          .verdex-splash-logo{
            font-size:3.5rem;line-height:1;
            animation:verdex-bounce 1.4s ease-in-out infinite}
          .verdex-splash strong{
            font-size:2rem;font-weight:900;letter-spacing:0.08em;
            background:linear-gradient(135deg,#ffd700,#6366f1,#00e887);
            -webkit-background-clip:text;-webkit-text-fill-color:transparent;
            background-clip:text}
          .verdex-splash span{
            font-size:0.82rem;font-weight:600;letter-spacing:0.2em;
            text-transform:uppercase;color:rgba(232,234,246,0.5)}
          @keyframes verdex-bounce{
            0%,100%{transform:translateY(0) scale(1)}
            50%{transform:translateY(-8px) scale(1.08)}}
        ` }} />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
