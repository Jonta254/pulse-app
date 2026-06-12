/**
 * Extra promo frame sets — "payout proof" story + "World Cup" special.
 * Run: node scripts/gen-promo-extra.js   (outputs promo/payout-XX.png, wc-XX.png)
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "../promo");
if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });

const BG = "#07091a", SURF = "#0d1228";
const ACC = "#6366f1", YES = "#00e887", NO = "#ff4d6d", GOLD = "#f59e0b";
const TEXT = "#e8eaf6", MUTED = "#a5b4fc";
const FONT = "'Segoe UI',system-ui,sans-serif";

const defs = `
  <defs>
    <radialGradient id="lg" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#818cf8"/><stop offset="60%" stop-color="${ACC}"/><stop offset="100%" stop-color="#4338ca"/>
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="35%" r="70%">
      <stop offset="0%" stop-color="${ACC}" stop-opacity="0.25"/><stop offset="100%" stop-color="${ACC}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ghalo" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="${YES}" stop-opacity="0.18"/><stop offset="100%" stop-color="${YES}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="greeng" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${YES}"/><stop offset="100%" stop-color="#00b86b"/>
    </linearGradient>
    <linearGradient id="goldg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>`;

function bolt(cx, cy, scale) {
  return `<g transform="translate(${cx - 50 * scale},${cy - 61 * scale}) scale(${scale * 1.22})">
    <polygon points="50,0 0,60 28,60 10,100 80,30 50,30 70,0" fill="url(#lg)"/>
    <polygon points="10,100 16,80 28,92" fill="${YES}"/>
  </g>`;
}

function frame(body, glow = "halo") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    ${defs}
    <rect width="1080" height="1920" fill="${BG}"/>
    <rect width="1080" height="1920" fill="url(#${glow})"/>
    ${body}
    <text x="540" y="1860" font-family="${FONT}" font-size="28" fill="${MUTED}" text-anchor="middle" opacity="0.8">VeRdex — only on World App</text>
  </svg>`;
}

// ══ SET B — "THE PAYOUT PROOF" (the money story) ══════════════════════════════
const payout = [];

payout.push(frame(`
  <text x="540" y="700" font-family="${FONT}" font-size="92" font-weight="900" fill="${TEXT}" text-anchor="middle">Betting apps say</text>
  <text x="540" y="820" font-family="${FONT}" font-size="92" font-weight="900" fill="${NO}" text-anchor="middle">“trust us.”</text>
  <text x="540" y="1100" font-family="${FONT}" font-size="64" font-weight="800" fill="${MUTED}" text-anchor="middle">We say:</text>
  <text x="540" y="1210" font-family="${FONT}" font-size="80" font-weight="900" fill="${YES}" text-anchor="middle">check the chain. 🔗</text>
`));

payout.push(frame(`
  <text x="540" y="330" font-family="${FONT}" font-size="60" font-weight="900" fill="${TEXT}" text-anchor="middle">I called it. ✅</text>
  <rect x="90" y="450" width="900" height="420" rx="32" fill="${SURF}" stroke="${YES}" stroke-width="3"/>
  <text x="140" y="545" font-family="${FONT}" font-size="44" font-weight="800" fill="${TEXT}">Will BTC be above $63,930</text>
  <text x="140" y="605" font-family="${FONT}" font-size="44" font-weight="800" fill="${TEXT}">at 16:23 UTC?</text>
  <rect x="140" y="660" width="240" height="70" rx="35" fill="rgba(0,232,135,0.15)" stroke="${YES}" stroke-width="2"/>
  <text x="260" y="708" font-family="${FONT}" font-size="34" font-weight="900" fill="${YES}" text-anchor="middle">YES · 2 WLD</text>
  <text x="140" y="810" font-family="${FONT}" font-size="32" fill="${MUTED}">⚖ Resolves from Kraken public candles — nobody can cheat</text>
  <text x="540" y="1120" font-family="${FONT}" font-size="130" text-anchor="middle">⏱️</text>
  <text x="540" y="1320" font-family="${FONT}" font-size="52" font-weight="800" fill="${MUTED}" text-anchor="middle">Market closes… resolves itself…</text>
`, "ghalo"));

payout.push(frame(`
  <text x="540" y="380" font-family="${FONT}" font-size="200" text-anchor="middle">💸</text>
  <text x="540" y="640" font-family="${FONT}" font-size="100" font-weight="900" fill="${YES}" text-anchor="middle">+3.92 WLD</text>
  <text x="540" y="740" font-family="${FONT}" font-size="52" font-weight="800" fill="${TEXT}" text-anchor="middle">in my wallet. 90 seconds.</text>
  <rect x="120" y="880" width="840" height="200" rx="28" fill="${SURF}" stroke="${YES}" stroke-width="2.5"/>
  <text x="170" y="960" font-family="${FONT}" font-size="38" font-weight="800" fill="${TEXT}">✓ Paid on World Chain</text>
  <text x="170" y="1030" font-family="${FONT}" font-size="30" fill="${YES}">worldscan.org/tx/0x24e2…7b7b — public receipt</text>
  <text x="540" y="1260" font-family="${FONT}" font-size="46" font-weight="800" fill="${MUTED}" text-anchor="middle">No withdrawal button. No “pending”.</text>
  <text x="540" y="1330" font-family="${FONT}" font-size="46" font-weight="800" fill="${MUTED}" text-anchor="middle">No customer support ticket.</text>
`, "ghalo"));

payout.push(frame(`
  <text x="540" y="420" font-family="${FONT}" font-size="170" text-anchor="middle">🛡️</text>
  <text x="540" y="640" font-family="${FONT}" font-size="72" font-weight="900" fill="${TEXT}" text-anchor="middle">And if a market breaks?</text>
  <text x="540" y="780" font-family="${FONT}" font-size="84" font-weight="900" fill="${YES}" text-anchor="middle">Full refund.</text>
  <text x="540" y="880" font-family="${FONT}" font-size="84" font-weight="900" fill="${YES}" text-anchor="middle">Automatic.</text>
  <text x="540" y="1100" font-family="${FONT}" font-size="44" fill="${MUTED}" text-anchor="middle">Your money is never stuck. Ever.</text>
`));

payout.push(frame(`
  ${bolt(540, 450, 2.0)}
  <text x="540" y="780" font-family="${FONT}" font-size="80" font-weight="900" fill="${TEXT}" text-anchor="middle">Your eyes. Your call.</text>
  <text x="540" y="890" font-family="${FONT}" font-size="80" font-weight="900" fill="${GOLD}" text-anchor="middle">Your money.</text>
  <rect x="160" y="1040" width="760" height="140" rx="70" fill="url(#greeng)"/>
  <text x="540" y="1128" font-family="${FONT}" font-size="50" font-weight="900" fill="#062b1a" text-anchor="middle">Open VeRdex on World App</text>
`));

// ══ SET C — "WORLD CUP SPECIAL" ═══════════════════════════════════════════════
const wc = [];

wc.push(frame(`
  <text x="540" y="480" font-family="${FONT}" font-size="260" text-anchor="middle">⚽</text>
  <text x="540" y="760" font-family="${FONT}" font-size="86" font-weight="900" fill="${TEXT}" text-anchor="middle">You watch every match.</text>
  <text x="540" y="900" font-family="${FONT}" font-size="86" font-weight="900" fill="${GOLD}" text-anchor="middle">You argue every call.</text>
  <text x="540" y="1180" font-family="${FONT}" font-size="64" font-weight="800" fill="${YES}" text-anchor="middle">Time it paid you. 💰</text>
`));

wc.push(frame(`
  <text x="540" y="300" font-family="${FONT}" font-size="58" font-weight="900" fill="${TEXT}" text-anchor="middle">Tonight on VeRdex:</text>
  <rect x="90" y="400" width="900" height="300" rx="32" fill="${SURF}" stroke="${ACC}" stroke-width="2.5"/>
  <text x="140" y="500" font-family="${FONT}" font-size="48" font-weight="800" fill="${TEXT}">Will Brazil beat Morocco?</text>
  <text x="140" y="560" font-family="${FONT}" font-size="28" fill="${MUTED}">Resolves from the official final score · Source: ESPN</text>
  <rect x="140" y="600" width="380" height="70" rx="35" fill="rgba(0,232,135,0.15)" stroke="${YES}" stroke-width="2"/>
  <text x="330" y="648" font-family="${FONT}" font-size="32" font-weight="900" fill="${YES}" text-anchor="middle">BET YES 1.72×</text>
  <rect x="560" y="600" width="380" height="70" rx="35" fill="rgba(255,77,109,0.12)" stroke="${NO}" stroke-width="2"/>
  <text x="750" y="648" font-family="${FONT}" font-size="32" font-weight="900" fill="${NO}" text-anchor="middle">BET NO 2.38×</text>
  <rect x="90" y="760" width="900" height="300" rx="32" fill="${SURF}" stroke="${ACC}" stroke-width="2.5" opacity="0.92"/>
  <text x="140" y="860" font-family="${FONT}" font-size="48" font-weight="800" fill="${TEXT}">Will both teams score?</text>
  <text x="140" y="920" font-family="${FONT}" font-size="28" fill="${MUTED}">Extra time included · Source: ESPN final score</text>
  <rect x="140" y="960" width="380" height="70" rx="35" fill="rgba(0,232,135,0.15)" stroke="${YES}" stroke-width="2"/>
  <text x="330" y="1008" font-family="${FONT}" font-size="32" font-weight="900" fill="${YES}" text-anchor="middle">BET YES 2.05×</text>
  <text x="540" y="1230" font-family="${FONT}" font-size="46" font-weight="800" fill="${MUTED}" text-anchor="middle">Every match. Every day. Until July 19.</text>
`));

wc.push(frame(`
  <text x="540" y="380" font-family="${FONT}" font-size="200" text-anchor="middle">⚔️</text>
  <text x="540" y="640" font-family="${FONT}" font-size="76" font-weight="900" fill="${TEXT}" text-anchor="middle">That one friend who</text>
  <text x="540" y="745" font-family="${FONT}" font-size="76" font-weight="900" fill="${TEXT}" text-anchor="middle">“knows football”? 🤓</text>
  <rect x="120" y="900" width="840" height="120" rx="60" fill="url(#goldg)"/>
  <text x="540" y="975" font-family="${FONT}" font-size="42" font-weight="900" fill="#1a1a2e" text-anchor="middle">Clash him 1v1. Winner takes 90%.</text>
  <text x="540" y="1180" font-family="${FONT}" font-size="48" font-weight="800" fill="${MUTED}" text-anchor="middle">Loser buys silence for the</text>
  <text x="540" y="1250" font-family="${FONT}" font-size="48" font-weight="800" fill="${MUTED}" text-anchor="middle">rest of the tournament. 🤐</text>
`));

wc.push(frame(`
  ${bolt(540, 430, 1.9)}
  <text x="540" y="740" font-family="${FONT}" font-size="78" font-weight="900" fill="${TEXT}" text-anchor="middle">90 minutes of game.</text>
  <text x="540" y="850" font-family="${FONT}" font-size="78" font-weight="900" fill="${YES}" text-anchor="middle">Instant WLD if you’re right.</text>
  <rect x="160" y="1010" width="760" height="140" rx="70" fill="url(#greeng)"/>
  <text x="540" y="1098" font-family="${FONT}" font-size="50" font-weight="900" fill="#062b1a" text-anchor="middle">Open VeRdex on World App</text>
  <text x="540" y="1280" font-family="${FONT}" font-size="36" fill="${MUTED}" text-anchor="middle">Verified humans only · Provably fair · On-chain payouts</text>
`));

async function main() {
  for (let i = 0; i < payout.length; i++) {
    await sharp(Buffer.from(payout[i])).png().toFile(path.join(out, `payout-${String(i + 1).padStart(2, "0")}.png`));
    console.log(`✓ payout-${String(i + 1).padStart(2, "0")}.png`);
  }
  for (let i = 0; i < wc.length; i++) {
    await sharp(Buffer.from(wc[i])).png().toFile(path.join(out, `wc-${String(i + 1).padStart(2, "0")}.png`));
    console.log(`✓ wc-${String(i + 1).padStart(2, "0")}.png`);
  }
  console.log("Extra frame sets done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
