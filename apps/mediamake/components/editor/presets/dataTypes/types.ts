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
} as const;

export type ParamMetaType = (typeof paramMetaTypes)[keyof typeof paramMetaTypes];

export interface DataTypeDefinition {
  id: string;
  title: string;
  description?: string;
  referenceType: DataReferenceType;
  defaultValue: unknown;
  schema: z.ZodTypeAny;
}

