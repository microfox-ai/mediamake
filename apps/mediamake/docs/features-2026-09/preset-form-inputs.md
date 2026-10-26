# Preset Form Inputs

How a preset author picks the editor widget for a setting, and what the colour
picker and slider do.

---

## Picking a widget

The schema form draws one widget per field. That choice used to be made purely
by guessing from the field name. A preset author can now ask for one directly
using zod metadata:

```ts
z.string().meta({
  [paramMetaTypes.inputType]: paramInputTypes.color,
  [paramMetaTypes.inputOptions]: { allowAlpha: false, presets: ['#fff', '#000'] },
})
```

### `paramInputTypes`

| Value | Widget |
|---|---|
| `color` | Full colour picker — colour square, hue and alpha sliders, eyedropper, harmony, swatches. |
| `slider` | A slider with the value shown next to it, instead of a plain number box. |
| `textarea` | A multi-line text box. |
| `text` | A single-line text box. Use this to opt **out** of a name-based guess. |

Adding a new one means adding a case to the schema-form renderer.

### `inputOptions`

```ts
interface ColorInputOptions {
  allowAlpha?: boolean;      // show the alpha slider, write rgba()/8-digit hex. Default true.
  presets?: string[];        // extra swatches shown above the built-in ones
  format?: 'hex' | 'rgb' | 'hsl';  // what to write back; defaults to whatever the value already uses
}

interface SliderInputOptions {
  min?: number;
  max?: number;
  step?: number;
  unit?: string;             // shown next to the value, e.g. "px" or "%"
}
```

---

## Guessing colour fields from the name

An explicit `inputType` always wins. Without one, string fields are still
guessed, so the many existing colour settings get a picker without anyone having
to go back and label them.

The matching works on **whole words, not substrings**. That is the important
part. A simple `key.includes('color')` gets `colorMode` wrong.

The field name is split on camelCase and on `-`, `_` and `.`
(`burnGlowColor` becomes `[burn, glow, color]`). Then:

- **`COLOR_WORDS`** — `color`, `colors`, `colour`, `colours`. These mean a colour
  anywhere in the name.
- **`COLOR_TAIL_WORDS`** — `fill`, `stroke`, `tint`, `shade`, `hue`, `swatch`,
  `background`, `accent`, `primary`, `secondary`, `foreground`. These only count
  when the word is the whole name or the last word. So `fill` is a colour but
  `fillMode` is not. `background` is a colour but `backgroundImage` is a URL.
- **`NON_COLOR_TAIL_WORDS`** — `mode`, `type`, `style`, `space`, `scheme`,
  `format`, `blend`, `count`, `index`, `name`, `key`, `id`, `class`, `variant`.
  These turn a colour word into a setting *about* colour.

Enums are always left as dropdowns. A fixed list of choices is not a free
colour.

The result: `artistColor` and `burn_glow_color` get pickers. `colorMode`,
`borderRadius` and `backgroundImage` do not.

---

## The colour picker

`components/editor/presets/form/inputs/color-input.tsx`

A swatch button opens the picker. Next to it there is a **plain text box**, and
that is deliberate. Preset values are not always real colours — CSS variables,
`currentColor` and gradients all need to stay editable, and a picker-only field
would make them impossible to reach.

**The picker itself**
- A colour square with hue and alpha sliders.
- A checkerboard behind see-through values.
- The format follows `inputOptions.format`, or `detectFormat(value)` if there is
  none. So editing an `hsl()` value writes `hsl()` back instead of quietly
  turning the preset into hex.

**Eyedropper.** `use-eyedropper.ts` wraps the browser's own `window.EyeDropper`,
which can pick any pixel on screen — including video the canvas is not allowed
to read. It only exists in Chromium browsers (Chrome, Edge, Brave, Electron).
Elsewhere the hook reports `isSupported: false` and the button is hidden rather
than throwing an error.

**Harmony.** Makes related colours from the current one:

| Name | Hue shift |
|---|---|
| Complementary | 180° |
| Triadic | 120°, 240° |
| Analogous | −30°, +30° |
| Split comp. | 150°, 210° |
| Tetradic | 90°, 180°, 270° |

There is also `shadeRamp`, which gives nine lighter-to-darker versions of the
current hue for building a palette from one colour.

**Swatches.** Twelve built-in colours (including `transparent`), with anything
from `inputOptions.presets` shown above them.

### `color-utils.ts`

Colour maths with no dependencies, usable outside the picker:

`parseColor` · `rgbaToHsva` · `hsvaToRgba` · `rgbaToHsl` · `rgbaToHex` ·
`formatColor` · `detectFormat` · `luminance` · `contrastRatio` · `isDarkColor` ·
`harmonyColors` · `shadeRamp` · `isTransparentKeyword`

`parseColor` handles hex (3, 6 or 8 digits), `rgb()`, `rgba()` and the
`transparent` keyword. It returns `null` for anything it cannot read, which is
what lets the widget fall back to the text box instead of destroying the value.

`contrastRatio` and `isDarkColor` decide the swatch tick colour, so the tick on
a selected swatch stays readable on both light and dark colours.

---

## The slider

`slider-input.tsx` — a slider with the value shown live, an optional unit, and
`min` / `max` / `step` from `inputOptions`.

Better than a number box for values with a known range where dragging beats
typing: opacity, blur radius, angle.

---

## Files

- `components/editor/presets/dataTypes/types.ts` — `paramMetaTypes`,
  `paramInputTypes`, `ColorInputOptions`, `SliderInputOptions`
- `components/editor/presets/form/schema-form.tsx` — picking the widget and the
  name-based guessing
- `components/editor/presets/form/inputs/color-input.tsx`
- `components/editor/presets/form/inputs/color-utils.ts`
- `components/editor/presets/form/inputs/use-eyedropper.ts`
- `components/editor/presets/form/inputs/slider-input.tsx`
