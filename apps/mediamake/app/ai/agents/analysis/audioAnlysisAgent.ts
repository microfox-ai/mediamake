import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { getDatabase } from '@/lib/mongodb';
import { MediaFile, RagAudioMetadata } from '@/app/types/media';
import { indexAudio } from '@/lib/sparkboard/sparkboard-lib';
import {
  getAudioMetadata,
  extractAudioAsBase64,
  analyzeAudioContent,
  cleanupAudioFile,
  type AudioMetadata,
  type AudioAnalysisOptions,
} from './audioAnalysisHelpers';
import {
  findMediaFileBySrc,
  updateMediaFileWithAnalysis,
} from './audioAnalysisHelper';
import { processAudioUrl } from '@/lib/s3Helper';

const aiRouter = new AiRouter();

// Input schema for the audio analysis agent
const AudioAnalysisInputSchema = z.object({
  tags: z.array(z.string()).optional().describe('Array of string tags'),
  audioUrls: z
    .array(z.string().url())
    .describe('Array of audio URLs to analyze'),
  userRequest: z
    .string()
    .optional()
    .describe('User request or context for audio analysis'),
  analysisOptions: z
    .object({
      extractWaveform: z
        .boolean()
        .default(false)
        .describe('Extract waveform data'),
      analyzeFrequency: z
        .boolean()
        .default(false)
        .describe('Analyze frequency content'),
      detectBeats: z.boolean().default(false).describe('Detect beats in audio'),
    })
    .optional()
    .describe('Options for audio analysis'),
  model: z.string().optional().describe('Model to use for analysis'),
});

const audioAnalysisResultSchema = z.object({
  analysis: z
    .string()
    .describe(
      'Detailed analysis of the audio content, mood, and characteristics',
    ),
  mood: z.string().describe('The overall mood or atmosphere of the audio'),
  genre: z.string().describe('Detected or likely genre of the audio'),
  keyElements: z
    .array(z.string())
    .describe('Key audio elements and characteristics'),
  emotions: z.array(z.string()).describe('Emotions conveyed by the audio'),
  technicalNotes: z
    .string()
    .describe(
      'Technical observations about the audio quality and characteristics',
    ),
});

// Output schema for the agent
const AudioAnalysisOutputSchema = z.object({
  success: z.boolean().describe('Whether the operation was successful'),
  analyses: z
    .array(
      z.object({
        audioUrl: z.string().describe('Original audio URL'),
        metadata: z
          .object({
            duration: z.number().describe('Duration in seconds'),
            sampleRate: z.number().describe('Sample rate in Hz'),
            channels: z.number().describe('Number of audio channels'),
            bitRate: z.number().optional().describe('Bit rate'),
            format: z.string().optional().describe('Audio format'),
            codec: z.string().optional().describe('Audio codec'),
            fileSize: z.number().optional().describe('File size in bytes'),
          })
          .describe('Audio metadata'),
        analysis: audioAnalysisResultSchema.describe(
          'AI analysis of the audio',
        ),
        mediaFileId: z
          .string()
          .nullable()
          .describe('Database ID of saved media file'),
      }),
    )
    .describe('Array of audio analyses with metadata'),
  error: z.string().optional().describe('Error message if operation failed'),
});

export const audioAnalysisAgent = aiRouter
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Processing audio analysis...',
      });

      const clientId = ctx.request.clientId;
      const {
        audioUrls,
        userRequest,
        analysisOptions,
        model,
        tags,
        promptUsed,
      } = ctx.request.params;

      const selectedModel = google(model ?? 'gemini-2.5-pro');
      const db = await getDatabase();
      const collection = db.collection('mediaFiles');

      const results = [];

      for (const audioUrl of audioUrls) {
        try {
          console.log(`🎵 Starting audio analysis for URL: ${audioUrl}`);
          ctx.response.writeMessageMetadata({
            loader: `Processing audio: ${audioUrl}`,
          });

          // Step 0: Process audio URL - upload to S3 if needed
          console.log('📤 Step 0: Processing audio URL for S3 upload...');
          const { url: processedUrl, wasUploaded } = await processAudioUrl(
            audioUrl,
            clientId || 'default',
          );

          if (wasUploaded) {
            console.log(
              '✅ Audio uploaded to S3, using new URL:',
              processedUrl,
            );
          } else {
            console.log('✅ Using original URL (already on S3):', processedUrl);
          }

          // Step 1: Get audio metadata using the processed URL
          console.log('📊 Step 1: Getting audio metadata...');
          const audioMetadata = await getAudioMetadata(processedUrl);
          console.log('📊 Audio metadata retrieved:', {
            duration: audioMetadata.duration,
            sampleRate: audioMetadata.sampleRate,
            channels: audioMetadata.channels,
            format: audioMetadata.format,
            codec: audioMetadata.codec,
            fileSize: audioMetadata.fileSize,
          });

          // Step 2: Extract audio as base64 for AI analysis using processed URL
          console.log('🎧 Step 2: Extracting audio as base64...');
          const audioBase64 = await extractAudioAsBase64(processedUrl);
          console.log(
            `🎧 Audio base64 extracted, length: ${audioBase64.length} characters`,
          );

          // Step 3: Skip technical analysis (moved to separate endpoint)
          console.log(
            '⏭️ Step 3: Skipping technical analysis (handled by separate endpoint)',
          );
          const technicalAnalysis = {
            analysis:
              'Technical analysis available via /api/media-files/audio endpoint',
          };

          // Step 4: Analyze the audio with Gemini
          console.log('🤖 Step 4: Analyzing audio with Gemini...');
          const analysisResult = await generateObject({
            model: selectedModel,
            schema: audioAnalysisResultSchema,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Analyze this audio file and provide insights about its content, mood, genre, and characteristics. ${userRequest ? `User request: "${userRequest}"` : ''} Technical details: Duration: ${audioMetadata.duration}s, Sample Rate: ${audioMetadata.sampleRate}Hz, Channels: ${audioMetadata.channels}, Format: ${audioMetadata.format || 'Unknown'}.`,
                  },
                  {
                    type: 'text',
                    text: `Audio file (base64 encoded): ${audioBase64.substring(0, 100)}...`,
                  },
                ],
              },
            ],
          });

          console.log('🤖 Gemini analysis completed:', {
            analysis: analysisResult.object.analysis,
            mood: analysisResult.object.mood,
            genre: analysisResult.object.genre,
            keyElements: analysisResult.object.keyElements,
            emotions: analysisResult.object.emotions,
            technicalNotes: analysisResult.object.technicalNotes,
          });
          console.log(
            '🤖 USAGE FOR AUDIO ANALYSIS RESULT',
            analysisResult.usage,
          );

          // Create audio metadata using RagAudioMetadata structure
          console.log('📝 Step 5: Creating RagAudioMetadata structure...');
          const audioMetadataStructure: RagAudioMetadata = {
            src: processedUrl, // Use processed URL (S3 URL if uploaded)
            description: analysisResult.object.analysis,
            title: `Audio Analysis ${Date.now()}`,
            creator: 'AI Analysis Agent',
            duration: audioMetadata.duration,
            sampleRate: audioMetadata.sampleRate,
            channels: audioMetadata.channels,
            bitRate: audioMetadata.bitRate ?? null,
            format: audioMetadata.format ?? null,
            codec: audioMetadata.codec ?? null,
            mediaType: 'audio',
            mimeType: `audio/${audioMetadata.format || 'mp3'}`,
            fileSize: audioMetadata.fileSize ?? null,
            originalUrl: audioUrl, // Keep original URL for reference
            analysis: analysisResult.object,
            technicalAnalysis: technicalAnalysis,
            platform: 'MediaMake',
            platformId: 'mediamake/audio-analysis-agent',
            platformUrl: processedUrl, // Use processed URL
            ...(promptUsed && { promptUsed }),
            userTags: tags || [],
            keywords: [
              ...(analysisResult.object.emotions || []),
              analysisResult.object.genre,
              analysisResult.object.mood,
            ],
            artStyle: [analysisResult.object.genre, analysisResult.object.mood],
            genreTags: [analysisResult.object.genre],
            moodTags: [analysisResult.object.mood],
            audienceKeywords: [
              ...(analysisResult.object.emotions || []),
              analysisResult.object.genre,
              analysisResult.object.mood,
            ],
            instrumentTags: analysisResult.object.keyElements,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          console.log('📝 RagAudioMetadata structure created:', {
            src: audioMetadataStructure.src,
            title: audioMetadataStructure.title,
            duration: audioMetadataStructure.duration,
            hasAnalysis: !!audioMetadataStructure.analysis,
            hasTechnicalAnalysis: !!audioMetadataStructure.technicalAnalysis,
            keywords: audioMetadataStructure.keywords,
            genreTags: audioMetadataStructure.genreTags,
            moodTags: audioMetadataStructure.moodTags,
          });

          // Create media file entry
          console.log('🔍 Step 6: Checking for existing media file...');
          const existingMediaFile = await findMediaFileBySrc(
            processedUrl,
            clientId || 'default',
          );

          let mediaFileId: string;
          let isUpdate = false;

          if (existingMediaFile) {
            console.log(
              '🔄 Found existing media file, updating with analysis...',
            );
            console.log('🔄 Existing media file:', {
              id: existingMediaFile._id,
              fileName: existingMediaFile.fileName,
              contentType: existingMediaFile.contentType,
              hasMetadata: !!existingMediaFile.metadata,
            });

            // Update existing media file with analysis results
            const updatedMediaFile = await updateMediaFileWithAnalysis(
              existingMediaFile._id.toString(),
              { metadata: audioMetadataStructure },
            );

            if (updatedMediaFile) {
              mediaFileId = existingMediaFile._id.toString();
              isUpdate = true;
              console.log('🔄 Media file updated successfully:', {
                id: mediaFileId,
                updatedAt: updatedMediaFile.updatedAt,
              });
            } else {
              throw new Error('Failed to update existing media file');
            }
          } else {
            console.log('🆕 No existing media file found, creating new one...');
            const mediaFile: MediaFile = {
              tags: ['audio-analysis', 'gemini-analysis', ...(tags || [])],
              clientId: clientId || 'default',
              contentType: 'audio',
              contentMimeType: `audio/${audioMetadata.format || 'mp3'}`,
              contentSubType: audioMetadata.format || 'mp3',
              contentSource: 'audio-analysis-agent',
              contentSourceUrl: processedUrl, // Use processed URL
              metadata: audioMetadataStructure,
              fileName: `audio-analysis-${Date.now()}.${audioMetadata.format || 'mp3'}`,
              fileSize: audioMetadata.fileSize || 0,
              filePath: processedUrl, // Use processed URL
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            console.log('🆕 MediaFile structure created:', {
              tags: mediaFile.tags,
              contentType: mediaFile.contentType,
              contentSource: mediaFile.contentSource,
              contentSourceUrl: mediaFile.contentSourceUrl,
              fileName: mediaFile.fileName,
              hasMetadata: !!mediaFile.metadata,
              metadataKeys: mediaFile.metadata
                ? Object.keys(mediaFile.metadata)
                : [],
            });

            console.log('💾 Step 7: Saving new MediaFile to MongoDB...');
            const mediaResult = await collection.insertOne(mediaFile);
            mediaFileId = mediaResult.insertedId.toString();
            isUpdate = false;
            console.log('💾 New MediaFile saved to MongoDB:', {
              insertedId: mediaResult.insertedId,
              acknowledged: mediaResult.acknowledged,
            });
          }

          // Save to sparkboard for AI analysis
          console.log('🌐 Step 8: Saving to Sparkboard...');
          try {
            const sparkboardResult = await indexAudio(
              processedUrl, // Use processed URL
              clientId || 'default',
              audioMetadataStructure,
            );

            if (sparkboardResult) {
              console.log('🌐 Audio analysis saved to sparkboard successfully');
            } else {
              console.log('🌐 Sparkboard returned null/undefined result');
            }
          } catch (sparkboardError) {
            console.warn(
              '🌐 Failed to save audio analysis to sparkboard:',
              sparkboardError,
            );
            // Don't fail the entire operation if sparkboard fails
          }

          console.log('✅ Step 9: Preparing final results...');
          const finalResult = {
            audioUrl: processedUrl, // Use processed URL in final result
            originalUrl: audioUrl, // Keep original URL for reference
            wasUploaded,
            metadata: {
              duration: audioMetadata.duration,
              sampleRate: audioMetadata.sampleRate,
              channels: audioMetadata.channels,
              bitRate: audioMetadata.bitRate,
              format: audioMetadata.format,
              codec: audioMetadata.codec,
              fileSize: audioMetadata.fileSize,
            },
            analysis: analysisResult.object,
            mediaFileId: mediaFileId,
            isUpdate: isUpdate,
          };
          console.log('✅ Final result prepared:', {
            audioUrl: finalResult.audioUrl,
            mediaFileId: finalResult.mediaFileId,
            isUpdate: finalResult.isUpdate,
            hasAnalysis: !!finalResult.analysis,
            analysisKeys: finalResult.analysis
              ? Object.keys(finalResult.analysis)
              : [],
            metadataKeys: Object.keys(finalResult.metadata),
          });

          results.push(finalResult);
          console.log(
            `✅ Audio analysis completed successfully for: ${audioUrl} (${isUpdate ? 'UPDATED' : 'CREATED'})`,
          );
        } catch (error) {
          console.error(`❌ Error processing audio ${audioUrl}:`, error);
          console.error('❌ Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : 'Unknown',
          });

          // Add the error to results for better user feedback
          const errorResult = {
            audioUrl,
            metadata: {
              duration: 0,
              sampleRate: 0,
              channels: 0,
            },
            analysis: {
              analysis: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              mood: 'Unknown',
              genre: 'Unknown',
              keyElements: [],
              emotions: [],
              technicalNotes: 'Analysis failed due to processing error.',
            },
            mediaFileId: null,
          };
          console.log('❌ Error result prepared:', errorResult);
          results.push(errorResult);
        }
      }

      console.log('🎯 Final agent result:', {
        success: results.length > 0,
        resultsCount: results.length,
        results: results.map(r => ({
          audioUrl: r.audioUrl,
          hasAnalysis: !!r.analysis,
          mediaFileId: r.mediaFileId,
        })),
      });

      return {
        success: results.length > 0,
        analyses: results,
      };
    } catch (error) {
      console.error('💥 Fatal error in audio analysis agent:', error);
      console.error('💥 Fatal error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown',
      });
      return {
        success: false,
        analyses: [],
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  })
  .actAsTool('/', {
    id: 'audioAnalysis',
    name: 'Audio Analysis Agent',
    description:
      'Analyzes audio files to extract metadata and generate AI-powered insights',
    inputSchema: AudioAnalysisInputSchema,
    outputSchema: AudioAnalysisOutputSchema,
    metadata: {
      icon: '🎵',
      name: 'Audio Analysis Agent',
      description:
        'Analyzes audio files to extract metadata and generate AI-powered insights about content, mood, and characteristics',
      hideUI: false,
      customUI: true,
      customUIType: 'presets',
    },
  });
