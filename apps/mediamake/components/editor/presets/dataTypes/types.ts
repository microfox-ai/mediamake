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
  referrableDataType: "referrableDataType",
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

