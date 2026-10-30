# thumbnails: the stills engine (YouTube thumbnails and music posters)

YouTube thumbnails (1280×720, `create-thumbnail` skill) and music posters / album artwork
(3000×3000, `create-music-poster` skill) made in Remotion from a short JSON spec. A thumbnail is a **preset plus a few params** (cheap to write), or a **raw
layer list** (anything), plus small patches; one job holds several styles with several variants
each, all rendered in one run with a labelled review sheet.

| What | Where | In git |
|------|-------|--------|
| The engine: contract, layers, presets, Studio entry, tools | `thumbnails/` (this folder), `scripts/thumbs.ts` | **yes** |
| A job: its pictures, cutouts, fonts, logos, spec | `thumbnails/jobs/<job>/` | no |
| The user's reference thumbnails | `thumbnails/inspiration/` | no |
| Renders | `out/thumbnails/<job>/`, posters in `out/posters/<job>/` | no |

```
thumbnails/
  spec.ts              the contract (JobSpec → resolveJob → layers); pure TS, also run by scripts/thumbs.ts in Node
  presets/             common.ts (grades, the headline stack, logos), cinematic.ts, graphic.ts, index.ts (registry)
  layers/              Photo.tsx (photo/cutout/image), Text.tsx (headlines), Graphics.tsx (fill/shape/fx/logo), filters.tsx
  Thumbnail.tsx        one variant; Sheet.tsx: every variant labelled with its ID
  Root.tsx, index.ts   Studio entry: every jobs/<job>/thumbs.json → <job>-<ID>, <job>-sheet, <job>-sheet-small
  fonts.ts             loads the job's fonts/ (never the network)
  tools/cutout.py      local subject segmentation (rembg + BiRefNet, free)
  jobs/<job>/          input/ (pictures, transcript), cutouts/, fonts/, assets/ (logos), custom/ (rare), thumbs.json, brief.md
out/thumbnails/<job>/  <ID>.jpg, sheet.jpg, sheet-small.jpg, index.json, final/
```

## Commands (from the repo root)

```bash
npm run thumbs -w lyrics_videos -- init <job> [--brand=inverteddevils] [--title="…"]   # job folder (+ brand logos, fonts, palette, rules)
npm run thumbs -w lyrics_videos -- cutout <job> input/hero.jpg [--model=birefnet-portrait|birefnet-general|isnet-anime] [--point=0.5,0.4] [--all]
npm run thumbs -w lyrics_videos -- look <job> [--write]     # which treatments suit each hero picture, and why (--write fills "auto" styles)
npm run thumbs -w lyrics_videos -- render <job> [A1,B2] [--guides] [--png] [--no-sheet]  # → out/thumbnails/<job>/
npm run thumbs -w lyrics_videos -- pick <job> B2            # the final → out/thumbnails/<job>/final/
npm run thumbs -w lyrics_videos -- pick <job> A1,B2,D3      # three for YouTube's Test & Compare
npm run thumbs -w lyrics_videos -- keep <job> B2            # lock one the user likes: kept/ snapshot, renders skip it, warns if its spec drifts
npm run thumbs -w lyrics_videos -- init <job> --poster [--brand=…] [--mood=…]   # a poster job (poster.json, no logo, treatments "auto")
npm run thumbs -w lyrics_videos -- pick <poster-job> A3 [--to=<release folder>]   # the cover → final/ (+ cover.jpg there)
npm run thumbs-studio -w lyrics_videos                       # Studio, every job (hot-reloads the specs)
```

`render` checks the spec first (missing files, fonts not in the job, things under YouTube's
timestamp), downloads missing Google fonts into the job's `fonts/`, and renders 12 variants plus
both sheets in about 10 s. `cutout` downloads its model once (~1 GB for BiRefNet).

## thumbs.json

```jsonc
{
  "job": "my-video",                       // = the folder name
  "title": "Video title", "brand": "inverteddevils",
  "fonts": [{ "family": "Anton", "weight": 400 }, { "family": "Cormorant Garamond", "weight": 600, "italic": true }],
  "defaults": {                            // applies to every style and variant
    "hero": { "src": "input/hero.jpg", "cut": "cutouts/hero.png", "focus": [0.5, 0.3] },
    "params": { "palette": { … }, "heroType": { "font": "Anton" }, "logos": [{ "src": "assets/logo.png", "width": 170 }] }
  },
  "styles": [
    {
      "id": "A", "name": "Behind the subject", "idea": "one giant word half hidden by him",
      "preset": "behind", "params": { … },          // style-wide
      "variants": [                                  // IDs default to A1, A2, A3
        { "note": "what differs", "params": { "words": "RELENTLESS", "y": "top" } },
        { "params": { … }, "hero": { "zoom": 1.2 }, "patch": { "title": { "rotate": -3 } }, "add": [ … ], "remove": ["grain"] },
        { "layers": [ … ] }                          // raw layers instead of a preset
      ]
    }
  ]
}
```

Resolution: `defaults` → style → variant. `params` and `hero` deep-merge; `preset`/`layers`
take the most specific; `remove` drops layer ids, `add` appends layers (or slips one in with
`"under": "<id>"`), `patch` merges fields into a layer by id. Fonts are files in the job's
`fonts/` named `<Family without spaces>-<weight>[italic].ttf` (the brand kits use the same names).

### Common params (every preset)

| param | meaning |
|-------|---------|
| `words` | the hero: a string (`\n` splits lines) or lines; `*word*` takes the accent; a line can be `{ "t", "color", "scale", "font", "fill" }` |
| `kicker` | small tracked line above the hero (THE NAME MEANS) |
| `sub` | line under the hero (a name, a phrase) |
| `overlay` | accent word spread across the hero, between its first two lines (under a one-line hero) |
| `palette` | `bg`, `ink` (text), `accent`, `accent2`, `dark` |
| `heroType`, `kickerType`, `subType`, `overlayType` | `{ font, weight, italic, tracking, color }`; families fall back to the hero's |
| `grade` | `natural` · `punch` · `dark` · `mono` · `duotone` (dark → accent) |
| `textGlow` | a colour glowing behind the hero |
| `grain` | 0..1 film grain |
| `exposure` | brightness multiplier for the picture on top of `grade` (1.15 ≈ a bit brighter); text and logos unchanged |
| `logos` | `[{ src, anchor?, at?, width?, plate?, glow? }]`; each preset has default anchors |
| `side` | which side the words go on (`side`, `sticker`) |
| `upper` | false keeps the words' case (Telugu, script fonts) |

### Presets (layer ids in brackets, for patch / remove / under)

| preset | look | extra params |
|--------|------|--------------|
| `behind` | giant word across the frame, half hidden behind the cutout; kicker and sub in front [bg, photo, shade, title, cut, kicker, overlay, sub, logo-N, grain] | `y` top/middle/bottom, `height`, `rim` (glow round the subject), `heroFill` |
| `lower` | title in front in the lower third over a darkened floor [bg, photo, shade, floor, kicker, title, overlay, sub, logo-N, grain] | `align` center/left, `y` middle/bottom, `height` |
| `side` | subject on one side, stacked text block + accent bar on the other [bg, photo, shade, kicker, title, overlay, sub, bar, logo-N, grain] | `side`, `width`, `height`, `bar: false` |
| `poster` | type-only: huge stacked words on a glowing gradient [bg, photo, rays, speed, kicker, title, overlay, sub, shade, logo-N, grain] | `rays`, `speed` |
| `sticker` | cutout with a thick white outline on a bright rayed field, stroked + extruded words [bg, rays, cut, title, kicker, sub, arrow, logo-N] | `side`, `shift`, `arrow` |
| `band` | full photo, words on a skewed accent band [bg, photo, shade, kicker, title, sub, logo-N, grain] | `y` top/bottom, `knockout` |

A look that needs something new: build it from presets + `add`/`remove`/`patch` (the demo's
"red moon" is `behind` minus the photo, plus a sky fill and a glowing circle), or from raw
`layers`. When it works and could serve other videos, promote it into `presets/` as a new preset.

### Layers (coordinates in px on 1280×720)

| type | fields |
|------|--------|
| `photo` / `cutout` | the hero picture / its cutout, same framing so they line up: `focus`, `zoom`, `offset`, `flip`, `box`, `fit`, `grade` {saturate, contrast, brightness, hue, blur, grayscale, sepia}, `duotone` [dark, light], `fade` {side, size}, `outline` {width, color}, `glow`, `shadow`, `radius`, `border` |
| `image` | any other picture (`src`, `box`, `fit` contain): stickers, icons, a second photo |
| `text` | `lines`, `box`, `align`, `valign`, `font`, `weight`, `italic`, `fit` each/block/none, `size` (cap), `gap` (between lines, em), `tracking` (em), `spread`, `upper`, `color`, `accent`, `fill` (CSS background clipped to letters), `stroke`, `extrude` {depth, color, angle}, `shadow`, `glow`, `skew`, `plate` {color, padX, padY, radius, skew, knockout}, `attach` {to, side above/below/between, gap} |
| `logo` | `src`, `anchor` tl/tc/tr/ml/mc/mr/bl/bc (never br: the timestamp), or `at` [x, y]; `width`, `margin`, `plate` {color, pad, shape}, `glow`, `shadow` |
| `fill` | `box`, `color`, `background` (any CSS), `rays` {at, count, color, duty} |
| `shape` | `kind` rect/circle/ring/burst/stripes (`box`) or arrow/line (`from`, `to`); `color`, `background`, `stroke`, `radius`, `skew`, `thickness`, `points`, `angle`, `shadow`, `glow` |
| `fx` | `kind` vignette/grain/light/halftone/scanlines/tint/letterbox/speedlines/dust/paper/leak; `strength`, `color`, `at`, `size`, `box` (each kind has its own blend; `blend` overrides it) |
| `custom` | `component` (a default export in the job's `custom/<component>.tsx`), `box`, `props` |

Every layer also takes `id`, `opacity`, `blend` (CSS mix-blend-mode), `rotate`, `hidden`.

Text sizes and positions come from the letters' measured ink, so any font sits the same way:
`each` makes every line fill the box width, `block` gives all lines the largest common size, and
the stack shrinks to the box height. Kickers, subs and overlays `attach` to the hero's letters.

## Posters (album artwork)

A poster job is `jobs/<job>/poster.json` with `"kind": "poster"`: designed on a **1000×1000**
canvas (spec coordinates), rendered at **3×** to 3000×3000 RGB JPEG (DistroKid's size), into
`out/posters/<job>/`. `size` and `scale` override both. Square presets:

| preset | look | extra params |
|--------|------|--------------|
| `cover` | full-bleed picture; optional title (`words`) and artist (`sub`) over a soft shade [bg, photo, shade, kicker, title, overlay, sub, logo-N] | `y` top/bottom, `height` |
| `cover-behind` | title huge behind the cut-out subject, artist in front [bg, photo, title, cut, kicker, overlay, sub, logo-N] | `y` top/middle/bottom, `height`, `rim` |
| `cover-frame` | framed print: picture inset, title and artist in the margin [bg, photo, title, sub, kicker, logo-N] | `paper`, `border` |

No text unless `words` is set, no logo unless `logos` is. A poster job always has a style with no
text (the picture alone; `init --poster` makes it as A) and text styles only on top of it; `render`
warns when every cover has text. `render` warns when a picture is blown up
past its own pixels (a soft cover), and when text looks like something streaming services reject
(URLs, handles, service names, prices, "CD"). `pick` takes one ID (the cover) and copies the render
as is; `--to=<folder>` also writes `cover.jpg` there (`--force` to replace one).

**Auto-exposure** (`exposure.ts`). A poster's `"mood"` says how bright it should feel, from the
song: `bright`, `balanced` (default), `dark` (only when the song is), or `as-is` (off). `render`
measures each hero picture and writes levels to `jobs/<job>/exposure.json`: white point at the
brightest channel's 99.5 % (highlights reach white), black point at the darkest 0.5 % (blacks stay
black), and a mid-tone lift until the bright parts (p90 luma) land where the mood wants them
(capped per mood). The hero and its cutout get the levels, text and logos don't. After rendering
it compares every treatment with its style's plain cover and gives one that came out darker than
the mood allows an extra lift (`fixes`), re-rendering it (three rounds at most). It prints one line
per cover (brightness vs. plain, highlights, lift) and warns when a cover stays dark or has no
highlights. Thumbnails get it too when their thumbs.json sets a `mood`.

## Treatments

Whole-picture looks applied over a finished composition, text included (`treatments.ts`): a grade
(brightness, contrast, saturation, sepia, hue…), picture filters (duotone, posterize, chromatic
split, bloom) and texture layers on top (grain, dust, paper, halftone, scanlines, light leak,
tint, vignette). `plain` is none. A treatment must not darken the cover: auto-exposure lifts one
that does, but keep new looks near their plain cover's brightness and check them on a dark picture.

| name | look |
|------|------|
| `film` | warm, slightly faded 35 mm: lifted blacks, warm tint, grain |
| `matte` | flat and calm: low contrast, muted colour, charcoal blacks |
| `vivid` | rich saturation and contrast, a little highlight glow |
| `noir` | black and white, hard contrast, grain, vignette |
| `duotone` | the palette mapped dark → accent → ink, the accent low so mid-tones stay light |
| `riso` | posterized colour, halftone dots, paper fibre |
| `vhs` | red/blue split, scanlines, noise |
| `vintage` | sepia, dust and scratches, paper, dark corners |
| `dream` | highlight bloom and a warm light leak |
| `night` | cold blue grade, moonlit highlights, grain |
| `cinema` | teal shadows, warm skin and highlights (the film-poster split grade) |
| `neon` | deep blacks, saturated colour that glows |
| `pastel` | airy and soft: lifted, low contrast, gentle colour, a pale glow |

`"treatment": "noir"` on a variant (or style, or defaults) applies one. `"treatments": ["plain",
"film", …]` on a style makes one variant per treatment by itself, IDs from 0 when the list starts
with plain (A0 plain, A1 film, …). They work on thumbnails too.

**Picked from the picture** (`look.ts`). `"treatments": "auto"` (set it by hand; `init --poster`
writes `["plain"]` since 2026-10-31: posters vary by crop, placement and idea first)
lets the picture choose: `render` (or `look <job> --write`) measures the hero as auto-exposure
will show it (light, contrast, black and highlight share, saturation, colourfulness, warmth, how
many hues, neon, skin, detail, noise, how dark the edges already are, its five main colours),
scores every look against it and the mood (each rule says why: "skin tones: film is kind to
faces", "mostly black: posterizing crushes the shadows"), and keeps the ones that fit (≥ 0.55, 4
to 6, at most one per family unless clearly better: faded, punch, mono, texture, glow, grade).
It writes them into the style as a list (so IDs never move) with a `tune` per look, fitting it to
the picture: `{ "duotone": { "duotone": [the picture's own colours], "vignette": 0.3 } }`, where
`vignette`, `grain`, `tint` and `bloom` multiply that effect's strength (less vignette when the
edges are already dark, less grain on a noisy picture, less warm tint on a warm one), and the
reasons go to `brief.md`. `look <job>` alone prints the ranking without writing anything.

## Spotify Canvas

A poster job can carry `canvas` (`{ src, cut?, seconds?, fps?, push?, drift?, embers?, glow?, grain? }`):
`SpotifyCanvas.tsx` makes a 1080×1920 loop of the 9:16 picture (breathing push, the cut-out
subject drifting for depth, embers, pulsing light, grain; every motion periodic, so no seam).
`npm run thumbs -w lyrics_videos -- canvas <job>` → `out/posters/<job>/canvas/remotion.mp4`
(H.264 yuv420p, silent). The `create-music-poster` skill covers the fal and Midjourney versions.

## Review: /image-revision

The user reviews a job in mediamake's **Image Revisions** screen
(`/image-revision?job=<job>`, the review screen for any image set; code and both file formats in
`apps/mediamake/components/image-revisions/README.md`). It opens `out/thumbnails/<job>/`
through `index.json`, lets them select thumbnails and pick finals (1, or up to 3 for an A/B
test), keep, drop or comment, zoom in with a magnifier, and pin comments to a spot. It saves
beside the renders:

```
out/thumbnails/<job>/<job>.revisions/
  rev-001.json    status draft | ready | resolved; final, keep, drop; comments [{ id, thumbs, text, pin?, snapshot?, status, reply? }]
  rev-001.md      the same as Markdown (read this first)
  rev-001/        a 2× crop around each pinned spot (c02_F1.jpg)
```

Keep `index.json`'s shape stable: the screen reads its styles, variants, `kind`, `size`, `picked`
and `kept`. Posters show square there, with one **Cover** to pick instead of up to three finals.
