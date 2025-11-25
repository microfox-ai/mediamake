import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import dedent from 'dedent';

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
        prompt: z
          .string()
          .describe('Generated Midjourney prompt for this shot'),
      }),
    )
    .describe('Generated Midjourney prompts for each shot'),
});

const MidjourneyPromptsWithVariationsSchema = z.object({
  shots: z.array(z.string().describe('Description of the shot')),
  prompts: z
    .array(
      z.object({
        prompt: z
          .string()
          .describe('Generated Midjourney prompt for this shot'),
        variations: z
          .array(z.string())
          .optional()
          .describe('Additional variations of the prompt'),
      }),
    )
    .describe('Generated Midjourney prompts for each shot'),
});

// Schema for generating shot descriptions from a scene
const ShotGenerationSchema = z.object({
  shots: z
    .array(
      z.object({
        shotDescription: z.string().describe('Simple description of the shot'),
      }),
    )
    .describe('Array of shot descriptions generated from the scene'),
});

// Input schema for the agent
const MidjourneyPromptingInputSchema = z.object({
  scene: z
    .object({
      shotCount: z.number().describe('The number of shots to generate'),
      description: z.string().describe('The scene to generate shots for'),
    })
    .optional()
    .describe(
      'Scene description and shot count (if shots array is not provided)',
    ),
  shots: z
    .array(z.string().describe('Description of the shot'))
    .optional()
    .describe('Array of shots to generate (if scene is not provided)'),
  mediaUrls: z
    .array(z.string())
    .optional()
    .describe('Array of image URLs to analyze'),
  variationCount: z
    .number()
    .optional()
    .describe('Number of variations to generate'),
  model: z.string().optional().describe('AI model to use for generation'),
  predefinedPreferences: z
    .array(z.string())
    .optional()
    .describe(
      'Array of predefined preferences that will be attached at the end of the generated prompt',
    ),
  userRequest: z
    .string()
    .optional()
    .describe('User request or context for shot generation'),
});

// Output schema for the agent
const MidjourneyPromptingOutputSchema = z.object({
  prompts: z.array(
    z.object({
      shotIndex: z.number(),
      shotDescription: z.string(),
      prompt: z.string(),
    }),
  ),
  processedShots: z.number().describe('Number of shots processed'),
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

export const midjourneySimpleAgent = aiRouter
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Analyzing images and generating Midjourney prompts...',
      });

      const {
        shots: providedShots,
        scene,
        mediaUrls,
        variationCount = 0,
        userRequest,
        model,
        predefinedPreferences = [],
      } = ctx.request.params as z.infer<typeof MidjourneyPromptingInputSchema>;

      // Validate that either shots or scene is provided
      if ((!providedShots || providedShots.length === 0) && !scene) {
        throw new Error(
          'Either shots array or scene description with shotCount must be provided',
        );
      }

      let shots: string[] = [];

      // Step 1: Generate shot descriptions from scene if shots are not provided
      if ((!providedShots || providedShots.length === 0) && scene) {
        ctx.response.writeMessageMetadata({
          loader: `Generating ${scene.shotCount} shot descriptions from scene...`,
        });

        const shotGenerationResult = await generateObject({
          model: google(model || 'gemini-2.5-flash'),
          schema: ShotGenerationSchema,
          prompt: dedent`
            Generate ${scene.shotCount} shot descriptions based on the following scene:
            
            Scene: "${scene.description}"
            
            ${userRequest ? `User Request: "${userRequest}"` : ''}
            
            Generate simple, clear shot descriptions that break down the scene into ${scene.shotCount} distinct shots.
            Each shot description should be concise and describe what should be shown in that specific shot.
            The shots should work together to tell the story of the scene.
          `,
          maxRetries: 2,
        });

        shots =
          shotGenerationResult.object.shots?.map(
            (shot: { shotDescription: string }) => shot.shotDescription,
          ) || [];

        console.log('Shot Generation USAGE', shotGenerationResult.usage);

        if (shots.length === 0) {
          throw new Error('Failed to generate shot descriptions from scene');
        }
      } else if (providedShots && providedShots.length > 0) {
        shots = providedShots;
      }

      let imageAnalysis = null;
      let imageBase64Data: string[] = [];

      // Step 2: Analyze images if provided
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
                    Analyze these reference images in the context of the user's request: "${userRequest || 'Generate Midjourney prompts for the given shots'}"
                    
                    For each image, provide a detailed description of the content, style, mood, and visual elements.
                    
                    The user wants to generate Midjourney prompts for shots based on these reference images.
                  `,
                },
                ...imageBase64Data.map(base64 => ({
                  type: 'image' as const,
                  image: base64,
                })),
              ],
            },
          ],
          maxRetries: 2,
        });

        imageAnalysis = imageAnalysisResult.object;
        console.log('Image Analysis USAGE', imageAnalysisResult.usage);
      }

      // Step 3: Generate Midjourney prompts
      ctx.response.writeMessageMetadata({
        loader: 'Generating Midjourney prompts for shots...',
      });

      let allPrompts: any[] = [];

      if (shots.length <= 10) {
        // Process all shots at once if 10 or fewer
        const promptGenerationResult = await generateObject({
          model: google(model || 'gemini-2.5-pro'),
          schema:
            variationCount === 0
              ? MidjourneyPromptSchema
              : MidjourneyPromptsWithVariationsSchema,
          prompt: dedent`
            Generate Midjourney prompts for these shots based on the user's request: "${userRequest || 'Generate creative Midjourney prompts'}"
            
            Shots to process (${shots.length} total):
            ${shots.map((shot: string, index: number) => `${index}: "${shot}"`).join('\n')}
            
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
            
            ${
              predefinedPreferences.length > 0
                ? `
            Predefined Preferences to include: ${predefinedPreferences.join(', ')}
            `
                : ''
            }
            
            Generate Midjourney prompts that align with the user's request and reference images (if provided).
            Each prompt should be optimized for Midjourney and be creative and engaging.
            ${variationCount > 1 ? `Generate ${variationCount} variations for each shot.` : ''}
            Do not include -ar tags, -v tags, or other Midjourney parameters in the prompts.
          `,
          maxOutputTokens: 4000,
          maxRetries: 2,
        });

        console.log('Prompt Generation USAGE', promptGenerationResult.usage);

        // Flatten prompts and variations into a single array
        allPrompts = [];
        promptGenerationResult.object.prompts?.forEach(
          (promptObj: any, index: number) => {
            const shotIndex = index;
            const shotDescription = shots[shotIndex] || '';

            // Add the main prompt
            allPrompts.push({
              shotIndex,
              shotDescription,
              prompt: promptObj.prompt,
            });

            // Add variations as separate entries if they exist
            if (promptObj.variations && Array.isArray(promptObj.variations)) {
              promptObj.variations.forEach((variation: string) => {
                allPrompts.push({
                  shotIndex,
                  shotDescription,
                  prompt: variation,
                });
              });
            }
          },
        );
      } else {
        // Process in batches of 10
        const batchSize = 10;
        const batches = [];

        for (let i = 0; i < shots.length; i += batchSize) {
          const batch = shots.slice(i, i + batchSize);
          batches.push({
            batch,
            batchStartIndex: i,
            batchNumber: Math.floor(i / batchSize) + 1,
          });
        }

        ctx.response.writeMessageMetadata({
          loader: `Processing ${batches.length} batches of shots...`,
        });

        // Process all batches in parallel
        const batchResults = await Promise.all(
          batches.map(async ({ batch, batchStartIndex, batchNumber }) => {
            const promptGenerationResult = await generateObject({
              model: google(model || 'gemini-2.5-flash'),
              schema:
                variationCount === 0
                  ? MidjourneyPromptSchema
                  : MidjourneyPromptsWithVariationsSchema,
              prompt: dedent`
                Generate Midjourney prompts for these shots based on the user's request: "${userRequest || 'Generate creative Midjourney prompts'}"
                
                Shots to process (Batch ${batchNumber}/${batches.length}, ${batch.length} shots):
                ${batch.map((shot: string, index: number) => `${batchStartIndex + index}: "${shot}"`).join('\n')}
                
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
                
                ${
                  predefinedPreferences.length > 0
                    ? `
                Predefined Preferences to include: ${predefinedPreferences.join(', ')}
                `
                    : ''
                }
                
                Generate Midjourney prompts that align with the user's request and reference images (if provided).
                Each prompt should be optimized for Midjourney and be creative and engaging.
                ${variationCount > 1 ? `Generate ${variationCount} variations for each shot.` : ''}
                Do not include -ar tags, -v tags, or other Midjourney parameters in the prompts.
              `,
              maxOutputTokens: 4000,
              maxRetries: 2,
            });

            console.log(
              `Batch ${batchNumber} USAGE`,
              promptGenerationResult.usage,
            );

            // Flatten prompts and variations for this batch
            const flattenedBatch: any[] = [];
            promptGenerationResult.object.prompts?.forEach(
              (promptObj: any, index: number) => {
                const shotIndex = batchStartIndex + index;
                const shotDescription = shots[shotIndex] || '';

                // Add the main prompt
                flattenedBatch.push({
                  shotIndex,
                  shotDescription,
                  prompt: promptObj.prompt,
                });

                // Add variations as separate entries if they exist
                if (
                  promptObj.variations &&
                  Array.isArray(promptObj.variations)
                ) {
                  promptObj.variations.forEach((variation: string) => {
                    flattenedBatch.push({
                      shotIndex,
                      shotDescription,
                      prompt: variation,
                    });
                  });
                }
              },
            );

            return flattenedBatch;
          }),
        );

        // Flatten all batch results into a single array
        allPrompts = batchResults.flat();
      }

      const result = {
        prompts: allPrompts,
        processedShots: shots.length,
        imageAnalysisUsed: !!imageAnalysis,
      };

      return result;
    } catch (error) {
      console.error('Error generating Midjourney prompts:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'generateMidjourneyPromptsSimple',
    name: 'Shot Based Midjourney Prompts (Simple)',
    description:
      'Analyzes reference images and generates Midjourney prompts for shots based on user request and image analysis.',
    inputSchema: MidjourneyPromptingInputSchema,
    outputSchema: MidjourneyPromptingOutputSchema,
    metadata: {
      icon: 'https://cdn.svglogos.dev/logos/midjourney.svg',
      title: 'Midjourney Prompt Generator (Simple)',
      hideUI: false,
      category: 'ai-generation',
      tags: [
        'midjourney',
        'image-generation',
        'prompts',
        'ai-art',
        'shots',
        'visual-content',
      ],
    },
  });
