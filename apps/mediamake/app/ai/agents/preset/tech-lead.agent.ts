import { AiRouter } from '@microfox/ai-router';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { ArchitectOutputSchema } from './architect.agent';
import { readGuide } from './helpers/guides';

const aiRouter = new AiRouter();

export const TechLeadOutputSchema = z.object({
  approved: z.boolean(),
  critique: z.string().optional().describe("If rejected, explain why."),
  suggestions: z.array(z.string()).describe("Improvements for performance, style, or Remotion best practices."),
  revisedPlan: ArchitectOutputSchema.optional().describe("If approved with minor changes, provide the revised plan.")
});

export const techLeadAgent = aiRouter
  .agent('/', async (ctx) => {
    const { plan } = ctx.request.params as { plan: any };

    // Load Core Guides
    const layoutGuide = await readGuide('LAYOUT.md');
    const mediaGuide = await readGuide('MEDIA.md');
    const singlePresetGuide = await readGuide('GENERATION_SINGLE_PRESET.md');
    const patternsGuide = await readGuide('GENERATION_PATTERNS.md');

    ctx.response.writeMessageMetadata({
      loader: 'Reviewing plan...',
    });

    const result = await generateObject({
      model: anthropic('claude-opus-4-5'), // Using Opus for critical plan review and validation
      schema: TechLeadOutputSchema,
      system: `
        You are the **Tech Lead** for the Remotion team.
        Review the Architect's plan for compliance with our strict engineering standards.

        **ENGINEERING STANDARDS**:
        1.  **BaseLayout Rule**: Root must be 'BaseLayout'. Type must be 'layout' (NOT 'scene').
        2.  **Asset Rule**: NO external URLs (e.g., unsplash.com) in the code. All assets must be assumed local/uploaded or use placeholders.
        3.  **Efficiency**: Avoid deep nesting if unnecessary. Use 'repeatChildrenProps' where applicable.
        4.  **Timing**: Ensure 'contextTiming' is used correctly for flexible duration.
        5.  **CSS**: Prefer Tailwind classes (via 'className') over inline 'style'.
        
        **REFERENCE GUIDES**:
        ${layoutGuide}
        ${mediaGuide}

        **SINGLE PRESET CONSTRAINT** (GENERATION_SINGLE_PRESET.md):
        ${singlePresetGuide}

        **ADVANCED PATTERNS** (GENERATION_PATTERNS.md):
        ${patternsGuide}

        Evaluate the plan. If it violates rules (especially external assets or wrong root), REJECT it (approved: false) and provide specific critique.
        If it's good but needs minor tweaks, APPROVE it (approved: true) and provide a revisedPlan.
      `,
      prompt: `
        **PLAN**:
        ${JSON.stringify(plan, null, 2)}
      `,
    });

    return result.object;
  })
  .actAsTool('/', {
    id: 'techLead',
    name: 'Tech Lead',
    description: 'Reviews and approves the architectural plan based on engineering standards.',
    inputSchema: z.object({
      plan: ArchitectOutputSchema,
    }),
    outputSchema: TechLeadOutputSchema,
    metadata: { title: 'Tech Lead', icon: 'user-check' },
  });

