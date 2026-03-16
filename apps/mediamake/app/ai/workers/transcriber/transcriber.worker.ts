import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { getDatabase } from '@/lib/mongodb';
import type { Transcription, Caption, CaptionWord } from '@/app/types/transcription';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import dedent from 'dedent';
import {
  formatCaptionsForAI,
  parseAIOutputToCaptions,
  detectChanges,
  saveTranscriptionFix,
} from '@/app/ai/agents/autofix/helpers';

// --- Input/Output schemas ---

const InputSchema = z.object({
  audioUrl: z.string().url(),
  language: z.string().optional(),
  tag: z.string().optional(),
  tags: z.array(z.string()).optional(),
  projectId: z.string().optional().nullable(),
  clientId: z.string().optional().default('default'),
});

const OutputSchema = z.object({
  success: z.boolean(),
  transcriptionId: z.string().nullable(),
  message: z.string().optional(),
  changesCount: z.number().int().nonnegative().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

// --- ElevenLabs STT (inlined from api/transcribe/elevenlabs-stt) ---

type ElevenLabsWord = {
  text: string;
  start: number;
  end: number;
  speaker_id?: string;
};

function createSentenceFromWords(
  words: ElevenLabsWord[],
  sentenceIndex: number,
): Caption {
  const sentenceStart = words[0].start;
  const sentenceEnd = words[words.length - 1].end;
  const sentenceText = words.map(w => w.text).join(' ');

  const transcriptionWords: CaptionWord[] = words.map((word, wordIndex) => ({
    id: `caption-${sentenceIndex}-word-${wordIndex}`,
    text: word.text,
    start: word.start - sentenceStart,
    absoluteStart: word.start,
    end: word.end - sentenceStart,
    absoluteEnd: word.end,
    duration: word.end - word.start,
    confidence: 1.0,
  }));

  return {
    id: `caption-${sentenceIndex}`,
    text: sentenceText,
    start: sentenceStart,
    absoluteStart: sentenceStart,
    end: sentenceEnd,
    absoluteEnd: sentenceEnd,
    duration: sentenceEnd - sentenceStart,
    words: transcriptionWords,
  };
}

function convertElevenLabsToCaption(
  words: ElevenLabsWord[],
  maxWordsPerSentence: number = 7,
  maxCharsPerSentence: number = 50,
): Caption[] {
  if (words.length === 0) return [];

  const sentences: Caption[] = [];
  let currentChunk: ElevenLabsWord[] = [];
  let currentLength = 0;

  for (const word of words) {
    const newLength =
      currentLength + word.text.length + (currentChunk.length > 0 ? 1 : 0);

    if (
      (currentChunk.length >= maxWordsPerSentence ||
        newLength > maxCharsPerSentence) &&
      currentChunk.length > 0
    ) {
      sentences.push(createSentenceFromWords(currentChunk, sentences.length));
      currentChunk = [];
      currentLength = 0;
    }

    currentChunk.push(word);
    currentLength += word.text.length + (currentChunk.length > 1 ? 1 : 0);
  }

  if (currentChunk.length > 0) {
    sentences.push(createSentenceFromWords(currentChunk, sentences.length));
  }

  return sentences;
}

async function transcribeWithElevenLabs(
  audioUrl: string,
  language?: string,
): Promise<{ captions: Caption[]; id: string; language_code: string; transcript: any }> {
  const apiKey = process.env.ELEVENLABS_API_KEY ?? '';
  if (!apiKey) {
    throw new Error('ElevenLabs API key is required.');
  }

  const formData = new FormData();
  formData.append('cloud_storage_url', audioUrl);
  formData.append('model_id', 'scribe_v1');
  if (language && language !== 'auto') {
    formData.append('language_code', language);
  }
  formData.append('speaker_diarization[enabled]', 'true');
  formData.append('speaker_diarization[max_speakers]', '5');
  formData.append('audio_events', 'true');

  console.log('[transcriber.worker] Starting ElevenLabs transcription', {
    audioUrl,
    language,
  });

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      '[transcriber.worker] ElevenLabs API error',
      response.status,
      errorText,
    );
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  console.log('[transcriber.worker] ElevenLabs transcription success', {
    language_code: result.language_code,
    hasWords: Array.isArray(result.words) && result.words.length > 0,
  });
  const wordsData = result.words || [];
  const words: ElevenLabsWord[] = wordsData
    .filter((item: any) => item.type === 'word')
    .map((item: any) => ({
      text: item.text,
      start: item.start,
      end: item.end,
      speaker_id: item.speaker_id,
    }));

  const captions = convertElevenLabsToCaption(words);
  return {
    id: `elevenlabs-${Date.now()}`,
    language_code: result.language_code || language || 'en',
    captions,
    transcript: result,
  };
}

// --- Sentence structure autofix (inlined from autofix/sentenceStructureFixer) ---

const SENTENCE_STRUCTURE_SYSTEM_PROMPT = dedent`You are a sentence structure expert specializing in optimizing transcriptions for subtitle display.

TASK: Improve sentence structure for better readability in subtitles.

RULES:
1. Split run-on sentences that are too long for one subtitle screen
   - Keep each sentence under 50-60 characters ideally
   - Split at natural breaks (commas, conjunctions, pauses)
2. Merge sentence fragments that belong together
3. Ensure each sentence forms a complete, coherent thought
4. Preserve ALL timing information
5. Do NOT fix spelling errors
6. Do NOT change word boundaries
7. Keep the same words in the same order

SUBTITLE OPTIMIZATION:
- Each sentence appears on one screen
- Long sentences reduce readability
- Split at logical breaks: after phrases, before conjunctions
- Aim for 1-2 lines per subtitle (max ~70 characters)

TIMING PRESERVATION:
- Maintain exact word-level timing
- Only reorganize which words belong to which sentence
- Do not modify individual word timings

OUTPUT FORMAT:
Return the corrected captions in the exact same format as input:
- Each sentence starts with a dash (-)
- Words are separated by <$>
- Each word has timestamps in brackets: word[absoluteStart-absoluteEnd]
- Example: -hello[1.2-1.5]<$>world[1.6-2.0]

Do not include any other text, explanations, or formatting. Only return the corrected captions.`;

async function runSentenceStructureAutofix(
  transcriptionId: string,
  captions: Caption[],
): Promise<{ fixedCaptions: Caption[]; changes: any[]; confidence: number }> {
  console.log(
    '[transcriber.worker] Running sentence structure autofix',
    transcriptionId,
    { captionsCount: captions.length },
  );

  const formattedCaptions = formatCaptionsForAI(captions);
  const prompt = dedent`TRANSCRIPTION DATA:
${formattedCaptions}

Optimize sentence structure for subtitle display while preserving all timing.`;

  const result = await generateText({
    model: google('gemini-2.5-pro'),
    system: SENTENCE_STRUCTURE_SYSTEM_PROMPT,
    prompt,
    maxRetries: 2,
  });

  const fixedCaptions = parseAIOutputToCaptions(result.text, captions);
  const changes = detectChanges(captions, fixedCaptions, 'sentence_structure_fix');

  return {
    fixedCaptions,
    changes,
    confidence: 0.85,
  };
}

// --- Worker config and handler ---

export const workerConfig: WorkerConfig = {
  timeout: 900,
  memorySize: 2048,
  group: 'transcriber',
};

export default createWorker<typeof InputSchema, Output>({
  id: 'transcriber',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>) => {
    console.log('[transcriber.worker] Handler invoked with input', input);

    const parsed = InputSchema.parse(input);
    const {
      audioUrl,
      language,
      tag,
      tags,
      projectId,
      clientId = 'default',
    } = parsed;

    const allTags = [
      ...(Array.isArray(tags) ? tags : []),
      ...(tag ? [tag] : []),
    ];

    try {
      console.log('[transcriber.worker] Parsed input', {
        audioUrl,
        language,
        clientId,
        projectId,
        tags: allTags,
      });

      // 1. Transcribe with ElevenLabs (no API call to our app)
      const { captions, id: assemblyId, language_code, transcript } =
        await transcribeWithElevenLabs(audioUrl, language);

      console.log('[transcriber.worker] ElevenLabs result', {
        assemblyId,
        language_code,
        captionsCount: captions.length,
      });

      const db = await getDatabase();
      const collection = db.collection<Transcription>('transcriptions');

      const existing = await collection.findOne({ assemblyId });
      if (existing) {
        console.log(
          '[transcriber.worker] Found existing transcription, applying autofix only',
          { transcriptionId: String(existing._id) },
        );

        const existingId = String(existing._id);
        const autofixResult = await runSentenceStructureAutofix(
          existingId,
          existing.captions ?? [],
        );
        await saveTranscriptionFix(
          existingId,
          autofixResult.fixedCaptions,
          autofixResult.changes,
          'Sentence Structure Fixer',
          undefined,
        );
        return {
          success: true,
          transcriptionId: existingId,
          changesCount: autofixResult.changes.length,
          confidence: autofixResult.confidence,
        };
      }

      const now = new Date();
      const transcriptionDoc: Omit<Transcription, '_id'> = {
        clientId,
        projectId: projectId ?? undefined,
        assemblyId,
        audioUrl,
        language: language_code,
        status: 'completed',
        tags: allTags,
        captions,
        processingData: {
          step1: {
            rawText: captions.map(c => c.text).join(' '),
            processedCaptions: captions,
            transcript,
            source: 'elevenlabs-stt',
          },
        },
        createdAt: now,
        updatedAt: now,
      };

      const insertResult = await collection.insertOne(transcriptionDoc);
      const transcriptionId = String(insertResult.insertedId);

      // 2. Sentence structure autofix in-process (no API call)
      const autofixResult = await runSentenceStructureAutofix(
        transcriptionId,
        captions,
      );

      await saveTranscriptionFix(
        transcriptionId,
        autofixResult.fixedCaptions,
        autofixResult.changes,
        'Sentence Structure Fixer',
        undefined,
      );

      console.log('[transcriber.worker] Autofix completed', {
        transcriptionId,
        changesCount: autofixResult.changes.length,
        confidence: autofixResult.confidence,
      });

      return {
        success: true,
        transcriptionId,
        changesCount: autofixResult.changes.length,
        confidence: autofixResult.confidence,
      };
    } catch (err) {
      console.error('[transcriber.worker] Handler error', err);

      return {
        success: false,
        transcriptionId: null,
        message:
          err instanceof Error ? err.message : 'Unknown error in worker handler',
      };
    }
  },
});
