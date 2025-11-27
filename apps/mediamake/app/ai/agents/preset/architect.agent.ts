import { AiRouter } from '@microfox/ai-router';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { RagSearchResultSchema } from './helpers/schema';
import { readGuide } from './helpers/guides';

const aiRouter = new AiRouter();

// Extended Plan Schema
export const ArchitectOutputSchema = z.object({
  rootContainer: z.enum(['BaseLayout']).describe("Must be BaseLayout"),
  structure: z.array(z.object({
      id: z.string(),
      type: z.string().describe("Atom or Component type (e.g., TextAtom, VideoAtom)"),
      props: z.record(z.string(), z.any()).describe("Key props for this component"),
      children: z.array(z.string()).optional().describe("IDs of children if any")
  })).describe("Flat list of nodes defining the tree structure"),
  dependencies: z.array(z.string()).describe("List of IDs of existing presets (sub-presets) that this preset depends on."),
  timingStrategy: z.string().describe("Explanation of how timing is handled (relative, sequence, etc.)"),
  requiredAssets: z.array(z.string()).describe("List of asset types needed (e.g. 'background music', 'logo')"),
  metadata: z.object({
      title: z.string(),
      description: z.string(),
      idProposal: z.string()
  })
});

export const architectAgent = aiRouter
  .agent('/', async (ctx) => {
    const { prompt, ragResults } = ctx.request.params as {
      prompt: string;
      ragResults: any[];
    };
    
    ctx.response.writeMessageMetadata({
      loader: 'Designing architecture...',
    });

    const singlePresetGuide = await readGuide('GENERATION_SINGLE_PRESET.md');
    const patternsGuide = await readGuide('GENERATION_PATTERNS.md');
    const timingGuide = await readGuide('GENERATION_TIMING.md');
    
    // Load critical "0_" guides (ALWAYS IN CONTEXT - FOUNDATIONAL RULES)
    const negativesGuide = await readGuide('0_NEGATIVES.md');
    const basicsGuide = await readGuide('0_BASICS.md');
    const layoutGuide = await readGuide('0_LAYOUT.md');
    const atomsGuide = await readGuide('0_ATOMS.md');

    const context = ragResults.map(r => `
      ID: ${r.metadata.id}
      Title: ${r.metadata.title}
      Description: ${r.metadata.description}
      Tags: ${r.metadata.tags?.join(', ')}
      Docs: ${r.code} 
    `).join('\n---\n');

    const result = await generateObject({
      model: anthropic('claude-opus-4-5'), // Using Opus for superior architectural reasoning
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
            - Even if the idea sounds like a "pack" or "bundle", you must design ONE preset that orchestrates everything.
        2.  **Root**: MUST be 'BaseLayout' and act as a layout container, not a scene.
        3.  **Structure**: Define a clear tree of atoms (TextAtom, VideoAtom, ImageAtom, AudioAtom, ShapeAtom, LottieAtom).
        4.  **Props**: Precisely define key props (e.g., layout className, important style keys, high-level options).
        5.  **Timing**: Follow GENERATION_TIMING.md strictly. The timingStrategy MUST explain relative timing.
        6.  **Assets**: Identify what dynamic assets are needed, but do NOT assume external URLs.
        7.  **Dependencies**: Identify if any existing presets from the CONTEXT can be reused as sub-presets.
            - If a preset in CONTEXT matches a needed effect or component (e.g., "glitch effect" or "kinetic title"), list its ID in 'dependencies'.
            - Assume these dependencies are available via \`props.presets[presetId]\` and will be called from the coder.
        8.  **Advanced patterns**: When relevant, follow GENERATION_PATTERNS.md for analytics/debug, accessibility, platform, or param-driven designs instead of inventing new patterns.
        9.  **Effects**: ALWAYS use mode: 'provider' with targetIds, NEVER use mode: 'wrapper' (creates unwanted wrapper divs).
        10. **NO dangerouslySetInnerHTML**: NEVER use dangerouslySetInnerHTML on BaseLayout. Use effects instead.
        11. **NO CSS animations**: NEVER use @keyframes or CSS animation property. Use the effects system.

        **GENERATION_SINGLE_PRESET.md**
        ${singlePresetGuide}

        **GENERATION_PATTERNS.md**
        ${patternsGuide}

        Design the blueprint with these foundational rules in mind.
      `,
    });

    return result.object;
  })
  .actAsTool('/', {
    id: 'architect',
    name: 'Architect',
    description: 'Designs the component structure and props for a new preset.',
    inputSchema: z.object({
      prompt: z.string(),
      ragResults: z.array(RagSearchResultSchema),
    }),
    outputSchema: ArchitectOutputSchema,
    metadata: { title: 'Architect', icon: 'pencil-ruler' },
  });
