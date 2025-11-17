import { getDatabase } from '@/lib/mongodb';
import { Transcription } from '@/app/types/transcription';

export async function saveTranscriptionMetadata(
  transcription: Transcription,
  sentences: any[],
  transcriptionInfo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  },
  selectedIndices?: number[],
) {
  const db = await getDatabase();
  const collection = db.collection<Transcription>('transcriptions');

  // Update captions with metadata at caption level
  const updatedCaptions = transcription.captions.map(
    (caption: any, index: number) => {
      // If selectedIndices is provided, only update those specific captions
      if (selectedIndices && Array.isArray(selectedIndices)) {
        const selectedIndex = selectedIndices.indexOf(index);
        if (selectedIndex !== -1 && selectedIndex < sentences.length) {
          const resultSentence = sentences[selectedIndex];
          return {
            ...caption,
            metadata: {
              ...(caption.metadata || {}),
              ...(resultSentence?.metadata || {}),
            },
          };
        }
        // Return unchanged if not in selected indices
        return caption;
      }
      
      // Original behavior: update all captions
      const resultSentence = index < sentences.length ? sentences[index] : null;
      return {
        ...caption,
        metadata: {
          ...(caption.metadata || {}),
          ...(resultSentence?.metadata || {}),
        },
      };
    },
  );

  const updatedTranscription = {
    ...transcription,
    captions: updatedCaptions,
    // Update transcription info if available
    ...(transcriptionInfo && {
      title: transcriptionInfo.title,
      description: transcriptionInfo.description,
      keywords: transcriptionInfo.keywords,
    }),
    processingData: {
      ...transcription.processingData,
      step4: {
        ...transcription.processingData?.step4,
        metadata: {
          ...(transcription.processingData?.step4?.metadata || {}),
          ...(transcriptionInfo || {}),
          sentences: updatedCaptions.map(caption => caption.metadata),
          generatedAt: new Date().toISOString(),
        },
      },
    },
    updatedAt: new Date(),
  };

  await collection.updateOne(
    { _id: transcription._id },
    { $set: updatedTranscription },
  );

  return updatedTranscription;
}
