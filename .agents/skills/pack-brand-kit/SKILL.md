---
name: pack-brand-kit
description: Build a brand kit in apps/lyrics_videos/brands/<name>/ sized to the brand — Starter (logo, favicons, fonts, tagline, colours), Standard (a channel going live — logo animation, a few intros and end screens, the YouTube kit, the thumbnail profile) or Full (everything, with sound and a Remotion visual guide) — from a logo image or a name alone. For Standard and Full it researches on Pinterest and Dribbble with inspo boards the user picks from (in depth when the brand matters most), while Starter goes for speed. It handles brands with two key logos (a picture logo and a word mark), builds extra assets on request, and runs in parallel threads once the logo is fixed. Use when the user says "make a brand / brand kit / brand guide for this logo", "create intro animations for my logo", "logo animation", "end cards / end screens for my channel", "channel branding", "sound effects for my intro / end screen", or asks to add a scene or asset to a brand under apps/lyrics_videos/brands/ or to the shared engine in apps/lyrics_videos/logoGraphics/. Append new user feedback to the log at the bottom.
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

## Scope: size the kit first

Not every brand needs everything. A brand that is just getting started is well served by a logo, a
favicon, a font and a tagline; a channel going live needs its YouTube pieces; only some brands need
the complete setup. **Ask which tier before building** (AskUserQuestion, the three options below
with what each holds), unless the user's words already say ("just a logo and a favicon", "the
complete kit"). In the same intake, ask whether the brand has **more than one logo** (see Two key
logos), and for Standard and Full how much the brand matters to them (see Design research). A brand can move up a tier later: anything added goes in `graphics/` and
`brand.json` as usual.

| tier | for | holds | steps |
|------|-----|-------|-------|
| **Starter** | a brand just getting started | the logo as a static lockup (dark and light grounds, SVG + PNG), favicons, the fonts, the tagline (theirs, or 3–5 lines to pick from), colours (`colors.json`/`.css`), a short `brandguide.md` (logo, colour, type, tagline), `brand.json` + export | 0–2, the static and favicon parts of 3 and 8, a short 7 (no slides) |
| **Standard** | a channel going live | Starter + the logo animation (one round of 3 concepts, the pick as the component), 1–2 intros, 1–2 end screens, the YouTube kit (profile picture, banner, watermark), `thumbnail.json`, a 5–6 page visual guide; sound offered | 0–9, smaller rounds |
| **Full** | a complete setup | everything in this skill: 5-concept rounds, up to five intros and five end screens, sound, artwork and a second key logo where the brand has one, research rounds for the banner, the 10+ page visual guide | 0–9 |

Starter skips intros, end screens, the YouTube kit, sound, the visual guide slides and
`thumbnail.json`; offer the logo animation and `thumbnail.json` as add-ons in one line, and build
them only on a yes. Write the tier in `graphics/scenes/storyboard.md` and keep to it: don't build a
tier's pieces unasked.

## Parallel threads (the user's standing request)

"When creating brands or creating youtube pack, run parallel threads for faster execution"
(2026-10-27). The logo comes first, because every other piece is built on it: the main session takes
the brand through steps 0–3 (concepts, glyphs, the logo component) on its own. Once the logo is
fixed, split the pieces that don't depend on each other and run them at once:

| piece | runs as | why |
|-------|---------|-----|
| intros (step 4) | a session | it has its own picking rounds with the user |
| end screens (step 5) | a session | its own rounds |
| the YouTube kit's art (step 6: banner research, Midjourney artwork) | a session | its own rounds |
| a second key logo's whole set (e.g. Get into Zone's fist) | a session | a kit of its own |
| static files, SVGs, favicons, colours, `brandguide.md`, `brand.json` (7–9) | this session | it owns the shared files |
| research (reference banners, competitor channels, fonts) | a subagent | the findings come back here |
| sound | inside the session that owns those scenes, after its picks | levels and sync need the final scenes |

Rules that keep the threads from colliding. `brands/` is gitignored, so a worktree would not
carry it: the sessions share this checkout (`use_worktree: false`), and file ownership does the job
a branch would:
- Before starting a thread, give it its own folder `graphics/scenes/<part>/` with a `scenes.tsx`
  exporting `<PART>_SCENES: LogoScene[] = []`, and spread that array into `index.tsx` yourself. The
  thread registers its scenes only there.
- A thread edits only its own folder, its own tools in `graphics/tools/`, new files under
  `graphics/public/art/<part>/`, and new sounds named `<part>-*` (adding its entries to
  `sound/sfx.config.json`, never changing others). It never edits `index.tsx`, `brand/brand.json`,
  `brand/brandguide.md`, `scenes/storyboard.md`, the guide or another part's files, and never runs
  the brand export.
- It keeps its notes in `scenes/<part>/storyboard.md`, drafts `scenes/<part>/brandguide-section.md`,
  and ends with a **"Kept scenes → kit paths"** table (scene id, kind, kit path).
- The main session wires those into `brand.json`, the guide pages and `brandguide.md`, exports,
  checks the files (sizes, alpha, loudness), and offers to archive the finished session.
- Each thread asks for its own paid calls (with the cost first) and names Chrome profiles by email.
- The brief carries the brand's facts (palette, fonts, tagline, motion language, the picked logo
  and where its component lives), the user's rules (ask before paid calls, keep earlier renders,
  the picks are the user's), the files it owns and what done looks like.

Say in one line which piece runs where when the threads start, and report each one in a line as it
comes back. A Starter kit is too small to split: build it in one thread.

## Design research and inspo boards (Standard and Full)

**Starter: speed is the mantra.** Skip the research rounds and the boards. Go straight from the
brand's name, genre and the user's words to 2–3 logo options, then the favicon, fonts, tagline and
export. Research only if the user asks for it.

**Standard and Full:** research before creating anything (logo concepts, the logo animation,
intros, end screens, the banner and profile art, any extra asset). Never start a round from a blank
page.

1. **Search Pinterest and Dribbble** with 3–6 queries for the brand's world plus the piece, for
   example "anime music channel banner", "boxed wordmark logo", "logo reveal minimal", "youtube end
   screen music". Pinterest: browse in the browser, or collect with the Browse Hack extension
   (`pinterest_bulk_start` on a search or board tab, then `pinterest_bulk_stop`; files land in
   ~/Downloads; ask which Chrome profile by email). Dribbble: browse shots in the browser. Real
   channel banners can be read straight off channel pages (see the feedback log).
2. **Build an inspo board.** Save 12–30 references to
   `graphics/explorations/<piece>-<round>/references/`. Tile them on a numbered board in
   `out/brands/<brand>/checks/<piece>-inspo.jpg`, grouped into 2–4 directions, with one line each on
   what it does (layout, type, colour, motion, texture). Make the set reviewable (`image-index`,
   review link) and keep `references.md` beside it: the queries, where each image came from, and the
   notes.
3. **Take the user's opinion first.** Send the board and ask which references and directions to
   follow (numbers are fine), then build to their picks. Note the picks in the round's
   `concepts.md`.
4. References are inspiration only. Never copy one, never trace it, and never put one in the kit.

**Depth follows how much the brand matters.** Standard gets one board per piece. When the user says
the brand is very important (or asks for the Full setup), go in detail:
- a board for every piece, with 30 or more references across 3–4 directions;
- a check-in after each board;
- extra variation rounds;
- mood notes on colour, type and motion before the first concept.

## Two key logos (edge case)

Some brands carry two logos. Get into Zone has a picture logo (the flaming fist, its artwork and
profile picture) and a word mark (the Frame, with the Prism shine). When a brand has two:
- Name them as **key logo 1 and 2** in `brandguide.md` (a "Key logos" section that says what each is
  for) and on a "Key logos" guide page.
- Give each logo the set its tier calls for: its own component, intros, end screens and icons. Name
  its files apart: `logo/<brand>-logo*` for the word mark, `logo/<brand>-<name>*` for the other (for
  example `get-into-zone-fist-hd.png`).
- The other logo's set is a natural parallel thread: give it its own `scenes/<name>/`.
- **The favicon** comes from whichever logo still reads at 16 px. A picture logo usually turns into
  a blob there, so the word mark's mark takes the tab and the picture gets a large icon.
- **The profile picture** is the user's pick, often the picture logo. Offer the other as the
  second choice.
- `thumbnail.json` lists both, with a note on when to use each.
- Never let one logo's style leak into the other's pieces unasked. The fist's fire is not the
  Prism's look.
- A picture logo that arrives small (a 160 px avatar) needs the full-size original. Ask for it
  first; offer an upscale (with its cost) only if there is none.

## Extra assets (on request)

The tiers are the default. When the user asks for anything beyond them, build it into the kit the
same way:
- **Social:** an Open Graph share image (1200 × 630), Instagram posts (1080²) and stories
  (1080 × 1920).
- **Video:** 9:16 versions of intros and end screens, lower thirds, subscribe and like animations,
  stream overlays.
- **Sound:** sting WAVs.
- **Print and merch:** letterhead and business cards, sticker sheets, t-shirt mockups.
- **Office:** a presentation template, an email signature.

Each one gets:
- its own scene in `graphics/scenes/extra/` (or its own folder when it grows), registered in
  `index.tsx`;
- research first, like any piece;
- an entry in `brand.json` under a kit folder that says what it is (`social/`, `stream/`,
  `print/`, `audio/`);
- a line in `brandguide.md` (what it is and where it goes);
- a page in the visual guide when the brand has one.

## The order (each step ends with the user picking)

The user decides by watching, so build real options, render them, and let them pick. They
reply like "I like the second, make the logo smaller, the others are bad", then you iterate.

### 0. No logo yet: generate concepts · all tiers

When the brand has only a name, research first for Standard and Full (an inspo board for the logo,
the user's picks; see Design research); for Starter, go straight to 2–3 concepts. Generate logo
concepts with the image tools the user names
(Midjourney through the Browse Hack extension, fal Nano Banana, …; when the extension is
connected in several Chrome profiles, ask which by each profile's email, never its number), as many as they ask for,
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

### 1. Read the logo exactly · all tiers

- Look at the image and identify each font. Check the real name on Google Fonts: the user wrote
  "Caligraffitti", but the font is **Calligraffitti**. Fetch
  `https://fonts.googleapis.com/css2?family=<Name>`; the 400 page says "Font family not found".
- Note what the logo does beyond the font: tracking, a bolded script (outline stroke), glows,
  colours (sample them), and proportions (relative widths, gap, alignment).
- **Never use the image itself** in the output. Rebuild the logo from the fonts.

### 2. Glyphs and layout · all tiers

- `tools/glyphs.py` (fontTools + uharfbuzz): downloads the TTFs, shapes each word (kerning), and
  writes `glyphs.json` with per-glyph SVG paths and boxes. Everything renders as SVG paths, so
  nothing waits on font loading and every letter can be animated.
- For script fonts it also rasterizes and skeletonizes the word into **pen strokes**: open
  `tools/skeleton.png` and set `PEN_ORDER` (writing order and direction, in skeleton pixels) so
  the word can be written like a pen. The i's dot is separate.
- `layout.ts` places the lockup in a 1920×1080 frame (scale, tracking, gap, bold stroke) to match
  the logo's proportions. Export `INV`/`DEV`-style glyph lists, `BOX` (lockup bounds) and a
  word-space→px helper.

### 3. Explorations, then the logo component · Standard (3 concepts), Full (5); Starter: the static lockup only

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

### 4. Intros (≤ 5 s) · Standard (1–2), Full

- Research first (an inspo board of idents and logo reveals in the brand's world, the user's picks),
  then propose **5 ideas in the spirit of production-studio idents, but original and simple.** Build
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

### 5. End screens (YouTube, 20 s) · Standard (1–2), Full

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


### 6. YouTube assets · Standard, Full

Profile picture 800×800 (shown as a circle), banner 2560×1440 with everything inside the
1546×423 safe area (render a guides still), watermark 150×150 transparent. Scene sizes are
constants, not `useVideoConfig`, so the guide can show them scaled.

Not every channel puts its logo in the profile picture. An **artist channel** (a band or an
artist name: Queen, The Beatles, Get into Zone) has a word-based logo, and its profile picture is
**artwork** (an album cover, a key visual); its banner can be artwork or a picture with the
tagline rather than pure graphics. Ask early where that artwork comes from (the user's covers,
Midjourney, fal), since it is not drawn from the logo.

### 7. Visual guide (Remotion) + brandguide.md · slides: Standard (5–6 pages), Full; brandguide.md: all tiers

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

### 8. Export · all tiers

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

### 9. Thumbnail profile · Standard, Full

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
- 2026-10-27 · Anime Music Zone · After 3 turns, then 2: "still feels too much, maybe 1 rotation is enough, all we needed was that ease-out in the first place" → keep a logo's motion minimal: one turn of the footage with an ease-out landing on END is the logo; extra turns read as busy. Change only what the user asked for (here the easing), not the amount of motion.
- 2026-10-27 · Anime Music Zone · Round-1 intros (waveform, prism, screentone, film strip of their turn frames, comet): "none of this is needed, a simple logo spin at center with pitch black screen and mini reflection as in studio light in dark room, is all we need, and one intro is enough" → for a brand whose logo is a rich rendered object (photoreal glass), ask early whether they want idea intros at all; the default can be one product-shot intro: the logo animation alone at centre on pitch black, standing on an unseen glossy floor (the logo flipped about its feet, ~25 % strength fading over ~150 px, a hair of blur), no props, no type. Set dropped options aside in _dropped folders.
- 2026-10-27 · Portal (The Moon Devs' work portal; mark = a monoline ring + a solid square, no lettering) · Logo round 1 (Orbit: the square is the pen that draws the ring, then drops into the centre; Open: a disc hollows out to the rim; Turn: a 3D hoop and plate; Loading: a spinner arc + the square filling like a progress bar; Drop: the square falls and its ripple becomes the ring): "1,4,5 are good, 1 being the main one" → for a mark of two simple shapes, the devices where one shape makes the other (the square drawing the ring, its landing rippling out into it) and app UI language (spinner, progress fill) landed; a disc hollowing out and a 3D coin turn did not.
- 2026-10-27 · Anime Music Zone · "remove the ending sound effect of coin" (the glass shine on the logo's landing) → for this brand the logo's sound is the whoosh alone; a bright ting on the landing read as a coin. "build end screens, it should be exact same as my endscreen (at least 1)" → when the user has their own end screen, rebuild it exactly before inventing layouts: measure it frame by frame (24 fps file → per-frame brightness, blur fitted against the blurred final frame, a text reveal's width per frame) and replay those curves as tables; match the type by glyph shapes, then by total ink through Chrome itself (macOS Chrome draws type heavier: Avenir Light with -webkit-font-smoothing: antialiased matched their ink within 1 %), then nudge each letter onto its measured position (cumulative margins) — every letter within 1 px. Stills render at half size: calibrate on frames from a full render, and don't trust --frames single-frame renders (one came out black).
- 2026-10-27 · Portal (a web app, not a channel) · After the logo, offered "web set first" or "five intros"; they chose "Do the web set next: static SVG/PNG logos, favicons, app icon" → for a product or web-app brand, ask after the logo whether the web set comes before intros. The tab icon is its own drawing on a 16-unit grid (ring 14 px with a 2 px stroke, square 4 px, whole pixels), used for favicon.ico *and* favicon.svg, because browsers draw the SVG at tab size, where the true mark's ring is 0.6 px. The app icon is opaque with square corners (platforms round or mask it), the ring at 62 % (inside the maskable 80 % circle).
- 2026-10-27 · Portal · Name lockup: "Portal" beside the mark in eight fonts (glyph outlines, each at the weight whose stems match the ring's stroke; cap 0.42 of the ring; large, lowercase/caps, and at header size on dark and light bars) → "t1 is fine, but space it apart a bit" (Montserrat, The Moon Devs' own face), then picked +10 % of four letter spacings (0, 3, 6, 10 %) → keep tracking one setting (`TRACK` in layout.ts) and answer "space it apart" with a strip of steps, the mark-to-name gap held fixed, rather than one guess. A light weight with open tracking suits a thin monoline ring.
- 2026-10-27 · Anime Music Zone · Kit export: the favicons came out as plain black circles. The export renders each icon size by resizing the square composition (16, 32, 48 … 512), so favicon / app-icon scenes must draw in a fixed ICON box scaled to useVideoConfig().width (a vector viewBox does this by itself; absolutely placed images and px border radii do not). A guide that shows those scenes inside its own frame then passes the icon size through a context. For a photographic logo there is no svg/vectors entry: ship PNGs at the source's resolution and put the favicon on an opaque tile (alpha = brightness fades on a light tab).
- 2026-10-27 · Portal (web app) · "colors.json/css and the Montserrat font files in the kit, for the website" → for a web brand, colors.css carries palette tokens *and* role tokens (bg, surface, panel, border, text, text-muted, logo) for a dark default and `[data-theme='light']`, with every text colour contrast-checked (Silver failed on white at 2.4:1, so light mode got its own Graphite); the fonts ship as TTF (brand.json `fonts`, for design tools) plus WOFF2 and a ready `@font-face` stylesheet (brand tool `tools/webfonts.py`, listed as docs), checked by loading them in a browser.
- 2026-10-27 · all brands · "when picking a brand folder you should ignore the code files like js, tsx, html etc., and only brand related assets (image - all types including svg / video / audio)" → uploading a kit to a mediamake project (the app's folder picker, `/api/project/brand-kit/upload`, the MCP `upload_brand_kit` tools) uploads only images (svg and ico included), video, audio and font files (`isKitAsset` in `apps/mediamake/lib/brand-kit`); brandguide.md, colors.json, brand.json, thumbnail.json and channel-description.md are read into the kit's fields, never uploaded; everything else (js, tsx, html, css, webmanifest, other json) is skipped and listed as skipped.
- 2026-10-27 · Get into Zone (the artist name on Hit It, Kingpin, Inexorable; channel of motivational vocals and inspired instrumentals) · "Not all brands need to have logo in youtube profile picture, artist based channels like these have artwork, and have a word based logo, like queens, beatles etc... and the banner also need not be pure graphics every time, it can be artwork or image with the channel tagline" → step 6: for an artist channel the logo is a wordmark (round 1 = six wordmark devices + a type sheet, drawn from glyph outlines, shown as the artist credit on frames of their own videos and at 600 / 300 / 150 / 75 px), and the profile picture and banner are artwork. Check earlier projects for how the name was already used: their Inexorable note ("get into zone is always typed in a thin spaced-apart fashion") ruled out thin, widely spaced faces for this name.
- 2026-10-27 · Portal (web app; ring + solid square mark, Orbit logo) · Intros round 1, path animation on black built from the product's own objects (a task checklist, a worklog heatmap, an org chart, a clock, a ring tunnel), each leaving a square exactly where the logo's travelling square starts and mounting the logo there (`startAt` past its fade-in): "keep 1,2,4,5", the org chart dropped → for a product brand, intros made from the things the product holds landed. A camera that pulls back to the logo's scale must hold close while the idea plays (a slow drift, then a decisive pull from ~1.2 s): a log-scale zoom from frame 0 shrank every idea before it read. Contact sheets need ≥ 400 px frames; 320 px thumbnails hid that.
- 2026-10-27 · Get into Zone · From the round-1 type sheet: "E, F, H, I look good, but also come up with boxed variants of this. giving me the authentic artist label feel. if i place the mark anywhere it should feel branded" → for an artist label, offer boxed wordmarks (a box carries its own ground): solid tile, open frame, two-tier warning label, two-block strip, justified stamp, each in every liked face; check them placed on dark, red, daylight and white grounds as the credit and at watermark size, and flip the parts that vanish on light grounds (a bone block goes black). A one-line strip is a credit, never a watermark.
- 2026-10-27 · Get into Zone · Picked "b2 frame I for the watermark, b4 [strip] I for the credit" (Jost 800) → an artist brand can carry two lockups with separate jobs: a boxed stack for the logo and watermark, a one-line strip for the in-video credit. Logo animation round 1 on the Frame (Trace, Close in, Label maker, Beat, Split): "i like 4 [Beat: four beats at 133 BPM, each element punching in hot orange and cooling to white], but improvise on top of it, also i need intro for strip logo as well" → for a music channel, a beat-synced build landed; when the user likes one concept but wants more, keep its core (the beat grid, the punch, the colour) and make several richer variations (side-per-beat build, echo afterimages, flash labels, all combined), and give every secondary lockup (the credit strip) its own build-in in the same language, with an exit.
- 2026-10-27 · Get into Zone · Round-2 Beat variations: "1, 2 are good" (Count: the frame built one side per beat with the words; Echo: orange afterimages on every hit, a speaker-cone ring on the last) → when two variations are liked, combine them into the logo component and keep each as an alternate. "none of the strips are good, try something like netflix / marvel intro" → a credit lockup's small build-ins (wipe, slide-lock, drop) were too plain; for an artist channel the strip wants a cinematic studio ident in the spirit of the big ones, never a copy: one idea and one camera move each (a beat-cut montage of their own videos pulling back into the strip's blocks; light streaks landing as the blocks' scanlines; a 3D glide with a sheen over a glossy floor; a dive down a corridor of strip outlines), landing on two hits ("ta" the blocks, "dum" the type). Montage frames taken from film/anime edits invite Content ID claims on a brand intro: say so and plan to swap in the channel's own artwork. Tagline given mid-round ("making music that inspires") → write it into theme.ts TAGLINE at once.
- 2026-10-27 · Anime Music Zone · "something wrong with amz brand, it has too many files to upload to brandkit" → the kit was fine (29 assets); `brands/animemusiczone/graphics/` held 1,351 source files (frame dumps of the turn video in `ref/footage/`, 784 MB) and the app's `<input webkitdirectory>` read the whole brand folder, so the browser saw 1,387 files and the sheet listed every skipped one. The Folder button now walks the folder itself where the browser allows (Chromium) and never opens `graphics/`, `node_modules/` or hidden folders (`skippedFolder` in `apps/mediamake/lib/brand-kit`); each shows as one skipped line. Keep frame dumps and other working files under `graphics/ref/` (or in `out/`), never loose in the kit's exported folders, and leave `graphics/public/` alone: the brand's components read their frames from it.
- 2026-10-27 · Get into Zone · Of the four strip idents (Reel montage, Light streaks, 3D Sweep, Tunnel): "improvise 2" → light streaks that land as a lockup's scanlines suit a music brand; takes worth offering on one picked device: a twisting ribbon that splits by colour into the blocks, a light-speed burst whose streaks fold into scanlines, a macro start inside soft out-of-focus streaks pulling back, and the same build with richer streaks (bright heads, fading tails, a near layer), the type scanned in by interlaced lines and a flare on the landing. Bug to avoid: a helper that returns `rgb()` strings fed back into a hex-only colour mixer gives NaN colours and the shapes silently vanish; keep palette values as hex.
- 2026-10-27 · Get into Zone · After four light-streak takes on the strip: "i dont like any of them, for now come up with a stamp animation as if it's being stamped" → for a boxed label lockup, a physical stamp reads as the brand: the stamp enters big and high (loose soft shadow), winds up, slams down accelerating, lifts away in ~0.1 s (a longer lift leaves a blurry double), leaving an inked print (SVG feTurbulence: a speckle mask that keeps the ink mostly solid, a light displacement for rough edges, patchy density), specks thrown out on contact, a few-px jolt, the print resting turned a few degrees. First pass removed too much ink (the print looked faded): threshold the speckle hard so only ~5 % voids remain.
- 2026-10-27 · Get into Zone · Picked the stamp on paper: "need it in black and white background, and only the final stamp, and do it like from a macro zoom" → make both ground versions (black paper with the dark lockup, white paper with the light one); drop the descending stamper and open in a macro close-up instead (18× on an edge of the print, the lens finding focus, a shadow passing as the unseen stamp comes down, the ink hitting with a jolt, then a log-zoom pull-back to the whole mark). Draw paper, ink and specks in the lockup's own units with many noise octaves (paper fibres 7, ink speckle 4) so the texture holds at every zoom; keep white paper bright (base ~#f7f6f2, fibres multiplied at ~0.2: at 0.55 it read grey and blotchy).
- 2026-10-27 · Get into Zone · On the macro stamp: "don't like the slow zoom outs, put extreme fast punch zoom out like stamp, and make it vibrate; if timing is issue, put some path trace animations slowly lighting up but not completely forming the logo, and the stamp lands at that point" → a stamp's camera move is an impact, not a reveal: cut in close on the fresh ink on the hit frame and punch straight out (expo, ~0.16 s), then vibrate (shake, scale wobble, a little roll, decaying in ~0.5 s). Fill the lead-in with glowing path traces of the mark's contours (each contour split out of the glyph path so every one draws its own share; stroke width divided by the glyph's scale), slowly brightening and never closing, and land the stamp on the beat before they finish. First traces at 0.024 units were too faint: ~0.034 with a strong glow.
- 2026-10-27 · Get into Zone · "the path trace should be like flickering and very thin, almost invisible, and the stamp, and keep pitch black and pitch white in backgrounds" → lead-in traces before a hard impact should whisper: ~1 px hairlines, faint (~0.4–0.55), flickering per contour like faulty neon, no glow, so the stamp is the event. "Black and white backgrounds" here meant pure #000 and #fff: no paper texture, vignette, passing shadow or impact flash that tints the ground; fade to the ground's own colour.
- 2026-10-27 · all brands · "ignore the graphics/ folder when uploading brand folders" → any file under a `graphics/` directory, at any depth of the picked folder (`graphics/public/sfx/x.wav`, `graphics/brand/brandguide.md`), is skipped entirely: never uploaded and never read for kit fields, in the app's folder picker (`skippedByDefault` / `inGraphicsFolder` in `apps/mediamake/lib/brand-kit`), `/api/project/brand-kit/upload` (no upload URL) and the MCP `upload_brand_kit` tools (local walk and the hosted file list). The guide, colours, fonts and thumbnail profile come only from the exported kit at the brand root, so export brandguide.md, colors.json, brand.json and thumbnail.json there, never only in `graphics/`.
- 2026-10-27 · Get into Zone · "the particles should come after the stamp, also the flicker is too faint, make it feel like a failing neon sign, but faint and only few letters (3-4), the rest in dull faint" → a lead-in of traces wants hierarchy, not uniform flicker: 3–4 letters spread across the name as a failing neon sign (drawn whole, slightly heavier, a soft glow, striking with an on/off stutter, a mains buzz, dropouts, stutter bursts and sags in random 0.1 s slots), the rest dull steady hairlines. Debris from an impact (ink specks) starts after the camera move resolves, not on the impact frame.
- 2026-10-27 · Get into Zone · "the flickering is good, but the stamping is not suiting, think, research and improvise, give me 4 different varieties" → keep the liked part (the failing-neon lead-in) as a shared opening and offer landings drawn from different references, each on both grounds: the neon finally catching and flooding the blocks with light; a blackout then floodlight banks clunking on per block; anime impact frames (smear fly-in, two inverted frames, speed lines, shockwave); a die-cut sticker slapped on crooked with a gloss sheen.
- 2026-10-27 · Get into Zone · Picked Ignite for the strip (the failing-neon lead-in, a surge completing every outline, light flooding the blocks white-hot and cooling to the brand colours). "Also give me a simple stamp effect for the other logo" → a second lockup can carry its own simple treatment beside the main logo animation: here the boxed Frame drops in tilted and big, lands as an inked print (rough edges, ~5 % voids), a short vibration, specks after; transparent, with pure black / white previews.
- 2026-10-27 · Get into Zone · Sound for the strip intro (failing neon → ignite) and the frame stamp, after an OK on a cost estimate (6 takes, ~200–450 credits): the generated "failing neon buzz" loop came back 99 % above 6 kHz (hiss) and the ignite hit 82 % below 80 Hz → check band energy first; synthesise a sound that must follow on-screen flicker (tools/neon_buzz.py: a 120 Hz mains buzz gated per frame by the same hash the picture uses, crackle on each switch) instead of paying for more takes, and give a sub-heavy hit a bright layer (a pitched-down click) so it reads on phones. sync_check's waveform cross-correlation locks onto repeats of a steady tone (it reported +326 ms); verify such a bed by correlating its on/off envelope in a narrow band (−8 ms). A transient-only take (rms −31 dB) mixes too quiet: compress it, keep the original in raw/_original/.
- 2026-10-27 · Get into Zone · End-screen sound (after a plan + cost: 5 takes, ~100–200 credits; the previous 6 takes had cost 100 credits, so quote from the real rate): one bed per layout tied to what moves (a pad with a soft pulse on each echo ring; a lo-fi beat "through a wall" for a progress-bar layout; night rain plus a neon hum gated by the picture's flicker; a quiet paper room for the stamp layout; a kick bed at the brand's exact BPM in phase with the level bars, built locally from one generated kick). A loop-generated *beat* must be joined end to end, not crossfaded (crossfades double its hits); a "room tone" can come back as pure sub-bass rumble (retake with "no rumble, no low hum"); sparse beds (rustles, a slow beat) sit 5–10 dB under target, so compress them rather than push volumes past 1. Set each scene's level from an offline mix of the same layers (same volumes, fades and alignment as lib/Sfx) measured with ebur128, before the one render.
- 2026-10-27 · Get into Zone · Correction to the offline-mix method above: the rendered MP4s measured 2.4–5.1 dB louder than a mono offline mix of the same layers (stereo with identical channels reads ~+3 dB in ebur128, plus small encode differences) → mix offline in stereo, or take each scene's gain from its rendered MP4 and re-render once. Kick beds placed with `<Sfx at={0} align={0}>` land ~−8 ms (the 42 ms latency trim rounds to 3 frames); sync_check locked 2 bass cycles off on a 133 BPM kick bed (−42 ms) — onset detection on the render (median −7.7 ms vs −0.4 ms in the source) settles it.
- 2026-10-27 · Get into Zone · YouTube kit for an artist channel with no artwork yet: offer profile pictures made as *artwork* from the brand's own material (an extreme close-up of the stamped mark's ink and edges; a single letter as a glowing neon tube) beside the logo as a fallback, so the kit isn't blocked; real illustrated artwork (the user's, Midjourney, fal) stays an option to ask about, with a cost. Check profiles inside YouTube's circle crop and the watermark composited on a dark and a white frame. SVG gotcha: a filter with userSpaceOnUse on an element that has its own transform (a glyph path in font units) takes its region in those units and clips the glow away — put the filter on a wrapper group.
- 2026-10-27 · Get into Zone · "keep 2 & 3" (two profiles, two banners) then, mid-turn, "also generate artwork concepts" → when the user keeps more than one option of a YouTube asset, ship each in the kit under its own name (profile-picture-neon / -stamp, banner-stamp / -header, each banner with its safe-area guide) and let them pick in YouTube Studio; keep building the free steps (vectors, favicons, guide, docs, export) while a paid round waits: write the artwork concepts down (`explorations/artwork-<n>/concepts.md`: one shared look, no text, one 1:1 grid per concept, the pick outcropped to 16:9 for the banner) with the cost, and ask once for the go-ahead and, when the Browse Hack extension is connected in several Chrome profiles, which one. A word-mark brand's favicon can be its box reduced to one letter (the Frame's Z inside the same rule), with a 16 px cut (tighter pad, heavier rule).
- 2026-10-27 · Get into Zone · Thumbnail profile check: `heroType: { "font": "Jost" }` without a weight rendered the hero words in a light weight, breaking the brand's "always heavy" rule → always give heroType (and subType) an explicit `weight` in thumbnail.json, and render the test job (`<brand>-test`, a real track picture) before calling the profile done.
- 2026-10-27 · Get into Zone · "show me the mail, i do not know by chrome profile number" → when the Browse Hack extension is connected in several Chrome profiles, name each by its Google account email (and profile name), never "profile 1 / 2"; buttons and questions say the email.
- 2026-10-27 · Get into Zone · Photographic artwork for an artist channel that releases anime/film-inspired music: "no, do some anime style same colors and vibe, but anime style" → for such channels offer the artwork in anime first (Midjourney niji 7, `--niji 7`), keeping the brand's palette and lighting in the prompt (pitch black, one flame-orange light, cel shading, film still). niji can drop the subject in action prompts (the runner vanished, only glass and a spark): check every grid for the subject and retake that concept with "full body … clearly visible in the centre". Very minimal scenes (a tiny sun on a black sea) disappear in the profile circle.
- 2026-10-27 · Get into Zone · Profile picture after two artwork rounds and fire treatments: "fire looks bad, simple black and white, lets go with that only. but add a rainbow shine at one corner" → for a word-mark artist channel the profile may end up the plain logo on its ground; procedural SVG fire (turbulence-torn heat) read as fake to this user, so offer accents that stay graphic: a holo-foil corner (the lockup redrawn in a spectrum gradient, masked by a radial fade from one corner), a four-point glint with a faint rainbow halo, or a soft rainbow light leak behind one corner, keeping the words plain bone.
- 2026-10-27 · Get into Zone · "you are not putting much effort in the youtube banner art, use midjourney and create some graphics and use them at places to make it more awesome, first research good youtube banners" → a banner is art, not just the logo on a ground: research first (logo and line inside the centre ~1235–1546 × 338–423 every device shows; the full-width 2560 × 423 band is desktop, so put the art at its sides; fade the art on for TVs; one strong visual, no clutter, full resolution), then generate the channel's own art (here anime, niji 7: characters on black at 2:3 to flank the logo, 3:1 panoramas for clashes, horizons and ink) and composite it in Remotion (screen-blended black grounds, vertical fades, the logo on a black plate over busy art). Check every banner as a desktop band, a phone crop and a TV frame. Keep a sibling session's files (another session added the fist logo with its own tool): never export over a kit file you didn't make.
- 2026-10-27 · Get into Zone · After a rejected banner round ("i dont like any") the user chose "references first": before generating banner art, collect real banners to point at. Each channel page (`https://www.youtube.com/@<handle>`) carries its banner URL (`yt3.googleusercontent.com/…=w…-fcrop64…`, the desktop band; swap the width for `=w2120-`). Fetch 15–20 strong channels in the channel's space (music labels, motivational, anime distributors), curate 6–8 on one numbered board with a line each on what it does, and generate only after the user names the ones to follow. References stay in explorations/, never in the kit.
- 2026-10-27 · Get into Zone · Banners built to the user's picked references (1 Crunchyroll, 4 Motiversity, 5 Netflix Anime): a manga ink drawing (Midjourney, black on white) prints onto a coloured disc with an SVG `feColorMatrix` (white → the brand colour, ink stays black); `mix-blend-mode` on an SVG `<image>` did not blend in the render, and the drawing must cover the whole disc or its square edges show. A katakana label needs a Japanese face: subset Noto Sans JP to the few glyphs used (5.7 MB → 11 KB) before `loadFonts`, since every brand's fonts load in every render. When the user asks for work "in parallel" on the same brand, give the other session its own folder and a scene list (`scenes/<part>/scenes.tsx` spread into index.tsx) so the two never edit the same files.
- 2026-10-27 · Get into Zone · "the fist part is good … tagline even smaller and spaced apart, logo even smaller, add more orange elements in the matching design style, of items related to the channel (gym, laptop & entrepreneurship, anime enthusiasts, shounen feeling), think creatively" → a banner can carry the channel's world as small spot illustrations: generate each item as a manga ink drawing on white (Midjourney, one object per prompt, "isolated, clean closed outline"), cut it off its paper by flood-filling the white connected to the border (no AI cutout needed for ink line art), print it in the brand colour by multiplying (white → colour, ink stays black), and give each a thin cream sticker edge (CSS drop-shadows at ±3 px) because its black outline is lost on a black ground. Pick the lightest-filled variants (a mostly black drawing prints mostly black). Add the genre's own type: katakana sound effects (ゴゴゴ, ドン！) set as separate words, never a cramped vertical column. Keep the line clear of items and keep the logo small when the art carries the banner.
- 2026-10-27 · skill · "a brand need not always have all the assets, some brands are just getting started and a logo, favicon, font and taglines is more than enough. some are more effort, a complete setup is needed. also when creating brands or creating youtube pack, run parallel threads for faster execution." → the Scope section (Starter / Standard / Full, asked before building, tier tags on every step) and the Parallel threads section (the logo first in one thread, then intros, end screens, YouTube art and a second key logo as sessions, each in its own `scenes/<part>/` with a scene list spread into index.tsx; the main session owns brand.json, the guide, brandguide.md and the export).
- 2026-10-27 · skill · "the brand skill should support extra assets if the user asks for them, always do design research via pinterest or dribbble when creating stuff. take user opinion, create inspo boards and do it in detail if the user mentions the brand is very very important." and "sometimes brands might have double logos like get into zone, beware of that edge case" → the Design research and inspo boards section (research before every piece, a numbered board in checks/, the user's picks before building, depth by importance), Two key logos (key logo 1 and 2, a set each, favicon from the one that reads at 16 px, the picture logo's original at full size) and Extra assets (social, video, print, office pieces built as scenes with brand.json entries).
- 2026-10-27 · skill · "do high level research and designing only for standard or full, for starter speed is the mantra." → Design research applies to Standard (a board per piece) and Full (in depth); a Starter kit skips research and boards and goes straight to 2–3 logo options, the favicon, fonts, tagline and export, unless the user asks for research.
