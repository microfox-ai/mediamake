import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import promptGeneratorAgent from './promptGeneratorAgent';

const aiRouter = new AiRouter();

export const presetPromptsOrchestrator = aiRouter
  .before('/', async (ctx, next) => {
    ctx.response.writeMessageMetadata({
      loader: 'Orchestrating preset prompt generation...',
    });
    return next();
  })
  .agent('/generate-prompt', promptGeneratorAgent)
  .agent('/', async ctx => {
    // Default orchestrator - routes to prompt generator
    ctx.response.writeMessageMetadata({
      loader: 'NOT IMPELEMTNED',
    });
  })
  .actAsTool('/', {
    id: 'presetPromptsOrchestrator',
    name: 'Preset Prompts Orchestrator',
    description: 'Orchestrate preset prompt generation for development AI',
    inputSchema: z.object({}) as any,
    outputSchema: z.object({}).describe('Preset prompts'),
    metadata: {
      icon: '',
      title: 'Preset Prompts Orchestrator',
      hideUI: true,
    },
  });
