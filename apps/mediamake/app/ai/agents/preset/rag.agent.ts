import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { RagSearchResultSchema } from './helpers/schema';
import { queryRagPresets } from './helpers/rag';

const aiRouter = new AiRouter();

export const ragAgent = aiRouter
  .agent('/', async (ctx) => {
    const { query, filters } = ctx.request.params as {
      query: string;
      filters?: { internalPreset?: boolean };
    };

    ctx.response.writeMessageMetadata({
      loader: 'Querying RAG...',
    });

    try {
      let filterString = '';
      if (filters?.internalPreset !== undefined) {
        filterString = `internalPreset = ${filters.internalPreset}`;
      }

      const results = await queryRagPresets(query, filterString);

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
      console.error('RAG Search Error:', error);
      return [];
    }
  })
  .actAsTool('/', {
    id: 'presetGeneratorRag',
    name: 'Search Presets',
    description: 'Search for existing presets and effects in the RAG database.',
    inputSchema: z.object({
      query: z.string(),
      filters: z.object({ internalPreset: z.boolean().optional() }).optional(),
    }),
    outputSchema: z.array(RagSearchResultSchema),
    metadata: {
      title: 'Search Presets',
      icon: 'search',
    },
  });
