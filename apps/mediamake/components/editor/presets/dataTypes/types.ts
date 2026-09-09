import { z } from "zod";

export type DataReferenceType =
  | "media"
  | "medias"
  | "captions"
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "objects";

export const paramMetaTypes = {
  /** Marks a field as data-referrable (accepts data:[key] references). Value: the DataReferenceType string. */
  referrableDataType: "referrableDataType",
  /**
   * Marks a field as a range field — the field value IS a rangeString (e.g. "data:[captions][0:00-2:00]").
   * The range portion is what gets visually edited in the bottom timeline.
   * Value: true
   */
  rangeField: "rangeField",
  /**
   * Marks an object or array that contains a range field somewhere inside it (nested path).
   * Value: the dot-bracket path to the range field within the object/array, e.g. "captions" or "items[].ref".
   * Use "[]" to indicate the items themselves are range fields.
   */
  nestedRangeField: "nestedRangeField",
  /**
   * Marks a string field as this preset's track identity.
   * Values from these fields are collected to populate `linkTrackName` dropdowns.
   * Value: true
   */
  trackName: "trackName",
  /**
   * Marks a string field that links/fits to another track by name.
   * Renders a searchable dropdown of existing trackNames (plus free-text entry).
   * Value: true
   */
  linkTrackName: "linkTrackName",
  /**
   * Marks an object with optional left/right/top/bottom numeric insets.
   * Renders a Figma-style 4-block insets editor. Missing keys stay undefined
   * (distinct from 0). Value: true
   */
  containerObject: "containerObject",
  /**
   * Marks an array of image objects. Renders Images / Form tabs:
   * - Images: thumbnail grid + per-image popup editor + group edit for shared props
   * - Form: standard array form
   * Value: true
   */
  imagesGroup: "imagesGroup",
  /**
   * Marks an array of media items (image / video / audio).
   * Renders Medias / Form tabs similar to imagesGroup, with kind-aware editors.
   * Value: true
   */
  mediasGroup: "mediasGroup",
  /**
   * Marks an array of plain shake effect objects.
   * Renders Smart / Full tabs on the label row:
   * - Smart: effects active at the current player frame
   * - Full: compact list of all shake effects
   * Value: true
   */
  shakeEffectsGroup: "shakeEffectsGroup",
  /**
   * Nested field edit scope inside an imagesGroup (or similar) item schema.
   * Value: true = can be bulk-edited across items; false = per-item only.
   *
   * @example z.string().meta({ [paramMetaTypes.groupEditable]: false }) // rangeString
   * @example z.enum([...]).meta({ [paramMetaTypes.groupEditable]: true }) // fit
   */
  groupEditable: "groupEditable",
  /**
   * Forces a specific editor widget for this field, overriding the name-based
   * heuristics. Value: one of `paramInputTypes`.
   *
   * @example z.string().meta({ [paramMetaTypes.inputType]: paramInputTypes.color })
   */
  inputType: "inputType",
  /**
   * Widget configuration for the chosen `inputType`. Value: a plain object whose
   * shape depends on the widget — see `ColorInputOptions` / `SliderInputOptions`.
   *
   * @example z.string().meta({
   *   [paramMetaTypes.inputType]: paramInputTypes.color,
   *   [paramMetaTypes.inputOptions]: { allowAlpha: false, presets: ["#fff", "#000"] },
   * })
   */
  inputOptions: "inputOptions",
} as const;

export type ParamMetaType = (typeof paramMetaTypes)[keyof typeof paramMetaTypes];

/**
 * Editor widgets a preset author can request via `paramMetaTypes.inputType`.
 * Adding a new one means adding a case to the schema-form renderer.
 */
export const paramInputTypes = {
  /** Full colour picker: SV plane, hue/alpha sliders, eyedropper, harmony, swatches. */
  color: "color",
  /** Numeric slider with a live value readout instead of a bare number box. */
  slider: "slider",
  /** Multi-line text area. */
  textarea: "textarea",
  /** Single-line text box — use to opt *out* of a name-based heuristic. */
  text: "text",
} as const;

export type ParamInputType = (typeof paramInputTypes)[keyof typeof paramInputTypes];

/** Config accepted by `inputOptions` when `inputType` is `color`. */
export interface ColorInputOptions {
  /** Show the alpha slider and emit rgba()/8-digit hex. Default true. */
  allowAlpha?: boolean;
  /** Extra swatches shown above the built-in palette. */
  presets?: string[];
  /** Notation to write back. Defaults to whatever the current value uses. */
  format?: "hex" | "rgb" | "hsl";
}

/** Config accepted by `inputOptions` when `inputType` is `slider`. */
export interface SliderInputOptions {
  min?: number;
  max?: number;
  step?: number;
  /** Suffix shown next to the readout, e.g. "px" or "%". */
  unit?: string;
}

export interface DataTypeDefinition {
  id: string;
  title: string;
  description?: string;
  referenceType: DataReferenceType;
  defaultValue: unknown;
  schema: z.ZodTypeAny;
}

