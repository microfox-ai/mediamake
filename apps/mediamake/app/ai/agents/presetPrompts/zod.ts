import { z } from 'zod/v4';

// Preset style enum
export const PresetStyleEnum = z.enum([
  'typokinteicslayout',
  'wordanimationeffect',
  'sentenceanimationeffect',
  'audiowaveformbasedEditing',
  'transitionEffects',
  'svgMaskingEffects',
  'svgTransitionEffects',
]);

// Input schema for preset prompt generation
export const PresetPromptInputSchema = z.object({
  userDescription: z
    .string()
    .describe('Simple user description of what they want'),
  presetStyle: PresetStyleEnum.describe(
    'The style/category of preset to generate',
  ),
  suffixPrompt: z
    .string()
    .optional()
    .describe('Additional prompt to add to the end of the generated prompt'),
  promptsCount: z
    .number()
    .optional()
    .describe('Number of variations to generate'),
});
export type PresetPromptInputType = z.infer<typeof PresetPromptInputSchema>;

// Single prompt item schema
export const PresetPromptItemSchema = z.object({
  prompt: z
    .string()
    .describe(
      'Detailed prompt for development AI to create the preset component',
    ),
  technicalSpecs: z
    .string()
    .optional()
    .describe('Technical specifications for implementation'),
});

// Output schema for generated prompts (array of variations)
export const PresetPromptOutputSchema = z.object({
  prompts: z
    .array(PresetPromptItemSchema)
    .describe(
      'Array of unique prompt variations for development AI to create preset components',
    ),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    reasoningTokens: z.number().optional(),
    cachedInputTokens: z.number().optional(),
    totalTokens: z.number(),
  }),
});

// Type exports
export type PresetStyle = z.infer<typeof PresetStyleEnum>;
export type PresetPromptInput = z.infer<typeof PresetPromptInputSchema>;
export type PresetPromptOutput = z.infer<typeof PresetPromptOutputSchema>;
