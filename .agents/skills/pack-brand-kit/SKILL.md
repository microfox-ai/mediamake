---
name: pack-brand-kit
description: Build a complete brand kit from a logo the user gives (an image of a wordmark, plus the font names): the animated logo as a transparent reusable Remotion component, short intros, YouTube end screens, YouTube channel assets (profile picture, banner, watermark), the brand's thumbnail profile (thumbnail.json: logos, fonts, palette and rules for thumbnail jobs), a static SVG/PNG logo, a visual brand guide made in Remotion and a written brandguide.md, all exported into apps/lyrics_videos/brands/<name>/; on request, sound effects for intros and end screens (needs the ElevenLabs connector). Use when the user says "make a brand / brand kit / brand guide for this logo", "create intro animations for my logo", "logo animation", "end cards / end screens for my channel", "channel branding", "sound effects for my intro / end screen", or asks to add a scene or asset to a brand under apps/lyrics_videos/brands/ (its graphics/ source or its kit) or to the shared engine in apps/lyrics_videos/logoGraphics/. Append new user feedback to the log at the bottom.
metadata:
  depends-on: revise-image
---

# pack-brand-kit

Brand material for a logo, built in Remotion in `apps/lyrics_videos`, in two parts (read
`apps/lyrics_videos/logoGraphics/README.md` once):

- `logoGraphics/`: the **shared engine**, committed. Studio entry (`index.ts`, `Root.tsx`), the
  contract (`kit.ts`), `lib/` (components every brand reuses: `Sfx`/`SfxMix`, `Guides`,
  `loadFonts`, `createPlacedLogo`, YouTube sizes + `Backdrop`, motion helpers) and `tools/`
  (`sfx.py <brand>`, `sync_check.py <brand>`), plus `scripts/logos.ts`, `brand.ts`,
  `brand-public.ts`. Edit them minimally and additively, and re-read them right before editing:
  other brands depend on them. When a piece would help every brand, add it to `lib/` instead of
  copying it into a brand.
- `brands/<brand>/`: **one brand**, gitignored like `projects/`. `graphics/` is its source (logo,
  scenes, sounds, fonts, `brand/brand.json`); the rest of the folder is the exported kit, rendered
  by `npm run brand -w lyrics_videos -- <brand>`. More material gets added to kits over time,
  always as source in `graphics/` + a `brand.json` entry, never by hand. Don't commit brand
  files; commit engine changes only when asked.

The reference implementations are **`brands/inverteddevils/graphics/`** (INVERTED Devils, a sultry
female-vocal channel, dark) and **`brands/subhodayam/graphics/`** (Telugu devotional mornings,
light). Copy their structure; reuse `logoGraphics/lib/` and their parts where they fit.

Other brands may be in progress at the same time, made by other sessions. Touch only your
brand's folder; for the engine, see above.

## Where things go (keep it organised)

Too many files quickly become impossible to navigate, so everything has one place:

```
brands/<brand>/graphics/
  index.tsx, Logo.tsx, layout.ts, theme.ts (BRAND = '<brand>', palette, easing)
  parts/      the brand's own pieces + thin wrappers over logoGraphics/lib (Sfx, Guides, fonts, Place)
  scenes/     intro/, end/, youtube/, guide/ (+ storyboard.md)
  explorations/   earlier concepts (5-concept rounds), kept for reference
  tools/      brand-only tools (glyphs.py, tracing a logo image)
  sound/      raw/ (ElevenLabs files), sfx.config.json, sfx.json, sync.config.json
  public/     sfx/, fonts/: staticFile('<brand>/sfx/…'); assembled into out/brands/.public/
  brand/      brand.json, brandguide.md, colors.*, svg.ts, youtube/channel-description.md,
              thumbnail.json (what thumbnail jobs copy: logos, fonts, palette, rules)
out/brands/<brand>/
  renders/<scene>.mp4 (.mov/.webm/.preview.mp4)   stills/<scene>/<t>s.jpg   stills-alpha/<scene>/<t>s.png
  checks/     every contact sheet, comparison, sfx.png, sync.png: anything made to look at
```

- **Never leave files loose** in `out/`, in `out/brands/<brand>/` or at a brand's root. Review
  images go in `checks/` (or the session scratchpad), named for what they show.
- Scene ids are short and numbered by round (`intro-6-tamara`); composition ids add the logo id
  (`subhodayam-intro-6-tamara`). When options are dropped, delete their source *and* their
  renders and stills, so the folders only hold what's alive. Options the user keeps stay, source
  and renders.
- Delete throwaway sheets once they've been looked at.

For Remotion technique, use the `remotion-best-practices` skill.

## First: check the connectors

Before doing anything else, check which MCP servers / connectors this session has, and tell the
user right away about anything missing. Some are **required**, with no substitute:

| needed for | connector | without it |
|------------|-----------|------------|
| sound effects (intros, end screens) | **ElevenLabs** (`mcp__elevenlabs__text_to_sound_effects`) | sound cannot be made at all. Don't fake it with other audio. |

Everything else (fonts from Google Fonts, glyphs, Remotion scenes, renders, the guide, the
export) runs locally and needs no connector. To check, look for `mcp__elevenlabs__*` tools; if
they are only deferred, load them with ToolSearch ("elevenlabs"), which also waits for servers
that are still connecting. If a required connector is missing, or the user has no connectors at
all, say so **before starting**, name what it blocks, and ask them to connect it (e.g. via
`/mcp`), or to go ahead with only the parts that don't need it.

## The order (each step ends with the user picking)

The user decides by watching, so build real options, render them, and let them pick. They
reply like "I like the second, make the logo smaller, the others are bad", then you iterate.

### 0. No logo yet: generate concepts

When the brand has only a name, generate logo concepts with the image tools the user names
(Midjourney through the Get into zone extension, fal Nano Banana, …), as many as they ask for,
each a different device. Write them down first in `graphics/explorations/logo-<round>/concepts.md`
(ID, concept, device, tool, exact prompt), then save each concept's images in its own subfolder
(`M01-orbit-a/1.png`, `N01-radium-tile/1.png`; Midjourney downloads land in ~/Downloads, move
them), dark grounds. Check every image's spelling: re-run a concept whose text is wrong (a
stricter prompt that names the exact letters) rather than sending it. Make the folder reviewable
(`npm run image-index -w lyrics_videos -- <folder> --groups=subfolders --workflow=pack-brand-kit`,
then name each group and note flawed images in index.json), tile contact sheets into `checks/`,
send them with the review link, and let the user pick. The review page opens directly on the
deployed app, no local server needed: `https://mediamake.microfox.app/image-revision?job=<set>`
(the user opens the folder there once); the `revise-image` skill reads and closes their revision.
The picked image is then read like any logo (step 1).

### 1. Read the logo exactly

- Look at the image and identify each font. Check the real name on Google Fonts: the user wrote
  "Caligraffitti", but the font is **Calligraffitti**. Fetch
  `https://fonts.googleapis.com/css2?family=<Name>`; the 400 page says "Font family not found".
- Note what the logo does beyond the font: tracking, a bolded script (outline stroke), glows,
  colours (sample them), and proportions (relative widths, gap, alignment).
- **Never use the image itself** in the output. Rebuild the logo from the fonts.

### 2. Glyphs and layout

- `tools/glyphs.py` (fontTools + uharfbuzz): downloads the TTFs, shapes each word (kerning), and
  writes `glyphs.json` with per-glyph SVG paths and boxes. Everything renders as SVG paths, so
  nothing waits on font loading and every letter can be animated.
- For script fonts it also rasterizes and skeletonizes the word into **pen strokes**: open
  `tools/skeleton.png` and set `PEN_ORDER` (writing order and direction, in skeleton pixels) so
  the word can be written like a pen. The i's dot is separate.
- `layout.ts` places the lockup in a 1920×1080 frame (scale, tracking, gap, bold stroke) to match
  the logo's proportions. Export `INV`/`DEV`-style glyph lists, `BOX` (lockup bounds) and a
  word-space→px helper.

### 3. Explorations, then the logo component

- First round: **5 different logo-animation concepts** (`explorations/`, ~7 s with backgrounds),
  rendered and sent. Each uses one device (traced glowing lines, mirror flip, focus pull, voice
  waveform, eye slit…).
- Then the picked one becomes **the component** (`Logo.tsx`): this is the most important piece.
  - **Transparent: no background, smoke or atmosphere in it.** Backgrounds belong to scenes.
  - **Short**: the draw-in is done by ~1.8 s and the scene is ≤ 4 s.
  - **Words animate together and finish at exactly the same moment** (one `END` constant drives
    all timings; even ease-in-out on the final fill so it *visibly* lands on END).
  - No construction lines or extras the user didn't ask for. After END, only a slow breathing glow.
  - Glows are **SVG filters in the logo's own units** (they scale with the logo), sized by a
    viewBox around the lockup (`LOGO_VIEW`) so the component fills any box.
  - Export `LOGO_VIEW`, `LOGO_TIMING.drawn` (= END) and `LOGO_STILL` (a frame where the glow is at
    rest, for stills); a `LogoScene` (native position in 1080p) and a `LogoStillScene` (fills the frame).
- Render it as ProRes 4444 with alpha (.mov), VP9 with alpha (.webm) and a preview on black, and
  verify the alpha by compositing over a coloured background with ffmpeg.

### 4. Intros (≤ 5 s)

- Propose **5 ideas in the spirit of production-studio idents, but original and simple.** Build
  all five, render them, and send them.
- **The subject is open**: a physical object, something random, or purely abstract (shapes,
  light, particles, fluid, type) are all fine. What matters is that the idea is strong and
  clearly readable, done with **one idea and one camera move** each, and that the five are
  genuinely different from each other.
- What this user approved for INVERTED Devils: vinyl (grooves close-up → pull back → record low
  like a rising sun, smoke behind), a speaker cone pumping bass, piano keys in red light, red
  ink blooming in water. All have **the logo small** (~380–400 px wide at 1080p), drawn late,
  over a dark pool if the background is busy.
- What they rejected: a spotlight cone, theatre curtains, ember sparks converging, rain on
  glass. These were weak, generic executions, not rejected for being abstract.
- Make motion readable: a spinning record needs marks on it (lines across the grooves, a two-tone
  label) or the spin doesn't show. Put atmosphere (smoke) *behind* objects.
- End every intro on black or a clean fade so it cuts into the video.

### 5. End screens (YouTube, 20 s)

- Logo + the channel's line (e.g. "New Music Every Monday & Saturday") **together in the top
  section**, and the bottom left **clear for YouTube end-screen elements**.
- Offer **5 different layouts** (centred marquee, left wing with an object, one-row header with a
  divider, tagline flanking the logo, badge…), each with its own background. Draw dashed card
  slots behind a `guides` prop (preview only, never in the final video): video ≈ 620×349, subscribe ≈ 210.
- Check the logo never clips at the top: the lockup can be much taller than it looks (INVERTED
  Devils is 0.62 × its width).

### Sound for intros and end screens (always offer it, make it on a yes)

Sound is part of a finished kit, but make it only when the user says so. So **ask, every time**:
when the user has picked the intros, make "Make sound effects for them?" the turn's one question
(with a button), and again after the end screens. Never let it slip by as a passing line in a long
message, and never skip it silently. It can be made **before or
after** the picture, for either: audio first, then time the scene's hits to the moments the
analysis finds in the sound; or picture first, then line the sound up with the scene's hits.
Needs the ElevenLabs connector (see "First: check the connectors").
Tools: `logoGraphics/tools/sfx.py <brand>` and `sync_check.py <brand>`, `logoGraphics/lib/Sfx.tsx`.
Reference: `brands/subhodayam/graphics/` (`parts/Sfx.tsx`, `sound/`, and the "Sound" section of
`scenes/storyboard.md`).

- **Generate** short layers with ElevenLabs text-to-sound-effects (0.5–5 s each). Write the
  prompts down in `sound/sfx.config.json` and keep the originals in `sound/raw/`. For beds longer
  than 5 s (end screens), generate with `loop: true` and stitch copies with short crossfades into
  one long file. Don't loop an MP3 at playback, because its padding clicks at every seam.
  High-pass ambience beds (~90–110 Hz): generated ambiences can be mostly sub-bass rumble
  (one temple bed was 95% below 80 Hz), which you can't hear on phones but which throws off
  the levels. Check the band energy before mixing.
- **Normalise and analyse** with `logoGraphics/tools/sfx.py <brand>`: peak to −1 dBFS into
  `graphics/public/sfx/`, and measure each file's onset, attack and loudest point (librosa) into
  `sound/sfx.json`. Loop stitching and high-pass settings live in `sound/sfx.config.json`.
- **Place** with `<Sfx name at align>`, so the file's attack or peak lands exactly on the visual
  hit. Use one shared brand sting on the logo's first ray in every scene. `<SfxMix gain>` sets each
  scene's level.
- **Verify** with `logoGraphics/tools/sync_check.py <brand>` after rendering (it checks the layers
  listed in `sound/sync.config.json`): it cross-correlates each file with the
  MP4's audio, which is exact even under other layers (onsets detected in a mix are not). Aim for
  under one frame. Rendered MP4 audio plays **42 ms** late, the same for every brand, because
  sfx.py writes **WAV** (sample-exact): store it as `latency` in `sound/sfx.config.json`, which
  `Sfx` compensates. Re-measure only if the render setup changes. (With MP3 the delay was 47–66 ms
  and moved by about a frame every time the files were re-encoded: encoder delay.)
- **Levels and feel.** Intros: about −17 LUFS, one sound per visual event, everything fading out
  with the picture. End screens: minimal and atmospheric, matched to the layout (birdsong, temple
  courtyard, leaves and chimes, drone), about −24 LUFS (quieter than intros), eased fades
  (in over ~3 s, out over the last ~3.5 s), no sharp accent at the very start, plus at most a
  soft bell as the logo lands.
- `scripts/logos.ts` renders scene MP4s with audio; transparent logo renders stay silent.
- Lessons from INVERTED Devils (reference: `brands/inverteddevils/graphics/parts/Sfx.tsx`, `sound/`):
  - ElevenLabs only writes into a folder that already exists: create one per sound first, then
    rename the files into `sound/raw/<name>.mp3`.
  - librosa's onset **lags ~0.1 s on files that start loud right away** (kicks, drops, a needle).
    Use the precise `attack` (first moment at 30% of the hit level, 1.5 ms resolution) for those,
    `align="attack"`. Check it by detecting attacks directly in the mix.
  - Keep served sound files WAV. As MP3s the latency differed per brand (47 vs 66 ms) and shifted
    a frame whenever sfx.py re-encoded them; as WAV both brands measure 42 ms.
  - Cross-correlation can lock one cycle off on deep bass (≈18 ms at 55 Hz) and on noisy swells,
    and repeated identical hits close together confuse it: read ±1 frame as in sync, and check
    such layers with attack detection.
  - Generated "phrases" may come back short (the piano gave three notes): go audio-first and move
    the visual events (key presses) onto the notes' times from `sfx.json`.
  - Level each intro with `<SfxMix gain>` from its measured LUFS to about −17 (raw mixes came out
    near −12 with peaks at 0 dBFS).


### 6. YouTube assets

Profile picture 800×800 (shown as a circle), banner 2560×1440 with everything inside the
1546×423 safe area (render a guides still), watermark 150×150 transparent. Scene sizes are
constants, not `useVideoConfig`, so the guide can show them scaled.

### 7. Visual guide (Remotion) + brandguide.md

- `scenes/guide/Guide.tsx`: ~10 pages × 5 s (cover, the brand, logo + clear space, usage
  do/don't, colour, type, motion timeline with the live logo, intros, end screens, YouTube kit).
  Show **real components** frozen in scaled frames (`Freeze` + scale), never mock-ups.
  **The guide is slides, not a video:** render each page as one still image (Remotion
  `renderStill`, i.e. a `"kind": "still"` asset per page in brand.json, or
  `npm run logos -w lyrics_videos -- stills <logo>-guide <t1>,<t2>,…` while iterating), one image
  per slide into `guide/NN-<page>.png`. **Never build or render a full brand-guide video**
  (no `"kind": "video"` entry for the guide, no `brand-guide.mp4`): it is slow and wastes tokens.
  Pages may still be laid out on one timeline (page N at N × 5 s) so a still at each page's rest
  time captures it.
- `brand/brandguide.md`: brand essence, audience, voice and tone, logo (files, clear space = cap
  height, minimum size, do/don't), colour table, type roles and licences, motion spec, intros,
  end screens (with card placement), YouTube kit (where each file goes in YouTube Studio),
  thumbnail and title style, how to rebuild. Plain, simple words.
- `brand/colors.json`, `colors.css`, `youtube/channel-description.md`; `brand/svg.ts` exports
  the static logo as a vector SVG (bundled with esbuild by the export, `remotion` external).

### 8. Export

`brand/brand.json` lists docs, fonts (Google css2 specs), the SVG module (`svg`, plus more SVGs
from named exports in `vectors`), the favicon set (`favicon`) and assets (`video` /
`transparent-video` / `still` with `at`, `alpha`, `guides`). Then:

```bash
npm run brand -w lyrics_videos -- <brand>                  # whole kit → brands/<brand>/
npm run brand -w lyrics_videos -- <brand> --only=youtube   # filter by output path
npm run brand -w lyrics_videos -- <brand> --resume         # skip renders already in the kit
```

A full kit is ~10 minutes, so run it in the background. **Load text fonts from local files**
(`graphics/public/fonts/` through `loadFonts` in `logoGraphics/lib/fonts.ts`: `FontFace` +
`delayRender`), not `@remotion/google-fonts`: every brand shares one bundle, so each render loads
every brand's fonts, and Google Fonts fetches stalled the guide render past its timeout. If a
render fails anyway, rerun with `--resume`.

Kit layout: `brandguide.md`, `colors.*`, `logo/` (svg, png, on-black png, `animated/`
mov/webm/preview, `favicon/`), `intros/`, `outros/` (+ card guides), `youtube/`, `guide/` (one
PNG per page, no film), `fonts/`.

**Favicons** (every kit has them): square scenes `favicon` (mark nearly edge to edge,
transparent), optionally `favicon-small` (a version that still reads at 16 px: deepen pale parts,
drop gloss and fine detail) and `app-icon` (opaque ground, mark inside the central 80 %), plus a
`favicon` export from `brand/svg.ts` for `favicon.svg`. `"favicon": { to, scene, small, touch, name,
color }` renders each size straight from the vector (no resampling) into favicon.ico (16/32/48),
the PNGs, apple-touch-icon, 192/512 and maskable icons, site.webmanifest and favicon.html. Check
16/32/48 enlarged with nearest-neighbour on a white and a dark tab, and the SVG in a second
renderer (sharp/librsvg) for seams between pieces.

**Logos without lettering** (a pure mark, like MediaMake): measure the geometry from the image
into `layout.ts` (points, widths), sample its colours on a grid, and draw it as data (`mark.ts`:
plain elements that draw.tsx turns into React and brand/svg.ts serialises), so the animation, the
SVGs and the favicons are one drawing. Paint overlaps as their own clipped shapes instead of blend
modes (every renderer agrees), let pieces that meet under another overlap by ~2 px (no hairline
seams), and compare a render in the source's own frame side by side with the image.

### 9. Thumbnail profile

Thumbnails are not part of the kit: they are made per video (engine in
`apps/lyrics_videos/thumbnails/`, jobs in `thumbnails/jobs/<job>/`), not as brand scenes. The
kit's part is `graphics/brand/thumbnail.json`, which thumbnail jobs read: which kit logos to use (the lockup and a small
mark), the fonts (files in `graphics/public/fonts/` with family, weight and role), the palette,
default params and the thumbnail rules from `brandguide.md` ("Thumbnails and titles"). Write it
when the kit is done (see `brands/inverteddevils/graphics/brand/thumbnail.json`), then check it
with `npm run thumbs -w lyrics_videos -- init <brand>-test --brand=<brand>` and a first job.
Making the thumbnails themselves is outside this skill.

## Commands

```bash
npm run logos-studio -w lyrics_videos                                      # Studio, all brands
npm run logos -w lyrics_videos -- stills <logo>-<scene> 0.5,1.8,4 [--guides] [--alpha]   # out/brands/<brand>/stills/<scene>/
npm run logos -w lyrics_videos -- render <logo>-<scene>                    # out/brands/<brand>/renders/
npm run type-check -w lyrics_videos
uv run --with librosa --with matplotlib python logoGraphics/tools/sfx.py <brand>
uv run --with librosa --with scipy --with matplotlib python logoGraphics/tools/sync_check.py <brand> [scene,…]
uv run --with fonttools --with uharfbuzz --with scikit-image --with scipy --with pillow \
  python brands/<brand>/graphics/tools/glyphs.py
```

**Render only what you are checking.** A test render or still touches exactly the compositions
you changed, by full id (`inverted-devils-intro-speaker`, or a logo-prefixed list such as
`inverted-devils-intro-,inverted-devils-end-`), never a bare substring like `intro-`. Ids are
matched by substring, and `intro-,end-` once re-rendered another session's Subhodayam scenes.
`scripts/logos.ts` refuses a match that spans several brands unless `--all-brands` is passed;
don't pass it for test renders. Pass `--exact` to match whole ids only (`atomic-rap-logo` without
`atomic-rap-logo-still`). Prefer stills or a short `--frames` slice over a full render
while iterating, and re-render whole scenes only once they're right.

Always check your own stills before sending: tile them with ffmpeg
(`-pattern_type glob … tile=3x2`) and look at them; check motion with consecutive frames from
the MP4 (exact `-ss` seeks). Fix clipping, unreadable text and overlaps first.

## Taste (from INVERTED Devils, Oct 2026)

- Dark grounds (void black, wine, crimson), red as **light** (glows, smoke), bone white text.
  **No white or light backgrounds, not even as a 4-frame "negative" flash.**
- Sultry and polished: slow eases, soft blooms, no shake or glitch.
- Supporting text (taglines) set in the logo's own display font, never thin spaced-out caps standing alone.
- **Sound is sultry, not spooky.** No horror-trailer language: no reverse swells into deep boomy
  hits with long reverb tails, no haunting drones, no hissy neon hums or electric sizzles. Under
  the logo's draw, use something playful and musical: soft pops on the letters, or a short beat.
- The user's own lyric-video taste (anime edits) is in `apps/lyrics_videos/projects/amz-inexorablemaster2/prefs.md`; it
  overlaps (dark, glowing, type as hero) but brand work is calmer and more restrained.

## Feedback log

Add entries at the bottom: date · brand · what they said → the rule.

- 2026-10-23 · INVERTED Devils · Picked concept 1 (glow trace) of five → build five concepts first, let them pick.
- 2026-10-23 · INVERTED Devils · "4 secs max, remove the bars, run both animations at same time, remove the background smoke… we first need only the logo animation as component" → transparent component first, ≤ 4 s, no construction lines, words together.
- 2026-10-23 · INVERTED Devils · "both should end at exact same time 1.8 sec" → one END constant; the last fill must visibly land on it.
- 2026-10-23 · INVERTED Devils · "like production studio intros, but simple and short, don't copy, 5 s max" + "5 end credit shots… logo and the line together in top section, leave space at the bottom for end cards… different layouts" → step 5.
- 2026-10-24 · INVERTED Devils · Liked the vinyl intro; "the size of the entire logo should be very small… make the disc rotation more visible by adding lines… add the smoke effect behind the disc… the other intros are very bad" → small logo, readable motion, physical objects; three new ones (speaker, piano, ink) were all approved. End screens 1–4 approved, the badge layout dropped.
- 2026-10-24 · INVERTED Devils · "create a complete brandkit in brands/inverteddevils (gitignored)… logo, intros, extros, a visual display guide made with Remotion, brandguide.md… more material will be added later" → steps 6–8 and the brand export.
- 2026-10-24 · Subhodayam (Telugu devotional mornings) · Intros: kept the bell, deepam, gopuram dawn and kolam; dropped the temple doors. "improve … 3d graphics of bell and deepam more minimalistic style and add more detailing" → draw brass objects as turned profiles (polished gradient, engraved rings, bead rows, lotus petals clipped to the body), not flat cut-outs. End screens: dropped the dark sanctum layout; "leafs should start falling more from beginning" → ambient petals/particles are already falling at frame 0, never ramp in; "remove the deepam, they are bad" → no small props flanking the logo on end screens.
- 2026-10-24 · INVERTED Devils · Asked to gitignore logoGraphics, then "let logoGraphics commit, no need to commit" → logoGraphics/ stays tracked (only brands/ is ignored); don't commit unless asked.
- 2026-10-24 · INVERTED Devils · "intros need not be about a physical object, it can be random or abstract as well" → the intro subject is open; strong, readable ideas, one per intro, five that differ.
- 2026-10-24 · Subhodayam · "i dont like both the deepam and bell intros, come up with new ideas, use simple graphics minimalistic style" → for a light, devotional brand keep intros **flat and minimal** like the ones they kept (gopuram dawn silhouette, top-down kolam): flat shapes, soft gradients, one scene and one camera move. Detailed metallic 3D props didn't land, even polished. New round: lotus opening on a pond, ఓం traced and filled, flower-offering shower.
- 2026-10-24 · Subhodayam · Kept the lotus pond and ఓం intros, dropped the flower shower → final intros: gopuram dawn, kolam, lotus, ఓం (all flat, one scene each). End screens: centred, side by side, thoranam heading, seal.
- 2026-10-24 · Subhodayam · "use elevenlabs and create sound effects for the finalised intros, analyse the audio and adjust so the sound aligns with the video" → sound workflow (logoGraphics/subhodayam: tools/sfx.py, parts/Sfx.tsx, tools/sync_check.py): generate short layers with ElevenLabs text-to-sound-effects, normalise to −1 dBFS peak, measure each file's attack and peak with librosa, place each with `<Sfx at align>` so that moment lands on its visual hit, share one brand sting on the logo's first ray, then verify by cross-correlating each file against the rendered MP4's audio (onsets measured in a mix are unreliable). Found and compensated a constant +66 ms playback latency in rendered MP4s; result within ±9.4 ms. Even the intros out to ~−17 LUFS. `scripts/logos.ts` now renders scene MP4s with audio (transparent logo renders stay silent).
- 2026-10-24 · Subhodayam · "sound can be made before/after making video, whether it's for intro or for ending video"; "creating audio for the ending scene is optional and only done when requested" → the Sound section: either order, for both; sound only on request.
- 2026-10-24 · Subhodayam · "when the skill is fired and the user does not have any mcp or connectors, let them know before doing anything… some connectors like elevenlabs are must and required, otherwise cannot do it" → "First: check the connectors": required connectors are checked before anything else, with no substitutes.
- 2026-10-24 · Subhodayam · "create sound effects for the end cards, keep it minimal and atmospheric with smooth fade in and fade outs (depending on the end card style)" → one ambience bed per layout (stitched from ElevenLabs loops), eased long fades, a soft bell on the logo.
- 2026-10-24 · INVERTED Devils · "create matching sound for all the intros and endcards" → a brand sting (neon hum + deep silky hit on the logo's END) closing every intro, one sound per visual event, intros at −17 LUFS; end screens get one ambience bed each (pad, vinyl crackle, late-night room, rain) with long fades and a softer sting. All layers within ~1 frame.
- 2026-10-24 · INVERTED Devils · "test renders should only render what you need… tell the skill it should not do that" (after `render intro-,end-` also re-rendered Subhodayam) → render only the exact compositions being checked, by full id; logos.ts guards against cross-logo matches.
- 2026-10-24 · INVERTED Devils · "the central hiss sound is bad, instead play a beats music or just popping effects" → the trace hum is gone; the lead-in under the logo is soft pops (one per INVERTED letter landing, rising pitch, last on END) or a short beat with a kick on END. Both rendered for them to pick.
- 2026-10-24 · INVERTED Devils · "remove that haunting sound, it's not good, this is not horror" → removed the reverse-swell sub-hit sting everywhere; re-levelled the intros to about −17 LUFS with peaks ≤ −1 dBFS. Taste rule: sultry, not spooky.
- 2026-10-24 · Subhodayam · "split logoGraphics into 2 parts, the commonly reused components should be committed, the rest not… put it in brands/{name}/graphics… the out folder is messed up, keep it organised and make sure the skill notes that" → logoGraphics/ = committed engine (lib/, tools/, Studio entry, scripts); each brand's source in brands/<brand>/graphics/ (gitignored, beside its kit); outputs only in out/brands/<brand>/{renders,stills,stills-alpha,checks}; the "Where things go" section.
- 2026-10-24 · both brands · MP3 encoder delay made the render latency drift a frame on every re-encode (found by the INVERTED Devils session) → sfx.py writes WAV; both brands re-measured at a single 42 ms; every scene with sound re-rendered and re-checked.
- 2026-10-24 · INVERTED Devils · Asked what the kit was missing; picked: standalone sound files (brand/audio/: the brand beat timed so its kick lands on the logo's END, plus each end screen's bed at −24 LUFS, built by the brand's tools/audio.py and copied as docs), a compact "ID" monogram from the logo's own glyphs **used only as the YouTube watermark**, and a thumbnail template kept as a to-do (graphics/TODO.md + memory, remind them later). Skipped: font licence files, vertical 9:16 versions, a song title card. → after a kit is done, audit it (every brand.json output exists, docs match), then offer gaps as a short numbered list and let them pick.
- 2026-10-24 · both brands · "thumbnail creation for youtube… part of brand skill but also triggerable individually" → thumbnails got their own engine and skill, which depend on the kit; a brand only keeps `graphics/brand/thumbnail.json` (step 9). Both brands have one.
- 2026-10-24 · MediaMake (M-ribbon mark, no lettering) · "also create favicon and svg at high quality" → favicons are part of every kit (brand.json `favicon`, rendered per size from the vector), SVGs come from the same drawing data as the animation (`vectors` for variants); a lettering-free mark is measured and drawn as data (see step 8).
- 2026-10-24 · MediaMake · Round 1: "in the 4th one it starts with play icon i like that, but rest of the stuff is weak, try again" → when the user likes only part of a concept, keep that part as a shared opening and build the next round of five as different continuations of it (here: play button → flip card, pause sign, timeline playhead, loading ring, unfolding page).
- 2026-10-24 · MediaMake · Picked round-2 "Scrub" (play button shrinks into a timeline playhead; the M plays in behind it) → Logo.tsx; transient UI around a logo (timeline, playhead line) gets a neutral semi-transparent tint so the transparent render works on any ground, and fades out by DONE.
- 2026-10-24 · ATOMIC RAP (no logo yet) · "use midjourney and come up with 10 concept ideas first and let me choose. also use fal nano banana, and come up with 5 concept ideas" → step 0: generate logo concepts with the named tools, each a different device, and let them pick before anything is built. Nano Banana 2.1 gets the text-exact ideas (a periodic-table tile spelling RAP misspelled twice until the prompt named the exact letters); Midjourney gets the illustrated ones.
- 2026-10-24 · ATOMIC RAP · "/image-revision can be opened directly on the deployed site which is https://mediamake.microfox.app/" → review links point at the deployed app (`…microfox.app/image-revision?job=<set>`), not localhost; no dev server needed.
- 2026-10-24 · MediaMake · Intros where each idea resolves into the logo's first beat (the play button) and the logo plays on from it: kept fold (origami card), player (cursor clicks play), aperture (spectrum iris), equalizer (bars fuse into ▷); dropped the clapperboard → for a brand whose logo opens on a symbol, build intros that end on that symbol and hand over seamlessly (logo `startAt`).
- 2026-10-24 · ATOMIC RAP · After round 1 (wordmarks and illustrated emblems): "i want logos with symbols… inspiring symbols but perfect, clean, geometric, perfection. make sure A comes up in that symbolic shape. dont put the full text. use nanobanana only, just generate 2" → a symbol-only round: the brand's initial built into a strict geometric mark (orbits, circles, exact symmetry, monoline or flat, one accent colour), no wordmark; generate only as many as asked, with only the tool named.
- 2026-10-24 · MediaMake · End screens: kept marquee (centred, soft colour pools on white), header (mark + big line in one row, spectrum rule), timeline (editing tracks beside the logo) and tile (logo on an app-icon tile over the full spectrum); dropped the dark blown-up-ribbons layout.
- 2026-10-24 · MediaMake · "you forgot the sound effects, was it not listed in the skill properly" (after intros, end screens and YouTube assets were done silent; sound had been offered only in passing) → the Sound section now says: always ask about sound as the turn's one question once intros are picked (and after end screens), make it on a yes.
- 2026-10-24 · ATOMIC RAP · Round 2's AI symbols: "both look bad, lets try making the logo with pure paths in remotion, use the font michroma" → when generated symbols miss "perfect, geometric", design the mark in Remotion from the named font's real glyph (tools/glyphs.py writes each contour's corners; layout.ts builds on them): five symbols, one idea each, pure SVG paths, as square stills in `explorations/marks.tsx`. Weaves (a ring behind/in front of a letter) use one unbroken shape with masks on untransformed groups, and crossings placed clear of the letter's joins.
- 2026-10-25 · ATOMIC RAP · Picked an image of a white paper sheet rolled into an A (coral inside): "I will go with this as logo, animation should be in 3d but no camera movement as we need alpha versions, also we need svg versions for favicon and watermark" → a 3D logo is modelled in three.js inside Remotion (`@remotion/three`), never the image: ruled surfaces between edges measured on the reference (`sheet.ts`), checked with an overlay against it until they line up (`checks/paper-model-v<N>.jpg`, every version kept). One fixed camera; the logo's box is a `setViewOffset` crop of its view, and animations move only the object and the light, so every render can carry alpha. The flat vector logo is traced from the model's own flat-colour pass (`tools/trace.py`, vtracer → `brand/mark.json` → `brand/svg.ts`: mark, favicon on a ground the white paper can't vanish into, watermark with a soft shadow). Watch for case-only name clashes on macOS (`paper.ts` vs `Paper.tsx`).
- 2026-10-25 · ATOMIC RAP · Gave the final logo as an image (a monoline A turned into a play button ▷, its crossbar breaking down into an r; white on black) plus "primary font is Michroma" → measured as a lettering-free mark (`tools/measure.py`: every edge fitted to sub-pixel from the anti-aliasing; rebuild within 0.2/255 of the source), five round-1 concepts (warp zoom, A turns into ▷, slices, electrons tracing, beat pump). Michroma was only close in style (the A's angles differ), so it stays the text font.
- 2026-10-25 · ATOMIC RAP · "I like all of them please keep them all, i pick the 4th as the main" → the picked concept becomes Logo.tsx and its exploration scene shows that component (one source); the other concepts stay alive (source and renders), not deleted like dropped options.
- 2026-10-25 · ATOMIC RAP · Intros built so each idea resolves into the logo's first beat (the Electron logo's nucleus, a dot at the frame's centre; `parts/Stage.tsx` Handoff keeps the scene's dot whole under the logo's until it has appeared, so it never dims). Kept 1 countdown (film leader 3·2·1), 2 mixtape (push through a cassette hub), 3 collider (bubble-chamber spirals), 5 power (CRT switch-off to a dot); dropped 4 focus (anime focus lines) → for an edit channel, film/rap objects and physical "switch-off / collision" moments landed; anime speed lines did not.
- 2026-10-25 · ATOMIC RAP · "make sound effects for the four intros" + "also do end screens in parallel" → the end screens went to a second session sharing this checkout (brands/ is gitignored, so a git worktree would not contain the brand): split by files (it owns scenes/end/, new parts, TAGLINE in theme.ts and its index.tsx entries; this one owns Logo.tsx, Stage.tsx, the intros, sound/ and public/sfx/), each renders only its own id prefix. Sound for an edit/rap channel: a brand sting of an orbit swirl, a DJ scratch under the trace and a dry 808 + clap on END; per intro physical sounds (projector, beeps, tape clunk + fast-forward, collision crack, CRT switch-off). All layers within half a frame; levels evened to about −17 LUFS by lowering the hot layers (impact, dive) and the shared 808 rather than limiting.
- 2026-10-25 · ATOMIC RAP · End screens: kept all five (marquee over huge faint atom orbits, header row with an oscilloscope divider, line flanking the logo on an anamorphic flare, left wing with a turning film reel, the logo as a periodic-table tile); line written in by the logo's own electron; card zone clear from y ≈ 600. Text glow (text-shadow) under a CSS mask is clipped to the line's box and shows as a faint rectangle: don't combine them.
- 2026-10-25 · ATOMIC RAP · "dont use the intial part of scratch when the atom forms, the ending scratch is okay though in intros. if you can come up with smoother, and shiner sound fx, please also replace on the original intros" → play only the part of a generated effect that matches its visual moment (trim the file to the scratch's last strokes, landing as the tracing ends, instead of a long scratch across the logo's build); the logo's sting is smooth and shiny (a glassy shimmer as the atom forms, a bright shine on the land with the 808), and a sting change goes into every scene that uses it.
- 2026-10-25 · ATOMIC RAP · Approved sound revision 2 ("the new sound is good, keep it"): the intros' sting as shimmer → the scratch's last two strokes → 808 + glass shine; the end screens' beds (warm pad + sparkles, crackle + electric-piano chord on the land, cinematic pad, projector whir, airy pad + glass chimes) at −24 LUFS with a soft shimmer and glassy bell. Generated beds often come back silent for the first seconds and then swell: ask for "continuous, steady, even level the whole time" and check each loop's envelope before stitching.
- 2026-10-25 · MediaMake · "going forward in the brand guide skill… creating slides (images) via remotion is fine, no need to build an entire video. It takes time and wastes tokens" → the visual guide is rendered as stills only, one image per slide (step 7); no guide film. Also: "for font use Afacad Flux" on the website → a brand's brandguide.md names the web/UI typeface when it differs from the video type, and notes that the website uses the kit's favicons and logos.
- 2026-10-25 · ATOMIC RAP · Kit audit offered standalone sound / 9:16 Shorts; the user picked "the brand sting on its own and each end screen's bed" → `tools/audio.py` mixes them sample-exactly from public/sfx with the scenes' own layers, volumes and the engine's `soft` fade curve (no render latency in a WAV), into graphics/brand/audio/ (48 kHz 24-bit, listed as docs): brand-sting + brand-sting-soft, one 20 s bed per end screen without the sting, on its end screen's timeline. Level stings by loudness (−16 / −18 LUFS, peaks capped at −1), not by peak: peak-normalising made the soft sting 5 LU louder than the main one. Check each layer's landing by cross-correlation and each bed against its rendered end screen (≈ −7 ms, under half a frame).
- 2026-10-25 · all brands · "https://mediamake.microfox.app/ is the new base domain" → every review/editor link in the skills (image-revision, remotion-revision, remotion-editor) uses `https://mediamake.microfox.app/`; the old vercel.app domain is retired.
- 2026-10-26 · The Moon Devs (a monoline ring mark; a developers' studio for AI, media and gaming) · Round-1 intros (laptop boot log, eclipse, neural network, wireframe earthrise, warp) on night-blue gradient grounds: "the dark blue gradient bg is bad, dont use it, the animations are not up to the mark, the core logo animation and path animations are good… come up with concepts where majority of the intro would be related to path animation" → for a monoline mark, build intros out of path animation in the logo's own language (strokes drawing with a bright pen head, round caps, the mark's weight for hero lines and hairlines for the rest), on plain black; no coloured gradient grounds, no illustrated props or rendered objects.
- 2026-10-26 · ZONE Studios (music production company; symbol fire; ZONE in small spaced caps like Nolan end credits; no logo given) · Round 1 was five Remotion-drawn fire marks + a type sheet: "i want this as the logo, I do not like any of yours" (gave their own illustrated flame picture) → when the brief only names a symbol, ask early whether the user has a picture of it or wants AI concepts before drawing marks yourself. An illustrated, painted mark is rebuilt by tracing, not redrawn: `tools/trace.py` takes a crisp silhouette from the anti-aliased edge (4×) plus colour layers from k-means bands (18 kept the painted shading; 5 flat colours looked posterised, blurring the layers looked out of focus), traced with VTracer in stacked mode, grown past the edge and clipped to the silhouette, written as compact relative paths (~620 KB). Then the lockup in six fonts → picked Jost 400.
- 2026-10-26 · ZONE Studios · Logo animation round 1 (Ignite, Trace, Burn, Focus, Haze): "i like 2,4,5", main = 4 Focus (a lens pull: flame sharpens from soft and slightly large while the letters close in from wider spacing) → for a cinematic credits brand the film-language devices (focus pull, heat haze, a traced outline) landed; the spark-ignition and burn-through did not. Keep the liked ones as transparent alternates. In Chrome an SVG blur whose filter region is smaller than what it blurs cuts it with straight lines: size the region to the shape's reach.
- 2026-10-26 · ZONE Studios · Kept intros 1–4 (match strike, wave to flame, mixing desk, ember rack focus) and end screens 1–4; dropped the amp valves (both). "dont like the ending sound effect, just play high bass flame sparkles sound, at the end, no motion needed" → the logo's sting is one sound on its landing, a deep bass flame burst with bright sparkles, nothing swelling under the build. Both ElevenLabs takes came back >95 % below 250 Hz with no highs: check a generated layer's band energy before using it, and when the highs are missing, synthesise them (tools/sparkle.py: glints 3.5–11 kHz, a high shimmer, ember pops) rather than paying for more takes.
- 2026-10-26 · ZONE Studios · "remove that zingle effect, just pure sound atmospheric effect" (the synthesised sparkle glints over the flame burst) → the sting is the deep flame burst alone; don't add musical/jingly highs (glints, chimes) on top of an atmospheric landing unless asked.
- 2026-10-26 · ZONE Studios · "the fire soundfx is too fast, and feels like swoosh, i want fire flickering atmospheric sound that fade in from the beginning of clip to the last" → for this brand the logo's sound is no sting at all: one steady fire ambience under the whole intro, fading in from frame 0 and running to the end. Pick the take whose level stays even (one take faded out halfway); crackly beds have high peaks, so compress them (ffmpeg acompressor + limiter, original kept in sound/raw/_original/) to bring the body up to about −18 LUFS.
- 2026-10-26 · ZONE Studios · "in the starting shot add some fire effects, search for fire spritesheets in pinterest" → raised that Pinterest pins rarely carry a licence; the user chose "draw my own sprites": parts/FireFX.tsx draws 2D cel fire (three flat tones, stepped at 12 drawings/s) — bursts of tongues curling upward, licks breaking off a flame, twinkling four-point sparks. First pass read as a spiky red star: keep the tones warm (red only at the rim), tongues wide and curling up, and bursts behind the main flame. "in third, only start fire ambience when logo starts appearing" → a scene's own beat can carry the opening; the fire bed can start with the logo (FireBed from).
- 2026-10-26 · ZONE Studios · "the first fire animation is good, but second blow up does not look smooth, or even neat" → stepped, randomised sprite bursts suit a quick ignition; a big moment that hands over to the logo needs a smooth tween and symmetry (FireFlare: an even fan of tongues, the middle tallest, easing up and back down together).
- 2026-10-26 · Omkara (Hindi devotional lyric videos; no logo given) · Logo round 1 = five Remotion concepts drawn from the fonts' own outlines (Devanagari shaped with HarfBuzz, never letter-spaced) plus a type sheet of nine Devanagari faces → picked O5's mark (ॐ over a plucked string, Mukta 800) and O1 (ॐकारा in Rozha One); then "the om mark is the main logo … intro would be only om logo" → the mark is the logo and the only thing that animates; the name only goes where words are needed (banner, cards, end screens).
- 2026-10-26 · Omkara · Logo animation round 1 (Pluck, Ignite, Trace, Aarti, Spark): kept Ignite, Trace, Aarti, Spark for the mark only, main = Aarti (a lamp flame circles the ॐ and lands as its dot). Intros bring a flame of their own to the orbit's start and hand over to the logo's very flame (one shared drawing, the logo mounted with `startAt`): kept Ganga, Yantra, Dhoop, Mala; dropped Damaru, whose first draw (a flat red hourglass) read as a bow tie: a drawn object needs its telling details (wood, skins, lacing) to read. Sound was approved first time (11 ElevenLabs effects for 258 credits, far under a per-second estimate).
- 2026-10-26 · Omkara · End screens set the name in the Rozha wordmark: "dont use this text font, use the original single icon font only … always only 1 feel should be there, but keep it as backup, as it looks good" → a brand has one typeface feel: every word (name, tagline, English line) in the mark's own face, the name as a lockup of the mark + name in that face; a second display face, however good, is kept only as a backup (its renders versioned, not deleted).
- 2026-10-26 · ZONE Studios · "before the blur, when you are scaling the logo it looks really bad, dont squeeze and scale the logo, construct a spritesheet and do proper animation where the animation settles at the final frame" → never stand in for the logo by squeezing, stretching or scaling it (flicker by scaleX/Y, swelling it up). Animate it as drawings: a small cel flame loop (parts/FlameSprite SmallFlame), then growth drawings that build the logo's mark at its true size and place (revealed from its base behind a ragged edge that calms frame by frame, layers by depth), whose last drawing IS the logo; mount the logo on that frame with its own intro skipped for the mark (`sharpFlame`) so nothing jumps. No camera push on a scene that hands over to the logo pixel for pixel.
- 2026-10-26 · ZONE Studios · "the blur should start the very instant the second blow up comes and should again blur out when logo forms" → tie a defocus to the visual beat that starts it (the flare's first frame), ramp it to exactly the logo's own starting blur at the mount, and let the logo's focus pull bring it back; the sprite animation still settles first, so nothing is scaled while sharp.
- 2026-10-27 · Omkara · Light-ground version: "dont use marron, use orange yellow gradient" → a dark-ground brand's light version keeps the fire hues bright (the mark and name in an orange → amber gradient, secondary text in a deep warm grey) instead of darkening them to maroon or brown. Also asked for and made: 9:16 intros for Shorts (each intro reads its frame from a Stage context, so one scene serves 16:9 and 9:16) and standalone WAVs of the sting and each intro (mixed sample-exactly from public/sfx with the scenes' layers, rates as a tape, no render latency).
- 2026-10-27 · Anime Music Zone (a photoreal liquid-glass Λ render on black, plus the user's own Midjourney rotation clips) · Asked "rebuild in 3D or use my clips" → they said "both"; a three.js glass rebuild (custom refraction shader) reached a clean, turnable model but "I dont like it, use my logo as is" → when the logo is a rendered picture (photoreal glass, chrome, painted 3D), use the user's image as the logo instead of rebuilding it: cut it out of its black ground with alpha = brightness and colour un-premultiplied (`tools/cutout.py`: identical on black, see-through like glass on colour), and build motion from their own clips and the still. The 3D attempt is kept in explorations/_dropped-3d.
- 2026-10-27 · Subhodayam · "some assets are missing for subhodayam" (every brand.json output existed; the kit simply predated favicons, mark files and standalone audio) → audit an older kit against the newest kits, not only its own brand.json; they picked all four gaps (favicons, mark-only SVG/PNG, lockup and mark on black, sting + end-screen beds as WAVs) and dropped the guide film from brand.json, keeping the old file. A traced mark with many thin parts blurs at 16 px: redraw the small favicon on a 16 px grid (whole-pixel rays and bars, fewer of them). Beds placed with `<Sfx at={0}>` align on the file's *onset* (the default), so a standalone mix must use the same align, or it drifts by the onset (0.48 s here).
- 2026-10-27 · Omkara → Omkara Swar · YouTube would not take the kit's name, so the user asked for name ideas (ten that keep the brand's word, like "Omkara Music"), picked one and said "redo the brand kit (only whatever needs to be changed)" → keep the folder, scene ids and file prefixes; change only what shows the name (glyph texts, the lockups, docs, thumbnail.json, manifest), re-export just those paths, and keep the old renders in a version folder. Scenes laid out from the lockup's box (end screens, banner) re-fit a longer name without edits.
- 2026-10-27 · Anime Music Zone · Turn concept (their Midjourney rotation clip landing on their still): "the placement is incorrect" → "the problem lies in the speed of the video, the last frame does not match the angle, and the colour grading" → "loop the video, pick the first few frames, put it at the end" → when a logo animation reuses the user's own footage: play it at its real speed (interpolate 24 → 60 fps with ffmpeg minterpolate rather than speeding it up or holding frames), grade the whole clip to the still once (tools/grade_clip.py, Lab mean/spread), and for a looping clip made from the logo image, play on through the loop point into its opening frames (the image's pose) and rest there; place every frame with one uniform scale fitted on the landing frame, Serve heavy frame sequences as WebP (PNG copies in ref/) or the render tabs time out. Then: "take the video, pick the last frame and create the logo from there" → when the user's still and their clip are separate renders that never match exactly, don't grade, morph or reshape one into the other: the animation's logo IS the clip's own last frame (cut out in the same window as the frames, mark-turn.png), and the clip is interpolated with its tail padded (tpad stop_mode=clone before minterpolate) so the 60 fps version really ends on that frame.
- 2026-10-27 · Anime Music Zone · Picked Turn as the main logo, "the main animation should settle at 1.8 secs", and the last-frame logo "should replace" the original picture → END = 1.8 s holds for footage-based logos too: keep the footage at its real speed and start later in it (play only the last 1.8 s) rather than speeding it up; the clip's last frame becomes the brand's mark.png kit-wide (the original kept as mark-original.png).
- 2026-10-27 · Anime Music Zone · "make it spin fast, add some motion blur, and ease-out settle at 1.8" → for a logo made from turn footage: spin several whole turns (a seamless loop wraps), position = cubic ease-out landing on the last frame at END (an expo-like ease looked settled by ~1.1 s), motion blur by averaging the clip frames a 180° shutter sweeps (Img layers at weight 1/n, mix-blend plus-lighter inside an isolated group: a true premultiplied average, alpha stays right), and blend the two clip frames around a fractional position so the slow settle glides instead of holding and jumping.
