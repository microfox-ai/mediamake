---
name: create-music-poster
description: Make a music poster / album artwork (single, EP or album cover) for DistroKid and the streaming services from the user's picture(s), in Remotion with the thumbnail engine. It sizes the job to the release (a quick cover for a small single, a fuller exploration for a big one), crops the picture to a correct 1:1 square (outcropping only when the subject doesn't fit, upscaling only when the crop is too small), and explores real alternatives — crops, placements and scale, graphic devices and ideas drawn from the lyrics' meaning and the music's mood — shown first as a small direction board of captioned pictures for the user to pick from, before developing the picked directions into 3000×3000 RGB JPEG covers. Finishing looks (grade, duotone, grain, VHS…) are optional and must never cost the picture its clarity. The art with no text always comes first; well exposed for the song's mood; DistroKid's artwork rules checked. No logo unless asked. Use when the user says "make a music poster", "album art / cover art / single artwork for <song>", "DistroKid cover", "/create-music-poster", or asks for more cover options for a poster job under apps/lyrics_videos/thumbnails/jobs/. Append new user feedback to the log at the bottom.
---

# create-music-poster

Album artwork built with the stills engine in `apps/lyrics_videos/thumbnails/` (the same one
`create-thumbnail` uses). **Read `thumbnails/README.md` once** ("thumbs.json", "Posters",
"Treatments"). A poster job is `thumbnails/jobs/<job>/poster.json` (`"kind": "poster"`), designed on
a 1000×1000 canvas and rendered at 3× to **3000×3000** into `out/posters/<job>/`. Jobs and renders
are gitignored; commit engine changes only when asked.

Reworked on 2026-10-31. The user's verdict on the first version: "all i am seeing is the repeat set
of variations — vhs, noise etc. — and no crop variations, or placement variations, or some creative
ideation based on lyrics meaning or musical ambience; the contrast/sharpness/clarity of the image at
final is getting lost because of these variations … confirm with user what you wish to try by
showing and not telling … sometimes music poster creation can be simple if it's a small song, do
not overdo … and if it is simple, you need not even upscale unnecessarily wasting money."

## The rules

1. **The art with no text always comes first.** Every job has covers with the picture alone; text
   versions are only ever extra, never instead (even when the user asks for title + artist).
2. **Size the job to the song.** A small single gets a **quick cover**: 3–5 options straight from
   the picture (the best crops and one or two ideas), no paid steps, one round. A big release (an
   album, a lead single, or the user asks to explore) gets the **direction board** below. Ask which,
   recommended option first, from what the user said about the release.
3. **Variety comes from the picture and the idea, not from filters.** Explore in this order:
   crop and framing → placement and scale → a graphic device or idea from the lyrics and the sound →
   only then, optionally, a finishing look. Never a sheet of one crop in ten filters.
4. **Show, don't tell.** Before building a direction, show it as a small captioned picture and let
   the user pick. Captions describe what they see ("tight on her face, black space above for the
   title"), never jargon alone ("riso", "duotone", "VHS"): the user may not know what the word means.
5. **Clarity is sacred.** Every cover keeps the plain crop's sharpness, contrast and highlights unless
   the user picked a soft or lo-fi look on purpose. Measure it (step 5); drop or fix any cover that
   loses it.
6. **Well exposed unless the song is dark.** A cover is a 160 px tile on a phone: the subject reads,
   the highlights reach white, the blacks stay black. `"mood"` (bright / balanced / dark / as-is) sets
   the exposure; dark only when the song is.
7. **Pay only when needed, and ask first.** Upscale only when the square crop is under ~1500 px on
   its side or looks soft at 1:1; outcrop only when the subject doesn't fit a square. Both are offered
   with a price (fal SeedVR2 ≈ $0.001 per output megapixel) and run only on a yes. A quick cover from
   a big enough picture costs nothing.

## 1. Intake (one round)

`AskUserQuestion`, recommended option first; skip what's answered and say what you assumed:

1. **Scope:** quick cover (recommended for a small single) · explore directions.
2. **The release:** title, artist, single / EP / album, the feeling the cover should leave, the lyrics
   (the hook, the images, what the song is about underneath).
3. **Mood (brightness):** bright · balanced (default) · dark (only when the song is).
4. **The picture(s):** theirs (best), a frame from their video, or a concept to generate.
5. **Text versions** (always ask): none (the art alone is always made) · title + artist · title only;
   and the **font** (theirs override the brand's).
6. **DistroKid release folder** (the cover goes there as `cover.jpg`), and a **Spotify Canvas** (none
   by default; see step 7).

```bash
npm run thumbs -w lyrics_videos -- init <slug>-cover --poster [--brand=<brand>] [--title="…"] [--mood=bright|balanced|dark]
```

Write the answers into the job's `brief.md`.

## 2. The square picture

Measure it (`sips -g pixelWidth -g pixelHeight`) and look at it (Read). Then:

- **Square crops** from the picture: `hero.focus` / `zoom` per variant. Prefer the tallest version
  of the picture (a 9:16 original over a 16:9 outcrop) when the subject is a figure.
- **Outcrop to 1:1** only when every square crop cuts the subject (`midjourney-outcrop`, or fal:
  ask with the price).
- **Upscale** only per rule 7: the one source picture, never the covers (fal
  `fal-ai/seedvr/upscale/image`, faithful, `upscale_factor` to reach ≥ 3000 px on the crop's short
  side; Midjourney images: Upscale Subtle). `render` warns when a picture is blown up past its pixels.
- **A cutout** (for placement, devices behind the subject, text behind her):
  `npm run thumbs -w lyrics_videos -- cutout <job> input/<file> --model=birefnet-general`
  (`birefnet-portrait` for people, `isnet-anime` for drawn art), or a project's BiRefNet tool with
  fill polygons for missed parts. Check it at full size: a missed hand or horn looks cut off.

## 3. Ideas (what to try)

Write 6–9 candidates in `brief.md`, each one line of what it looks like and why it fits *this* song:

- **Crop and framing:** tight on the face · head and shoulders · waist up · the full figure small in a
  big field · off-centre with empty space for the title · a detail (hands, an object, the eyes).
- **Placement and scale:** subject left / right / centre, mirrored (`flip` at focus 0.5), small
  subject in a vast colour field, cropped by the frame edge on purpose, the cutout over a clean
  field of one colour from the picture.
- **From the lyrics' meaning:** the hook's image or object made the subject (e.g. "the fine print":
  tiny contract text as texture, a signature line, a magnified detail); a phrase as the art
  (typographic cover, only for text styles); a symbol the song keeps returning to.
- **From the sound:** the colour story of the music (warm or cold, neon or natural, soft or hard
  light), its energy (stillness and space for a ballad, tension and tight crops for a hard song).
- **A graphic device:** one bold shape behind the cutout (a moon, a halo, a ring, a band of colour),
  a frame, a texture field — built with layers (`add` / raw `layers`), not filters.
- **A finishing look** (optional, last): a grade or one treatment, only where it serves the song and
  the picture (step 4).

Anything that needs a new picture (Midjourney through Browse Hack, fal) is offered with what it
costs and made only on a yes.

## 4. Direction board (explore scope) or quick cover

**Direction board:** render the candidates small and fast, one variant each, plain (no finishing
look), `"scale": 1` in `poster.json` (1000 px tiles):

```bash
npm run thumbs -w lyrics_videos -- render <job>          # → out/posters/<job>/sheet.jpg
```

Send the sheet (SendUserFile) with one plain-words line per ID and ask which 1–3 to develop
(multi-select). Then set `"scale"` back to 3 and develop only those: 2–4 variants each (crop
nudges, scale, the device's size or colour, text versions if asked), new IDs after the board's.

**Quick cover:** skip the board; render 3–5 finished options at full size directly (the best crops
and one or two ideas), plain.

**Finishing looks** (`treatments.ts`: film, matte, vivid, noir, duotone, riso, vhs, vintage, dream,
night, cinema, neon, pastel): only on a developed direction the user liked, only the 1–2 that suit it
(`look <job>` ranks them against the picture; drop any that fights the song), and shown next to the
plain cover so the user sees what it adds. `"treatments": ["plain", "<look>"]` on a style makes the
pair; `tune` adjusts strength (`{ "duotone": { "duotone": [colours from the picture] } }`). Never
`"treatments": "auto"` as the starting point.

## 5. Check before showing

```bash
npm run thumbs -w lyrics_videos -- render <job> [IDs]
```

- Fix every warning `render` prints (blown-up picture, text that breaks DistroKid's rules, every cover
  with text).
- **Clarity**: compare each cover with its plain crop at full size — sharpness (Laplacian variance of
  the luma, e.g. `ffmpeg … -vf "format=gray,convolution=…"` or a numpy one-liner), contrast (luma
  standard deviation) and highlights (`signalstats` YHIGH). A cover that lost more than ~15 % of any of
  them goes back unless it is a lo-fi look the user chose.
- **Tile size**: `sheet-small.jpg` (~160 px tiles): the subject and any title read; nothing muddy.
- **Variety**: the sheet shows different crops, placements and ideas, not one picture in several
  filters.

Then send `sheet.jpg`, list the IDs in plain words, and give the review link (`revise-image`):
`https://mediamake.microfox.app/image-revision?job=<job>` (posters show square with one **Cover** to
pick).

## DistroKid's artwork rules (check every cover)

- **3000×3000 JPEG, RGB** (the render is exactly that), one image, square. Minimum 1000×1000.
- **Never on the art**: a website address, QR codes, X/Twitter page names, social media logos
  (X, Instagram, TikTok…) or names, streaming service logos (Spotify, iTunes…), prices,
  references to physical media ("CD", "Compact Disc", vinyl), nudity, gross imagery.
  `render` flags text that looks like any of these.
- **Not blurry, pixelated, rotated or low quality** (step 2, and the clarity check in step 5).
- **Only licensed pictures**: the user's own, generated, or licensed. No unlicensed stock or
  pictures pulled from the web.
- **Unique per release**: never reuse a cover (or a near copy) from an earlier release; check
  `out/posters/*/final/` for the same picture before delivering.

## 6. Iterate and deliver

- Feedback by ID ("B2 but tighter", "C with the title smaller"): change it or add new variants with
  new IDs; IDs never change once seen. `thumbs keep <job> <ID>` locks one the user likes.
- A ready revision from `/image-revision` (`out/posters/<job>/<job>.revisions/rev-NNN.md`): follow
  `revise-image`.
- The cover: `npm run thumbs -w lyrics_videos -- pick <job> <ID> [--to=<release folder>]` →
  `out/posters/<job>/final/<job>-<ID>.jpg` and `cover.jpg` in the release folder (ask before replacing
  one). Then `pack-distrokid` takes over.
- Log what you learned in `brief.md` (this job) and the feedback log below (general taste).

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
- 2026-10-30 · Devil in the Details (INVERTED Devils) · The sheet was two near-identical crops of the video's neon still in neon / duotone / dream / VHS; the user picked A4 (VHS) but then: "the music poster creation skill is also shitty, all i am seeing is the repeat set of variations - vhs, noise etc.. and no crop variations, or placement variations, or some creative ideation based on lyrics meaning or musical ambience, the contrast/sharpness/clarity of the image at final is getting lost because of these variations sometimes … confirm with user what you wish to try by showing and not telling as user might not know some specific words and what that filter or effect means … sometimes music poster creation can be simple if its small song, do not overdo … if it is simple, you need not even upscale unnecessarily wasting money" → reworked (2026-10-31): seven rules, scope first (quick cover vs direction board), ideas in the order crop → placement → lyrics/sound idea → device → optional finish, a captioned 1000 px direction board before developing, a measured clarity check against the plain crop, `"treatments": "auto"` no longer the default, upscale/outcrop only when the crop needs it.
