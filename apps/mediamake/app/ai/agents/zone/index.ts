// lyric generation,
// music generation, ( instrumental  + lyrical )
// music searches, for inspiration - rag search is not needed ??
// attachment of existing records for tuning to specific

import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { musicGenreAgent } from './musicGenreAgent';

const aiRouter = new AiRouter();

export const zoneInternalOrchestrator = aiRouter
  .before('/', async (ctx, next) => {
    ctx.response.writeMessageMetadata({
      loader: 'Orchestrating zone internal agents...',
    });
    return next();
  })
  .agent('/music-genre', musicGenreAgent)
  .agent('/', async ctx => {
    // TODO: ORchestrator that picks the best analyser as and when needed.
    ctx.response.writeMessageMetadata({
      loader: 'Not Implemented...',
    });
  })
  .actAsTool('/', {
    id: 'zoneInternalOrchestrator',
    name: 'Video Generation Orchestrator',
    description: 'Orchestrate the zone internal agents',
    inputSchema: z.object({}) as any,
    outputSchema: z.object({
      status: z.string().describe('The status of the video generation'),
    }) as any,
    metadata: {
      icon: '',
      title: 'Video Generation Agents',
      hideUI: true,
    },
  });
