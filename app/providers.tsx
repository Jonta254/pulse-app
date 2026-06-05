"use client";

import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider";
import { getWorldAppId } from "@/lib/worldConfig";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MiniKitProvider props={{ appId: getWorldAppId() }}>
      {children}
    </MiniKitProvider>
  );
}
