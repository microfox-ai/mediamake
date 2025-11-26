import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { midjourneyPromptingAgent } from './captionBasedPrompting';
import { midjourneySimpleAgent } from './simple';
import { updateProgressAgent } from './updateProgress';
import { ideateAgent } from './ideate';
import { ideateStoryAgent } from './ideateStory';
import { abstractBulkImageGenerationAgent } from './pipeline1';
import { pipeline2Agent } from './pipeline2';

const aiRouter = new AiRouter();

export const midjourneyOrchestrator = aiRouter
  .use('/', async (ctx, next) => {
    ctx.response.writeMessageMetadata({
      loader: 'Orchestrating Midjourney prompt generation...',
    });
    return next();
  })
  .agent('/caption-based', midjourneyPromptingAgent)
  .agent('/simple', midjourneySimpleAgent)
  .agent('/update-progress', updateProgressAgent)
  .agent('/ideate', ideateAgent)
  .agent('/ideate-story', ideateStoryAgent)
  .agent('/pipeline1', abstractBulkImageGenerationAgent)
  .agent('/pipeline2', pipeline2Agent)
  .agent('/', async ctx => {
    // Default orchestrator - routes to appropriate agent
    ctx.response.writeMessageMetadata({
      loader: 'NOT IMPLEMENTED',
    });
  })
  .actAsTool('/', {
    id: 'midjourneyOrchestrator',
    name: 'Midjourney Orchestrator',
    description: 'Orchestrate Midjourney prompt generation for development AI',
    inputSchema: z.object({}) as any,
    outputSchema: z.object({}).describe('Midjourney prompts'),
    metadata: {
      icon: '',
      title: 'Midjourney Orchestrator',
      hideUI: true,
    },
  });
