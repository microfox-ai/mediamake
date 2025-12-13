import { AiRouter } from '@microfox/ai-router';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import {
  ArtDirectorInputSchema,
  ArtDirectorOutputSchema,
} from './zod';
import dedent from 'dedent';

/**
 * AI Art Director Agent - Agent 3
 * Converts comic scripts into DALL-E image generation prompts
 */

const aiRouter = new AiRouter();

const artDirectorAgent = aiRouter
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Creating image generation prompts...',
      });

      const { script, characterDefinitions } = ctx.request.params as any;

      if (!script || !characterDefinitions) {
        throw new Error('Script and character definitions are required');
      }

      const artStyle = 'Rough digital charcoal sketch, minimalist webcomic style, expressive anthropomorphic animals, minimalist white background, desaturated muted colors, heavy line work';

      const systemPrompt = dedent`
        You are an expert AI Art Director specializing in DALL-E 3 prompts. You will convert a comic script into image generation prompts.

        THE ART STYLE:
        ${artStyle}

        CRITICAL INSTRUCTIONS:
        1. CONSISTENCY: Use the Character Visual Definitions provided to ensure the animals look the same in every panel.
        2. TEXT BUBBLES: You must include the dialogue in the prompt.
           - Format: "A speech bubble coming from [Character] says: 'TEXT HERE'."
           - If there are multiple speakers in a panel, specify positioning (e.g., "The dog on the left has a bubble saying 'X', the sheep on the right has a bubble saying 'Y'").
        3. CAMERA ANGLES: Use cinematic terms (Low angle, High angle, Over-the-shoulder, Extreme Close-up, Wide shot, Medium shot).
        4. VISUAL CONSISTENCY: Always reference the exact character descriptions provided for each character appearance.
        
        ⭐ NEW: PANEL CONTINUITY & MICRO-CHANGES:
        5. DETECT CONTINUITY: When analyzing panels, identify if consecutive panels represent:
           - Same scene/composition with a MICRO-CHANGE (e.g., eyes move, head turns, expression shifts)
           - These create emotional impact through subtle progression (like modern webcomics)
           
        6. MARK CONTINUITY: If panel N is a subtle variation of panel N-1:
           - Set "continuesFromPanel" to the previous panel number
           - Describe the specific change in "changeDescription" (e.g., "eyes slowly move upward", "slight smile appears", "ears droop down")
           
        7. CONTINUITY INDICATORS: Look for these signs in the script:
           - Similar visual descriptions between consecutive panels
           - Same camera angle maintained
           - Same characters in similar positions
           - Action words like: "looks up", "eyes shift", "expression changes", "slight movement"
           
        EXAMPLES OF CONTINUITY:
        
        Panel 1: "Wide shot, dog and sheep standing, dog looking down"
        Panel 2: "Same scene, dog's eyes move upward toward sheep"
        → Panel 2 CONTINUES FROM Panel 1, changeDescription: "eyes move from down position to looking up at sheep"
        
        Panel 3: "Close-up of sheep's face, neutral expression"
        Panel 4: "Same angle, sheep's expression softens slightly"
        → Panel 4 CONTINUES FROM Panel 3, changeDescription: "expression softens, slight warmth appears in eyes"

        OUTPUT FORMAT:
        For each panel, create a complete DALL-E prompt that includes:
        - The art style statement
        - Character descriptions (using provided definitions)
        - Action/scene description
        - Camera angle
        - Speech bubble with dialogue
        - Background description (minimalist white)
        - **continuesFromPanel** (number or null)
        - **changeDescription** (string or null)
      `;

      // Create a character lookup for easy reference
      const characterLookup = characterDefinitions.reduce((acc: any, char: any) => {
        acc[char.characterName] = char.visualPrompt;
        return acc;
      }, {});

      const panels = script.panels || [];

      const result = await generateObject({
        model: google('gemini-2.5-flash'),
        schema: ArtDirectorOutputSchema,
        system: systemPrompt,
        prompt: dedent`
          Create DALL-E image generation prompts for each panel in this comic script.
          
          IMPORTANT: Analyze panel-to-panel relationships to detect continuity opportunities for emotional storytelling.

          CHARACTER VISUAL DEFINITIONS:
          ${characterDefinitions.map((char: any) => `
          ${char.characterName}:
          ${char.visualPrompt}
          Shape: ${char.shape}
          Eyes: ${char.eyes}
          Colors: ${char.colors}
          Vibe: ${char.vibe}
          `).join('\n')}

          PANELS TO GENERATE:
          ${panels.map((panel: any, index: number) => `
          Panel ${panel.panelNumber || index + 1}:
          Visual: ${panel.visual}
          Character: ${panel.character}
          Dialogue: "${panel.dialogue}"
          `).join('\n')}

          TASK:
          For each panel:
          1. Create a complete DALL-E prompt starting with "A comic panel in the style of rough digital charcoal sketch."
          2. **Analyze if this panel is a subtle variation of the previous panel**
          3. If yes, set continuesFromPanel to the previous panel number and describe the specific micro-change
          4. Use exact character visual definitions for consistency
          5. Include speech bubbles with dialogue
          6. End with "Minimalist white background."
          
          CONTINUITY DETECTION:
          - Compare each panel with the previous one carefully
          - If the scene/composition is similar but with a micro-change (eyes move, slight expression shift, small head turn):
            * Set continuesFromPanel to the previous panel number
            * In changeDescription, specify exactly what changes (e.g., "eyes move upward", "slight head turn to left", "expression shifts from neutral to concerned")
          - If it's a completely different scene, camera angle, or composition: continuesFromPanel = null, changeDescription = null

          Remember: Continuity panels create powerful emotional storytelling through subtle progression! Think like expressive webcomics.
        `,
        maxRetries: 2,
      });

      const output = {
        ...result.object,
        artStyle,
      };

      ctx.response.writeMessageMetadata({
        loader: 'Image prompts complete!',
      });

      return output;
    } catch (error) {
      console.error('Error creating image prompts:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'comicArtDirector',
    name: 'Comic Art Director',
    description:
      'Converts comic scripts into DALL-E 3 image generation prompts. Takes a script and character visual definitions, then creates detailed prompts for each panel with consistent character designs, proper camera angles, and speech bubbles with dialogue.',
    inputSchema: ArtDirectorInputSchema,
    outputSchema: ArtDirectorOutputSchema,
    metadata: {
      category: 'comic',
      tags: ['comic', 'dall-e', 'image-generation', 'prompts', 'art-direction'],
      icon: '🎬',
      title: 'Comic Art Director',
    },
  });

export default artDirectorAgent;

