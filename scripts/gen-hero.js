const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const os = require('os');
const outDir = path.join(os.tmpdir(), 'pulse-assets');
fs.mkdirSync(outDir, { recursive: true });

const hero = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#07091a"/>
      <stop offset="50%" stop-color="#0d1228"/>
      <stop offset="100%" stop-color="#111930"/>
    </linearGradient>
    <linearGradient id="bolt" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818cf8"/><stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>
    <radialGradient id="g1" cx="20%" cy="50%" r="35%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="80%" cy="50%" r="30%">
      <stop offset="0%" stop-color="#00e887" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#00e887" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="1920" height="1080" fill="url(#bg)"/>
  <rect width="1920" height="1080" fill="url(#g1)"/>
  <rect width="1920" height="1080" fill="url(#g2)"/>
  <line x1="0" y1="360" x2="1920" y2="360" stroke="#6366f1" stroke-width="0.8" opacity="0.1"/>
  <line x1="0" y1="720" x2="1920" y2="720" stroke="#6366f1" stroke-width="0.8" opacity="0.1"/>
  <line x1="640" y1="0" x2="640" y2="1080" stroke="#6366f1" stroke-width="0.8" opacity="0.1"/>
  <line x1="1280" y1="0" x2="1280" y2="1080" stroke="#6366f1" stroke-width="0.8" opacity="0.1"/>
  <g transform="translate(160,200) scale(2.2)" filter="url(#glow)" opacity="0.95">
    <polygon points="195,80 135,200 168,200 148,310 238,165 198,165 218,80" fill="url(#bolt)"/>
    <polygon points="148,310 156,278 172,294" fill="#00e887"/>
  </g>
  <line x1="580" y1="120" x2="580" y2="960" stroke="#6366f1" stroke-width="1.5" opacity="0.25"/>
  <text x="640" y="320" font-family="system-ui,-apple-system,sans-serif" font-size="170" font-weight="900" fill="white" letter-spacing="24" opacity="0.97">PULSE</text>
  <text x="646" y="420" font-family="system-ui,-apple-system,sans-serif" font-size="44" font-weight="400" fill="#818cf8" letter-spacing="6">HUMAN PREDICTION NETWORK</text>
  <rect x="646" y="454" width="180" height="4" rx="2" fill="#6366f1" opacity="0.7"/>
  <g transform="translate(646,500)">
    <rect width="220" height="80" rx="14" fill="#6366f1" fill-opacity="0.15" stroke="#6366f1" stroke-width="1.5" stroke-opacity="0.4"/>
    <text x="110" y="34" font-family="system-ui" font-size="32" font-weight="700" fill="#00e887" text-anchor="middle">ZERO BOTS</text>
    <text x="110" y="60" font-family="system-ui" font-size="18" fill="#818cf8" text-anchor="middle">World ID Verified</text>
  </g>
  <g transform="translate(890,500)">
    <rect width="220" height="80" rx="14" fill="#6366f1" fill-opacity="0.15" stroke="#6366f1" stroke-width="1.5" stroke-opacity="0.4"/>
    <text x="110" y="34" font-family="system-ui" font-size="32" font-weight="700" fill="white" text-anchor="middle">WLD STAKES</text>
    <text x="110" y="60" font-family="system-ui" font-size="18" fill="#818cf8" text-anchor="middle">YES / NO Markets</text>
  </g>
  <g transform="translate(1134,500)">
    <rect width="220" height="80" rx="14" fill="#ff4d6d" fill-opacity="0.12" stroke="#ff4d6d" stroke-width="1.5" stroke-opacity="0.4"/>
    <text x="110" y="34" font-family="system-ui" font-size="32" font-weight="700" fill="#ff6b8a" text-anchor="middle">1v1 CLASH</text>
    <text x="110" y="60" font-family="system-ui" font-size="18" fill="#818cf8" text-anchor="middle">90% to winner</text>
  </g>
  <g transform="translate(1378,500)">
    <rect width="220" height="80" rx="14" fill="#fbbf24" fill-opacity="0.1" stroke="#fbbf24" stroke-width="1.5" stroke-opacity="0.35"/>
    <text x="110" y="34" font-family="system-ui" font-size="32" font-weight="700" fill="#fbbf24" text-anchor="middle">STREAKS</text>
    <text x="110" y="60" font-family="system-ui" font-size="18" fill="#818cf8" text-anchor="middle">Up to 1.5x bonus</text>
  </g>
  <text x="646" y="660" font-family="system-ui" font-size="32" fill="#a5b4fc">Predict crypto, sports, world events and culture.</text>
  <text x="646" y="706" font-family="system-ui" font-size="32" fill="#a5b4fc">Earn WLD. Copy top forecasters. Challenge anyone 1v1.</text>
  <text x="646" y="752" font-family="system-ui" font-size="32" fill="#a5b4fc">Flash markets every hour. AI generates fresh predictions daily.</text>
  <g transform="translate(646,800)">
    <rect width="320" height="56" rx="28" fill="#6366f1"/>
    <text x="160" y="36" font-family="system-ui" font-size="22" font-weight="700" fill="white" text-anchor="middle">Open in World App</text>
  </g>
  <g transform="translate(990,800)">
    <rect width="280" height="56" rx="28" fill="#1a1f3a" stroke="#6366f1" stroke-width="2"/>
    <text x="140" y="36" font-family="system-ui" font-size="20" fill="#818cf8" text-anchor="middle">Powered by World ID</text>
  </g>
  <text x="1600" y="960" font-family="system-ui" font-size="22" fill="#4a5568" text-anchor="middle">pulse-app-zeta-virid.vercel.app</text>
</svg>`;

sharp(Buffer.from(hero))
  .resize(1920, 1080)
  .png({ compressionLevel: 9 })
  .toFile(path.join(outDir, 'hero.png'), (e, i) => {
    if (e) { console.error('hero error:', e.message); process.exit(1); }
    console.log('hero', Math.round(i.size / 1024) + 'KB');
  });
