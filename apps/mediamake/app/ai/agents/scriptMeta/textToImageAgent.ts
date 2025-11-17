import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { saveTranscriptionMetadata } from './helpers';
import {
  ScriptMetaInputSchema,
  ScriptMetaOutputSchema,
  SentenceSchema,
} from './zod';
import dedent from 'dedent';

/**
 * Text-to-Image Agent - /text-to-image
 * Generate images for each caption using AI prompt transformation and KIE AI text-to-image API
 */

const aiRouter = new AiRouter();

// Text-to-image metadata schema
const TextToImageMetadataSchema = z.object({
  imagePrompt: z
    .string()
    .describe('The AI-generated image prompt for this caption'),
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

// Image generation system prompt
const IMAGE_GENERATION_SYSTEM_PROMPT = dedent`
  You are an AI specialized in creating image generation prompts for a consistent explainer video series. Your task is to take a user-provided sentence and transform it into a detailed, descriptive prompt that strictly adheres to a predefined artistic style.

  The Style Guidelines are:

  Aesthetic: A stylized, hand-drawn illustration that feels like it's from a high-quality graphic novel. The art must be expressive and intentionally non-photorealistic, focusing on simplified forms, heavy ink outlines, and visible texture.

  Texture: The image must have a tactile feel. Use keywords like heavy colored pencil shading, expressive crosshatching, textured paper background, and bold, imperfect ink outlines.

  Color Palette (STRICT): The entire image, including all objects, backgrounds, and text, must exclusively use colors from the following limited palette:

  Dark Indigo/Navy Blue (for shadows, outlines, and text)

  Burnt Orange (as a primary or accent color)

  Muted Tan / Off-White (for backgrounds and highlights)

  A small amount of a fourth color like Muted Teal or Warm Gray is permissible if absolutely necessary for a specific object, but the core palette is paramount.

  Format: Assume a 16:9 aspect ratio suitable for video.

  Text Integration and Layout (CRITICAL):

  The text is a primary design element, not an afterthought.

  Artistic Font Style: The text must be rendered in a bold, blocky, hand-lettered style. It should look like it was drawn with a thick ink pen, having significant width, slight irregularities, and visible texture. It should feel weighty and integrated into the artwork.

  Dynamic Layout: The text must be broken into multiple lines and arranged creatively within the composition. The placement should enhance the visual narrative.

  Text Color: The text color must be drawn from the approved color palette, typically the Dark Indigo.

  Your Process:

  Analyze the user's sentence.

  Devise a simple, stylized visual to represent the core concept.

  Construct a prompt that strictly enforces all guidelines: the non-photorealistic aesthetic, the limited color palette, the bold font, and the dynamic text layout.

  Here are examples of how you should perform this transformation:

  Example 1:

  User Input Sentence: "The power grid's been dark for 72 hours"

  Your Generated Prompt: A stylized graphic novel illustration of a dark suburban street. The forms of houses and power lines are simplified and silhouetted. The entire scene strictly uses a limited color palette of dark indigo, burnt orange for the sunset glow, and muted tan. Across the sky, the text "THE POWER GRID'S BEEN DARK FOR 72 HOURS" is arranged in a bold, blocky, textured hand-lettered font, colored dark indigo. The style is intentionally non-photorealistic with heavy crosshatching.

  Example 2:

  User Input Sentence: "Your smart thermostat can't connect to the internet."

  Your Generated Prompt: A stylized, non-photorealistic illustration of a smart thermostat. The device's form is simplified with bold ink outlines. On its dark screen is a small "no connection" icon in burnt orange. The entire image uses only dark indigo, burnt orange, and an off-white textured paper background. To the right, the text is arranged in three lines: "CAN'T CONNECT", "TO THE", "INTERNET". The font is a heavy, blocky, hand-lettered style with a textured, inky feel.

  Example 3:

  User Input Sentence: "Not because you're hiding—because they can't see"

  Your Generated Prompt: A simple, stylized colored pencil illustration of a window with its curtains drawn shut. The curtains are burnt orange, and the window frame is dark indigo. The background is a clean, off-white textured paper. To the right of the window, the text is arranged dynamically: "NOT BECAUSE", "YOU'RE HIDING—", "BECAUSE", "THEY CAN'T SEE". The text is rendered in a bold, wide, hand-lettered ink font in dark indigo. The artwork is expressive and avoids realism.
`;

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

  // Construct webhook URL
  // If running locally, you might need ngrok or similar for testing
  const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                         process.env.VERCEL_URL || 
                         'http://localhost:3000';
  const webhookUrl = `${webhookBaseUrl}/api/webhooks/text-to-image`;

  try {
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
        webhook_metadata: {
          transcriptionId,
          captionIndex,
          imagePrompt: prompt,
          imageSize,
          imageResolution,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create image generation task');
    }

    const data = await response.json();
    return { taskId: data.taskId };
  } catch (error) {
    console.error('Error calling text-to-image API:', error);
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
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Generating images for captions...',
      });

      const {
        userRequest,
        imageSize = 'landscape_16_9',
        imageResolution = '1K',
      } = ctx.request.params as {
        userRequest?: string;
        imageSize?: string;
        imageResolution?: string;
      };

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
              system: IMAGE_GENERATION_SYSTEM_PROMPT,
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
      'Generates images for each caption in a transcription using AI prompt transformation and text-to-image API. Transforms each caption into a stylized graphic novel image prompt and generates the corresponding image.',
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

export default textToImageAgent;

