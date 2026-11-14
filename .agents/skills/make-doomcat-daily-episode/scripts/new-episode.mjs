#!/usr/bin/env node
// new-episode: start a Doomcat episode on the shared Doomcat world (projects/_doomcat-world: the cat, the hand-drawn
// look, the engine and the growing library of places and props). The episode holds only what is its own: the
// storyboard, its story hooks and real pages, the voice, the sound-effects cues and its lessons. --wide also starts
// the landscape twin (<slug>-wide), which plays the same storyboard re-framed for 16:9.
//
//   node ~/.claude/skills/make-doomcat-daily-episode/scripts/new-episode.mjs <slug> [--wide] [--title="Doomcat · …"] [--dry-run]
//
// <slug>  the new project folder under <workspace>/projects (lowercase, dashes), e.g. doomcat-ep2-<idea>
// Nothing is overwritten: it stops if a target folder exists. Placeholders (an empty voice, silent sound stems) let the
// project open and render before the voice and the sound exist; the voice step and the mixers replace them.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = k => args.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const has = k => args.includes(`--${k}`);
const [slug] = args.filter(a => !a.startsWith('--'));
const DRY = has('dry-run');
if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug) || slug.endsWith('-wide')) {
  console.error('Usage: new-episode.mjs <slug> [--wide] [--title="…"] [--dry-run]   (a slug of lowercase letters, digits and dashes)');
  process.exit(1);
}
const home = os.homedir();
const expand = p => (p.startsWith('~') ? path.join(home, p.slice(1)) : p);
const workspace = () => {
  if (process.env.MEDIAMAKE_WORKSPACE) return expand(process.env.MEDIAMAKE_WORKSPACE);
  try {
    const c = JSON.parse(fs.readFileSync(path.join(home, '.mediamake/config.json'), 'utf8'));
    if (c.workspace) return expand(c.workspace);
  } catch {}
  return path.join(home, 'MediaMake');
};
const WS = workspace();
const PROJECTS = path.join(WS, 'projects');
const WORLD = path.join(PROJECTS, '_doomcat-world');
if (!fs.existsSync(path.join(WORLD, 'lib/Episode.tsx'))) { console.error(`No Doomcat world at ${WORLD} (lib/Episode.tsx).`); process.exit(1); }
const dest = path.join(PROJECTS, slug);
const twin = path.join(PROJECTS, `${slug}-wide`);
// a folder that only holds the production's registration (mm media production new writes mediamake.json) is new
const fresh = d => !fs.existsSync(d) || fs.readdirSync(d).every(f => ['mediamake.json', '.DS_Store'].includes(f));
for (const d of [dest, ...(has('wide') ? [twin] : [])]) if (!fresh(d)) { console.error(`${path.relative(WS, d)} exists: nothing done.`); process.exit(1); }
const title = opt('title') ?? `Doomcat · ${slug}`;
const today = new Date().toISOString().slice(0, 10);

const write = (p, text) => {
  if (DRY) return console.log(`  write ${path.relative(WS, p)}`);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
};
/** a second of silence, so a sound layer has a file to play until its mixer writes the real one */
const silence = p => {
  if (DRY) return console.log(`  write ${path.relative(WS, p)} (1 s of silence)`);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', '1', '-c:a', 'pcm_s16le', p]);
};
const engine = (() => {
  try { return fs.readFileSync(path.join(WORLD, 'input/project.json'), 'utf8'); } catch {}
  for (const n of ['doomcat-desk', 'doomcat-desk-wide']) {
    try { return fs.readFileSync(path.join(PROJECTS, n, 'input/project.json'), 'utf8'); } catch {}
  }
  return null;
})();
const manifest = (s, t, src) => JSON.stringify({
  version: 1, slug: s, title: t, artist: 'Doomcat', preparedAt: new Date().toISOString(),
  audio: { src, duration: 1 }, lyrics: [], sections: [], beats: { bpm: null, list: [] }, energy: { rate: 10, values: [] }, assets: {},
  brief: 'A Doomcat episode in the scribble look (three.js, built in code) on the shared Doomcat world (projects/_doomcat-world).',
}, null, 1) + '\n';
const W = '../../_doomcat-world/lib';

// ---------------------------------------------------------------- the vertical (9:16) episode
console.log(`${slug}:`);
write(path.join(dest, 'video/index.tsx'), `import { defineProject, layer } from '@mediamake/engine';
import manifest from '../manifest.json';
import { Music } from '../lib/Music';
import { Sfx } from '../lib/Sfx';
import { Show } from '../lib/Show';

// ${title}: the storyboard (lib/shots.ts) played by the Doomcat world's engine (projects/_doomcat-world), the sound
// effects stem (lib/sfx-cues.ts → input/sfx-mix.wav) and the show's jazz bed (input/music-bed.wav) under the voice.
const TAIL = 2.24; // the closing word beat holds after the voice ends
const END = Math.ceil((manifest.audio.duration + TAIL) * 24) / 24;
export default defineProject({
  id: '${slug}',
  fps: 24,
  width: 1080,
  height: 1920,
  tail: TAIL,
  layers: [
    layer({ scene: Show, props: {}, at: { from: 0, to: END }, name: 'episode' }),
    layer({ scene: Sfx, props: {}, at: { from: 0, to: END }, name: 'sfx' }),
    layer({ scene: Music, props: {}, at: { from: 0, to: END }, name: 'music' }),
  ],
});
`);
write(path.join(dest, 'lib/shots.ts'), `// ${title} · the storyboard, shot by shot. Times are the voice's (input/vo.words.json); word beats and gags land on
// the heard onsets (input/vo-onsets.json). Every place comes from the Doomcat world's library
// (${W}/places.ts): pick one when it suits the line, build a new one there when the story needs it.
import { close, sectionsOf, type Shot } from '${W}/shots.ts';

export const SHOTS: Shot[] = [
  // a placeholder until the storyboard: him asleep on the floor
  { id: 'co.1', section: 'cold-open', from: 0, to: 1, kind: 'cat', vo: '', action: 'placeholder', key: 0.5, world: 'floor', pose: 'back', mood: [[0, 'sleepy']], cam: { a: close } },
];

export const SECTIONS = sectionsOf(SHOTS);
`);
write(path.join(dest, 'lib/story.ts'), `// ${title} · what only this episode does: the real pages it shows (input/web/<name>.png, screenshots of the actual
// articles) and its own per-shot animation (a prop falling on a word, a card turning), run on every frame.
import { clamp01, ease, type HookContext } from '${W}/Episode.tsx';
import type { Shot } from '${W}/shots.ts';

export const PAGES = { dir: '${slug}/input/web', names: [] as string[] };

export const hooks = (s: Shot, t: number, ctx: HookContext) => {
  // e.g. ep. 1's cardboard robot falling flat on "robot.":
  // ctx.extras.cutout.rotation.x = s.id === 'd.1' ? -ease(clamp01((t - 89.1) / 0.5)) * 1.5 : 0;
  void s; void t; void ctx; void ease; void clamp01;
};
`);
write(path.join(dest, 'lib/Show.tsx'), `// ${title} · the episode on the Doomcat world's engine: its storyboard, voice, pages and hooks.
import React from 'react';
import { Episode } from '${W}/Episode';
import env from '../input/vo-env.json';
import vo from '../input/vo.words.json';
import { SHOTS } from './shots';
import { hooks, PAGES } from './story';

const voice = { words: vo.words, env };
export const Show: React.FC = () => <Episode shots={SHOTS} voice={voice} pages={PAGES} hooks={hooks} />;
`);
write(path.join(dest, 'lib/sfx-cues.ts'), `// ${title} · the sound effects, one cue list (the Doomcat world's lib/sfx.ts says how a cue works and has helpers:
// beat() for a word card, ticks() for a clock, typing() for a screen typing itself). Mix it with
//   node --experimental-strip-types --no-warnings=ExperimentalWarning ~/MediaMake/projects/_doomcat-world/tools/mix-sfx.ts ${slug}
// Files go in input/sfx/ from the media library (mm media use <id> ${slug} --as=input/sfx/<name>).
import type { Cue } from '${W}/sfx.ts';

export const CUES: Cue[] = [];
`);
write(path.join(dest, 'lib/Sfx.tsx'), `import React from 'react';
import { staticFile } from 'remotion';
import { Audio } from '@remotion/media';

// the sound effects stem (lib/sfx-cues.ts mixed by the world's tools/mix-sfx.ts)
export const Sfx: React.FC = () => <Audio src={staticFile('${slug}/input/sfx-mix.wav')} />;
`);
write(path.join(dest, 'lib/Music.tsx'), `import React from 'react';
import { staticFile } from 'remotion';
import { Audio } from '@remotion/media';

// the show's jazz as a very light bed (the world's tools/mix-music.ts ${slug})
export const Music: React.FC = () => <Audio src={staticFile('${slug}/input/music-bed.wav')} />;
`);
write(path.join(dest, 'manifest.json'), manifest(slug, title, `${slug}/input/vo.mp3`));
write(path.join(dest, 'input/vo.words.json'), JSON.stringify({ text: '', words: [] }) + '\n');
write(path.join(dest, 'input/vo-env.json'), JSON.stringify({ rate: 100, source: `${slug}/input/vo.mp3`, values: [0] }) + '\n');
if (engine) write(path.join(dest, 'input/project.json'), engine);
silence(path.join(dest, 'input/vo.mp3').replace(/\.mp3$/, '.placeholder.wav'));
silence(path.join(dest, 'input/sfx-mix.wav'));
silence(path.join(dest, 'input/music-bed.wav'));
if (!DRY) {
  // the voice placeholder as an mp3 at the manifest's path
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(dest, 'input/vo.placeholder.wav'), '-c:a', 'libmp3lame', path.join(dest, 'input/vo.mp3')]);
  fs.rmSync(path.join(dest, 'input/vo.placeholder.wav'));
  for (const d of ['input/sfx', 'input/web', 'docs', 'research']) fs.mkdirSync(path.join(dest, d), { recursive: true });
}
write(path.join(dest, 'prefs.md'), `# ${slug} · style lessons (from the user's reviews)

Started ${today} on the Doomcat world. The show's standing lessons are the skill's reference/craft.md; this file keeps
what the user says about this episode, round by round, each with their words.
`);

// ---------------------------------------------------------------- the landscape twin
if (has('wide')) {
  console.log(`${slug}-wide:`);
  write(path.join(twin, 'video/index.tsx'), `import { defineProject, layer } from '@mediamake/engine';
import manifest from '../../${slug}/manifest.json';
import { Sfx } from '../../${slug}/lib/Sfx';
import { LEAD } from '../lib/plan';
import { Music } from '../lib/Music';
import { Voice } from '../lib/Voice';
import { WideShow } from '../lib/WideShow';

// ${title} in landscape (16:9): the vertical episode (projects/${slug}) re-composed for a wide frame (lib/plan.ts).
// A pre-roll of LEAD s may open it (lib/plan.ts PRE); the voice, the effects and every shot follow LEAD s later.
const VOICE = manifest.audio.duration;
const EPISODE = Math.ceil((VOICE + 2.24) * 24) / 24;
export default defineProject({
  id: '${slug}-wide',
  fps: 24,
  width: 1920,
  height: 1080,
  tail: 2.24 + LEAD,
  // the voice is a layer here, so it can start after the pre-roll
  audio: false,
  layers: [
    layer({ scene: WideShow, props: {}, at: { from: 0, to: LEAD + EPISODE }, name: 'episode' }),
    layer({ scene: Voice, props: {}, at: { from: LEAD, to: LEAD + VOICE }, name: 'voice' }),
    layer({ scene: Sfx, props: {}, at: { from: LEAD, to: LEAD + EPISODE }, name: 'sfx' }),
    layer({ scene: Music, props: {}, at: { from: 0, to: LEAD + EPISODE }, name: 'music' }),
  ],
});
`);
  write(path.join(twin, 'lib/plan.ts'), `// ${title} · the 16:9 twin's own plan: a frame per shot (WIDE, by the vertical's shot ids; a shot without one plays
// auto-framed), an optional pre-roll before the voice (LEAD seconds, PRE shots at negative times) and set dressing for
// the wide frame (dress: filling a place out sideways). Node tools read this file too: keep its imports type-only or
// from the world's wide.ts.
//   9:16 → 16:9: the same vfov, hw × 0.316 = the same shot size; most shots go ×0.33–0.42, him off-centre
//   (sx 0.3–0.42), the bubble in the room beside his head.
import { F, type Wide } from '${W}/wide.ts';
import type { Shot } from '${W}/shots.ts';
import type { World, WorldName } from '${W}/worlds.ts';

export const LEAD = 0;
export const PRE: Shot[] = [];
export const WIDE: Record<string, Wide> = {
  // 'co.1': { cam: { a: F(0, 89.5, 0.45, 0.47, 0.115, 0), fov: 38 }, bubble: 'right' },
};
export const dress: ((worlds: Record<WorldName, World>) => void) | undefined = undefined;
void F;
`);
  write(path.join(twin, 'lib/WideShow.tsx'), `// ${title} · the vertical's storyboard on the Doomcat world's engine, re-framed for 16:9 by lib/plan.ts.
import React from 'react';
import { Episode } from '${W}/Episode';
import { widen } from '${W}/wide';
import env from '../../${slug}/input/vo-env.json';
import vo from '../../${slug}/input/vo.words.json';
import { SHOTS } from '../../${slug}/lib/shots';
import { hooks, PAGES } from '../../${slug}/lib/story';
import { dress, LEAD, PRE, WIDE } from './plan';

const voice = { words: vo.words, env };
const w = widen(SHOTS, WIDE, PRE);
export const WideShow: React.FC = () => (
  <Episode shots={w.shots} voice={voice} pages={PAGES} hooks={hooks} lettering={w.lettering} aim={w.aim} beats={w.beats} lead={LEAD} dress={dress} />
);
`);
  write(path.join(twin, 'lib/Voice.tsx'), `import React from 'react';
import { staticFile } from 'remotion';
import { Audio } from '@remotion/media';

// the vertical's voice-over, played by this layer (audio: false in video/index.tsx) so it can start after the pre-roll
export const Voice: React.FC = () => <Audio src={staticFile('${slug}/input/vo.mp3')} />;
`);
  write(path.join(twin, 'lib/Music.tsx'), `import React from 'react';
import { staticFile } from 'remotion';
import { Audio } from '@remotion/media';

// the show's jazz under the twin, with its pre-roll (the world's tools/mix-music.ts ${slug}-wide)
export const Music: React.FC = () => <Audio src={staticFile('${slug}-wide/input/wide-bed.wav')} />;
`);
  write(path.join(twin, 'manifest.json'), manifest(`${slug}-wide`, `${title} · landscape (16:9)`, `${slug}/input/vo.mp3`));
  if (engine) write(path.join(twin, 'input/project.json'), engine);
  silence(path.join(twin, 'input/wide-bed.wav'));
  write(path.join(twin, 'prefs.md'), `# ${slug}-wide · style lessons

Every lesson in ../${slug}/prefs.md applies here (it is the same episode). This file keeps what the user says about
the landscape frame.
`);
}

if (DRY) console.log('(dry run: nothing written)');
else {
  console.log(`✔ projects/${slug}${has('wide') ? ` and projects/${slug}-wide` : ''} on the Doomcat world`);
  console.log(`  next: the voice into projects/${slug}/input (voice-prep.mjs), then the storyboard in lib/shots.ts`);
}
