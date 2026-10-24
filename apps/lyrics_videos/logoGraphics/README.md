# logoGraphics: the brand graphics engine

Animated logos, intros, end screens, YouTube assets and brand guides, made in Remotion. The
work is split in two:

| What | Where | In git |
|------|-------|--------|
| **The engine**: the Studio entry, the contract, components every brand reuses, and the generic tools | `logoGraphics/` (this folder) and `scripts/logos.ts`, `scripts/brand.ts`, `scripts/brand-public.ts` | **yes** |
| **A brand**: its logo, scenes, sounds, fonts, brand config, and the exported kit | `brands/<brand>/` (`graphics/` = source, the rest = the kit) | no (`brands/` is gitignored, like `projects/`) |

So a fresh clone has the engine and no brands; each brand lives on the machine that makes it.

## Layout

```
logoGraphics/                     the engine (committed)
  index.ts, Root.tsx              Studio entry: every brands/<brand>/graphics/index.tsx becomes a folder of compositions
  kit.ts                          defineLogo({ id, fps, width, height, preview?, scenes }), SceneProps, composition props
  lib/
    motion.ts                     clamp01, prog, mix, hash, noise1, soft (the fade curve)
    Sfx.tsx                       createSfx({ brand, meta, latency }) → <Sfx name at align>; <SfxMix gain> (nested mixes multiply, 0 mutes); latency 0.042 s for WAV
    Guides.tsx                    YouTube end-card slots (VIDEO_W/H, SUB_D, CARDS_Y) drawn when `guides` is on
    fonts.ts                      loadFonts(brand, faces): fonts from the brand's public/fonts/, no network
    place.tsx                     createPlacedLogo({ Logo, view, box, stillAt }) → PlacedLogo, lockupH, logoPoint
    youtube.tsx                   PROFILE, BANNER (+ safe area), WATERMARK, Backdrop, BannerSafeArea
  tools/
    sfx.py <brand>                normalise a brand's sounds to WAV in public/sfx/ + measure them → graphics/sound/sfx.json
    sync_check.py <brand> [scenes]   check rendered sound against the picture (cross-correlation), loudness

brands/<brand>/                   one brand (gitignored)
  graphics/                       its source
    index.tsx                     default-exports defineLogo({ id, … }); scene ids, Studio folders
    Logo.tsx, layout.ts, theme.ts the logo component (transparent), its geometry, palette + BRAND (= folder name)
    parts/                        the brand's own pieces (and thin wrappers over lib/: Sfx, Guides, fonts, Place)
    scenes/                       intro/, end/, youtube/, guide/ (+ storyboard.md)
    explorations/                 earlier concepts, kept for reference
    tools/                        brand-only tools (glyphs from fonts, tracing a logo image, …)
    sound/                        raw/ (generated files), sfx.config.json (prompts, loops, latency), sfx.json (measurements), sync.config.json (layers to check)
    public/                       sfx/, fonts/: served as staticFile('<brand>/…')
    brand/                        brand.json (what the kit contains), brandguide.md, colors.*, svg.ts, youtube/channel-description.md, thumbnail.json (for thumbnails/)
  brandguide.md, logo/, intros/, outros/, youtube/, guide/, fonts/, colors.*   the exported kit (npm run brand)
```

Composition ids are `<logo id>-<scene id>` (e.g. `subhodayam-intro-6-tamara`). The logo id can
differ from the folder (`inverted-devils` lives in `brands/inverteddevils/`); files on disk always
use the folder name.

Public files: Remotion serves one public folder, so the scripts copy every brand's
`graphics/public/` into `out/brands/.public/<brand>/` before bundling.

## Outputs: one folder per brand, nothing loose

```
out/brands/<brand>/
  renders/<scene>.mp4                         scenes (with their sound)
  renders/<scene>.mov | .webm | .preview.mp4  transparent scenes: ProRes 4444 + alpha, VP9 + alpha, on the preview colour
  stills/<scene>/<t>s.jpg                     on the brand's preview colour
  stills-alpha/<scene>/<t>s.png               transparent
  checks/                                     contact sheets, sfx.png, sync.png, comparisons: anything made to look at
out/brands/.public/                           assembled public files (rebuilt every run)
```

Contact sheets, comparisons and other review images go in `checks/` (or a scratch folder), never
loose in `out/` or at a brand's root.

## Commands (from the repo root)

```bash
npm run logos-studio -w lyrics_videos                                       # Studio, every brand
npm run logos -w lyrics_videos -- stills subhodayam-logo 0.5,1.5,3          # → out/brands/subhodayam/stills/logo/
npm run logos -w lyrics_videos -- stills subhodayam-end 6 --guides          # with the end-card slots
npm run logos -w lyrics_videos -- stills subhodayam-logo 3 --alpha          # transparent PNG
npm run logos -w lyrics_videos -- render subhodayam-intro                   # → out/brands/subhodayam/renders/
npm run brand -w lyrics_videos -- subhodayam [--only=intros,youtube] [--resume]   # export the kit into brands/subhodayam/
# brand.json can also list `vectors` (more SVGs from named exports) and `favicon` (ico + png icons + manifest, rendered per size from square scenes); see scripts/brand.ts
npm run type-check -w lyrics_videos
uv run --with librosa --with matplotlib python logoGraphics/tools/sfx.py subhodayam
uv run --with librosa --with scipy --with matplotlib python logoGraphics/tools/sync_check.py subhodayam [intro-6-tamara,…]
```

`which` matches composition ids by substring (`--exact` for whole ids only); it must stay within
one brand unless you pass `--all-brands`.

## Using a logo in another composition

The logo component animates from frame 0 of wherever it is mounted, so place it with a
`Sequence`; it fills its box and keeps its aspect (`LOGO_VIEW`). Inside a brand, use its
`PlacedLogo` (from `lib/place.tsx`) to place it by the lockup's centre and width.
`LOGO_TIMING.drawn` is when the lockup is complete, and `LOGO_STILL` a frame where it is at rest.

## Adding a brand

Follow the `make-brand-kit` skill. In short: make `brands/<brand>/graphics/` with `index.tsx`
(`defineLogo`), `theme.ts` (with `BRAND = '<brand>'`), the logo component and its geometry;
build scenes on `lib/`; put sounds and fonts in `public/`; list the kit in `brand/brand.json`.
