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
  description: "The only prediction market where every forecaster is a verified human. Bet WLD, challenge 1v1, copy top predictors.",
  manifest: "/manifest.webmanifest",
  other: { "world-app-id": appId },
  openGraph: {
    title: "PULSE — Human Prediction Network",
    description: "Real predictions. Real humans. Real WLD stakes.",
    images: ["/og-image.png"],
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
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
