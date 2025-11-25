import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import dedent from 'dedent';

const aiRouter = new AiRouter();

// Video type enum
const VideoType = z.enum([
  'musicvideo',
  'instrumental',
  'informative',
  'blank',
]);

// Concept generation schema
const ConceptGenerationSchema = z.object({
  concepts: z
    .array(
      z.object({
        title: z.string().describe('Creative title for the concept'),
        ideaReasoning: z
          .string()
          .describe(
            'Strategic reasoning for why this concept would work, combining user idea with trends/celebrities/high concepts',
          ),
      }),
    )
    .length(10)
    .describe('10 creative concepts with strategic reasoning'),
});

// System prompts for different video types
const getSystemPrompt = (videoType: string, userPrompt?: string) => {
  const basePrompts = {
    musicvideo: dedent`
      You are a YouTube strategy expert specializing in music videos. Think like a content strategist who understands:
      - What makes people click on music videos
      - Current trends in music and pop culture
      - How to combine user ideas with popular concepts, celebrities, and viral trends
      - The psychology of YouTube titles and thumbnails
      - What resonates with music audiences across different genres
    `,
    instrumental: dedent`
      You are a YouTube strategy expert specializing in instrumental music. Think like a content strategist who understands:
      - What makes instrumental music clickable and shareable
      - How to position instrumental music for different audiences (producers, creators, listeners)
      - Current trends in ambient, cinematic, and background music
      - How to combine instrumental concepts with popular culture references
      - The psychology of what makes people engage with instrumental content
    `,
    informative: dedent`
      You are a YouTube strategy expert specializing in educational content. Think like a content strategist who understands:
      - What makes educational content go viral
      - How to position learning content for maximum engagement
      - Current trends in education, productivity, and self-improvement
      - How to combine educational concepts with popular culture and trends
      - The psychology of what makes people want to learn and share knowledge
    `,
    blank: dedent`
      You are a YouTube strategy expert with broad knowledge across all content types. Think like a content strategist who understands:
      - What makes any content clickable and engaging
      - Current trends across all categories
      - How to combine any user idea with popular concepts and trends
      - The psychology of YouTube engagement
      - What resonates with different audiences and demographics
    `,
  };

  const basePrompt = basePrompts[videoType as keyof typeof basePrompts] || '';
  const userAddition = userPrompt
    ? `\n\nAdditional user requirements: ${userPrompt}`
    : '';

  return basePrompt + userAddition;
};

export const conceptAgent = aiRouter
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Generating creative concepts...',
      });

      const { userDescription, videoType, model, userPrompt } =
        ctx.request.params;

      const systemPrompt = getSystemPrompt(videoType || 'blank', userPrompt);
      const selectedModel = google(model || 'gemini-2.5-pro');

      const result = await generateObject({
        model: selectedModel,
        system: systemPrompt,
        prompt: dedent`
        Based on this user description: "${userDescription}"
        
        Generate 10 creative, strategic concepts that combine the user's core idea with popular trends, celebrities, high concepts, or viral elements.
        
        Think like a YouTube strategist. For example:
        - "Epic motivational music" → "WARNING: This music will relight your fire 🔥"
        - "Wild west music" → "John Wick X Wild West" 
        - "Epic Suspense Music" -> No Fear - Heartbeat at 200MPH
        - "Loner Music" -> I  Dont Lose, Ever! -  Aura of Champions  | Reflective Instrumental Music
        
        Each concept should have a compelling title and strategic reasoning for why it would work.
        Focus on what people already know and love, and combine it with the user's content.
      `,
        schema: ConceptGenerationSchema,
        maxOutputTokens: 3000,
      });

      console.log('Concepts Result USAGE', result.usage);

      return result.object;
    } catch (error) {
      console.error('Error generating concepts:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'generateConcepts',
    name: 'Generate Creative Concepts',
    description:
      'Generates 10 creative, strategic concepts that combine user ideas with popular trends, celebrities, and viral elements.',
    inputSchema: z.object({
      userDescription: z
        .string()
        .describe('Description of the audio/video content'),
      videoType: VideoType.optional().describe(
        'Type of video content (musicvideo, instrumental, informative, blank)',
      ),
      model: z.string().optional().describe('AI model to use for generation'),
      userPrompt: z
        .string()
        .optional()
        .describe('Additional user requirements to add to system prompt'),
    }) as any,
    outputSchema: ConceptGenerationSchema as any,
    metadata: {
      icon: 'https://cdn.svglogos.dev/logos/youtube-icon.svg',
      title: 'Concept Generator',
      hideUI: false,
    },
  });
