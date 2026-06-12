import { NextRequest } from "next/server";
import { isRateLimited, isWalletAddress, noStoreJson, rateLimitResponse, readJsonBody } from "@/lib/serverApi";
import { getWorldAppId, getWorldDevPortalApiKey } from "@/lib/worldConfig";

// World Developer Portal limits
const TITLE_MAX = 30;
const MESSAGE_MAX = 200;

type NotifyBody = {
  // Market resolution notification
  marketTitle?: string;
  outcome?: "yes" | "no";
  nullifiers?: string[];
  // Clash notification
  clashEvent?: "accepted" | "resolved";
  // Treasury payout notification
  payoutEvent?: "paid" | "refund";
  // Daily featured market push
  featuredTitle?: string;
  challengerUsername?: string;
  winnerNullifier?: string;
  // Shared auth
  cronSecret?: string;
};

function buildNotification(body: NotifyBody): { title: string; message: string; path: string } | null {
  if (body.payoutEvent === "paid") {
    return {
      title: "WLD winnings sent! 🎉",
      message: "Your VeRdex winnings were just sent to your World App wallet on World Chain. Open My Bets to see the transaction.",
      path: "/?tab=verdex",
    };
  }
  if (body.featuredTitle) {
    return {
      title: "Today's market 🔮",
      message: `${body.featuredTitle.slice(0, 120)} — call it before it closes. Verified humans only, real WLD payouts.`,
      path: "/?tab=verdex",
    };
  }
  if (body.payoutEvent === "refund") {
    return {
      title: "Stake refunded ↩",
      message: "A VeRdex market was voided, so your full stake was sent back to your World App wallet. Fair is fair.",
      path: "/?tab=verdex",
    };
  }
  if (body.clashEvent === "accepted") {
    return {
      title: "Clash accepted!",
      message: `${(body.challengerUsername ?? "A human").slice(0, 40)} accepted your VeRdex Clash. May the best forecaster win.`,
      path: "/?tab=verdex",
    };
  }
  if (body.clashEvent === "resolved") {
    return {
      title: "Clash resolved",
      message: "Your VeRdex Clash is settled. Check your result in the app.",
      path: "/?tab=verdex",
    };
  }
  if (body.outcome && body.marketTitle) {
    const label = body.outcome.toUpperCase();
    const shortTitle = body.marketTitle.slice(0, 60);
    return {
      title: `VeRdex: resolved ${label}`,
      message: `Market resolved ${label}: ${shortTitle}. Check your payout.`,
      path: "/?tab=verdex",
    };
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (isRateLimited(req, "verdex-notify", 10)) {
    return rateLimitResponse();
  }

  // Auth: Vercel CRON_SECRET header or body secret for server-to-server calls
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const body = await readJsonBody<NotifyBody>(req);
    if (!body) return noStoreJson({ error: "Invalid request body." }, { status: 400 });

    const callerSecret = authHeader?.replace("Bearer ", "") ?? body.cronSecret ?? "";
    if (callerSecret !== cronSecret) {
      return noStoreJson({ error: "Unauthorized." }, { status: 401 });
    }

    return sendNotifications(body);
  }

  const body = await readJsonBody<NotifyBody>(req);
  if (!body) return noStoreJson({ error: "Invalid request body." }, { status: 400 });
  return sendNotifications(body);
}

async function sendNotifications(body: NotifyBody) {
  const appId = getWorldAppId();
  const apiKey = getWorldDevPortalApiKey();

  if (!appId || !apiKey) {
    return noStoreJson({ ok: false, pendingSetup: true });
  }

  const notification = buildNotification(body);
  if (!notification) {
    return noStoreJson({ error: "Missing notification context." }, { status: 400 });
  }

  // Enforce World Developer Portal title/message limits
  const title = notification.title.slice(0, TITLE_MAX);
  const message = notification.message.slice(0, MESSAGE_MAX);

  // World App deep link path — only verified 0x wallet addresses accepted
  const wallets = (body.nullifiers ?? []).filter(isWalletAddress);
  if (wallets.length === 0) {
    return noStoreJson({ ok: true, sent: 0, note: "No valid wallet addresses." });
  }

  // World Developer Portal: mini_app_path must be the worldapp:// deep link URI
  const miniAppPath = `worldapp://mini-app?app_id=${appId}&path=${encodeURIComponent(notification.path)}`;

  // World API accepts max 1000 addresses per call; batch in 100s
  const BATCH_SIZE = 100;
  let sent = 0;

  for (let i = 0; i < wallets.length; i += BATCH_SIZE) {
    const batch = wallets.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch("https://developer.worldcoin.org/api/v2/minikit/send-notification", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: appId,
          wallet_addresses: batch,
          title,
          message,
          mini_app_path: miniAppPath,
        }),
      });

      if (res.ok) sent += batch.length;
      else {
        const errPayload = await res.json().catch(() => null);
        console.error("[verdex/notify] World API error:", errPayload);
      }
    } catch (err) {
      console.error("[verdex/notify] fetch error:", err);
    }
  }

  return noStoreJson({ ok: true, sent });
}
