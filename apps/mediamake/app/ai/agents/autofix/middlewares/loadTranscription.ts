import { AiMiddleware } from '@microfox/ai-router';
import { getDatabase } from '@/lib/mongodb';
import { CaptionsDocument, Transcription } from '@/app/types/transcription';
import { ObjectId } from 'mongodb';

/**
 * Middleware to load transcription data for autofix agents
 */
export const loadTranscription: AiMiddleware<any, any, any, any, any> = async (
  props,
  next,
) => {
  const { transcriptionId, captionId } = props.request.params;

  // Caption autofix loads the captions collection itself. Skip this middleware
  // when the caller only passed a caption id.
  if (!transcriptionId) {
    if (captionId) return next();
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

/**
 * Load a captions document. transcriptionId, when present, is only used to
 * attach the source audio URL for later passes.
 */
export const loadCaption: AiMiddleware<any, any, any, any, any> = async (
  props,
  next,
) => {
  const { captionId, transcriptionId } = props.request.params;

  if (!captionId || !ObjectId.isValid(captionId)) {
    throw new Error('Invalid input: captionId is required');
  }

  const db = await getDatabase();
  const doc = await db
    .collection<CaptionsDocument>('captions')
    .findOne({ _id: new ObjectId(captionId) });

  if (!doc) {
    throw new Error('Captions not found');
  }

  if (!doc.captions || doc.captions.length === 0) {
    throw new Error('No captions found');
  }

  props.state.captionDocument = doc;
  props.state.captions = doc.captions;

  if (transcriptionId && ObjectId.isValid(transcriptionId)) {
    const transcription = await db
      .collection<Transcription>('transcriptions')
      .findOne({ _id: new ObjectId(transcriptionId) });
    if (transcription) {
      props.state.transcription = transcription;
      props.state.audioUrl = transcription.audioUrl;
    }
  }

  return next();
};

