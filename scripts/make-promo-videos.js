/**
 * Renders ALL promo videos (1080x1920, 30fps) with the synthesized beat,
 * Ken Burns zoom, and per-video transition styles.
 *
 * Run order:
 *   node scripts/gen-promo.js
 *   node scripts/gen-promo-extra.js
 *   node scripts/make-beat.js 22
 *   node scripts/make-promo-videos.js
 *
 * Outputs:
 *   promo/verdex-hype.mp4      (8 scenes — the full story)
 *   promo/verdex-payout.mp4    (5 scenes — the on-chain proof story)
 *   promo/verdex-worldcup.mp4  (4 scenes — football special)
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("ffmpeg-static");

const dir = path.join(__dirname, "../promo");
const beat = path.join(dir, "beat.wav");
const FPS = 30;

function render({ prefix, outName, hold, fade, transitions }) {
  const frames = fs.readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith(".png")).sort();
  if (frames.length === 0) { console.log(`(skip ${outName} — no ${prefix}* frames)`); return; }

  const inputs = [];
  const filters = [];
  frames.forEach((f, i) => {
    inputs.push("-loop", "1", "-t", String(hold + fade), "-i", path.join(dir, f));
    filters.push(
      `[${i}:v]scale=2160:3840,zoompan=z='1+0.07*on/${Math.round((hold + fade) * FPS)}':d=${Math.round((hold + fade) * FPS)}:s=1080x1920:fps=${FPS},format=yuv420p[v${i}]`
    );
  });

  let last = "v0";
  for (let i = 1; i < frames.length; i++) {
    const outLabel = i === frames.length - 1 ? "vout" : `x${i}`;
    const tr = transitions[(i - 1) % transitions.length];
    filters.push(`[${last}][v${i}]xfade=transition=${tr}:duration=${fade}:offset=${(hold * i).toFixed(2)}[${outLabel}]`);
    last = outLabel;
  }

  const duration = (hold * frames.length + fade).toFixed(2);
  const outFile = path.join(dir, outName);
  const hasBeat = fs.existsSync(beat);

  const args = [
    "-y",
    ...inputs,
    ...(hasBeat ? ["-i", beat] : []),
    "-filter_complex",
    filters.join(";") + (hasBeat ? `;[${frames.length}:a]atrim=0:${duration},afade=t=out:st=${(duration - 1.2).toFixed(2)}:d=1.2[aout]` : ""),
    "-map", "[vout]",
    ...(hasBeat ? ["-map", "[aout]"] : []),
    // xfade negotiates yuv444p, which phones/WhatsApp can't decode —
    // force the universally playable 4:2:0 High profile
    "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.0",
    "-c:v", "libx264", "-preset", "medium", "-crf", "20",
    ...(hasBeat ? ["-c:a", "aac", "-b:a", "160k"] : []),
    "-movflags", "+faststart",
    "-t", duration,
    outFile,
  ];

  console.log(`Rendering ${outName} (${frames.length} scenes, ~${duration}s)…`);
  execFileSync(ffmpeg, args, { stdio: ["ignore", "ignore", "inherit"] });
  console.log("✓ " + outFile);
}

render({ prefix: "frame-",  outName: "verdex-hype.mp4",     hold: 2.2, fade: 0.45, transitions: ["fade", "slideleft", "circleopen", "fade", "slideup", "fadeblack", "circlecrop"] });
render({ prefix: "payout-", outName: "verdex-payout.mp4",   hold: 2.6, fade: 0.5,  transitions: ["fadeblack", "slideleft", "circleopen", "fade"] });
render({ prefix: "wc-",     outName: "verdex-worldcup.mp4", hold: 2.6, fade: 0.5,  transitions: ["slideup", "circleopen", "fadeblack"] });

console.log("\nAll videos rendered with the built-in beat. For socials you can still swap in a trending sound.");
