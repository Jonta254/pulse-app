/**
 * Stitches promo/frame-*.png into a vertical promo video (1080x1920, 30fps).
 * Each frame holds ~2.2s with a subtle zoom-in (Ken Burns) and crossfades.
 * Run AFTER gen-promo.js:  node scripts/make-promo-video.js
 * Output: promo/verdex-promo.mp4 (silent — add a trending sound in CapCut/TikTok)
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("ffmpeg-static");

const dir = path.join(__dirname, "../promo");
const frames = fs.readdirSync(dir).filter((f) => /^frame-\d+\.png$/.test(f)).sort();
if (frames.length === 0) throw new Error("Run gen-promo.js first.");

const HOLD = 2.2;       // seconds per frame
const FADE = 0.45;      // crossfade duration
const FPS = 30;

const inputs = [];
const filters = [];

frames.forEach((f, i) => {
  inputs.push("-loop", "1", "-t", String(HOLD + FADE), "-i", path.join(dir, f));
  // Slow zoom 1.00 -> 1.06 over the hold for a living, premium feel
  filters.push(
    `[${i}:v]scale=2160:3840,zoompan=z='1+0.06*on/${Math.round((HOLD + FADE) * FPS)}':d=${Math.round((HOLD + FADE) * FPS)}:s=1080x1920:fps=${FPS},format=yuv420p[v${i}]`
  );
});

// Chain crossfades
let last = "v0";
for (let i = 1; i < frames.length; i++) {
  const outLabel = i === frames.length - 1 ? "vout" : `x${i}`;
  const offset = (HOLD * i).toFixed(2);
  filters.push(`[${last}][v${i}]xfade=transition=fade:duration=${FADE}:offset=${offset}[${outLabel}]`);
  last = outLabel;
}

const outFile = path.join(dir, "verdex-promo.mp4");
const args = [
  "-y",
  ...inputs,
  "-filter_complex", filters.join(";"),
  "-map", "[vout]",
  "-c:v", "libx264", "-preset", "medium", "-crf", "20",
  "-movflags", "+faststart",
  outFile,
];

console.log("Rendering video — this takes a minute…");
execFileSync(ffmpeg, args, { stdio: "inherit" });
console.log(`\n✓ ${outFile}`);
console.log("Duration ~" + (HOLD * frames.length + FADE).toFixed(1) + "s, 1080x1920, 30fps, silent.");
console.log("Add a trending sound in CapCut/TikTok for maximum reach.");
