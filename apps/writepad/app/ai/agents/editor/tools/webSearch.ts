import { google } from '@ai-sdk/google';
import { generateText, stepCountIs } from 'ai';
import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { getModelDef } from '@/lib/ai-models';
import { trackUsage } from '@/app/ai/lib/trackUsage';

const aiRouter = new AiRouter();

/**
 * Wrapper web-search tool for Gemini.
 * Keeps the main editor request on function tools only, avoiding the
 * "Cannot mix function tools with provider-defined tools" limitation.
 */
export const webSearchAgent = aiRouter
  .agent('/', async (ctx) => {
    const { query } = ctx.request.params as { query: string };
    const modelId = (ctx.state.modelId as string | undefined) ?? 'google/gemini-2.5-flash';
    const projectId = (ctx.state.projectId as string | undefined) ?? undefined;
    const clientId = (ctx.state.clientId as string | undefined) ?? undefined;
    const model = getModelDef(modelId);

    if (model.provider !== 'google') {
      return {
        error:
          'web_search wrapper is intended for Google models only. Use provider-native search tools for this provider.',
      };
    }

    const { text, sources, usage } = await generateText({
      model: google(model.modelName),
      tools: {
        google_search: google.tools.googleSearch({}),
      },
      toolChoice: 'auto',
      stopWhen: stepCountIs(3),
      maxOutputTokens: 800,
      prompt: `Search the web for up-to-date information and answer the query accurately.

Query: ${query}

Return a concise, factual summary of key findings. Mention disagreements/uncertainty when relevant.`,
    });
    trackUsage({ modelId, projectId, clientId, rawUsage: usage }).catch(
      (error) => console.error('[editor/web-search] usage tracking failed', error),
    );

    return {
      query,
      summary: text,
      sourceCount: Array.isArray(sources) ? sources.length : 0,
      sources: sources ?? [],
    };
  })
  .actAsTool('/', {
    id: 'web_search',
    name: 'Web Search',
    description:
      'Search the web for recent information and return a concise summary with sources.',
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .max(500)
        .describe('The search query to look up on the web'),
    }) as any,
    outputSchema: z.object({
      query: z.string().optional(),
      summary: z.string().optional(),
      sourceCount: z.number().optional(),
      sources: z.array(z.unknown()).optional(),
      error: z.string().optional(),
    }) as any,
    metadata: { icon: '🌐', title: 'Web Search', hideUI: true },
  });
