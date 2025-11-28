import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import dedent from 'dedent';

const aiRouter = new AiRouter();

// Input schema - same as ideateStory agent, plus optional fields from simple
const Pipeline2InputSchema = z.object({
  story: z
    .string()
    .describe('The full story to divide into scenes and generate shots for'),
  sceneCount: z
    .number()
    .min(1)
    .max(50)
    .describe('Number of scenes to divide the story into'),
  shotCount: z
    .number()
    .min(1)
    .max(20)
    .describe('Number of shots to generate for each scene'),
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
    .default('digitalart')
    .describe(
      'Creative style for inspiration generation: abstract, digitalart, inspirational, user-directive-focused, stock-realistic, cinematic, minimalist, surreal, documentary, commercial',
    ),
  predefinedPreferences: z
    .array(z.string())
    .optional()
    .describe('Array of predefined preferences (e.g., Midjourney parameters)'),
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
    .describe('Array of image URLs to analyze (passed to simple agent)'),
  userRequest: z
    .string()
    .optional()
    .describe('User request or context for shot generation'),
});

// Output schema - combines ideateStory and simple outputs
const Pipeline2OutputSchema = z.object({
  scenes: z.array(
    z.object({
      title: z.string().describe('Brief title for the scene'),
      description: z.string().describe('Detailed description of the scene'),
      shots: z
        .array(z.string())
        .describe('Array of creative shot ideas for this scene'),
      prompts: z
        .array(
          z.object({
            shotIndex: z.number(),
            shotDescription: z.string(),
            prompt: z.string(),
          }),
        )
        .describe('Array of Midjourney prompts generated for this scene'),
      processedShots: z
        .number()
        .describe('Number of shots processed for this scene'),
      imageAnalysisUsed: z
        .boolean()
        .describe('Whether image analysis was used for this scene'),
      _id: z
        .string()
        .optional()
        .describe('Database ID of the saved prompt record for this scene'),
    }),
  ),
  predefinedPreferences: z.array(z.string()),
  variationCount: z.number(),
  model: z.string().optional(),
  tags: z.array(z.string()),
  creativeInspiration: z
    .string()
    .optional()
    .describe('The creative inspiration document generated for this ideation'),
  totalProcessedShots: z
    .number()
    .describe('Total number of shots processed across all scenes'),
  totalPrompts: z.number().describe('Total number of prompts generated'),
});

export const pipeline2Agent = aiRouter
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Starting story-based image generation pipeline...',
      });

      const inputParams = ctx.request.params as z.infer<
        typeof Pipeline2InputSchema
      >;

      // Step 1: Call ideateStory agent
      ctx.response.writeMessageMetadata({
        loader: 'Dividing story into scenes and generating shot ideas...',
      });

      let modelIdToUse = inputParams.model ?? 'claude-opus-4-5';

      const ideateStoryResult = await ctx.next.callAgent(
        '@/midjourney/ideate-story',
        {
          story: inputParams.story,
          sceneCount: inputParams.sceneCount,
          shotCount: inputParams.shotCount,
          style: inputParams.style,
          predefinedPreferences: inputParams.predefinedPreferences,
          variationCount: inputParams.variationCount,
          model: inputParams.model ?? modelIdToUse,
          tags: inputParams.tags,
        },
        {
          streamToUI: true,
        },
      );

      if (!ideateStoryResult.ok) {
        throw new Error(
          `IdeateStory agent failed: ${ideateStoryResult.error?.message || 'Unknown error'}`,
        );
      }

      const ideateStoryOutput = ideateStoryResult.data;

      // Step 2: Generate story title based on story description
      ctx.response.writeMessageMetadata({
        loader: 'Generating story title...',
      });

      const modelToUse =
        modelIdToUse && modelIdToUse.startsWith('claude')
          ? anthropic(modelIdToUse)
          : google(modelIdToUse || 'gemini-2.5-flash');

      const storyTitleResult = await generateText({
        model: modelToUse,
        prompt: dedent`
          Generate a concise, descriptive title (maximum 40 characters) for this story based on the following:
          
          Story:
          "${inputParams.story}"
          
          The title should be:
          - Concise and descriptive (max 40 characters)
          - Capture the essence of the story
          - Suitable for use as a story identifier
          - No quotes or special formatting needed
          
          Return only the title, nothing else.
        `,
        maxRetries: 2,
      });

      const storyTitle = storyTitleResult.text
        .trim()
        .replace(/^["']|["']$/g, '');

      // Step 3: For each scene, generate scene title and call simple agent
      ctx.response.writeMessageMetadata({
        loader: `Generating Midjourney prompts for ${ideateStoryOutput.scenes.length} scenes...`,
      });

      const scenesWithPrompts = await Promise.all(
        ideateStoryOutput.scenes.map(async (scene: any, sceneIndex: number) => {
          ctx.response.writeMessageMetadata({
            loader: `Processing scene ${sceneIndex + 1}/${ideateStoryOutput.scenes.length}: ${scene.title}...`,
          });

          // Generate scene title based on scene description
          const sceneTitleResult = await generateText({
            model: modelToUse,
            prompt: dedent`
              Generate a concise, descriptive title (maximum 30 characters) for this scene based on the following:
              
              Scene Description:
              "${scene.description}"
              
              Story Context:
              "${inputParams.story}"
              
              The title should be:
              - Concise and descriptive (max 30 characters)
              - Capture the essence of this specific scene
              - Suitable for use as a scene identifier
              - No quotes or special formatting needed
              
              Return only the title, nothing else.
            `,
            maxRetries: 2,
          });

          const sceneTitle = sceneTitleResult.text
            .trim()
            .replace(/^["']|["']$/g, '');
          const combinedTitle = `${storyTitle} - ${sceneTitle}`;

          // Use creativeInspiration as userRequest if userRequest is empty or null
          const userRequest =
            inputParams.userRequest && inputParams.userRequest.trim() !== ''
              ? inputParams.userRequest
              : ideateStoryOutput.creativeInspiration || '';

          modelIdToUse = inputParams.model ?? 'claude-haiku-4-5';

          const simpleResult = await ctx.next.callAgent(
            '@/midjourney/simple',
            {
              title: combinedTitle,
              shots: scene.shots,
              predefinedPreferences:
                ideateStoryOutput.predefinedPreferences || [],
              variationCount: ideateStoryOutput.variationCount || 0,
              model: inputParams.model ?? modelIdToUse,
              tags: ideateStoryOutput.tags || [],
              mediaUrls: inputParams.mediaUrls,
              userRequest: userRequest,
            },
            {
              streamToUI: true,
            },
          );

          if (!simpleResult.ok) {
            console.error(
              `Simple agent failed for scene ${sceneIndex + 1}:`,
              simpleResult.error,
            );
            // Return scene with empty prompts if simple agent fails
            return {
              title: scene.title,
              description: scene.description,
              shots: scene.shots,
              prompts: [],
              processedShots: 0,
              imageAnalysisUsed: false,
              _id: undefined,
            };
          }

          const simpleOutput = simpleResult.data;

          return {
            title: scene.title,
            description: scene.description,
            shots: scene.shots,
            prompts: simpleOutput.prompts || [],
            processedShots: simpleOutput.processedShots || 0,
            imageAnalysisUsed: simpleOutput.imageAnalysisUsed || false,
            _id: simpleOutput._id,
          };
        }),
      );

      // Calculate totals
      const totalProcessedShots = scenesWithPrompts.reduce(
        (sum, scene) => sum + scene.processedShots,
        0,
      );
      const totalPrompts = scenesWithPrompts.reduce(
        (sum, scene) => sum + scene.prompts.length,
        0,
      );

      // Return the final output
      return {
        scenes: scenesWithPrompts,
        predefinedPreferences: ideateStoryOutput.predefinedPreferences || [],
        variationCount: ideateStoryOutput.variationCount || 0,
        model: ideateStoryOutput.model || inputParams.model,
        tags: ideateStoryOutput.tags || [],
        creativeInspiration: ideateStoryOutput.creativeInspiration,
        totalProcessedShots,
        totalPrompts,
      };
    } catch (error) {
      console.error('Error in pipeline2:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'pipeline2StoryImageGeneration',
    name: 'Story-Based Image Generation Pipeline',
    description:
      'Complete pipeline for story-based image generation: divides a story into scenes, generates creative shot ideas for each scene, and converts them to Midjourney prompts. Combines ideateStory and simple agents.',
    inputSchema: Pipeline2InputSchema,
    outputSchema: Pipeline2OutputSchema,
    metadata: {
      icon: 'https://cdn.svglogos.dev/logos/anthropic-icon.svg',
      title: 'Story-Based Image Generation Pipeline',
      hideUI: false,
      category: 'ai-generation',
      tags: [
        'midjourney',
        'ideation',
        'story',
        'scenes',
        'pipeline',
        'image-generation',
        'prompts',
        'bulk-generation',
      ],
    },
  });
