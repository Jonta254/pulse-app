/**
 * Synthesizes a dark 128-BPM electronic promo beat with ffmpeg — kick,
 * hi-hats, detuned sub pad, and a noise riser into a final impact.
 * Run: node scripts/make-beat.js [seconds]   → promo/beat.wav
 */
const { execFileSync } = require("child_process");
const path = require("path");
const ffmpeg = require("ffmpeg-static");

const DUR = Number(process.argv[2]) || 20;
const out = path.join(__dirname, "../promo/beat.wav");

const B = 60 / 128; // one beat at 128bpm ≈ 0.469s

// Kick: 55Hz sine with fast pitch+amp decay, every beat
const kick = `aevalsrc='0.9*sin(2*PI*(55+60*exp(-40*mod(t,${B})))*mod(t,${B}))*exp(-22*mod(t,${B}))':d=${DUR}:s=44100`;

// Sub pad: two detuned saw-ish sines, slow swell (dark synthwave bed)
const pad = `aevalsrc='0.16*(sin(2*PI*55*t)+0.8*sin(2*PI*55.4*t)+0.5*sin(2*PI*110.2*t))*(0.6+0.4*sin(2*PI*t/4))':d=${DUR}:s=44100`;

// Riser: white noise swelling over the last 3.5 seconds into the CTA
const riserStart = Math.max(0, DUR - 3.5);

const filter = [
  `[0:a]volume=1.0[k]`,
  // Hats: gated noise on the off-beats, bright
  `[1:a]highpass=f=7000,volume='if(lt(mod(t+${(B / 2).toFixed(4)},${B}),0.06),0.5,0)':eval=frame[h]`,
  `[2:a]volume=1.0[p]`,
  // Riser: lowpassed noise ramping up, cuts at the very end
  `[3:a]lowpass=f=3000,volume='if(gte(t,${riserStart}),0.55*(t-${riserStart})/3.5,0)':eval=frame[r]`,
  `[k][h][p][r]amix=inputs=4:normalize=0,acompressor=threshold=-12dB:ratio=4:attack=5:release=120,alimiter=limit=0.9,loudnorm=I=-14:TP=-1.5[aout]`,
].join(";");

const args = [
  "-y",
  "-f", "lavfi", "-i", kick,
  "-f", "lavfi", "-i", `anoisesrc=color=white:d=${DUR}:r=44100:a=0.7`,
  "-f", "lavfi", "-i", pad,
  "-f", "lavfi", "-i", `anoisesrc=color=pink:d=${DUR}:r=44100:a=0.8`,
  "-filter_complex", filter,
  "-map", "[aout]",
  "-t", String(DUR),
  out,
];

console.log(`Synthesizing ${DUR}s beat at 128bpm…`);
execFileSync(ffmpeg, args, { stdio: "inherit" });
console.log("✓ " + out);
