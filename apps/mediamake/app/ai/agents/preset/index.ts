import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { appendUsage } from '@/app/ai/middlewares/usageCapture';
import { generateAgent } from './generate.agent';
import { indexingAgent } from './indexing.agent';
import { queryAgent } from './query.agent';

const aiRouter = new AiRouter();

export const presetAgent = aiRouter
  .agent('/generate', generateAgent)
  .agent('/index', indexingAgent)
  .agent('/query', queryAgent)
  .agent('/', async ctx => {
    const { prompt, metadata, clientId } = ctx.request.params as {
      prompt: string;
      metadata?: any;
      clientId?: string;
    };

    // --- CLASSIFICATION STEP ---
    // Determine intent: "Generate" vs "Index" vs "Query"
    console.log(`[PRESET ROUTER] Classifying intent for: "${prompt}"`);

    ctx.response.writeMessageMetadata({
      loader: 'Classifying intent...',
    });

    const classification = await generateText({
      model: anthropic('claude-haiku-4-5'), // Using Opus for accurate intent classification
      prompt: `
            Classify the user intent based on the prompt: "${prompt}"
            
            If the user wants to create, generate, build, or design a new preset, return "GENERATE".
            If the user wants to index, update registry, scan files, or refresh database, return "INDEX".
            If the user wants to query, list, search, or get information about existing presets, return "QUERY".
            
            Return ONLY ONE WORD.
        `,
    });
    if (classification.usage) {
      appendUsage(ctx.state, 'anthropic/claude-haiku-4-5', classification.usage);
    }

    const intent = classification.text.trim().toUpperCase();
    console.log(`[PRESET ROUTER] Classified intent: ${intent}`);

    if (intent.includes('QUERY')) {
      // Route to Query Agent
      console.log('[PRESET ROUTER] Routing to /query');
      const queryType = prompt.includes('internal')
        ? 'internal-only'
        : prompt.includes('tag')
          ? 'by-tag'
          : prompt.includes('id')
            ? 'by-id'
            : 'all';
      const result = await ctx.next.callAgent('/query', {
        queryType,
        targetId: prompt,
      });

      if ((result as any).ok) {
        const data = (result as any).data;
        return {
          code: `// Query Results:\n${JSON.stringify(data.presets, null, 2)}`,
          metadata: {
            id: 'query-task',
            title: 'Query Complete',
            description: `Found ${data.count} presets.`,
          },
        };
      }
      throw new Error('Query failed');
    } else if (intent.includes('INDEX')) {
      // Route to Indexing Agent
      console.log('[PRESET ROUTER] Routing to /index');
      const scope = prompt.includes('change')
        ? 'changes'
        : prompt.includes('file')
          ? 'fs'
          : prompt.includes('db')
            ? 'db'
            : 'all';

      const result = await ctx.next.callAgent('/index', { scope });

      if ((result as any).ok) {
        const data = (result as any).data;
        console.log(`[PRESET ROUTER] Indexing complete: ${data.count} presets`);
        return {
          code: `// Indexing Task Complete.\n// Scope: ${scope}\n// Count: ${data.count}\n// Message: ${data.message}`,
          metadata: {
            id: 'indexing-task',
            title: 'Indexing Report',
            description: data.message,
          },
        };
      } else {
        throw new Error('Indexing failed');
      }
    } else {
      // Route to Generation Agent (with ESLint validation loop)
      console.log(
        '[PRESET ROUTER] Routing to /generate (includes lint checking and auto-fix)',
      );
      const result = await ctx.next.callAgent('/generate', {
        prompt,
        metadata,
        clientId,
      });

      if ((result as any).ok) {
        console.log(
          '[PRESET ROUTER] Generation complete (all validations passed)',
        );
        return (result as any).data;
      } else {
        console.error(
          '[PRESET ROUTER] Generation failed:',
          (result as any).error,
        );
        throw new Error('Generation failed');
      }
    }
  })
  .actAsTool('/', {
    id: 'preset',
    name: 'Preset Agent',
    description:
      'Main entry point. Routes to either Generation or Indexing of presets based on user intent.',
    inputSchema: z.object({
      prompt: z.string(),
      metadata: z.any().optional(),
      clientId: z.string().optional(),
    }),
    outputSchema: z.any(), // Dynamic output based on sub-agent
    metadata: { title: 'Preset Agent', icon: 'hub' },
  });
