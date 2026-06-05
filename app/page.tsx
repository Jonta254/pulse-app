"use client";

import { useEffect, useState } from "react";
import { PulseApp } from "@/components/PulseApp";

export default function Page() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const f = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(f);
  }, []);
  if (!ready) return (
    <div className="pulse-splash">
      <div className="pulse-splash-logo">⚡</div>
      <strong>PULSE</strong>
      <span>Human Prediction Network</span>
    </div>
  );
  return <PulseApp />;
}
