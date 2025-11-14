import { AiMiddleware } from '@microfox/ai-router';
import { getDatabase } from '@/lib/mongodb';
import { Transcription } from '@/app/types/transcription';
import { ObjectId } from 'mongodb';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { TranscriptionInfoSchema } from '../zod';
import dedent from 'dedent';

export const loadTranscription: AiMiddleware<any, any, any, any, any> = async (
  props,
  next,
) => {
  const { transcriptionId, userRequest, selectedIndices } = props.request.params;

  if (!transcriptionId) {
    throw new Error('transcriptionId is required');
  }

  // Get database connection
  const db = await getDatabase();
  const collection = db.collection<Transcription>('transcriptions');

  // Find transcription by _id
  const transcription = await collection.findOne({
    _id: new ObjectId(transcriptionId),
  });

  if (!transcription) {
    throw new Error('Transcription not found');
  }

  if (!transcription.captions || transcription.captions.length === 0) {
    throw new Error('No captions found in transcription');
  }

  // Filter captions if selectedIndices is provided
  let captionsToProcess = transcription.captions;
  let indicesToProcess: number[] = transcription.captions.map((_, idx) => idx);
  
  if (selectedIndices && Array.isArray(selectedIndices) && selectedIndices.length > 0) {
    // Validate indices
    const validIndices = selectedIndices.filter(
      idx => typeof idx === 'number' && idx >= 0 && idx < transcription.captions.length
    );
    
    if (validIndices.length === 0) {
      throw new Error('No valid caption indices provided');
    }
    
    captionsToProcess = validIndices.map(idx => transcription.captions[idx]);
    indicesToProcess = validIndices;
  }

  // Store transcription in context state
  props.state.transcription = transcription;
  props.state.selectedIndices = indicesToProcess; // Store which indices are being processed
  props.state.metadatas = captionsToProcess.map(
    caption => caption.metadata,
  );
  props.state.sentences = captionsToProcess.map(caption => caption.text);

  // Generate transcription info if no title exists
  let transcriptionInfoObject = undefined;
  if (!transcription.title) {
    try {
      const transcriptionInfoResult = await generateObject({
        model: google('gemini-2.5-flash'),
        schema: TranscriptionInfoSchema as any,
        prompt: dedent`Based on the following transcription content, generate a title, description, and keywords:

Transcription Content:
${props.state.sentences.join(' ')}
${userRequest ? `\nUser Request: ${userRequest}` : ''}

Please provide:
1. A compelling, descriptive title (max 100 characters)
2. A comprehensive description of the content (2-3 sentences, max 300 characters)
3. 5-10 relevant keywords that describe the content (music, narrative, monologue, self-talk, podcast etc...), themes, and topics

Make the title engaging and descriptive. The description should summarize the main content and themes. Keywords should be relevant for search and categorization.
${userRequest ? `Please consider the user's specific request: ${userRequest}` : ''}`,
        maxRetries: 2,
      });
      transcriptionInfoObject = transcriptionInfoResult.object;
      console.log('transcriptionInfoUsage', transcriptionInfoResult.usage);
    } catch (error) {
      console.error('Error generating transcription info:', error);
    }
  }

  // Store transcription info in context state
  props.state.transcriptionInfo = transcriptionInfoObject;

  return next();
};
