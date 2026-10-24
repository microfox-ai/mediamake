# thumbnails: the YouTube thumbnail engine

YouTube thumbnails (1280×720) made in Remotion from a short JSON spec, driven by the
`make-thumbnail` skill. A thumbnail is a **preset plus a few params** (cheap to write), or a **raw
layer list** (anything), plus small patches; one job holds several styles with several variants
each, all rendered in one run with a labelled review sheet.

| What | Where | In git |
|------|-------|--------|
| The engine: contract, layers, presets, Studio entry, tools | `thumbnails/` (this folder), `scripts/thumbs.ts` | **yes** |
| A job: its pictures, cutouts, fonts, logos, spec | `thumbnails/jobs/<job>/` | no |
| The user's reference thumbnails | `thumbnails/inspiration/` | no |
| Renders | `out/thumbnails/<job>/` | no |

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
npm run thumbs -w lyrics_videos -- render <job> [A1,B2] [--guides] [--png] [--no-sheet]  # → out/thumbnails/<job>/
npm run thumbs -w lyrics_videos -- pick <job> B2            # the final → out/thumbnails/<job>/final/
npm run thumbs -w lyrics_videos -- pick <job> A1,B2,D3      # three for YouTube's Test & Compare
npm run thumbs -w lyrics_videos -- keep <job> B2            # lock one the user likes: kept/ snapshot, renders skip it, warns if its spec drifts
npm run thumbs-studio -w lyrics_videos                       # Studio, every job (hot-reloads thumbs.json)
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
| `fx` | `kind` vignette/grain/light/halftone/scanlines/tint/letterbox/speedlines; `strength`, `color`, `at`, `size`, `box` |
| `custom` | `component` (a default export in the job's `custom/<component>.tsx`), `box`, `props` |

Every layer also takes `id`, `opacity`, `blend` (CSS mix-blend-mode), `rotate`, `hidden`.

Text sizes and positions come from the letters' measured ink, so any font sits the same way:
`each` makes every line fill the box width, `block` gives all lines the largest common size, and
the stack shrinks to the box height. Kickers, subs and overlays `attach` to the hero's letters.

## Review: /thumbnail-revision

The user reviews a job in mediamake's **Thumbnail Revisions** screen
(`/thumbnail-revision?job=<job>`, code and file format in
`apps/mediamake/components/thumbnail-revisions/README.md`). It opens `out/thumbnails/<job>/`
through `index.json`, lets them select thumbnails and pick finals (1, or up to 3 for an A/B
test), keep, drop or comment, zoom in with a magnifier, and pin comments to a spot. It saves
beside the renders:

```
out/thumbnails/<job>/<job>.revisions/
  rev-001.json    status draft | ready | resolved; final, keep, drop; comments [{ id, thumbs, text, pin?, snapshot?, status, reply? }]
  rev-001.md      the same as Markdown (read this first)
  rev-001/        a 2× crop around each pinned spot (c02_F1.jpg)
```

Keep `index.json`'s shape stable: the screen reads its styles, variants, `picked` and `kept`.
