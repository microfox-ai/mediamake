# CanvasPipeline & CanvasFx Documentation

## Overview

The canvas pipeline system replaces one-off canvas effect components with a
**declarative op registry**. A pipeline is a JSON tree of small composable
drawing operations ("ops"). The runtime handles image loading (render-safe via
delayRender), heavy precomputation (cached per op), deterministic seeded
randomness, and per-frame drawing.

Two entry points:

- **`CanvasPipeline` atom** — the pipeline IS the content of the atom.
- **`effect-CanvasFx` effect** — applies a pipeline to wrapped children as a
  `mask` (alpha reveal of ANY child: video, text, layouts), `overlay`,
  `underlay`, or standalone `content`.

## Data Shape

```typescript
{
  id: 'my-canvas',
  componentId: 'CanvasPipeline',   // atom
  type: 'atom' as const,
  data: {
    sources: { hero: { type: 'image', src: 'https://...' } }, // named images
    pipeline: [ /* CanvasOpNode[] */ ],
    background: '#000000',   // optional; transparent when omitted
    seed: 42,                // optional; defaults to component id (deterministic)
  },
  context: { timing: { start: 0, duration: 8 } },
}
```

Every pipeline node:

```typescript
{
  op: 'draw:image',                       // registry key
  params: { source: 'hero', fit: 'cover' }, // validated by the op's zod schema
  timing: { start: 0, duration: '50%', easing: 'ease-out' }, // seconds or '%' of the atom duration
  ranges: [                               // keyframes over the op's local progress (0..1)
    { key: 'opacity', val: 0, prog: 0 },
    { key: 'opacity', val: 1, prog: 1 },
  ],
  children: [ /* nested nodes for container ops */ ],
}
```

- `timing` gives the op a local `progress` (0→1, eased, clamped). Reveal ops
  animate from timing alone.
- `ranges` interpolate ANY numeric/unit-string/color param — same keyframe
  shape as the generic effect.

## Op Catalog

### Sources (put pixels down)
| op | key params |
|---|---|
| `draw:image` | `source`, `fit` (cover/contain/fill), `opacity`, `x/y/width/height` |
| `draw:text` | `text`, `fontFamily`, `fontSize`, `fontWeight`, `color`, `align`, `strokeColor` |
| `draw:shape` | `kind` (rect/circle/polygon/star/line), `fill`, `strokeColor`, `radius`, `sides`, `rotation`, `cornerRadius` |
| `draw:gradient` | `kind` (linear/radial), `stops[{offset,color}]`, `angle`, `cx/cy/radius` |

### Structure
| op | behavior |
|---|---|
| `group` | transform container: `x/y/scale/rotation/opacity/blend` applied to children |

### Reveals (clip/mask children or sources)
| op | key params |
|---|---|
| `clip:reveal` | `revealType` (wipe/radial), `angle`, `cx/cy`, `edgeStyle` (straight/organic/burn), `edgeWaviness`, `edgeFrequency`, `glow`, `glowColor`, `glowIntensity`, `invert`. Clips its `children` — works on anything they draw. Progress = op timing (or `progress` param). |
| `mask:content-aware` | `source`, `order` (vibgyor/luminance/random), `direction` (+`directionWeight`), `serpentine` + `layers` (sweep back and forth in bands), `softness`, `fit`. Pixel-by-pixel reveal ordered by the image's own content. |

### Systems
| op | key params |
|---|---|
| `particles` | `formations[]` — sequence of shapes the cloud morphs through: `{type:'image',source,fit,scale}`, `{type:'text',text,fontSize,...}`, `{type:'scatter',pattern:'random\|center\|edges\|bottom\|top\|explode'}`. Plus `count`, `size`, `shape`, `spread`, `hold` (rest time per formation), `stagger`, `swirl`, `jitter`, `glow`, `glowOpacity`, `trail`, `color`. Particles inherit pixel colors from image/text formations and crossfade between them. |

### Making text formations readable

Particle text is only legible if enough particles land inside the glyphs:

- **`count` ≥ ~4000** for a 9-character headline at 1080p. Fewer particles cannot
  resolve letter strokes. (The sampler sizes its grid from the *filled* area, so
  count maps directly to density inside the letters.)
- **`size` ≈ 4** with **`shape: 'circle'`** reads better than tiny squares.
- **`spread: 0.35`** keeps an organic look; `0` gives a crisp mechanical lattice.
- **Keep `glow` modest (≤ ~6) and `glowOpacity` ≤ ~0.5** — a strong halo washes
  the letterforms out.
- **`hold` ≥ ~0.4** so the headline actually rests on screen instead of being a
  waypoint on the way to the next formation.
- `jitter` only applies while particles travel, so it never blurs a resting
  formation.

### Treatments
| op | key params |
|---|---|
| `glitch` | `types[]` (rgb-shift/slice/blocks/static/scan), `intensity`, `frequency`, `continuous`, `holdFrames`. Applies to whatever its `children` draw. |
| `post:glow` | `blur`, `strength`, `color`, `opacity` — halo behind children |
| `post:vignette` | `color`, `strength`, `radius` |
| `post:grain` | `opacity`, `size` — animated seeded film grain |
| `post:scanlines` | `spacing`, `thickness`, `color`, `drift` |
| `embers` | `count`, `color`, `size`, `rise`, `lifetime`, `area` — floating sparks |

## Example 1 — burn-edge reveal of a VIDEO (impossible with the legacy canvas effects)

Use `effect-CanvasFx` in `mask` mode: the pipeline draws the reveal shape,
CSS-masks the child. The child stays a real VideoAtom.

```typescript
{
  id: 'video-burn',
  componentId: 'BaseLayout',
  type: 'layout' as const,
  data: { containerProps: { className: 'absolute inset-0' } },
  effects: [
    {
      id: 'burn-mask',
      componentId: 'CanvasFx',
      data: {
        mode: 'mask',
        pipeline: [
          {
            op: 'clip:reveal',
            timing: { start: 0, duration: 2, easing: 'ease-in-out' },
            params: { revealType: 'wipe', angle: 30, edgeStyle: 'burn', edgeWaviness: 40 },
            children: [
              { op: 'draw:shape', params: { kind: 'rect', fill: '#ffffff' } },
            ],
          },
        ],
      },
    },
  ],
  childrenData: [
    { id: 'v1', componentId: 'VideoAtom', type: 'atom' as const, data: { src: '...' } },
  ],
}
```

## Example 2 — particles morph text → image (CanvasPipeline atom)

See the `particle-morph-reveal` preset for the full version:
scatter → headline text → image, while the crisp image burns in over it via
`clip:reveal` + `embers` + `post:vignette`/`post:grain`.

## Rules

1. **Never use `Math.random()`** in anything canvas related — pass `seed` for
   variation instead; all ops are internally seeded and deterministic.
2. **Timing is seconds or `'%'` strings** relative to the atom/effect
   duration — never frames. (Legacy `revealDurationInFrames` props remain
   only on the deprecated `effect-Canvas*` components.)
3. **Presets expose the clip window via `rangeString`** with
   `.meta({ [paramMetaTypes.rangeField]: true })` (MM:SS-MM:SS), parsed
   inside the preset function into `context.timing { start, duration }` —
   see `particle-morph-reveal` for the pattern. Keep numeric `start`/
   `duration` params as fallback.
4. Prefer `effect-CanvasFx mode:'mask'` to reveal existing atoms; prefer
   `CanvasPipeline` when the canvas itself is the content.
5. Keep `particleCount` ≤ ~6000 and let `mask` mode default `maskScale: 0.5`
   unless crisp hard edges are required.

## Performance

The runtime is preview-adaptive: the canvas backing store follows the player
zoom (quantized, min 0.25) and returns to full resolution during server
renders; `renderScale` on the atom data caps it manually. Particle glow is a
single blurred composite pass — never per-particle shadows. The full
particle-morph-reveal pipeline draws in ~3ms/frame at 1080×1920.
