#!/usr/bin/env tsx
/**
 * Standalone Preset Generator Script
 *
 * This script replicates the functionality of the generate.agent.ts workflow:
 * 1. RAG Search - Find relevant examples from existing presets
 * 2. Architecture - Design the component structure
 * 3. Tech Lead Review - Validate the architectural plan
 * 4. Coding + Validation Loop - Generate and validate code (up to 3 attempts)
 * 5. Save - Write validated preset to filesystem
 *
 * Usage:
 *   npm run generate-preset "Create a text fade in preset"
 *   npm run generate-preset "Create a zoom transition effect"
 *
 * Guide Files:
 *   The script reads guide files from two directories:
 *   - components/editor/presets/presetgenerationguide/ (GENERATION_*.md)
 *   - components/editor/presets/presetwritingguide/ (0_*.md foundational guides)
 */

import { generateObject, generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

interface RagSearchResult {
  code: string;
  metadata: {
    id: string;
    title: string;
    description: string;
    tags?: string[];
    type?: string;
    internalPreset?: boolean;
  };
  score?: number;
}

const ArchitectOutputSchema = z.object({
  rootContainer: z.enum(['BaseLayout']).describe('Must be BaseLayout'),
  structure: z
    .array(
      z.object({
        id: z.string(),
        type: z
          .string()
          .describe('Atom or Component type (e.g., TextAtom, VideoAtom)'),
        props: z
          .record(z.string(), z.any())
          .describe('Key props for this component'),
        children: z
          .array(z.string())
          .optional()
          .describe('IDs of children if any'),
      }),
    )
    .describe('Flat list of nodes defining the tree structure'),
  dependencies: z
    .array(z.string())
    .describe(
      'List of IDs of existing presets (sub-presets) that this preset depends on.',
    ),
  timingStrategy: z
    .string()
    .describe(
      'Explanation of how timing is handled (relative, sequence, etc.)',
    ),
  requiredAssets: z
    .array(z.string())
    .describe("List of asset types needed (e.g. 'background music', 'logo')"),
  metadata: z.object({
    title: z.string(),
    description: z.string(),
    idProposal: z.string(),
  }),
});

const TechLeadOutputSchema = z.object({
  approved: z.boolean(),
  critique: z.string().optional().describe('If rejected, explain why.'),
  suggestions: z
    .array(z.string())
    .describe(
      'Improvements for performance, style, or Remotion best practices.',
    ),
  revisedPlan: ArchitectOutputSchema.optional().describe(
    'If approved with minor changes, provide the revised plan.',
  ),
});

const PresetGeneratorOutputSchema = z.object({
  code: z
    .string()
    .describe('The complete TypeScript code for the generated preset'),
  metadata: z
    .object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
    })
    .describe('Metadata of the generated preset'),
});

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  lintOutput?: string;
  fixedCode?: string;
  wasAutoFixed?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Read a guide file from the guides directory
 * Resolution order (same as guides.ts helper):
 * 1. Look in presetgenerationguide (generation-specific docs)
 * 2. Fallback to presetwritingguide (core/foundational docs)
 */
async function readGuide(guideName: string): Promise<string> {
  const WRITING_GUIDES_PATH = path.join(
    process.cwd(),
    'components/editor/presets/presetwritingguide',
  );

  const GENERATION_GUIDES_PATH = path.join(
    process.cwd(),
    'components/editor/presets/presetgenerationguide',
  );

  // 1) Try generation guides first (GENERATION_*.md files)
  try {
    const genPath = path.join(GENERATION_GUIDES_PATH, guideName);
    const genContent = await fs.readFile(genPath, 'utf-8');
    return genContent;
  } catch {
    // Fall through to writing guides
  }

  // 2) Fallback to writing guides (0_*.md foundational files)
  try {
    const writePath = path.join(WRITING_GUIDES_PATH, guideName);
    const writeContent = await fs.readFile(writePath, 'utf-8');
    return writeContent;
  } catch (e) {
    console.warn(
      `⚠️  Guide not found: ${guideName} (checked both directories)`,
    );
    return '';
  }
}

/**
 * Read types file for reference
 */
async function readTypesFile(maxChars?: number): Promise<string> {
  try {
    const typesPath = path.join(
      process.cwd(),
      'components/editor/presets/types.ts',
    );
    const content = await fs.readFile(typesPath, 'utf-8');
    if (maxChars) {
      return content.slice(0, maxChars);
    }
    return content;
  } catch (e) {
    console.warn('⚠️  Failed to read types file:', e);
    return '';
  }
}

/**
 * Query RAG for relevant presets
 */
async function queryRagPresets(
  query: string,
  topK: number = 5,
): Promise<RagSearchResult[]> {
  try {
    // Import the RAG helper dynamically to avoid circular dependencies
    const { queryRagPresets: ragQuery } = await import(
      '../app/ai/agents/preset/helpers/rag'
    );
    const results = await ragQuery(query, undefined, topK);

    return results
      .filter(r => r.metadata)
      .map(r => ({
        code: r.data || '',
        metadata: {
          id: r.metadata!.id,
          title: r.metadata!.title,
          description: r.metadata!.description,
          tags: r.metadata!.tags,
          type: r.metadata!.type,
          internalPreset: r.metadata!.internalPreset,
        },
        score: r.score,
      }));
  } catch (error) {
    console.error('❌ RAG Search Error:', error);
    return [];
  }
}

/**
 * Save preset to file
 */
async function savePresetToFile(id: string, code: string): Promise<string> {
  try {
    const registryPath = path.join(
      process.cwd(),
      'components/editor/presets/registry/generated',
    );

    // Ensure directory exists
    await fs.mkdir(registryPath, { recursive: true });

    // Filename convention: snake-case id.ts
    const filename = `${id}.ts`;
    const filepath = path.join(registryPath, filename);

    // Write the code
    await fs.writeFile(filepath, code, 'utf-8');
    console.log(`✅ Saved preset to: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('❌ Error saving preset to file:', error);
    throw new Error(`Failed to save preset file: ${error}`);
  }
}

/**
 * Validate preset code using the validation helper
 */
async function validatePresetCode(
  code: string,
  presetId: string,
): Promise<ValidationResult> {
  try {
    // Import the validation helper dynamically
    const { validatePresetCode: validate } = await import(
      '../app/ai/agents/preset/helpers/validation'
    );
    return await validate(code, presetId);
  } catch (error) {
    console.error('❌ Validation Error:', error);
    return {
      valid: false,
      errors: [`Validation failed: ${error}`],
      warnings: [],
    };
  }
}

// ============================================================================
// MAIN WORKFLOW STEPS
// ============================================================================

/**
 * Step 1: RAG Search
 */
async function step1_ragSearch(prompt: string): Promise<RagSearchResult[]> {
  console.log('\n🔍 Step 1: RAG Search - Researching component library...');

  const ragResults = await queryRagPresets(prompt);
  console.log(`   ✓ Found ${ragResults.length} relevant presets`);

  return ragResults;
}

/**
 * Step 2: Architectural Design
 */
async function step2_architect(
  prompt: string,
  ragResults: RagSearchResult[],
): Promise<any> {
  console.log(
    '\n🏗️  Step 2: Architectural Design - Creating component structure...',
  );

  // Load guides
  const singlePresetGuide = await readGuide('GENERATION_SINGLE_PRESET.md');
  const patternsGuide = await readGuide('GENERATION_PATTERNS.md');
  const timingGuide = await readGuide('GENERATION_TIMING.md');
  const negativesGuide = await readGuide('0_NEGATIVES.md');
  const basicsGuide = await readGuide('0_BASICS.md');
  const layoutGuide = await readGuide('0_LAYOUT.md');
  const atomsGuide = await readGuide('0_ATOMS.md');

  const context = ragResults
    .map(
      r => `
    ID: ${r.metadata.id}
    Title: ${r.metadata.title}
    Description: ${r.metadata.description}
    Tags: ${r.metadata.tags?.join(', ')}
    Docs: ${r.code} 
  `,
    )
    .join('\n---\n');

  const result = await generateObject({
    model: anthropic('claude-opus-4-5'),
    schema: ArchitectOutputSchema,
    prompt: `
      You are the **System Architect** for a Remotion video generation system.
      Your goal is to design the *component structure* for a new preset based on the user's request.

      **USER REQUEST**: "${prompt}"

      **AVAILABLE COMPONENTS & CONTEXT**:
      ${context}

      **⚠️ CRITICAL FOUNDATIONAL RULES (ALWAYS FOLLOW) ⚠️**:

      **🚨🚨🚨 GENERATION_TIMING.md - CRITICAL TIMING RULES 🚨🚨🚨**:
      ${timingGuide}

      **0_NEGATIVES.md - ANTI-PATTERNS (NEVER VIOLATE THESE)**:
      ${negativesGuide}

      **0_BASICS.md - CORE PRESET ARCHITECTURE**:
      ${basicsGuide}

      **0_LAYOUT.md - LAYOUT & TIMING FUNDAMENTALS**:
      ${layoutGuide}

      **0_ATOMS.md - AVAILABLE BUILDING BLOCKS**:
      ${atomsGuide}

      **ARCHITECTURAL RULES**:
      1.  **Single preset per file**: Follow the rules in GENERATION_SINGLE_PRESET.md strictly.
      2.  **Root**: MUST be 'BaseLayout' and act as a layout container, not a scene.
      3.  **Structure**: Define a clear tree of atoms (TextAtom, VideoAtom, ImageAtom, AudioAtom, HTMLBlockAtom, LottieAtom, CanvasAtom).
          - ⚠️ **DEPRECATED**: ShapeAtom is deprecated. Use HTMLBlockAtom with CSS styling instead.
          - For custom shapes/graphics, use HTMLBlockAtom with inline styles or CSS classes.
          - HTMLBlockAtom accepts dangerouslySetInnerHTML if needed for custom HTML/SVG content.
      4.  **Props**: Precisely define key props (e.g., layout className, important style keys, high-level options).
      5.  **Timing**: Follow GENERATION_TIMING.md strictly. The timingStrategy MUST explain relative timing.
      6.  **Assets**: Identify what dynamic assets are needed, but do NOT assume external URLs.
      7.  **Dependencies**: Identify if any existing presets from the CONTEXT can be reused as sub-presets.
      8.  **Advanced patterns**: When relevant, follow GENERATION_PATTERNS.md for analytics/debug, accessibility, platform, or param-driven designs.
      9.  **Effects**: ALWAYS use mode: 'provider' with targetIds, NEVER use mode: 'wrapper'.
      10. **NO dangerouslySetInnerHTML on BaseLayout**: NEVER use dangerouslySetInnerHTML on BaseLayout (but it's allowed on HTMLBlockAtom).
      11. **NO CSS animations**: NEVER use @keyframes or CSS animation property. Use the effects system instead.

      **GENERATION_SINGLE_PRESET.md**
      ${singlePresetGuide}

      **GENERATION_PATTERNS.md**
      ${patternsGuide}

      Design the blueprint with these foundational rules in mind.
    `,
  });

  const plan = result.object;
  console.log(
    `   ✓ Plan created with ${plan.structure?.length || 0} components, ${plan.dependencies?.length || 0} dependencies`,
  );

  return plan;
}

/**
 * Step 3: Tech Lead Review
 */
async function step3_techLeadReview(
  prompt: string,
  initialPlan: any,
  ragResults: RagSearchResult[],
): Promise<any> {
  console.log('\n🧐 Step 3: Tech Lead Review - Validating plan...');

  // Load guides
  const negativesGuide = await readGuide('0_NEGATIVES.md');
  const basicsGuide = await readGuide('0_BASICS.md');
  const layoutGuide = await readGuide('0_LAYOUT.md');
  const atomsGuide = await readGuide('0_ATOMS.md');
  const singlePresetGuide = await readGuide('GENERATION_SINGLE_PRESET.md');
  const patternsGuide = await readGuide('GENERATION_PATTERNS.md');
  const timingGuide = await readGuide('GENERATION_TIMING.md');

  let plan = initialPlan;
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    const result = await generateObject({
      model: anthropic('claude-opus-4-5'),
      schema: TechLeadOutputSchema,
      system: `
        You are the **Tech Lead** for the Remotion team.
        Review the Architect's plan for compliance with our strict engineering standards.

        **⚠️ CRITICAL FOUNDATIONAL RULES - MUST BE ENFORCED ⚠️**:

        **🚨🚨🚨 GENERATION_TIMING.md - CRITICAL TIMING RULES (MUST VALIDATE) 🚨🚨🚨**:
        ${timingGuide}

        **0_NEGATIVES.md - ANTI-PATTERNS (MUST REJECT IF VIOLATED)**:
        ${negativesGuide}

        **0_BASICS.md - CORE ARCHITECTURE**:
        ${basicsGuide}

        **0_LAYOUT.md - LAYOUT & TIMING FUNDAMENTALS**:
        ${layoutGuide}

        **0_ATOMS.md - AVAILABLE BUILDING BLOCKS**:
        ${atomsGuide}

        **ENGINEERING STANDARDS**:
        1.  **BaseLayout Rule**: Root must be 'BaseLayout'. Type must be 'layout' (NOT 'scene').
        2.  **Asset Rule**: NO external URLs in the code. All assets must be assumed local/uploaded.
        3.  **Efficiency**: Avoid deep nesting if unnecessary.
        4.  **Timing**: ALL timing must be RELATIVE to parent.
        5.  **CSS**: Prefer Tailwind classes over inline styles.
        6.  **Effects**: ALL effects must use mode: 'provider' with targetIds. NEVER mode: 'wrapper'.
        7.  **Animations**: ALL animations must use the effects system. NO CSS @keyframes.
        8.  **Structure**: NO dangerouslySetInnerHTML on BaseLayout.

        **SINGLE PRESET CONSTRAINT**:
        ${singlePresetGuide}

        **ADVANCED PATTERNS**:
        ${patternsGuide}

        Evaluate the plan critically:
        - If it violates foundational rules → REJECT with specific critique
        - If timing strategy is absolute instead of relative → REJECT
        - If it suggests wrapper mode for effects → REJECT
        - If it's sound but needs refinements → APPROVE with revisedPlan
        - If it follows all rules → APPROVE
      `,
      prompt: `
        **PLAN TO REVIEW**:
        ${JSON.stringify(plan, null, 2)}

        Review this plan against the foundational rules and engineering standards.
      `,
    });

    const review = result.object;
    console.log(
      `   Review Attempt ${attempts + 1}/${maxAttempts}: ${review.approved ? '✓ Approved' : '✗ Rejected'}`,
    );

    if (review.approved) {
      if (review.revisedPlan) {
        plan = review.revisedPlan;
        console.log('   ✓ Plan approved with improvements');
      } else {
        console.log('   ✓ Plan approved');
      }
      break;
    } else {
      console.log(`   ✗ Plan rejected: ${review.critique}`);
      console.log(`   ↻ Re-architecting with feedback...`);

      // Re-architect with feedback
      plan = await step2_architect(
        `${prompt}\n\nCRITICAL FEEDBACK: ${review.critique}\nSUGGESTIONS: ${review.suggestions.join(', ')}`,
        ragResults,
      );

      attempts++;
    }
  }

  console.log('   ✓ Review complete');
  return plan;
}

/**
 * Step 4: Coding & Validation Loop
 */
async function step4_codingAndValidation(
  prompt: string,
  plan: any,
  ragResults: RagSearchResult[],
): Promise<{ code: string; metadata: any; validationPassed: boolean }> {
  console.log('\n💻 Step 4: Coding & Validation Loop...');

  const presetId = plan.metadata.idProposal || `preset-${Date.now()}`;
  const maxAttempts = 1; // Validation retry limit
  let lastErrors: string[] = [];
  let code = '';
  let generatedMeta: any = null;

  // Load guides
  const negativesGuide = await readGuide('0_NEGATIVES.md');
  const basicsGuide = await readGuide('0_BASICS.md');
  const layoutGuide = await readGuide('0_LAYOUT.md');
  const atomsGuide = await readGuide('0_ATOMS.md');
  const singlePresetGuide = await readGuide('GENERATION_SINGLE_PRESET.md');
  const patternsGuide = await readGuide('GENERATION_PATTERNS.md');
  const timingGuide = await readGuide('GENERATION_TIMING.md');
  // const typesFile = await readTypesFile(1000);
  const typesFile = await readTypesFile();

  // Conditional guides based on prompt keywords
  // This reduces token usage by only loading relevant guides for the specific preset being generated
  // Example: "Create a video transition" loads TRANSITIONS.md and ATOM_MEDIA_VIDEO.md
  const promptLower = prompt.toLowerCase();

  // General guides
  const needsTransitions = promptLower.includes('transition');
  const needsTypography =
    promptLower.includes('caption') ||
    promptLower.includes('text') ||
    promptLower.includes('typography');
  const needsEffects =
    promptLower.includes('effect') ||
    promptLower.includes('animation') ||
    promptLower.includes('fade') ||
    promptLower.includes('zoom') ||
    promptLower.includes('slide');
  const needsAudioData =
    promptLower.includes('audio') ||
    promptLower.includes('beat') ||
    promptLower.includes('sync') ||
    promptLower.includes('sound');

  // Atom-specific guides
  const needsTextAtom =
    promptLower.includes('text') ||
    promptLower.includes('caption') ||
    promptLower.includes('subtitle') ||
    promptLower.includes('title') ||
    promptLower.includes('word') ||
    promptLower.includes('character');
  const needsVideoAtom =
    promptLower.includes('video') ||
    promptLower.includes('clip') ||
    promptLower.includes('footage');
  const needsImageAtom =
    promptLower.includes('image') ||
    promptLower.includes('photo') ||
    promptLower.includes('picture') ||
    promptLower.includes('png') ||
    promptLower.includes('jpg');
  const needsAudioAtom =
    promptLower.includes('audio') ||
    promptLower.includes('music') ||
    promptLower.includes('sound') ||
    promptLower.includes('voice');
  const needsLottieAtom =
    promptLower.includes('lottie') ||
    promptLower.includes('animation json') ||
    promptLower.includes('motion graphic');
  const needsCanvasAtom =
    promptLower.includes('canvas') ||
    promptLower.includes('draw') ||
    promptLower.includes('particle') ||
    promptLower.includes('waveform') ||
    promptLower.includes('visualizer') ||
    promptLower.includes('chart');
  // HTMLBlockAtom is used for shapes (replaces deprecated ShapeAtom), custom HTML, and SVG content
  const needsHtmlBlockAtom =
    promptLower.includes('html') ||
    promptLower.includes('custom html') ||
    promptLower.includes('iframe') ||
    promptLower.includes('shape') ||
    promptLower.includes('svg') ||
    promptLower.includes('circle') ||
    promptLower.includes('rectangle') ||
    promptLower.includes('polygon');
  const needsMediaBasics = needsVideoAtom || needsImageAtom || needsAudioAtom;

  // Load guides
  const transitionsGuide = needsTransitions
    ? await readGuide('TRANSITIONS.md')
    : '';
  const typographyGuide = needsTypography
    ? await readGuide('TYPOGRAPHY.md')
    : '';
  const effectsGuide = needsEffects ? await readGuide('EFFECTS.md') : '';
  const audioDataGuide = needsAudioData ? await readGuide('AUDIO_DATA.md') : '';

  // Atom guides
  const atomTextGuide = needsTextAtom ? await readGuide('ATOM_TEXT.md') : '';
  const atomVideoGuide = needsVideoAtom
    ? await readGuide('ATOM_MEDIA_VIDEO.md')
    : '';
  const atomImageGuide = needsImageAtom
    ? await readGuide('ATOM_MEDIA_IMAGE.md')
    : '';
  const atomAudioGuide = needsAudioAtom
    ? await readGuide('ATOM_MEDIA_AUDIO.md')
    : '';
  const atomLottieGuide = needsLottieAtom
    ? await readGuide('ATOM_LOTTIE.md')
    : '';
  const atomCanvasGuide = needsCanvasAtom
    ? await readGuide('ATOM_CANVAS.md')
    : '';
  const atomHtmlBlockGuide = needsHtmlBlockAtom
    ? await readGuide('ATOM_HTMLBLOCK.md')
    : '';
  const atomMediaBasicsGuide = needsMediaBasics
    ? await readGuide('ATOM_MEDIA_BASICS.md')
    : '';

  const context = ragResults
    .map(
      r => `
    // Ref: ${r.metadata.title}
    ${r.code}
  `,
    )
    .join('\n\n');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\n   💻 Coding Attempt ${attempt}/${maxAttempts}...`);

    const feedbackPrompt =
      lastErrors.length > 0
        ? `\n**⚠️ CRITICAL: PREVIOUS VALIDATION ERRORS (MUST FIX) ⚠️**:\n${lastErrors.map((err, i) => `${i + 1}. ${err}`).join('\n')}\n\n**INSTRUCTIONS**: Carefully review each error above and fix them in your code. Pay special attention to:\n- ESLint errors: Fix formatting, unused variables, and code style issues\n- Forbidden imports: Remove any 'fs' or 'path' imports\n- Structure issues: Ensure helper functions are inside presetExecution\n- TypeScript errors: Fix type errors and syntax issues`
        : '';

    // Generate code
    const result = await generateObject({
      model: anthropic('claude-sonnet-4-5'),
      schema: PresetGeneratorOutputSchema,
      prompt: `
        You are the **Senior Developer**. Write the production-ready TypeScript code for this preset.

        **USER REQUEST**: "${prompt}"

        **APPROVED PLAN**:
        ${JSON.stringify(plan, null, 2)}

        ${feedbackPrompt}

        **⚠️⚠️⚠️ CRITICAL FOUNDATIONAL RULES ⚠️⚠️⚠️**:

        **🚨🚨🚨 GENERATION_TIMING.md - CRITICAL TIMING RULES 🚨🚨🚨**:
        ${timingGuide}

        **0_NEGATIVES.md - ANTI-PATTERNS**:
        ${negativesGuide}

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
        11. **ShapeAtom Deprecation**: ShapeAtom is DEPRECATED. Use HTMLBlockAtom with CSS styling instead.
            - For shapes/graphics, use HTMLBlockAtom with inline styles or CSS classes
            - HTMLBlockAtom accepts dangerouslySetInnerHTML for custom HTML/SVG content
            - Example: Use <div> with border-radius for circles, or inline SVG for complex shapes

        **REFERENCE CODE**:
        ${context}

        **CONDITIONAL GUIDES (Based on Your Request)**:
        ${transitionsGuide ? `**TRANSITIONS.md**:\n${transitionsGuide}\n\n` : ''}
        ${typographyGuide ? `**TYPOGRAPHY.md**:\n${typographyGuide}\n\n` : ''}
        ${effectsGuide ? `**EFFECTS.md**:\n${effectsGuide}\n\n` : ''}
        ${audioDataGuide ? `**AUDIO_DATA.md**:\n${audioDataGuide}\n\n` : ''}
        ${atomMediaBasicsGuide ? `**ATOM_MEDIA_BASICS.md (Media Fundamentals)**:\n${atomMediaBasicsGuide}\n\n` : ''}
        ${atomTextGuide ? `**ATOM_TEXT.md (Text Atom Details)**:\n${atomTextGuide}\n\n` : ''}
        ${atomVideoGuide ? `**ATOM_MEDIA_VIDEO.md (Video Atom Details)**:\n${atomVideoGuide}\n\n` : ''}
        ${atomImageGuide ? `**ATOM_MEDIA_IMAGE.md (Image Atom Details)**:\n${atomImageGuide}\n\n` : ''}
        ${atomAudioGuide ? `**ATOM_MEDIA_AUDIO.md (Audio Atom Details)**:\n${atomAudioGuide}\n\n` : ''}
        ${atomLottieGuide ? `**ATOM_LOTTIE.md (Lottie Animation Details)**:\n${atomLottieGuide}\n\n` : ''}
        ${atomCanvasGuide ? `**ATOM_CANVAS.md (Canvas/Drawing Details)**:\n${atomCanvasGuide}\n\n` : ''}
        ${atomHtmlBlockGuide ? `**ATOM_HTMLBLOCK.md (Custom HTML Details)**:\n${atomHtmlBlockGuide}\n\n` : ''}

        **GUIDES**:
        ${singlePresetGuide}
        ${patternsGuide}

        **TYPES FROM "../../types.ts" (REFERENCE ONLY, DO NOT REDEFINE):**
        ${typesFile}

        **FINAL REMINDER BEFORE YOU CODE**:
        - All context.timing values are RELATIVE to parent, not absolute to video start
        - NEVER use mode: 'wrapper' - always use mode: 'provider' with targetIds
        - NEVER use dangerouslySetInnerHTML on BaseLayout or CSS animations
        - Follow the 0_ guides strictly - they are the foundation

        Generate the full file content.
      `,
    });

    code = result.object.code;
    generatedMeta = result.object.metadata;
    console.log(`   ✓ Code generated (${code.length} chars)`);

    // Validate
    console.log('   🛡️  Validating code (TypeScript, structure, ESLint)...');
    const validationResult = await validatePresetCode(code, presetId);

    if (validationResult.valid) {
      console.log('   ✅ Validation passed!');

      if (validationResult.wasAutoFixed && validationResult.fixedCode) {
        console.log('   ✨ Code was auto-fixed by ESLint');
        code = validationResult.fixedCode;
      }

      if (validationResult.warnings.length > 0) {
        console.log(
          `   ⚠️  ${validationResult.warnings.length} warning(s) (non-blocking):`,
        );
        validationResult.warnings.forEach(w => console.log(`      - ${w}`));
      }

      return { code, metadata: generatedMeta, validationPassed: true };
    }

    // Validation failed
    lastErrors = validationResult.errors;
    console.log(`   ❌ Validation failed with ${lastErrors.length} error(s):`);
    lastErrors.forEach(e => console.log(`      - ${e}`));

    if (attempt < maxAttempts) {
      console.log('   ↻ Attempting to fix...');
    }
  }

  // All attempts failed
  console.log(`\n   ⚠️  Validation failed after ${maxAttempts} attempts`);
  console.log('   💾 Saving code with error metadata for manual review...');

  return {
    code,
    metadata: {
      ...generatedMeta,
      validationFailed: true,
      validationErrors: lastErrors,
    },
    validationPassed: false,
  };
}

/**
 * Step 5: Save
 */
async function step5_save(presetId: string, code: string): Promise<string> {
  console.log('\n💾 Step 5: Saving preset...');

  const filePath = await savePresetToFile(presetId, code);
  console.log(`   ✓ Saved to: ${filePath}`);

  return filePath;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function generatePreset(prompt: string): Promise<void> {
  console.log(
    '═══════════════════════════════════════════════════════════════',
  );
  console.log('🤖 PRESET GENERATOR STARTED');
  console.log(
    '═══════════════════════════════════════════════════════════════',
  );
  console.log(`📝 Prompt: "${prompt}"`);
  console.log(
    '═══════════════════════════════════════════════════════════════',
  );

  const startTime = Date.now();

  try {
    // Step 1: RAG Search
    const ragResults = await step1_ragSearch(prompt);

    // Step 2: Architect
    let plan = await step2_architect(prompt, ragResults);

    // Step 3: Tech Lead Review
    plan = await step3_techLeadReview(prompt, plan, ragResults);

    // Step 4: Coding & Validation
    const { code, metadata, validationPassed } =
      await step4_codingAndValidation(prompt, plan, ragResults);

    // Step 5: Save
    const presetId = plan.metadata.idProposal || `preset-${Date.now()}`;
    const filePath = await step5_save(presetId, code);

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(
      '\n═══════════════════════════════════════════════════════════════',
    );
    console.log('✅ PRESET GENERATION COMPLETE');
    console.log(
      '═══════════════════════════════════════════════════════════════',
    );
    console.log(`📦 Preset ID: ${presetId}`);
    console.log(`📄 Title: ${metadata.title}`);
    console.log(`📝 Description: ${metadata.description}`);
    console.log(`📁 File Path: ${filePath}`);
    console.log(
      `✔️  Validation: ${validationPassed ? 'PASSED' : 'FAILED (see metadata)'}`,
    );
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(
      '═══════════════════════════════════════════════════════════════',
    );

    if (!validationPassed) {
      console.log('\n⚠️  WARNING: Preset saved with validation errors.');
      console.log(
        '   Please review and fix manually before using in production.',
      );
    }

    // Output structured JSON for programmatic consumption
    // This allows scripts/workflows to parse the result easily
    console.log('\n__PRESET_RESULT_JSON_START__');
    console.log(
      JSON.stringify(
        {
          success: true,
          presetId: presetId,
          metadata: {
            id: presetId,
            title: metadata.title,
            description: metadata.description,
            validationFailed: !validationPassed,
            validationErrors:
              !validationPassed && (metadata as any).validationErrors
                ? (metadata as any).validationErrors
                : [],
            validationWarnings: (metadata as any).validationWarnings || [],
            lintOutput: (metadata as any).lintOutput || '',
            wasAutoFixed: (metadata as any).wasAutoFixed || false,
          },
          filePath: filePath,
          duration: parseFloat(duration),
          validationPassed: validationPassed,
        },
        null,
        2,
      ),
    );
    console.log('__PRESET_RESULT_JSON_END__');

    // Exit successfully - important for workflow scripts that wait for completion
    process.exit(0);
  } catch (error) {
    console.error(
      '\n═══════════════════════════════════════════════════════════════',
    );
    console.error('❌ PRESET GENERATION FAILED');
    console.error(
      '═══════════════════════════════════════════════════════════════',
    );
    console.error(error);
    process.exit(1);
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

const prompt = process.argv[2];

if (!prompt) {
  console.error('Usage: npm run generate-preset "Your preset description"');
  console.error(
    'Example: npm run generate-preset "Create a text fade in preset"',
  );
  process.exit(1);
}

generatePreset(prompt);
