import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { getDatabase } from '@/lib/mongodb';
import type { Transcription, Caption, CaptionWord } from '@/app/types/transcription';
import { saveTranscriptionFix } from '@/app/ai/agents/autofix/helpers';
import { runSentenceStructureFix } from '@/app/ai/agents/autofix/lib/sentenceStructureCore';
import { runSpellingFix } from '@/app/ai/agents/autofix/lib/spellingCore';
import { parseReferenceLyrics } from '@/app/ai/agents/autofix/lib/lyricsReference';
import type { CaptionChange } from '@/app/ai/agents/autofix/lib/segmentation';
import {
  DEFAULT_STRUCTURE_PROFILE_ID,
  STRUCTURE_PROFILE_IDS,
  type SplitDensity,
} from '@/app/ai/agents/autofix/lib/structureProfiles';

// --- Input/Output schemas ---

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_API_KEY ?? '';
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY or GOOGLE_API_KEY is not set');
}

const InputSchema = z.object({
  audioUrl: z.string().url(),
  language: z.string().optional(),
  tags: z.array(z.string()).optional(),
  title: z.string().optional(),
  sunoLyrics: z.string().optional(),
  projectId: z.string().optional().nullable(),
  clientId: z.string().optional(),
  /** Delivery/segmentation profile for the initial caption structure pass. */
  structureStyle: z
    .enum(STRUCTURE_PROFILE_IDS as [string, ...string[]])
    .optional()
    .default(DEFAULT_STRUCTURE_PROFILE_ID),
  /** Override how many caption divisions the chosen style makes. */
  splitDensity: z
    .enum(['auto', 'much-finer', 'finer', 'coarser', 'much-coarser'])
    .optional()
    .default('auto'),
  /** Correct mistranscribed words against `sunoLyrics` before segmenting. */
  applySpellingFix: z.boolean().optional().default(true),
  /** Let the spelling pass delete clearly hallucinated words. */
  allowWordRemoval: z.boolean().optional().default(false),
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

// --- Autofix pipeline (shared engine, see agents/autofix/lib) ---

interface AutofixPipelineOptions {
  structureStyle?: string;
  splitDensity?: SplitDensity;
  sunoLyrics?: string;
  applySpellingFix?: boolean;
  allowWordRemoval?: boolean;
}

/**
 * Spelling first, then structure.
 *
 * Correcting or deleting a word changes a line's character and word count, so
 * segmenting first would leave lines outside the profile's budget. The spelling
 * pass preserves the grouping it is given, which makes it safe to run before the
 * segmentation is decided but wasteful to run after it.
 *
 * The spelling pass is skipped without Suno lyrics: with no reference to check
 * against, an unattended model is as likely to normalise deliberate slang as it
 * is to fix a genuine mishearing.
 */
async function runAutofixPipeline(
  transcriptionId: string,
  captions: Caption[],
  options: AutofixPipelineOptions,
): Promise<{ fixedCaptions: Caption[]; changes: CaptionChange[]; confidence: number }> {
  const reference = options.sunoLyrics
    ? parseReferenceLyrics(options.sunoLyrics)
    : undefined;

  let working = captions;
  const changes: CaptionChange[] = [];
  const confidences: number[] = [];

  if (reference && options.applySpellingFix !== false) {
    console.log('[transcriber.worker] Running spelling autofix', transcriptionId, {
      captionsCount: working.length,
      lyricWords: reference.wordCount,
      allowWordRemoval: options.allowWordRemoval === true,
    });

    const spelling = await runSpellingFix(working, {
      referenceLyrics: reference,
      allowWordRemoval: options.allowWordRemoval === true,
    });

    console.log('[transcriber.worker] Spelling result', {
      proposed: spelling.proposedCount,
      applied: spelling.changes.length,
      rejected: spelling.rejected.length,
      removed: spelling.removedCount,
    });

    working = spelling.fixedCaptions;
    changes.push(...spelling.changes);
    if (spelling.changes.length > 0) confidences.push(spelling.confidence);
  } else if (!reference) {
    console.log(
      '[transcriber.worker] Skipping spelling autofix — no Suno lyrics to check against',
      transcriptionId,
    );
  }

  console.log(
    '[transcriber.worker] Running sentence structure autofix',
    transcriptionId,
    {
      captionsCount: working.length,
      structureStyle: options.structureStyle ?? DEFAULT_STRUCTURE_PROFILE_ID,
      splitDensity: options.splitDensity ?? 'auto',
    },
  );

  const structure = await runSentenceStructureFix(working, {
    structureStyle: options.structureStyle,
    splitDensity: options.splitDensity,
    referenceLyrics: reference?.text,
  });

  console.log('[transcriber.worker] Segmentation result', {
    profile: structure.profile.id,
    usedModel: structure.usedModel,
    wordsPerSecond: Number(structure.wordsPerSecond.toFixed(2)),
    ...structure.stats,
  });

  changes.push(...structure.changes);
  confidences.push(structure.confidence);

  return {
    fixedCaptions: structure.fixedCaptions,
    changes,
    confidence: confidences.length
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : structure.confidence,
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
    
    const parsed = InputSchema.parse(input);
    const {
      audioUrl,
      language,
      tags,
      title,
      sunoLyrics,
      projectId,
      clientId,
      structureStyle,
      splitDensity,
      applySpellingFix,
      allowWordRemoval,
    } = parsed;

    console.log('[transcriber.worker] Handler invoked with input', {
      audioUrl,
      language,
      tags,
      title,
      projectId,
      clientId,
    });

    console.log('sunoLyrics', sunoLyrics?.slice(0, 100));

    const allTags = Array.isArray(tags) ? tags : [];

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
        const autofixResult = await runAutofixPipeline(
          existingId,
          existing.captions ?? [],
          {
            structureStyle,
            splitDensity: splitDensity as SplitDensity,
            sunoLyrics: sunoLyrics?.trim() || existing.sunoLyrics,
            applySpellingFix,
            allowWordRemoval,
          },
        );
        await saveTranscriptionFix(
          existingId,
          autofixResult.fixedCaptions,
          autofixResult.changes,
          'Transcriber autofix (spelling → sentence structure)',
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
        clientId: clientId ?? undefined,
        projectId: projectId ?? undefined,
        assemblyId,
        audioUrl,
        language: language_code,
        status: 'completed',
        tags: allTags,
        title: title?.trim() || undefined,
        sunoLyrics: sunoLyrics?.trim() || undefined,
        captions,
        processingData: {
          step1: {
            rawText: captions.map(c => c.text).join(' '),
            processedCaptions: captions,
            transcript,
            sunoLyrics: sunoLyrics?.trim() || undefined,
            source: 'elevenlabs-stt',
          },
        },
        createdAt: now,
        updatedAt: now,
      };

      const insertResult = await collection.insertOne(transcriptionDoc);
      const transcriptionId = String(insertResult.insertedId);

      // 2. Autofix in-process (no API call): spelling, then sentence structure
      const autofixResult = await runAutofixPipeline(transcriptionId, captions, {
        structureStyle,
        splitDensity: splitDensity as SplitDensity,
        sunoLyrics: sunoLyrics?.trim(),
        applySpellingFix,
        allowWordRemoval,
      });

      await saveTranscriptionFix(
        transcriptionId,
        autofixResult.fixedCaptions,
        autofixResult.changes,
        'Transcriber autofix (spelling → sentence structure)',
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
