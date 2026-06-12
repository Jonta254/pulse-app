/**
 * VeRdex promo generator — AD images + vertical video frames (1080x1920).
 * Run: node scripts/gen-promo.js          (outputs to ./promo/)
 * Then: node scripts/make-promo-video.js  (stitches frames into MP4)
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "../promo");
if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });

const BG = "#07091a", SURF = "#0d1228", SURF2 = "#111930";
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
    <linearGradient id="goldg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <linearGradient id="greeng" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${YES}"/><stop offset="100%" stop-color="#00b86b"/>
    </linearGradient>
  </defs>`;

function bolt(cx, cy, scale) {
  return `<g transform="translate(${cx - 50 * scale},${cy - 61 * scale}) scale(${scale * 1.22})">
    <polygon points="50,0 0,60 28,60 10,100 80,30 50,30 70,0" fill="url(#lg)"/>
    <polygon points="10,100 16,80 28,92" fill="${YES}"/>
  </g>`;
}

function chip(x, y, w, label, color, bg) {
  return `<rect x="${x}" y="${y}" width="${w}" height="64" rx="32" fill="${bg}" stroke="${color}" stroke-width="2" opacity="0.95"/>
    <text x="${x + w / 2}" y="${y + 42}" font-family="${FONT}" font-size="30" font-weight="700" fill="${color}" text-anchor="middle">${label}</text>`;
}

function marketCard(x, y, w, title, rule, yesPct, color) {
  const barW = w - 80;
  return `
  <rect x="${x}" y="${y}" width="${w}" height="290" rx="28" fill="${SURF}" stroke="${ACC}" stroke-width="2" opacity="0.97"/>
  <text x="${x + 40}" y="${y + 70}" font-family="${FONT}" font-size="40" font-weight="800" fill="${TEXT}">${title}</text>
  <text x="${x + 40}" y="${y + 120}" font-family="${FONT}" font-size="26" fill="${MUTED}">${rule}</text>
  <rect x="${x + 40}" y="${y + 156}" width="${barW}" height="18" rx="9" fill="${NO}" opacity="0.5"/>
  <rect x="${x + 40}" y="${y + 156}" width="${barW * yesPct / 100}" height="18" rx="9" fill="${YES}"/>
  <text x="${x + 40}" y="${y + 215}" font-family="${FONT}" font-size="28" font-weight="700" fill="${YES}">YES ${yesPct}%</text>
  <text x="${x + w - 40}" y="${y + 215}" font-family="${FONT}" font-size="28" font-weight="700" fill="${NO}" text-anchor="end">NO ${100 - yesPct}%</text>
  <rect x="${x + 40}" y="${y + 236}" width="220" height="40" rx="20" fill="rgba(0,232,135,0.12)" stroke="${YES}" stroke-width="1.5"/>
  <text x="${x + 150}" y="${y + 263}" font-family="${FONT}" font-size="22" font-weight="700" fill="${YES}" text-anchor="middle">⚖ Provably fair</text>`;
}

function frame(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    ${defs}
    <rect width="1080" height="1920" fill="${BG}"/>
    <rect width="1080" height="1920" fill="url(#halo)"/>
    ${body}
    <text x="540" y="1860" font-family="${FONT}" font-size="28" fill="${MUTED}" text-anchor="middle" opacity="0.8">VeRdex — only on World App</text>
  </svg>`;
}

const frames = [];

// F1 — HOOK
frames.push(frame(`
  ${bolt(540, 460, 2.4)}
  <text x="540" y="800" font-family="${FONT}" font-size="120" font-weight="900" fill="${TEXT}" text-anchor="middle">VeRdex</text>
  <text x="540" y="880" font-family="${FONT}" font-size="40" font-weight="700" fill="${MUTED}" text-anchor="middle" letter-spacing="6">HUMAN PREDICTION NETWORK</text>
  <text x="540" y="1080" font-family="${FONT}" font-size="64" font-weight="900" fill="${TEXT}" text-anchor="middle">Think you can read</text>
  <text x="540" y="1170" font-family="${FONT}" font-size="64" font-weight="900" fill="${TEXT}" text-anchor="middle">the world?</text>
  <text x="540" y="1330" font-family="${FONT}" font-size="48" font-weight="800" fill="${GOLD}" text-anchor="middle">Prove it. Get paid.</text>
`));

// F2 — ZERO BOTS
frames.push(frame(`
  <text x="540" y="420" font-family="${FONT}" font-size="170" text-anchor="middle">🛡️</text>
  <text x="540" y="640" font-family="${FONT}" font-size="78" font-weight="900" fill="${TEXT}" text-anchor="middle">ZERO BOTS.</text>
  <text x="540" y="740" font-family="${FONT}" font-size="78" font-weight="900" fill="${YES}" text-anchor="middle">100% HUMANS.</text>
  <text x="540" y="900" font-family="${FONT}" font-size="40" fill="${MUTED}" text-anchor="middle">Every forecaster is World ID verified.</text>
  <text x="540" y="960" font-family="${FONT}" font-size="40" fill="${MUTED}" text-anchor="middle">One person. One identity. Real money.</text>
  ${chip(140, 1120, 380, "✓ World ID verified", YES, "rgba(0,232,135,0.1)")}
  ${chip(560, 1120, 380, "✗ No bots allowed", NO, "rgba(255,77,109,0.1)")}
`));

// F3 — WORLD CUP MARKET
frames.push(frame(`
  <text x="540" y="300" font-family="${FONT}" font-size="64" font-weight="900" fill="${TEXT}" text-anchor="middle">⚽ The World Cup</text>
  <text x="540" y="380" font-family="${FONT}" font-size="64" font-weight="900" fill="${GOLD}" text-anchor="middle">is LIVE on VeRdex</text>
  ${marketCard(70, 520, 940, "Will Brazil beat Morocco?", "Resolves from the official final score. Source: ESPN.", 58, YES)}
  ${marketCard(70, 870, 940, "Will the match have 3+ goals?", "Extra time included. Source: ESPN final score.", 44, ACC)}
  <text x="540" y="1340" font-family="${FONT}" font-size="42" font-weight="800" fill="${TEXT}" text-anchor="middle">A match almost every day.</text>
  <text x="540" y="1410" font-family="${FONT}" font-size="42" font-weight="800" fill="${TEXT}" text-anchor="middle">Plus NBA, crypto, weather, rockets…</text>
`));

// F4 — TEN FAMILIES
const fams = [["⚡","Flash crypto"],["⚽","World Cup"],["🏀","NBA"],["🌦️","Weather"],["🚀","Rockets"],["💱","FX rates"],["😱","Fear &amp; Greed"],["🌟","Wiki duels"],["📊","Polymarket"],["📈","Daily crypto"]];
frames.push(frame(`
  <text x="540" y="280" font-family="${FONT}" font-size="72" font-weight="900" fill="${TEXT}" text-anchor="middle">10 ways to win</text>
  <text x="540" y="360" font-family="${FONT}" font-size="40" fill="${MUTED}" text-anchor="middle">New markets generate themselves, all day</text>
  ${fams.map(([e, l], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 90 + col * 460, y = 470 + row * 210;
    return `<rect x="${x}" y="${y}" width="440" height="180" rx="24" fill="${SURF}" stroke="${ACC}" stroke-width="1.5" opacity="0.95"/>
      <text x="${x + 50}" y="${y + 110}" font-family="${FONT}" font-size="70">${e}</text>
      <text x="${x + 150}" y="${y + 105}" font-family="${FONT}" font-size="36" font-weight="800" fill="${TEXT}">${l}</text>`;
  }).join("")}
`));

// F5 — INSTANT PAYOUT
frames.push(frame(`
  <text x="540" y="350" font-family="${FONT}" font-size="170" text-anchor="middle">💸</text>
  <text x="540" y="560" font-family="${FONT}" font-size="74" font-weight="900" fill="${TEXT}" text-anchor="middle">Win → WLD hits</text>
  <text x="540" y="660" font-family="${FONT}" font-size="74" font-weight="900" fill="${YES}" text-anchor="middle">your wallet. Instantly.</text>
  <rect x="120" y="800" width="840" height="170" rx="28" fill="${SURF}" stroke="${YES}" stroke-width="2.5"/>
  <text x="170" y="870" font-family="${FONT}" font-size="40" font-weight="800" fill="${TEXT}">@jontAWorld won 1.96 WLD</text>
  <text x="170" y="930" font-family="${FONT}" font-size="30" fill="${YES}">✓ Paid on World Chain · WorldScan receipt</text>
  <rect x="120" y="1010" width="840" height="170" rx="28" fill="${SURF}" stroke="${YES}" stroke-width="2.5" opacity="0.85"/>
  <text x="170" y="1080" font-family="${FONT}" font-size="40" font-weight="800" fill="${TEXT}">@amara_ke won 4.20 WLD</text>
  <text x="170" y="1140" font-family="${FONT}" font-size="30" fill="${YES}">✓ Paid on World Chain · WorldScan receipt</text>
  <text x="540" y="1320" font-family="${FONT}" font-size="40" fill="${MUTED}" text-anchor="middle">No withdrawal forms. No waiting. No trust needed —</text>
  <text x="540" y="1380" font-family="${FONT}" font-size="40" fill="${MUTED}" text-anchor="middle">every payout is public on-chain.</text>
`));

// F6 — PROVABLY FAIR
frames.push(frame(`
  <text x="540" y="350" font-family="${FONT}" font-size="170" text-anchor="middle">⚖️</text>
  <text x="540" y="560" font-family="${FONT}" font-size="74" font-weight="900" fill="${TEXT}" text-anchor="middle">Provably fair.</text>
  <text x="540" y="660" font-family="${FONT}" font-size="74" font-weight="900" fill="${ACC}" text-anchor="middle">Not “trust us” fair.</text>
  <text x="120" y="840" font-family="${FONT}" font-size="38" fill="${TEXT}">✓ Every market shows its exact resolution rule</text>
  <text x="120" y="920" font-family="${FONT}" font-size="38" fill="${TEXT}">✓ Resolved from public data — ESPN, Kraken, ECB</text>
  <text x="120" y="1000" font-family="${FONT}" font-size="38" fill="${TEXT}">✓ No human decides the outcome. Ever.</text>
  <text x="120" y="1080" font-family="${FONT}" font-size="38" fill="${TEXT}">✓ Market can’t resolve? Full refund. Automatic.</text>
  <text x="540" y="1300" font-family="${FONT}" font-size="44" font-weight="800" fill="${GOLD}" text-anchor="middle">The most honest game on Earth.</text>
`));

// F7 — CLASH + EARN
frames.push(frame(`
  <text x="540" y="320" font-family="${FONT}" font-size="150" text-anchor="middle">⚔️</text>
  <text x="540" y="520" font-family="${FONT}" font-size="70" font-weight="900" fill="${TEXT}" text-anchor="middle">Challenge your friends</text>
  <text x="540" y="610" font-family="${FONT}" font-size="56" font-weight="800" fill="${GOLD}" text-anchor="middle">1v1 — winner takes 90%</text>
  <rect x="120" y="740" width="840" height="120" rx="60" fill="url(#goldg)"/>
  <text x="540" y="815" font-family="${FONT}" font-size="40" font-weight="900" fill="#1a1a2e" text-anchor="middle">“5 WLD says Brazil wins. You in?”</text>
  <text x="540" y="1060" font-family="${FONT}" font-size="150" text-anchor="middle">🎁</text>
  <text x="540" y="1250" font-family="${FONT}" font-size="58" font-weight="900" fill="${TEXT}" text-anchor="middle">Invite friends — earn</text>
  <text x="540" y="1340" font-family="${FONT}" font-size="58" font-weight="900" fill="${YES}" text-anchor="middle">0.2 WLD per human</text>
`));

// F8 — CTA
frames.push(frame(`
  ${bolt(540, 480, 2.2)}
  <text x="540" y="820" font-family="${FONT}" font-size="84" font-weight="900" fill="${TEXT}" text-anchor="middle">The world is moving.</text>
  <text x="540" y="930" font-family="${FONT}" font-size="84" font-weight="900" fill="${GOLD}" text-anchor="middle">Call it first.</text>
  <rect x="160" y="1080" width="760" height="140" rx="70" fill="url(#greeng)"/>
  <text x="540" y="1168" font-family="${FONT}" font-size="52" font-weight="900" fill="#062b1a" text-anchor="middle">Open VeRdex on World App</text>
  <text x="540" y="1340" font-family="${FONT}" font-size="38" fill="${MUTED}" text-anchor="middle">Search “VeRdex” in the World App mini apps</text>
`));

// ── AD images ────────────────────────────────────────────────────────────────
const adSquare = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080">
  ${defs}
  <rect width="1080" height="1080" fill="${BG}"/>
  <rect width="1080" height="1080" fill="url(#halo)"/>
  ${bolt(540, 270, 1.7)}
  <text x="540" y="540" font-family="${FONT}" font-size="100" font-weight="900" fill="${TEXT}" text-anchor="middle">VeRdex</text>
  <text x="540" y="610" font-family="${FONT}" font-size="34" font-weight="700" fill="${MUTED}" text-anchor="middle" letter-spacing="5">HUMAN PREDICTION NETWORK</text>
  <text x="540" y="730" font-family="${FONT}" font-size="56" font-weight="900" fill="${TEXT}" text-anchor="middle">Predict the World Cup.</text>
  <text x="540" y="810" font-family="${FONT}" font-size="56" font-weight="900" fill="${YES}" text-anchor="middle">Win real WLD. Instantly.</text>
  ${chip(90, 890, 280, "🛡 Humans only", YES, "rgba(0,232,135,0.1)")}
  ${chip(400, 890, 280, "⚖ Provably fair", ACC, "rgba(99,102,241,0.12)")}
  ${chip(710, 890, 280, "💸 Paid on-chain", GOLD, "rgba(245,158,11,0.1)")}
  <text x="540" y="1030" font-family="${FONT}" font-size="32" fill="${MUTED}" text-anchor="middle">Only on World App — search “VeRdex”</text>
</svg>`;

const adWide = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  ${defs}
  <rect width="1200" height="630" fill="${BG}"/>
  <rect width="1200" height="630" fill="url(#halo)"/>
  ${bolt(210, 315, 1.5)}
  <text x="420" y="230" font-family="${FONT}" font-size="84" font-weight="900" fill="${TEXT}">VeRdex</text>
  <text x="420" y="290" font-family="${FONT}" font-size="28" font-weight="700" fill="${MUTED}" letter-spacing="4">HUMAN PREDICTION NETWORK</text>
  <text x="420" y="380" font-family="${FONT}" font-size="44" font-weight="900" fill="${TEXT}">Predict real events. Win real WLD.</text>
  <text x="420" y="440" font-family="${FONT}" font-size="44" font-weight="900" fill="${YES}">Paid to your wallet, instantly.</text>
  <text x="420" y="540" font-family="${FONT}" font-size="30" fill="${MUTED}">🛡 World ID verified humans only · ⚖ Provably fair · Only on World App</text>
</svg>`;

async function main() {
  for (let i = 0; i < frames.length; i++) {
    const file = path.join(out, `frame-${String(i + 1).padStart(2, "0")}.png`);
    await sharp(Buffer.from(frames[i])).png().toFile(file);
    console.log("✓", file);
  }
  await sharp(Buffer.from(adSquare)).png().toFile(path.join(out, "ad-square-1080.png"));
  console.log("✓ ad-square-1080.png");
  await sharp(Buffer.from(adWide)).png().toFile(path.join(out, "ad-wide-1200x630.png"));
  console.log("✓ ad-wide-1200x630.png");
  console.log("\nAll promo assets in ./promo/");
}

main().catch((e) => { console.error(e); process.exit(1); });
