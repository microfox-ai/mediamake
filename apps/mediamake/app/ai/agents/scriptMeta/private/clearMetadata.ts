// import { AiRouter } from '@microfox/ai-router';
// import { z } from 'zod/v4';
// import { getDatabase } from '@/lib/mongodb';
// import { Transcription } from '@/app/types/transcription';
// import { loadTranscription } from '../middlewares/loadTranscription';

// /**
//  * Clear Metadata Agent - /clear-metadata
//  * Removes all metadata from transcription captions, resetting them to a clean state
//  */

// const aiRouter = new AiRouter();

// // Input schema - only needs transcriptionId
// const ClearMetadataInputSchema = z.object({
//   transcriptionId: z.string().describe('The transcription ID to clear metadata from'),
// });

// // Output schema
// const ClearMetadataOutputSchema = z.object({
//   transcriptionId: z.string(),
//   totalSentences: z.number(),
//   clearedAt: z.string(),
//   message: z.string(),
// });

// const clearMetadataAgent = aiRouter
//   .use('/', loadTranscription)
//   .agent('/', async ctx => {
//     try {
//       ctx.response.writeMessageMetadata({
//         loader: 'Clearing metadata from transcription...',
//       });

//       // Get transcription from context state (loaded by middleware)
//       const transcription = ctx.state?.transcription;

//       if (!transcription) {
//         throw new Error('Transcription not found in context');
//       }

//       // Clear metadata from all captions
//       const clearedCaptions = transcription.captions.map((caption: any) => ({
//         ...caption,
//         metadata: {}, // Reset to empty object
//       }));

//       // Update the transcription in database
//       const db = await getDatabase();
//       const collection = db.collection<Transcription>('transcriptions');

//       const updatedTranscription = {
//         captions: clearedCaptions,
//         // Clear processing data metadata as well
//         processingData: {
//           ...transcription.processingData,
//           step4: {
//             ...transcription.processingData?.step4,
//             metadata: undefined, // Clear metadata
//           },
//         },
//         updatedAt: new Date(),
//       };

//       await collection.updateOne(
//         { _id: transcription._id },
//         { $set: updatedTranscription },
//       );

//       ctx.response.writeMessageMetadata({
//         loader: 'Metadata cleared successfully!',
//       });

//       return {
//         transcriptionId: transcription._id.toString(),
//         totalSentences: clearedCaptions.length,
//         clearedAt: new Date().toISOString(),
//         message: `Successfully cleared metadata from ${clearedCaptions.length} sentences`,
//       };
//     } catch (error) {
//       console.error('Error clearing metadata:', error);
//       throw error;
//     }
//   })
//   .actAsTool('/', {
//     id: 'clearTranscriptionMetadata',
//     name: 'Clear Transcription Metadata',
//     description:
//       'Removes all metadata from transcription captions, resetting them to a clean state. Useful for restarting the metadata generation process from scratch.',
//     inputSchema: ClearMetadataInputSchema,
//     outputSchema: ClearMetadataOutputSchema,
//     metadata: {
//       category: 'transcription',
//       tags: [
//         'sentence-metadata',
//         'metadata',
//         'clear',
//         'reset',
//         'cleanup',
//         'transcription',
//         'database',
//       ],
//       hidden: false,
//     },
//   });

// export default clearMetadataAgent;

