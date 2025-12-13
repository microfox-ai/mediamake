import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { loadTranscription } from '../scriptMeta/middlewares/loadTranscription';
import { ScriptMetaInputSchema } from '../scriptMeta/zod';
import dedent from 'dedent';

// TODO: create a storyline so that each image promtp makes sense.

const aiRouter = new AiRouter();

// Image analysis schema for first generateObject call
const ImageAnalysisSchema = z.object({
  imageDescriptions: z
    .array(
      z.object({
        description: z
          .string()
          .describe(
            'Detailed description of the image content, style, mood, and visual elements',
          ),
      }),
    )
    .describe('Analysis of each provided image'),
  userRequestAlignment: z
    .string()
    .describe('What the user wants to learn from the given images'),
});

// Midjourney prompt schema for second generateObject call
const MidjourneyPromptSchema = z.object({
  prompts: z
    .array(
      z.object({
        captionIndex: z
          .number()
          .describe('Index of the caption this prompt is for'),
        captionText: z.string().describe('The original caption text'),
        prompt: z
          .string()
          .describe('Generated Midjourney prompt for this caption'),
      }),
    )
    .describe('Generated Midjourney prompts for each caption'),
});

// Input schema for the agent - extends ScriptMetaInputSchema
const MidjourneyPromptingInputSchema = ScriptMetaInputSchema.extend({
  mediaUrls: z
    .array(z.string())
    .optional()
    .describe('Array of image URLs to analyze'),
  startIndex: z
    .number()
    .min(0)
    .describe('Starting index of captions to process (0-based)'),
  endIndex: z
    .number()
    .min(0)
    .describe('Ending index of captions to process (inclusive)'),
  model: z.string().optional().describe('AI model to use for generation'),
});

// Output schema for the agent
const MidjourneyPromptingOutputSchema = z.object({
  prompts: z.array(
    z.object({
      captionIndex: z.number(),
      captionText: z.string(),
      prompt: z.string(),
    }),
  ),
  processedCaptions: z.number().describe('Number of captions processed'),
  imageAnalysisUsed: z.boolean().describe('Whether image analysis was used'),
});

// Helper function to download image and convert to base64
async function downloadImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

export const midjourneyPromptingAgent = aiRouter
  .before('/', loadTranscription)
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Analyzing images and generating Midjourney prompts...',
      });

      const { mediaUrls, startIndex, endIndex, userRequest, model } = ctx
        .request.params as z.infer<typeof MidjourneyPromptingInputSchema>;

      // Get captions from context state (loaded by middleware)
      const captions = ctx.state?.transcription?.captions || [];
      const sentences = ctx.state?.sentences || [];

      if (!captions || captions.length === 0) {
        throw new Error('No captions available for analysis');
      }

      let captionsToProcess = captions;
      if (startIndex && endIndex) {
        // Validate caption range
        if (
          startIndex < 0 ||
          endIndex >= captions.length ||
          startIndex > endIndex
        ) {
          throw new Error('Invalid caption range provided');
        }

        // Get the subset of captions to process
        captionsToProcess = captions.slice(startIndex, endIndex + 1);
      }

      let imageAnalysis = null;
      let imageBase64Data: string[] = [];

      // First generateObject call: Analyze images if provided
      if (mediaUrls && mediaUrls.length > 0) {
        ctx.response.writeMessageMetadata({
          loader: 'Downloading and analyzing reference images...',
        });

        // Download and convert images to base64
        imageBase64Data = await Promise.all(
          mediaUrls.map(url => downloadImageAsBase64(url)),
        );

        const imageAnalysisResult = await generateObject({
          model: google(model || 'gemini-2.5-flash'),
          schema: ImageAnalysisSchema,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: dedent`
                    Analyze these reference images in the context of the user's request: "${userRequest}"
                    
                    For each image, provide a detailed description of the content, style, mood, and visual elements.
                    
                    The user wants to generate Midjourney prompts for captions based on these reference images.
                  `,
                },
                ...imageBase64Data.map(base64 => ({
                  type: 'image' as const,
                  image: base64,
                })),
              ],
            },
          ],
        });

        imageAnalysis = imageAnalysisResult.object;
        console.log('Image Analysis USAGE', imageAnalysisResult.usage);
      }

      // Second generateObject call: Generate Midjourney prompts
      ctx.response.writeMessageMetadata({
        loader: 'Generating Midjourney prompts for captions...',
      });

      let allPrompts: any[] = [];

      if (captionsToProcess.length <= 10) {
        // Process all captions at once if 10 or fewer
        const promptGenerationResult = await generateObject({
          model: google(model || 'gemini-2.5-pro'),
          schema: MidjourneyPromptSchema,
          prompt: dedent`
            Generate Midjourney prompts for these captions based on the user's request: "${userRequest}"
            
            Captions to process (${captionsToProcess.length} total):
            ${captionsToProcess.map((caption: any, index: number) => `${startIndex + index}: "${caption.text}"`).join('\n')}
            
            ${
              imageAnalysis
                ? `
            Reference Image Descriptions:
            ${imageAnalysis.imageDescriptions
              .map((desc, index) => `Image ${index + 1}: ${desc.description}`)
              .join('\n')}
            
            User Request Alignment: ${imageAnalysis.userRequestAlignment}
            `
                : ''
            }
            
            Generate Midjourney prompts that align with the user's request and reference images (if provided).
            Each prompt should be optimized for Midjourney and be creative and engaging.
          `,
          maxOutputTokens: 4000,
        });

        console.log('Prompt Generation USAGE', promptGenerationResult.usage);
        allPrompts = promptGenerationResult.object.prompts;
      } else {
        // Process in batches of 10
        const batchSize = 10;
        const batches = [];

        for (let i = 0; i < captionsToProcess.length; i += batchSize) {
          const batch = captionsToProcess.slice(i, i + batchSize);
          const batchStartIndex = startIndex ? startIndex + i : i;
          batches.push({
            batch,
            batchStartIndex,
            batchNumber: Math.floor(i / batchSize) + 1,
          });
        }

        ctx.response.writeMessageMetadata({
          loader: `Processing ${batches.length} batches of captions...`,
        });

        // Process all batches in parallel
        const batchResults = await Promise.all(
          batches.map(async ({ batch, batchStartIndex, batchNumber }) => {
            const promptGenerationResult = await generateObject({
              model: google(model || 'gemini-2.5-flash'),
              schema: MidjourneyPromptSchema,
              prompt: dedent`
                Generate Midjourney prompts for these captions based on the user's request: "${userRequest}"
                
                Captions to process (Batch ${batchNumber}/${batches.length}, ${batch.length} captions):
                ${batch.map((caption: any, index: number) => `${batchStartIndex + index}: "${caption.text}"`).join('\n')}
                
                ${
                  imageAnalysis
                    ? `
                Reference Image Descriptions:
                ${imageAnalysis.imageDescriptions
                  .map(
                    (desc, index) => `Image ${index + 1}: ${desc.description}`,
                  )
                  .join('\n')}
                
                User Request Alignment: ${imageAnalysis.userRequestAlignment}
                `
                    : ''
                }
                
                Generate Midjourney prompts that align with the user's request and reference images (if provided).
                Each prompt should be optimized for Midjourney and be creative and engaging.
                Do not put any -ar tags, or -v tags in the prompt.
              `,
              maxOutputTokens: 4000,
              maxRetries: 2,
            });

            console.log(
              `Batch ${batchNumber} USAGE`,
              promptGenerationResult.usage,
            );
            return promptGenerationResult.object.prompts;
          }),
        );

        // Flatten all batch results into a single array
        allPrompts = batchResults.flat();
      }

      const result = {
        prompts: allPrompts,
        processedCaptions: captionsToProcess.length,
        imageAnalysisUsed: !!imageAnalysis,
      };

      return result;
    } catch (error) {
      console.error('Error generating Midjourney prompts:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'generateMidjourneyPrompts',
    name: 'Generate Midjourney Prompts',
    description:
      'Analyzes reference images and generates Midjourney prompts for captions based on user request and image analysis.',
    inputSchema: MidjourneyPromptingInputSchema,
    outputSchema: MidjourneyPromptingOutputSchema,
    metadata: {
      icon: '🎨',
      title: 'Midjourney Prompt Generator',
      hideUI: false,
      category: 'ai-generation',
      tags: [
        'midjourney',
        'image-generation',
        'prompts',
        'ai-art',
        'captions',
        'visual-content',
      ],
    },
  });
