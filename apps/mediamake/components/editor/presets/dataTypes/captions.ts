import { z } from 'zod';
import { DataTypeDefinition } from './types';

export const captionWordSchema = z.object({
  id: z.string(),
  text: z.string(),
  start: z.number(),
  absoluteStart: z.number(),
  absoluteEnd: z.number(),
  end: z.number(),
  confidence: z.number(),
  duration: z.number(),
});

export const captionSchema = z.object({
  id: z.string(),
  text: z.string(),
  absoluteStart: z.number(),
  absoluteEnd: z.number(),
  start: z.number(),
  end: z.number(),
  duration: z.number(),
  words: z.array(captionWordSchema),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const captionsDataTypeSchema = z.object({
  _id: z.string().optional(),
  captions: z.array(captionSchema),
});

export const captionsDataType: DataTypeDefinition = {
  id: 'captions',
  title: 'Captions',
  description:
    'Timeline transcription object with an optional _id and captions array.',
  referenceType: 'captions',
  defaultValue: { _id: '', captions: [] },
  schema: captionsDataTypeSchema,
};
