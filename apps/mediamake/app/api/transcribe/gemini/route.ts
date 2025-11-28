import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import {
  TranscriptionSentenceSchema,
  TranscriptionWordSchema,
} from '@/components/editor/presets/types';
import { getDatabase } from '@/lib/mongodb';
import { Transcription } from '@/app/types/transcription';
import {
  getAudioMetadata,
  extractAudioAsBase64,
} from '@/app/ai/agents/analysis/audioAnalysisHelpers';
import { processAudioUrl } from '@/lib/s3Helper';
import { captionMutator } from '@microfox/datamotion';

// --- Request/Response Schemas ---
const TranscriptionRequestSchema = z.object({
  audioUrl: z.string().startsWith('https://'),
  language: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const TranscriptionResponseSchema = z.object({
  id: z.string(),
  language_code: z.string(),
  success: z.boolean(),
  captions: z.array(TranscriptionSentenceSchema),
  error: z.string().optional(),
  transcription: z.any().optional(),
});

// --- Types ---
type Word = z.infer<typeof TranscriptionWordSchema>;
type Caption = z.infer<typeof TranscriptionSentenceSchema>;
type TranscriptionRequest = z.infer<typeof TranscriptionRequestSchema>;

// --- Gemini Transcription Schema ---
const GeminiTranscriptionSchema = z.object({
  transcription: z
    .string()
    .describe('The full transcribed text from the audio'),
  segments: z
    .array(
      z.object({
        text: z.string().describe('The text of this segment'),
        start: z.number().describe('Start time in seconds (approximate)'),
        end: z.number().describe('End time in seconds (approximate)'),
        words: z
          .array(
            z.object({
              text: z.string().describe('The word text'),
              start: z.number().describe('Start time in seconds (approximate)'),
              end: z.number().describe('End time in seconds (approximate)'),
            }),
          )
          .optional()
          .describe('Word-level timestamps if available'),
      }),
    )
    .describe('Segments of the transcription with timestamps'),
  language: z.string().optional().describe('Detected language code'),
});

/**
 * Estimates word-level timestamps based on segment timestamps and word count
 */
function estimateWordTimestamps(
  segmentText: string,
  segmentStart: number,
  segmentEnd: number,
): Array<{ text: string; start: number; end: number }> {
  const words = segmentText
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0);
  if (words.length === 0) return [];

  const segmentDuration = segmentEnd - segmentStart;
  const timePerWord = segmentDuration / words.length;

  return words.map((word, index) => ({
    text: word,
    start: segmentStart + index * timePerWord,
    end: segmentStart + (index + 1) * timePerWord,
  }));
}

/**
 * Converts Gemini transcription response to Caption format
 */
function convertGeminiToCaptions(
  geminiResult: z.infer<typeof GeminiTranscriptionSchema>,
  audioDuration: number,
): Caption[] {
  const captions: Caption[] = [];

  geminiResult.segments.forEach((segment, segmentIndex) => {
    // Use word-level timestamps if available, otherwise estimate
    let words: Array<{ text: string; start: number; end: number }>;

    if (segment.words && segment.words.length > 0) {
      words = segment.words.map(word => ({
        text: word.text,
        start: word.start,
        end: word.end,
      }));
    } else {
      words = estimateWordTimestamps(segment.text, segment.start, segment.end);
    }

    // Convert to TranscriptionWord format
    const transcriptionWords: Word[] = words.map((word, wordIndex) => ({
      id: `caption-${segmentIndex}-word-${wordIndex}`,
      text: word.text,
      start: word.start - segment.start, // Relative to segment start
      absoluteStart: word.start, // Absolute time
      end: word.end - segment.start, // Relative to segment start
      absoluteEnd: word.end, // Absolute time
      duration: word.end - word.start,
      confidence: 0.9, // Gemini doesn't provide confidence, use default
    }));

    captions.push({
      id: `caption-${segmentIndex}`,
      text: segment.text,
      start: segment.start,
      absoluteStart: segment.start,
      end: segment.end,
      absoluteEnd: segment.end,
      duration: segment.end - segment.start,
      words: transcriptionWords,
    });
  });

  // Apply caption mutator if needed (like in AssemblyAI route)
  if (captions.length === 1 && captions[0].words.length > 10) {
    const optimized = captionMutator(captions, {
      maxCharactersPerSentence: 50,
      maxSentenceDuration: 2,
      minSentenceDuration: 0.5,
      splitStrategy: 'smart',
    });

    return optimized.map((caption, index) => ({
      ...caption,
      words: caption.words.map((word, wordIndex) => ({
        ...word,
        id: `caption-${index}-word-${wordIndex}`,
      })),
      id: `caption-${index}`,
    }));
  }

  return captions;
}

/**
 * Transcribes an audio file using Google Gemini.
 */
async function transcribeAudio(
  audioUrl: string,
  language?: string,
  clientId?: string,
): Promise<
  Partial<{
    captions: Caption[];
    id: string;
    language_code: string;
    transcript: any;
  }>
> {
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is required.');
  }

  try {
    console.log(`Starting Gemini transcription for: ${audioUrl}`);

    // Step 1: Process audio URL - upload to S3 if needed
    const { url: processedUrl } = await processAudioUrl(
      audioUrl,
      clientId || 'default',
    );

    // Step 2: Get audio metadata
    const audioMetadata = await getAudioMetadata(processedUrl);
    console.log('Audio metadata retrieved:', {
      duration: audioMetadata.duration,
      sampleRate: audioMetadata.sampleRate,
      channels: audioMetadata.channels,
      format: audioMetadata.format,
    });

    // Step 3: Extract audio as base64 for Gemini
    console.log('Extracting audio as base64...');
    const audioBase64 = await extractAudioAsBase64(processedUrl);
    console.log(
      `Audio base64 extracted, length: ${audioBase64.length} characters`,
    );

    // Step 4: Create data URL from base64
    const audioDataUrl = `data:audio/${audioMetadata.format || 'mp3'};base64,${audioBase64}`;

    // Step 5: Transcribe with Gemini
    const model = google('gemini-2.0-flash-exp');
    const prompt = `Transcribe this audio file with word-level timestamps if possible. 
${language && language !== 'auto' ? `The audio is in ${language}.` : 'Detect the language automatically.'}
Provide the transcription in segments with approximate timestamps for each segment and word.
The audio duration is approximately ${audioMetadata.duration} seconds.
Format your response with segments containing:
- text: The transcribed text for this segment
- startTime: Start time in seconds
- endTime: End time in seconds  
- words: Array of words with startTime and endTime for each word`;

    const result = await generateObject({
      model,
      schema: GeminiTranscriptionSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'file',
              data: audioDataUrl,
              mediaType: `audio/${audioMetadata.format || 'mp3'}`,
            },
          ],
        },
      ],
    });

    console.log('Successfully received transcription from Gemini');

    const captions = convertGeminiToCaptions(
      result.object,
      audioMetadata.duration,
    );

    // Generate a unique ID for this transcription
    const transcriptionId = `gemini-${Date.now()}`;

    return {
      id: transcriptionId,
      language_code: result.object.language || 'en',
      captions: captions,
      transcript: result.object,
    };
  } catch (error) {
    console.error('An error occurred during Gemini transcription:', error);
    throw new Error(
      `Failed to transcribe audio with Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      clientId,
    );

    const db = await getDatabase();
    const collection = db.collection<Transcription>('transcriptions');

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
      assemblyId: id as string,
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
    console.error('Transcription error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${error.issues.map((e: any) => e.message).join(', ')}`,
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
