---
name: create-music-poster
description: Make a music poster / album artwork (single, EP or album cover) for DistroKid and the streaming services from the user's picture(s), in Remotion with the thumbnail engine. It crops the picture to a correct 1:1 square (outcropping with Midjourney or fal when the subject doesn't fit), optionally sets the title and artist, and renders the cover plain plus the treatments that suit the picture, chosen from the image itself (its light, contrast, colour, warmth, skin, neon, highlights, texture and palette) among 13 looks (film, matte, vivid, noir, duotone, riso print, VHS, vintage, dream, night, cinema, neon, pastel) and tuned to it (duotone in the picture's own colours, less vignette or grain where it already has them), as 3000×3000 RGB JPEGs labelled A0, A1…, well exposed for the song's mood (auto-exposure lifts dark pictures and any treatment that darkens them; dark only when the song is), following DistroKid's artwork rules. No logo unless asked. Use when the user says "make a music poster", "album art / cover art / single artwork for <song>", "DistroKid cover", "/create-music-poster", or asks for more cover options or treatments for a poster job under apps/lyrics_videos/thumbnails/jobs/. Append new user feedback to the log at the bottom.
---

# create-music-poster

Album artwork built with the stills engine in `apps/lyrics_videos/thumbnails/` (the same one
`create-thumbnail` uses). **Read `thumbnails/README.md` once** ("Posters" and "Treatments"). A poster
job is `thumbnails/jobs/<job>/poster.json` (`"kind": "poster"`), designed on a 1000×1000 canvas and
rendered at 3× to **3000×3000**; renders go to `out/posters/<job>/`. Jobs and renders are
gitignored; commit engine changes only when asked.

**PRIME RULE: the art with no text always comes first.** Every poster job has a style with the
picture alone (no title, no artist, no text at all), plain + its treatments, and it comes first on
the sheet. Text versions are only ever extra styles on top of it, never instead of it, even when the
user asks for title + artist. `init --poster` makes it as style A; `render` warns when every cover
has text. In a job that already showed text styles, add it under the next free letter.

**SECOND RULE: covers are well exposed unless the song is dark.** A cover is seen as a 160 px
tile on a phone: a dark, muddy one disappears. The subject reads clearly, the highlights reach
white, the blacks stay black. A dark, low-key cover is only right when the song's mood is dark
(`"mood": "dark"`), and even then the subject and the highlights must read. `render` handles the
exposure (levels for the mood on the picture, an extra lift for any treatment that came out
darker than its plain cover); you still judge the sheet.

**THIRD RULE: the picture picks its effects.** Not every look suits every picture: film fades neon
to mud, riso crushes a black background, vivid clips colour that is already saturated, a bloom
needs highlights. A style starts as `"treatments": "auto"`; the first render measures the picture
and keeps the 4–6 looks that suit it (step 3), tuned to it. You then look at the picture yourself
and agree or adjust before anyone sees IDs.

**Defaults:** one style per picture (or layout), each with **plain + the looks picked for its
picture**: IDs A0 (plain), A1 … in the order picked (best first). Text styles on the same picture
get the same picks, so the user compares like with like. **No logo** unless the user asks. The
user can ask for more pictures, layouts, or more or fewer treatments.

**Keep it cheap**: presets + treatments, not TSX; look at the sheet, not single files; while
iterating render only the IDs you changed.

## 1. Intake: ask before building

With `AskUserQuestion` (recommended option first; skip what's already answered and say what you
assumed):

1. **The release:** song title, artist name, single / EP / album, the feeling the cover should
   leave. Lyrics help (the hook, the imagery).
2. **Mood (brightness):** propose one from the song and the lyrics, recommended option first:
   **bright** (uplifting, summer, love, pop) · **balanced** (most songs; the default) · **dark**
   (only when the song itself is dark: menace, grief, horror, night). It goes in `poster.json` as
   `"mood"` and sets the exposure. Never pick dark just because the picture is dark.
3. **The picture(s):** theirs (best), a frame from their video, or a concept to generate
   (Midjourney through Browse Hack; fal costs money, ask first).
4. **Text versions** (always ask): title + artist · title only · none. This only decides the
   *extra* styles: the art with no text is always made (the prime rule). Streaming services show
   the title and artist under the cover anyway.
5. **Fonts** (always ask, when there is text): a font or family they want, or a mood. Their
   choice overrides the brand's fonts. If a font-choosing skill is listed, use it; otherwise the
   font table in `create-thumbnail` step 5.
6. **Logo:** none by default. Only when they ask (the brand's files are in the job's `assets/`).
7. **DistroKid release folder**, if there is one: the cover gets copied there as `cover.jpg`
   (`distrokid-release-info` reads it).
8. **Spotify Canvas** (the looping video behind the song in Spotify): none, or which method(s):
   **Remotion** (free, local) · **Midjourney** (video from the picture) · **a fal video model**
   (paid). Several can be made to compare. See step 7.

```bash
npm run thumbs -w lyrics_videos -- init <slug>-cover --poster [--brand=<brand>] [--title="…"] [--mood=bright|balanced|dark]
```

`init --poster` writes `poster.json` (style A = `cover` with no text, all treatments; add text
styles as B, C… after it) and a `brief.md`.
With `--brand` it copies the brand's fonts, palette and logo files, but sets no logo.

## 2. The square picture

Measure it (`sips -g pixelWidth -g pixelHeight`). Then:

- **Square crop** when the subject fits in a square: frame it with `hero.focus` / `zoom` (look at
  the plain variant: nothing important cut, the subject not jammed against an edge).
- **Outcrop to 1:1** when a square crop would cut the subject (a wide shot, a tall portrait
  cropped at the head): the `midjourney-outcrop` skill (Browse Hack), or fal (paid: ask first).
  Put the result in `input/` and use it as the hero.
- **Resolution: upscale the source once, never the covers.** DistroKid wants 3000×3000 (minimum
  1000) and rejects blurry or pixelated art. `render` warns when a picture is blown up past its
  own pixels ("blown up 2.0× … will look soft"). Then upscale **the one source picture** (the
  prime image every cover and treatment is built from) and point `hero.src` at it; all the
  variants inherit it. Never upscale renders one by one.
  - Midjourney images: Midjourney Upscale (`midjourney-iterate`, Upscale Subtle).
  - Anything else: fal `fal-ai/seedvr/upscale/image` (SeedVR2), `upscale_factor` to reach ≥ 3000 px
    on the short side of the crop, `output_format: png`. It is faithful (no re-imagined faces) and
    cheap: **$0.001 per output megapixel**, e.g. 2× of 2000×1506 → 4000×3024 = 12.1 MP ≈ **$0.012**.
    Paid, so ask first (or follow the user's standing OK); upload the user's original file, not
    a re-encoded copy. Save it as `input/<name>-4k.png` and note model, size and cost in `brief.md`.
  - Compare a crop against a plain resize before using it (hair, edges, faces unchanged).
- **A dark source picture** (night shots, black backgrounds, low-key art) is fine: auto-exposure
  lifts it (step 5). When the picture is so dark that `render` warns it "stays dark", say so and
  offer a brighter source (another frame, a re-generation with brighter light) rather than
  shipping a murky cover.
- For `cover-behind` (title behind the subject), make a cutout:
  `npm run thumbs -w lyrics_videos -- cutout <job> input/<file> --model=birefnet-general`
  (`birefnet-portrait` for people, `isnet-anime` for drawn art). Check `cutouts/<name>.check.jpg`.

## 3. Layout and treatments

Layouts (presets, square): `cover` (full bleed; optional title + artist at the bottom or top
over a soft shade), `cover-behind` (the title huge behind the subject), `cover-frame` (a framed
print, title and artist in the margin). Text params are the same as thumbnails (`words`, `sub`,
`kicker`, `heroType`, `subType`, `upper: false` for title case); see the README.

Treatments (`thumbnails/treatments.ts`), applied over the whole cover, text included:

| treatment | look | suits (what `look` checks) |
|-----------|------|----------------------------|
| plain | the composition as it is | always first |
| film | warm, slightly faded 35 mm | faces, natural colour; not neon or mostly-black pictures |
| matte | flat and calm, charcoal blacks | harsh contrast; not mostly-black or flat pictures |
| vivid | rich saturation and contrast | muted colour; not saturated or grey pictures |
| noir | black and white, hard contrast | strong light and shadow, faces; not pictures whose colours are the point |
| duotone | the picture's own colours, dark → accent → light | one main colour, clear shapes |
| riso | posterized colour, halftone, paper | bold shapes, flat (illustration) colour; not mostly black |
| vhs | red/blue split, scanlines, noise | neon and night colour; not noisy or soft bright pictures |
| vintage | sepia, dust, paper, dark corners | warm, gentle colour; not neon or cold |
| dream | highlight bloom, warm light leak | highlights to catch, bright songs |
| night | cold blue grade, moonlit highlights | cool colour, deep shadows with lit parts, dark songs |
| cinema | teal shadows, warm skin and highlights | faces, natural colour; not one strong colour |
| neon | deep blacks, glowing colour | vivid lights on a dark ground |
| pastel | airy, soft, lifted | light pictures, bright songs; never dark ones |

**How the picks are made.** `npm run thumbs -w lyrics_videos -- look <job>` prints, per hero
picture (as auto-exposure will show it, for the job's mood): what it measured (light, contrast,
black %, highlights %, saturation, warmth, hue spread and main hue, neon %, skin %, detail, noise,
edges, palette), then every look with a score and its reasons, ✓ on the picks (score ≥ 0.55,
4–6, varied: a second look from the same family needs a clearly better score) and the `tune` for
each. `render` does the same for any `"auto"` style and writes the list and the tunes into
`poster.json` (and the reasons into `brief.md`), so IDs stay put.

**Then judge it yourself, before the first render the user sees.** Open the source picture
(Read) and read the ranking. The numbers can't see content or the song: drop a pick that fights
the song or the subject (VHS on a gentle acoustic ballad, pastel on a horror track), and add one
the song calls for even if it scored lower; say why in `brief.md`. Do this by writing the list
yourself (`"treatments": ["plain", …]`, keeping the `tune` entries `look` printed) or by
`look --write` and editing. Once the user has seen IDs, the list only grows: new looks go at the
end, with new IDs.

`tune` per look (`{ "noir": { "vignette": 0.3 } }`) multiplies that effect's `vignette`, `grain`,
`tint` or `bloom`, and `duotone` takes the colours (the picture's own: darkest → its most
characteristic colour → lightest). `"treatment": "noir"` on a variant applies one. `exposure` (e.g. 1.15) lifts the picture under
any treatment by hand, on top of auto-exposure. A new look that works goes into `treatments.ts`
(keep it additive; check it on a dark picture: it must not come out much darker than plain).

## 4. DistroKid's artwork rules (check every cover)

- **3000×3000 JPEG, RGB** (the render is exactly that), one image, square. Minimum 1000×1000.
- **Never on the art**: a website address, QR codes, X/Twitter page names, social media logos
  (X, Instagram, TikTok…) or names, streaming service logos (Spotify, iTunes…), prices,
  references to physical media ("CD", "Compact Disc", vinyl), nudity, gross imagery.
  `render` flags text that looks like any of these.
- **Not blurry, pixelated, rotated or low quality** (see Resolution above).
- **Only licensed pictures**: the user's own, generated, or licensed. No unlicensed stock or
  pictures pulled from the web.
- **Unique per release**: never reuse a cover (or a near copy) from an earlier release; check
  `out/posters/*/final/` for the same picture before delivering.

## 5. Render, check, show

```bash
npm run thumbs -w lyrics_videos -- render <job>          # → out/posters/<job>/A0.jpg … sheet.jpg, sheet-small.jpg
```

For an `"auto"` style `render` first prints the `◐` ranking (see step 3) and writes the picks.
It then prints one `☀` line per picture (mean, bright parts, highlights: before → after,
with the white point and lift it chose for the mood), re-renders any treatment that came out
darker than its plain cover (`↻`), then an `exposure` table: every cover's brightness as a % of
its plain cover, its highlights (≥ 0.9 reads as real highlights) and its lift. Levels and lifts
live in `jobs/<job>/exposure.json` (derived; never edit by hand: change `"mood"` and re-render).
`"mood": "as-is"` turns it off.

Fix every warning. Before showing anything: the sheet has the no-text style first, and **no cover
looks dark or muddy at tile size** (unless the mood is dark, and then the subject still reads).
If a cover looks dark although the table says it's fine, raise its `exposure` or try `bright`. Look at `sheet.jpg` and `sheet-small.jpg` (tiles at a streaming app's list
size, ~160 px) yourself: the crop, the text readable small, no treatment washing the picture out,
nothing from the rules list. Then send `sheet.jpg` (SendUserFile), list the IDs with one line
each, and give the review link (the `revise-image` skill): `https://mediamake.microfox.app/image-revision?job=<job>`
(it opens directly on the deployed app; no local server needed). The user opens `apps/lyrics_videos/out` once as a source; posters show
square, with one **Cover** to pick.

## 6. Iterate and deliver

- "More options" / "other looks": `look <job>` and offer the next best (unpicked) looks by score;
  append them to the style's list (new IDs at the end).

- Feedback by ID ("A9 but less glow", "B with the title smaller"): change the style or variant,
  or add new variants with new IDs; IDs never change once seen. `thumbs keep <job> <ID>` locks one.
- For a ready revision from `/image-revision` (`out/posters/<job>/<job>.revisions/rev-NNN.md`),
  follow the `revise-image` skill: crops, keep, fixes, the cover, reply, resolve.
- The cover: `npm run thumbs -w lyrics_videos -- pick <job> <ID> [--to=<release folder>]` →
  `out/posters/<job>/final/<job>-<ID>.jpg`, and `cover.jpg` in the release folder (ask before
  replacing an existing one; `--force` replaces it). Then `distrokid-release-info` takes over.
- Log what you learned: `brief.md` (this job), the feedback log below (general taste).

## 7. Spotify Canvas (only when asked)

A Canvas is the 3–8 s looping vertical video Spotify plays behind a song: **9:16, MP4 (H.264),
1080×1920, silent, no text, no promo**. Make it from the cover's picture, cropped (or outcropped)
to 9:16 first: `input/canvas-start.png` (full resolution) and a 1080×1920 JPEG of it. Ask which
method(s); for a comparison, make several from the same start frame and show them side by side
with what each cost.

- **Remotion** (free, ~15 s to render): `canvas` in `poster.json`
  (`{ "src": "input/canvas-start.png", "cut": "cutouts/canvas-start.png", "seconds": 8,
  "embers": 55, "glow": "#…" }`, see `thumbnails/SpotifyCanvas.tsx`): a breathing push, the
  cut-out subject drifting a few px for depth, rising embers, a pulsing light, grain. Every motion
  repeats once per clip, so it loops with no seam.
  `npm run thumbs -w lyrics_videos -- canvas <job>` → `out/posters/<job>/canvas/remotion.mp4`.
- **fal video model** (paid: ask first, quote the price): image-to-video with the start frame as
  **both first and last frame**, so it loops. **Generate at the 720p tier, not 1080p**: 720 px
  tall is enough for a Canvas, and it's cheaper and faster (`minimax/h3-max/image-to-video`:
  `resolution: "768P"`, its native size; on other models pick `720p`). Upload a 720×1280 start
  frame. `duration: 8`, `prompt_expansion_mode: "disabled"`; about **$0.0325/s ≈ $0.26 for 8 s**
  on H3 Max. Check the result is at least 720 px tall; deliver it as is (or scale to 720×1280). Prompt: locked-off camera, subtle motion only (hair, cloth,
  smoke, embers, light flicker), the subject keeps their pose, seamless loop. It returns an
  audio track: strip it (`ffmpeg -i in.mp4 -an -c:v copy fal.mp4`).
- **Midjourney video**: the Browse Hack extension has **no video (Animate) tool yet**. Until it
  does, the user animates the start frame on midjourney.com and drops the MP4 into `input/`;
  trim it to ≤ 8 s, strip audio, crop/scale to 1080×1920 with ffmpeg.

Check every Canvas: 9:16 and at least 720 px tall (1080×1920 for Remotion, 720p for fal), ≤ 8 s, no audio, `yuv420p`, and the loop seam (first vs last frame
SSIM, ~0.97+ reads as seamless). Put them in `out/posters/<job>/canvas/` with a side-by-side
`compare.mp4` labelled with method and cost.

## Feedback log

Add entries at the bottom: date · release · what they said → the rule.

- 2026-10-24 · engine · Asked for the skill: like the thumbnails; a correct 1:1 crop (outcrop with Midjourney or fal when needed); the poster with different texture and filter effects (brightness, saturation…), up to 10 plus one plain; logo optional, off by default; DistroKid's album-artwork rules → this skill, treatments.ts, square presets, 3000×3000 renders, the artwork lint.
- 2026-10-24 · You Can Have the Kingdom · First test: the lifted-black looks (film, matte) and the paper texture washed the art grey. Cause: a style helper reset every effect's blend mode (fixed in layers/Graphics.tsx); then film/matte lifts toned down and noir/riso/vintage brightened. Rule: check every treatment on a dark picture before shipping a new one.
- 2026-10-24 · You Can Have the Kingdom · "use fal for upscale … see how much it costs (use it for the prime image, don't upscale every version)" → SeedVR2 2× on the source only: 4000×3024, ≈ $0.012, faithful and much crisper; every cover re-rendered from it with no soft warning. Rule: upscale the source once, never per variant.
- 2026-10-24 · You Can Have the Kingdom · "Spotify Canvas: ask the user for one or several options (remotion / midjourney / fal-video-model); for this video use all 3 and compare quality and cost" → step 7. Remotion (free, 13 s render, seam SSIM 0.973) and fal MiniMax H3 Max (≈ $0.26, 1080×1920, seam 0.977) made; Midjourney blocked: the extension has no Animate tool.
- 2026-10-24 · You Can Have the Kingdom · "when doing fal, reduce the size; 720p is fine for a Spotify Canvas" → fal Canvas videos at the 720p tier (H3 Max 768P), never 1080p.
- 2026-10-24 · Inexorable · Delivered A (title + artist) and B (framed, title in the margin) with no text-free version: "you MUST always create variations without any titles … you can create with text, but only if the base version without any text exists" → the prime rule at the top; `init --poster` makes style A with no text; `render` warns when every cover has text. Added C (art only) to the Inexorable job.
- 2026-10-25 · engine · "the end images do not have good enough exposure, or highlight making them look dark, if that is the vibe of the song fine, otherwise not good" → the second rule; a `mood` per poster (intake question 2: bright / balanced / dark, dark only when the song is); auto-exposure in `thumbnails/exposure.ts` (white point to the brightest channel's 99.5 %, black point kept, a toe-protected mid-tone lift to the mood's target, then a measured lift for any treatment darker than its plain cover); duotone now dark → accent → ink so it keeps highlights; softer vignettes; night no longer darkens. Tested on Kingdom (mean 0.08 → 0.17, highlights 0.86 → 0.96) and Inexorable (0.05 → 0.13 balanced, 0.09 dark), every treatment within ~85 % of plain.
- 2026-10-25 · engine · "optimise the music poster skill in such a way that it decides what kind of effects to use on the basis of the image itself" → the third rule; `thumbnails/look.ts` measures the exposed picture (light, contrast, black/highlight share, saturation, colourfulness, warmth, hue spread, neon, skin, detail, noise, edges, a 5-colour palette), scores each look with stated reasons and the mood, picks 4–6 varied ones, and tunes them (`tune`: duotone from the picture's palette with the accent at a third so mid-tones stay light, vignette/grain/tint/bloom multipliers); `"treatments": "auto"` from `init --poster`, resolved into a list on the first render; three new looks (cinema, neon, pastel). Tested: dark red anime art → neon, VHS, duotone, night; a portrait → dream, noir, vivid, duotone, film, cinema. Claude still checks the picks against the content and the song.
