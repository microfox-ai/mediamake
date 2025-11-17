// /**
//  * Example: Generate Images for Transcription Captions
//  * 
//  * This script demonstrates how to use the text-to-image agent to generate
//  * stylized graphic novel images for each caption in a transcription.
//  * 
//  * Usage:
//  *   1. Make sure you have a transcription with captions in your database
//  *   2. Set MEDIA_HELPER_URL in your .env file
//  *   3. Run: npx tsx examples/text-to-image-example.ts
//  */

// import { aiMainRouter } from '../app/ai';

// // Configuration
// const TRANSCRIPTION_ID = 'your-transcription-id-here'; // Replace with actual ID

// async function generateImagesForTranscription() {
//   console.log('🎨 Text-to-Image Example');
//   console.log('========================\n');

//   try {
//     console.log(`📝 Transcription ID: ${TRANSCRIPTION_ID}`);
//     console.log('🚀 Starting image generation...\n');

//     const startTime = Date.now();

//     // Call the text-to-image agent
//     const response = await aiMainRouter.toAwaitResponse('/script-meta/text-to-image', {
//       request: {
//         messages: [],
//         params: {
//           transcriptionId: TRANSCRIPTION_ID,
//           imageSize: 'landscape_16_9',
//           imageResolution: '2K',
//           userRequest: 'Make the images dramatic and impactful',
//         },
//       },
//     });

//     const endTime = Date.now();
//     const duration = ((endTime - startTime) / 1000).toFixed(2);

//     // Parse the response
//     const responseData = await response.json();
    
//     // Extract data from UI message format
//     let result: any = null;
//     if (Array.isArray(responseData) && responseData.length > 0) {
//       const message = responseData[0];
//       if (message.parts) {
//         const toolPart = message.parts.find((p: any) => p.type.startsWith('tool-'));
//         if (toolPart) {
//           result = toolPart.output;
//         }
//       }
//     }

//     if (!result) {
//       console.error('❌ Failed to extract result from agent response');
//       process.exit(1);
//     }

//     // Extract results
//     const { sentences, totalSentences, confidence } = result;

//     // Calculate statistics
//     const completedCount = sentences.filter(
//       (s: any) => s.metadata.status === 'completed',
//     ).length;
//     const failedCount = sentences.filter(
//       (s: any) => s.metadata.status === 'failed',
//     ).length;

//     // Print summary
//     console.log('✅ Image generation complete!\n');
//     console.log('📊 Summary:');
//     console.log(`   Total captions: ${totalSentences}`);
//     console.log(`   ✅ Successful: ${completedCount}`);
//     console.log(`   ❌ Failed: ${failedCount}`);
//     console.log(`   📈 Success rate: ${(confidence * 100).toFixed(1)}%`);
//     console.log(`   ⏱️  Duration: ${duration}s\n`);

//     // Print detailed results
//     console.log('📋 Detailed Results:\n');
//     sentences.forEach((sentence: any, index: number) => {
//       const status = sentence.metadata.status === 'completed' ? '✅' : '❌';
//       console.log(`${status} Caption ${index + 1}:`);
//       console.log(`   Text: "${sentence.originalText.substring(0, 60)}${sentence.originalText.length > 60 ? '...' : '"}"`);

//       if (sentence.metadata.status === 'completed') {
//         console.log(`   Image: ${sentence.metadata.imageUrl}`);
//         console.log(`   Prompt: ${sentence.metadata.imagePrompt.substring(0, 80)}...`);
//       } else {
//         console.log(`   Error: ${sentence.metadata.error}`);
//       }
//       console.log('');
//     });

//     // Calculate token usage
//     const totalTokens = sentences.reduce(
//       (sum: number, s: any) => sum + (s.usage?.totalTokens || 0),
//       0,
//     );
//     console.log(`💰 Total tokens used: ${totalTokens.toLocaleString()}\n`);

//     console.log('🎉 Done! Check your database for the updated captions.');
//   } catch (error) {
//     console.error('❌ Unexpected error:', error);
//     process.exit(1);
//   }
// }

// // Example 2: Programmatic usage with custom parameters
// async function exampleWithCustomParameters() {
//   console.log('🎨 Custom Parameters Example');
//   console.log('============================\n');

//   const configs = [
//     {
//       name: 'HD Square Images',
//       imageSize: 'square_hd',
//       imageResolution: '2K',
//     },
//     {
//       name: 'Ultra HD Widescreen',
//       imageSize: 'landscape_21_9',
//       imageResolution: '4K',
//     },
//     {
//       name: 'Portrait Format',
//       imageSize: 'portrait_16_9',
//       imageResolution: '1K',
//     },
//   ];

//   for (const config of configs) {
//     console.log(`\n📸 Testing: ${config.name}`);
//     console.log(`   Size: ${config.imageSize}`);
//     console.log(`   Resolution: ${config.imageResolution}\n`);

//     // You can uncomment to test different configurations
//     // const response = await aiMainRouter.toAwaitResponse('/script-meta/text-to-image', {
//     //   request: {
//     //     messages: [],
//     //     params: {
//     //       transcriptionId: TRANSCRIPTION_ID,
//     //       imageSize: config.imageSize,
//     //       imageResolution: config.imageResolution,
//     //     },
//     //   },
//     // });
//   }
// }

// // Example 3: Using the API endpoint
// async function exampleUsingAPIEndpoint() {
//   console.log('🌐 API Endpoint Example');
//   console.log('=======================\n');

//   const apiUrl = `http://localhost:3000/api/transcriptions/${TRANSCRIPTION_ID}/generate-images`;

//   console.log(`📡 Calling: ${apiUrl}\n`);

//   try {
//     const response = await fetch(apiUrl, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         imageSize: 'landscape_16_9',
//         imageResolution: '2K',
//         userRequest: 'Focus on dramatic composition',
//       }),
//     });

//     if (!response.ok) {
//       const error = await response.json();
//       console.error('❌ API Error:', error);
//       return;
//     }

//     const data = await response.json();
//     console.log('✅ Success!');
//     console.log(JSON.stringify(data, null, 2));
//   } catch (error) {
//     console.error('❌ Request failed:', error);
//   }
// }

// // Run the examples
// async function main() {
//   const example = process.argv[2] || '1';

//   switch (example) {
//     case '1':
//       await generateImagesForTranscription();
//       break;
//     case '2':
//       await exampleWithCustomParameters();
//       break;
//     case '3':
//       await exampleUsingAPIEndpoint();
//       break;
//     default:
//       console.log('Usage: npx tsx examples/text-to-image-example.ts [1|2|3]');
//       console.log('  1: Basic usage (default)');
//       console.log('  2: Custom parameters example');
//       console.log('  3: API endpoint example');
//   }
// }

// // Only run if this file is executed directly
// if (require.main === module) {
//   main().catch(console.error);
// }

// export { generateImagesForTranscription, exampleWithCustomParameters, exampleUsingAPIEndpoint };

