---
name: make-waveform-lyric-video
description: Make a waveform lyric video in Remotion from just a song (an audio file) and a poster or artwork — the picture looping and kicking on the beat, an audio-reactive waveform, the lyrics animated word by word, a title and channel tags. It transcribes the song itself, then storyboards in three steps, each stopped for the user's pick — the waveform, the font set, the caption animation — showing the catalog's screenshots (apps/lyrics_videos/catalog, distilled from the user's mediamake timelines) and new designs rendered on the song's own artwork until the user is happy; picked new designs go back into the catalog. Builds in apps/lyrics_videos with src/mediamake and scripts/wave-lab.ts, renders on request and is reviewed through Revisions (revise-video). Use when the user says "make a waveform lyric video", "lyric video with a waveform / audio visualizer / spectrum", "here's a song and a poster, make the video", "/make-waveform-lyric-video", or asks to change a project with a video/storyboard.ts. Not for storyboarded motion-graphics lyric videos built scene by scene (make-lyrics-video) or footage edits (make-video-music-remix). Append new user feedback to the log at the bottom.
---

# make-waveform-lyric-video

The channel lyric video: **a song and one picture in, a finished video out.**

- the **picture** (a poster or artwork) with a slow zoom or pan loop that kicks on the beat;
- a **waveform** driven by the song (side bars, a bottom strip, a glowing line, spectrum hills…);
- the **lyrics**, word-timed, through one of mediamake's caption presets;
- optional title card, channel tag, credits, overlay clips (particles, light leaks).

The look is three choices, made in this order in the storyboard: **the wave, the fonts, the caption
animation**. Each starts from the **catalog** (`apps/lyrics_videos/catalog/`): every wave, font set and
caption setup, learned from the user's mediamake timelines and from new designs. Its screenshots
are outputs, not committed: `out/waveform-catalog/` (a gallery `README.md`, a `sheet.jpg` per step).
When that folder is missing, shoot it first (`npm run wave-lab -w lyrics_videos -- catalog`, about
ten minutes). Read `catalog/README.md` and the gallery once.

Everything lives in `apps/lyrics_videos`. The engine is `src/mediamake` (read its `README.md`): a
`Look` (`look.ts`) is the picture plus the three choices; a project's `video/storyboard.ts` lists the
candidates of each step and the picks; `storyboardVideo()` turns the picks into the video.
`scripts/wave-lab.ts` (`npm run wave-lab`) shoots catalog entries and a project's candidates as
labelled stills. This skill shares the project folder, analysis, prepare, stills, Studio, render, the
shot map, Revisions and the Remotion editor with `make-lyrics-video`: read its steps 1–3 and 7–11
once and use them as written. This file covers what is different.

**The mediamake timelines are inspiration, not input.** What they knew is in the catalog now, and
they may be deprecated. When a design needs parameters the catalog doesn't show, read the code first
(the presets in `apps/mediamake/components/editor/presets/registry/`, the atoms in
`packages/remotion/src/components/waveforms/`); while the timelines exist, the read-only export in
`out/_timeline-export/` (2026-10-24) has more examples. Old timeline data can be stale (fields the
presets no longer read, font names that never loaded): the code is the truth.

**Taste.** Keep `projects/<slug>/prefs.md` as make-lyrics-video does: the intake answers, each
step's pick and why, a dated log of the user's feedback. Read the lessons log at the bottom first.

## What it needs

1. **The song** (`.mp3`, `.wav`, `.m4a`, …).
2. **A poster or artwork.** Measure it (`sips -g pixelWidth -g pixelHeight`). A portrait or square
   picture must not be cover-fitted to 16:9 (it keeps only the middle band and cuts faces off):
   outcrop it to the video's aspect (`midjourney-outcrop`, or fal) or use `fit: 'contain'` (it sits
   over a blurred copy of itself). Ask which.

That is all. The lyrics come from transcribing the song (step 1). If the user also has the written
lyrics, use them to correct words and line breaks. An instrumental can't go through prepare yet (it
requires lyrics): say so and offer to make prepare accept a song without lyrics.

## 0. Intake (one short round)

`AskUserQuestion`, recommended option first; skip what the request already answers:

1. **The song:** what it is about and the feeling it should leave; the channel (a brand under
   `brands/`: its fonts, colours, tag, intro and end screen) or none.
2. **Delivery:** 16:9 1920×1080 at 30 fps (default), or 9:16 / 1:1; a title card or not; texts
   (channel tag, a title in the song's language, credits); the brand's intro and end screen.
3. **Wishes:** anything already in mind for the wave, the fonts or the animation, or "show me".

Say once that transcribing is a paid ElevenLabs call. Write the answers to `brief.md` and start
`prefs.md`.

## 1. Project folder and lyrics

Slug rules as in make-lyrics-video step 1; copy the song and the picture into `input/`.

**Transcribe** with ElevenLabs speech-to-text and word timestamps (the connector's tool returns text
only, so call the API; the key is the second `ELEVENLABS_API_KEY` in `apps/mediamake/.env`):

```bash
curl -s https://api.elevenlabs.io/v1/speech-to-text -H "xi-api-key: $KEY" \
  -F model_id=scribe_v1 -F timestamps_granularity=word -F tag_audio_events=false \
  -F file=@apps/lyrics_videos/projects/<slug>/input/<song> > apps/lyrics_videos/projects/<slug>/input/lyrics.raw.json
```

Add `-F language_code=te` (or the song's language) when it isn't English. The response lists
`words` (`type: "word"` with `start`/`end`; skip `spacing`). Group them into lines by meaning — the
re-cut rules of make-lyrics-video ("After transcribing, re-cut the lines"): keep every word and its
times, cut at sentence and clause ends and breath gaps, no line longer than it can be read — and save
`input/lyrics.json` as `[{ "text", "start", "end", "words": [{ "text", "start", "end" }] }]`. Show
the user the numbered lines and let them correct them. To make a word the highlight, add
`"metadata": { "htmlText": "… <b>word</b> …" }` to its line (the caption presets read it), and set
each line's rows there too with `<br/>` (balanced, by sense: see the lessons log, 2026-10-26).

## 2. Analysis and prepare

As make-lyrics-video steps 2–3: the full analysis for anything that will be published (the beat grid
and energy drive the picture's kick and shake, the CTC alignment tightens the word times), then
`npm run prepare-project -w lyrics_videos -- <slug>`. Prepare keeps each line's `metadata` through the
alignment.

## 3. Storyboard — the picture's look, then three steps, each stopped for the user's pick

Each step goes the same way:

1. **Show the menu.** Pick 6–10 catalog entries whose tags and look fit the song, the artwork and the
   brief, put their shots in one sheet and show it with one line each on why. Ask which they like,
   or whether to design new ones:
   ```bash
   npm run wave-lab -w lyrics_videos -- catalog waves --sheet=side-bars-red,jaws,horizon-glow   # → out/catalog-menus/waves.jpg
   ```
2. **Shoot candidates on the song's own picture.** Write them into `video/storyboard.ts` as `W1, W2…`
   (waves), `F1…` (fonts), `C1…` (captions): catalog ids, catalog entries recoloured or adjusted for
   this picture, and new designs. Then:
   ```bash
   npm run wave-lab -w lyrics_videos -- <slug> waves     # or fonts, captions
   ```
   It renders each candidate with everything picked so far → `out/<slug>/<slug>-storyboard/<step>/`,
   a `sheet.jpg` per step and an `index.json`, so the set opens in `/image-revision` (follow
   `revise-image` for the link, picks and comments). Read the sheet yourself before showing it.
3. **Iterate until the user is satisfied.** New rounds get new IDs (`W5`, `W6`…; never reuse one the
   user has seen). Record the pick in `storyboard.ts` (`pick`) and in `prefs.md`.
4. **Keep what was made.** A new design the user picks goes into the catalog (see below).

```ts
// projects/<slug>/video/storyboard.ts
import { tintWave, type Storyboard } from '../../../src/mediamake/look.ts';

export default {
  base: { cover: { image: 'poster.jpg', beatKick: 0.5, shake: 'auto' }, title: false },
  waves: {
    W1: 'side-bars-white',
    W2: tintWave('fill-fearless-white', '#e11d48', '#fecdd3'), // the poster's red
    W3: { kind: 'spectrum-line', data: { strokeColor: '#fde68a', glowColor: '#f59e0b', glowBlur: 12 }, box: { height: 260 } },
  },
  fonts: { F1: 'calligraffitti-bebas', F2: 'cormorant-montserrat' },
  captions: { C1: 'sentence-float-2', C2: 'blur-float-4' },
  pick: { wave: 'W2' },
  // at: { waves: [64.2] },  // seconds to shoot; default the loudest second and the line sung there
} satisfies Storyboard;
```

### Step 0 · The picture's look (offer it; skip when the user wants the picture as it is)

`looks: { L0: null, L1: { look: {...} }, … }` in `storyboard.ts`, shot with
`npm run wave-lab -w lyrics_videos -- <slug> looks`: cover settings laid over `base.cover`, usually a
`look` (`src/mediamake/PictureLook.tsx`): a grade, picture filters (posterize, duotone in the
picture's own colours, curves, chromatic split with `chromaKick`, highlight bloom with `bloomPulse`
on the beat) and living texture (animated grain, vignette, drifting light leak, god rays from a
picture point, rising embers, halftone, paper, dust and scratches, film flicker, scanlines,
letterbox). Design them from the picture and the song's world (a devotional song: calendar-print
oleograph, Tanjore gold leaf, old mythological film reel, diya glow), not generic filters.
`cover.origin` sets the point the zoom grows from: put it on the picture's focal point (a spark, a
face) so effects locked there stay put.

### Step 1 · The wave

Shot alone over the picture (no lyrics) at the loudest second. Fit it to the song's energy (side
bars, ember, jaws for hype; centre pulse line, horizon glow, blur for ballads), to where the picture
has room (bars on the free edge: `mirrorX: true` moves left-edge bars to the right) and to the
picture's colours (`tintWave(id, main, second)` with colours you read off the artwork). New designs:
combine the atoms, or several waves in one candidate (an array). Ranges that looked right in the
user's videos:

- **side bars** (`waveform-audio`, `verticalTransform`): barWidth 4–10, barSpacing 8, numberOfSamples
  64–128, smoothNormalisation 0.05 (jumpy) – 0.3 (smooth), box height 300–800, leftVerticalPos −7
  (reaches in) to −21 (hugs the edge);
- **bottom strip**: amplitude 0.5–1, container bottom −85 to −350 with height 200–800 (half of the
  mirrored bars below the frame);
- **spectrum fill**: impact 0.4–0.7, or peakHeight 0.2–0.6 and layerFrameOffset 4–22 for the echo;
- **spectrum line**: strokeWidth 2–3, glowBlur 10–14.

**Beyond bars and lines** (`src/mediamake/Visualizers.tsx`, same `waves` entries): `halo` (spectrum
rays on an arc round a face: a prabhavali), `yantra` (the spectrum folded into n petals round a
point), `sparks` (streaks thrown from a point, more with the energy, bursts on kicks), `rings`
(shockwaves on kicks or downbeats), `bolt` (lightning on the strongest snares, `sections` to limit
it), `flames` (a row of aarti flames on diyas as the spectrum). Their `at` is a point of the unmoved
picture in frame px (measure it on a grid of the cover-fitted picture): they follow the cover's zoom,
kick and shake. Pitch at least a few concepts drawn from the picture and the lyrics (what the
subject holds, the light in it, the song's images) next to the catalog entries.

Stills can't show motion: add `--clip=6` to shoot a labelled 6 s clip per candidate (from 2 s
before its moment, with the song) plus a reel of the run, and pick a shoot moment (`--at`) right
after a kick and a strong snare so hit-driven effects show in the stills.

### Step 2 · The fonts

Shot with the picked wave and the default caption setup, as the hook line finishes. Offer the
channel's brand fonts first when there is one (`calligraffitti-bebas`, `dhurjati`, `michroma-inter`),
then sets that fit the mood. A font set is a highlight style, a sub style and colours (primary = sung
words, secondary = words to come, accent = the highlight glow, taken from the picture), plus
`sizeScale` for wide or narrow faces. Fonts are Google fonts by family name without spaces
(`PlayfairDisplay:700:italic`); check every new name exists in `@remotion/google-fonts` — a missing
one falls back to a system font without an error (the old timelines' `SairaStencilOne` did).
Telugu songs: `ramabhadra`, `dhurjati` or another Telugu face; check the glyphs in the shots.

### Step 3 · The caption animation

Shot with the picked wave and fonts, as four moments of the hook line in a 2×2 grid (entering, a
third in, fully sung, handing over to the next line). Offer existing setups that fit, and new ideas:
other combinations of a preset's inputs (animation style × layout × number of lines × place × size ×
impact), placed where the picture has room. Keep the lyrics clear of the picked wave: with a wave
along the bottom, raise the setup's `position.bottom` above the wave's box height (a four-line
setup low in the frame otherwise puts its last line on the wave). The presets: `sub-vertical-float` (13 animation styles,
the user's usual), `sub-fast-rap-static` (one sentence or word at a time, blur transitions: fast
rap), `sub-kinetic-motion`, `sub-kinetic-gradient-flow` (gradient-filled words), `sub-scrolling-vertical`
(a scrolling lyric sheet). Check two things in the 2×2 grids before showing them: **the
hand-off** (sub-vertical-float shifts whole lines, word highlights included, `negativeOffset` s
earlier; with back-to-back lines the catalog's 0.3 cuts each line's last word and lights words
before they are sung, so drop it to ~0.05 when there are no gaps) and **the script** (the
letter-spacing animations split the headline stroke of Devanagari, Bengali and Gurmukhi: offer the
others). Gradient fills (`gradient` on a text style) work only in sub-vertical-float. An animation none of them can do is a new caption scene: only when the user
asks, and it must keep make-lyrics-video's karaoke rules (a word lights on its start, clean
hand-offs, readable).

## 4. Build

```tsx
// projects/<slug>/video/index.tsx
import { storyboardVideo } from '../../../src/mediamake';
import storyboard from './storyboard';

export default storyboardVideo('<slug>', storyboard);
```

Set the rest in `base`: `cover` (motion, `beatKick`, `dim`, `fadeBottom` under a bottom wave,
`shake: 'auto'`, `fit`), `title`, `texts` (`{ text, font, size, letterSpacing, from, to, box, align }`),
`overlays` (`OverlayVideo`: `src`, `clipSeconds` from ffprobe, `blendMode`, `filter`, `tint`).
Then check:

```bash
npm run type-check -w lyrics_videos
npm run wave-lab -w lyrics_videos -- <slug> final          # the picked look, four moments
npm run stills -w lyrics_videos -- <slug> <seconds,…>
npm run render-project -w lyrics_videos -- <slug> --frames=<a>-<b> --scale=0.5
```

Read them (several per sheet: ffmpeg `xstack`; the system python has no Pillow) and check: lyrics clear
the wave and the picture's subject, inside the title-safe area (≥ 96 px from the edges), long lines
wrapped; the highlight words are sensible and a line is on screen while it is sung; the wave moves
with the song (two stills a few frames apart differ, quiet parts low, the hook fills its box without
clipping); texts don't collide; non-Latin text renders in its font; the picture isn't cut through a
face. For motion (kick, shake, overlay seams) look at consecutive frames of the clip.

Studio and the Remotion editor as make-lyrics-video steps 8 and 11. The layers are selectable by
name, and `edits.json` `props` use the same keys: `cover`, `overlay 1`, `wave` (`wave 2`…),
`title`, `lyrics`, `text: <text>`.

## 5. Render, review, deliver

- **Render** only when asked, as make-lyrics-video step 9 (earlier renders kept in `out/<slug>/v<N>/`,
  the map beside the MP4). A one-picture video needs no `video/shots.json`: the map's fallback, one
  shot per lyric line, fits it.
- **Brand intro and end screen** (`brands/<brand>/intros/`, `outros/`): added after the render with
  ffmpeg the way make-video-music-remix does (the user picks which; the end screen's audio a few dB
  under the song; the previous render kept first). Ask.
- **Review** with `revise-video` for every render the user will watch.
- **After sign-off**, offer `pack-youtube`: preview the title and the thumbnails and ask for
  suggestions, and ask whether the lyrics go in the description.

## The catalog

- A new wave, font set or caption setup the user picks goes into `catalog/waves.ts`, `fonts.ts` or
  `captions.ts` under a new id, with `name`, `about`, `tags` and `source: 'new <date>: <slug>'`; then
  `npm run wave-lab -w lyrics_videos -- catalog <step> --only=<id>` shoots it and rewrites the gallery.
  Check the shot. Say what you added; commit only when asked.
- The catalog's shots and gallery stay in `out/` (gitignored); only the entries and the demo
  definition are committed.
- Re-shoot the whole catalog (`-- catalog`, about ten minutes) after a change to a preset or an atom.

## Gotchas

- Values are px for 1920×1080. For 9:16 or 1:1, set positions, boxes and containers again; don't
  scale the old values.
- The waveform atoms read the song themselves. Never add an `<Audio>`: the kit plays the song.
- `waveform-audio` preset: `amplitude` drives the static bars and `waveAmplitude` the time-domain
  waves (likewise `numberOfSamples` / `waveNumberOfSamples`); its `radius`, `startAngle` and
  `endAngle` are ignored (old timelines set them); `rightVerticalPos` lands mid-frame, use `mirrorX`.
- Older caption presets take one font pair (`fontChoices`) and one colour set; letter spacing and
  shadows go in the setup's `style.extraStyleProps`. `look.ts` (`captionParams`) maps a font set onto
  either kind.
- `colorTint` on an overlay clip is a CSS filter (sepia + hue-rotate, the editor's
  `colorTintFilter`), not a colour layer: a `color`-blend layer tints the whole frame.
- If a look renders differently from the editor, sync the presets first
  (`npm run sync-presets -w lyrics_videos`).
- When prepare warns that `analysis/lyrics.aligned.json` differs from `input/lyrics.json`, the
  analysis is stale and lines lose their highlights: re-run it, then prepare.
- `wave-lab` bundles the whole `projects/` folder once per run (~30 s before the first still).

## Lessons log

Append dated entries: what the user said → the rule.

- 2026-10-25 · "based on the timeline based waveform linked lyric video create another make skill
  call it make-waveform-lyric-video" → this skill on the `src/mediamake` engine. Built with it:
  `OverlayVideo` (tint as the editor's filter), and prepare keeps mediamake caption metadata through
  the alignment. A portrait picture cover-fitted to 16:9 loses the face: outcrop or `fit: 'contain'`.
- 2026-10-25 · "i meant the existing timelines as inspiration … it should only intake an audio file,
  a poster or an artwork … storyboard into 3 steps: waveform choice … font choice set … captions
  animation … create templates and screenshots" → intake is the song and a picture only (the skill
  transcribes); the storyboard is three stopped steps, each shown from the catalog plus new designs on
  the song's own picture until the user is satisfied; the catalog (`apps/lyrics_videos/catalog`: 28
  waves, 30 font sets, 31 caption setups distilled from 185 waveform and 184 caption tracks, with
  screenshots) and `npm run wave-lab` keep this cheap every time; picked new designs go back into the
  catalog. Timelines may be deprecated: never depend on them.
- 2026-10-26 · "remove the outputs, they are not needed" (of the committed catalog screenshots) →
  the shots, gallery and index live in `out/waveform-catalog/`, never in git; the repo keeps only the
  catalog entries, the demo definition and the script that shoots them.
- 2026-10-26 · "come up with more creative concepts for the waveform, and stylize the background
  poster, use some good image filters or effects" (Mahishasura Mardini, after a first round of
  catalog waves) → recoloured catalog entries are not enough: pitch concepts drawn from the picture
  and the lyrics (a halo round the goddess, a yantra and sparks from the trident's tip, lightning on
  the snares, aarti flames), and offer a styled picture (step 0 looks) instead of the raw poster.
  Built: `PictureLook`, `Visualizers`, the `looks` step and `wave-lab --clip`.
- 2026-10-26 · "for poster still not satisfied, use fal and upscale or something, also try
  variations of the same image" → "1$ is too much, next time ask for permission" → when the
  picture itself doesn't satisfy, offer fal upscales (Topaz Bloom 2 / Wonder 3.5) and image-edit
  variations of the same picture (Nano Banana Pro edit keeps the composition closest; Seedream 5 Pro
  edit redraws more freely), but **ask first with the estimated cost** and start with a small batch.
  Put them in `out/<slug>/poster-variations/` (image-index), copy candidates to `input/fal/`, re-run
  prepare, measure each one's focal point and shoot them in the video as `looks` under the same IDs.
- 2026-10-26 · "c2 is good, but line cut is bad, design it in such a way that the overall thing
  looks symmetric, and more suitable to perceive" → never let the preset split rows by word count
  (it cut "महिषासुर / मर्दिनी" and left one word dangling): author every line's rows in
  `metadata.htmlText` with `<br/>` — at a phrase boundary, rows of balanced width (hero words count
  at their scale; a short row on top reads as a pyramid), never inside a name, no row starting on a
  particle (सी, की, को, है, में…), short lines on one row — and centre them in a box centred on the
  picture's free area. lyrics_videos' runPreset now injects the editor's htmlText helpers (synced
  to src/mediamake/html-text.ts): before that, `<b>` marks were silently ignored (auto-highlight
  picked the longest word) and `<br/>` only worked in one special case.
- 2026-10-26 · after v1 of Mahishasura Mardini: "i dont like the caption effects … blur is bad, gold
  is also not looking great … different words can be differently sized … user should be able to
  sing along … a bit bigger, put more lines" → when the presets' look isn't enough, write the lyrics
  as a project scene (storyboard caption pick = a `null` candidate turns the preset off; add the
  scene in index.tsx): lockups sized by role (hero / body / particle), more rows rather than smaller
  type, the line fully readable before it's sung plus the next line waiting under it (sing-along),
  a per-word ignite (masked wipe over the sung length, capped ~0.9 s) in the picture's own light,
  and slides/fades instead of blur. Example: projects/mahishasura-mardini-hindi
  (video/scenes/IgniteLyrics.tsx, tools/lockups.py).
- 2026-10-26 · "the image seems a bit dulled … not clarity enough" → stacked defaults (cover `dim`
  0.2, the full-strength bottom fade, a 0.35 vignette, grain, bloom haze) made the render 21% darker
  and 22% duller than the user's own picture. Before showing a look, measure a full-resolution
  frame against the cover-fitted picture (`ffmpeg -vf signalstats` YAVG / YHIGH / SATAVG) and keep
  the render at least as bright and saturated as the source; give the text its own shadow instead of
  dimming the picture (`dim: 0`, `fadeBottom: <strength>`, `look.sharpen` for clarity).
- 2026-10-26 · rev-001 of Mahishasura Mardini: "in pure interlude, remove text, as its just music
  coming … applies for all places where there is only music and no vocals" → no lyric text over
  music-only stretches (interludes, outro): a line leaves right after the voice stops and nothing
  (no next-line preview) waits through the music. Check stanza-final held notes on the spectrogram
  (`analysis/zoom.py`): the CTC aligner can stretch them seconds into an instrument that bleeds into
  the vocal stem; pin the real end in `analysis/fixes.json` (`"7:3": {"end": 40.92}`).
