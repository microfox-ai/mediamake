/**
 * generated: the studio files that are built, never committed (git ignores them), made when they are
 * missing or their sources changed. Today that is the mediamake presets: src/mediamake/presets.json
 * and src/mediamake/html-text.ts, built by `mm sync-presets` from apps/mediamake (the editor's preset
 * registry and its caption helpers), so a pull or a branch switch never leaves an edited copy behind
 * and a preset change in the app reaches the studio without a commit of its own.
 *
 * The build records the files it read and their hashes in src/mediamake/.presets.inputs.json; a
 * check rehashes just those (a few dozen small files, milliseconds), so `mm` runs it before every
 * command, and the studio's postinstall, preview and type-check do too.
 *
 *   node scripts/generated.mjs [--soft] [--quiet]   build what is missing or stale (--soft: warn, never fail)
 *   node scripts/generated.mjs --check              exit 1 when something would be rebuilt
 *
 * Plain JavaScript, so bin/mm.mjs can import it without type stripping.
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const PRESETS_OUT = ['src/mediamake/presets.json', 'src/mediamake/html-text.ts'];
export const PRESETS_INPUTS = 'src/mediamake/.presets.inputs.json';

export const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** Why the presets need building in an app folder (missing, or which input changed), or null when they are current. */
export const presetsStale = (app = APP) => {
  const missing = PRESETS_OUT.find(f => !fs.existsSync(path.join(app, f)));
  if (missing) return `${missing} is missing`;
  let stamp;
  try {
    stamp = JSON.parse(fs.readFileSync(path.join(app, PRESETS_INPUTS), 'utf8'));
  } catch {
    return 'no record of what it was built from';
  }
  for (const [rel, hash] of Object.entries(stamp.inputs ?? {})) {
    const abs = path.resolve(app, rel);
    if (!fs.existsSync(abs)) return `${rel} is gone`;
    if (sha(abs) !== hash) return `${rel} changed`;
  }
  for (const [rel, hash] of Object.entries(stamp.outputs ?? {})) {
    const abs = path.join(app, rel);
    if (!fs.existsSync(abs) || sha(abs) !== hash) return `${rel} was edited`;
  }
  return null;
};

/**
 * Builds the presets in `app` when they are missing or stale: { built, why }. Throws when the build
 * fails (with soft: false), else warns and keeps what is there.
 */
export const ensurePresets = (app = APP, { soft = false, quiet = false } = {}) => {
  const why = presetsStale(app);
  if (!why) return { built: false };
  if (!quiet) console.error(`ℹ building the mediamake presets (${why}) …`);
  const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings=ExperimentalWarning', path.join(app, 'scripts', 'sync-presets.ts'), '--quiet'], {
    cwd: app,
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    const msg = `mm sync-presets failed: ${(r.stderr || r.stdout || String(r.error ?? '')).trim().split('\n').slice(-5).join('\n')}`;
    if (!soft) throw new Error(msg);
    console.error(`⚠ ${msg}\n  ${fs.existsSync(path.join(app, PRESETS_OUT[0])) ? 'Rendering with the presets built before.' : 'Renders and type-check need them: run mm sync-presets once it builds.'}`);
    return { built: false, why, failed: true };
  }
  return { built: true, why };
};

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  if (args.includes('--check')) {
    const why = presetsStale();
    console.log(why ? `✖ presets: ${why}` : '✔ presets are current');
    process.exit(why ? 1 : 0);
  }
  try {
    const r = ensurePresets(APP, { soft: args.includes('--soft'), quiet: args.includes('--quiet') });
    if (r.built && !args.includes('--quiet')) console.error('✔ presets built');
  } catch (err) {
    console.error(`✖ ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
