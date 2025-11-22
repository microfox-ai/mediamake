import { AiRouter } from '@microfox/ai-router';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { PresetGeneratorOutputSchema, RagSearchResultSchema } from './helpers/schema';
import { ArchitectOutputSchema } from './architect.agent';
import { readGuide, readTypesFile } from './helpers/guides';

const aiRouter = new AiRouter();

export const coderAgent = aiRouter
  .agent('/', async (ctx) => {
    const { prompt, plan, ragResults, feedback } = ctx.request.params as {
      prompt: string;
      plan: any;
      ragResults: any[];
      feedback?: string[];
    };

    // Load Guides
    const basicsGuide = await readGuide('BASICS.md');
    const typographyGuide = await readGuide('TYPOGRAPHY.md');
    const singlePresetGuide = await readGuide('GENERATION_SINGLE_PRESET.md');
    const patternsGuide = await readGuide('GENERATION_PATTERNS.md');
    const typesFile = await readTypesFile(1000);

    ctx.response.writeMessageMetadata({
      loader: 'Coding preset...',
    });

    const context = ragResults
      .map(
        r => `
      // Ref: ${r.metadata.title}
      ${r.code.slice(0, 800)}...
    `
      )
      .join('\n\n');

    const feedbackPrompt = feedback && feedback.length > 0 
        ? `\n**PREVIOUS ERRORS (MUST FIX)**:\n${feedback.join('\n')}` 
        : '';

    const result = await generateObject({
      model: anthropic('claude-sonnet-4-5'),
      schema: PresetGeneratorOutputSchema,
      prompt: `
        You are the **Senior Developer**. Write the production-ready TypeScript code for this preset.

        **USER REQUEST**: "${prompt}"

        **APPROVED PLAN**:
        ${JSON.stringify(plan, null, 2)}

        ${feedbackPrompt}

        **CODING RULES (HARD CONSTRAINTS)**:
        1.  **Single preset per file** (see GENERATION_SINGLE_PRESET.md):
            - Exactly ONE preset metadata object, ONE execution function, and ONE exported preset object.
            - Even if the idea is a "pack" or "bundle", express it as ONE preset that orchestrates everything.
        2.  **File Structure**:
            - TOP COMMENT: Start with JSDoc comment (/**...*/) describing the preset, features, use cases.
            - IMPORTS: Then import statements.
            - PARAMS SCHEMA: Define 'presetParams' with Zod.
              - Every parameter field (including nested objects where relevant) MUST have a '.describe(\"...\")' string that briefly and accurately explains what that field controls.
            - EXECUTION: Implement 'presetExecution' function.
            - METADATA: Define 'presetMetadata' (include 'defaultInputParams', 'dependencies').
            - EXPORTS: Export as '{presetId}Preset' object (id + "Preset"), with:
              - metadata: presetMetadata
              - presetFunction: presetExecution.toString()
              - presetParams: z.toJSONSchema(presetParams)
        3.  **Imports & Types**: 
            - Use strictly '@microfox/remotion', '../../types' (you may import any exported type, e.g. PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence, TranscriptionWord) and local helpers. 
            - You may also import 'RenderableComponentData' from '@microfox/remotion' and, when helpful for typing, cast the final childrenData as '[rootContainer] as RenderableComponentData[]' (see 'parallax-depth-image.ts' pattern).
            - NO 'fs', 'path', or external asset URLs. 
            - The second argument of 'presetExecution' should be typed as 'PresetPassedProps' from '../../types'.
        4.  **Component IDs**: Use unique, descriptive IDs. NEVER use generic 'root' - use '{presetId}-container' or similar.
        5.  **Dependencies & Effects**:
            - If PLAN lists dependencies, add to 'presetMetadata.dependencies.presets'.
            - Call via 'const result = await presets[subPresetId](params, props);'
            - Extract effects via '_extractedEffects' or nested 'childrenData[0].effects[0]' as needed.
            - Effects attached directly to components must be full effect nodes shaped like BaseEffect: '{ id, componentId, data: { type, start, duration, mode, targetIds, ranges } }', not just the inner data object.
            - Do NOT redefine other presets' code inside this file.
        6.  **Style**: Prefer Tailwind 'className'. Use inline 'style' only for dynamic/calculated values that Tailwind cannot express.
        7.  **Zod record**: When using Zod's record type, prefer 'z.record(z.string(), z.any())' instead of 'z.record(z.any())'.
        8.  **Advanced patterns**: For analytics/debug overlays, accessibility modes, packs, or platform presets, follow GENERATION_PATTERNS.md rather than inventing new patterns.

        **REFERENCE CODE**:
        ${context}

        **GUIDES (CORE)**:
        ${basicsGuide}
        ${typographyGuide}

        **GUIDES (GENERATION)**:
        ${singlePresetGuide}
        ${patternsGuide}

        **TYPES FROM "../../types.ts" (REFERENCE ONLY, DO NOT REDEFINE):**
        ${typesFile}

        Generate the full file content.
      `,
    });

    return result.object;
  })
  .actAsTool('/', {
    id: 'coder',
    name: 'Coder',
    description: 'Generates the TypeScript code for the preset, including dependencies.',
    inputSchema: z.object({
      prompt: z.string(),
      plan: ArchitectOutputSchema,
      ragResults: z.array(RagSearchResultSchema),
      feedback: z.array(z.string()).optional(),
    }),
    outputSchema: PresetGeneratorOutputSchema,
    metadata: { title: 'Coder', icon: 'code' },
  });
