/**
 * Regenerates the in-app logo assets (public/icon-1024.png, public/logo-512.png,
 * public/logo.svg) with the twin-blades VeRdex mark.
 * Run: node scripts/gen-logo-assets.js
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const pub = path.join(__dirname, "../public");

function markSvg(canvas, pad) {
  const inner = canvas - pad * 2;
  const k = inner / 200;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}">
  <defs>
    <linearGradient id="bl" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#a78bfa"/><stop offset="45%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#3b1a8c"/>
    </linearGradient>
    <linearGradient id="br" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fde68a"/><stop offset="45%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#8a4d04"/>
    </linearGradient>
    <linearGradient id="cd" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#0d9488"/><stop offset="100%" stop-color="#5eead4"/>
    </linearGradient>
    <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#2dd4bf"/>
    </linearGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.8"/><stop offset="100%" stop-color="#f59e0b" stop-opacity="0.8"/>
    </linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="${canvas * 0.004}"/></filter>
  </defs>
  <rect width="${canvas}" height="${canvas}" rx="${canvas * 0.21}" fill="#060812"/>
  <rect x="${canvas * 0.012}" y="${canvas * 0.012}" width="${canvas * 0.976}" height="${canvas * 0.976}" rx="${canvas * 0.2}" fill="none" stroke="url(#edge)" stroke-width="${canvas * 0.006}" opacity="0.7"/>
  <g transform="translate(${pad},${pad}) scale(${k})">
    <circle cx="100" cy="84" r="60" fill="none" stroke="url(#rg)" stroke-width="5" opacity="0.3" filter="url(#soft)"/>
    <circle cx="100" cy="84" r="60" fill="none" stroke="url(#rg)" stroke-width="2.4" opacity="0.9"/>
    <g>
      <rect x="74" y="96" width="11" height="26" rx="2" fill="url(#cd)"/><rect x="78.5" y="88" width="2.5" height="9" fill="#5eead4"/>
      <rect x="92" y="80" width="11" height="42" rx="2" fill="url(#cd)"/><rect x="96.5" y="70" width="2.5" height="11" fill="#5eead4"/>
      <rect x="110" y="62" width="11" height="60" rx="2" fill="url(#cd)"/><rect x="114.5" y="50" width="2.5" height="13" fill="#5eead4"/>
      <rect x="128" y="44" width="11" height="78" rx="2" fill="url(#cd)"/><rect x="132.5" y="31" width="2.5" height="14" fill="#5eead4"/>
    </g>
    <polygon points="22,34 56,62 104,170 64,116" fill="url(#bl)"/>
    <polygon points="22,34 56,62 82,120 46,82" fill="#c4b5fd" opacity="0.35"/>
    <polygon points="178,34 144,62 96,170 136,116" fill="url(#br)"/>
    <polygon points="178,34 144,62 118,120 154,82" fill="#fef3c7" opacity="0.4"/>
    <ellipse cx="100" cy="178" rx="62" ry="13" fill="none" stroke="#8b5cf6" stroke-width="2.4" opacity="0.55"/>
    <ellipse cx="100" cy="178" rx="40" ry="8" fill="none" stroke="#2dd4bf" stroke-width="2" opacity="0.7"/>
    <path d="M84,178 L97,156 L100,148 L103,156 L116,178" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linejoin="round" opacity="0.9"/>
  </g>
</svg>`;
}

async function main() {
  await sharp(Buffer.from(markSvg(1024, 150))).png().toFile(path.join(pub, "icon-1024.png"));
  console.log("✓ public/icon-1024.png");
  await sharp(Buffer.from(markSvg(512, 76))).png().toFile(path.join(pub, "logo-512.png"));
  console.log("✓ public/logo-512.png");
  fs.writeFileSync(path.join(pub, "logo.svg"), markSvg(512, 76));
  console.log("✓ public/logo.svg");
}

main().catch((e) => { console.error(e); process.exit(1); });
