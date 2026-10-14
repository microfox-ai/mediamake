import {
  paramInputTypes,
  paramMetaTypes,
  type ParamInputType,
  type ParamMetaType,
} from '@microfox/remotion/param-meta';
import { z } from 'zod';

export { paramInputTypes, paramMetaTypes };
export type { ParamInputType, ParamMetaType };

export type DataReferenceType =
  | 'media'
  | 'medias'
  | 'captions'
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'objects';

/** Config accepted by `inputOptions` when `inputType` is `color`. */
export interface ColorInputOptions {
  /** Show the alpha slider and emit rgba()/8-digit hex. Default true. */
  allowAlpha?: boolean;
  /** Extra swatches shown above the built-in palette. */
  presets?: string[];
  /** Notation to write back. Defaults to whatever the current value uses. */
  format?: 'hex' | 'rgb' | 'hsl';
}

/** Config accepted by `inputOptions` when `inputType` is `slider`. */
export interface SliderInputOptions {
  min?: number;
  max?: number;
  step?: number;
  /** Suffix shown next to the readout, e.g. "px" or "%". */
  unit?: string;
}

/** Config accepted by `inputOptions` when `inputType` is `tiptap` / `tiptap` meta. */
export interface TiptapInputOptions {
  /** Visible editor lines (default 5). */
  lines?: number;
  /** Seed empty value from caption plain text + legacy keyword/splitParts. */
  seedFromCaption?: boolean;
}

/** True when field meta requests the TipTap HTML editor. */
export function isTiptapFieldMeta(
  meta?: Record<string, unknown> | null,
): boolean {
  if (!meta) return false;
  if (meta[paramMetaTypes.tiptap] === true) return true;
  return meta[paramMetaTypes.inputType] === paramInputTypes.tiptap;
}

export interface DataTypeDefinition {
  id: string;
  title: string;
  description?: string;
  referenceType: DataReferenceType;
  defaultValue: unknown;
  schema: z.ZodTypeAny;
}
