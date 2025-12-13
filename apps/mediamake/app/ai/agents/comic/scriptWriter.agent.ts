import { AiRouter } from '@microfox/ai-router';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import {
  ComicScriptInputSchema,
  ComicScriptOutputSchema,
} from './zod';
import dedent from 'dedent';

/**
 * Comic Script Writer Agent - Agent 1
 * Writes short, engaging comic scripts in Grim Anthropomorphic Fiction style
 */

const aiRouter = new AiRouter();

const comicScriptWriterAgent = aiRouter
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Writing comic script...',
      });

      const { theme } = ctx.request.params as {
        theme: string;
      };

      if (!theme) {
        throw new Error('Theme is required for script generation');
      }

      const systemPrompt = dedent`
        You are an expert Comic Script Writer specializing in the genre of "Grim Anthropomorphic Fiction" and "Dark Fables" (similar to 'Blacksad', 'Maus', or modern anthropomorphic webcomics).

        THE RULES OF THE GENRE:
        1. Tone: Cynical, weary, philosophical, and "Noir."
        2. The Dynamic: usually involves a "Naive" character (who believes in goodness) vs. a "Realist" character (who knows the harsh truth of survival).
        3. Dialogue: Use subtext. Characters shouldn't say "I am sad." They should say "The cold gets into your bones deeper than it used to."
        4. Visuals: Focus on body language (slumping shoulders, heavy eyes).

        YOUR GOAL:
        Write a short, engaging comic script (4-6 panels) based on the theme provided.

        OUTPUT REQUIREMENTS:
        - Create a catchy, Noir-style title
        - Define 2-3 characters with distinct personality traits
        - Write panel-by-panel descriptions including:
          * Visual description (action and camera angle)
          * Character name
          * Dialogue with strong subtext
        - Generate a voiceoverScript field containing ONLY the dialogues in sequence, formatted as:
          "CharacterName: dialogue text. CharacterName: dialogue text."
          This will be used for voice-over generation with Eleven Labs.
      `;

      const result = await generateObject({
        model: google('gemini-2.5-flash'),
        schema: ComicScriptOutputSchema,
        system: systemPrompt,
        prompt: dedent`
          Create a comic script for the following theme: "${theme}"

          Remember:
          - Keep it short (4-6 panels)
          - Use anthropomorphic animal characters
          - Focus on cynical, philosophical dialogue
          - Include visual descriptions with camera angles
          - Create a dynamic between naive and realist characters
          - IMPORTANT: Generate the voiceoverScript field with all dialogues in sequence for voice-over generation
        `,
        maxRetries: 2,
      });

      ctx.response.writeMessageMetadata({
        loader: 'Script complete!',
      });

      return result.object;
    } catch (error) {
      console.error('Error generating comic script:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'comicScriptWriter',
    name: 'Comic Script Writer',
    description:
      'Writes short, engaging comic scripts in Grim Anthropomorphic Fiction style (similar to Blacksad, Maus, or modern anthropomorphic webcomics). Takes a theme and generates a noir-style comic script with characters, panels, and dialogue.',
    inputSchema: ComicScriptInputSchema,
    outputSchema: ComicScriptOutputSchema,
    metadata: {
      category: 'comic',
      tags: ['comic', 'script', 'noir', 'anthropomorphic', 'creative-writing'],
      icon: '📝',
      title: 'Comic Script Writer',
    },
  });

export default comicScriptWriterAgent;

