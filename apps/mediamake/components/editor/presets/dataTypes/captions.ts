import { z } from 'zod';
import {
  DataTypeDefinition,
  paramInputTypes,
  paramMetaTypes,
} from './types';

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

/**
 * Known caption.metadata fields. Unknown keys are allowed via .passthrough().
 * Fields tagged with `paramMetaTypes.tiptap` render the TipTap HTML editor
 * in the Smart metadata UI (and SchemaForm).
 */
export const captionMetadataSchema = z
  .object({
    htmlText: z
      .string()
      .optional()
      .describe(
        'HTML caption text: <b> for highlights, <br/> for line breaks',
      )
      .meta({
        [paramMetaTypes.tiptap]: true,
        [paramMetaTypes.inputType]: paramInputTypes.tiptap,
        [paramMetaTypes.inputOptions]: {
          lines: 5,
          seedFromCaption: true,
        },
      }),
    keyword: z.string().optional(),
    splitParts: z.array(z.string()).optional(),
    keywordFeel: z.string().optional(),
    strength: z.number().optional(),
    confidence: z.number().optional(),
    impact: z.number().optional(),
    sentiment: z.string().optional(),
    emotion: z.string().optional(),
  })
  .passthrough();

/** Field-key → Zod .meta() map for Smart metadata editors. */
export const captionMetadataFieldMeta: Record<
  string,
  Record<string, unknown>
> = {
  htmlText: {
    [paramMetaTypes.tiptap]: true,
    [paramMetaTypes.inputType]: paramInputTypes.tiptap,
    [paramMetaTypes.inputOptions]: {
      lines: 5,
      seedFromCaption: true,
    },
  },
};

export const captionSchema = z.object({
  id: z.string(),
  text: z.string(),
  absoluteStart: z.number(),
  absoluteEnd: z.number(),
  start: z.number(),
  end: z.number(),
  duration: z.number(),
  words: z.array(captionWordSchema),
  metadata: captionMetadataSchema.optional(),
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
