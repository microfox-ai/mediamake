# Canvas Pipeline

Canvas drawing for `@microfox/remotion`, described as JSON instead of written as
React components. Presets emit the JSON; the runtime looks up each step in a
registry and draws it.

> **Breaking change.** This replaces `CanvasAtom` and the five old `Canvas*`
> effect components. See [Migration](#migration).

---

## Why we changed it

Canvas effects used to be React components written by hand. Each one had its own
frame loop, its own image loading, its own random numbers, and its own setup
work. Each one was also closed off — you could not combine them.

Two problems made this a dead end:

1. **Presets could not use them.** A preset produces JSON, not a React
   component. So canvas effects were out of reach for the preset system and for
   the AI preset generator.
2. **They broke the effect contract.** An effect is supposed to wrap its
   children and change how they look. These ignored their children completely.
   `CanvasWipeReveal` could only reveal an `imageUrl` it loaded itself, so it
   could never wrap a `VideoAtom`, a `TextAtom`, or a group of layers.

Drawing is now a tree of small steps called **ops**, looked up from a registry.
It works the same way the component registry already does.

---

## What a pipeline looks like

A pipeline has two main parts: `sources` (images to load first) and `pipeline`
(the list of drawing steps).

```jsonc
{
  "sources": {
    "hero": { "type": "image", "src": "https://cdn.example.com/hero.jpg" }
  },
  "background": "#000",          // optional; see-through if left out
  "seed": "hero-reveal",         // optional; falls back to the component id
  "renderScale": 1,              // optional; how big the canvas buffer is
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

### The fields on a step

| Field      | What it does |
|------------|--------------|
| `op`       | Which op to run, e.g. `draw:image`, `clip:reveal`, `particles`. |
| `params`   | Settings for the op. Checked against the op's zod schema. |
| `ranges`   | Keyframes. Animated over this step's own progress and merged into `params`. |
| `timing`   | When this step runs, which decides its `progress` value. |
| `children` | Steps nested inside. Group, clip and post ops decide how to draw them. |

### Timing

`timing.start` and `timing.duration` take either **seconds** (a number, or a
number as a string) or a **percent string** like `"60%"` of the atom's total
length. These are the same rules `UniversalEffect` uses, so you only have to
learn one system.

Each op reads the result as `progress`, a value from 0 to 1. It is eased and
clamped, so it never goes outside that range.

Easing can be `linear`, `ease-in`, `ease-out`, or `ease-in-out`.

### Keyframes (`ranges`)

Same shape as the `UniversalEffect` ranges:

```jsonc
"ranges": [
  { "key": "blur",  "val": 20,        "prog": 0 },
  { "key": "blur",  "val": 0,         "prog": 1 },
  { "key": "color", "val": "#ff0044", "prog": 0.5 }
]
```

It can animate numbers, strings with units (`'12px'`, `'45deg'`, `'30%'`), and
colours written as hex, `rgb()` or `rgba()`. The animated values are merged into
`params` before the op runs.

---

## The ops that ship with it

Importing `src/canvas/ops` registers all 14.

### Drawing things

| Op | What it draws |
|---|---|
| `draw:image` | An image from `sources`, with fit modes. |
| `draw:text` | Text, with the usual font and alignment settings. |
| `draw:shape` | Rectangles, ellipses, polygons. |
| `draw:gradient` | Linear and radial gradients. |

### Grouping

| Op | What it does |
|---|---|
| `group` | Wraps children so you can move, fade, or blend them together. |

### Reveals

| Op | What it does |
|---|---|
| `clip:reveal` | Wipe or radial reveal. Edges can be straight, organic, or burnt. Clips its children. |
| `mask:content-aware` | Reveals pixels in order of colour or brightness. |

### Particles

| Op | What it does |
|---|---|
| `particles` | Particles taken from an image, from text, or scattered, animated between shapes. |

### Treatments

| Op | What it does |
|---|---|
| `glitch` | RGB shift, slices, blocks, static, and scan modes. |

### Post-processing

| Op | What it does |
|---|---|
| `post:glow` | Glow / bloom. |
| `post:vignette` | Darkens the edges. |
| `post:grain` | Film grain. |
| `post:scanlines` | CRT scanlines. |
| `embers` | Drifting ember particles. |

Every op has a zod schema. That means the whole set can be read
programmatically — `getRegisteredCanvasOps()` is what powers the in-app pipeline
editor and the AI preset generator.

---

## How it runs

Work is split into two stages, so per-frame drawing stays fast and always gives
the same result.

### `init` — slow work, done once

```ts
init?: (ctx: CanvasOpInitContext<P>) => S | Promise<S>
```

For anything expensive: reading pixels, building burn maps, noise tiles,
particle shapes. It can be async. It runs behind Remotion's `delayRender`, and
its result is cached against `(node path, params, assets)` and passed to every
frame.

### `apply` — fast work, every frame

```ts
apply: (ctx: CanvasOpRenderContext<P, S>) => void
```

Must stay simple. No big allocations, no changing shared state. It gets:

| Field | What it is |
|---|---|
| `g` | The 2D context to draw into. |
| `params` | Settings after the schema check and keyframe animation. |
| `state` | Whatever `init()` returned. |
| `progress` | This step's progress, 0 to 1. |
| `frame` | `{ frame, fps, durationInFrames, width, height }`. |
| `assets` | `assets.image(name)` gives you the loaded image. |
| `random` | Random numbers that are always the same (see below). |
| `renderChildren()` | Draws the children into the current context, keeping transforms and clipping. |
| `captureChildren()` | Draws the children into a spare offscreen canvas and returns it. |

> `captureChildren()` gives you a canvas the runtime **owns and reuses between
> frames**. Draw from it right away. Never keep a reference to it.

### Random numbers must repeat

Remotion renders frames in parallel across workers. If an op used
`Math.random()`, two workers would draw different pixels for frames next to each
other, and the video would flicker.

So every op gets its own `random()`, built from `(atom seed, node path)` using
Mulberry32. String seeds are hashed with FNV-1a. It is **reset to the same
starting point on every frame** for that step, which means:

- Want randomness that stays put across frames (like where a particle starts)?
  Just call `random()`.
- Want it to change every frame (static, jitter)? Mix `frame` into your own
  maths.

The atom's seed comes from `data.seed` (a number or a string). If you leave it
out, it hashes the component id. So two copies of the same preset on one canvas
look different, but the same copy looks identical every time you render.

### Loading images

Every image load goes through `delayRender`, so Remotion never captures a frame
before the pixels exist.

- Loaded images are cached for the whole module, so one URL loads once per
  worker.
- `crossOrigin` is set to `anonymous` so `getImageData` works.
- A failed load is removed from the cache, so a retry is possible. Otherwise the
  failure would be cached forever.
- On failure the render is released and the op just degrades. It does not hang
  the render.

### Checking params

Zod results are cached in a `WeakMap` keyed by the step object. Pipeline JSON
does not change between frames, so re-checking every step's schema every frame
would be wasted work.

Bad params log a warning once and fall back to the raw values instead of
throwing. Unknown op names warn once and are skipped.

---

## The two ways to use it

### `CanvasPipeline` (an atom)

The canvas **is** the content. Use it when you want the drawing to be its own
layer.

```tsx
{ type: 'CanvasPipeline', data: { sources, pipeline, background } }
```

### `CanvasFx` (an effect)

One general-purpose canvas effect. Unlike the old `Canvas*` effects, it actually
uses its children. `mode` decides how:

| `mode` | What happens |
|---|---|
| `mask` | The canvas becomes a mask over the children. |
| `overlay` | The canvas draws **on top of** the children. |
| `underlay` | The canvas draws **behind** the children. |
| `content` | The canvas is the content. Children are not drawn. |

`mask` is the useful one. Any reveal shape — burnt edges, zig-zags, colour
ordering — now works on a `VideoAtom`, a `TextAtom`, or a whole group of layers,
without copying the child's pixels.

`maskScale` (default `0.5`) makes the mask's buffer smaller so it runs faster.
The pipeline still draws using full composition coordinates.

In mask mode the styles are set through a ref, so React does not re-render every
frame.

---

## Canvas size

`useAdaptiveCanvasScale` picks how big the canvas buffer should be:

- **While rendering on the server** (`isRendering`) it always uses full size,
  unless `renderScale` is set below 1 on purpose.
- **In the Player** it follows the zoom level times the device pixel ratio
  (capped at 2), rounded to quarter steps and kept between `0.25` and `1`.

The rounding matters. Without it, the buffer would be rebuilt every time you
nudge the zoom. And in the editor the canvas is shown shrunk down, so drawing at
full size would throw most of the pixels away.

---

## Adding your own op

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
  description: 'One line. The editor and the AI generator both show this.',
  schema: ParamsSchema,

  // Optional slow setup. Cached, can be async, runs behind delayRender.
  init: ({ params, width, height, random }) => ({
    lut: buildLut(width, height, random),
  }),

  // Fast per-frame drawing.
  apply: ({ g, params, state, progress, frame }) => {
    g.save();
    g.globalAlpha = progress;
    // ...draw using state.lut...
    g.restore();
  },
});
```

Then add the import to `src/canvas/ops/index.ts`. The op is immediately usable
in preset JSON, in the pipeline editor, and by the generator. Nothing else to
wire up.

**Rules:** no `Math.random()`, no big allocations in `apply`, and always wrap
context changes in `save()` / `restore()`.

---

## Migration

These were **removed** from `@microfox/remotion`:

| Removed | Use instead |
|---|---|
| `CanvasAtom`, `CanvasAtomConfig`, `CanvasAtomDataProps` | `CanvasPipeline` atom |
| `CanvasReveal` | `clip:reveal` op |
| `CanvasWipeReveal` | `clip:reveal` op with `shape: 'wipe'` |
| `CanvasContentAwareReveal` | `mask:content-aware` op |
| `CanvasGlitchEffect` | `glitch` op |
| `CanvasParticleEffect` | `particles` op |

`CanvasAtom` was dropped rather than converted. A plain `<canvas>` cannot be
controlled from preset JSON, which is the reason it was useless to the preset
system in the first place.

The `remotion` and `@remotion/*` peer dependency range moved from `>=4.0.355` to
`>=4.0.496`.

### Saved layers

A saved layer pointing at one of the removed components will not be found in the
registry. You will see this in the console:

```
Component type <id> not found in registry
```

Re-apply the preset to that layer. The presets in this repo are already
converted. The author-facing guide is at
`apps/mediamake/components/editor/presets/presetwritingguide/ATOM_CANVAS_PIPELINE.md`.

### Speed improvements that came with the port

The ops are not straight copies. Several fixed real problems in the originals:

- `mask:content-aware` works out its pixel order once in `init`. The old
  `CanvasReveal` built a new canvas and ran a full `getImageData` **every
  frame**.
- `glitch` works with offsets and never calls `getImageData` while drawing, which
  the old `CanvasGlitchEffect` did.
- `clip:reveal` can clip any children. `CanvasWipeReveal` could only reveal an
  `imageUrl` it loaded itself.
