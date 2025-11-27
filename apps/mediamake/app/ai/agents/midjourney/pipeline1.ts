import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import dedent from 'dedent';

const aiRouter = new AiRouter();

// Input schema - same as ideate agent
const AbstractBulkImageGenerationInputSchema = z.object({
  userDirective: z
    .string()
    .describe(
      'User directive describing what kind of video/content they are creating',
    ),
  style: z
    .enum([
      'abstract',
      'digitalart',
      'inspirational',
      'user-directive-focused',
      'stock-realistic',
      'cinematic',
      'minimalist',
      'surreal',
      'documentary',
      'commercial',
    ])
    .optional()
    .default('abstract')
    .describe(
      'Creative style for inspiration generation: abstract, digitalart, inspirational, user-directive-focused, stock-realistic, cinematic, minimalist, surreal, documentary, commercial',
    ),
  predefinedPreferences: z
    .array(z.string())
    .optional()
    .describe('Array of predefined preferences (e.g., Midjourney parameters)'),
  ideaCount: z
    .number()
    .min(1)
    .max(50)
    .describe('Number of creative ideas/shots to generate'),
  variationCount: z
    .number()
    .min(0)
    .optional()
    .describe('Number of variations to generate for each idea'),
  model: z.string().optional().describe('AI model to use for generation'),
  tags: z
    .array(z.string())
    .optional()
    .describe('Array of tags for querying and organization'),
  mediaUrls: z
    .array(z.string())
    .optional()
    .describe('Array of image URLs to analyze'),
  userRequest: z
    .string()
    .optional()
    .describe('User request or context for shot generation'),
});

// Output schema - same as simple agent output
const AbstractBulkImageGenerationOutputSchema = z.object({
  prompts: z.array(
    z.object({
      shotIndex: z.number(),
      shotDescription: z.string(),
      prompt: z.string(),
    }),
  ),
  processedShots: z.number().describe('Number of shots processed'),
  imageAnalysisUsed: z.boolean().describe('Whether image analysis was used'),
  _id: z.string().optional().describe('Database ID of the saved prompt record'),
  ideateOutput: z
    .object({
      predefinedPreferences: z.array(z.string()),
      shots: z.array(z.string()),
      variationCount: z.number(),
      model: z.string().optional(),
      tags: z.array(z.string()),
      creativeInspiration: z.string().optional(),
    })
    .optional()
    .describe('Output from the ideate step'),
});

export const abstractBulkImageGenerationAgent = aiRouter
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Starting abstract bulk image generation pipeline...',
      });

      const inputParams = ctx.request.params as z.infer<
        typeof AbstractBulkImageGenerationInputSchema
      >;

      // Step 1: Call ideate agent
      ctx.response.writeMessageMetadata({
        loader: 'Generating creative shot ideas...',
      });

      const modelIdToUse = inputParams.model ?? 'claude-opus-4-1';

      const ideateResult = await ctx.next.callAgent(
        '@/midjourney/ideate',
        {
          userDirective: inputParams.userDirective,
          style: inputParams.style,
          predefinedPreferences: inputParams.predefinedPreferences,
          ideaCount: inputParams.ideaCount,
          variationCount: inputParams.variationCount,
          model: modelIdToUse,
          tags: inputParams.tags,
        },
        {
          streamToUI: true,
        },
      );

      if (!ideateResult.ok) {
        throw new Error(
          `Ideate agent failed: ${ideateResult.error?.message || 'Unknown error'}`,
        );
      }

      const ideateOutput = ideateResult.data;

      // Step 2: Generate title based on creativeInspiration + userDirective
      ctx.response.writeMessageMetadata({
        loader: 'Generating title...',
      });

      const modelToUse = modelIdToUse.startsWith('claude')
        ? anthropic(modelIdToUse)
        : google(modelIdToUse || 'gemini-2.5-flash');

      const titleResult = await generateText({
        model: modelToUse,
        prompt: dedent`
          Generate a concise, descriptive title (maximum 60 characters) for this image generation batch based on the following information:
          
          User Directive: "${inputParams.userDirective}"
          
          Creative Inspiration:
          ${ideateOutput.creativeInspiration || 'N/A'}
          
          The title should be:
          - Concise and descriptive (max 60 characters)
          - Capture the essence of the user directive and creative inspiration
          - Suitable for use as a batch identifier
          - No quotes or special formatting needed
          
          Return only the title, nothing else.
        `,
        maxRetries: 2,
      });

      const generatedTitle = titleResult.text
        .trim()
        .replace(/^["']|["']$/g, '');

      // Step 3: Call simple agent with ideate output
      ctx.response.writeMessageMetadata({
        loader: 'Generating Midjourney prompts from shot ideas...',
      });

      // Use creativeInspiration as userRequest if userRequest is empty or null
      const userRequest =
        inputParams.userRequest && inputParams.userRequest.trim() !== ''
          ? inputParams.userRequest
          : ideateOutput.creativeInspiration || '';

      const simpleResult = await ctx.next.callAgent(
        '@/midjourney/simple',
        {
          title: generatedTitle,
          shots: ideateOutput.shots,
          predefinedPreferences: ideateOutput.predefinedPreferences,
          variationCount: ideateOutput.variationCount,
          model: modelIdToUse ?? 'claude-opus-4-1',
          tags: ideateOutput.tags,
          mediaUrls: inputParams.mediaUrls,
          userRequest: userRequest,
        },
        {
          streamToUI: true,
        },
      );

      if (!simpleResult.ok) {
        throw new Error(
          `Simple agent failed: ${simpleResult.error?.message || 'Unknown error'}`,
        );
      }

      const simpleOutput = simpleResult.data;

      // Return the final output with ideate output included for reference
      return {
        ...simpleOutput,
        ideateOutput: ideateOutput,
      };
    } catch (error) {
      console.error('Error in abstract bulk image generation pipeline:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'abstractBulkImageGeneration',
    name: 'Abstract Bulk Image Generation',
    description:
      'Generates creative shot ideas using ideate agent, then converts them to Midjourney prompts using simple agent. A complete pipeline for bulk image generation.',
    inputSchema: AbstractBulkImageGenerationInputSchema,
    outputSchema: AbstractBulkImageGenerationOutputSchema,
    metadata: {
      icon: 'https://cdn.svglogos.dev/logos/anthropic-icon.svg',
      title: 'Abstract Bulk Image Generation',
      hideUI: false,
      category: 'ai-generation',
      tags: [
        'midjourney',
        'ideation',
        'bulk-generation',
        'pipeline',
        'image-generation',
        'prompts',
      ],
    },
  });
