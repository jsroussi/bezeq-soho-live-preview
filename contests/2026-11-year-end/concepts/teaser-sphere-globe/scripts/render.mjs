// Renders a cut frame by frame (fixed 1/fps steps, no clock) in headless Chromium with SwiftShader WebGL and every
// network request aborted, scores it (scripts/audio.mjs), normalises the sound and encodes H.264 + AAC with ffmpeg.
//   node scripts/render.mjs master|vertical|whatsapp|all
// Frames go to build/<cut>/frames (ignored), the MP4 to out/ (ignored: never committed).
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { DIR, BUILD, OUT, CUTS, launch, renderBand, openTeaser } from './lib.mjs';

const args = process.argv.slice(2);
const which = args[0] || 'master';
const workers = 4; // pages rendering in parallel
const NAMES = { master: 'teaser-sphere-globe-16x9.mp4', vertical: 'teaser-sphere-globe-9x16.mp4', whatsapp: 'teaser-sphere-globe-whatsapp-15s.mp4' };

const ff = (a) => execFileSync('ffmpeg', ['-hide_banner', '-y', ...a], { cwd: DIR, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const ffErr = (a) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...a], { cwd: DIR, encoding: 'utf8' }).stderr; // ffmpeg reports on stderr

export async function renderFrames(cutId, frames, dir, env = {}) {
  const browser = await launch();
  const band = await renderBand(browser);
  const blocked = [];
  const chunks = Array.from({ length: workers }, (_, w) => frames.filter((_, i) => i % workers === w));
  await Promise.all(chunks.map(async (list, w) => {
    const page = await openTeaser(browser, cutId, band, blocked);
    if (w === 0) Object.assign(env, await page.evaluate(() => ({ ...window.teaser.env, fontsOk: window.teaser.fontsOk })));
    for (const f of list) {
      await page.evaluate((t) => window.teaser.frame(t), f / CUTS[cutId].fps);
      await page.screenshot({ path: join(dir, `${String(f).padStart(5, '0')}.png`), animations: 'disabled', caret: 'hide' });
    }
    await page.close();
  }));
  env.chromium = browser.version(); env.blockedRequests = blocked;
  await browser.close();
  if (blocked.length) throw new Error(`network requests were attempted: ${blocked.join(', ')}`);
  if (!env.fontsOk) throw new Error('Simpler was not loaded (document.fonts.check failed)');
  return env;
}

async function renderCut(cutId) {
  const cut = CUTS[cutId], n = Math.round(cut.duration * cut.fps), dir = join(BUILD, cutId, 'frames');
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true }); mkdirSync(OUT, { recursive: true });
  const t0 = Date.now();
  const env = await renderFrames(cutId, [...Array(n).keys()], dir);
  console.log(`${cutId}: ${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

  // score → two-pass loudnorm (linear) to about -16 LUFS integrated, ≤ -1 dBTP
  const raw = join(BUILD, cutId, 'score.wav'), wav = join(BUILD, cutId, 'score-norm.wav');
  // the owner's Suno track (suno/<cut>.mp3, else suno/track.mp3), when it is there: trimmed and faded to the cut,
  // the effects laid over it (suno/brief.md)
  const suno = [`suno/${cutId}.mp3`, 'suno/track.mp3'].map((f) => join(DIR, f)).find(existsSync);
  if (suno) {
    const sfx = join(BUILD, cutId, 'sfx.wav');
    execFileSync('node', [join(DIR, 'scripts/audio.mjs'), cutId, sfx, 'sfx'], { stdio: 'inherit' });
    ff(['-i', suno, '-i', sfx, '-filter_complex', `[0:a]aresample=48000,atrim=0:${cut.duration},asetpts=N/SR/TB,afade=t=in:d=0.3,afade=t=out:st=${cut.duration - 1.8}:d=1.8[m];[m][1:a]amix=inputs=2:duration=longest:normalize=0`, '-ar', '48000', '-ac', '2', raw]);
  } else execFileSync('node', [join(DIR, 'scripts/audio.mjs'), cutId, raw], { stdio: 'inherit' });
  const m = JSON.parse(ffErr(['-i', raw, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']).match(/\{[\s\S]*\}/)[0]);
  ff(['-i', raw, '-af', `loudnorm=I=-16:TP=-1.5:LRA=11:linear=true:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset},aresample=48000`, '-ar', '48000', wav]);

  const mp4 = join(OUT, NAMES[cutId]);
  const crf = cutId === 'whatsapp' ? '23' : '18';
  ff(['-framerate', String(cut.fps), '-i', join(dir, '%05d.png'), '-i', wav, '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1', '-r', String(cut.fps),
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', mp4]);
  writeFileSync(join(BUILD, cutId, 'render-env.json'), JSON.stringify({ cut: cutId, frames: n, ...env }, null, 2));
  console.log(`${cutId}: ${mp4}`);
  return env;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const c of which === 'all' ? Object.keys(CUTS) : [which]) await renderCut(c);
}
