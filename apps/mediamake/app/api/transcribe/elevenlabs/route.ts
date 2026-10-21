import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ElevenLabsClient } from 'elevenlabs';
import {
  TranscriptionSentenceSchema,
  TranscriptionWordSchema,
} from '@/components/editor/presets/types';
import { getDatabase } from '@/lib/mongodb';
import { Transcription } from '@/app/types/transcription';
import { attachProvidedTranscription } from '../provided-transcription';

// Increase route execution time for TTS generation (especially v3 model)
export const maxDuration = 180; // 180 seconds = 3 minutes

// --- ElevenLabs Schemas ---
const ElevenLabsRequestSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  voiceId: z.string().min(1, 'Voice ID is required'),
  modelId: z.string().default('eleven_flash_v2_5'),
  outputFormat: z.string().default('mp3_44100_128'),
  language: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// --- Types ---
type Word = z.infer<typeof TranscriptionWordSchema>;
type Caption = z.infer<typeof TranscriptionSentenceSchema>;
type ElevenLabsRequest = z.infer<typeof ElevenLabsRequestSchema>;

interface ElevenLabsAlignment {
  characters: string[];
  character_start_times: number[];
  character_end_times: number[];
}

/**
 * Convert ElevenLabs character-level timing to word-level timing
 */
function extractWordsFromCharacterTimings(
  alignment: ElevenLabsAlignment,
): Array<{ text: string; start: number; end: number }> {
  const { characters, character_start_times, character_end_times } = alignment;

  if (!characters || !character_start_times || !character_end_times) {
    return [];
  }

  const words: Array<{ text: string; start: number; end: number }> = [];
  let currentWord = '';
  let wordStartTime: number | null = null;
  let wordEndTime: number | null = null;

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];

    if (char.trim()) {
      // Non-whitespace character
      if (wordStartTime === null) {
        wordStartTime = character_start_times[i];
      }
      currentWord += char;
      wordEndTime = character_end_times[i];
    } else {
      // Whitespace - end of word
      if (currentWord && wordStartTime !== null && wordEndTime !== null) {
        words.push({
          text: currentWord,
          start: wordStartTime,
          end: wordEndTime,
        });
        currentWord = '';
        wordStartTime = null;
        wordEndTime = null;
      }
    }
  }

  // Add the last word if exists
  if (currentWord && wordStartTime !== null && wordEndTime !== null) {
    words.push({
      text: currentWord,
      start: wordStartTime,
      end: wordEndTime,
    });
  }

  return words;
}

/**
 * Group words into subtitle-friendly sentences/captions
 * Following the same logic as AssemblyAI generateCaptions
 */
function groupWordsIntoSentences(
  words: Array<{ text: string; start: number; end: number }>,
  maxCharsPerSentence: number = 50,
  maxWordsPerSentence: number = 7,
): Caption[] {
  if (words.length === 0) return [];

  const sentences: Caption[] = [];
  let currentChunk: Array<{ text: string; start: number; end: number }> = [];
  let currentLength = 0;

  for (const word of words) {
    const newLength =
      currentLength + word.text.length + (currentChunk.length > 0 ? 1 : 0);

    // Check if adding this word would exceed limits
    if (
      (currentChunk.length >= maxWordsPerSentence ||
        newLength > maxCharsPerSentence) &&
      currentChunk.length > 0
    ) {
      // Save current chunk as a sentence
      sentences.push(createSentenceFromWords(currentChunk, sentences.length));
      currentChunk = [];
      currentLength = 0;
    }

    // Add word to current chunk
    currentChunk.push(word);
    currentLength += word.text.length + (currentChunk.length > 1 ? 1 : 0);
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    sentences.push(createSentenceFromWords(currentChunk, sentences.length));
  }

  return sentences;
}

/**
 * Create a Caption (sentence) from a group of words
 * Matches the format from generateCaptions in helpers.ts
 */
function createSentenceFromWords(
  words: Array<{ text: string; start: number; end: number }>,
  sentenceIndex: number,
): Caption {
  const sentenceStart = words[0].start;
  const sentenceEnd = words[words.length - 1].end;
  const sentenceText = words.map(w => w.text).join(' ');

  // Convert words to TranscriptionWord format
  const transcriptionWords: Word[] = words.map((word, wordIndex) => ({
    id: `caption-${sentenceIndex}-word-${wordIndex}`,
    text: word.text,
    start: word.start - sentenceStart, // Relative to sentence start
    absoluteStart: word.start, // Absolute time
    end: word.end - sentenceStart, // Relative to sentence start
    absoluteEnd: word.end, // Absolute time
    duration: word.end - word.start,
    confidence: 1.0, // TTS has perfect confidence
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

/**
 * Generate speech with timing information using ElevenLabs
 */
async function generateSpeechWithTiming(
  text: string,
  voiceId: string,
  modelId: string,
  outputFormat: string,
): Promise<{
  audioBase64: string;
  captions: Caption[];
}> {
  const apiKey = process.env.ELEVENLABS_API_KEY ?? '';

  if (!apiKey) {
    throw new Error('ElevenLabs API key is required.');
  }

  const client = new ElevenLabsClient({
    apiKey,
    // timeoutInSeconds: 180, // Increase timeout to 180 seconds for v3 and longer texts
  });

  try {
    console.log(`Generating speech with ElevenLabs for voice: ${voiceId}`);

    // Generate speech with timestamps
    const response = await client.textToSpeech.convertWithTimestamps(voiceId, {
      text,
      model_id: modelId,
      output_format: outputFormat as any,
    });

    console.log('Successfully received speech and timing from ElevenLabs');

    // Extract alignment data
    const alignment = response.alignment;
    if (!alignment) {
      throw new Error('No alignment data received from ElevenLabs');
    }

    // Convert character timings to word timings
    const words = extractWordsFromCharacterTimings({
      characters: alignment.characters || [],
      character_start_times: alignment.character_start_times_seconds || [],
      character_end_times: alignment.character_end_times_seconds || [],
    });

    console.log(`Extracted ${words.length} words from character timings`);

    // Group words into sentences/captions
    const captions = groupWordsIntoSentences(words);

    console.log(`Generated ${captions.length} caption segments`);

    return {
      audioBase64: response.audio_base64 || '',
      captions,
    };
  } catch (error) {
    console.error('An error occurred during ElevenLabs TTS:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `Failed to generate speech with ElevenLabs: ${errorMessage}`,
    );
  }
}

export const POST = async (req: NextRequest) => {
  try {
    const clientId = req.headers.get('x-client-id') || undefined;

    // Parse and validate request body
    const body = await req.json();
    const validatedRequest = ElevenLabsRequestSchema.parse(body);

    const { text, voiceId, modelId, outputFormat, language, tags } =
      validatedRequest;

    // Generate speech with timing
    const { audioBase64, captions } = await generateSpeechWithTiming(
      text,
      voiceId,
      modelId,
      outputFormat,
    );

    console.log('Preparing to save transcription to database');

    // Save to database
    const db = await getDatabase();
    const collection = db.collection<Transcription>('transcriptions');

    // Generate a unique ID for this TTS generation
    const assemblyId = `elevenlabs-${Date.now()}`;

    // Check if it already exists (shouldn't happen with timestamp)
    const existing = await collection.findOne({ assemblyId });
    if (existing) {
      return NextResponse.json(
        {
          success: true,
          transcription: existing,
        },
        { status: 200 },
      );
    }

    const now = new Date();
    const transcription: Omit<Transcription, '_id'> = attachProvidedTranscription(
      {
        clientId,
        assemblyId,
        audioUrl: audioBase64, // Temporary - will be replaced with S3 URL
        language: language || 'en',
        status: 'completed',
        tags: tags || [],
        captions: captions || [],
        processingData: {
          step1: {
            rawText: text,
            processedCaptions: captions,
            source: 'elevenlabs-tts',
            voiceId,
            modelId,
            generatedAt: now.toISOString(),
          },
        },
        createdAt: now,
        updatedAt: now,
      },
      text.trim() || undefined,
    );

    const result = await collection.insertOne(transcription);
    const createdTranscription = await collection.findOne({
      _id: result.insertedId,
    });

    console.log('Transcription saved to database');

    // Return the transcription data along with audio base64 for client-side S3 upload
    const response = {
      success: true,
      audioBase64,
      captions,
      language: language || 'en',
      text,
      transcription: createdTranscription,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${error.issues.map(e => e.message).join(', ')}`,
        },
        { status: 400 },
      );
    }

    // Handle other errors
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
};
