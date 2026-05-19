import { z } from "zod";
import { DataTypeDefinition } from "./types";

export const stringDataType: DataTypeDefinition = {
  id: "string",
  title: "String",
  description: "Single string value.",
  referenceType: "string",
  defaultValue: "",
  schema: z.string(),
};

export const numberDataType: DataTypeDefinition = {
  id: "number",
  title: "Number",
  description: "Single numeric value.",
  referenceType: "number",
  defaultValue: 0,
  schema: z.number(),
};

export const booleanDataType: DataTypeDefinition = {
  id: "boolean",
  title: "Boolean",
  description: "True/false value.",
  referenceType: "boolean",
  defaultValue: false,
  schema: z.boolean(),
};

export const objectDataType: DataTypeDefinition = {
  id: "object",
  title: "Object",
  description: "Generic object value.",
  referenceType: "object",
  defaultValue: {},
  schema: z.object({}),
};

export const objectsDataType: DataTypeDefinition = {
  id: "objects",
  title: "Objects (Array)",
  description: "Array of generic objects.",
  referenceType: "objects",
  defaultValue: [],
  schema: z.array(z.unknown()),
};

export const mediaDataType: DataTypeDefinition = {
  id: "media",
  title: "Media",
  description: "Single media object reference.",
  referenceType: "media",
  defaultValue: {},
  schema: z.object({}),
};

export const mediasDataType: DataTypeDefinition = {
  id: "medias",
  title: "Medias (Array)",
  description: "Array of media object references.",
  referenceType: "medias",
  defaultValue: [],
  schema: z.array(z.unknown()),
};

