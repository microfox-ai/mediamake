import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { saveTranscriptionMetadata } from '../helpers';
import {
  ScriptMetaInputSchema,
  ScriptMetaOutputSchema,
  SentenceSchema,
} from '../zod';
import dedent from 'dedent';
import {
  getPromptPreset,
  getAllPromptPresets,
  DEFAULT_PRESET_ID,
} from './imagePromptRegistry';
import { loadTranscription } from '../middlewares/loadTranscription';
import crypto from 'crypto';

/**
 * Text-to-Image Agent - /text-to-image
 * 
 * Simple image generation for transcription captions.
 * 
 * Choose from built-in presets or provide your own custom prompt.
 * Built-in presets: graphic-novel, cinematic-realism, minimalist-flat, watercolor-artistic, abstract-geometric
 */

const aiRouter = new AiRouter();

// Text-to-image metadata schema
const TextToImageMetadataSchema = z.object({
  imagePrompt: z
    .string()
    .describe('The AI-generated image prompt for this caption'),
  promptPresetId: z.string().optional().describe('The prompt preset ID used'),
  taskId: z.string().optional().describe('The text-to-image task ID'),
  imageUrl: z.string().optional().describe('The generated image URL'),
  imageSize: z.string().optional().describe('The image size used'),
  imageResolution: z.string().optional().describe('The image resolution used'),
  status: z
    .enum(['pending', 'processing', 'completed', 'failed'])
    .describe('The status of image generation - processing means task submitted, webhook will update when done'),
  error: z.string().optional().describe('Error message if generation failed'),
  completedAt: z.string().optional().describe('When the image was completed (ISO timestamp)'),
});

// Legacy: IMAGE_GENERATION_SYSTEM_PROMPT moved to imagePromptRegistry.ts
// Now using dynamic prompt presets from the registry

/**
 * Encrypt auth token for webhook authentication
 * MEDIA_HELPER will decrypt this and send it back as Bearer token
 */
function encryptAuthToken(token: string): string {
  const secret = process.env.MEDIA_HELPER_SECRET;
  if (!secret) {
    throw new Error('MEDIA_HELPER_SECRET environment variable not set');
  }

  // Create key from secret (32 bytes for AES-256)
  const key = crypto.createHash('sha256').update(secret).digest();
  
  // Generate random IV (16 bytes for AES)
  const iv = crypto.randomBytes(16);
  
  // Encrypt
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(token, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  // Return as iv:encryptedData (both in hex)
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

// Helper function to call text-to-image API with webhook
async function generateImageForCaption(
  prompt: string,
  transcriptionId: string,
  captionIndex: number,
  imageSize: string = 'landscape_16_9',
  imageResolution: string = '1K',
): Promise<{ taskId: string; error?: string }> {
  const baseUrl = process.env.MEDIA_HELPER_URL;

  if (!baseUrl) {
    throw new Error('MEDIA_HELPER_URL environment variable not set');
  }

  if (!process.env.MEDIA_HELPER_SECRET) {
    throw new Error('MEDIA_HELPER_SECRET environment variable not set');
  }

  // Construct webhook URL
  const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                         process.env.VERCEL_URL || 
                         'http://localhost:3000';
  const webhookUrl = `${webhookBaseUrl}/api/webhooks/text-to-image`;

  // Use API key from environment as auth token
  const apiKey = process.env.DEV_API_KEY;
  if (!apiKey) {
    throw new Error('DEV_API_KEY environment variable not set');
  }
  
  const encryptedToken = encryptAuthToken(apiKey);

  console.log(`[Image Gen] 🔐 Using API key for webhook authentication`);
  console.log(`[Image Gen] 🔒 Encrypted token (first 40 chars): ${encryptedToken.substring(0, 40)}...`);

  try {
    console.log(`[Image Gen] 📤 Sending request to ${baseUrl}/api/text-to-image`);
    console.log(`[Image Gen] Webhook URL: ${webhookUrl}`);
    console.log(`[Image Gen] Webhook auth token (encrypted): ${encryptedToken.substring(0, 20)}...`);

    const response = await fetch(`${baseUrl}/api/text-to-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_size: imageSize,
        image_resolution: imageResolution,
        max_images: 1,
        webhook_url: webhookUrl,
        webhook_auth_token: encryptedToken, // Send encrypted token
        webhook_metadata: {
          transcriptionId,
          captionIndex,
          imagePrompt: prompt,
          imageSize,
          imageResolution,
        },
      }),
    });

    console.log(`[Image Gen] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Image Gen] ❌ Error response: ${errorText}`);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      throw new Error(errorData.error || 'Failed to create image generation task');
    }

    const data = await response.json();
    console.log(`[Image Gen] ✅ Task created: ${data.taskId}`);
    return { taskId: data.taskId };
  } catch (error) {
    console.error('[Image Gen] ❌ Error calling text-to-image API:', error);
    return {
      taskId: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Note: Polling removed - using webhook callback instead
// Images will be updated in the database via webhook when ready

// Create the complete schema by extending the base schemas
const TextToImageSentenceSchema = SentenceSchema.extend({
  metadata: TextToImageMetadataSchema,
});

const TextToImageTranscriptionSchema = ScriptMetaOutputSchema.extend({
  sentences: z.array(TextToImageSentenceSchema),
});

const textToImageAgent = aiRouter
  .before('/', loadTranscription)
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Generating images for captions...',
      });

      const {
        userRequest,
        imageSize = 'landscape_16_9',
        imageResolution = '1K',
        promptPresetId = DEFAULT_PRESET_ID,
        customPrompt,
      } = ctx.request.params as {
        userRequest?: string;
        imageSize?: string;
        imageResolution?: string;
        promptPresetId?: string;
        customPrompt?: string;
      };

      // Determine which prompt to use
      let systemPrompt: string;
      let selectedPresetId: string | undefined;

      if (customPrompt) {
        // Use custom prompt if provided
        systemPrompt = customPrompt;
        console.log('Using custom prompt for image generation');
      } else {
        // Use built-in preset from registry
        const preset = getPromptPreset(promptPresetId);
        if (!preset) {
          throw new Error(
            `Prompt preset '${promptPresetId}' not found. Available presets: ${getAllPromptPresets()
              .map(p => p.id)
              .join(', ')}`
          );
        }
        systemPrompt = preset.systemPrompt;
        selectedPresetId = preset.id;
        console.log(`Using preset: ${preset.name} (${preset.id})`);
      }

      // Get sentences from context state (loaded by middleware)
      const sentencesToAnalyze = ctx.state?.sentences || [];

      if (!sentencesToAnalyze || sentencesToAnalyze.length === 0) {
        throw new Error('No sentences available for analysis');
      }

      console.log(
        `Starting image generation for ${sentencesToAnalyze.length} captions...`,
      );

      const transcriptionId = ctx.state?.transcription?._id?.toString();
      if (!transcriptionId) {
        throw new Error('Transcription ID not found in context');
      }

      // Process each sentence: generate prompt -> create task (webhook handles completion)
      const analysisResults = await Promise.all(
        sentencesToAnalyze.map(async (sentence: string, index: number) => {
          try {
            // Step 1: Use AI to transform the caption into an image prompt
            ctx.response.writeMessageMetadata({
              loader: `Generating prompt for caption ${index + 1}/${sentencesToAnalyze.length}...`,
            });

            const promptResult = await generateText({
              model: google('gemini-2.5-pro'),
              system: systemPrompt,
              prompt: dedent`
                Transform the following sentence into an image generation prompt following the style guidelines:

                Sentence: "${sentence}"
                ${userRequest ? `\nUser Request: ${userRequest}` : ''}

                Generate only the image prompt, nothing else.
              `,
              maxRetries: 2,
            });

            const imagePrompt = promptResult.text.trim();
            console.log(
              `[Caption ${index + 1}] Generated prompt: ${imagePrompt.substring(0, 100)}...`,
            );

            // Step 2: Call text-to-image API with webhook (no waiting!)
            ctx.response.writeMessageMetadata({
              loader: `Submitting image task ${index + 1}/${sentencesToAnalyze.length}...`,
            });

            const { taskId, error: taskError } = await generateImageForCaption(
              imagePrompt,
              transcriptionId,
              index,
              imageSize,
              imageResolution,
            );

            if (taskError || !taskId) {
              console.error(
                `[Caption ${index + 1}] Failed to create task: ${taskError}`,
              );
              return {
                sentenceIndex: index,
                originalText: sentence,
                metadata: {
                  imagePrompt,
                  promptPresetId: selectedPresetId,
                  status: 'failed' as const,
                  error: taskError || 'Failed to create task',
                  imageSize,
                  imageResolution,
                },
                usage: promptResult.usage,
              };
            }

            console.log(`[Caption ${index + 1}] Task created: ${taskId} (webhook will update when ready)`);

            // Return immediately with "processing" status
            // Webhook will update to "completed" or "failed" when done
            return {
              sentenceIndex: index,
              originalText: sentence,
              metadata: {
                imagePrompt,
                promptPresetId: selectedPresetId,
                taskId,
                status: 'processing' as const,
                imageSize,
                imageResolution,
              },
              usage: promptResult.usage,
            };
          } catch (error) {
            console.error(`Error processing sentence ${index}:`, error);
            return {
              sentenceIndex: index,
              originalText: sentence,
              metadata: {
                imagePrompt: '',
                promptPresetId: selectedPresetId,
                status: 'failed' as const,
                error:
                  error instanceof Error
                    ? error.message
                    : 'Unknown error during processing',
              },
              usage: {
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
                cachedInputTokens: 0,
                reasoningTokens: 0,
              },
            };
          }
        }),
      );

      // Calculate statistics
      const processingCount = analysisResults.filter(
        r => r.metadata.status === 'processing',
      ).length;
      const failedCount = analysisResults.filter(
        r => r.metadata.status === 'failed',
      ).length;

      console.log(
        `Image tasks submitted: ${processingCount} processing, ${failedCount} failed immediately. Webhook will update when images are ready.`,
      );

      const result = {
        sentences: analysisResults,
        transcriptionInfo: ctx.state?.transcriptionInfo,
        totalSentences: sentencesToAnalyze.length,
        averageStrength: 0, // Not applicable for image generation
        confidence: processingCount / sentencesToAnalyze.length,
        dominantFeel: {
          processing: processingCount,
          failed: failedCount,
          note: 'Images are being generated. Check back in a few minutes or watch for webhook updates.',
        },
      };

      // Update the database with the metadata using the transcription from state
      const transcription = ctx.state?.transcription;
      if (transcription) {
        await saveTranscriptionMetadata(
          transcription,
          result.sentences,
          ctx.state?.transcriptionInfo,
        );
      }

      return result;
    } catch (error) {
      console.error('Error generating images for transcription:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'generateImagesForTranscription',
    name: 'Generate Images for Transcription',
    description:
      'Generates images for each caption in a transcription using AI prompt transformation and text-to-image API. Choose from built-in presets or provide a custom prompt. Available presets: graphic-novel (default), cinematic-realism, minimalist-flat, watercolor-artistic, abstract-geometric.',
    inputSchema: ScriptMetaInputSchema.extend({
      imageSize: z
        .enum([
          'square',
          'square_hd',
          'portrait_4_3',
          'portrait_3_2',
          'portrait_16_9',
          'landscape_4_3',
          'landscape_3_2',
          'landscape_16_9',
          'landscape_21_9',
        ])
        .optional()
        .describe('Image size (default: landscape_16_9)'),
      imageResolution: z
        .enum(['1K', '2K', '4K'])
        .optional()
        .describe('Image resolution (default: 1K)'),
      promptPresetId: z
        .enum([
          'graphic-novel',
          'cinematic-realism',
          'minimalist-flat',
          'watercolor-artistic',
          'abstract-geometric',
        ])
        .optional()
        .describe(
          'Prompt preset to use for image generation. Options: graphic-novel (hand-drawn with limited palette), cinematic-realism (photo-realistic with dramatic lighting), minimalist-flat (clean geometric design), watercolor-artistic (soft painted style), abstract-geometric (bold shapes and colors). Default: graphic-novel'
        ),
      customPrompt: z
        .string()
        .optional()
        .describe(
          'Custom system prompt for image generation. If provided, overrides promptPresetId. Use this to define your own unique visual style and guidelines. You can copy a preset prompt and modify it.'
        ),
    }),
    outputSchema: TextToImageTranscriptionSchema,
    metadata: {
      category: 'transcription',
      tags: [
        'sentence-metadata',
        'text-to-image',
        'image-generation',
        'captions',
        'ai',
        'metadata',
        'database',
      ],
      hidden: false,
    },
  });

// ============================================================================
// UTILITY ROUTE - Get available presets
// ============================================================================

// Simple route to list available presets with their prompts
textToImageAgent
  .agent('/prompts', async () => {
    const presets = getAllPromptPresets();
    
    return {
      presets: presets.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        systemPrompt: p.systemPrompt,
        category: p.category,
        tags: p.tags,
      })),
      count: presets.length,
      message: 'Use promptPresetId to select a preset, or copy systemPrompt to create your own customPrompt',
    };
  })
  .actAsTool('/prompts', {
    id: 'listImagePrompts',
    name: 'List Image Generation Prompts',
    description:
      'Lists all available built-in image prompt presets. Each preset includes the full system prompt text that you can copy and modify to create a custom prompt.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      presets: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        systemPrompt: z.string().describe('Full prompt text - copy this to create custom prompt'),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })),
      count: z.number(),
      message: z.string(),
    }),
    metadata: {
      category: 'utility',
      tags: ['prompts', 'list', 'text-to-image'],
      hidden: false,
    },
  });

export default textToImageAgent;

