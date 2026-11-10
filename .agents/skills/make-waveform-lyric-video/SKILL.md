---
name: make-waveform-lyric-video
description: Make a one-picture lyric video in Remotion from a song (an audio file) and a poster or artwork — the picture alive on the beat (its subject cut out over a clean plate, so visualizers, light and effects sit between the world and the subject), an audio-reactive visualizer, the lyrics as designed kinetic typography placed in the picture's free space, the channel's logo animation and its end screen. It transcribes the song and re-cuts the lines into screens, starts from a target (a reference, or the channel's last approved recipe) instead of a blank page, builds a minimal first version with the extras offered as options, runs machine checks before the user sees anything (the cutout, looping clips, editor imports, timing, brightness), and reviews every section at once in a sampler of 10-second previews; the Remotion editor is the live preview and the master renders once, after sign-off; reviewed through Revisions (revise-video). Builds in apps/studio on the engine's lyrics part (@mediamake/engine/lyrics). Use when the user says "make a waveform lyric video", "lyric video with a waveform / audio visualizer / spectrum", "here's a song and a poster, make the video", "/make-waveform-lyric-video", or asks to change a project with a video/storyboard.ts. Not for storyboarded motion-graphics lyric videos built scene by scene (make-lyrics-video) or footage edits (make-video-music-remix). New user feedback goes in your notes (mm notes add), never in this file.
---

# make-waveform-lyric-video

The channel lyric video: **a song and one picture in, a finished video out.** First written around
catalog menus, rewritten on 2026-10-31 around the user's rules (below), and reworked on 2026-11-10
because the videos still took too many rounds (next section). Read the rules and the defaults first;
they are the user's own words turned into practice.

`projects/<slug>/…`, `out/…`, `brands/…` and `overlays/…` are folders of the user's workspace (`mm
workspace` prints where). The engine is `@mediamake/engine/lyrics` (`apps/studio/src/mediamake`, read
its `README.md`). Analysis, prepare, stills, the shot map, Revisions and the Remotion editor are
shared with `make-lyrics-video`. Each project keeps a taste doc `projects/<slug>/prefs.md` (intake,
picks, a dated log of every note).

**Before planning, read:** your notes (`mm notes make-waveform-lyric-video`), the lessons log at the
bottom, the channel's recipe (`brands/<brand>/waveform-recipe.md`, step 10) and the prefs.md of the
channel's last approved video.

## Why it took so many rounds, and what changed (2026-11-10)

Hollow Soul (AMZ, 2026-11-09) took 12 review rounds and about fifty notes before the user signed it
off. Sorted by cause:

| cause | Hollow Soul's notes | now |
|---|---|---|
| a machine could have caught it | the watermark still there (twice); the cutout not clean at the bottom left; the ring's loop seam; a jump 6 s into the ring clip; glitch boxes before the words; the editor showing nothing (the lyrics needed opentype.js) | the checks, step 7, before every showing |
| an intake question never asked | the type's motion reference (came in round 6); their own overlay files ("use the file i gave"); the logo at the start or the end (moved in round 9); whose mark the watermark was | intake, step 0 |
| a default the user had to correct | small words too small; lines late ("0.3 secs faster"); type with no motion; brackets on screen; all caps in verses; the logo too big | the house defaults and the channel's recipe, step 5 |
| added, then taken out | circles, underlines, inverted impact frames, rays everywhere, an electric sparkle, a moss texture, loud particles | minimal first; extras are options the user ticks, step 5 |
| taste only the user can set | the title card (four rounds: trace, fill, liquid, glitch); the ring only in the choruses | two or three treatments shown at once, step 6 |

Across the channels' projects, the ones with a fixed target (a reference to match, or the channel's
last approved video) settled in 5–6 entries of their prefs.md; the ones designed from a blank page
took 13 to 55. So every video starts from a target, and every round shows every section.

## The rules

1. **The idea comes first.** From the picture and the track (what it says, how it sounds), and a
   reference when there is one, pitch a few high-level ideas for the whole video (the world, what
   moves on the beat, what happens to the subject, how the lyrics look) before building anything.
2. **A target, never a blank page.** A reference the user gives is the target to beat: pull
   full-size frames through its strongest moment, name the devices that make it work, compare ours
   **side by side**; creative liberty is fine ("no need to copy, creative liberty is okay"). Without
   one, the channel's recipe (its last approved video) is the target; without that, the house
   defaults (step 5).
3. **Show whole looks, never menus of parts.** One look = the picture's grade + the visualizer + what
   happens to the subject + the lyric type, shown together at a hook moment. The catalog is a parts
   bin, not a menu.
4. **Minimal first, extras as options.** The first build is the picture, the subject (when the idea
   needs the cut), one visualizer, the lyrics, the logo and the end screen. Overlays, camera effects,
   glitches, rings, flashes are offered as a list the user ticks; each one ticked is shown in the
   next sampler. Never add an effect nobody asked for.
5. **Segmentation when the idea needs it.** Cut the subject out (step 4) when the idea puts things
   behind them or treats them apart from the world; check the cut on magenta at full size.
6. **Colours mostly from the picture, contrast when it matters.** A catalog wave keeps its shape,
   never its colours; bring in a contrasting colour where the idea needs separation or punch.
7. **Never duller than the source.** The render stays at least as bright and as saturated as the
   picture (`mm preflight --source=…`) unless the user asks for a grade. Judge on full-size frames.
8. **Lyrics are designed, moving type.** Not a caption preset (good inspiration, mostly boring).
   Gather inspiration first, a motion reference above all; words build as they are sung and the hero
   word moves (no static type).
9. **Lines follow the written lyrics, unless the idea says otherwise.** Timed by singing: a line
   sung longer than ~3.3 s splits at its clause, a long line sung fast stays whole; the hero word
   chosen by meaning.
10. **Silence stays silent.** No lyric over music-only stretches. End-screen sound is asked at
    intake, never at the end.
11. **Check before the user does.** Every showing goes through step 7. Anything the user finds that a
    command or a full-size still could have found is a round wasted.
12. **Preview, don't render.** The user's live look is the Remotion editor
    (`https://mediamake.microfox.app/remotion-editor?project=<slug>`; every link uses this base,
    never localhost). A render for review is a sampler of 10-second previews (step 8), only when the
    user asks; the master renders once, after they sign off. Earlier renders are kept (`v<N>/`).
13. **Ask before paying.** Transcription (~$0.03 for 3 min), fal mattes, upscales and edits: say
    the estimate and wait for a yes. Segmentation, analysis and renders are local and free.

## First: check the MCPs

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/elevenlabs` | required | Its API key: the song's timed words, every word's start and end (`mm transcribe --yes`, Scribe on the vocal stem's MP3; not its own `speech_to_text`) | The hosted ElevenLabs connector's `creative_transcribe_audio` then `--save` instead, or the user brings a timed `lyrics.json` |
| `mcp/browse-hack` | recommended | Type and look inspiration from Pinterest (`pinterest_bulk_start`), and outcropping a portrait poster to 16:9 with Midjourney (`midjourney_outcrop`), in the user's Chrome | Inspiration only from the user's own references, and a portrait poster needs fal or the user to outcrop it |
| `mcp/fal` | optional | A sharper matte where the local cut loses dark edges (BiRefNet v2, ~$0.01), upscales and edits of a poster (paid, asked first) | The local cut and the poster as they are |
| `mcp/elevenlabs-connector` | optional | The alternative where no local MCP runs (the Claude web or phone app): `creative_transcribe_audio` on the vocal stem's MP3 through its file picker widget, then `--save` | Nothing, while the ElevenLabs MCP's key is set up |

Look for the tools named above (`mcp__<name>__<tool>` in Claude Code; a connector added in the
Claude app has a random prefix, so match on the tool's name; load deferred ones with ToolSearch).
If one is missing, say what it costs before starting and offer to install it from MediaMake ("Set
up mcp/<name> from MediaMake by following
https://github.com/microfox-ai/mediamake/blob/main/install.md"), or go ahead without it.

## What it needs

1. **The song** (`.wav` preferred, `.mp3`, `.m4a`).
2. **One picture** (a poster or artwork), 16:9 or outcropped to it (`midjourney-outcrop`): a portrait
   cover-fitted to 16:9 loses the face. ≥ 1920 px wide needs no upscale.
3. Optional, asked at intake: the written lyrics, a reference, the channel (a brand under `brands/`),
   their own overlays and clips.

An instrumental (no text on screen) goes through prepare with `input/lyrics.json` = `[]`.

## 0. Intake: the questions that cost rounds when skipped

`AskUserQuestion` (four questions a call, so two short calls at most), recommended option first; skip
what the request or the channel's recipe already answers:

1. **The song and the target:** what it is about, the feeling it should leave, the channel; what it
   should be as good as (a reference video or picture, the channel's last video, or "show me ideas").
2. **The type:** a lyric video whose **type motion** they like (a link or a file: the motion matters
   more than the font), fonts they want, or "find some" (Pinterest).
3. **Their own media:** overlays, clips or textures they want used (search the library first, `mm
   media find`, and show what is there); otherwise none until they tick extras (rule 4).
4. **The brand moments:** the logo sting at the start, at the end over the outro, or both, and small
   (the default); a title card or not; the end screen, and whether it keeps its sound.
5. **The picture:** a watermark or signature on it? Ask whose it is before touching it: the user's
   own mark comes off when they ask, anyone else's never. Faces or details to keep clear.
6. **Transcription OK** (paid, ~$0.03 / 3 min), and the written lyrics if they have them.
7. **Looks first or the whole video** (`revise-video` › Previews or the whole video): looks when the
   idea is open, the whole video when a reference or the recipe sets the target. Under a minute: the
   whole video, don't ask.

Write the answers to `projects/<slug>/brief.md`; start `prefs.md`.

## 1. Lyrics

Put the song and picture in `projects/<slug>/input/` (from the library: `mm media use`; slug rules as
make-lyrics-video step 1). Separate the vocals (`mm analyze <slug> --only separate`, ~1 min, free) and
transcribe the vocal stem as CLAUDE.md › Transcription says (paid: the first run prints the price):

```bash
mm transcribe <slug>                      # cached words, or the MP3 and the price
mm transcribe <slug> --yes                # Scribe with the ElevenLabs MCP's key
```

Then write the screens, one a line, in `projects/<slug>/input/screens.txt` and re-cut with this
skill's tool (it keeps every word's time, stops on a mismatch, flags screens sung longer than 3.3 s):

```bash
python3 .agents/skills/make-waveform-lyric-video/tools/recut.py <project folder>
```

```text
fix: they marked my -> they mocked my         # the written words win over what Scribe heard
[verse]
I was born<br/><b>white</b><br/>in the dark   # <b> the hero, <br/> the rows
[chorus]
<b>Hollow soul,</b>
```

Diff the written lyrics against the transcription word for word and report only the real
differences (as `fix:` lines). No brackets on screen; repeats written out. Show the numbered screens
with their hero words and let the user correct them.

## 2. Analysis and prepare

```bash
mm analyze <slug> --plots          # background: stems, beat grid, CTC alignment
mm prepare <slug>
```

Read the report (make-lyrics-video step 2): lines marked `<-- check` (zoom with `analysis/zoom.py`,
pin only what the spectrogram shows in `analysis/fixes.json`); re-cutting renumbers the lines, so
move the fixes. Note the section labels prepare prints: the sampler (step 8) names them.

## 3. The idea

Look at the picture, listen through the analysis (energy, sections, the hook), read the lyrics,
study the target. Pitch **3–5 ideas**, each a few lines: the world, what moves on the beat, the
subject, the lyrics and where they sit, and what it is measured against. Show rather than tell
where it helps (a quick grade of the picture, a reference frame, a board). Record the pick in
prefs.md.

## 4. The picture

- **Marks:** zoom into the picture's corners at full size before anything else. Ask whose a mark is
  (intake 5); a mark the user wants gone is inpainted into a new file beside the picture, and checked
  in a full-size still of the render.
- **Segmentation** (when the idea needs it), with this skill's tool:

  ```bash
  uv run --script .agents/skills/make-waveform-lyric-video/tools/cutout.py <project folder> [--src input/picture-clean.png]
  ```

  It writes `input/cutout/` (`subject.png`, `matte.png`, a clean `plate.png`, `check.jpg`) and keeps
  any earlier cut in `input/cutout/v<N>/`. **Look at check.jpg's magenta row** (and crops of it at
  full size): a lost dark edge shows at once there. Fix it with `--patch crop:box` (the model again
  on a crop), `--fill x,y …` (dark pixels inside a polygon), or a matte from fal's BiRefNet v2 at
  2304 px (`--matte`, ~$0.01, ask first), which cut Hollow Soul's dark fur where the local model
  couldn't.
- **Free space:** where the lyrics go, between the subject's edge and the frame's, measured on the
  matte at the zoom loop's extremes. **Focal points** in frame px (a face, a held object, a light,
  a hole in the chest): effects lock to them.

## 5. The first build: target, recipe, minimal

Start from the channel's recipe when there is one (`brands/<brand>/waveform-recipe.md`), else from
the house defaults below; then build the idea in its **minimal** form (rule 4). When the user chose
looks first, that is 2–4 complete looks in `video/storyboard.ts` (`mm wave-lab <slug> looks --only=L1,L2
--clip=6`); otherwise one look, straight into the whole video.

**House defaults** (where rounds ended; a recipe or the user overrides them):

| | default | learned from |
|---|---|---|
| timing | every line shows 0.3 s ahead of its singing; lines hand over back to back (one leaves in ~0.16 s as the next enters) | Hollow Soul, Postcards from Tomorrow |
| size | small words ≥ 56 px at 1080p, the hero ≥ 2.5 × that, readable over the busiest frame | Hollow Soul ("the smaller words are not visible") |
| motion | words build as sung; the hero slams or writes on; the held stack creeps; never static | Hollow Soul ("typo has no effect or animation at all") |
| screens | short screens in choruses (a title phrase its own shot), a written line a screen in verses, no brackets | Hollow Soul |
| not by default | underlines and swashes, glitch blocks between lines, inverted impact frames, shapes drawn round the words, smoke, rays everywhere | Hollow Soul, the no-smoke rule |
| logo sting | small (about a third of the frame's width), where intake put it | Hollow Soul ("much smaller") |
| overlays | the user's own clips first; tinted with a CSS filter (`sepia(1) saturate(6) hue-rotate(…)`), not `tint`, where a clip has white streaks; subtle | Hollow Soul |
| looping clips | checked with `mm clip-loop` before use; a ping-pong up to the first jump when the ends don't meet | Hollow Soul (three rounds on one ring) |
| the picture | never darker or duller than the source; `dim: 0`, text gets its own shadow | rule 7 |

**Extras** to offer once the minimal build stands (a multi-select; each one ticked appears in the
next sampler): overlays (particles, light rays, sparkle, dust), camera (handheld shake, jolt, blur,
defocus), exposure flashes on the hits, a glitch on the type, a ring or halo round the lyrics
(`SpinOverlay`), sparks from a focal point, a title card, a second picture state (`cover.stages`).

## 6. The type and the title card

**Inspiration first:** the user's motion reference (frames side by side at the hero's landing), or a
board from Pinterest (Browse Hack, the user's profile) in `out/<slug>/<slug>-type-inspo/`
(`/file-revision`). Then design from the engine's lyric scenes:

- **`GlyphLyrics`** — kinetic type drawn from font outlines: the house defaults above built in,
  optional `glitch`, `chorusHero`, `verseCaps`, `drive` windows, and a `title` card (outline traced,
  then a liquid fill, then out). It shows the same in the hosted editor, which can't load fonts from
  outlines at run time: run `mm glyphs <slug>` (the fonts the code names, the lyrics and every string
  in the code), then `registerGlyphs(GLYPHS)` in `video/index.tsx`.
- **`StackedLyrics`** — stacked caps + a hero word in side columns, the centre bottom, or a `power`
  outro; **`KineticLyrics`** — short screens whose hero moves by meaning (`metadata.fx`).
- A project scene when the idea needs something else (copy one of these as a start).

```tsx
import { GlyphLyrics, registerGlyphs } from '@mediamake/engine/lyrics';
import { GLYPHS } from './glyphs';   // mm glyphs <slug>
registerGlyphs(GLYPHS);

layer({ scene: GlyphLyrics, at: 'all', name: 'lyrics', props: {
  fonts: { caps: '<slug>/fonts/CormorantSC-700.ttf', hero: '<slug>/fonts/PirataOne-400.ttf' },
  box: { x: 1360, y: 540, width: 600 },             // the free space's centre and width
  size: { caps: 62, hero: 160 },
  colors: { hero: '#4dff7c', pen: '#c8ffd6', sung: '#ecfff1' },
  heroCase: 'capitalize', chorusHero: { font: '<slug>/fonts/PirataOne-400.ttf', case: 'upper', size: 150 },
  title: { text: 'Hollow Soul', from: 1.6, to: 13.02, scale: 1.25 },
} }),
```

**The title card** is taste only the user sets: show two or three treatments **at once** (written on,
liquid fill, slam; a fade or a glitch out on a hit), as one sampler of the intro, never one per round.

Fonts are files in the project (`projects/<slug>/fonts/`). Check full-size stills across every
section: words never touch, the hero reads, nothing over a face, nothing in a visualizer's box.

## 7. Before every showing: the checks

Run these before any link, still or file goes to the user, and fix what they find:

```bash
mm editor-check <slug>                 # the hosted editor can load every import (also in preflight)
mm clip-loop <clip>                    # every looping overlay: its seam and any jump inside
mm stills <slug> <s,…> --only --scale=1   # a frame per section: verse, chorus, bridge, outro, an interlude
mm preflight <slug> --source=projects/<slug>/input/<picture>   # on any render: black, frozen, sound, duller
```

- the cutout's magenta row (step 4) and the picture's corners (a mark the user asked to remove is gone);
- the first line enters with the voice and lines leave before music-only stretches;
- the logo and the title don't sit over the subject's face;
- every extra the user ticked is visible, and nothing they didn't tick is there.

## 8. Review: the section sampler

- **Live:** the Remotion editor link (rule 12); say which timeline mark to jump to. The user's moves
  save to `video/edits.json`; a project scene loads files with the kit's `asset()` and declares its
  knobs with `withKnobs`.
- **A render to review** (when the user asks, or for your own check of motion stills can't show):
  one file with the first 10 s of every section, so a round covers the whole song:

  ```bash
  mm render <slug> --preview=intro,verse-1,chorus-1,bridge,outro   # the labels prepare printed
  mm render <slug> --preview                                       # next rounds: around what changed
  mm render <slug> --look=L1,L2 --preview=chorus-1                 # looks side by side in one grid
  ```

- **One round = every note:** act on all of a revision's notes, run step 7, then one sampler. Record
  each note in prefs.md with its round.

## 9. Render and deliver (only when asked)

1. **Master:** `mm render <slug>` once the user signs off (≈ 10 min for 3 min; retry once on a font
   timeout). The previous render moves to `v<N>/`.
2. **End screen:** keep the raw render in `v<N>/`, join the channel's end screen with ffmpeg (60 →
   30 fps, CRF 15, the concat filter) as chosen at intake (its own level, or silent), and add an
   `end screen` section to the map.
3. **Check the file:** duration, the song's loudness unchanged (`ebur128`), frames across the song,
   `mm preflight`. Then the `open -R` block and the Revisions link (`revise-video`).
4. **Deliver** only what the user approved (`mm media deliver`); a variant they ask for is a look
   (`--look=<id>`), rendered beside the final, never over it.
5. **Then, when asked** (in parallel sessions when the user says so): the cover
   (`create-music-poster`), the YouTube pack (`pack-youtube`), the DistroKid release.

## 10. After sign-off: the channel's recipe

Write or refresh `brands/<brand>/waveform-recipe.md` (the workspace's brands folder, not the repo):
what the user approved, so the channel's next video starts there (rule 2). Then `mm notes add` each
lesson (below).

```markdown
# <Channel> · waveform lyric video recipe (from <slug>, <date>)
- picture: cutout over plate; grade …; camera (jolt, handheld, defocus at …)
- visualizer: <kind and settings>, <side>, <colours from the picture>
- type: GlyphLyrics; caps <face> <px>, hero <face> <px>, case verses/choruses; early 0.3; glitch …
- screens: <how lines were cut>
- overlays: <files from the library, blend, filter, opacity, when>
- logo: <start or end>, <box>; channel name <face, tracking>; title card <treatment>
- end screen: <file>, <sound or silent>
- not wanted: <what the user took out>
```

## Engine parts and commands

| part (`@mediamake/engine/lyrics`) | what it does |
|---|---|
| `CoverBackdrop` | the picture or the plate: zoom, beat kick, `jolt`, `handheld`, `defocus`, `offset`, `stages`, a clip as the cover |
| `PictureLook` | grade, duotone, bloom, chroma, grain, vignette, exposure, heat, rays, leaks… |
| `Subject` | the cutout over the plate: its grade, rim, echo, sweep, outline, tremor, `stages` |
| `WaveformLayer` + `Visualizers` | bars and waves; `horns`, `halo`, `yantra`, `sparks`, `gather`, `rings`, `bolt`, `flames`, `eclipse`, `iris` |
| `OverlayVideo` | a looping clip: blend, filter, box, feather, `when` windows, `hits`, `follow`, `front`, a luma key (`luma`) |
| `SpinOverlay` | an overlay clip turning about a point and swelling on the beat (a ring of fire) |
| `GlyphLyrics` · `StackedLyrics` · `KineticLyrics` | the lyric scenes (step 6) |
| `LogoSting` · `ChannelTitle` | the logo animation in a box; the channel's name under it, spreading as it fades in |
| `OldTV` · `Stages` · `TrackTitle` · `OverlayText` | old-TV effects; picture states; title + artist; a text line |

| command | for |
|---|---|
| `mm glyphs <slug>` | fonts as outline data for GlyphLyrics and ChannelTitle |
| `mm clip-loop <clip> [--pingpong]` | a clip's seam and jumps; a ping-pong loop without either |
| `mm editor-check <slug>` | packages the hosted editor can't provide |
| `mm wave-lab <slug> looks\|waves\|final` | labelled stills, clips, a reel and a grid of looks |
| `mm stills <slug> <s,…> --only` | full-size frames (the folder is cleared every run: copy them out) |
| `mm render <slug> --preview=…` · `mm render <slug>` | the sampler · the master |
| `mm preflight <slug>` | machine notes on a render before the user sees it |
| `tools/recut.py` · `tools/cutout.py` · `tools/align_states.py` | screens → lyrics.json · the cutout and plate · several pictures of one frame aligned |

Layer names for edits.json and the editor: `cover`, `overlay N`, `wave`, `subject`, `lyrics`, `logo`.

## Gotchas

- Values are px for 1920×1080. For 9:16 or 1:1, set positions again; don't scale old values.
- The waveform atoms read the song themselves. Never add an `<Audio>`.
- The hosted editor loads only its own packages (`mm editor-check`): precompute anything else in a
  script and import the data (fonts → `mm glyphs`).
- A ring turning about the wrong point orbits: fit the circle in the clip (its brightest pixels over
  every frame) and put `about` on its centre.
- An overlay clip whose first and last frames don't match flashes on every loop: `mm clip-loop`.
  Remotion can't play a clip backwards: a ping-pong is a new file (the command writes it under a new
  name, which also keeps the editor from showing a cached copy).
- SVG filters: `feTurbulence` + `feOffset` slides the noise out of its region; the default
  linearRGB darkens noise (use `colorInterpolationFilters="sRGB"`).
- OverlayVideo's luma key is `luma` (`luma: { gain: 2.6, floor: 0.08, boost: 1.3 }`), never `key`:
  layers reach their scene through a props spread, and React takes a prop named `key` out of it, in
  Studio and in renders alike. A clip given `key` plays unkeyed: in `screen` (Genki Dama's, which looked
  right on its darker picture) or, with `blendMode: 'normal'`, as Postcards from Tomorrow's "dark sheet".
  The kit warns in the console when a layer passes `key`.
- A style-only `containerProps` on a caption setup replaces the preset's box: the lyrics slide off.
- When prepare warns that `analysis/lyrics.aligned.json` differs from `input/lyrics.json`, re-run
  `mm analyze <slug> --only align`, then prepare.
- A clip as the cover plays as a real `<video>` in the editor, which Chrome draws black under an SVG
  filter: CoverBackdrop keeps filters on a wrapper. Check clip covers in the editor too.

## Lessons log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add make-waveform-lyric-video "<what the user said> → <the rule>"   # a new lesson, dated for you
mm notes make-waveform-lyric-video                                           # your notes for this skill
```

When the user wants them shared, `mm notes promote make-waveform-lyric-video` offers them to this log as a pull request.

- 2026-10-25 · "based on the timeline based waveform linked lyric video create another make skill
  call it make-waveform-lyric-video" → this skill on the `src/mediamake` engine. Built with it:
  `OverlayVideo` (tint as the editor's filter), and prepare keeps mediamake caption metadata through
  the alignment. A portrait picture cover-fitted to 16:9 loses the face: outcrop or `fit: 'contain'`.
- 2026-10-25 · "i meant the existing timelines as inspiration … it should only intake an audio file,
  a poster or an artwork … storyboard into 3 steps: waveform choice … font choice set … captions
  animation … create templates and screenshots" → intake is the song and a picture only (the skill
  transcribes); the storyboard is three stopped steps, each shown from the catalog plus new designs on
  the song's own picture until the user is satisfied; the catalog (`apps/studio/catalog`: 28
  waves, 30 font sets, 31 caption setups distilled from 185 waveform and 184 caption tracks, with
  screenshots) and `mm wave-lab` keep this cheap every time; picked new designs go back into the
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
  picture's free area. studio' runPreset now injects the editor's htmlText helpers (synced
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

- 2026-10-31 · Cadence (INVERTED Devils, an eye-patch warrior before an eclipse crescent): "take inspo
  from devil in the details camera effects" → a channel's next video starts from the camera of its last
  approved one (beatKick, `cover.jolt`, subject depth/blur, a punch and zoom smear on the main
  visualizer). When the picture's own feature is the idea (the eclipse), take it out of the plate and
  redraw it as a visualizer so it can change over the song (`eclipse`: the moon closing on a time path,
  a corona that grows as the sun hides, diamond rings placed where the subject doesn't cover them). The
  type direction came from a 4-direction Pinterest board (picked "Engraved decree": wide-tracked serif
  caps); an upright, wide-tracked serif stack needed StackedLyrics `leading`, `heroStroke` ≈ 0 (keep the
  hairlines), `wordSpace` and a `glint`; the centre bottom over a bright prop (a medallion) swallowed
  unsung words, so side columns only.
- 2026-11-02 · Goten Theme (AMZ, Gregorian-chant OST, four Midjourney pictures of one frame in power
  stages): "there are multiple variants, use them all, may be like a glitch effect … and take
  complete use of overlays folder" → when the user gives several pictures of the same frame, align
  them (this skill's `tools/align_states.py <project> [reference]`: ORB + similarity warp) and use them as `cover.stages`
  (src/mediamake/Stages.tsx): a plan of which stage holds when (hard cuts on the booms, carried by a
  gate burst; or crossfades), glitch rules on the hits (bands of another stage shoved sideways,
  channel split, inverted now and then; `show: 'next'` in the builds, `'others'` on the strong hits),
  and a Subject with one cutout per stage (`stages`) that draws the same bands. "The overlays folder"
  = the library in the workspace's overlays/: catalogue it first (three frames a clip on a contact
  sheet), copy the picks into input/overlays and lay them out by stage with `when` windows. Before
  showing, scan every looping clip's brightness (signalstats at 10 fps): clips that flash white at
  their start or end flash the frame on every loop (trim with `offset` / `clipSeconds`), and some
  carry text (the colour-glitch clip has terminal text): look at the stretch that plays. Stacked
  `screen` clips wash a saturated picture milky: crush their grounds (`filter: 'contrast(1.4)
  brightness(0.88)'`) and measure SATAVG against the picture.
- 2026-11-02 · Goten Theme, after L2 was picked: "dont use the rainbow colored artwork anywhere,
  only use it in the glitch effects, and add more old tv style visual fx, like blink out" → a stage
  the user doesn't want held can stay in the glitches only (leave it out of `stages.plan`, name it in
  the glitch rules' `show`, play its clips only on the hits). Engine `OldTV` (a layer over everything:
  scanlines, hum bar, flicker, tube corners, tracking noise, snow on hits, `blinks` where the picture
  squeezes to a bright line and opens on the change, `off` at the end). Then "add some camera slow
  handheld shaking effect giving realistic feel, also use camera blur" → cover `handheld` (slow
  layered noise drift ≤ 10 px with its own motion blur) and a few `defocus` moments (rack in at the
  start, drift out before a boom and snap sharp on it, soft into a lull, melt at the end).
- 2026-11-02 · "why are you creating wrong remotion urls, always use the base url -
  mediamake.microfox.app - note it down in skills or wherever" → every link given to the user (the
  Remotion editor, Revisions, File Revisions) is `https://mediamake.microfox.app/…`, never
  `localhost:3002` (removed from this skill, revise-video and revise-image); a local dev server is
  only for your own checks.
- 2026-11-03 — "lets make a script and put it in default skill setting across all skills, that better convert
  wav to mp3 before running elevenlabs scribe", then "connected hosted elevenlabs mcp (creative_transcription is the
  first choice, if it is not there, then it should do)" → CLAUDE.md › Transcription for every skill:
  `mm transcribe` first (cached words, or the stem's mono MP3 and the price), the ElevenLabs connector on that
  MP3 then `--save`, else `--yes` with the ElevenLabs MCP's key; the connector is the first MCP to install.
- 2026-11-04 — "having the old elevenlabs archived mcp is better than the new one, as it keeps opening a stupid
  widget for transcription. old elevenlabs mcp with api key setup is much cleaner" → flipped back: the ElevenLabs
  MCP's key (`mm transcribe --yes`, no widget) is the first choice and the first MCP to install; the hosted
  connector is only the alternative where no local MCP runs (the Claude web or phone app). Its transcription
  tool is built around a file-picker widget and a flow canvas, and every result is a run to download from.
- 2026-11-04 · WAKE UP (Get into Zone), a looping motion poster instead of a still, matched to the
  channel's own "Chasing the Skyline": the reference's mediamake timeline (`list_timelines` search,
  `get_timeline` full) gave its exact settings (side bars, `sub-fast-rap-static` one word at a time,
  title texts, dust) → copy them, and check the render side by side: the preset bolds every one-word
  sentence (use `Montserrat:500` to match its lighter look), its 0.3 s word lead is a whole word
  ahead at ~160 BPM (halve it), its 0.5 top/bottom shade darkened a bright picture ~18 % (lighten it,
  lift the clip). The clip plays as an `OverlayVideo` (`blendMode: 'normal'`, `follow: true`,
  `clipSeconds` = its frames / fps) over its first frame as the cover; a video model's loop drifts and
  snaps back to its end frame, so crossfade the tail into frame 0 (projects/wakeup-waveform/tools/loop.sh).
- 2026-11-04 · "dont use smoke overlay, it usually looks bad" → no smoke or vapour overlays, even when
  the reference timeline has one; dust in screen is fine.
- 2026-11-06 · Postcards from Tomorrow (INVERTED Devils, a pale white-haired girl with golden ring-irises,
  a square Midjourney picture outcropped to 16:9 in two framings and Subtle-upscaled): the ideas were shown
  as four quick grades of the poster (a steel-duotone negative with the eyes kept gold, a warm glow, sepia,
  bleach) beside a 24-pin Pinterest type board in four directions; picked **Spiral** (the irises as the
  visualizer) and **telegram typewriter** type. Lessons: (1) wave-lab's look clips render the Look alone,
  without the project's own layers (the lyric scene): complete looks with the type are
  `render-project --look=<id> --frames=a-b --proxy` (video/index.tsx reads `look` from `getInputProps()`,
  guarded with try/catch — it throws in the mediamake editor's Player) plus `look-grid`; (2) a visualizer's
  colour pairs must be hex (an rgba in `halo.colors` made every ray invisible); (3) god rays + bloom on a
  bright picture wash it out (YAVG 205 vs 173): measure, then drop them; (4) "i like the beat warp, dont
  like yellow box, simple typing effect is best, and even hero word should be small for subtle
  minimalistic effect (this song style is like that)" → for a minimal track the type stays minimal: plain
  typing, the hero word at the line's size in bold, no stamp, no header, no eye visualizer at all
  ("None: just the warp"); (5) "create a 6 s loop motion poster with h3 max … the eyes looping endlessly"
  → fal `minimax/h3-max/image-to-video` ($0.035/s), 1080P, the poster as image_url AND end_image_url,
  prompt expansion off, looped with the Mahalakshmi crossfade (the model still drifts off the pinned end
  frame), then `cover.image: 'loop.mp4'` + `clip` — re-run prepare so the manifest lists the clip, or
  stills 404 on it; a radially symmetric iris shows no motion even when a model "turns" it, so the
  engine's new `iris` visualizer draws concentric rings sliding inward endlessly inside the eyelids'
  opening (and `rings` gained `rings`/`spacing`/`band`/`blur`); (6) a bone-white logo on a pale picture:
  start the frame black (a BlackIn scene) and fade the picture in as the logo sting fades.
- 2026-11-06 · Postcards from Tomorrow, "put some particle overlay as well": on a near-white picture
  `screen` shows nothing, and OverlayVideo's luma `key` left the clip's black ground as a dark sheet in
  the renders (with and without feather, with a full-frame box: it isn't the render path Genki Dama's
  keyed clips were judged in). What works: invert the clip and `multiply` it (`filter: 'invert(1) …'`),
  so bright specks become soft dark dust; a gold-bokeh clip that way reads as yellow freckles on a face,
  fine snow-on-black reads as dust in the air. Check one frame of each variant through
  `render-project --look=<id> --frames=a-b` (wave-lab's look stills failed on this storyboard) before
  the review render.
- 2026-11-06 · Postcards from Tomorrow, review notes: "always put the text on the right side … since its
  rap its hard to follow the lyrics, they should appear 0.3sec early and also the unplayed words should
  be visible still just not highlighted yet … put the text shadow … add waveform on the left side like
  wake up … the initial inverted devils is too long (just play it at top right corner, the image should
  be there from the start)" → then "make it like a sheet going up like a typewriter sheet with each
  line getting highlighted at center and they fade away as they go up or down. also keep all lettering
  small lettered as if its a letter". For a rap: the whole line visible ahead (dim), words lit 0.3 s
  early, one side only, a dark shadow; a lyric scene can be a **sheet** — every line under the last in
  one column, feeding up so the sung line sits at the band's centre (eased scroll as each line arrives),
  lines fading over ~300 px above and below, the whole sheet gone over music-only stretches, lower case
  like a letter (projects/postcardsfromtomorrow/video/scenes/TelegramLyrics.tsx `reveal: 'sheet'`). A
  channel's side bars (WAKE UP's `waveform-audio` settings) recoloured to the picture's ink read on a
  pale picture; a logo sting can sit small in a corner over the picture from frame one instead of a
  black intro.
- 2026-11-07 · Postcards from Tomorrow, the bill strip: "remove the circles … use text width fitting
  and different font size for hero words, basically all of it should appear on vertical white bill
  strip" → "make it even more narrow" → "you have picked the wrong hero word, you must pick something
  small words so that they expand to fit width, and there should be a strange symmetry: if you are
  writing the first line with every in separate line, make sure you do the same for the next. filled
  with / every / joy / and / every / sorrow". The rows of a width-fitted stack are authored by hand in
  the recut (`<br/>` per row): short content words alone so they grow to the width, repeated phrases
  cut the same way, both choruses identical, the `<b>` on the small word that grows; the scene fits
  each authored row to the strip (project TelegramLyrics `strip`, no cap below ~150 px). The recut's
  words must match the alignment letter for letter (case, commas): one changed capital makes prepare
  drop every line's htmlText silently and the rows fall back to a plain wrap.
- 2026-11-07 · "it looks ugly, analyse, should give me a good visual aesthetics along with feeling like
  typelettered" (the width-fitted mono stack on the strip) → analyse before building: width-fitting a
  monospaced face makes function words the biggest, a typewriter face at 170 px is chunky, four greys
  read as mud, a flat rectangle isn't paper. A typed page is one letter size, steady rhythm, margins,
  emphasis by double-strike or a red ribbon (the channel's red), slightly uneven ink; cream paper with
  grain and a red margin line. Built as TelegramLyrics `strip.fit: false` + `paper` (grain, margin,
  per-letter jitter and ink variation) with the hero word alone in red bold; directions shot as single
  full-size frames through `render-project --look=L0 --props='{"type":"T2"}' --frames=a-a+1` (a project
  input prop choosing a props table), far cheaper than clips. "shift the video visual a bit to the left
  centering her face in between strip and left border" → CoverBackdrop `offset` (engine): a fixed
  shift everything following the cover takes; a strip on one side then runs to the frame's edge.
- 2026-11-07 · Postcards from Tomorrow, motion-poster loops: "dont do stupid blends (just abrupt cut)" → a
  loop of an image-to-video take is the take as the model made it, cut straight back to frame 0: never a
  crossfade of the tail into frame 0 (the earlier entries' crossfade is retired). Drop the final frame
  only when it is the model's pinned copy of frame 0, so no frame shows twice; measure the cut (last
  frame vs frame 0) against a normal step and say which takes jump. For a walking loop: a tracking shot
  (she walks in place, the city slides past), the picture as first AND last frame; H3 Max walks and
  returns to the end frame, FLUX 3 Max barely moves or ignores end_image_url.
- 2026-11-07 · Postcards from Tomorrow, on a picture with a black side ("remove the black strip, overlay on top of video … put the text scrolling at the center of the available black space … for highlighting last words if the line has 2 words in the appearance, highlight 2 words … in postcards from tomorrow all words should highlight") → when the picture leaves its own empty space, set the lyrics straight on it (no panel), centred in that space measured across every loop frame; take the highlight colour from the picture; pick hero words from the rows as they display (the whole last row when it is two words) and light the song's title phrase whole wherever it is sung.
- 2026-11-09 · Hollow Soul (AMZ, project cifer: Ulquiorra outcropped to 16:9, the black right half
  for the lyrics; FINAL = the variant with the ring only in the choruses, published 2026-11-09) → 12
  rounds. What landed: green blackletter heroes (Pirata One; capitalised in verses, capitals in the
  choruses) over Cormorant small words, built word by word and slammed in with a motion smear (from
  the user's Benzz reference: "make typo kinetics have motion"), a 0.3 s lead, a glitch in and out;
  the user's own fire ring turned green (CSS `hue-rotate`), turning about the lyric spot and swelling
  on the beat, as a 6 s ping-pong (the clip jumps at 6.1 s); the title traced, filled with liquid and
  glitched out on the intro's big kick inside the ring; the logo and the letter-spaced channel name at
  the end, not the start. What cost rounds is the table at the top of this file. The editor can't
  provide opentype.js: fonts became outline data. Promoted: `GlyphLyrics`, `SpinOverlay`,
  `ChannelTitle`, `mm glyphs`.
- 2026-11-09 · Hollow Soul: "remove this watermark" → declined twice as someone else's mark, then
  "nah, that is mark, remove it … my mark" → ask once whose a mark is; the user's own comes off when
  they ask (inpainted into a new file beside the picture), anyone else's never.
- 2026-11-10 · "why is it that everytime the make waveform lyric video takes so many iterations, what
  are we doing wrong with the skill" → "rework it" → the rework above: a target for every video (a
  reference, else the channel's recipe in `brands/<brand>/waveform-recipe.md`, else the house
  defaults), the intake questions that cost rounds, minimal first with extras as options, machine
  checks before every showing (`mm editor-check`, `mm clip-loop`, the cutout on magenta, preflight),
  and every round a sampler of every section (`mm render --preview=<sections>`). The cutout and the
  re-cut, copied from project to project seven times, are this skill's tools now (`tools/cutout.py`,
  `tools/recut.py` + `input/screens.txt`).
