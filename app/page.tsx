"use client";

/**
 * Page — shows splash immediately, loads PulseApp as a separate JS chunk.
 *
 * Performance wins:
 * - Removed requestAnimationFrame delay (was adding 1 unnecessary frame)
 * - PulseApp (+ PulseView 1153 lines) loaded as a separate dynamic chunk
 *   so the critical path only needs the tiny splash screen CSS/HTML
 * - ssr:false because MiniKit only exists in the browser
 */
import dynamic from "next/dynamic";

const PulseApp = dynamic(
  () => import("@/components/PulseApp").then((m) => ({ default: m.PulseApp })),
  {
    loading: () => (
      <div className="pulse-splash" aria-label="Loading PULSE">
        <div className="pulse-splash-logo" aria-hidden="true">⚡</div>
        <strong>PULSE</strong>
        <span>Human Prediction Network</span>
      </div>
    ),
    ssr: false,
  }
);

export default function Page() {
  return <PulseApp />;
}
