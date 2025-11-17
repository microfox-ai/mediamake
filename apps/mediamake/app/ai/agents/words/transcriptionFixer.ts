import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { getDatabase } from '@/lib/mongodb';
import { Transcription } from '@/app/types/transcription';
import dedent from 'dedent';
import { ObjectId } from 'mongodb';

/**
 * Transcription Fixer Agent - /transcription-fixer
 * Fixes transcription errors and improves sentence structure
 */

const aiRouter = new AiRouter();

/**
 * Formats captions into the required word[absoluteStart-absoluteEnd] format
 */
function formatCaptionsForAI(captions: any[]): string {
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
function parseAIOutputToCaptions(
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

export const transcriptionFixerAgent = aiRouter
  .agent('/', async ctx => {
    try {
      console.log('FIXING TRANSCRIPTION ERRORS...');
      ctx.response.writeMessageMetadata({
        loader: 'Fixing transcription errors...',
      });

      const { transcriptionId, userRequest, userWrittenTranscription } = ctx
        .request.params as {
        transcriptionId: string;
        userRequest?: string;
        userWrittenTranscription?: string;
      };

      if (!transcriptionId) {
        console.log('NO TRANSCRIPTION ID FOUND');
        throw new Error('Invalid input: transcriptionId is required');
      }

      // Get database connection
      const db = await getDatabase();
      const collection = db.collection<Transcription>('transcriptions');

      // Find transcription by assemblyId
      const transcription = await collection.findOne({
        _id: new ObjectId(transcriptionId),
      });

      if (!transcription) {
        console.log('TRANSCRIPTION NOT FOUND');
        throw new Error('Transcription not found');
      }

      if (!transcription.captions || transcription.captions.length === 0) {
        console.log('NO CAPTIONS FOUND IN TRANSCRIPTION');
        throw new Error('No captions found in transcription');
      }

      console.log(
        'TRANSCRIPTION CAPTIONS PICKING:',
        transcription.processingData.step1?.processedCaptions.length,
        transcription.captions.length,
      );

      // Format captions for AI processing
      const formattedCaptions = formatCaptionsForAI(
        transcription.processingData.step1?.processedCaptions ??
          transcription.captions ??
          [],
      );

      const systemPrompt = dedent`You are an expert transcription editor specializing in audio-to-text corrections. Your task is to fix transcription errors and improve sentence structure.

Please analyze and fix the following issues:

1. **Word Boundary Issues**: Fix cases where 2 words were merged into 1 or 1 word was split into 2
   - Example: "helloworld" → "hello world"
   - Example: "th e" → "the"

2. **Spelling Mistakes**: Correct obvious spelling errors
   - Example: "recieve" → "receive"
   - Example: "teh" → "the"

3. **Sentence Structure**: Improve readability by:
   - Splitting run-on sentences that don't make sense as one unit
   - LONG scentences are not good, as each scentence is rendered in one screen, so keep each scentence short enough like a subtitle.
   - Merging fragments that belong together
   - Adding appropriate punctuation

4. **Context Awareness**: 
   - Consider the user's request if provided
   - Use the user's written version as reference if available
   - User Witten Version will take precedence over the given transcription.

5. **Timing Preservation**: 
   - Keep all original timing information intact
   - Preserver the original timing as much as possible.

IMPORTANT GUIDELINES:
- Preserve the original word-level timing data, recalculate & optimize when merging or splitting words.
- Sometimes the transcription might have not been fully done & skipped scentences or words, refer user written transcription & approximatley time them in the output.
- MAKE SURE TO NOT MISS OUT ANY WORD given in the userWrittenVersion, if it is there in the transcription, fix it, if it is not there smarlt add it.
- Make sure to split the scentence if you think its too large for display in one screen ( but try your best to not split scentence in mid-flow of a scentence).
- Only fix clear errors, don't change correct content
- Consider the context and user's specific needs
- usally you can ignore words inside brackets if there are any is userWrittenTranscriptions, unless user has requested spceficallly to not ignore.

OUTPUT FORMAT:
Return the fixed captions in the exact same format as the input:
- Each sentence starts with a dash (-)
- Words are separated by <$>
- Each word has timestamps in brackets: word[absoluteStart-absoluteEnd]
- Example: -hello[1.2-1.5]<$>world[1.6-2.0]

Do not include any other text, explanations, or formatting. Only return the corrected captions in the specified format.`;

      const prompt = dedent`TRANSCRIPTION DATA:
${formattedCaptions}

${userRequest ? `USER REQUEST: ${userRequest}` : ''}

${userWrittenTranscription ? `USER'S WRITTEN VERSION: ${userWrittenTranscription}` : ''}`;
      const result = await generateText({
        model: google('gemini-2.5-pro'),
        system: systemPrompt,
        prompt,
        // providerOptions: {
        //   google: {
        //     thinkingConfig: {
        //       thinkingBudget: 8192,
        //       includeThoughts: true,
        //     },
        //   }
        // }
        maxRetries: 2,
      });

      console.log('TRANSCRIPTION FIXER USING', result.usage);

      // Parse the AI output back to caption structure
      const fixedCaptions = parseAIOutputToCaptions(
        result.text,
        transcription.captions,
      );

      // Create a simple changes array based on differences
      const changes = [];
      const originalText = transcription.captions.map(c => c.text).join(' ');
      const fixedText = fixedCaptions.map(c => c.text).join(' ');

      if (originalText !== fixedText) {
        changes.push({
          type: 'word_fix',
          original: originalText,
          fixed: fixedText,
          reason: 'Transcription errors fixed and sentence structure improved',
          confidence: 0.9,
        });
      }

      // Update the transcription with fixed captions
      const updatedTranscription = {
        ...transcription,
        captions: fixedCaptions,
        processingData: {
          ...transcription.processingData,
          autofix: {
            changes: changes,
            confidence: 0.9,
            summary:
              'Transcription errors fixed and sentence structure improved',
            processedAt: new Date().toISOString(),
            userRequest,
            userWrittenTranscription,
          },
        },
        updatedAt: new Date(),
      };

      // Save updated transcription
      await collection.updateOne(
        { _id: transcription._id },
        { $set: updatedTranscription },
      );

      console.log('TRANSCRIPTION FIXED:', updatedTranscription.captions.length);
      return {
        success: true,
        appliedToDatabase: true,
        transcription: updatedTranscription,
        changes: changes,
        confidence: 0.9,
        usage: result.usage,
        summary: 'Transcription errors fixed and sentence structure improved',
      };
    } catch (error) {
      console.error('Error fixing transcription:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'fixTranscription',
    name: 'Fix Transcription Errors',
    description:
      'Fixes transcription errors including word boundary issues, spelling mistakes, and improves sentence structure while preserving timing information. Updates the database directly.',
    inputSchema: z.object({
      transcriptionId: z
        .string()
        .describe('AssemblyAI transcription ID to fix'),
      userRequest: z
        .string()
        .optional()
        .describe('User-specific request for transcription processing'),
      userWrittenTranscription: z
        .string()
        .optional()
        .describe("User's written version for reference"),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      appliedToDatabase: z
        .boolean()
        .describe(
          'Whether the fixes were automatically applied to the database',
        ),
      transcription: z.any(),
      changes: z.array(
        z.object({
          type: z.enum([
            'word_fix',
            'sentence_split',
            'sentence_merge',
            'spelling_fix',
            'punctuation_fix',
          ]),
          original: z.string(),
          fixed: z.string(),
          reason: z.string(),
          confidence: z.number().min(0).max(1),
        }),
      ),
      confidence: z.number().min(0).max(1),
      summary: z.string(),
    }),
    metadata: {
      category: 'transcription',
      tags: [
        'transcription',
        'fix',
        'correction',
        'spelling',
        'structure',
        'database',
      ],
      hidden: true,
      hideUI: true,
    },
  });

export default transcriptionFixerAgent;
