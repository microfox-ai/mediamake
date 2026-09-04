# Preset Form Inputs

How a preset author chooses the editor widget for a parameter, and what the
colour and slider widgets do.

---

## Choosing a widget

The schema form renders a widget per field. Previously that choice was made
purely by name-based heuristics. A preset author can now request one explicitly
through zod metadata:

```ts
z.string().meta({
  [paramMetaTypes.inputType]: paramInputTypes.color,
  [paramMetaTypes.inputOptions]: { allowAlpha: false, presets: ['#fff', '#000'] },
})
```

### `paramInputTypes`

| Value | Widget |
|---|---|
| `color` | Full colour picker — SV plane, hue/alpha sliders, eyedropper, harmony, swatches. |
| `slider` | Numeric slider with a live readout instead of a bare number box. |
| `textarea` | Multi-line text area. |
| `text` | Single-line text box — use this to opt **out** of a name-based heuristic. |

Adding a new one means adding a case to the schema-form renderer.

### `inputOptions`

```ts
interface ColorInputOptions {
  allowAlpha?: boolean;      // show the alpha slider, emit rgba()/8-digit hex. Default true.
  presets?: string[];        // extra swatches shown above the built-in palette
  format?: 'hex' | 'rgb' | 'hsl';  // notation to write back; defaults to the current value's
}

interface SliderInputOptions {
  min?: number;
  max?: number;
  step?: number;
  unit?: string;             // suffix next to the readout, e.g. "px" or "%"
}
```

---

## Name-based colour detection

An explicit `inputType` always wins. Without one, string fields are still
inferred, so the many existing preset colour fields get a picker without being
re-annotated.

The matching is **word-based, not substring-based** — this is the part that
matters. A naive `key.includes('color')` gets `colorMode` wrong.

A field key is tokenized on camelCase and `-`/`_`/`.` boundaries
(`burnGlowColor` → `[burn, glow, color]`), then:

- **`COLOR_WORDS`** — `color`, `colors`, `colour`, `colours`. A colour anywhere
  in the key.
- **`COLOR_TAIL_WORDS`** — `fill`, `stroke`, `tint`, `shade`, `hue`, `swatch`,
  `background`, `accent`, `primary`, `secondary`, `foreground`. A colour only
  when the word is the whole key or its final word. `fill` is a colour;
  `fillMode` is not. `background` is a colour; `backgroundImage` is a URL.
- **`NON_COLOR_TAIL_WORDS`** — `mode`, `type`, `style`, `space`, `scheme`,
  `format`, `blend`, `count`, `index`, `name`, `key`, `id`, `class`, `variant`.
  These turn a colour word into a setting *about* colour.

Enums are always left as dropdowns — a fixed choice list is not a free colour.

Net effect: `artistColor` and `burn_glow_color` get pickers; `colorMode`,
`borderRadius` and `backgroundImage` do not.

---

## The colour picker

`components/editor/presets/form/inputs/color-input.tsx`

A swatch button opens the picker. Alongside it sits a **free-text input**, kept
deliberately: preset values are not always literal colours — CSS variables,
`currentColor` and gradients all need to stay editable, and a picker-only field
would make them unreachable.

**Picker surface**
- SV plane with hue and alpha sliders.
- Checkerboard behind transparent values.
- Format follows `inputOptions.format`, else `detectFormat(value)` — so editing
  an `hsl()` value writes `hsl()` back rather than silently converting the
  preset to hex.

**Eyedropper.** `use-eyedropper.ts` wraps the native `window.EyeDropper` API,
which samples any pixel on screen — including cross-origin media the canvas
could not read. Chromium only (Chrome/Edge/Brave/Electron); on other browsers
the hook reports `isSupported: false` and the button is hidden rather than
throwing.

**Harmony.** Generates related hues from the current colour:

| Name | Hue offsets |
|---|---|
| Complementary | 180° |
| Triadic | 120°, 240° |
| Analogous | −30°, +30° |
| Split comp. | 150°, 210° |
| Tetradic | 90°, 180°, 270° |

Plus `shadeRamp` — a nine-step tint/shade ramp at the current hue, for building
a palette from one colour.

**Swatches.** A default palette of twelve (including `transparent`), with any
`inputOptions.presets` shown above them.

### `color-utils.ts`

Dependency-free colour maths, usable outside the picker:

`parseColor` · `rgbaToHsva` · `hsvaToRgba` · `rgbaToHsl` · `rgbaToHex` ·
`formatColor` · `detectFormat` · `luminance` · `contrastRatio` · `isDarkColor` ·
`harmonyColors` · `shadeRamp` · `isTransparentKeyword`

`parseColor` accepts hex (3/6/8 digit), `rgb()`, `rgba()` and the `transparent`
keyword, returning `null` for anything it cannot read — which is what lets the
widget fall back to the free-text input instead of destroying the value.

`contrastRatio` and `isDarkColor` back the automatic swatch foreground, so the
check mark on a selected swatch stays legible on both light and dark colours.

---

## The slider

`slider-input.tsx` — a numeric slider with a live value readout, an optional
unit suffix, and `min`/`max`/`step` from `inputOptions`. Preferable to a bare
number box for bounded continuous values (opacity, blur radius, angle) where the
useful range is known and dragging beats typing.

---

## Files

- `components/editor/presets/dataTypes/types.ts` — `paramMetaTypes`,
  `paramInputTypes`, `ColorInputOptions`, `SliderInputOptions`
- `components/editor/presets/form/schema-form.tsx` — widget dispatch and the
  name-based heuristics
- `components/editor/presets/form/inputs/color-input.tsx`
- `components/editor/presets/form/inputs/color-utils.ts`
- `components/editor/presets/form/inputs/use-eyedropper.ts`
- `components/editor/presets/form/inputs/slider-input.tsx`
