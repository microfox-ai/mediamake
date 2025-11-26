# Single Preset File Rules

This guide defines **hard constraints** for the preset generator. All AI-generated presets **must** follow these rules.

## 1. Exactly One Preset Per File

- Each generated TypeScript file must define **exactly one preset**.
- That preset must:
  - Have **one** metadata object for that preset.
  - Have **one** execution function for that preset.
  - Have **one** exported preset object (e.g. `export const podcastVisualScenePreset = { ... }`).
- **Do NOT** generate multiple different presets in a single file (no multiple metadata/exports).

> Even if the idea sounds like a “pack”, “bundle”, or “series”, treat it as **one preset** that can orchestrate other presets via dependencies.

## 2. Using Other Presets (Sub‑presets)

- A preset **can** depend on other presets via their **IDs**.
- Declare these in `presetMetadata.dependencies.presets`.
- Call them via `props.presets[presetId](params, props)` and merge their output into your composition.
- The generator must **never** write those sub‑presets’ code again in the same file – it only **references** them.

Example pattern:

```ts
const presetMetadata: PresetMetadata = {
  id: 'podcastVisualScene',
  // ...
  dependencies: {
    presets: ['subtitlesPresetId', 'waveformFullScene', 'genericOpacityEffect'],
  },
};

const presetExecution = async (params, props) => {
  const { presets } = props;

  const subtitles = await presets['subtitlesPresetId'](subtitleParams, props);
  const waveform = await presets['waveformFullScene'](waveformParams, props);

  return {
    output: {
      childrenData: [
        // layout using data from subtitles.output / waveform.output
      ],
    },
  };
};
```

## 3. “Pack” / “Bundle” / “Series” Presets

Many preset ideas use names like **Pack**, **Bundle**, **Series**, or **Wall**.  
Interpret these **strictly as single presets** that build **richer compositions**, not as multiple presets.

Examples:

- `Podcast Episode Pack Preset`  
  → A **single** preset that builds the full episode structure (intro, main segments, outro) in one composition, possibly calling other presets.

- `Course Lesson Pack Preset`  
  → A **single** preset that renders title, bullets, demo area, and recap sections in one timeline.

- `Music Visual Pack Preset`  
  → A **single** preset that combines multiple visualizer styles into one scene or sequential segments.

- `Brand Pack Template Preset`  
  → A **single** preset that applies a brand style (colors, fonts, lower‑thirds, etc.) to its children and exposes brand‑style parameters.

Do **not** attempt to generate separate files like `intro.ts`, `outro.ts`, etc. for such ideas. They must be expressed as **one preset file**.

## 4. Parameter‑Driven Variants Instead of Multiple Files

If a concept suggests multiple variants (e.g. light/dark, platform‑specific, accessibility modes), implement it by:

- Adding parameters to `presetParams` (e.g. `theme`, `platform`, `accessibilityMode`).
- Using conditional logic inside `presetExecution` to change layout, effects, or children **within the same preset**.

Examples:

- A “Seasonal Theme Pack Preset” can take `season: 'winter' | 'summer' | 'spooky'` and switch gradients/icons accordingly.
- A “Platform / Format Specific Preset” can take `platform: 'tiktok' | 'youtube' | 'linkedin'` and adjust safe zones and typography.

## 5. Summary for the Generator

When you see any preset name or specification, always apply these rules:

1. **Exactly one preset per file.**
2. **Use dependencies by ID** instead of redefining their code.
3. **Treat “packs/bundles” as a single, richer preset**, not multiple presets.
4. **Expose variants via params**, not additional files or exports.
5. **Export pattern**: Use an exported object named `{presetId}Preset` that contains:
   - `metadata: presetMetadata`
   - `presetFunction: presetExecution.toString()`
   - `presetParams: z.toJSONSchema(presetParams)` (Zod schema converted to JSON schema for storage/UI).

If a user prompt sounds like “create a pack containing multiple presets”, reinterpret it as:

> “Create one preset that orchestrates these behaviors or layouts within a single composition.”


