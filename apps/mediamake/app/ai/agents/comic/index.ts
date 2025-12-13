import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import comicScriptWriterAgent from './scriptWriter.agent';
import characterDesignerAgent from './characterDesigner.agent';
import artDirectorAgent from './artDirector.agent';
import voiceoverGeneratorAgent from './voiceoverGenerator.agent';
import imageGeneratorAgent from './imageGenerator.agent';

/**
 * Comic Generation Orchestrator
 * 
 * This orchestrator manages five specialized agents for comic creation:
 * 1. Script Writer - Creates noir-style anthropomorphic comic scripts
 * 2. Character Designer - Designs consistent character visuals in minimalist webcomic style
 * 3. Art Director - Converts scripts into DALL-E image generation prompts (with continuity detection)
 * 4. Voiceover Generator - Converts voiceover scripts to audio using ElevenLabs TTS
 * 5. Image Generator - Generates actual comic images with panel-to-panel continuity support
 */

const aiRouter = new AiRouter();

// Input schema for the full pipeline
const ComicPipelineInputSchema = z.object({
  theme: z.string().describe('The theme for the comic'),
  runFullPipeline: z
    .boolean()
    .optional()
    .describe('If true, runs all agents in sequence. If false, you can call agents individually.'),
  
  // Image generation options
  generateImages: z
    .boolean()
    .optional()
    .default(true)
    .describe('If true, generates actual comic panel images (requires runFullPipeline)'),
  imageProvider: z
    .enum(['gemini-flash', 'gemini-pro', 'dall-e-3'])
    .default('gemini-flash')
    .optional()
    .describe('Image provider: gemini-flash (Nano Banana 🍌 - fast), gemini-pro (Nano Banana Pro - advanced, up to 4K), dall-e-3 (OpenAI)'),
  aspectRatio: z
    .enum(['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'])
    .default('1:1')
    .optional()
    .describe('Aspect ratio for comic panels'),
  imageResolution: z
    .enum(['1K', '2K', '4K'])
    .default('1K')
    .optional()
    .describe('Resolution (4K only for gemini-pro)'),
  styleReferenceImages: z
    .array(z.string())
    .optional()
    .describe('Optional: URLs of reference images for style matching'),
  
  // Voiceover options
  generateVoiceover: z
    .boolean()
    .optional()
    .default(false)
    .describe('If true, generates voiceover audio from the script (requires runFullPipeline)'),
  voiceId: z.string().optional().describe('ElevenLabs voice ID for voiceover generation'),
});

// Output schema for the full pipeline
const ComicPipelineOutputSchema = z.object({
  script: z.any().optional().describe('The generated comic script'),
  characterDesigns: z.any().optional().describe('Character visual definitions'),
  imagePrompts: z.any().optional().describe('DALL-E image generation prompts'),
  generatedImages: z.any().optional().describe('Generated comic panel images with URLs'),
  voiceover: z.any().optional().describe('Generated voiceover audio and captions'),
});

export const comicOrchestrator = aiRouter
  .before('/', async (ctx, next) => {
    ctx.response.writeMessageMetadata({
      loader: 'Comic generation pipeline initializing...',
    });
    return next();
  })
  // Mount individual agents
  .agent('/script-writer', comicScriptWriterAgent)
  .agent('/character-designer', characterDesignerAgent)
  .agent('/art-director', artDirectorAgent)
  .agent('/image-generator', imageGeneratorAgent)
  .agent('/voiceover-generator', voiceoverGeneratorAgent)
  // Full pipeline orchestrator
  .agent('/', async ctx => {
    const { 
      theme, 
      runFullPipeline, 
      generateImages,
      imageProvider = 'gemini-flash',
      aspectRatio = '1:1',
      imageResolution = '1K',
      styleReferenceImages,
      generateVoiceover, 
      voiceId 
    } = ctx.request.params as any;

    if (!runFullPipeline) {
      ctx.response.writeMessageMetadata({
        loader: 'Use specific endpoints for individual agents: /script-writer, /character-designer, /art-director, /image-generator, /voiceover-generator',
      });
      return {
        message: 'Comic orchestrator ready. Call individual agents as needed.',
        availableAgents: [
          '/script-writer - Creates comic script from theme',
          '/character-designer - Designs characters from script',
          '/art-director - Creates image prompts from script + characters (with continuity detection)',
          '/image-generator - Generates actual panel images from prompts (with continuity support)',
          '/voiceover-generator - Generates voiceover audio from script',
        ],
      };
    }

    try {
      let stepCount = 3; // Base: script, characters, prompts
      if (generateImages) stepCount++;
      if (generateVoiceover) stepCount++;
      const totalSteps = stepCount;
      
      // Step 1: Generate comic script
      ctx.response.writeMessageMetadata({
        loader: `Step 1/${totalSteps}: Generating comic script...`,
      });

      const scriptResult = await ctx.next.callAgent('/script-writer', {
        theme,
      });

      if (!scriptResult.ok) {
        throw scriptResult.error;
      }

      // Step 2: Design characters
      ctx.response.writeMessageMetadata({
        loader: `Step 2/${totalSteps}: Designing characters...`,
      });

      const characterResult = await ctx.next.callAgent('/character-designer', {
        script: scriptResult.data,
      });

      if (!characterResult.ok) {
        throw characterResult.error;
      }

      // Step 3: Create image prompts
      ctx.response.writeMessageMetadata({
        loader: `Step 3/${totalSteps}: Creating image generation prompts with continuity detection...`,
      });

      const imagePromptsResult = await ctx.next.callAgent('/art-director', {
        script: scriptResult.data,
        characterDefinitions: characterResult.data.characters,
      });

      if (!imagePromptsResult.ok) {
        throw imagePromptsResult.error;
      }

      // Step 4 (Optional): Generate actual images
      let imagesResult = null;
      if (generateImages && imagePromptsResult.data) {
        const currentStep = 4;
        const providerName = imageProvider === 'gemini-flash' ? 'Nano Banana 🍌' : 
                            imageProvider === 'gemini-pro' ? 'Nano Banana Pro 🍌' : 
                            'DALL-E 3';
        ctx.response.writeMessageMetadata({
          loader: `Step ${currentStep}/${totalSteps}: Generating images with ${providerName} (${aspectRatio} @ ${imageResolution})...`,
        });

        imagesResult = await ctx.next.callAgent('/image-generator', {
          panels: imagePromptsResult.data.panels,
          artStyle: imagePromptsResult.data.artStyle,
          provider: imageProvider,
          aspectRatio: aspectRatio,
          resolution: imageResolution,
          quality: 'standard',
          styleReferenceImages: styleReferenceImages,
        });

        if (!imagesResult.ok) {
          console.error('Image generation failed:', imagesResult.error);
          // Don't fail the entire pipeline if image generation fails
        }
      }

      // Step 5 (Optional): Generate voiceover with multi-character support
      let voiceoverResult = null;
      if (generateVoiceover && scriptResult.data) {
        const currentStep = generateImages ? 5 : 4;
        ctx.response.writeMessageMetadata({
          loader: `Step ${currentStep}/${totalSteps}: Generating multi-character voiceover audio...`,
        });

        // Build character voice mapping from script characters
        const characterVoiceMapping = scriptResult.data.characters?.map((char: any, index: number) => {
          // Default voice assignment based on character traits
          const defaultVoices = [
            'pNInz6obpgDQGcFmaJgB', // Adam - male
            '21m00Tcm4TlvDq8ikWAM', // Rachel - female
            'VR6AewLTigWG4xSOukaG', // Arnold - gruff
            'IKne3meq5aSn9XLyUdCD', // Charlie - young
            'ErXwobaYiN019PkySvjV', // Antoni - narrator
          ];
          
          return {
            characterName: char.name,
            voiceId: defaultVoices[index % defaultVoices.length],
          };
        }) || [];

        voiceoverResult = await ctx.next.callAgent('/voiceover-generator', {
          script: scriptResult.data,
          characterVoiceMapping,
          tags: ['comic', 'voiceover', 'multi-character', scriptResult.data.title],
        });

        if (!voiceoverResult.ok) {
          console.error('Voiceover generation failed:', voiceoverResult.error);
          // Don't fail the entire pipeline if voiceover fails
        }
      }

      ctx.response.writeMessageMetadata({
        loader: 'Comic pipeline complete! ✨',
      });

      return {
        script: scriptResult.data,
        characterDesigns: characterResult.data,
        imagePrompts: imagePromptsResult.data,
        generatedImages: imagesResult?.ok ? imagesResult.data : null,
        voiceover: voiceoverResult?.ok ? voiceoverResult.data : null,
      };
    } catch (error) {
      console.error('Error in comic pipeline:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'comicOrchestrator',
    name: 'Comic Generation Orchestrator',
    description:
      'Orchestrates the full comic generation pipeline: Creates noir-style anthropomorphic comic scripts, designs consistent character visuals, generates DALL-E image prompts with continuity detection, generates actual comic images with panel-to-panel continuity support, and optionally creates voiceover audio using ElevenLabs. Can run full pipeline or access individual agents (script-writer, character-designer, art-director, image-generator, voiceover-generator).',
    inputSchema: ComicPipelineInputSchema,
    outputSchema: ComicPipelineOutputSchema,
    metadata: {
      category: 'comic',
      tags: ['comic', 'pipeline', 'orchestrator', 'noir', 'dall-e', 'voiceover', 'continuity'],
      icon: '🎭',
      title: 'Comic Generation Pipeline',
    },
  });

export default comicOrchestrator;

