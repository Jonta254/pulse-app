/**
 * VeRdex portal image generator — uses sharp to convert SVG → PNG
 * Run: node scripts/gen-verdex-images.js
 */
const sharp = require("sharp");
const path = require("path");
const out = path.join(__dirname, "../public");

const BG = "#07091a";
const SURF = "#0d1228";
const SURF2 = "#111930";
const ACC = "#6366f1";
const YES = "#00e887";
const NO = "#ff4d6d";
const GOLD = "#f59e0b";
const TEXT = "#e8eaf6";
const MUTED = "#a5b4fc";
const FONT = "'SF Pro Display',system-ui,-apple-system,sans-serif";

// ── Logo mark SVG (reusable) ─────────────────────────────────────────────────
function logoMark(cx, cy, size) {
  const s = size / 100;
  return `
  <defs>
    <radialGradient id="lg" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#818cf8"/>
      <stop offset="60%" stop-color="${ACC}"/>
      <stop offset="100%" stop-color="#4338ca"/>
    </radialGradient>
    <radialGradient id="glow-r" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${ACC}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${ACC}" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <!-- Glow halo -->
  <circle cx="${cx}" cy="${cy}" r="${60 * s}" fill="url(#glow-r)"/>
  <!-- Outer ring -->
  <circle cx="${cx}" cy="${cy}" r="${46 * s}" fill="none" stroke="${ACC}" stroke-width="${2.5 * s}" opacity="0.5"/>
  <!-- Dark circle bg -->
  <circle cx="${cx}" cy="${cy}" r="${42 * s}" fill="${SURF}"/>
  <!-- Inner accent ring -->
  <circle cx="${cx}" cy="${cy}" r="${42 * s}" fill="none" stroke="url(#lg)" stroke-width="${1.5 * s}" opacity="0.8"/>
  <!-- "V" lightning bolt mark -->
  <g transform="translate(${cx - 18 * s},${cy - 22 * s}) scale(${s * 0.36})" filter="url(#shadow)">
    <polygon points="50,0 0,60 28,60 10,100 80,30 50,30 70,0" fill="url(#lg)"/>
    <polygon points="10,100 16,80 28,92" fill="${YES}"/>
  </g>`;
}

// ── 1. icon-1024.png ─────────────────────────────────────────────────────────
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <rect width="1024" height="1024" rx="200" fill="${BG}"/>
  <rect width="1024" height="1024" rx="200" fill="url(#radBg)" opacity="0.6"/>
  <defs>
    <radialGradient id="radBg" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="${ACC}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${ACC}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${logoMark(512, 512, 620)}
</svg>`;

// ── 2. logo-512.png ──────────────────────────────────────────────────────────
const logo512Svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" rx="100" fill="${BG}"/>
  ${logoMark(256, 256, 310)}
</svg>`;

// ── 3. content-card.png (288×288) ────────────────────────────────────────────
const contentCardSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="288" height="288">
  <defs>
    <linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d1228"/>
      <stop offset="100%" stop-color="#07091a"/>
    </linearGradient>
    <radialGradient id="ch" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="${ACC}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${ACC}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="288" height="288" rx="24" fill="url(#cg)"/>
  <rect width="288" height="288" rx="24" fill="url(#ch)"/>
  <rect x="1" y="1" width="286" height="286" rx="23" fill="none" stroke="${ACC}" stroke-width="1.5" opacity="0.35"/>
  ${logoMark(144, 108, 140)}
  <text x="144" y="188" font-family="${FONT}" font-size="32" font-weight="800" fill="${TEXT}" text-anchor="middle" letter-spacing="2">VeRdex</text>
  <text x="144" y="212" font-family="${FONT}" font-size="13" fill="${MUTED}" text-anchor="middle" letter-spacing="1">HUMAN PREDICTION NETWORK</text>
  <rect x="52" y="232" width="184" height="36" rx="18" fill="${ACC}"/>
  <text x="144" y="255" font-family="${FONT}" font-size="14" font-weight="700" fill="white" text-anchor="middle">Predict. Stake WLD. Win.</text>
</svg>`;

// ── 4. meta-tag.png (1200×630) ───────────────────────────────────────────────
const metaSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="mbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${BG}"/>
      <stop offset="100%" stop-color="${SURF2}"/>
    </linearGradient>
    <radialGradient id="mg1" cx="15%" cy="50%" r="40%">
      <stop offset="0%" stop-color="${ACC}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${ACC}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mg2" cx="85%" cy="50%" r="35%">
      <stop offset="0%" stop-color="${YES}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${YES}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#mbg)"/>
  <rect width="1200" height="630" fill="url(#mg1)"/>
  <rect width="1200" height="630" fill="url(#mg2)"/>
  <!-- Grid lines -->
  <line x1="0" y1="315" x2="1200" y2="315" stroke="${ACC}" stroke-width="1" opacity="0.06"/>
  <line x1="500" y1="0" x2="500" y2="630" stroke="${ACC}" stroke-width="1" opacity="0.1"/>
  <!-- Left: Logo + name -->
  ${logoMark(200, 200, 240)}
  <text x="200" y="340" font-family="${FONT}" font-size="64" font-weight="900" fill="${TEXT}" text-anchor="middle" letter-spacing="4">VeRdex</text>
  <text x="200" y="375" font-family="${FONT}" font-size="18" fill="${MUTED}" text-anchor="middle" letter-spacing="3">HUMAN PREDICTION NETWORK</text>
  <!-- Divider -->
  <line x1="460" y1="80" x2="460" y2="550" stroke="${ACC}" stroke-width="1.5" opacity="0.25"/>
  <!-- Right: Feature pills -->
  <text x="570" y="130" font-family="${FONT}" font-size="38" font-weight="800" fill="${TEXT}">Predict. Stake WLD.</text>
  <text x="570" y="178" font-family="${FONT}" font-size="38" font-weight="800" fill="${ACC}">Earn. Zero Bots.</text>
  <text x="570" y="222" font-family="${FONT}" font-size="18" fill="${MUTED}">Every forecaster is a verified World ID human.</text>
  <!-- Feature chips -->
  <rect x="570" y="260" width="168" height="52" rx="12" fill="${ACC}" fill-opacity="0.15" stroke="${ACC}" stroke-width="1.5" stroke-opacity="0.5"/>
  <text x="654" y="292" font-family="${FONT}" font-size="18" font-weight="700" fill="${YES}" text-anchor="middle">⚡ ZERO BOTS</text>
  <rect x="754" y="260" width="168" height="52" rx="12" fill="${ACC}" fill-opacity="0.15" stroke="${ACC}" stroke-width="1.5" stroke-opacity="0.5"/>
  <text x="838" y="292" font-family="${FONT}" font-size="18" font-weight="700" fill="${TEXT}" text-anchor="middle">💰 WLD STAKES</text>
  <rect x="938" y="260" width="168" height="52" rx="12" fill="${NO}" fill-opacity="0.12" stroke="${NO}" stroke-width="1.5" stroke-opacity="0.4"/>
  <text x="1022" y="292" font-family="${FONT}" font-size="18" font-weight="700" fill="${NO}" text-anchor="middle">⚔️ 1v1 CLASH</text>
  <rect x="570" y="328" width="168" height="52" rx="12" fill="${GOLD}" fill-opacity="0.1" stroke="${GOLD}" stroke-width="1.5" stroke-opacity="0.4"/>
  <text x="654" y="360" font-family="${FONT}" font-size="18" font-weight="700" fill="${GOLD}" text-anchor="middle">🔥 STREAKS</text>
  <rect x="754" y="328" width="168" height="52" rx="12" fill="${ACC}" fill-opacity="0.1" stroke="${ACC}" stroke-width="1.5" stroke-opacity="0.35"/>
  <text x="838" y="360" font-family="${FONT}" font-size="18" font-weight="700" fill="${MUTED}" text-anchor="middle">📋 COPY BETS</text>
  <rect x="938" y="328" width="168" height="52" rx="12" fill="${YES}" fill-opacity="0.08" stroke="${YES}" stroke-width="1.5" stroke-opacity="0.35"/>
  <text x="1022" y="360" font-family="${FONT}" font-size="18" font-weight="700" fill="${YES}" text-anchor="middle">🤖 AI ORACLE</text>
  <!-- Bottom bar -->
  <rect x="570" y="420" width="560" height="2" rx="1" fill="${ACC}" opacity="0.3"/>
  <text x="570" y="468" font-family="${FONT}" font-size="15" fill="${MUTED}">Crypto · Sports · World Events · Culture · Flash Markets</text>
  <text x="570" y="496" font-family="${FONT}" font-size="15" fill="${MUTED}">New markets every 3 hours. Verified humans only.</text>
  <rect x="570" y="528" width="200" height="44" rx="22" fill="${ACC}"/>
  <text x="670" y="555" font-family="${FONT}" font-size="15" font-weight="700" fill="white" text-anchor="middle">Open in World App</text>
</svg>`;

// ── 5. hero.png (1920×1080) ──────────────────────────────────────────────────
const heroSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
  <defs>
    <linearGradient id="hbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${BG}"/>
      <stop offset="50%" stop-color="${SURF}"/>
      <stop offset="100%" stop-color="${SURF2}"/>
    </linearGradient>
    <radialGradient id="hg1" cx="20%" cy="50%" r="40%">
      <stop offset="0%" stop-color="${ACC}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${ACC}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="hg2" cx="80%" cy="50%" r="35%">
      <stop offset="0%" stop-color="${YES}" stop-opacity="0.09"/>
      <stop offset="100%" stop-color="${YES}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#hbg)"/>
  <rect width="1920" height="1080" fill="url(#hg1)"/>
  <rect width="1920" height="1080" fill="url(#hg2)"/>
  <!-- Subtle grid -->
  <line x1="0" y1="360" x2="1920" y2="360" stroke="${ACC}" stroke-width="1" opacity="0.07"/>
  <line x1="0" y1="720" x2="1920" y2="720" stroke="${ACC}" stroke-width="1" opacity="0.07"/>
  <line x1="640" y1="0" x2="640" y2="1080" stroke="${ACC}" stroke-width="1" opacity="0.07"/>
  <line x1="1280" y1="0" x2="1280" y2="1080" stroke="${ACC}" stroke-width="1" opacity="0.07"/>
  <!-- Logo + wordmark left side -->
  ${logoMark(200, 260, 280)}
  <line x1="560" y1="100" x2="560" y2="980" stroke="${ACC}" stroke-width="2" opacity="0.2"/>
  <!-- Main headline -->
  <text x="620" y="240" font-family="${FONT}" font-size="120" font-weight="900" fill="${TEXT}" letter-spacing="8">VeRdex</text>
  <text x="622" y="310" font-family="${FONT}" font-size="36" font-weight="400" fill="${MUTED}" letter-spacing="8">HUMAN PREDICTION NETWORK</text>
  <rect x="622" y="330" width="220" height="4" rx="2" fill="${ACC}" opacity="0.7"/>
  <!-- Feature cards -->
  <g transform="translate(622,370)">
    <rect width="240" height="90" rx="16" fill="${ACC}" fill-opacity="0.12" stroke="${ACC}" stroke-width="1.5" stroke-opacity="0.4"/>
    <text x="120" y="36" font-family="${FONT}" font-size="28" font-weight="800" fill="${YES}" text-anchor="middle">ZERO BOTS</text>
    <text x="120" y="62" font-family="${FONT}" font-size="16" fill="${MUTED}" text-anchor="middle">World ID Verified</text>
  </g>
  <g transform="translate(882,370)">
    <rect width="240" height="90" rx="16" fill="${ACC}" fill-opacity="0.12" stroke="${ACC}" stroke-width="1.5" stroke-opacity="0.4"/>
    <text x="120" y="36" font-family="${FONT}" font-size="28" font-weight="800" fill="${TEXT}" text-anchor="middle">WLD STAKES</text>
    <text x="120" y="62" font-family="${FONT}" font-size="16" fill="${MUTED}" text-anchor="middle">YES / NO Markets</text>
  </g>
  <g transform="translate(1142,370)">
    <rect width="240" height="90" rx="16" fill="${NO}" fill-opacity="0.1" stroke="${NO}" stroke-width="1.5" stroke-opacity="0.4"/>
    <text x="120" y="36" font-family="${FONT}" font-size="28" font-weight="800" fill="${NO}" text-anchor="middle">1v1 CLASH</text>
    <text x="120" y="62" font-family="${FONT}" font-size="16" fill="${MUTED}" text-anchor="middle">90% to winner</text>
  </g>
  <g transform="translate(1402,370)">
    <rect width="240" height="90" rx="16" fill="${GOLD}" fill-opacity="0.09" stroke="${GOLD}" stroke-width="1.5" stroke-opacity="0.4"/>
    <text x="120" y="36" font-family="${FONT}" font-size="28" font-weight="800" fill="${GOLD}" text-anchor="middle">STREAKS</text>
    <text x="120" y="62" font-family="${FONT}" font-size="16" fill="${MUTED}" text-anchor="middle">Up to 1.5× bonus</text>
  </g>
  <!-- Body copy -->
  <text x="622" y="530" font-family="${FONT}" font-size="28" fill="${MUTED}">Predict crypto, sports, world events and culture.</text>
  <text x="622" y="572" font-family="${FONT}" font-size="28" fill="${MUTED}">Earn WLD. Copy top forecasters. Challenge anyone 1v1.</text>
  <text x="622" y="614" font-family="${FONT}" font-size="28" fill="${MUTED}">AI Oracle generates 8 fresh markets every 3 hours.</text>
  <!-- CTA buttons -->
  <rect x="622" y="660" width="340" height="60" rx="30" fill="${ACC}"/>
  <text x="792" y="697" font-family="${FONT}" font-size="22" font-weight="700" fill="white" text-anchor="middle">Open in World App</text>
  <rect x="984" y="660" width="280" height="60" rx="30" fill="${SURF}" stroke="${ACC}" stroke-width="2"/>
  <text x="1124" y="697" font-family="${FONT}" font-size="20" fill="${MUTED}" text-anchor="middle">Powered by World ID</text>
  <!-- URL watermark -->
  <text x="1700" y="1020" font-family="${FONT}" font-size="20" fill="#2d3561" text-anchor="middle">verdex-brian-josiahs-projects.vercel.app</text>
</svg>`;

// ── 6. showcase-1.png — Markets tab (390×844) ────────────────────────────────
const showcase1Svg = `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844">
  <defs>
    <linearGradient id="sbg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${BG}"/>
      <stop offset="100%" stop-color="${SURF2}"/>
    </linearGradient>
  </defs>
  <rect width="390" height="844" fill="url(#sbg)"/>
  <!-- Status bar -->
  <text x="20" y="28" font-family="${FONT}" font-size="14" font-weight="600" fill="${TEXT}">9:41</text>
  <rect x="310" y="16" width="60" height="14" rx="7" fill="${SURF}" stroke="${ACC}" stroke-width="1" opacity="0.6"/>
  <!-- Header -->
  <rect width="390" height="64" fill="${SURF}" fill-opacity="0.96"/>
  <text x="20" y="44" font-family="${FONT}" font-size="22" font-weight="800" fill="${TEXT}">VeRdex</text>
  <text x="20" y="60" font-family="${FONT}" font-size="10" fill="${MUTED}" letter-spacing="2">HUMAN PREDICTION NETWORK</text>
  <!-- Avatar -->
  <circle cx="358" cy="38" r="18" fill="${ACC}" fill-opacity="0.2" stroke="${ACC}" stroke-width="1.5"/>
  <text x="358" y="44" font-family="${FONT}" font-size="14" fill="${ACC}" text-anchor="middle">🧑</text>
  <!-- Category pills -->
  <rect x="12" y="76" width="52" height="26" rx="13" fill="${ACC}"/>
  <text x="38" y="93" font-family="${FONT}" font-size="11" font-weight="700" fill="white" text-anchor="middle">All</text>
  <rect x="72" y="76" width="60" height="26" rx="13" fill="${SURF2}" stroke="${ACC}" stroke-width="1" stroke-opacity="0.4"/>
  <text x="102" y="93" font-family="${FONT}" font-size="11" fill="${MUTED}" text-anchor="middle">Crypto</text>
  <rect x="140" y="76" width="60" height="26" rx="13" fill="${SURF2}" stroke="${ACC}" stroke-width="1" stroke-opacity="0.4"/>
  <text x="170" y="93" font-family="${FONT}" font-size="11" fill="${MUTED}" text-anchor="middle">Sports</text>
  <rect x="208" y="76" width="60" height="26" rx="13" fill="${SURF2}" stroke="${ACC}" stroke-width="1" stroke-opacity="0.4"/>
  <text x="238" y="93" font-family="${FONT}" font-size="11" fill="${MUTED}" text-anchor="middle">World</text>
  <rect x="276" y="76" width="60" height="26" rx="13" fill="${SURF2}" stroke="${ACC}" stroke-width="1" stroke-opacity="0.4"/>
  <text x="306" y="93" font-family="${FONT}" font-size="11" fill="${MUTED}" text-anchor="middle">⚡ Flash</text>
  <!-- Market Card 1 (featured) -->
  <rect x="12" y="114" width="366" height="178" rx="16" fill="${SURF}" stroke="${ACC}" stroke-width="1.5" stroke-opacity="0.6"/>
  <rect x="12" y="114" width="366" height="5" rx="2" fill="${ACC}" opacity="0.6"/>
  <text x="28" y="138" font-family="${FONT}" font-size="10" font-weight="700" fill="${GOLD}" letter-spacing="1">⭐ FEATURED · 🪙 CRYPTO</text>
  <rect x="290" y="122" width="78" height="22" rx="11" fill="#ff4d6d" fill-opacity="0.15" stroke="${NO}" stroke-width="1"/>
  <text x="329" y="136" font-family="${FONT}" font-size="10" fill="${NO}" text-anchor="middle">⏱ 2d 14h</text>
  <text x="28" y="158" font-family="${FONT}" font-size="14" font-weight="700" fill="${TEXT}">Will BTC break $120k before</text>
  <text x="28" y="176" font-family="${FONT}" font-size="14" font-weight="700" fill="${TEXT}">end of month?</text>
  <!-- Pool bar -->
  <rect x="28" y="190" width="334" height="8" rx="4" fill="${SURF2}"/>
  <rect x="28" y="190" width="220" height="8" rx="4" fill="${YES}"/>
  <text x="28" y="214" font-family="${FONT}" font-size="11" fill="${YES}" font-weight="700">YES 65%</text>
  <text x="330" y="214" font-family="${FONT}" font-size="11" fill="${NO}" font-weight="700" text-anchor="end">NO 35%</text>
  <text x="28" y="232" font-family="${FONT}" font-size="10" fill="${MUTED}">🏦 4,820 WLD pool · 👥 342 humans</text>
  <!-- Bet buttons -->
  <rect x="28" y="244" width="152" height="38" rx="10" fill="${YES}" fill-opacity="0.15" stroke="${YES}" stroke-width="1.5"/>
  <text x="104" y="267" font-family="${FONT}" font-size="13" font-weight="800" fill="${YES}" text-anchor="middle">BET YES  2.1×</text>
  <rect x="190" y="244" width="152" height="38" rx="10" fill="${NO}" fill-opacity="0.12" stroke="${NO}" stroke-width="1.5"/>
  <text x="266" y="267" font-family="${FONT}" font-size="13" font-weight="800" fill="${NO}" text-anchor="middle">BET NO  1.8×</text>
  <!-- Market Card 2 -->
  <rect x="12" y="304" width="366" height="158" rx="16" fill="${SURF}" stroke="${ACC}" stroke-width="1" stroke-opacity="0.3"/>
  <text x="28" y="328" font-family="${FONT}" font-size="10" font-weight="700" fill="#60a5fa" letter-spacing="1">⚽ SPORTS</text>
  <rect x="290" y="314" width="78" height="22" rx="11" fill="${ACC}" fill-opacity="0.12" stroke="${ACC}" stroke-width="1"/>
  <text x="329" y="328" font-family="${FONT}" font-size="10" fill="${MUTED}" text-anchor="middle">⏱ 5h 22m</text>
  <text x="28" y="348" font-family="${FONT}" font-size="14" font-weight="700" fill="${TEXT}">Will Man City win the</text>
  <text x="28" y="366" font-family="${FONT}" font-size="14" font-weight="700" fill="${TEXT}">Champions League final?</text>
  <rect x="28" y="382" width="334" height="8" rx="4" fill="${SURF2}"/>
  <rect x="28" y="382" width="160" height="8" rx="4" fill="${YES}"/>
  <text x="28" y="406" font-family="${FONT}" font-size="11" fill="${YES}" font-weight="700">YES 48%</text>
  <text x="330" y="406" font-family="${FONT}" font-size="11" fill="${NO}" font-weight="700" text-anchor="end">NO 52%</text>
  <rect x="28" y="420" width="152" height="36" rx="10" fill="${YES}" fill-opacity="0.12" stroke="${YES}" stroke-width="1.5"/>
  <text x="104" y="442" font-family="${FONT}" font-size="12" font-weight="800" fill="${YES}" text-anchor="middle">BET YES  1.9×</text>
  <rect x="190" y="420" width="152" height="36" rx="10" fill="${NO}" fill-opacity="0.1" stroke="${NO}" stroke-width="1.5"/>
  <text x="266" y="442" font-family="${FONT}" font-size="12" font-weight="800" fill="${NO}" text-anchor="middle">BET NO  2.0×</text>
  <!-- Market Card 3 -->
  <rect x="12" y="474" width="366" height="158" rx="16" fill="${SURF}" stroke="${ACC}" stroke-width="1" stroke-opacity="0.3"/>
  <text x="28" y="498" font-family="${FONT}" font-size="10" font-weight="700" fill="#f472b6" letter-spacing="1">🌍 WORLD EVENTS</text>
  <rect x="290" y="484" width="78" height="22" rx="11" fill="${ACC}" fill-opacity="0.12" stroke="${ACC}" stroke-width="1"/>
  <text x="329" y="498" font-family="${FONT}" font-size="10" fill="${MUTED}" text-anchor="middle">⏱ 18d 6h</text>
  <text x="28" y="518" font-family="${FONT}" font-size="14" font-weight="700" fill="${TEXT}">Will the Fed cut rates in</text>
  <text x="28" y="536" font-family="${FONT}" font-size="14" font-weight="700" fill="${TEXT}">the next FOMC meeting?</text>
  <rect x="28" y="552" width="334" height="8" rx="4" fill="${SURF2}"/>
  <rect x="28" y="552" width="234" height="8" rx="4" fill="${YES}"/>
  <text x="28" y="576" font-family="${FONT}" font-size="11" fill="${YES}" font-weight="700">YES 70%</text>
  <text x="330" y="576" font-family="${FONT}" font-size="11" fill="${NO}" font-weight="700" text-anchor="end">NO 30%</text>
  <rect x="28" y="590" width="152" height="36" rx="10" fill="${YES}" fill-opacity="0.12" stroke="${YES}" stroke-width="1.5"/>
  <text x="104" y="612" font-family="${FONT}" font-size="12" font-weight="800" fill="${YES}" text-anchor="middle">BET YES  1.4×</text>
  <rect x="190" y="590" width="152" height="36" rx="10" fill="${NO}" fill-opacity="0.1" stroke="${NO}" stroke-width="1.5"/>
  <text x="266" y="612" font-family="${FONT}" font-size="12" font-weight="800" fill="${NO}" text-anchor="middle">BET NO  3.2×</text>
  <!-- Bottom nav -->
  <rect x="0" y="774" width="390" height="70" fill="${SURF}" fill-opacity="0.98"/>
  <rect x="0" y="774" width="390" height="1" fill="${ACC}" opacity="0.2"/>
  <text x="50" y="816" font-family="${FONT}" font-size="22" text-anchor="middle">⚡</text>
  <text x="50" y="832" font-family="${FONT}" font-size="9" fill="${ACC}" text-anchor="middle" font-weight="700">MARKETS</text>
  <text x="130" y="816" font-family="${FONT}" font-size="22" text-anchor="middle">📊</text>
  <text x="130" y="832" font-family="${FONT}" font-size="9" fill="${MUTED}" text-anchor="middle">MY BETS</text>
  <text x="210" y="816" font-family="${FONT}" font-size="22" text-anchor="middle">⚔️</text>
  <text x="210" y="832" font-family="${FONT}" font-size="9" fill="${MUTED}" text-anchor="middle">CLASH</text>
  <text x="290" y="816" font-family="${FONT}" font-size="22" text-anchor="middle">🏆</text>
  <text x="290" y="832" font-family="${FONT}" font-size="9" fill="${MUTED}" text-anchor="middle">LEAGUES</text>
  <text x="360" y="816" font-family="${FONT}" font-size="22" text-anchor="middle">🎯</text>
  <text x="360" y="832" font-family="${FONT}" font-size="9" fill="${MUTED}" text-anchor="middle">GOALS</text>
  <rect x="26" y="776" width="48" height="2" rx="1" fill="${ACC}"/>
</svg>`;

// ── 7. showcase-2.png — 1v1 Clash (390×844) ──────────────────────────────────
const showcase2Svg = `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844">
  <rect width="390" height="844" fill="${BG}"/>
  <defs>
    <radialGradient id="clash-glow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="${NO}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${NO}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="390" height="844" fill="url(#clash-glow)"/>
  <!-- Header -->
  <text x="20" y="28" font-family="${FONT}" font-size="14" font-weight="600" fill="${TEXT}">9:41</text>
  <rect width="390" height="64" fill="${SURF}" fill-opacity="0.96"/>
  <text x="20" y="44" font-family="${FONT}" font-size="22" font-weight="800" fill="${TEXT}">VeRdex</text>
  <text x="20" y="60" font-family="${FONT}" font-size="10" fill="${MUTED}" letter-spacing="2">HUMAN PREDICTION NETWORK</text>
  <!-- Clash header -->
  <text x="195" y="110" font-family="${FONT}" font-size="28" font-weight="900" fill="${TEXT}" text-anchor="middle">⚔️ 1v1 Clash</text>
  <text x="195" y="136" font-family="${FONT}" font-size="13" fill="${MUTED}" text-anchor="middle">Challenge any human · Winner takes 90%</text>
  <!-- Active Clash Card -->
  <rect x="12" y="152" width="366" height="240" rx="18" fill="${SURF}" stroke="${NO}" stroke-width="1.5" stroke-opacity="0.5"/>
  <text x="28" y="180" font-family="${FONT}" font-size="11" fill="${NO}" font-weight="700" letter-spacing="1">ACTIVE CLASH</text>
  <text x="338" y="180" font-family="${FONT}" font-size="11" fill="${MUTED}" text-anchor="end">⏱ 4h 12m</text>
  <text x="28" y="204" font-family="${FONT}" font-size="14" font-weight="700" fill="${TEXT}">Will ETH flip BTC market cap</text>
  <text x="28" y="222" font-family="${FONT}" font-size="14" font-weight="700" fill="${TEXT}">by end of 2026?</text>
  <!-- VS layout -->
  <rect x="28" y="238" width="148" height="90" rx="12" fill="${ACC}" fill-opacity="0.1" stroke="${ACC}" stroke-width="1.5"/>
  <text x="102" y="268" font-family="${FONT}" font-size="13" fill="${MUTED}" text-anchor="middle">You</text>
  <text x="102" y="290" font-family="${FONT}" font-size="26" font-weight="900" fill="${YES}" text-anchor="middle">YES</text>
  <text x="102" y="314" font-family="${FONT}" font-size="11" fill="${MUTED}" text-anchor="middle">@world_brian</text>
  <text x="195" y="293" font-family="${FONT}" font-size="22" font-weight="900" fill="${TEXT}" text-anchor="middle">VS</text>
  <rect x="214" y="238" width="148" height="90" rx="12" fill="${NO}" fill-opacity="0.1" stroke="${NO}" stroke-width="1.5"/>
  <text x="288" y="268" font-family="${FONT}" font-size="13" fill="${MUTED}" text-anchor="middle">Opponent</text>
  <text x="288" y="290" font-family="${FONT}" font-size="26" font-weight="900" fill="${NO}" text-anchor="middle">NO</text>
  <text x="288" y="314" font-family="${FONT}" font-size="11" fill="${MUTED}" text-anchor="middle">@crypto_jona</text>
  <!-- Stake -->
  <rect x="28" y="342" width="334" height="36" rx="10" fill="${GOLD}" fill-opacity="0.1" stroke="${GOLD}" stroke-width="1" stroke-opacity="0.5"/>
  <text x="195" y="364" font-family="${FONT}" font-size="14" font-weight="700" fill="${GOLD}" text-anchor="middle">💰 Stake: 5 WLD each  ·  Winner: 9 WLD</text>
  <!-- New clash card -->
  <rect x="12" y="408" width="366" height="180" rx="18" fill="${SURF}" stroke="${ACC}" stroke-width="1" stroke-opacity="0.35"/>
  <text x="28" y="436" font-family="${FONT}" font-size="11" fill="${ACC}" font-weight="700" letter-spacing="1">CHALLENGE A HUMAN</text>
  <text x="28" y="462" font-family="${FONT}" font-size="13" font-weight="700" fill="${TEXT}">Will WLD hit $5 before July 2026?</text>
  <text x="28" y="482" font-family="${FONT}" font-size="11" fill="${MUTED}">Choose your side, set your stake, share the link.</text>
  <!-- Stake buttons -->
  <rect x="28" y="500" width="88" height="36" rx="10" fill="${SURF2}" stroke="${ACC}" stroke-width="1"/>
  <text x="72" y="522" font-family="${FONT}" font-size="13" font-weight="700" fill="${MUTED}" text-anchor="middle">1 WLD</text>
  <rect x="124" y="500" width="88" height="36" rx="10" fill="${ACC}" fill-opacity="0.2" stroke="${ACC}" stroke-width="1.5"/>
  <text x="168" y="522" font-family="${FONT}" font-size="13" font-weight="700" fill="${ACC}" text-anchor="middle">5 WLD</text>
  <rect x="220" y="500" width="88" height="36" rx="10" fill="${SURF2}" stroke="${ACC}" stroke-width="1"/>
  <text x="264" y="522" font-family="${FONT}" font-size="13" font-weight="700" fill="${MUTED}" text-anchor="middle">10 WLD</text>
  <rect x="28" y="550" width="334" height="28" rx="8" fill="${NO}" fill-opacity="0.12" stroke="${NO}" stroke-width="1"/>
  <text x="195" y="568" font-family="${FONT}" font-size="12" font-weight="700" fill="${NO}" text-anchor="middle">⚔️ Challenge — Pick YES</text>
  <!-- Bottom nav -->
  <rect x="0" y="774" width="390" height="70" fill="${SURF}" fill-opacity="0.98"/>
  <rect x="0" y="774" width="390" height="1" fill="${ACC}" opacity="0.2"/>
  <text x="50" y="816" font-family="${FONT}" font-size="22" text-anchor="middle">⚡</text>
  <text x="50" y="832" font-family="${FONT}" font-size="9" fill="${MUTED}" text-anchor="middle">MARKETS</text>
  <text x="130" y="816" font-family="${FONT}" font-size="22" text-anchor="middle">📊</text>
  <text x="130" y="832" font-family="${FONT}" font-size="9" fill="${MUTED}" text-anchor="middle">MY BETS</text>
  <text x="210" y="816" font-family="${FONT}" font-size="22" text-anchor="middle">⚔️</text>
  <text x="210" y="832" font-family="${FONT}" font-size="9" fill="${NO}" text-anchor="middle" font-weight="700">CLASH</text>
  <rect x="186" y="776" width="48" height="2" rx="1" fill="${NO}"/>
  <text x="290" y="816" font-family="${FONT}" font-size="22" text-anchor="middle">🏆</text>
  <text x="290" y="832" font-family="${FONT}" font-size="9" fill="${MUTED}" text-anchor="middle">LEAGUES</text>
  <text x="360" y="816" font-family="${FONT}" font-size="22" text-anchor="middle">🎯</text>
  <text x="360" y="832" font-family="${FONT}" font-size="9" fill="${MUTED}" text-anchor="middle">GOALS</text>
</svg>`;

// ── 8. showcase-3.png — Leaderboard (390×844) ────────────────────────────────
const showcase3Svg = `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844">
  <rect width="390" height="844" fill="${BG}"/>
  <defs>
    <radialGradient id="lb-glow" cx="50%" cy="20%" r="50%">
      <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="390" height="844" fill="url(#lb-glow)"/>
  <!-- Header -->
  <text x="20" y="28" font-family="${FONT}" font-size="14" font-weight="600" fill="${TEXT}">9:41</text>
  <rect width="390" height="64" fill="${SURF}" fill-opacity="0.96"/>
  <text x="20" y="44" font-family="${FONT}" font-size="22" font-weight="800" fill="${TEXT}">VeRdex</text>
  <text x="20" y="60" font-family="${FONT}" font-size="10" fill="${MUTED}" letter-spacing="2">HUMAN PREDICTION NETWORK</text>
  <!-- Leaderboard title -->
  <text x="195" y="104" font-family="${FONT}" font-size="26" font-weight="900" fill="${TEXT}" text-anchor="middle">🏆 Top Forecasters</text>
  <text x="195" y="126" font-family="${FONT}" font-size="12" fill="${MUTED}" text-anchor="middle">Verified humans ranked by accuracy</text>
  <!-- #1 -->
  <rect x="12" y="140" width="366" height="70" rx="16" fill="${GOLD}" fill-opacity="0.08" stroke="${GOLD}" stroke-width="1.5"/>
  <text x="28" y="183" font-family="${FONT}" font-size="22" font-weight="900" fill="${GOLD}" text-anchor="middle">🥇</text>
  <circle cx="72" cy="175" r="20" fill="${GOLD}" fill-opacity="0.2" stroke="${GOLD}" stroke-width="1.5"/>
  <text x="72" y="181" font-family="${FONT}" font-size="14" text-anchor="middle">🦅</text>
  <text x="100" y="169" font-family="${FONT}" font-size="15" font-weight="700" fill="${TEXT}">@oracle_king</text>
  <text x="100" y="189" font-family="${FONT}" font-size="12" fill="${MUTED}">🔥 12 streak  ·  89% win rate</text>
  <text x="362" y="169" font-family="${FONT}" font-size="13" font-weight="700" fill="${GOLD}" text-anchor="end">+2,840 WLD</text>
  <text x="362" y="189" font-family="${FONT}" font-size="11" fill="${MUTED}" text-anchor="end">📋 Follow</text>
  <!-- #2 -->
  <rect x="12" y="220" width="366" height="62" rx="14" fill="${SURF}" stroke="${ACC}" stroke-width="1" stroke-opacity="0.3"/>
  <text x="28" y="257" font-family="${FONT}" font-size="20" font-weight="900" fill="#94a3b8" text-anchor="middle">🥈</text>
  <circle cx="66" cy="251" r="18" fill="${ACC}" fill-opacity="0.15" stroke="${ACC}" stroke-width="1"/>
  <text x="66" y="257" font-family="${FONT}" font-size="13" text-anchor="middle">🦁</text>
  <text x="92" y="245" font-family="${FONT}" font-size="14" font-weight="700" fill="${TEXT}">@crypto_vera</text>
  <text x="92" y="263" font-family="${FONT}" font-size="11" fill="${MUTED}">🔥 8 streak  ·  84% win rate</text>
  <text x="362" y="245" font-family="${FONT}" font-size="13" font-weight="700" fill="${TEXT}" text-anchor="end">+1,920 WLD</text>
  <text x="362" y="263" font-family="${FONT}" font-size="11" fill="${MUTED}" text-anchor="end">📋 Follow</text>
  <!-- #3 -->
  <rect x="12" y="292" width="366" height="62" rx="14" fill="${SURF}" stroke="${ACC}" stroke-width="1" stroke-opacity="0.25"/>
  <text x="28" y="329" font-family="${FONT}" font-size="20" font-weight="900" fill="#cd7f32" text-anchor="middle">🥉</text>
  <circle cx="66" cy="323" r="18" fill="${NO}" fill-opacity="0.12" stroke="${NO}" stroke-width="1"/>
  <text x="66" y="329" font-family="${FONT}" font-size="13" text-anchor="middle">🐺</text>
  <text x="92" y="317" font-family="${FONT}" font-size="14" font-weight="700" fill="${TEXT}">@signal_hawk</text>
  <text x="92" y="335" font-family="${FONT}" font-size="11" fill="${MUTED}">🔥 5 streak  ·  81% win rate</text>
  <text x="362" y="317" font-family="${FONT}" font-size="13" font-weight="700" fill="${TEXT}" text-anchor="end">+1,480 WLD</text>
  <text x="362" y="335" font-family="${FONT}" font-size="11" fill="${MUTED}" text-anchor="end">📋 Follow</text>
  <!-- #4 -->
  <rect x="12" y="364" width="366" height="60" rx="14" fill="${SURF}" stroke="${ACC}" stroke-width="1" stroke-opacity="0.2"/>
  <text x="36" y="400" font-family="${FONT}" font-size="18" font-weight="700" fill="${MUTED}" text-anchor="middle">4</text>
  <circle cx="68" cy="394" r="18" fill="${ACC}" fill-opacity="0.1"/>
  <text x="68" y="400" font-family="${FONT}" font-size="13" text-anchor="middle">🐬</text>
  <text x="94" y="388" font-family="${FONT}" font-size="14" font-weight="700" fill="${TEXT}">@verdex_reader</text>
  <text x="94" y="406" font-family="${FONT}" font-size="11" fill="${MUTED}">🔥 3 streak  ·  77% win rate</text>
  <text x="362" y="388" font-family="${FONT}" font-size="13" font-weight="700" fill="${TEXT}" text-anchor="end">+940 WLD</text>
  <text x="362" y="406" font-family="${FONT}" font-size="11" fill="${YES}" text-anchor="end" font-weight="700">✓ Following</text>
  <!-- #5 -->
  <rect x="12" y="434" width="366" height="60" rx="14" fill="${SURF}" stroke="${ACC}" stroke-width="1" stroke-opacity="0.15"/>
  <text x="36" y="470" font-family="${FONT}" font-size="18" font-weight="700" fill="${MUTED}" text-anchor="middle">5</text>
  <circle cx="68" cy="464" r="18" fill="${GOLD}" fill-opacity="0.1"/>
  <text x="68" y="470" font-family="${FONT}" font-size="13" text-anchor="middle">🦊</text>
  <text x="94" y="458" font-family="${FONT}" font-size="14" font-weight="700" fill="${TEXT}">@world_predict</text>
  <text x="94" y="476" font-family="${FONT}" font-size="11" fill="${MUTED}">2 streak  ·  74% win rate</text>
  <text x="362" y="458" font-family="${FONT}" font-size="13" font-weight="700" fill="${TEXT}" text-anchor="end">+670 WLD</text>
  <text x="362" y="476" font-family="${FONT}" font-size="11" fill="${MUTED}" text-anchor="end">📋 Follow</text>
  <!-- Your rank banner -->
  <rect x="12" y="514" width="366" height="54" rx="14" fill="${ACC}" fill-opacity="0.12" stroke="${ACC}" stroke-width="1.5"/>
  <text x="28" y="541" font-family="${FONT}" font-size="13" fill="${MUTED}">Your rank:</text>
  <text x="100" y="541" font-family="${FONT}" font-size="14" font-weight="800" fill="${ACC}">#38</text>
  <text x="140" y="541" font-family="${FONT}" font-size="12" fill="${MUTED}">·  68% win rate  ·  0 streak</text>
  <text x="362" y="541" font-family="${FONT}" font-size="12" fill="${GOLD}" text-anchor="end">+220 WLD</text>
  <!-- Copy following section -->
  <text x="20" y="596" font-family="${FONT}" font-size="15" font-weight="700" fill="${TEXT}">📋 Following (Copy Feed)</text>
  <rect x="12" y="610" width="366" height="56" rx="14" fill="${SURF}"/>
  <text x="28" y="638" font-family="${FONT}" font-size="13" fill="${TEXT}" font-weight="600">@verdex_reader  bet YES on BTC $120k</text>
  <text x="28" y="656" font-family="${FONT}" font-size="11" fill="${MUTED}">2 min ago · 2 WLD · potential +4.2 WLD</text>
  <rect x="320" y="620" width="50" height="28" rx="10" fill="${YES}" fill-opacity="0.15" stroke="${YES}" stroke-width="1"/>
  <text x="345" y="639" font-family="${FONT}" font-size="12" font-weight="700" fill="${YES}" text-anchor="middle">Copy</text>
  <!-- Bottom nav -->
  <rect x="0" y="774" width="390" height="70" fill="${SURF}" fill-opacity="0.98"/>
  <rect x="0" y="774" width="390" height="1" fill="${ACC}" opacity="0.2"/>
  <text x="50" y="816" font-family="${FONT}" font-size="22" text-anchor="middle">⚡</text>
  <text x="50" y="832" font-family="${FONT}" font-size="9" fill="${MUTED}" text-anchor="middle">MARKETS</text>
  <text x="130" y="816" font-family="${FONT}" font-size="22" text-anchor="middle">📊</text>
  <text x="130" y="832" font-family="${FONT}" font-size="9" fill="${MUTED}" text-anchor="middle">MY BETS</text>
  <text x="210" y="816" font-family="${FONT}" font-size="22" text-anchor="middle">⚔️</text>
  <text x="210" y="832" font-family="${FONT}" font-size="9" fill="${MUTED}" text-anchor="middle">CLASH</text>
  <text x="290" y="816" font-family="${FONT}" font-size="22" text-anchor="middle">🏆</text>
  <text x="290" y="832" font-family="${FONT}" font-size="9" fill="${GOLD}" text-anchor="middle" font-weight="700">LEAGUES</text>
  <rect x="266" y="776" width="48" height="2" rx="1" fill="${GOLD}"/>
  <text x="360" y="816" font-family="${FONT}" font-size="22" text-anchor="middle">🎯</text>
  <text x="360" y="832" font-family="${FONT}" font-size="9" fill="${MUTED}" text-anchor="middle">GOALS</text>
</svg>`;

// ── Render all images ────────────────────────────────────────────────────────
const images = [
  { name: "icon-1024.png", svg: iconSvg, w: 1024, h: 1024 },
  { name: "logo-512.png", svg: logo512Svg, w: 512, h: 512 },
  { name: "content-card.png", svg: contentCardSvg, w: 288, h: 288 },
  { name: "meta-tag.png", svg: metaSvg, w: 1200, h: 630 },
  { name: "hero.png", svg: heroSvg, w: 1920, h: 1080 },
  { name: "showcase-1.png", svg: showcase1Svg, w: 390, h: 844 },
  { name: "showcase-2.png", svg: showcase2Svg, w: 390, h: 844 },
  { name: "showcase-3.png", svg: showcase3Svg, w: 390, h: 844 },
];

let done = 0;
images.forEach(({ name, svg, w, h }) => {
  sharp(Buffer.from(svg))
    .resize(w, h)
    .png({ compressionLevel: 8 })
    .toFile(path.join(out, name), (err, info) => {
      if (err) { console.error(`✗ ${name}:`, err.message); return; }
      console.log(`✓ ${name}  ${Math.round(info.size / 1024)}KB`);
      done++;
      if (done === images.length) console.log("\nAll VeRdex images generated ✓");
    });
});
