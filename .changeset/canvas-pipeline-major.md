---
"@microfox/remotion": major
---

Replace the bespoke canvas components with a declarative CanvasPipeline.

**Breaking changes**

- Removed the `CanvasAtom` atom and its `CanvasAtomConfig` / `CanvasAtomDataProps`
  exports. A bare `<canvas>` is not drivable from preset JSON; use the
  `CanvasPipeline` atom instead.
- Removed the bespoke canvas effects `CanvasReveal`, `CanvasWipeReveal`,
  `CanvasContentAwareReveal`, `CanvasGlitchEffect` and `CanvasParticleEffect`,
  along with their `registerEffect` registrations. The equivalent behaviour is now
  expressed as ops (`draw`, `clip`, `mask`, `particles`, `glitch`, `post`) composed
  through the `CanvasFx` effect.
- Raised the `remotion` and `@remotion/*` peer dependency range from `>=4.0.355`
  to `>=4.0.496`, required by the stable `@remotion/web-renderer` API.

**Added**

- `CanvasPipeline` atom and `CanvasFx` effect, backed by a canvas op registry with
  runtime param resolution, seeded RNG, geometry helpers, asset loading and timing.
- `useCanvasPipeline` hook and the `draw` / `clip` / `mask` / `particles` /
  `glitch` / `post` op standard library.

**Migration**

Saved layers referencing the removed component ids will not resolve against the
registry and must be re-applied from an updated preset. Presets shipped in this
repo have already been ported.
