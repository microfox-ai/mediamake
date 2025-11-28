import { AiRouter } from '@microfox/ai-router';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { ArchitectOutputSchema } from './architect.agent';
import { readGuide } from './helpers/guides';

const aiRouter = new AiRouter();

export const TechLeadOutputSchema = z.object({
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

export const techLeadAgent = aiRouter
  .agent('/', async ctx => {
    const { plan } = ctx.request.params as { plan: any };

    // Load CRITICAL "0_" Guides (ALWAYS IN CONTEXT - FOUNDATIONAL RULES)
    const negativesGuide = await readGuide('0_NEGATIVES.md');
    const basicsGuide = await readGuide('0_BASICS.md');
    const layoutGuide = await readGuide('0_LAYOUT.md');
    const atomsGuide = await readGuide('0_ATOMS.md');

    // Load Generation Guides
    const singlePresetGuide = await readGuide('GENERATION_SINGLE_PRESET.md');
    const patternsGuide = await readGuide('GENERATION_PATTERNS.md');
    const timingGuide = await readGuide('GENERATION_TIMING.md');

    ctx.response.writeMessageMetadata({
      loader: 'Reviewing plan...',
    });

    const result = await generateObject({
      model: anthropic('claude-sonnet-4-5'), // Using Opus for critical plan review and validation
      schema: TechLeadOutputSchema,
      system: `
        You are the **Tech Lead** for the Remotion team.
        Review the Architect's plan for compliance with our strict engineering standards.

        **⚠️ CRITICAL FOUNDATIONAL RULES - MUST BE ENFORCED ⚠️**:

        **🚨🚨🚨 GENERATION_TIMING.md - CRITICAL TIMING RULES (MUST VALIDATE) 🚨🚨🚨**:
        ${timingGuide}
        
        The plan's timingStrategy MUST explain relative timing. Child components must be designed
        with start times relative to their parent's timeline, NOT absolute video timeline.
        
        *** REJECT any plan that suggests using absolute timing for nested components. ***

        **0_NEGATIVES.md - ANTI-PATTERNS (MUST REJECT IF VIOLATED)**:
        ${negativesGuide}
        
        Critical anti-patterns to check for:
        - ❌ REJECT if plan suggests using CSS @keyframes
        - ❌ REJECT if plan suggests dangerouslySetInnerHTML on BaseLayout
        - ❌ REJECT if plan suggests CSS animation property
        - ❌ REJECT if effects use mode: 'wrapper' (must use mode: 'provider' with targetIds)
        - ✅ APPROVE if plan uses effects system with mode: 'provider'

        **0_BASICS.md - CORE ARCHITECTURE**:
        ${basicsGuide}

        **0_LAYOUT.md - LAYOUT & TIMING FUNDAMENTALS**:
        ${layoutGuide}

        **0_ATOMS.md - AVAILABLE BUILDING BLOCKS**:
        ${atomsGuide}

        **ENGINEERING STANDARDS**:
        1.  **BaseLayout Rule**: Root must be 'BaseLayout'. Type must be 'layout' (NOT 'scene').
        2.  **Asset Rule**: NO external URLs (e.g., unsplash.com) in the code. All assets must be assumed local/uploaded or use placeholders.
        3.  **Efficiency**: Avoid deep nesting if unnecessary. Use 'repeatChildrenProps' where applicable.
        4.  **Timing**: ALL timing must be RELATIVE to parent. The timingStrategy must explicitly state this.
        5.  **CSS**: Prefer Tailwind classes (via 'className') over inline 'style'.
        6.  **Effects**: ALL effects must use mode: 'provider' with targetIds. NEVER mode: 'wrapper'.
        7.  **Animations**: ALL animations must use the effects system. NO CSS @keyframes or animation property.
        8.  **Structure**: NO dangerouslySetInnerHTML on BaseLayout. Use effects or inline styles instead.

        **SINGLE PRESET CONSTRAINT** (GENERATION_SINGLE_PRESET.md):
        ${singlePresetGuide}

        **ADVANCED PATTERNS** (GENERATION_PATTERNS.md):
        ${patternsGuide}

        **REVIEW CHECKLIST**:
        - [ ] Root is BaseLayout with type 'layout' (not 'scene')
        - [ ] timingStrategy explains RELATIVE timing (not absolute)
        - [ ] NO external asset URLs in structure
        - [ ] Effects (if any) use mode: 'provider' with targetIds
        - [ ] NO suggestions for CSS animations, @keyframes, or dangerouslySetInnerHTML
        - [ ] Structure follows foundational guides (0_ guides)
        - [ ] Appropriate use of atoms from 0_ATOMS.md
        - [ ] Dependencies are clearly identified

        Evaluate the plan critically:
        - If it violates foundational rules (0_NEGATIVES.md) → REJECT (approved: false) with specific critique
        - If timing strategy is absolute instead of relative → REJECT with timing correction
        - If it suggests wrapper mode for effects → REJECT with provider mode requirement
        - If it's architecturally sound but needs refinements → APPROVE with revisedPlan
        - If it follows all rules → APPROVE (approved: true)
      `,
      prompt: `
        **PLAN TO REVIEW**:
        ${JSON.stringify(plan, null, 2)}

        Review this plan against the foundational rules and engineering standards.
        Pay special attention to:
        1. Timing strategy (must be RELATIVE, not absolute)
        2. Effect modes (must be 'provider', not 'wrapper')
        3. Anti-patterns from 0_NEGATIVES.md
        4. Architectural soundness
      `,
    });

    return result.object;
  })
  .actAsTool('/', {
    id: 'techLead',
    name: 'Tech Lead',
    description:
      'Reviews and approves the architectural plan based on engineering standards.',
    inputSchema: z.object({
      plan: ArchitectOutputSchema,
    }),
    outputSchema: TechLeadOutputSchema,
    metadata: { title: 'Tech Lead', icon: 'user-check' },
  });
