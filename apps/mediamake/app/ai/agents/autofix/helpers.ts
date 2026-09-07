import { getDatabase } from '@/lib/mongodb';
import { Transcription } from '@/app/types/transcription';
import { ObjectId } from 'mongodb';
import { detectSegmentationChanges } from './lib/segmentation';

/**
 * Formats captions into the required word[absoluteStart-absoluteEnd] format
 */
export function formatCaptionsForAI(captions: any[]): string {
  return captions
    .map(caption => {
      const words = caption.words
        .map(
          (word: any) =>
            `${word.text}[${word.absoluteStart.toFixed(2)}-${word.absoluteEnd.toFixed(2)}]`,
        )
        .join('<$>');
      return `-${words}`;
    })
    .join('\n');
}

/**
 * Parses AI output back to caption structure
 */
export function parseAIOutputToCaptions(
  aiOutput: string,
  originalCaptions: any[],
): any[] {
  const lines = aiOutput.trim().split('\n');
  const parsedCaptions: any[] = [];

  lines.forEach((line, captionIndex) => {
    if (line.startsWith('-')) {
      const wordsText = line.substring(1); // Remove the leading dash
      const wordParts = wordsText.split('<$>');
      const words: any[] = [];
      let firstWordStart = 0;

      wordParts.forEach((wordPart, wordIndex) => {
        const match = wordPart.match(/^(.+?)\[([\d.]+)-([\d.]+)\]$/);
        if (match) {
          const [, text, start, end] = match;
          if (wordIndex === 0) {
            firstWordStart = parseFloat(start);
          }
          words.push({
            id: `caption-${captionIndex}-word-${wordIndex}`,
            text: text.trim(),
            start: parseFloat(start) - firstWordStart,
            absoluteStart: parseFloat(start),
            end: parseFloat(end) - firstWordStart,
            absoluteEnd: parseFloat(end),
            duration: parseFloat(end) - parseFloat(start),
            confidence: 0.9, // Default confidence
          });
        }
      });

      if (words.length > 0) {
        const caption = originalCaptions[captionIndex] || {};
        parsedCaptions.push({
          id: caption.id || `caption-${captionIndex}`,
          text: words.map(w => w.text).join(' '),
          start: words[0].start,
          absoluteStart: words[0].absoluteStart,
          end: words[words.length - 1].absoluteEnd,
          absoluteEnd: words[words.length - 1].absoluteEnd,
          duration:
            words[words.length - 1].absoluteEnd - words[0].absoluteStart,
          words: words,
        });
      }
    }
  });

  return parsedCaptions;
}

/**
 * Detects changes between original and fixed captions
 */
export function detectChanges(
  originalCaptions: any[],
  fixedCaptions: any[],
  changeType: string,
): any[] {
  const changes = [];
  const originalText = originalCaptions.map(c => c.text).join(' ');
  const fixedText = fixedCaptions.map(c => c.text).join(' ');

  if (originalText !== fixedText) {
    // For now, create a simple overall change
    // Could be enhanced to show word-level changes
    changes.push({
      type: changeType,
      original: originalText,
      fixed: fixedText,
      confidence: 0.9,
    });
    return changes;
  }

  // Same words, different line boundaries: a re-segmentation. Comparing joined
  // text alone reports "no change" here, which made callers discard real work.
  return detectSegmentationChanges(originalCaptions, fixedCaptions, changeType);
}

/**
 * Save updated transcription to database
 */
export async function saveTranscriptionFix(
  transcriptionId: string,
  fixedCaptions: any[],
  changes: any[],
  agentName: string,
  userRequest?: string,
  userWrittenTranscription?: string,
): Promise<Transcription> {
  const db = await getDatabase();
  const collection = db.collection<Transcription>('transcriptions');

  const transcription = await collection.findOne({
    _id: new ObjectId(transcriptionId),
  });

  if (!transcription) {
    throw new Error('Transcription not found');
  }

  const updatedTranscription = {
    ...transcription,
    captions: fixedCaptions,
    processingData: {
      ...transcription.processingData,
      step2: {
        ...transcription.processingData?.step2,
        aiAutofix: {
          ...(transcription.processingData?.step2?.aiAutofix || {}),
          changes: changes,
          confidence: 0.9,
          summary: `Fixed by ${agentName}`,
          processedAt: new Date().toISOString(),
          agent: agentName,
          userRequest,
          userWrittenTranscription,
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

