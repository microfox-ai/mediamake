import { AiRouter } from '@microfox/ai-router';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import {
  CharacterDesignerInputSchema,
  CharacterDesignerOutputSchema,
} from './zod';
import dedent from 'dedent';

/**
 * Character Designer Agent - Agent 2
 * Creates AI-ready character descriptions following minimalist webcomic art style
 */

const aiRouter = new AiRouter();

const characterDesignerAgent = aiRouter
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Designing character visuals...',
      });

      const { script } = ctx.request.params as any;

      if (!script || !script.characters) {
        throw new Error('Script with characters is required');
      }

      const artStyle = dedent`
        - "Rough digital charcoal sketch."
        - "Minimalist webcomic aesthetic with rough charcoal textures."
        - "Minimalist white background."
        - "Desaturated, muted colors."
        - "Comic Body" shapes (exaggerated shapes: round for innocent, angular for cynical).
      `;

      const systemPrompt = dedent`
        You are a Lead Character Designer for a comic book. Your job is to take a script and create "AI-Ready" character descriptions that strictly follow a specific art style.

        THE ART STYLE (Must apply to all descriptions):
        ${artStyle}

        GUIDELINES:
        1. Define the SHAPE: In this style, shape is personality. (e.g., "A perfect sphere of white fluff" for a chicken vs. "Sharp, jagged triangles" for a wolf).
        2. Define the EYES: This style relies on eye shape. (e.g., "Wide, blank dots" for naive characters vs. "Heavy, shadowed half-lids" for cynical characters).
        3. Consistency: These prompts will be used repeatedly to generate the character in different poses.

        OUTPUT FORMAT:
        For each character, create a complete visual reference prompt that includes:
        - Animal/Object type
        - Specific body shape (tied to personality)
        - Specific eye style (tied to personality)
        - Distinct markings or features
        - Color palette (muted, desaturated)
        - Overall personality vibe
      `;

      // Extract character information from script
      const charactersInfo = script.characters.map((char: any) => ({
        name: char.name,
        traits: char.traits,
      }));

      const result = await generateObject({
        model: google('gemini-2.5-flash'),
        schema: CharacterDesignerOutputSchema,
        system: systemPrompt,
        prompt: dedent`
          Create AI-ready character visual descriptions for the following characters from a comic script:

          ${charactersInfo.map((char: any) => `
          Character: ${char.name}
          Personality Traits: ${char.traits}
          `).join('\n')}

          For each character, create a complete visual prompt that:
          1. Specifies the animal type (appropriate to their personality)
          2. Describes their body shape in terms of geometric forms
          3. Defines their eye style
          4. Includes color palette (muted, desaturated)
          5. Captures their personality vibe

          Remember: Shape is personality. Eyes convey intelligence and worldview.
          These descriptions must be consistent enough to generate the same character across multiple panels.
        `,
        maxRetries: 2,
      });

      // Ensure artStyle is set
      const output = {
        ...result.object,
        artStyle,
      };

      ctx.response.writeMessageMetadata({
        loader: 'Character designs complete!',
      });

      return output;
    } catch (error) {
      console.error('Error designing characters:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'comicCharacterDesigner',
    name: 'Comic Character Designer',
    description:
      'Takes a comic script and creates AI-ready character visual descriptions following minimalist webcomic art style. Generates consistent character designs with specific shapes, eye styles, colors, and personality vibes for use in image generation.',
    inputSchema: CharacterDesignerInputSchema,
    outputSchema: CharacterDesignerOutputSchema,
    metadata: {
      category: 'comic',
      tags: ['comic', 'character-design', 'pet-foolery', 'visual', 'art-style'],
      icon: '🎨',
      title: 'Comic Character Designer',
    },
  });

export default characterDesignerAgent;

