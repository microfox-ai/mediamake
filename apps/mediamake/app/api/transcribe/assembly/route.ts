import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AssemblyAI, Transcript } from 'assemblyai';
import { captionMutator } from '@microfox/datamotion';
import {
  TranscriptionSentenceSchema,
  TranscriptionWordSchema,
} from '@/components/editor/presets/types';
import { generateCaptions } from '../helpers';
import { getDatabase } from '@/lib/mongodb';
import { Transcription } from '@/app/types/transcription';

// --- AssemblyAI Schemas ---
const AssemblyAIWordSchema = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
  confidence: z.number(),
});

const AssemblyAIUtteranceSchema = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
  words: z.array(AssemblyAIWordSchema),
});

// --- Request/Response Schemas ---
const TranscriptionRequestSchema = z.object({
  audioUrl: z.string().startsWith('https://'),
  language: z.string().optional(),
  tags: z.array(z.string()).optional(),
  title: z.string().optional(),
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
type AssemblyAIWord = z.infer<typeof AssemblyAIWordSchema>;
type AssemblyAIUtterance = z.infer<typeof AssemblyAIUtteranceSchema>;
type Word = z.infer<typeof TranscriptionWordSchema>;
type Caption = z.infer<typeof TranscriptionSentenceSchema>;
type TranscriptionRequest = z.infer<typeof TranscriptionRequestSchema>;

/**
 * Transcribes an audio file using AssemblyAI.
 */
async function transcribeAudio(
  audioUrl: string,
  language?: string,
): Promise<
  Partial<{
    captions: Caption[];
    id: string;
    language_code: string;
    transcript: Transcript;
  }>
> {
  const assemblyAIKey = process.env.ASSEMBLYAI_API_KEY ?? '';

  if (!assemblyAIKey) {
    throw new Error('AssemblyAI API key is required.');
  }

  const client = new AssemblyAI({ apiKey: assemblyAIKey });

  try {
    console.log(`Starting AssemblyAI transcription for: ${audioUrl}`);

    const params: any = {
      audio: audioUrl,
      speech_model: 'universal',
      speaker_labels: true,
    };

    if (language) {
      if (language === 'auto') {
        params.language_detection = true;
        console.log('Using language detection');
      } else {
        params.language_code = language;
        console.log(`Using language hint: ${language}`);
      }
    }

    const transcript = await client.transcripts.transcribe(params);

    if (transcript.status === 'error') {
      throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
    }

    if (!transcript.utterances) {
      throw new Error(
        'Utterance data is missing from the AssemblyAI response.',
      );
    }

    console.log('Successfully received transcription from AssemblyAI');

    const captions = generateCaptions(transcript.utterances);

    // Validate the output with Zod before returning
    return {
      id: transcript.id,
      language_code: transcript.language_code,
      captions: captions,
      transcript: transcript,
    };
  } catch (error) {
    console.error('An error occurred during AssemblyAI transcription:', error);
    throw new Error('Failed to transcribe audio with AssemblyAI.');
  }
}

export const POST = async (req: NextRequest) => {
  try {
    const clientId = req.headers.get('x-client-id') || undefined;
    // Parse and validate request body
    const body = await req.json();
    const validatedRequest = TranscriptionRequestSchema.parse(body);

    const { audioUrl, language, tags, title } = validatedRequest;
    const trimmedTitle = title?.trim() || undefined;

    // Perform transcription
    const { captions, id, language_code, transcript } = await transcribeAudio(
      audioUrl,
      language,
    );

    const db = await getDatabase();
    const collection = db.collection<Transcription>('transcriptions');

    const existing = await collection.findOne({ assemblyId: id });
    if (existing) {
      if (trimmedTitle && existing.title !== trimmedTitle) {
        await collection.updateOne(
          { _id: existing._id },
          { $set: { title: trimmedTitle, updatedAt: new Date() } },
        );
        existing.title = trimmedTitle;
      }
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
      ...(trimmedTitle ? { title: trimmedTitle } : {}),
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

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  const assemblyAIKey = process.env.ASSEMBLYAI_API_KEY ?? '';
  const client = new AssemblyAI({ apiKey: assemblyAIKey });

  if (!id) {
    const allTranscripts = await client.transcripts.list();
    return NextResponse.json({ transcripts: allTranscripts }, { status: 200 });
  }

  const transcript = await client.transcripts.get(id);

  if (!transcript) {
    return NextResponse.json(
      { error: 'Transcript not found.' },
      { status: 404 },
    );
  }
  if (!transcript.utterances) {
    return NextResponse.json(
      { error: 'Utterance data is missing from the AssemblyAI response.' },
      { status: 400 },
    );
  }

  const captions = generateCaptions(transcript.utterances);
  return NextResponse.json({
    id,
    language_code: transcript.language_code,
    success: true,
    captions,
    audio_url: transcript.audio_url,
  });
};
