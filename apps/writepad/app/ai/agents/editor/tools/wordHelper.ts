import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { trackUsage } from '@/app/ai/lib/trackUsage';

const AGENT_PROMPTS: Record<string, string> = {
  synonyms:
    'List 8-12 single-word synonyms for "{word}" as used in this writing context. Vary tone and strength.',
  rhymes:
    'List 8-12 words that rhyme with "{word}". Include near-rhymes. Prefer words that could fit in a literary context.',
  antonyms:
    'List 6-8 single-word antonyms (opposite meaning) for "{word}" as used in this context.',
  stronger:
    'List 8-10 stronger, more powerful, or more vivid single-word alternatives for "{word}". Prioritise impact and precision.',
  simpler:
    'List 6-8 simpler, more common, or more accessible single-word alternatives for "{word}". Prefer plain English.',
  formal:
    'List 6-8 more formal, elevated, or literary single-word alternatives for "{word}" suitable for serious or academic writing.',
  casual:
    'List 6-8 more casual, conversational, or colloquial single-word alternatives for "{word}".',
  descriptors:
    'List 8-12 adjectives or descriptive words that vividly describe or characterise "{word}" in this context.',
  related:
    'List 8-12 single words semantically related to "{word}" - words in the same conceptual family, domain, or field.',
  emotional:
    'List 6-8 more emotionally charged, evocative, or resonant single-word alternatives for "{word}".',
  metaphors:
    'List 5-7 short metaphorical phrases or figurative alternatives for "{word}" (e.g. "heart of stone", "blinding light"). Each item should be 1-4 words.',
  alliterative:
    'List 6-10 single-word alternatives for "{word}" that start with the same letter ("{firstLetter}"). They should fit the context and tone.',
};

const aiRouter = new AiRouter();

export const wordHelperAgent = aiRouter
  .agent('/', async (ctx) => {
    let agent = 'synonyms';
    try {
    const params = ctx.request.params as {
      word?: string;
      context?: string;
      agent?: string;
      writepadRules?: string;
    };

    const word = (params.word ?? '').trim();
    const context = (params.context ?? '').slice(0, 400);
    agent = (params.agent ?? 'synonyms').trim();
    const writepadRules = (params.writepadRules ?? '').trim() || null;
    const projectId = (ctx.state.projectId as string | undefined) ?? undefined;
    const clientId = (ctx.state.clientId as string | undefined) ?? undefined;
    const modelId = 'gemini-flash-latest';

    if (!word) return { suggestions: [] as string[] };

    const promptTemplate = AGENT_PROMPTS[agent] ?? AGENT_PROMPTS.synonyms;
    const agentPrompt = promptTemplate
      .replace(/\{word\}/g, word)
      .replace(/\{firstLetter\}/g, word[0]?.toUpperCase() ?? '');

    const contextBlock = context
      ? `\n\nWriting context (surrounding text):\n"…${context}…"`
      : '';

    const rulesBlock = writepadRules
      ? `\n\nProject style rules (follow these when choosing words):\n${writepadRules}`
      : '';

    const { text, usage } = await generateText({
      model: google('gemini-flash-latest'),
      maxOutputTokens: 200,
      temperature: 0.75,
      providerOptions: {
        google: { thinkingConfig: { thinkingBudget: 0 } },
      },
      prompt: `You are a writing assistant helping a creative writer find the best word choices.
${agentPrompt}${contextBlock}${rulesBlock}

Return ONLY a JSON array of strings - no explanation, no markdown, no code fences.
Example: ["word1","word2","word3"]`,
    });
    trackUsage({ modelId, projectId, clientId, rawUsage: usage }).catch(
      (error) => console.error('[editor/word-helper] usage tracking failed', error),
    );

    const raw = text.trim().replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
    let suggestions: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        suggestions = parsed
          .map((s) => String(s).trim())
          .filter((s) => s.length > 0)
          .slice(0, 14);
      }
    } catch {
      suggestions = raw
        .replace(/[\[\]"]/g, '')
        .split(/[,\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length < 40)
        .slice(0, 14);
    }

    console.log('[editor/word-helper]', { agent, word, count: suggestions.length });
      return { suggestions };
    } catch (error) {
      console.error('[editor/word-helper] error', { agent, error });
      return { suggestions: [] as string[] };
    }
  })
  .actAsTool('/', {
    id: 'editor_word_helper',
    name: 'Editor Word Helper',
    description: 'Return contextual word suggestions for the selected helper mode.',
    inputSchema: z.object({
      word: z.string().optional(),
      context: z.string().optional(),
      agent: z.string().optional(),
      writepadRules: z.string().optional(),
    }) as any,
    outputSchema: z.object({
      suggestions: z.array(z.string()),
    }) as any,
    metadata: { title: 'Editor Word Helper', hideUI: false },
  });
