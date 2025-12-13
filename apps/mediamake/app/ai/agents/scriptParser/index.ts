import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';

const aiRouter = new AiRouter();

const scriptSchema = z.object({
  scenes: z.array(
    z.object({
      scene_number: z.number(),
      title: z.string(),
      script_elements: z.array(
        z.object({
          type: z.enum(['visual', 'dialogue']),
          character: z.string().optional(),
          content: z.string(),
        })
      ),
    })
  ),
});

export const scriptParserAgent = aiRouter
  .agent('/', async (ctx) => {
    ctx.response.writeMessageMetadata({
      loader: 'Parsing script...',
    });

    const { content } = ctx.request.params;

    if (!content) {
      throw new Error('No script content provided');
    }

    const { object } = await generateObject({
      model: google('gemini-2.0-flash-001'),
      schema: scriptSchema,
      prompt: `Parse the following script into scenes, visuals, and dialogues. 
      For dialogues, combine multiline dialogues into a single string.
      
      Script:
      ${content}`,
    });

    return object;
  })
  .actAsTool('/', {
    id: 'scriptParser',
    name: 'Script Parser',
    description: 'Parses a script into scenes, dialogues, and visuals.',
    inputSchema: z.object({
      content: z.string().describe('The full text of the script to be parsed.'),
    }),
    outputSchema: scriptSchema,
    metadata: {
      icon: '📝',
      title: 'Script Parser',
      hideUI: true,
    },
  });






