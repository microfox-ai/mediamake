import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { updateGenerationProgress } from './helpers';

const aiRouter = new AiRouter();

// Input schema for the agent
const UpdateProgressInputSchema = z.object({
  _id: z.string().describe('MongoDB _id of the prompt record to update'),
  generatedIndexes: z
    .array(z.number())
    .describe('Array of indexes that have been generated'),
  tags: z
    .array(z.string())
    .optional()
    .describe('Array of tags for querying and organization (optional update)'),
});

// Output schema for the agent
const UpdateProgressOutputSchema = z.object({
  _id: z.string(),
  generatedIndexes: z.array(z.number()),
  generationProgress: z.number().describe('Progress percentage (0-100)'),
  isGenerated: z.boolean().describe('Whether all prompts have been generated'),
  totalPrompts: z.number().describe('Total number of prompts'),
});

export const updateProgressAgent = aiRouter
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Updating generation progress...',
      });

      const { _id, generatedIndexes, tags } = ctx.request.params as z.infer<
        typeof UpdateProgressInputSchema
      >;

      if (!_id) {
        throw new Error('_id is required');
      }

      if (!Array.isArray(generatedIndexes)) {
        throw new Error('generatedIndexes must be an array');
      }

      const updatedRecord = await updateGenerationProgress(
        _id,
        generatedIndexes,
        tags,
      );

      if (!updatedRecord) {
        throw new Error(`Record with _id ${_id} not found`);
      }

      return {
        _id: updatedRecord._id?.toString() || _id,
        generatedIndexes: updatedRecord.generatedIndexes,
        generationProgress: updatedRecord.generationProgress,
        isGenerated: updatedRecord.isGenerated,
        totalPrompts: updatedRecord.prompts.length,
      };
    } catch (error) {
      console.error('Error updating generation progress:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'updateMidjourneyGenerationProgress',
    name: 'Update Midjourney Generation Progress',
    description:
      'Updates the generation progress for a Midjourney prompt record by marking which indexes have been generated.',
    inputSchema: UpdateProgressInputSchema,
    outputSchema: UpdateProgressOutputSchema,
    metadata: {
      icon: 'https://cdn.svglogos.dev/logos/midjourney.svg',
      title: 'Update Generation Progress',
      hideUI: true,
      category: 'ai-generation',
      tags: ['midjourney', 'progress', 'generation', 'database', 'update'],
    },
  });
