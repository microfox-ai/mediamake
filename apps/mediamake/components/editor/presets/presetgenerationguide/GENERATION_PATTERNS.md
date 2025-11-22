# Preset Generation Patterns (Beyond Basics)

This guide extends the core writing guides (BASICS, TYPOGRAPHY, LAYOUT, MEDIA) with patterns
for more advanced preset categories such as analytics/debug, accessibility, packs, platform-specific layouts, and param-driven presets.

Use these as **conceptual constraints** when planning and coding presets.

---

## 1. Analytics & Debug Presets

Analytics/debug presets (timecodes, HUDs, density visualizers, etc.) are still **normal presets**:

- Root: `BaseLayout` (`type: 'layout'`), covering the whole frame or a corner region.
- Children: `TextAtom`, `ShapeAtom`, or other atoms for bars, labels, or simple visuals.
- Timing: Usually `fitDurationTo` the main scene or audio, or use a long duration to cover the whole video.

**Common patterns:**

- **Timecode Overlay**  
  - TextAtom in a corner, showing the current time.
  - Timing covers entire video, with effects controlling subtle blinking or color changes.

- **Caption Density / Timeline Strips**  
  - A horizontal bar at the bottom (`BaseLayout` with `flex-row` children).
  - Each “block” (ShapeAtom or HTMLBlockAtom) represents a segment (e.g., a caption range).

- **Debug HUD**  
  - A vertical stack (`flex-col`) of small TextAtoms describing: FPS, density, current caption id, etc.

Always keep analytics visuals **non-destructive** – they should overlay on top of existing content.

---

## 2. Accessibility & Localization Presets

Accessibility presets should **prioritize legibility and comfort**:

- Use large font sizes, high-contrast colors, and thick outlines/backdrops.
- Prefer `className` with Tailwind utilities (`text-white`, `bg-black/80`, `outline`, `rounded`, etc.).
- Use parameters to toggle modes (`accessibilityMode`, `reducedMotion`, `contrastLevel`).

**Patterns:**

- **High-Contrast Caption Presets**
  - Subtitle container layout at bottom.
  - TextAtom with large `fontSize`, bold weight, and dark semi-transparent background box.

- **Reduced Motion Preset**
  - Reuse existing visual structure but either:
    - Remove aggressive effects, or
    - Shorten/soften them (lower amplitude, shorter shake, no rapid jitter).

- **Localization / RTL Presets**
  - Use layout props like `justify-end`, `text-right`, and adjust padding/margins to the opposite side.
  - Expose parameters for `languageDirection` or `isRTL` and branch in layout accordingly.

> All of these are still single presets; make them **configurable** via params instead of creating multiple files.

---

## 3. “Pack” / “Series” / “Bundle” Presets

These names suggest multiple related templates, but they must be implemented as **one preset**.

Two main strategies:

1. **Sequential Story Preset**  
   - Use one `BaseLayout` plus internal “sections” distinguished by timing ranges.
   - E.g. “Intro (0–3s) → Main (3–27s) → Outro (27–30s)” all inside the same preset tree.

2. **Parameter-Selectable Variant Preset**  
   - Expose a `variant` or `layoutType` parameter.
   - Conditional logic in `presetExecution` chooses which children/layout to build.

Examples:

- A “Course Lesson Pack Preset” can:
  - Show a title card, then bullet list, then recap, each in its own timed section.

- A “Music Visual Pack Preset” can:
  - Use multiple visual styles in sequence (bars → circles → waveform) based on elapsed time or params.

---

## 4. Platform / Format Specific Presets

Platform presets (TikTok, Shorts, Reels, LinkedIn, etc.) focus on:

- **Aspect ratio and safe zones**
- **UI-avoidance regions** (areas where app chrome overlays live)

Patterns:

- Expose a `platform` and/or `aspectRatio` param.
- Use `BaseLayout` with nested layouts that:
  - Reserve top/bottom padding for OS overlays and app chrome.
  - Position subtitles in known safe areas.
  - Place CTAs and titles away from buttons or profile areas.

For vertical formats (e.g. 9:16):

- Default to `className: 'absolute inset-0 flex flex-col'` on the root container.
- Use `justify-between` to anchor header and footer areas while keeping main content centered.

---

## 5. Interactive & Param-Driven Presets

These presets behave differently depending on **input parameters**, but are still a single preset.

Common parameters:

- `theme`, `platform`, `mood`, `intensity` / `impact`, `variant`, `density`, `accessibilityMode`.

Patterns:

- **Mood or Intensity**  
  - Use `impact` / `intensity` to scale effect durations, amplitudes, or glow strengths.

- **Dynamic Layout Choices**  
  - Based on item count (e.g., number of speakers or images), choose between 1, 2, or 3-column layouts.

- **Global Switches**  
  - `reducedMotion` → disable or simplify expensive effects.
  - `debugMode` → show/hide debug overlays or bounding boxes.

When designing such presets:

- Keep the **core structure stable** (root BaseLayout, main regions).
- Only change styling, effects, or which child layouts are added/removed based on params.

---

## 6. Analytics / Debug Presets + Normal Presets

Analytics presets can be:

- Used alone (pure debug render), or
- Combined with normal presets by attaching them to a base scene via `attachedToId` in options.

They should never mutate other presets – only **observe and visualize**.

---

## 7. General Advice

- Prefer **simple, composable layouts** over huge monolithic trees.
- Use **dependencies** for reusable effects (internal presets) and complex sub-structures.
- Use **parameters** instead of generating multiple presets.
- Always honour the **single preset per file** rule from `GENERATION_SINGLE_PRESET.md`.


