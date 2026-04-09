import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { trackUsage } from '@/app/ai/lib/trackUsage';

const aiRouter = new AiRouter();

function normalizeCompletion(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:()[\]{}"'`]+/g, '');
}

export const autocompleteAgent = aiRouter
  .agent('/', async (ctx) => {
    try {
      const params = ctx.request.params as {
        prefix?: string;
        suffix?: string;
        fileName?: string;
        writepadRules?: string;
        previousSuggestion?: string;
      };

      // 300 chars before cursor gives tight local context without noise.
      const prefix = (params.prefix ?? '').slice(-300);
      const suffix = (params.suffix ?? '').slice(0, 150);
      const fileName = params.fileName ?? 'untitled.md';
      const writepadRules = params.writepadRules ?? null;
      const previousSuggestion = (params.previousSuggestion ?? '').trim() || null;
      const previousNormalized = previousSuggestion
        ? normalizeCompletion(previousSuggestion)
        : '';
      const projectId = (ctx.state.projectId as string | undefined) ?? undefined;
      const clientId = (ctx.state.clientId as string | undefined) ?? undefined;
      const modelId = 'gemini-flash-latest';

      if (prefix.trim().length < 8) return { completion: '' };

      const lastChar = prefix.slice(-1);
      const midWord = /[a-zA-Z0-9']/.test(lastChar);
      const endsWithSpace = /\s$/.test(prefix);
      const endsWithPunct = /[.!?]\s*$/.test(prefix);

      let joinHint: string;
      if (midWord) {
        joinHint =
          'The cursor is INSIDE a word. Your output is the REST of that word (no leading space), then continue the sentence.';
      } else if (endsWithPunct) {
        joinHint =
          'The cursor is after sentence-ending punctuation. Start a NEW sentence that follows naturally.';
      } else if (endsWithSpace) {
        joinHint =
          'The cursor is after a space. Output the next word(s) — do NOT add a leading space.';
      } else {
        joinHint =
          'Continue directly from the cursor with no leading space unless grammar requires one.';
      }

      const suffixPreview = suffix.slice(0, 40).trim();
      const suffixHint = suffixPreview
        ? `Text immediately AFTER cursor: "${suffixPreview}" — do NOT output that; your text goes before it.`
        : '';

      const rulesBlock = writepadRules
        ? `\n\nPROJECT STYLE RULES (always follow):\n${writepadRules}`
        : '';

      const blockedSuggestions = new Set<string>();
      if (previousSuggestion) blockedSuggestions.add(previousSuggestion);

      let selectedCompletion = '';
      let lastUsage: unknown = undefined;
      const maxAttempts = previousSuggestion ? 4 : 1;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const avoidList = Array.from(blockedSuggestions);
        const avoidBlock = avoidList.length
          ? `\n\nForbidden previous suggestions (MUST NOT repeat any of these exactly):\n${avoidList
              .map((s) => `- "${s}"`)
              .join('\n')}\n\nWhen regenerating, use a DIFFERENT wording and do not start with the same first 3 words as a forbidden suggestion.`
          : '';

        const { text, usage } = await generateText({
          model: google('gemini-flash-latest'),
          maxOutputTokens: 60,
          temperature: previousSuggestion
            ? Math.min(1.2, 0.9 + attempt * 0.1)
            : 0.7,
          providerOptions: {
            google: { thinkingConfig: { thinkingBudget: 0 } },
          },
          prompt: `You are an inline autocomplete engine for a creative writing editor.
Output ONLY the text to insert at [CURSOR] — nothing else, no explanation, no quotes.

RULES:
- Length: 4–20 words maximum. Stop at the end of one natural phrase or sentence.
- Continuity: your output is spliced DIRECTLY at [CURSOR]. The characters before it flow straight into your first character.
- Voice: match the author's style, tense, and vocabulary exactly.
- Never output text that repeats what is already before [CURSOR].
- Never output text that duplicates what comes after [CURSOR].${rulesBlock}${avoidBlock}

File: ${fileName}

--- DOCUMENT CONTEXT ---
${prefix}[CURSOR]${suffix}
--- END CONTEXT ---

${joinHint}
${suffixHint}`,
        });
        trackUsage({ modelId, projectId, clientId, rawUsage: usage }).catch(
          (error) =>
            console.error('[editor/autocomplete] usage tracking failed', error),
        );

        lastUsage = usage;
        const completion = text
          .replace(/^```[\w]*\n?/, '')
          .replace(/\n?```$/, '')
          .trimEnd();
        if (!completion) continue;

        const normalized = normalizeCompletion(completion);
        const isRepeated =
          normalized.length > 0 &&
          (normalized === previousNormalized ||
            Array.from(blockedSuggestions).some(
              (s) => normalizeCompletion(s) === normalized,
            ));

        if (!isRepeated) {
          selectedCompletion = completion;
          break;
        }

        blockedSuggestions.add(completion);
      }

      console.log('[editor/autocomplete] finish', {
        fileName,
        usage: lastUsage,
        regenerated: previousSuggestion != null,
        completionChanged:
          previousSuggestion == null
            ? undefined
            : normalizeCompletion(selectedCompletion) !== previousNormalized,
      });

      return { completion: selectedCompletion };
    } catch (error) {
      console.error('[editor/autocomplete] error', error);
      return { completion: '' };
    }
  })
  .actAsTool('/', {
    id: 'editor_autocomplete',
    name: 'Editor Autocomplete',
    description: 'Generate a short inline completion near the current cursor.',
    inputSchema: z.object({
      prefix: z.string().optional(),
      suffix: z.string().optional(),
      fileName: z.string().optional(),
      writepadRules: z.string().optional(),
      previousSuggestion: z.string().optional(),
    }) as any,
    outputSchema: z.object({
      completion: z.string(),
    }) as any,
    metadata: { title: 'Editor Autocomplete', hideUI: false },
  });
