---
name: make-waveform-lyric-video
description: Make a one-picture lyric video in Remotion from a song (an audio file) and a poster or artwork — the picture alive on the beat (its subject cut out over a clean plate, so visualizers, light and effects sit between the world and the subject), an audio-reactive visualizer, the lyrics as designed typography (stacked caps + a big hero word per line, placed in the picture's free space), the channel's logo animation over the intro and its end screen after. It transcribes the song itself and re-cuts the lines to the user's written lyrics, pitches a few high-level ideas from the picture and the track, then builds the picked one as whole looks shown with the song (a reference is the target to compare against, with creative liberty) until the user picks, gathers typography inspiration before designing the lyrics, previews in the Remotion editor, and renders only on request; reviewed through Revisions (revise-video). Builds in apps/lyrics_videos with src/mediamake and scripts/wave-lab.ts. Use when the user says "make a waveform lyric video", "lyric video with a waveform / audio visualizer / spectrum", "here's a song and a poster, make the video", "/make-waveform-lyric-video", or asks to change a project with a video/storyboard.ts. Not for storyboarded motion-graphics lyric videos built scene by scene (make-lyrics-video) or footage edits (make-video-music-remix). Append new user feedback to the log at the bottom.
---

# make-waveform-lyric-video

The channel lyric video: **a song and one picture in, a finished video out.** Rewritten on
2026-10-31 after two projects (Mahishasura Mardini, Devil in the Details) where the first version
of this skill — catalog menus, three separate picks (wave → fonts → caption preset), filter looks —
produced round after round of "bland", "doesn't match", "yours is bad". What finally landed is the
workflow below. Read the rules first; they are the user's own words turned into practice.

Everything lives in `apps/lyrics_videos`; the engine is `src/mediamake` (read its `README.md`).
Project folder, analysis, prepare, stills, Studio, render, the shot map, Revisions and the Remotion
editor are shared with `make-lyrics-video` (its steps 1–3 and 7–11). Each project keeps a taste doc
`projects/<slug>/prefs.md` (intake, picks, a dated log of every note): read the lessons log at the
bottom of this file and the last project's prefs.md before starting.

## The rules

The user's corrections of 2026-10-31 are part of each rule; where they soften an earlier note, they
win.

1. **The idea comes first.** From the picture and the track (what it says, how it sounds) — and a
   reference when there is one — pitch a few high-level ideas for the whole video (the world, what
   moves on the beat, what happens to the subject, how the lyrics look) before building anything.
   Every later choice (segmentation, colours, line breaks, type) serves the picked idea.
2. **A reference is the target to beat, not a template.** When the user gives one (a video, a
   picture, a channel), pull full-size frames through its strongest moment, name the devices that
   make it work, and compare our frames **side by side with it** before asking. No need to copy it:
   creative liberty is fine ("no need to copy, creative liberty is okay"), as long as ours holds up
   next to it.
3. **Show whole looks, never menus of parts.** One look = the picture's grade + the visualizer +
   what happens to the subject + the wave (if any) + the lyric type, shown together at a hook moment.
   Picking a wave, then fonts, then a caption preset from catalog stills produced bland results
   twice. The catalog is a parts bin, not a menu.
4. **Segmentation when the idea needs it.** If the idea puts things behind the subject or treats her
   apart from the world, cut her out (BiRefNet, local, free) over a clean plate, and check the matte
   at full size for missed limbs, claws, horns, a glove against the sky. If it doesn't, don't.
5. **Colours mostly from the picture, contrast when it matters.** The picture's own hues by
   default; a catalog wave keeps its shape, never its colours. Bring in a contrasting colour where
   the idea needs separation or punch (an accent against the picture's dominant hue). Offer palette
   variants side by side when asked.
6. **Never duller than the source.** Measure a full-resolution frame against the cover-fitted
   picture (`signalstats` YAVG / YHIGH / SATAVG): the render stays at least as bright and as
   saturated as the picture unless the user asks for a grade. Judge quality on full-resolution
   frames, never on the half-size wave-lab previews (they look soft).
7. **Lyrics are designed type — extremely designed.** Not a caption preset: the presets are good
   inspiration but most of them are boring. Before designing, gather inspiration — ask the user for
   theirs, or search Pinterest (Browse Hack), YouTube lyric videos and kinetic-typography work —
   and show a small inspiration board. Build it with the engine's `StackedLyrics`, a project scene
   like `IgniteLyrics`, or a new scene the idea calls for.
8. **Lines follow the written lyrics, unless the idea says otherwise.** Start from the user's
   written lines, timed by singing (a line sung slower than ~3 s splits at its clause; a long line
   sung fast stays whole), with the hero word chosen by meaning. Where the overall idea needs a
   different cut (one word a screen, a phrase held across lines, a power-word outro), the idea wins.
9. **Silence stays silent.** No lyric on screen over music-only stretches (a line leaves right after
   the voice stops; nothing previews across an interlude). Whether the end screen has sound is the
   user's choice: ask at intake, never at the end.
10. **Preview in the Remotion editor; render only when asked.** The most important rule: renders the
    user didn't ask for waste their time. Check your own work with stills; show the user the
    project in the Remotion editor (local) when they want to look; render a clip or the full video
    only on request. Every earlier render is kept (`out/<slug>/v<N>/`).
11. **Ask before paying.** Transcription is a paid ElevenLabs call (~$0.03 for 3 min); fal upscales
    and edits cost money: say the estimate and wait for a yes. Segmentation, analysis and renders
    are local and free.

## What it needs

1. **The song** (`.wav` preferred, `.mp3`, `.m4a`).
2. **One picture** (a poster or artwork). Measure it (`sips -g pixelWidth -g pixelHeight`). It must
   be 16:9 or outcropped to it (`midjourney-outcrop`): a portrait cover-fitted to 16:9 loses the
   face. A source ≥ 1920 px wide needs no upscale.
3. Optional, ask for them: **the written lyrics** (they set the line breaks), **a reference**
   (video or image), the **channel** (a brand under `brands/`).

An instrumental (no text on screen) goes through prepare with `input/lyrics.json` = `[]`: one
"song" section, no lines; write the real sections into the video map yourself after the render.

## 0. Intake (one short round)

`AskUserQuestion`, recommended option first; skip what the request already answers:

1. **The song:** what it's about, the feeling it should leave; the channel.
2. **Inspiration:** a reference video or picture for the look, and any for the lyric typography
   (or "find some": Pinterest, YouTube), or "show me ideas".
3. **Delivery:** 16:9 1920×1080 at 30 fps (default); the channel's logo animation over the intro
   (ends before the first line); the channel's end screen (which one, or pick later) **and whether
   it keeps its sound** (asked now, never at the end); a title card or not.
4. **Transcription OK** (paid, ~$0.03 / 3 min), and whether they have the written lyrics.

Write the answers to `brief.md`, start `prefs.md`.

## 1. Lyrics

Copy the song and picture into `projects/<slug>/input/` (slug rules as make-lyrics-video step 1).
Separate the vocals first (`uv run --project analysis python analysis/pipeline.py <slug> --only
separate`, ~1 min) and **transcribe the vocal stem** with ElevenLabs speech-to-text and word
timestamps (the key is the second `ELEVENLABS_API_KEY` in `apps/mediamake/.env`; add
`-F language_code=<code>` for non-English):

```bash
curl -s https://api.elevenlabs.io/v1/speech-to-text -H "xi-api-key: $KEY" \
  -F model_id=scribe_v1 -F timestamps_granularity=word -F tag_audio_events=false \
  -F file=@vocals.mp3 > projects/<slug>/input/lyrics.raw.json
```

Re-cut into lines with a small script in the project (`tools/recut.py`, copy Devil in the Details'):
a list of lines, each its `htmlText` with the hero word in `<b>` and its rows split with `<br/>`; the
script maps the transcribed words onto them in order (keeping every word's time), fails loudly on a
mismatch, flags lines sung longer than ~3.3 s, and writes `input/lyrics.json`. Mark chorus lines with
`metadata.section: "chorus"` (they can get their own placement and colour). If the user gave written
lyrics, diff them word for word against the transcription and report only the real differences;
their words win unless they say otherwise. Show the numbered lines with their hero words and let
the user correct them. The picked idea may re-cut them later (rule 8): one word a screen, a phrase
held across lines, a power-word outro.

## 2. Analysis and prepare

```bash
npm run analyze -w lyrics_videos -- <slug> --plots          # background: stems, beat grid, CTC alignment
npm run prepare-project -w lyrics_videos -- <slug>
```

Read the report (make-lyrics-video step 2): tempo, downbeats, lines marked `<-- check` — zoom into
them (`analysis/zoom.py <slug> lines …`) and pin only what the spectrogram clearly shows in
`analysis/fixes.json` (`"45:0": {"start": 103.9}`). Re-cutting the lines renumbers them: move the
fixes. Check stanza-final held notes: the aligner can stretch them into the instrument that follows.

## 3. The idea

Look at the picture (Read it), listen through the analysis (energy curve, sections, the hook), read
the lyrics, and study the references (frames side by side). Then pitch **3–5 ideas** for the whole
video, each a few lines: the world (grade, palette, light), what moves on the beat (visualizer,
camera, light), what happens to the subject, how the lyrics look and where they sit, and why it fits
this song. Where it helps, show rather than tell: a quick still of the picture graded that way, a
reference frame, an inspiration board. The user picks or mixes one; record it in `prefs.md`.

## 4. The picture (what the idea needs)

- **Segmentation**, when the idea puts things behind the subject or treats her apart: copy
  `projects/devil-in-the-details/tools/cutout.py` (BiRefNet full at 1024 → `input/cutout/subject.png`
  + `matte.png` + a clean `plate.png` with a thin inpaint margin + `check.jpg`). Look at the matte
  over the poster at full size; `--fill x,y …` adds the dark pixels inside a polygon (a black glove
  against a bright sky), `--patch crop:box` re-runs the model on a crop. Keep earlier cuts in
  `input/cutout/v<N>/`.
- **Free space**: cover-fit the subject's matte (or mark her by eye) at 1920×1080 and print her left
  and right edge every 40 px of height, at the zoom loop's smallest, middle and largest scale (Devil
  in the Details' prefs, 2026-10-30). Lyric columns centre between her edge and the frame edge where
  there's room; the centre bottom sits over her body.
- **Focal points** in frame px: her face, a held object, the light source. Effects lock to them.

## 5. The look

Build the picked idea as 2–4 **complete looks** (rule 3), each a `looks` entry in
`video/storyboard.ts`, built from the parts below, and shoot them as clips:

```bash
npm run wave-lab -w lyrics_videos -- <slug> looks --only=L1,L2 --clip=6     # stills + 6 s clips + a reel
```

Pick the shoot moment (`at.looks`) just after a strong kick and snare in the hook so hit-driven
effects show. Before showing: pull 3–4 frames of each clip around a kick (with a reference, put its
frames in the same sheet), measure brightness against the source (rule 6), and fix what's off. Send
the reel and the sheet; the user picks, mixes ("rings from the first, sparks from the second"), or
redirects. New rounds get new IDs; nothing seen is renumbered.

**The parts** (all in `src/mediamake`; a look is cover settings + `subject` + `layers` + `overlays`):

| part | what it does | settings that mattered |
|------|--------------|------------------------|
| cover (`CoverBackdrop`) | the picture or the clean plate: zoom loop, beat kick, dim, fade | `image: 'cutout/plate.png'`, `origin` on the focal point, `kickOn: 'kick'`, `beatKick` 0.4–0.8, `dim: 0` |
| `cover.jolt` | the camera jolts on strong kicks with a directional motion blur, shared by everything | `amount` 18, `threshold` 0.95, `decay` 8, `blur` 0.35 (higher reads as streaks) |
| `cover.look` (`PictureLook`) | grade, duotone, curves, posterize, bloom, chroma, embers, rays, leak, grain, vignette, dust, flicker, halftone, paper, `exposure` (brightens on kicks, flashes on snares) | duotone in the picture's own dark → light; never lose the source's brightness |
| `subject` (`Subject`) | the cutout over the plate: its own grade/duotone, `rim` light, `echo` copies on hits, a `sweep` sheen, a neon `outline`, a `wash` + `grain` so her own colours sit in a graded world | `depth` ≤ 0.15, `blur` 0.35 (crisp while the world smears), wash soft-light ~0.3 |
| visualizers (`layers`) | `horns` (a hollow ring whose bass rises as two curling ears, echo lines), `halo`, `yantra`, `sparks` (from a point), `rings` (shockwaves), `bolt`, `flames` | horns: `shape: 'lobes'`, stroke-only layers, `floor` 0.33, `gap` 14, `contrast` 2.2, `curl` 55 — measure the band levels first |
| bottom wave (`spectrum-fill`) | layered hills along the bottom | "vibration" means **height**, not peaks: 4 layers, ~30 points, low gain + noise floor so it rests low, `box.kick` 0.6 to leap on hits, a crest line, `box.glow` |
| overlays (`OverlayVideo`) | particles, film flashes in `screen` / `hard-light` | flashes go olive over a drained world |

Measure before tuning a visualizer: compute the band levels at a few moments in Node with
`packages/remotion/src/components/waveforms/spectrum-line-math.ts` (copy it to the scratchpad) and
set `floor` / `gain` from the numbers, not by eye.

## 6. The lyrics on screen

**Inspiration first** (rule 7): the user's references, or a search — Pinterest through Browse Hack
(`pinterest_*` tools, the user's chosen profile), YouTube lyric videos of the genre, kinetic
typography work — collected into a small labelled board in `out/<slug>/<slug>-type-inspo/` (an
image set for `/image-revision`). Show it, ask what they like, then design. The caption presets
(`catalog/captions.ts`, `npm run wave-lab -- catalog captions`) are part of that inspiration, not the
answer.

The engine's **`StackedLyrics`** is one proven design (layer it in `video/index.tsx`; set the storyboard's caption
pick to a `null` candidate so no preset draws). Each line is a stack: the caps face small and
tracked, wrapping in its column; the hero word big in the hero face on its own row; a tiny word next
to the hero joins it ("a lie"); the whole stack leans (`heroTilt`, default −5°). Words wait dim (the
hero as an outline), fill in with a small punch on their start, and lines leave before music-only
stretches.

```tsx
layer({ scene: StackedLyrics, at: 'all', name: 'lyrics', props: {
  fonts: { caps: { family: 'Bebas Neue', file: '<slug>/fonts/BebasNeue.ttf' },
           hero: { family: 'Rock Salt', file: '<slug>/fonts/RockSalt.ttf' } },
  size: { caps: 40, hero: 96 },                       // px at 1080p: small overall, the hero big
  columns: { left: { x: 125, width: 560 }, right: { x: 1255, width: 560 } },   // from the free-space map
  band: { center: 730, maxHeight: 300 },
  center: { x: 960, width: 760, bottom: 885, hero: '#fff', heroOutline: 'rgba(255,255,255,0.7)' },
  power: { from: 'break-1', y: 860, size: 96, heroSize: 220, hero: 'devil', color: '#fff' },
  colors: { outline: 'rgba(255,236,230,0.42)', sung: '#fff', hero: '#ff2a1a', heroOutline: 'rgba(255,70,50,0.75)' },
} }),
```

- Other ideas get their own scene (copy `StackedLyrics` or `IgniteLyrics` as a start): one word a
  screen, words drawn into the picture, type that reacts to the beat — whatever the idea needs, as
  long as every word lights on its start, nothing covers a face, and the line is readable.
- **Fonts** are files in the project (`projects/<slug>/fonts/*.ttf`, downloaded from Google Fonts'
  CSS): a many-tab stills run times out loading Google fonts. Ask for the fonts; offer a pairing from
  the song's world (a hand/script or display hero over condensed caps).
- **Placement**: side columns alternate per line (centred between the subject's edge and the frame
  edge, at the waist band); `center` puts every non-chorus line at the centre bottom (white);
  `power` sets the lines from a section on alone at the centre bottom in the hero face, one word
  very big. Choose from the free-space map; when the user moves things by name, do exactly what
  they said, then check it.
- **Check** stills at full resolution across every section (a verse, the chorus, the bridge, the
  outro, an interlude with no text): words never touch, the hero reads, nothing over her face, rows
  clear the tilted hero, nothing in the bottom wave's box at rest.

## 7. Preview (the main checkpoint)

- **Your own checks**: stills (`npm run stills -- <slug> <s,…> --only`) at full resolution.
- **The user's look**: the **Remotion editor**. Start mediamake locally (`preview_start` with
  `mediamake` from `.claude/launch.json`) and open `http://localhost:3002/remotion-editor?project=<slug>`
  in the browser pane; prefer local, the deployed editor lags behind engine changes. Say which
  timeline mark to jump to. The user's moves save to `video/edits.json` and every render applies them.
- **Clips and renders only when asked** (rule 10): `npm run render-project -w lyrics_videos -- <slug>
  --frames=<a>-<b>` (≈ 1 min for 24 s).

## 8. Render and deliver (only when asked)

1. **Logo intro**: copy the brand's logo animation (`brands/<brand>/logo/animated/*.webm`, VP9 with
   alpha) into `input/brand/` and layer the engine's `LogoSting` over the intro (e.g.
   `at: { from: 0.2, to: 4.2 }`, `box` half size over the subject's body), so it has faded before
   the first line's entrance (its start − 0.35 s). Check stills before, during and after.
2. **Render**: `npm run render-project -w lyrics_videos -- <slug>` (≈ 10 min for 3 min, in the
   background; retry once on a font timeout). The previous render moves to `v<N>/` by itself.
3. **End screen**: keep the raw render in `v<N>/` first, then join the channel's end screen with
   ffmpeg (60 → 30 fps, CRF 15, the concat filter) as the user chose at intake — with its sound at
   its own level (never lifted), or silent (the INVERTED Devils end screens are silent at the source)
   — and add an `end screen` section to the map.
4. **Check the file**: duration, loudness of the song part unchanged (`ebur128`), frames across the
   song (intro logo, verse, chorus, interlude empty, outro, end card). Give the `open -R` block and
   the Revisions link (`revise-video`).
5. **Then, when asked** (in parallel sessions when the user says so): the cover (`create-music-poster`),
   thumbnails (`create-thumbnail`), then `pack-distrokid` and `pack-youtube`.

## Engine and commands

- `video/storyboard.ts` (`Storyboard` in `look.ts`): `base`, `looks` (cover settings + `subject` +
  `layers` + `overlays`), `waves`, `fonts`, `captions`, `pick`, `at`. `video/index.tsx`:
  `storyboardVideo('<slug>', storyboard, [extra layers])`.
- `wave-lab <slug> looks|waves|fonts|captions|final [--only=…] [--at=s] [--clip=6]` → labelled stills,
  clips and a reel in `out/<slug>/<slug>-storyboard/`, reviewable in `/image-revision`.
- `stills <slug> <s,s,…> --only [--scale=1]`: the folder is cleared on every run — copy the files
  out between batches; batches of ≤ 6 avoid font timeouts.
- The catalog (`catalog/`, shots in `out/waveform-catalog/`): waves, font sets and caption setups
  from the user's old mediamake timelines. Use its waves as shapes; a new part the user picks goes
  back in with `source: 'new <date>: <slug>'`.
- Layer names for edits.json and the editor: `cover`, `overlay N`, `wave` (`wave N`), `subject`,
  `lyrics`, `logo`.

## Gotchas

- Values are px for 1920×1080. For 9:16 or 1:1, set positions again; don't scale old values.
- The waveform atoms read the song themselves. Never add an `<Audio>`.
- A style-only `containerProps` on a caption setup replaces the preset's `inset-0` box: the lyrics
  slide off-frame. Don't.
- SVG `font-family` can't read an unquoted name with punctuation: register local fonts under plain
  names (`StackedLyrics` does).
- When prepare warns that `analysis/lyrics.aligned.json` differs from `input/lyrics.json`, re-run
  `analyze --only align`, then prepare.
- The Remotion editor reads `src/`, `catalog/` and `projects/<slug>/`: code imported from anywhere
  else breaks it.
- A dangling symlink under `projects/` used to crash every bundle (fixed in `scripts/bundle.ts` with
  timestamp snapshots); still copy footage in rather than linking it.
- `wave-lab` bundles all of `projects/` (~30 s before the first still).

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
- 2026-10-30 · Devil in the Details: "the waveform colors dont match the background picture, also it
  all looks bland without some good effects or textures" → then, after textured filter looks: "i
  dont like any of them, be creative use segmentation, add effects, visualisers … it should look and
  feel good" → a catalog wave keeps its shape but takes its colours from the picture; filter-only
  looks (grades, grain, leaks) read as bland. Cut the subject out first (BiRefNet, local and free:
  `projects/devil-in-the-details/tools/cutout.py` → `input/cutout/subject.png` + a clean `plate.png`),
  make the plate the cover and the cutout a `subject` (src/mediamake/Subject.tsx), so visualizers
  sit between the world and her (a spectrum ring round the sun behind her, shockwaves, god rays
  round her silhouette) and she gets her own life (rim light, silhouette echoes on the bar, a
  colour-dodge satin sheen, a neon outline). Pitch whole concepts as 6 s clips, not single filters.
  Keep the subject's `depth` ≤ 0.15 and the plate's inpaint margin thin, or the smeared plate shows
  round her; Kingdom's film-burn flash clip turns olive over a drained background.
- 2026-10-30 · Devil in the Details, round 4: "i like the rings in the first, but improve it more, take
  inspo from attached video" (a trap-channel ring visualizer) → `horns` (Visualizers.tsx): a thin
  ring whose spectrum bands are pointed, curling blades, bass either side of the top as horns,
  thorns when quiet, leaping on the kick (`kickReach`) with a zoom smear. Tuning that worked on a
  bright red picture: 7 bands a side, `blade` 0.55, `sharpness` 2.6, `contrast` 1.6, `taper` 0.7,
  `curl` 28, black blades with a blush `stroke` over a red-hot delayed echo. Broad spectra make one
  onion-shaped blob (give each band its own blade); equal bands make a starburst (taper + contrast).
  When the user picks parts of several concepts, combine them into one look and show it as a clip.
- 2026-10-30 · Devil in the Details, round 5: "the video i gave you looks awesome, yours is bad" →
  "drop everything i said, and take inspo only from video and artwork" → when the user gives a
  reference video, copy what makes it work before adding anything: pull full-size frames through a
  hit, name its devices (here: red on black, a hollow neon ring with two pointed ears on the bass,
  echo lines, the camera jolting with motion blur), build those, and check our frames side by side
  with the reference's. Measure the band levels (spectrum-line-math in Node) instead of tuning a
  visualizer blind. Built: `cover.jolt` (camera jolts + directional motion blur shared by cover,
  subject and visualizers) and `horns` `shape: 'lobes'` with `floor`, `gap`, `ramp`, stroke-only
  layers.
- 2026-10-30 · Devil in the Details: "play with the captions, make them powerful … play with
  typography like in the summerstyle" (fonts named: Rock Salt + Bebas Neue, captions left or right) →
  a project scene, not a preset: stacked lockups in a side column (projects/devil-in-the-details/
  video/scenes/StackedLyrics.tsx) — rows fitted to the column width by a small solver, the hero word
  in the script face as its own tilted row, outlines that fill as sung, lines alternating sides.
  Measure with the browser canvas once the fonts are loaded; load fonts from local files (a stills
  run of many tabs timed out on Google Fonts); a style-only `containerProps` on a caption setup
  breaks the preset's layout box.
- 2026-10-30 · Devil in the Details v1: "the sentences should be split more. take inspo from given
  [the written lyrics] … the goal is lines & timing, if a lengthy line goes really fast as much as
  the short line, then keep it a single shot" → split screens by sung time, not word count: one screen
  per written line, a line sung longer than ~3 s split at its clause, a long line sung fast kept
  whole; even a fast pair of short clauses can split when each has its own hero word ("It's my
  kingdom, / it's my scream"). Re-cutting lines renumbers them: move `analysis/fixes.json` keys.
- 2026-10-30 · Devil in the Details: "add the inverted devils logo animation at intro section, it
  should end before the captions appear … add the ending card … and render" → the brand's logo
  animation (`brands/<brand>/logo/animated/*.webm`, VP9 with alpha) copied into the project's input/
  and played as a layer over the intro (`OffthreadVideo transparent`), fading out before the first
  line's entrance; the end card joined after the render with ffmpeg (no re-render), the raw render
  kept in v<N>/. Attach the end card at its own level: lifting it (−22.7 → −17 LUFS) drew "reduce
  the volume to 0.25x … edit the original end credits to such volume", then "i don't like end screen
  noise, remove it completely" → the INVERTED Devils end screens are silent at the source
  (brands/inverteddevils/outros with a silent track, silent beds, the scenes' SfxMix gain 0;
  originals in outros/v1/, the −29 LUFS step in v2/). Attach them as they are: no end-screen sound.

- 2026-10-31 · "the waveform lyric skill is very flawed, i have tried it twice with mahishasura
  mardini once, and this time here, improve the basics of this skill, rewrite if needed … learn from
  the heavy feedback i gave" → rewritten around what landed: ten rules at the top (reference =
  target, whole looks as clips, cut out the subject first, colours from the picture, never duller,
  typography not presets, written lines timed by singing, silence silent, preview don't render, ask
  before paying); the old three-pick catalog storyboard replaced by complete looks; `StackedLyrics`
  and `LogoSting` promoted from the Devil in the Details project into `src/mediamake`.
- 2026-10-31 · the user corrected the rewrite's rules: "a reference video is the target … but no
  need to copy, creative liberty is okay" · "the subject is cut out … not necessarily, depends on the
  idea, first come up with an idea based on the given image and track" · "colours come from the
  picture: yes, mostly, but sometimes contrast is important" · "lyrics are designed type … extremely
  designed, caption presets are good inspo but majority of them are boring, ask user for inspo, or
  search for it on pinterest or youtube or anywhere" · "lines follow your written lyrics … untrue,
  lines try to follow written lyrics until or unless it does not fit the style of the overall higher
  level idea" · "end screen sound is optional, and do not ask it at end, ask it at start only" ·
  "preview in the Remotion editor and render only when asked: most important, otherwise time waste"
  → eleven rules (idea first; reference = target with creative liberty; whole looks; segmentation
  only when the idea needs it; colours mostly from the picture, contrast when needed; never duller;
  extremely designed type after an inspiration board; written lines unless the idea re-cuts them;
  silence silent, end-screen sound asked at intake; the Remotion editor as the preview, renders only
  on request; ask before paying); new steps 3 (the idea) and 4 (the picture, as the idea needs).
- 2026-10-31 · Genki Dama OST (AMZ, instrumental, a near-white Goku picture, the user's own mediamake
  waveform preset pasted as JSON, their FX clips bright-on-black) → what landed (projects/genkidama-ost,
  prefs.md has every note): the preset used as is (`waveform-audio`, its own values), recoloured and
  made taller only on request; on a light picture `screen` hides black-ground clips, so overlays are
  luma-keyed (OverlayVideo `key`), placed in boxes with `feather`, played on hits (`hits`, `cut` for
  a 3-frame inverted impact frame in `difference`), windowed (`when`, also on visualizers), and
  glows must be lighter than the ground ("the gathering lines have shadow … not shadows, but an
  exposure like glow"). New parts: PictureLook `heat` (haze rising from the bottom), cover
  `defocus` (the lens hunting through heat at a few quiet moments, "keep it focused for majority"),
  Subject `tremor` (power-up jitter rising through the sections), Visualizers `gather` (energy
  streaming into a point and dissolving into an `orb` that grows over the song, `upward`). Zoom
  jumps: keep them rare and small (jolt on the top quarter of kicks, zoom ≤ 1 %, beatKick ≤ 0.25);
  "the last zoom was too loud for the playing music". When the user picks "the second", count the
  reel's clips (L0 came first): it meant L1, not L2.
- 2026-10-31 · Genki Dama, later rounds → zooms: "at most 4 times through the entire video" (no
  zoom loop, no kick pulse; cover `motion: 'push'` + a few `zooms`); a zoom on the key moment
  "looks stupid" and colour flash-cuts of other pictures weren't wanted either — the key moment
  carries through what starts there (an aura on the subject, bolts, a background change). Bars that
  look cropped are hitting their container's ceiling (capped at half its height): grow the container,
  keep amplitude ≤ 1. The user wanted the bars, not a new smooth wave, once tried both ("finalise
  the bar waveform"), and behind the subject. Background images from Pinterest (Browse Hack bulk
  download, one search per tab): drop off-topic and dark-ground ones, grey + multiply at ~0.2 on a
  light picture, OverlayVideo `images` at ~4 frames each ("marvel titles speed"), looping, with a
  long fade-out (`when` with fade lengths).

