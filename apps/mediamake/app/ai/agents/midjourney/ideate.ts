import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { generateText, generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import dedent from 'dedent';

const aiRouter = new AiRouter();

// Available styles for creative inspiration
export const IDEATION_STYLES = [
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
] as const;

export type IdeationStyle = (typeof IDEATION_STYLES)[number];

// Function to get style-based creative inspiration prompt
function getStyleBasedPrompt(
  style: IdeationStyle,
  userDirective: string,
  ideaCount: number,
): string {
  const stylePrompts: Record<IdeationStyle, string> = {
    abstract: dedent`
      You are a creative director and visual storyteller specializing in abstract and conceptual art. Your task is to analyze a user's directive and create a rich foundation of creative inspiration.
      
      User Directive: "${userDirective}"
      
      Think deeply about:
      - What abstract concepts, themes, and emotions are relevant?
      - What visual metaphors could represent these ideas?
      - What unexpected combinations or perspectives could be explored?
      - What universal human experiences connect to this directive?
      - What creative angles haven't been explored yet?
      
      Generate a comprehensive creative inspiration document that explores:
      1. Core themes and abstract concepts
      2. Visual metaphors and symbolic representations
      3. Emotional undertones and mood directions
      4. Unexpected creative angles and perspectives
      5. Universal connections and relatable experiences
      6. Mix-and-match possibilities for unique combinations
      
      This inspiration will be used to generate ${ideaCount} creative shot ideas. Be thorough, creative, and think outside the box.
      Focus on abstract ideas, not specific image descriptions. Emphasize conceptual depth, symbolic meaning, and emotional resonance.
    `,

    digitalart: dedent`
      You are a digital art director and concept artist. Your task is to analyze a user's directive and create a focused, directive-aligned foundation of creative inspiration for digital art creation.
      
      User Directive: "${userDirective}"
      
      FIRST, expand and clarify the user directive:
      - What is the user specifically asking for? Break down the directive into clear, concrete requirements.
      - What are the key subjects, objects, scenes, or concepts explicitly mentioned?
      - What are the implicit details that need to be understood?
      - What is the core intent and purpose behind this directive?
      - Create an expanded, detailed interpretation of what the user wants.
      
      THEN, based on this expanded understanding of the directive, generate a comprehensive creative inspiration document that:
      1. Directly addresses the user's directive with specific digital art interpretations
      2. Identifies the exact subjects, scenes, or concepts from the directive that need visual representation
      3. Suggests digital art techniques and styles (3D, vector, pixel art, digital painting, etc.) that best serve the directive
      4. Recommends color palettes, lighting, and composition that align with the directive's requirements
      5. Proposes textures, patterns, and digital effects that enhance the directive's core elements
      6. Integrates tech-inspired or futuristic elements ONLY if they serve the directive
      
      CRITICAL: Stay focused on the user's directive. Every suggestion must directly relate to what the user asked for. Avoid abstract concepts that don't connect to the specific directive. The inspiration should help create visuals that clearly fulfill the user's request using digital art techniques.
      
      This inspiration will be used to generate ${ideaCount} creative shot ideas. Prioritize directive-focused concepts over abstract exploration. Each idea should clearly relate back to the user's specific request.
    `,

    inspirational: dedent`
      You are an inspirational content creator and motivational storyteller. Your task is to analyze a user's directive and create uplifting, empowering creative inspiration.
      
      User Directive: "${userDirective}"
      
      Think deeply about the user directive and create a comprehensive creative inspiration
      
      This inspiration will be used to generate ${ideaCount} creative shot ideas. Focus on uplifting, empowering concepts that inspire and motivate viewers.
    `,

    'user-directive-focused': dedent`
      You are a precise creative strategist. Your task is to analyze a user's directive and create focused, directive-aligned creative inspiration that stays true to the user's intent.
      
      User Directive: "${userDirective}"
      
      FIRST, expand and clarify the user directive:
      - What is the user specifically asking for? Break down the directive into clear, concrete requirements.
      - What are the key subjects, objects, scenes, or concepts explicitly mentioned?
      - What are the implicit details that need to be understood?
      - What is the core intent and purpose behind this directive?
      - Create an expanded, detailed interpretation of what the user wants
      
      Think deeply about:
      - What are the explicit requirements and goals in the user's directive?
      - What are the implicit needs and expectations?
      - What specific elements, subjects, or themes must be included?
      - What constraints or boundaries should be respected?
      - How can the directive be interpreted literally and creatively?
      
      Generate a compact creative inspiration document that explores the above in under 200 words
      
      This inspiration will be used to generate ${ideaCount} creative shot ideas. Stay closely aligned with the user's directive while finding creative angles within those boundaries.
    `,

    'stock-realistic': dedent`
      You are a professional photographer and production artist. Your task is to analyze a user's directive and create technical, production-focused creative inspiration for making realistic, stock-quality images.
      
      User Directive: "${userDirective}"

      FIRST, expand and clarify the user directive:
      - What is the user specifically asking for? Break down the directive into clear, concrete requirements.
      - What are the key subjects, objects, scenes, or concepts explicitly mentioned?
      - What are the implicit details that need to be understood?
      - What is the core intent and purpose behind this directive?
      - Create an expanded, detailed interpretation of what the user wants
      
      THEN, focus on photographic and production art techniques to make this realistic:
      - What photographic techniques create realism? (natural lighting, proper exposure, depth of field, focal length, camera angles)
      - What production elements are needed? (set design, props, wardrobe, makeup, location scouting)
      - What technical aspects ensure photorealistic quality? (sharpness, color accuracy, texture detail, shadow/highlight balance)
      - What environmental details add authenticity? (natural backgrounds, realistic settings, appropriate context)
      - What post-production considerations enhance realism? (color grading, retouching approach, final polish)
      - What stock photography standards should be met? (clean backgrounds, professional quality, versatile composition)
      
      Generate a compact creative inspiration document (under 200 words) that focuses on HOW to make the user's directive realistic using photographic and production art techniques. Emphasize technical approaches, production methods, and artistic techniques that result in photorealistic, stock-quality images.
      
      This inspiration will be used to generate ${ideaCount} creative shot ideas. Focus on realistic, professional production approaches that result in photorealistic, commercially viable stock-style content.
    `,

    cinematic: dedent`
      You are a cinematographer and film director. Your task is to analyze a user's directive and create cinematic, film-inspired creative inspiration.
      
      User Directive: "${userDirective}"
      
      FIRST, expand and clarify the user directive:
      - What is the user specifically asking for? Break down the directive into clear, concrete requirements.
      - What are the key subjects, objects, scenes, or concepts explicitly mentioned?
      - What are the implicit details that need to be understood?
      - What is the core intent and purpose behind this directive?
      - Create an expanded, detailed interpretation of what the user wants
      
      Think deeply about:
      - What cinematic genres and film styles could enhance this concept?
      - What camera movements, angles, and framing would create drama?
      - What lighting setups and color grading would set the mood?
      - What narrative moments and story beats are relevant?
      - What film techniques (depth of field, slow motion, etc.) could be used?
      
      Generate a comprehensive creative inspiration document that explores:
      1. Cinematic genres and visual styles (noir, sci-fi, drama, etc.)
      2. Camera techniques and shot types
      3. Lighting and color grading directions
      4. Narrative moments and storytelling beats
      5. Composition and framing strategies
      6. Film-inspired atmospheres and moods
      
      This inspiration will be used to generate ${ideaCount} creative shot ideas. Focus on cinematic concepts with strong visual storytelling, dramatic lighting, and film-quality aesthetics.
    `,

    minimalist: dedent`
      You are a minimalist design director. Your task is to analyze a user's directive and create clean, focused creative inspiration emphasizing simplicity and essential elements.
      
      User Directive: "${userDirective}"
      
      FIRST, expand and clarify the user directive:
      - What is the user specifically asking for? Break down the directive into clear, concrete requirements.
      - What are the key subjects, objects, scenes, or concepts explicitly mentioned?
      - What are the implicit details that need to be understood?
      - What is the core intent and purpose behind this directive?
      - Create an expanded, detailed interpretation of what the user wants
      
      Think deeply about:
      - What are the essential, core elements of this concept?
      - How can this be simplified to its most powerful form?
      - What negative space and clean compositions would work?
      - What minimal color palettes and typography could enhance this?
      - What "less is more" approaches could be applied?
      
      Generate a comprehensive creative inspiration document that explores:
      1. Essential elements and core concepts
      2. Simplification strategies and reduction techniques
      3. Negative space and clean composition approaches
      4. Minimal color palettes and design elements
      5. Focus and clarity principles
      6. Elegant and refined aesthetic directions
      
      This inspiration will be used to generate ${ideaCount} creative shot ideas. Focus on minimal, clean concepts that communicate powerfully through simplicity and restraint.
    `,

    surreal: dedent`
      You are a surrealist art director and dreamscape creator. Your task is to analyze a user's directive and create fantastical, dream-like creative inspiration.
      
      User Directive: "${userDirective}"
      
      FIRST, expand and clarify the user directive:
      - What is the user specifically asking for? Break down the directive into clear, concrete requirements.
      - What are the key subjects, objects, scenes, or concepts explicitly mentioned?
      - What are the implicit details that need to be understood?
      - What is the core intent and purpose behind this directive?
      - Create an expanded, detailed interpretation of what the user wants
      
      Think deeply about:
      - What dream-like, impossible, or fantastical elements could represent this?
      - What unexpected juxtapositions and impossible scenarios could work?
      - What symbolic and metaphorical transformations are relevant?
      - What surreal art movements and techniques could be applied?
      - What defies logic but creates powerful visual impact?
      
      Generate a comprehensive creative inspiration document that explores:
      1. Surreal and fantastical elements
      2. Impossible scenarios and dream logic
      3. Symbolic transformations and metaphors
      4. Unexpected juxtapositions and combinations
      5. Surrealist art techniques and styles
      6. Dream-like atmospheres and otherworldly aesthetics
      
      This inspiration will be used to generate ${ideaCount} creative shot ideas. Focus on surreal, fantastical concepts that challenge reality and create dream-like, thought-provoking visuals.
    `,

    documentary: dedent`
      You are a documentary filmmaker and photojournalist. Your task is to analyze a user's directive and create authentic, truth-telling creative inspiration.
      
      User Directive: "${userDirective}"
      
      Think deeply about:
      - What real-world stories and authentic moments connect to this?
      - What candid, unposed scenarios would capture truth?
      - What diverse perspectives and lived experiences are relevant?
      - What environmental and contextual details add authenticity?
      - What journalistic and documentary techniques would work?
      
      Generate a comprehensive creative inspiration document that explores:
      1. Real-world stories and authentic moments
      2. Candid and unposed scenarios
      3. Diverse perspectives and lived experiences
      4. Environmental context and real settings
      5. Documentary photography and film techniques
      6. Truth-telling and authentic representation approaches
      
      This inspiration will be used to generate ${ideaCount} creative shot ideas. Focus on authentic, documentary-style concepts that capture real moments, genuine emotions, and truthful representation.
    `,

    commercial: dedent`
      You are a commercial creative director and advertising strategist. Your task is to analyze a user's directive and create market-driven, brand-focused creative inspiration.
      
      User Directive: "${userDirective}"
      
      Think deeply about:
      - What commercial applications and brand messages connect to this?
      - What target audiences and demographics are relevant?
      - What product placement and lifestyle scenarios would work?
      - What advertising trends and commercial aesthetics are current?
      - What call-to-action and conversion-focused elements could be included?
      
      Generate a comprehensive creative inspiration document that explores:
      1. Commercial applications and brand messaging
      2. Target audience considerations
      3. Product and lifestyle integration
      4. Advertising trends and commercial aesthetics
      5. Conversion-focused and persuasive elements
      6. Market-driven and ROI-oriented concepts
      
      This inspiration will be used to generate ${ideaCount} creative shot ideas. Focus on commercial, marketable concepts that serve advertising, marketing, and brand communication needs.
    `,
  };

  return stylePrompts[style] || stylePrompts.abstract;
}

// Input schema for the agent
const IdeateInputSchema = z.object({
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
});

// Schema for generating creative ideas
const IdeasOutputSchema = z.object({
  shots: z
    .array(z.string())
    .describe(
      'Array of creative shot ideas (each under 50 words, abstract concepts)',
    ),
});

// Output schema for the agent
const IdeateOutputSchema = z.object({
  predefinedPreferences: z.array(z.string()),
  shots: z.array(z.string()),
  variationCount: z.number(),
  model: z.string().optional(),
  tags: z.array(z.string()),
  creativeInspiration: z
    .string()
    .optional()
    .describe('The creative inspiration document generated for this ideation'),
});

export const ideateAgent = aiRouter
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Generating creative inspiration...',
      });

      const {
        userDirective,
        style = 'digitalart',
        predefinedPreferences = [],
        ideaCount,
        variationCount = 0,
        model,
        tags = [],
      } = ctx.request.params as z.infer<typeof IdeateInputSchema>;

      console.log('params', ctx.request.params);

      if (!userDirective) {
        throw new Error('userDirective is required');
      }

      // Step 1: Generate creative inspiration using generateText
      ctx.response.writeMessageMetadata({
        loader: 'Creating creative inspiration base...',
      });

      const stylePrompt = getStyleBasedPrompt(
        style as IdeationStyle,
        userDirective,
        ideaCount,
      );

      const inspirationResult = await generateText({
        model:
          model && model.startsWith('claude')
            ? anthropic(model)
            : google(model || 'gemini-2.5-pro'),
        prompt: `LIMIT THE INSPIRATION TO 200 WORDS MAX.. n\n${stylePrompt}`,
        maxRetries: 2,
      });

      const creativeInspiration = inspirationResult.text;
      console.log('creativeInspiration', creativeInspiration);
      console.log('Creative Inspiration USAGE', inspirationResult.usage);

      // Step 2: Generate ideas using generateObject based on the inspiration
      ctx.response.writeMessageMetadata({
        loader: `Generating ${ideaCount} creative shot ideas...`,
      });

      const ideasResult = await generateObject({
        model:
          model && model.startsWith('claude')
            ? anthropic(model)
            : google(model || 'gemini-2.5-pro'),
        schema: IdeasOutputSchema,
        prompt: dedent`
          Based on the user directive and creative inspiration below, generate exactly ${ideaCount} creative shot ideas.
          
          User Directive: "${userDirective}"
          
          Creative Inspiration:
          ${creativeInspiration}
          
          ${predefinedPreferences.length > 0 ? `Predefined Preferences: ${predefinedPreferences.join(', ')}` : ''}
          
          Requirements for each shot idea:
          - Must be under 50 words
          - Should be creative and inspiring
          - Should capture the essence of the user directive
          - Should be unique and distinct from other ideas
          
          Generate exactly ${ideaCount} unique, creative shot ideas.
        `,
        maxRetries: 2,
      });

      console.log('Ideas Generation USAGE', ideasResult.usage);

      const result = {
        predefinedPreferences: predefinedPreferences || [],
        shots: ideasResult.object.shots,
        variationCount: variationCount || 0,
        model: model,
        tags: tags || [],
        creativeInspiration: creativeInspiration,
      };

      return result;
    } catch (error) {
      console.error('Error generating creative ideas:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'ideateMidjourneyShots',
    name: 'Ideate Creative Images',
    description:
      'Generates creative shot ideas based on user directive and selected style. Uses a two-step process: first creates style-specific creative inspiration, then generates unique shot concepts. Supports multiple styles: abstract, digitalart, inspirational, user-directive-focused, stock-realistic, cinematic, minimalist, surreal, documentary, commercial.',
    inputSchema: IdeateInputSchema,
    outputSchema: IdeateOutputSchema,
    metadata: {
      icon: 'https://cdn.svglogos.dev/logos/midjourney.svg',
      title: 'Ideate Creative Shot Ideas',
      hideUI: false,
      category: 'ai-generation',
      tags: [
        'midjourney',
        'ideation',
        'creativity',
        'shot-generation',
        'concepts',
        'visual-content',
        'style-based',
      ],
    },
  });
