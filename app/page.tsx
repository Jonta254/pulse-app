"use client";

/**
 * Page — shows splash immediately, loads VerdexApp as a separate JS chunk.
 *
 * Performance wins:
 * - Removed requestAnimationFrame delay (was adding 1 unnecessary frame)
 * - VerdexApp (+ VerdexView 1153 lines) loaded as a separate dynamic chunk
 *   so the critical path only needs the tiny splash screen CSS/HTML
 * - ssr:false because MiniKit only exists in the browser
 */
import dynamic from "next/dynamic";

const VerdexApp = dynamic(
  () => import("@/components/VerdexApp").then((m) => ({ default: m.VerdexApp })),
  {
    loading: () => (
      <div className="verdex-splash" aria-label="Loading VeRdex">
        <div className="verdex-splash-logo" aria-hidden="true">⚡</div>
        <strong>VeRdex</strong>
        <span>Human Prediction Network</span>
      </div>
    ),
    ssr: false,
  }
);

export default function Page() {
  return <VerdexApp />;
}
