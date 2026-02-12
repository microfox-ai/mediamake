import { google } from '@ai-sdk/google';
import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { generateObject, convertToModelMessages } from 'ai';
import dedent from 'dedent';
import { appendUsage } from '@/app/ai/middlewares/usageCapture';

const aiRouter = new AiRouter();

// Video type enum
const VideoType = z.enum([
  'musicvideo',
  'instrumental',
  'informative',
  'blank',
]);

// Final metadata schema
const YouTubeMetadataSchema = z.object({
  title: z.string().describe('The selected or generated title'),
  descriptiveText: z
    .string()
    .describe('Compelling description (3-4 lines max)'),
  hashtags: z
    .array(z.string())
    .max(8)
    .describe('YouTube SEO hashtags (maximum 8)'),
  thumbnailIdea: z
    .string()
    .describe('Detailed description of thumbnail design and elements'),
  artworkPrompt: z
    .string()
    .describe('Prompt for generating artwork without titles or text'),
  finalDescription: z
    .string()
    .describe('Final formatted description with user input and action trigger'),
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

export const youtubeAgent = aiRouter
  .agent('/', async ctx => {
    ctx.response.writeMessageMetadata({
      loader: 'Generating YouTube metadata...',
    });

    const {
      userDescription,
      videoType,
      model,
      userPrompt,
      userInsertedDescription,
      selectedTitle,
    } = ctx.request.params;

    const systemPrompt = getSystemPrompt(videoType || 'blank', userPrompt);
    const selectedModel = google(model || 'gemini-2.5-pro');
    let metadata;

    try {
      // Generate final metadata
      const metadataResult = await generateObject({
        model: selectedModel,
        system: systemPrompt,
        prompt: dedent`
        Create final YouTube metadata for this content:
        
        User Description: ${userDescription}
        ${selectedTitle ? `Selected Title: ${selectedTitle}` : 'Generate a compelling title based on the content'}
        
        Generate:
        - A compelling title (if not provided)
        - A compelling description (3-4 lines max)
        - 8 relevant hashtags (all lowercase, no spaces)
        - Detailed thumbnail idea
        - Artwork prompt (for AI art generation)
      `,
        schema: YouTubeMetadataSchema.omit({ finalDescription: true }),
        maxOutputTokens: 2000,
      });
      if (metadataResult.usage) {
        appendUsage(ctx.state, 'google/gemini-2.5-pro', metadataResult.usage);
      }

      metadata = metadataResult.object;

    } catch (error) {
      console.error("Error generating YouTube metadata:", error)
      throw error
    }

    // Return the complete result
    return {
      ...metadata,
      finalDescription: dedent`
        ${metadata.descriptiveText}\n
        ${userInsertedDescription || ''}\n
        ${metadata.hashtags.map(hashtag => `#${hashtag}`).join(', ')}
      `,
    };
  })
  .actAsTool('/', {
    id: 'generateYouTubeMetadata',
    name: 'Generate YouTube Metadata',
    description:
      'Generates comprehensive YouTube metadata including titles, hashtags, descriptions, and artwork prompts for different video types.',
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
      userInsertedDescription: z
        .string()
        .optional()
        .describe('User-provided description to include in final output'),
      selectedTitle: z
        .string()
        .optional()
        .describe(
          'Optional pre-selected title (if not provided, will generate one)',
        ),
    }) as any,
    outputSchema: YouTubeMetadataSchema as any,
    metadata: {
      icon: 'https://cdn.svglogos.dev/logos/youtube-icon.svg',
      title: 'YouTube Metadata Generator',
      hideUI: false,
    },
  });
