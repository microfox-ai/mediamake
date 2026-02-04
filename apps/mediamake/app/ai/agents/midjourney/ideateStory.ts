import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { generateText, generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import dedent from 'dedent';
import { IDEATION_STYLES, type IdeationStyle } from './ideate';
import { appendUsage } from '@/app/ai/middlewares/usageCapture';

const aiRouter = new AiRouter();

// Function to get style-based creative inspiration prompt for stories
function getStyleBasedPromptForStory(
  style: IdeationStyle,
  story: string,
  sceneCount: number,
  shotCount: number,
): string {
  const stylePrompts: Record<IdeationStyle, string> = {
    abstract: dedent`
      You are a creative director and visual storyteller specializing in abstract and conceptual art. Your task is to analyze a story and create a rich foundation of creative inspiration.
      
      Story: "${story}"
      
      Think deeply about:
      - What abstract concepts, themes, and emotions are relevant to this story?
      - What visual metaphors could represent these narrative elements?
      - What unexpected combinations or perspectives could be explored?
      - What universal human experiences connect to this story?
      - What creative angles haven't been explored yet?
      
      Generate a comprehensive creative inspiration document that explores:
      1. Core themes and abstract concepts from the story
      2. Visual metaphors and symbolic representations
      3. Emotional undertones and mood directions
      4. Unexpected creative angles and perspectives
      5. Universal connections and relatable experiences
      6. Mix-and-match possibilities for unique combinations
      
      This inspiration will be used to generate ${sceneCount} scenes, each with ${shotCount} creative shot ideas. Be thorough, creative, and think outside the box.
      Focus on abstract ideas, not specific image descriptions. Emphasize conceptual depth, symbolic meaning, and emotional resonance.
    `,

    digitalart: dedent`
      You are a digital art director and concept artist. Your task is to analyze a story and create a focused, story-aligned foundation of creative inspiration for digital art creation.
      
      Story: "${story}"
      
      FIRST, understand the story:
      - What are the key narrative elements, characters, settings, and events?
      - What are the visual requirements for telling this story?
      - What digital art techniques would best serve the narrative?
      
      THEN, generate a comprehensive creative inspiration document that:
      1. Directly addresses the story's visual requirements with specific digital art interpretations
      2. Identifies the exact subjects, scenes, or concepts from the story that need visual representation
      3. Suggests digital art techniques and styles (3D, vector, pixel art, digital painting, etc.) that best serve the story
      4. Recommends color palettes, lighting, and composition that align with the story's mood and themes
      5. Proposes textures, patterns, and digital effects that enhance the story's core elements
      6. Integrates tech-inspired or futuristic elements ONLY if they serve the story
      
      CRITICAL: Stay focused on the story. Every suggestion must directly relate to what the story requires. The inspiration should help create visuals that clearly fulfill the story's narrative needs using digital art techniques.
      
      This inspiration will be used to generate ${sceneCount} scenes, each with ${shotCount} creative shot ideas. Prioritize story-focused concepts over abstract exploration.
    `,

    inspirational: dedent`
      You are an inspirational content creator and motivational storyteller. Your task is to analyze a story and create uplifting, empowering creative inspiration.
      
      Story: "${story}"
      
      Think deeply about the story and create a comprehensive creative inspiration that highlights uplifting, empowering concepts that inspire and motivate viewers.
      
      This inspiration will be used to generate ${sceneCount} scenes, each with ${shotCount} creative shot ideas. Focus on uplifting, empowering concepts that inspire and motivate viewers.
    `,

    'user-directive-focused': dedent`
      You are a precise creative strategist. Your task is to analyze a story and create focused, story-aligned creative inspiration that stays true to the story's intent.
      
      Story: "${story}"
      
      FIRST, understand the story:
      - What are the key narrative elements, characters, settings, and events?
      - What are the explicit visual requirements for telling this story?
      - What are the implicit visual needs and expectations?
      - What specific elements, subjects, or themes must be included?
      - What constraints or boundaries should be respected?
      
      Generate a compact creative inspiration document (under 200 words) that explores the above.
      
      This inspiration will be used to generate ${sceneCount} scenes, each with ${shotCount} creative shot ideas. Stay closely aligned with the story while finding creative angles within those boundaries.
    `,

    'stock-realistic': dedent`
      You are a professional photographer and production artist. Your task is to analyze a story and create technical, production-focused creative inspiration for making realistic, stock-quality images.
      
      Story: "${story}"
      
      FIRST, understand the story:
      - What are the key narrative elements, characters, settings, and events?
      - What are the visual requirements for telling this story realistically?
      
      THEN, focus on photographic and production art techniques to make this realistic:
      - What photographic techniques create realism? (natural lighting, proper exposure, depth of field, focal length, camera angles)
      - What production elements are needed? (set design, props, wardrobe, makeup, location scouting)
      - What technical aspects ensure photorealistic quality? (sharpness, color accuracy, texture detail, shadow/highlight balance)
      - What environmental details add authenticity? (natural backgrounds, realistic settings, appropriate context)
      - What post-production considerations enhance realism? (color grading, retouching approach, final polish)
      - What stock photography standards should be met? (clean backgrounds, professional quality, versatile composition)
      
      Generate a compact creative inspiration document (under 200 words) that focuses on HOW to make the story realistic using photographic and production art techniques.
      
      This inspiration will be used to generate ${sceneCount} scenes, each with ${shotCount} creative shot ideas. Focus on realistic, professional production approaches.
    `,

    cinematic: dedent`
      You are a cinematographer and film director. Your task is to analyze a story and create cinematic, film-inspired creative inspiration.
      
      Story: "${story}"
      
      FIRST, understand the story:
      - What are the key narrative elements, characters, settings, and events?
      - What are the visual requirements for telling this story cinematically?
      
      Think deeply about:
      - What cinematic genres and film styles could enhance this story?
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
      
      This inspiration will be used to generate ${sceneCount} scenes, each with ${shotCount} creative shot ideas. Focus on cinematic concepts with strong visual storytelling.
    `,

    minimalist: dedent`
      You are a minimalist design director. Your task is to analyze a story and create clean, focused creative inspiration emphasizing simplicity and essential elements.
      
      Story: "${story}"
      
      FIRST, understand the story:
      - What are the key narrative elements, characters, settings, and events?
      - What are the essential, core elements of this story?
      
      Think deeply about:
      - How can this story be simplified to its most powerful form?
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
      
      This inspiration will be used to generate ${sceneCount} scenes, each with ${shotCount} creative shot ideas. Focus on minimal, clean concepts that communicate powerfully through simplicity.
    `,

    surreal: dedent`
      You are a surrealist art director and dreamscape creator. Your task is to analyze a story and create fantastical, dream-like creative inspiration.
      
      Story: "${story}"
      
      FIRST, understand the story:
      - What are the key narrative elements, characters, settings, and events?
      - What are the visual requirements for telling this story in a surreal way?
      
      Think deeply about:
      - What dream-like, impossible, or fantastical elements could represent this story?
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
      
      This inspiration will be used to generate ${sceneCount} scenes, each with ${shotCount} creative shot ideas. Focus on surreal, fantastical concepts that challenge reality.
    `,

    documentary: dedent`
      You are a documentary filmmaker and photojournalist. Your task is to analyze a story and create authentic, truth-telling creative inspiration.
      
      Story: "${story}"
      
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
      
      This inspiration will be used to generate ${sceneCount} scenes, each with ${shotCount} creative shot ideas. Focus on authentic, documentary-style concepts.
    `,

    commercial: dedent`
      You are a commercial creative director and advertising strategist. Your task is to analyze a story and create market-driven, brand-focused creative inspiration.
      
      Story: "${story}"
      
      Think deeply about:
      - What commercial applications and brand messages connect to this story?
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
      
      This inspiration will be used to generate ${sceneCount} scenes, each with ${shotCount} creative shot ideas. Focus on commercial, marketable concepts.
    `,
  };

  return stylePrompts[style] || stylePrompts.abstract;
}

// Schema for scene division (Step 1)
const SceneDivisionSchema = z.object({
  scenes: z
    .array(
      z.object({
        title: z.string().describe('Brief title for the scene'),
        description: z.string().describe('Detailed description of the scene'),
      }),
    )
    .describe('Array of scenes divided from the story'),
});

// Schema for generating shots from a scene (Step 3)
const ShotsGenerationSchema = z.object({
  shots: z
    .array(z.string())
    .describe(
      'Array of creative shot ideas (each under 50 words, abstract concepts)',
    ),
});

// Input schema for the agent
const IdeateStoryInputSchema = z.object({
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
});

// Output schema for the agent
const IdeateStoryOutputSchema = z.object({
  scenes: z.array(
    z.object({
      title: z.string().describe('Brief title for the scene'),
      description: z.string().describe('Detailed description of the scene'),
      shots: z
        .array(z.string())
        .describe('Array of creative shot ideas for this scene'),
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
});

export const ideateStoryAgent = aiRouter
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Dividing story into scenes...',
      });

      const {
        story,
        sceneCount,
        shotCount,
        style = 'digitalart',
        predefinedPreferences = [],
        variationCount = 0,
        model,
        tags = [],
      } = ctx.request.params as z.infer<typeof IdeateStoryInputSchema>;

      console.log('params', ctx.request.params);

      if (!story) {
        throw new Error('story is required');
      }

      if (!sceneCount) {
        throw new Error('sceneCount is required');
      }

      if (!shotCount) {
        throw new Error('shotCount is required');
      }

      // Step 1: Divide story into scenes
      ctx.response.writeMessageMetadata({
        loader: `Dividing story into ${sceneCount} scenes...`,
      });

      const sceneDivisionResult = await generateObject({
        model:
          model && model.startsWith('claude')
            ? anthropic(model)
            : google(model || 'gemini-2.5-pro'),
        schema: SceneDivisionSchema,
        prompt: dedent`
          Divide the following story into exactly ${sceneCount} scenes. Each scene should have a brief title and a detailed description.
          
          Story:
          "${story}"
          
          Requirements:
          - Generate exactly ${sceneCount} scenes
          - Each scene should have a brief, descriptive title
          - Each scene should have a detailed description that captures the key narrative elements, characters, settings, and events
          - Scenes should flow logically and tell the complete story
          - Each scene should be distinct and meaningful
        `,
        maxRetries: 2,
      });

      const scenes = sceneDivisionResult.object.scenes;
      console.log('Scene Division USAGE', sceneDivisionResult.usage);

      if (!scenes || scenes.length === 0) {
        throw new Error('Failed to divide story into scenes');
      }

      // Step 2: Generate creative inspiration using generateText
      ctx.response.writeMessageMetadata({
        loader: 'Creating creative inspiration base...',
      });

      const stylePrompt = getStyleBasedPromptForStory(
        style as IdeationStyle,
        story,
        sceneCount,
        shotCount,
      );

      const inspirationResult = await generateText({
        model:
          model && model.startsWith('claude')
            ? anthropic(model)
            : google(model || 'gemini-2.5-pro'),
        prompt: `LIMIT THE INSPIRATION TO 200 WORDS MAX.\n\n${stylePrompt}`,
        maxRetries: 2,
      });
      const ideateStoryModelId = model?.startsWith('claude') ? `anthropic/${model}` : `google/${model || 'gemini-2.5-pro'}`;
      if (inspirationResult.usage) {
        appendUsage(ctx.state, ideateStoryModelId, inspirationResult.usage);
      }

      const creativeInspiration = inspirationResult.text;
      console.log('creativeInspiration', creativeInspiration);
      console.log('Creative Inspiration USAGE', inspirationResult.usage);

      // Step 3: Generate shots for each scene
      ctx.response.writeMessageMetadata({
        loader: `Generating ${shotCount} shots for each scene...`,
      });

      const scenesWithShots = await Promise.all(
        scenes.map(async (scene, sceneIndex) => {
          let shots: string[] = [];
          let generationSucceeded = false;

          // Try with retry logic (similar to simple.ts)
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const shotsResult = await generateObject({
                model:
                  model && model.startsWith('claude')
                    ? anthropic(model)
                    : google(model || 'gemini-2.5-pro'),
                schema: ShotsGenerationSchema,
                prompt: dedent`
                  Based on the scene, story, and creative inspiration below, generate exactly ${shotCount} creative shot ideas for this scene.
                  
                  Story Context:
                  "${story}"
                  
                  Scene ${sceneIndex + 1}/${scenes.length}:
                  Title: "${scene.title}"
                  Description: "${scene.description}"
                  
                  Creative Inspiration:
                  ${creativeInspiration}
                  
                  ${predefinedPreferences.length > 0 ? `Predefined Preferences: ${predefinedPreferences.join(', ')}` : ''}
                  
                  Requirements for each shot idea:
                  - Must be under 50 words
                  - Should be creative and inspiring
                  - Should capture the essence of this specific scene
                  - Should align with the creative inspiration
                  - Should be unique and distinct from other shots in this scene
                  
                  Generate exactly ${shotCount} unique, creative shot ideas for this scene.
                `,
                maxRetries: 2,
              });

              shots = shotsResult.object.shots || [];
              generationSucceeded = true;
              console.log(
                `Scene ${sceneIndex + 1} Shots Generation USAGE`,
                shotsResult.usage,
              );
              break;
            } catch (error) {
              console.error(
                `Scene ${sceneIndex + 1} shot generation attempt ${attempt + 1} failed:`,
                error,
              );
              if (attempt === 1) {
                // Second attempt failed, mark shots as empty
                console.error(
                  `Scene ${sceneIndex + 1} both attempts failed. Marking shots as empty`,
                );
                generationSucceeded = false;
              }
            }
          }

          // If generation failed, create placeholder shots
          if (!generationSucceeded || shots.length === 0) {
            shots = Array(shotCount).fill('Failed to generate shot');
          }

          return {
            title: scene.title,
            description: scene.description,
            shots: shots,
          };
        }),
      );

      const result = {
        scenes: scenesWithShots,
        predefinedPreferences: predefinedPreferences || [],
        variationCount: variationCount || 0,
        model: model,
        tags: tags || [],
        creativeInspiration: creativeInspiration,
      };

      return result;
    } catch (error) {
      console.error('Error generating story-based creative ideas:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'ideateStoryMidjourneyShots',
    name: 'Ideate Creative Images from Story',
    description:
      'Divides a story into scenes and generates creative shot ideas for each scene. Uses a three-step process: first divides the story into scenes, then creates style-specific creative inspiration, and finally generates unique shot concepts for each scene. Supports multiple styles: abstract, digitalart, inspirational, user-directive-focused, stock-realistic, cinematic, minimalist, surreal, documentary, commercial.',
    inputSchema: IdeateStoryInputSchema,
    outputSchema: IdeateStoryOutputSchema,
    metadata: {
      icon: 'https://cdn.svglogos.dev/logos/midjourney.svg',
      title: 'Ideate Creative Shot Ideas from Story',
      hideUI: false,
      category: 'ai-generation',
      tags: [
        'midjourney',
        'ideation',
        'creativity',
        'shot-generation',
        'story',
        'scenes',
        'visual-content',
        'style-based',
      ],
    },
  });
