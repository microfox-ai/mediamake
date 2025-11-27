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

    // Load CRITICAL "0_" Guides (ALWAYS IN CONTEXT - FOUNDATIONAL RULES)
    const negativesGuide = await readGuide('0_NEGATIVES.md');
    const basicsGuide = await readGuide('0_BASICS.md');
    const layoutGuide = await readGuide('0_LAYOUT.md');
    const atomsGuide = await readGuide('0_ATOMS.md');
    
    // Load Generation Guides
    const singlePresetGuide = await readGuide('GENERATION_SINGLE_PRESET.md');
    const patternsGuide = await readGuide('GENERATION_PATTERNS.md');
    const timingGuide = await readGuide('GENERATION_TIMING.md');
    
    // Load conditional guides based on plan/prompt needs
    const needsTransitions = prompt.toLowerCase().includes('transition') || 
                            plan.structure?.some((s: any) => s.type?.includes('transition')) ||
                            JSON.stringify(plan).toLowerCase().includes('transition');
    
    const needsTypography = prompt.toLowerCase().includes('caption') || 
                           prompt.toLowerCase().includes('text') || 
                           prompt.toLowerCase().includes('typography') ||
                           plan.structure?.some((s: any) => s.type === 'TextAtom' || s.componentId === 'TextAtom');
    
    const needsEffects = prompt.toLowerCase().includes('effect') || 
                        prompt.toLowerCase().includes('animation') ||
                        prompt.toLowerCase().includes('fade') ||
                        prompt.toLowerCase().includes('zoom') ||
                        JSON.stringify(plan).toLowerCase().includes('effect');
    
    const needsAudioData = prompt.toLowerCase().includes('audio') || 
                          prompt.toLowerCase().includes('beat') || 
                          prompt.toLowerCase().includes('sync') ||
                          plan.structure?.some((s: any) => s.type === 'AudioAtom' || s.componentId === 'AudioAtom');
    
    const transitionsGuide = needsTransitions ? await readGuide('TRANSITIONS.md') : '';
    const typographyGuide = needsTypography ? await readGuide('TYPOGRAPHY.md') : '';
    const effectsGuide = needsEffects ? await readGuide('EFFECTS.md') : '';
    const audioDataGuide = needsAudioData ? await readGuide('AUDIO_DATA.md') : '';
    
    const typesFile = await readTypesFile(1000);

    ctx.response.writeMessageMetadata({
      loader: 'Coding preset...',
    });

    const context = ragResults
      .map(
        r => `
      // Ref: ${r.metadata.title}
      ${r.code}
      `
      // ${r.code.slice(0, 800)}...
      )
      .join('\n\n');

    const feedbackPrompt = feedback && feedback.length > 0 
        ? `\n**⚠️ CRITICAL: PREVIOUS VALIDATION ERRORS (MUST FIX) ⚠️**:\n${feedback.map((err, i) => `${i + 1}. ${err}`).join('\n')}\n\n**INSTRUCTIONS**: Carefully review each error above and fix them in your code. Pay special attention to:\n- ESLint errors: Fix formatting, unused variables, and code style issues\n- Forbidden imports: Remove any 'fs' or 'path' imports\n- Structure issues: Ensure helper functions are inside presetExecution\n- TypeScript errors: Fix type errors and syntax issues` 
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

        **⚠️⚠️⚠️ CRITICAL FOUNDATIONAL RULES - VIOLATING THESE WILL BREAK THE PRESET ⚠️⚠️⚠️**:

        **🚨🚨🚨 GENERATION_TIMING.md - CRITICAL TIMING RULES (READ COMPLETELY) 🚨🚨🚨**:
        ${timingGuide}

        **0_NEGATIVES.md - ANTI-PATTERNS (NEVER DO THESE)**:
        ${negativesGuide}
        
        Key points from NEGATIVES:
        - ❌ NEVER use CSS @keyframes
        - ❌ NEVER use dangerouslySetInnerHTML on BaseLayout
        - ❌ NEVER use CSS animation property
        - ❌ NEVER use mode: 'wrapper' for effects (creates unwanted wrapper divs)
        - ✅ ALWAYS use effects with mode: 'provider' and targetIds
        - ✅ ALWAYS use the effects system for animations

        **0_BASICS.md - CORE ARCHITECTURE**:
        ${basicsGuide}

        **0_LAYOUT.md - LAYOUT & TIMING FUNDAMENTALS**:
        ${layoutGuide}

        **0_ATOMS.md - AVAILABLE BUILDING BLOCKS**:
        ${atomsGuide}

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
            - **ALWAYS import and use RenderableComponentData from @microfox/datamotion** for typing childrenData arrays and rootContainer.
            - Import statement: import the RenderableComponentData type from @microfox/datamotion package.
            - Cast final childrenData arrays using 'as RenderableComponentData[]' pattern.
            - Cast rootContainer object using 'as RenderableComponentData' pattern.
            - This ensures proper type safety for the component tree structure.
            - NO 'fs', 'path', or external asset URLs. 
            - The second argument of 'presetExecution' should be typed as 'PresetPassedProps' from '../../types'.
        4.  **Component IDs**: Use unique, descriptive IDs. NEVER use generic 'root' - use '{presetId}-container' or similar.
        5.  **Dependencies & Effects**:
            - If PLAN lists dependencies, add to 'presetMetadata.dependencies.presets'.
            - Call via 'const result = await presets[subPresetId](params, props);'
            - Extract effects via '_extractedEffects' or nested 'childrenData[0].effects[0]' as needed.
            - Effects attached directly to components must be full effect nodes shaped like BaseEffect: '{ id, componentId, data: { type, start, duration, mode, targetIds, ranges } }', not just the inner data object.
            - Do NOT redefine other presets' code inside this file.
            - **CRITICAL**: Effect start times are RELATIVE to the parent component's timeline (see GENERATION_TIMING.md).
        6.  **Style**: Prefer Tailwind 'className'. Use inline 'style' only for dynamic/calculated values that Tailwind cannot express.
        7.  **Zod record**: When using Zod's record type, prefer 'z.record(z.string(), z.any())' instead of 'z.record(z.any())'.
        8.  **Advanced patterns**: For analytics/debug overlays, accessibility modes, packs, or platform presets, follow GENERATION_PATTERNS.md rather than inventing new patterns.
        9.  **Code Quality & ESLint**:
            - Write clean, production-ready code that passes ESLint validation.
            - Remove unused variables and imports.
            - Follow TypeScript best practices and type safety.
            - All helper functions must be defined INSIDE the presetExecution function body (not at top level).
            - Ensure proper error handling and edge cases are covered.
        10. **Effects Mode**: ALWAYS use mode: 'provider' with targetIds. NEVER use mode: 'wrapper'.

        **REFERENCE CODE**:
        ${context}

        **CONDITIONAL GUIDES (Based on Your Plan)**:
        ${transitionsGuide ? `**TRANSITIONS.md**:\n${transitionsGuide}\n\n` : ''}
        ${typographyGuide ? `**TYPOGRAPHY.md**:\n${typographyGuide}\n\n` : ''}
        ${effectsGuide ? `**EFFECTS.md**:\n${effectsGuide}\n\n` : ''}
        ${audioDataGuide ? `**AUDIO_DATA.md**:\n${audioDataGuide}\n\n` : ''}

        **GUIDES (GENERATION)**:
        ${singlePresetGuide}
        ${patternsGuide}

        **TYPES FROM "../../types.ts" (REFERENCE ONLY, DO NOT REDEFINE):**
        ${typesFile}

        **FINAL REMINDER BEFORE YOU CODE**:
        - All context.timing values are RELATIVE to parent, not absolute to video start
        - NEVER use mode: 'wrapper' - always use mode: 'provider' with targetIds
        - NEVER use dangerouslySetInnerHTML or CSS animations
        - Follow the 0_ guides strictly - they are the foundation

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
