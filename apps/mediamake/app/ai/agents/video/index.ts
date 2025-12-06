import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { musicStitchAgent } from './shorts/musicStitch';
import { reflectiveThinkAgent } from './shorts/reflectiveThink';

const aiRouter = new AiRouter();

export const videoGenerationOrchestrator = aiRouter
  .before('/', async (ctx, next) => {
    ctx.response.writeMessageMetadata({
      loader: 'Orchestrating video generation...',
    });
    return next();
  })
  .agent('/shorts/music-stitch', musicStitchAgent)
  .agent('/shorts/reflective-think', reflectiveThinkAgent)
  .agent('/', async ctx => {
    // TODO: ORchestrator that picks the best analyser as and when needed.
    ctx.response.writeMessageMetadata({
      loader: 'Not Implemented...',
    });
  })
  .actAsTool('/', {
    id: 'videoGenerationOrchestrator',
    name: 'Video Generation Orchestrator',
    description: 'Orchestrate the video generation',
    inputSchema: z.object({
      videoUrls: z
        .array(z.string().url())
        .describe('The video URLs to generate'),
    }) as any,
    outputSchema: z.object({
      status: z.string().describe('The status of the video generation'),
    }) as any,
    metadata: {
      icon: '',
      title: 'Video Generation Agents',
      hideUI: true,
    },
  });
