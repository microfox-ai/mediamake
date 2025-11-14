import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import musicKeywordAgent from './music/keywordAgent';
import { loadTranscription } from './middlewares/loadTranscription';
import ragImageAttacherAgent from './music/ragImageAttacher';
import emptyImageAttacherAgent from './music/emptyImageAttacher';
// import textToImageAgent from './private/textToImageAgent';
// import clearMetadataAgent from './private/clearMetadata';

const aiRouter = new AiRouter();

export const scriptMetaOrchestor = aiRouter
  .use('/', async (ctx, next) => {
    ctx.response.writeMessageMetadata({
      loader: 'Orchestrating script meta generation...',
    });
    return next();
  })
  .use('/', loadTranscription)
  .agent('/music/keyword', musicKeywordAgent)
  .agent('/music/rag-image-attacher', ragImageAttacherAgent)
  .agent('/music/empty-image-attacher', emptyImageAttacherAgent)
  // .agent('/text-to-image', textToImageAgent)
  // .agent('/clear-metadata', clearMetadataAgent)
  .agent('/', async ctx => {
    // TODO: ORchestrator that picks the best analyser as and when needed.
    ctx.response.writeMessageMetadata({
      loader: 'Not Implemented...',
    });
  })
  .actAsTool('/', {
    id: 'scriptMetaOrchestrator',
    name: 'Script Meta Orchestrator',
    description: 'Orchestrate the script meta generation',
    inputSchema: z.object({
      script: z.string().describe('The script to generate meta for'),
    }) as any,
    outputSchema: z.object({
      status: z.string().describe('The status of the script meta generation'),
    }) as any,
    metadata: {
      icon: '',
      title: 'Script Meta Orchestrator',
      hideUI: true,
    },
  });
