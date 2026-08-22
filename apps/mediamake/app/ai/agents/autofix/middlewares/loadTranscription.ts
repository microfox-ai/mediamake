import { AiMiddleware } from '@microfox/ai-router';
import { getDatabase } from '@/lib/mongodb';
import { Transcription } from '@/app/types/transcription';
import { ObjectId } from 'mongodb';

/**
 * Middleware to load transcription data for autofix agents
 */
export const loadTranscription: AiMiddleware<any, any, any, any, any> = async (
  props,
  next,
) => {
  const { transcriptionId } = props.request.params;

  if (!transcriptionId) {
    throw new Error('Invalid input: transcriptionId is required');
  }

  // Get database connection
  const db = await getDatabase();
  const collection = db.collection<Transcription>('transcriptions');

  // Find transcription by ID
  const transcription = await collection.findOne({
    _id: new ObjectId(transcriptionId),
  });

  if (!transcription) {
    throw new Error('Transcription not found');
  }

  if (!transcription.captions || transcription.captions.length === 0) {
    throw new Error('No captions found in transcription');
  }

  // Store transcription in context state.
  //
  // `captions` is the live state: every autofix run, and every manual edit,
  // writes there. `step1.processedCaptions` is a snapshot taken once when the
  // transcription was created and never updated again — reading it first meant
  // each fixer silently started from the raw ElevenLabs chunking and saved that
  // back, discarding whatever the previous fixer had done. It stays only as a
  // fallback for documents whose `captions` never got populated.
  props.state.transcription = transcription;
  props.state.captions =
    transcription.captions?.length > 0
      ? transcription.captions
      : transcription.processingData?.step1?.processedCaptions;

  return next();
};

