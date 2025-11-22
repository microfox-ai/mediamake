import { z } from 'zod';

// Input schema for the main Preset Generator Agent
export const PresetGeneratorInputSchema = z.object({
  prompt: z.string().describe('The user request describing the desired preset.'),
  metadata: z.record(z.string(), z.any()).optional().describe('Optional metadata like captions, media info, etc.'),
  clientId: z.string().optional().describe('Client ID for private presets.'),
  action: z.enum(['generate', 'index']).optional().default('generate').describe('Explicit action to perform: generate (default) or index.'),
});

export type PresetGeneratorInput = z.infer<typeof PresetGeneratorInputSchema>;

// Output schema for the main Preset Generator Agent
export const PresetGeneratorOutputSchema = z.object({
  code: z.string().describe('The complete TypeScript code for the generated preset OR a status message for indexing.'),
  metadata: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
  }).describe('Metadata of the generated preset or task.'),
});

export type PresetGeneratorOutput = z.infer<typeof PresetGeneratorOutputSchema>;

// Schema for RAG Search Results
export const RagSearchResultSchema = z.object({
  code: z.string(),
  metadata: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).optional(),
    type: z.string().optional(),
    internalPreset: z.boolean().optional(),
  }),
  score: z.number().optional(),
});

export type RagSearchResult = z.infer<typeof RagSearchResultSchema>;

// Schema for Planner Output
export const PlannerOutputSchema = z.object({
  rootType: z.enum(['layout', 'scene']).describe('The root container type.'),
  atoms: z.array(z.string()).describe('List of Atom components needed (e.g., TextAtom, VideoAtom).'),
  dependencies: z.array(z.string()).describe('List of internal presets or effects to import.'),
  timingStrategy: z.enum(['relative', 'absolute']).describe('Timing strategy to use.'),
  structure: z.string().describe('High-level description of the preset structure.'),
  metadata: z.object({
    version: z.string().default('1.0.0'),
    idProposal: z.string().optional(),
  }),
});

export type PlannerOutput = z.infer<typeof PlannerOutputSchema>;
