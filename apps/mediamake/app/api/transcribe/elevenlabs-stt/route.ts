import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  TranscriptionSentenceSchema,
  TranscriptionWordSchema,
} from '@/components/editor/presets/types';
import { getDatabase } from '@/lib/mongodb';
import { Transcription } from '@/app/types/transcription';

// Increase route execution time for longer audio files
export const maxDuration = 300; // 5 minutes

// --- Request Schema ---
const TranscriptionRequestSchema = z.object({
  audioUrl: z.string().startsWith('https://'),
  language: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// --- Types ---
type Word = z.infer<typeof TranscriptionWordSchema>;
type Caption = z.infer<typeof TranscriptionSentenceSchema>;
type TranscriptionRequest = z.infer<typeof TranscriptionRequestSchema>;

/**
 * Convert ElevenLabs word-level timing to caption format
 */
function convertElevenLabsToCaption(
  words: Array<{
    text: string;
    start: number;
    end: number;
    speaker_id?: string;
  }>,
  maxWordsPerSentence: number = 7,
  maxCharsPerSentence: number = 50,
): Caption[] {
  if (words.length === 0) return [];

  const sentences: Caption[] = [];
  let currentChunk: typeof words = [];
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
 */
function createSentenceFromWords(
  words: Array<{
    text: string;
    start: number;
    end: number;
    speaker_id?: string;
  }>,
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
    confidence: 1.0, // ElevenLabs provides high confidence
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
 * Transcribes an audio file using ElevenLabs Scribe v1 (scribe_v1) via REST API.
 * Note: Model ID uses underscore (scribe_v1), not hyphen (scribe-v1).
 */
async function transcribeAudio(
  audioUrl: string,
  language?: string,
): Promise<{
  captions: Caption[];
  id: string;
  language_code: string;
  transcript: any;
}> {
  const apiKey = process.env.ELEVENLABS_API_KEY ?? '';

  if (!apiKey) {
    throw new Error('ElevenLabs API key is required.');
  }

  try {
    console.log(`Starting ElevenLabs STT transcription for: ${audioUrl}`);

    // Prepare form data for ElevenLabs API using cloud_storage_url
    const formData = new FormData();
    formData.append('cloud_storage_url', audioUrl);
    formData.append('model_id', 'scribe_v1'); // Using Scribe v1 (most accurate)

    // Add language if specified
    if (language && language !== 'auto') {
      formData.append('language_code', language);
    }

    // Configure speaker diarization
    formData.append('speaker_diarization[enabled]', 'true');
    formData.append('speaker_diarization[max_speakers]', '5');

    // Enable audio events
    formData.append('audio_events', 'true');

    console.log('Sending request to ElevenLabs STT API...');

    // Call ElevenLabs STT API
    const response = await fetch(
      'https://api.elevenlabs.io/v1/speech-to-text',
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error(
        `ElevenLabs API error: ${response.status} - ${errorText}`,
      );
    }

    const result = await response.json();
    console.log('Successfully received transcription from ElevenLabs');

    // Extract words from the response
    const wordsData = result.words || [];

    // Filter out spacing and audio events, keep only words
    const words = wordsData
      .filter((item: any) => item.type === 'word')
      .map((item: any) => ({
        text: item.text,
        start: item.start,
        end: item.end,
        speaker_id: item.speaker_id,
      }));

    console.log(`Extracted ${words.length} words from transcription`);

    // Group words into captions
    const captions = convertElevenLabsToCaption(words);

    console.log(`Generated ${captions.length} caption segments`);

    return {
      id: `elevenlabs-${Date.now()}`,
      language_code: result.language_code || language || 'en',
      captions,
      transcript: result,
    };
  } catch (error) {
    console.error('An error occurred during ElevenLabs STT:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `Failed to transcribe audio with ElevenLabs: ${errorMessage}`,
    );
  }
}

export const POST = async (req: NextRequest) => {
  try {
    const clientId = req.headers.get('x-client-id') || undefined;

    // Parse and validate request body
    const body = await req.json();
    const validatedRequest = TranscriptionRequestSchema.parse(body);

    const { audioUrl, language, tags } = validatedRequest;

    // Perform transcription
    const { captions, id, language_code, transcript } = await transcribeAudio(
      audioUrl,
      language,
    );

    const db = await getDatabase();
    const collection = db.collection<Transcription>('transcriptions');

    // Check if it already exists
    const existing = await collection.findOne({ assemblyId: id });
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
    const transcription: Omit<Transcription, '_id'> = {
      clientId,
      assemblyId: id,
      audioUrl,
      language: language_code,
      status: 'completed',
      tags: tags || [],
      captions: captions || [],
      processingData: {
        step1: {
          rawText: captions?.map(caption => caption.text).join(' '),
          processedCaptions: captions,
          transcript: transcript,
          source: 'elevenlabs-stt',
        },
      },
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(transcription);
    const createdTranscription = await collection.findOne({
      _id: result.insertedId,
    });

    // Return successful response
    const response = {
      success: true,
      id,
      language_code,
      captions,
      transcription: createdTranscription,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('ElevenLabs STT error:', error);

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
