import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // Brotli/gzip compression at the edge
  compress: true,

  // No source maps in production — smaller deploy, faster parse
  productionBrowserSourceMaps: false,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.worldcoin.org" },
      { protocol: "https", hostname: "*.world.org" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },

  // Tree-shake heavy packages — only import what's used
  experimental: {
    optimizePackageImports: [
      "@worldcoin/minikit-js",
      "lucide-react",
      "@supabase/supabase-js",
    ],
  },

  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    return [
      {
        // All pages — security headers + preconnect hints
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "X-Frame-Options",         value: "SAMEORIGIN" },
          { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",       value: "camera=(), microphone=(), geolocation=(), payment=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "connect-src 'self' https://developer.world.org https://developer.worldcoin.org https://usernames.worldcoin.org https://*.world.org https://*.worldcoin.org https://*.supabase.co",
              "img-src 'self' data: blob: https://*.worldcoin.org https://*.world.org",
              "frame-ancestors 'self' https://*.world.org https://*.worldcoin.org",
              "base-uri 'self'",
            ].join("; "),
          },
          // Preconnect to every external domain the app uses.
          // Opens TCP+TLS handshake before the browser even parses JS.
          { key: "Link", value: [
            "<https://developer.worldcoin.org>; rel=preconnect",
            "<https://developer.world.org>; rel=preconnect",
            "<https://usernames.worldcoin.org>; rel=preconnect; crossorigin",
          ].join(", ") },
        ],
      },
      // Next.js static chunks are content-hashed only in production builds —
      // Turbopack dev filenames are stable across rebuilds, so an immutable
      // cache header here makes browsers serve stale JS after every edit or
      // dev-server restart. Production-only, matching how the files are named.
      ...(isProd ? [{
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      }] : []),
      {
        // Public images — 24h cache, revalidate in background
        source: "/(.*\\.png|.*\\.jpg|.*\\.webp|.*\\.svg|.*\\.ico)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=3600" },
        ],
      },
      {
        // Manifest — short cache so updates propagate quickly
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
      {
        // API routes — never cache
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
