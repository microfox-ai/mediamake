/**
 * Field annotations read by the editor preset form.
 * A field with none of these falls back to a plain control for its JSON type.
 */

export const paramMetaTypes = {
  /** Marks a field as data-referrable (accepts data:[key] references). Value: the DataReferenceType string. */
  referrableDataType: 'referrableDataType',
  /**
   * Marks a field as a range field — the field value IS a rangeString (e.g. "data:[captions][0:00-2:00]").
   * The range portion is what gets visually edited in the bottom timeline.
   * Value: true
   */
  rangeField: 'rangeField',
  /**
   * How extra segments of a range are stored.
   * - `"comma"`: one string, segments joined by comma (`00:00-00:05,00:10-00:15`).
   * - `"array"`: each segment is its own array item. Splitting clones the item
   *   instead of appending a comma segment to the same string.
   * Omit to infer from the current value (comma if the string contains `,`).
   *
   * @example z.string().meta({
   *   [paramMetaTypes.rangeField]: true,
   *   [paramMetaTypes.rangeLayout]: 'array',
   * })
   */
  rangeLayout: 'rangeLayout',
  /**
   * Marks an object or array that contains a range field somewhere inside it (nested path).
   * Value: the dot-bracket path to the range field within the object/array, e.g. "captions" or "items[].ref".
   * Use "[]" to indicate the items themselves are range fields.
   */
  nestedRangeField: 'nestedRangeField',
  /**
   * Marks a string field as this preset's track identity.
   * Values from these fields are collected to populate `linkTrackName` dropdowns.
   * Value: true
   */
  trackName: 'trackName',
  /**
   * Marks a string field that links/fits to another track by name.
   * Renders a searchable dropdown of existing trackNames (plus free-text entry).
   * Value: true
   */
  linkTrackName: 'linkTrackName',
  /**
   * Marks a string field that locks start and duration to a sibling or parent.
   * Renders a dropdown of those track names.
   * Value: true
   */
  lockTarget: 'lockTarget',
  /**
   * Marks the parent this preset inserts into.
   * Renders a dropdown of track names, always including BaseScene.
   * Value: true
   */
  attachTarget: 'attachTarget',
  /**
   * Marks an object with optional left/right/top/bottom numeric insets.
   * Renders a Figma-style 4-block insets editor. Missing keys stay undefined
   * (distinct from 0). Value: true
   */
  containerObject: 'containerObject',
  /**
   * Object of colour strings. Renders one labelled colour picker per row.
   * Value: true
   */
  colorRows: 'colorRows',
  /**
   * Object rendered as a flat stack of fields, without a collapsible wrapper.
   * Value: true
   */
  flatObject: 'flatObject',
  /**
   * Marks a CSS `style` object that accepts typography properties.
   * Renders a Typography section (font, weight, size, line height, letter
   * spacing, alignment, decoration, case, lists, truncation, wrapping) that
   * writes plain CSS properties into the object. Other declared keys still
   * render below it. Also shows the Special Effects section. Value: true
   *
   * @example z.object({ color: z.string() }).loose().meta({ [paramMetaTypes.textStyle]: true })
   */
  textStyle: 'textStyle',
  /**
   * Marks a CSS `style` object that accepts positioning properties.
   * Renders a Position section (absolute insets, or relative size and anchor,
   * plus rotation, flips, and scale) that writes plain CSS into the object.
   * Value: true
   */
  positionStyle: 'positionStyle',
  /**
   * Marks a CSS `style` object that accepts block / layout properties.
   * Renders a Block section (placement plus child alignment and clip)
   * that writes plain CSS into the object. Also shows the Special Effects
   * section. Components that extend a schema with this flag keep it. Value: true
   */
  blockStyle: 'blockStyle',
  /**
   * Marks a CSS `style` object that accepts image look properties.
   * Renders an Image section (thumbnail + popup for src, fit, filter,
   * blend, opacity, tint) that writes those into the object / sibling src.
   * Value: true
   */
  imageStyle: 'imageStyle',
  /**
   * Marks a CSS `style` object that accepts video look properties.
   * Renders a Video section (thumbnail + the same media popup as Image:
   * src, fit, filter, blend, opacity, tint). Value: true
   */
  videoStyle: 'videoStyle',
  /**
   * Marks a field that accepts audio media.
   * Renders an Audio section (thumbnail + the same media popup as Image,
   * choosing the source). Value: true
   */
  audioStyle: 'audioStyle',
  /**
   * Sibling fields that share this id are rendered together on one row.
   * Value: group id string
   */
  layoutGroup: 'layoutGroup',
  /**
   * Marks an array of image objects. Renders Images / Form tabs:
   * - Images: thumbnail grid + per-image popup editor + group edit for shared props
   * - Form: standard array form
   * Value: true
   */
  imagesGroup: 'imagesGroup',
  /**
   * Marks an array of media items (image / video / audio).
   * Renders Medias / Form tabs similar to imagesGroup, with kind-aware editors.
   * Value: true
   */
  mediasGroup: 'mediasGroup',
  /**
   * Marks an array of plain shake effect objects.
   * Renders Smart / Full tabs on the label row:
   * - Smart: effects active at the current player frame
   * - Full: compact list of all shake effects
   * Value: true
   */
  shakeEffectsGroup: 'shakeEffectsGroup',
  /**
   * Marks an array of motion effects (pan / zoom / generic).
   * Same Smart / Full / JSON layout as shakeEffectsGroup.
   * Value: true
   */
  effectsGroup: 'effectsGroup',
  /**
   * Marks per-image transition effects (in / out windows).
   * Same Smart / Full / JSON layout as shakeEffectsGroup, rendered in the image popup.
   * Value: true
   */
  transitionEffectsGroup: 'transitionEffectsGroup',
  /**
   * Nested field edit scope inside an imagesGroup (or similar) item schema.
   * Value: true = can be bulk-edited across items; false = per-item only.
   *
   * @example z.string().meta({ [paramMetaTypes.groupEditable]: false }) // rangeString
   * @example z.enum([...]).meta({ [paramMetaTypes.groupEditable]: true }) // fit
   */
  groupEditable: 'groupEditable',
  /**
   * Forces a specific editor widget for this field, overriding the name-based
   * heuristics. Value: one of `paramInputTypes`.
   *
   * @example z.string().meta({ [paramMetaTypes.inputType]: paramInputTypes.color })
   */
  inputType: 'inputType',
  /**
   * Widget configuration for the chosen `inputType`. Value: a plain object whose
   * shape depends on the widget — see `ColorInputOptions` / `SliderInputOptions`.
   *
   * @example z.string().meta({
   *   [paramMetaTypes.inputType]: paramInputTypes.color,
   *   [paramMetaTypes.inputOptions]: { allowAlpha: false, presets: ["#fff", "#000"] },
   * })
   */
  inputOptions: 'inputOptions',
  /**
   * Marks a string field that should render the TipTap HTML editor
   * (bold = highlight, hard break = line split). Value: true.
   * Equivalent to `{ [paramMetaTypes.inputType]: paramInputTypes.tiptap }`.
   *
   * @example z.string().meta({ [paramMetaTypes.tiptap]: true })
   */
  tiptap: 'tiptap',
} as const;

export type ParamMetaType =
  (typeof paramMetaTypes)[keyof typeof paramMetaTypes];

/**
 * Editor widgets a preset author can request via `paramMetaTypes.inputType`.
 * Adding a new one means adding a case to the schema-form renderer.
 */
export const paramInputTypes = {
  /** Full colour picker: SV plane, hue/alpha sliders, eyedropper, harmony, swatches. */
  color: 'color',
  /** Numeric slider with a live value readout instead of a bare number box. */
  slider: 'slider',
  /** Multi-line text area. */
  textarea: 'textarea',
  /** Single-line text box — use to opt *out* of a name-based heuristic. */
  text: 'text',
  /**
   * TipTap HTML editor for caption-style markup
   * (`<b>` highlights, `<br/>` line splits).
   */
  tiptap: 'tiptap',
} as const;

export type ParamInputType =
  (typeof paramInputTypes)[keyof typeof paramInputTypes];
