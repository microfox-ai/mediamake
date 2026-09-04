# Canvas Pipeline

Declarative canvas drawing for `@microfox/remotion`. Presets emit plain JSON;
the runtime resolves each node against an op registry and draws it.

> **Breaking change.** This system replaces `CanvasAtom` and the five bespoke
> `Canvas*` effect components. See [Migration](#migration) at the bottom.

---

## Why

Canvas effects used to be hand-written React components. Each one re-implemented
its own frame loop, asset loading, RNG and precomputation, and each was a closed
box: `CanvasWipeReveal` could only reveal an `imageUrl` it loaded itself, and it
ignored its children entirely. Adding an effect meant adding a component, and
effects could not be combined.

Two consequences drove the rewrite:

1. **Presets could not describe canvas work.** A preset can emit JSON, not a
   React component, so canvas effects were unreachable from the preset system
   and from the AI preset generator.
2. **The effects violated the effect contract.** An effect is supposed to be a
   treatment applied to its children. These ignored their children, so they
   could never wrap a `VideoAtom`, a `TextAtom` or a layout subtree.

Drawing is now a tree of small composable **ops** resolved from a registry —
the canvas-level mirror of the existing component registry.

---

## The data model

A pipeline is a JSON object with two required parts: named `sources` (drawable
inputs, loaded before anything runs) and a `pipeline` array of op nodes.

```jsonc
{
  "sources": {
    "hero": { "type": "image", "src": "https://cdn.example.com/hero.jpg" }
  },
  "background": "#000",          // optional; transparent when omitted
  "seed": "hero-reveal",         // optional; defaults to the component id
  "renderScale": 1,              // optional backing-resolution multiplier
  "pipeline": [
    {
      "op": "clip:reveal",
      "timing": { "start": "10%", "duration": "60%", "easing": "ease-out" },
      "params": { "shape": "wipe", "angle": 45, "edge": "burn" },
      "children": [
        { "op": "draw:image", "params": { "source": "hero", "fit": "cover" } }
      ]
    },
    { "op": "post:grain", "params": { "amount": 0.15 } }
  ]
}
```

### `CanvasOpNode`

| Field      | Meaning |
|------------|---------|
| `op`       | Registry key, e.g. `draw:image`, `clip:reveal`, `particles`. |
| `params`   | Static params, validated against the op's zod schema. |
| `ranges`   | Keyframes interpolated over the node's local progress, merged onto `params`. |
| `timing`   | Local timing window that produces this op's `progress`. |
| `children` | Child nodes. Group / clip / post ops decide how they are rendered. |

### Timing

`timing.start` and `timing.duration` accept **seconds** (number or numeric
string) or **`'%'` strings** relative to the atom's duration — the same
conventions as `UniversalEffect`, so preset authors learn one system. Ops read
the eased, clamped result as `progress` (0..1).

Easing is one of `linear`, `ease-in`, `ease-out`, `ease-in-out`.

### Keyframes (`ranges`)

Identical in shape to the `UniversalEffect` animation ranges:

```jsonc
"ranges": [
  { "key": "blur",  "val": 20,        "prog": 0 },
  { "key": "blur",  "val": 0,         "prog": 1 },
  { "key": "color", "val": "#ff0044", "prog": 0.5 }
]
```

The interpolator handles numbers, unit strings (`'12px'`, `'45deg'`, `'30%'`)
and hex / `rgb()` / `rgba()` colours. Interpolated values are merged onto
`params` before the op's `apply` runs.

---

## Op standard library

Importing `src/canvas/ops` registers all 14 built-ins.

### Sources

| Op | What it draws |
|---|---|
| `draw:image` | A named source image, with fit modes. |
| `draw:text` | Text, with the usual font/align controls. |
| `draw:shape` | Rectangles, ellipses, polygons. |
| `draw:gradient` | Linear / radial gradients. |

### Structure

| Op | What it does |
|---|---|
| `group` | Transform / opacity / blend-mode container for its children. |

### Reveals

| Op | What it does |
|---|---|
| `clip:reveal` | Wipe or radial reveal with straight, organic or burn edges. Clips its children. |
| `mask:content-aware` | Reveals pixels ordered by colour or luminance. |

### Systems

| Op | What it does |
|---|---|
| `particles` | Formation morphing — particles sampled from images, text or scatter, animated between formations. |

### Treatment

| Op | What it does |
|---|---|
| `glitch` | RGB-shift, slice, block, static and scan modes. |

### Post-processing

| Op | What it does |
|---|---|
| `post:glow` | Bloom / glow pass. |
| `post:vignette` | Edge darkening. |
| `post:grain` | Film grain. |
| `post:scanlines` | CRT scanlines. |
| `embers` | Drifting ember particles. |

Every op carries a zod `schema`, so the whole library is introspectable —
`getRegisteredCanvasOps()` is what backs the in-app pipeline editor and the AI
preset generator.

---

## Execution model

The runtime splits work into two phases so that per-frame drawing stays cheap
and deterministic.

### `init` — heavy, cached, async, render-safe

```ts
init?: (ctx: CanvasOpInitContext<P>) => S | Promise<S>
```

For pixel sampling, burn maps, noise tiles, particle formations — anything
expensive. It runs behind Remotion's `delayRender`, and the result is cached
keyed by `(node path, params, assets)` and handed to every `apply` call.

### `apply` — pure, synchronous, per frame

```ts
apply: (ctx: CanvasOpRenderContext<P, S>) => void
```

Must not allocate large buffers or mutate state. It receives:

| Field | Meaning |
|---|---|
| `g` | The 2D context to draw into. |
| `params` | Schema-parsed params with keyframe ranges already applied. |
| `state` | The `init()` result. |
| `progress` | Eased local progress, 0..1. |
| `frame` | `{ frame, fps, durationInFrames, width, height }`. |
| `assets` | `assets.image(name)` → decoded `HTMLImageElement`. |
| `random` | Deterministic PRNG (see below). |
| `renderChildren()` | Draw children into the current context, inheriting transforms and clip. |
| `captureChildren()` | Draw children into a pooled offscreen canvas and return it. |

> `captureChildren()` returns a canvas **owned by the runtime and reused between
> frames**. Draw from it immediately; never hold a reference across frames.

### Determinism

Remotion renders frames in parallel across workers, so `Math.random()` is never
allowed in an op — two workers would produce different pixels for adjacent
frames.

Instead every op gets a `random()` seeded from `(atom seed, node path)` via
Mulberry32, with FNV-1a hashing for string seeds. It is **re-seeded identically
every frame** for a given node, so:

- For stable per-element randomness (particle start positions), just call
  `random()`.
- For per-frame variation (static, jitter), mix `frame` into your maths
  yourself.

The atom's seed resolves from `data.seed` (number or string) and falls back to
hashing the component id — so two instances of the same preset on one canvas
produce different noise, and the same instance is identical across renders.

### Asset loading

All image loads go through `delayRender`, so Remotion never captures a frame
before the pixels exist. Decoded images are cached module-wide (one load per URL
per worker), `crossOrigin` is set to `anonymous` so `getImageData` works, and a
failed load is evicted from the cache so a retry is possible rather than caching
the rejection forever. On failure the render is released and the op degrades
instead of hanging the render.

### Param parsing

Zod `safeParse` results are cached in a `WeakMap` keyed by the node object.
Pipeline JSON is stable between frames, so parsing every node's schema every
frame would be pure waste. Invalid params log a warning once and fall through to
the raw values rather than throwing.

Unknown op names warn **once** per name and are skipped.

---

## The two entry points

### `CanvasPipeline` (atom)

The pipeline *is* the content. Use it when you want a canvas drawing as a layer.

```tsx
{ type: 'CanvasPipeline', data: { sources, pipeline, background } }
```

### `CanvasFx` (effect)

The one generic canvas effect. Unlike the legacy `Canvas*` effects, it honours
the effect contract and treats the pipeline as a treatment for whatever it
wraps. `mode` decides how:

| `mode` | Behaviour |
|---|---|
| `mask` | The pipeline's alpha becomes a CSS mask on the children. |
| `overlay` | The pipeline draws **above** the children. |
| `underlay` | The pipeline draws **below** the children. |
| `content` | The pipeline is the content; children are not rendered. |

`mask` is the interesting one: any reveal geometry — organic burn edges,
zig-zag, content-aware ordering — now works on a `VideoAtom`, a `TextAtom` or a
whole layout subtree, without pixel-copying the child. `maskScale` (default
`0.5`) shrinks the mask's backing store for speed; the pipeline still draws in
full composition coordinates.

In mask mode the wrapper's styles are set via ref, so the effect does not
re-render React every frame.

---

## Resolution handling

`useAdaptiveCanvasScale` picks the canvas backing-store resolution:

- **During server rendering** (`isRendering`) → always full resolution, unless
  `renderScale` is explicitly below 1.
- **In the Player** → follows the player zoom times the device pixel ratio
  (capped at 2), quantized to ¼ steps and clamped to `[0.25, 1]`.

The quantization matters: without it the backing store would be reallocated on
every zoom tick. In the editor the canvas is displayed scaled down, so drawing
the full composition resolution every frame would throw most of the pixels away.

---

## Adding an op

```ts
import { z } from 'zod';
import { registerCanvasOp } from '../registry';

const ParamsSchema = z.object({
  radius: z.number().default(10),
  color: z.string().default('#fff'),
});

registerCanvasOp<z.infer<typeof ParamsSchema>, { lut: Float32Array }>({
  name: 'post:my-effect',
  displayName: 'My Effect',
  description: 'One line the editor and the AI generator will show.',
  schema: ParamsSchema,

  // Optional heavy precompute — cached, async allowed, runs behind delayRender.
  init: ({ params, width, height, random }) => ({
    lut: buildLut(width, height, random),
  }),

  // Pure per-frame draw.
  apply: ({ g, params, state, progress, frame }) => {
    g.save();
    g.globalAlpha = progress;
    // ...draw using state.lut...
    g.restore();
  },
});
```

Then add the import to `src/canvas/ops/index.ts`. The op is immediately
available to preset JSON, the pipeline editor and the generator — no other
wiring.

**Rules:** no `Math.random()`, no large allocations in `apply`, always
`save()`/`restore()` around context mutations.

---

## Migration

These exports were **removed** from `@microfox/remotion`:

| Removed | Replacement |
|---|---|
| `CanvasAtom`, `CanvasAtomConfig`, `CanvasAtomDataProps` | `CanvasPipeline` atom |
| `CanvasReveal` | `clip:reveal` op |
| `CanvasWipeReveal` | `clip:reveal` op with `shape: 'wipe'` |
| `CanvasContentAwareReveal` | `mask:content-aware` op |
| `CanvasGlitchEffect` | `glitch` op |
| `CanvasParticleEffect` | `particles` op |

`CanvasAtom` was dropped rather than ported because a bare `<canvas>` is not
drivable from preset JSON — the thing that made it useless to the preset system
in the first place.

The `remotion` / `@remotion/*` peer range moved from `>=4.0.355` to `>=4.0.496`.

### Saved layers

A saved layer that references a removed component id will not resolve against
the registry. The symptom is a console warning:

```
Component type <id> not found in registry
```

Re-apply the preset to that layer. Presets shipped in this repo are already
ported; see `ATOM_CANVAS_PIPELINE.md` in the preset writing guide for the
author-facing version of this document.

### Performance notes from the port

The ops are not straight translations — several fixed real problems in the
originals:

- `mask:content-aware` precomputes its ordering in `init`. `CanvasReveal`
  re-allocated a canvas and ran a full `getImageData` **every frame**.
- `glitch` is offset-based and does no `getImageData` in the frame loop, which
  `CanvasGlitchEffect` did.
- `clip:reveal` clips arbitrary children. `CanvasWipeReveal` could only reveal an
  `imageUrl` it loaded itself.
