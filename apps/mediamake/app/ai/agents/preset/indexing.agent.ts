import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { indexPresetsFunction, IndexingScope } from './helpers/rag';

const aiRouter = new AiRouter();

export const indexingAgent = aiRouter
  .agent('/', async (ctx) => {
    try {
      // Extract params from input
      const { scope, targetId } = ctx.request.params as {
        scope: IndexingScope;
        targetId?: string;
      };

      // Call indexing function with filters
      const result = await indexPresetsFunction({ scope, targetId });
      return {
        status: 'success',
        message: result.message,
        count: result.count,
      };
    } catch (error: any) {
      console.error('Indexing Agent Error:', error);
      return {
        status: 'error',
        message: error.message || 'Indexing failed',
        count: 0,
      };
    }
  })
  .actAsTool('/', {
    id: 'presetIndexer',
    name: 'Index Presets',
    description: 'Indexes presets from the registry and database into the RAG system. Supports various scopes.',
    inputSchema: z.object({
      scope: z.enum(['all', 'changes', 'fs', 'db', 'file', 'db-id']).default('all')
        .describe('Scope of indexing: "all" (everything), "changes" (git diff), "fs" (all files), "db" (all db), "file" (specific file path), "db-id" (specific db ID).'),
      targetId: z.string().optional()
        .describe('The ID, filename, or partial path of the target to index. Required for "file" and "db-id" scopes.'),
    }),
    outputSchema: z.object({
      status: z.string(),
      message: z.string(),
      count: z.number(),
    }),
    metadata: {
      title: 'Index Presets',
      icon: 'database',
    },
  });
