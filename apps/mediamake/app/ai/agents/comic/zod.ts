import { z } from 'zod/v4';

// Agent 1: Comic Script Writer Schemas
export const ComicScriptInputSchema = z.object({
  theme: z.string().describe('The theme for the comic script'),
});

export const PanelSchema = z.object({
  panelNumber: z.number().describe('Panel number in sequence'),
  visual: z.string().describe('Description of action and camera angle'),
  character: z.string().describe('Character speaking'),
  dialogue: z.string().describe('The dialogue text'),
});

export const CharacterTraitSchema = z.object({
  name: z.string().describe('Character name'),
  traits: z.string().describe('Distinct personality traits'),
});

export const ComicScriptOutputSchema = z.object({
  title: z.string().describe('Catchy, Noir-style title'),
  characters: z.array(CharacterTraitSchema).describe('List of characters with traits'),
  panels: z.array(PanelSchema).describe('Panel-by-panel script'),
  voiceoverScript: z.string().describe('All dialogues formatted for voice-over generation (e.g., "Character1: dialogue1. Character2: dialogue2.")'),
});

// Agent 2: Character Designer Schemas
export const CharacterDesignerInputSchema = z.object({
  script: ComicScriptOutputSchema.describe('The comic script from Agent 1'),
});

export const CharacterVisualSchema = z.object({
  characterName: z.string().describe('Name of the character'),
  visualPrompt: z.string().describe('AI-ready visual description following minimalist webcomic style'),
  shape: z.string().describe('Body shape description (personality-driven)'),
  eyes: z.string().describe('Eye style description'),
  colors: z.string().describe('Color palette'),
  vibe: z.string().describe('Overall personality vibe'),
});

export const CharacterDesignerOutputSchema = z.object({
  characterDefinitions: z.array(CharacterVisualSchema).describe('Visual definitions for each character'),
  artStyle: z.string().describe('The art style applied to all characters'),
});

// Agent 3: AI Art Director Schemas
export const ArtDirectorInputSchema = z.object({
  script: ComicScriptOutputSchema.describe('The comic script'),
  characterDefinitions: z.array(CharacterVisualSchema).describe('Character visual definitions'),
});

export const PanelPromptSchema = z.object({
  panelNumber: z.number().describe('Panel number'),
  prompt: z.string().describe('Complete DALL-E image generation prompt'),
  dialogue: z.string().describe('The dialogue to be shown in speech bubble'),
  character: z.string().describe('Character speaking'),
  cameraAngle: z.string().describe('Cinematic camera angle'),
  
  // Continuity fields for panel-to-panel micro-changes
  continuesFromPanel: z.number().nullable().optional().describe('If this panel is a micro-variation of a previous panel (same scene, slight change like eyes moving), reference the panel number. Null if new scene.'),
  changeDescription: z.string().nullable().optional().describe('Specific micro-change from the previous panel (e.g., "eyes move upward", "slight smile appears", "ears droop"). Null if new scene.'),
});

export const ArtDirectorOutputSchema = z.object({
  panels: z.array(PanelPromptSchema).describe('Image generation prompts for each panel'),
  artStyle: z.string().describe('Consistent art style for all panels'),
});

// Agent 4: Voiceover Generator Schemas

// Common voice options (shown in dropdown)
export const CommonVoiceIds = {
  RACHEL: '21m00Tcm4TlvDq8ikWAM', // Rachel - Female (Soft)
  ADAM: 'pNInz6obpgDQGcFmaJgB', // Adam - Male (Deep)
  ANTONI: 'ErXwobaYiN019PkySvjV', // Antoni - Male (Narrator)
  ARNOLD: 'VR6AewLTigWG4xSOukaG', // Arnold - Male (Gruff)
  BELLA: 'EXAVITQu4vr4xnSDxMaL', // Bella - Female (Soft)
  CALLUM: 'N2lVS1w4EtoT3dr4eOWO', // Callum - Male (Strong)
  CHARLIE: 'IKne3meq5aSn9XLyUdCD', // Charlie - Male (Young)
  CLYDE: 'XB0fDUnXU5powFXDhCwa', // Clyde - Male (Middle-aged)
  CHRIS: 'iP95p4xoKVk53GoZ742B', // Chris - Male (Friendly)
  DANIEL: 'onwK4e9ZLuTAKqWW03F9', // Daniel - Male (Deep)
} as const;

export const CharacterVoiceMappingSchema = z.object({
  characterName: z.string().describe('Name of the character (e.g., Wolf, Rabbit)'),
  voiceId: z.string().describe('ElevenLabs voice ID. Common voices: Rachel (21m00Tcm4TlvDq8ikWAM)=soft female, Adam (pNInz6obpgDQGcFmaJgB)=deep male, Arnold (VR6AewLTigWG4xSOukaG)=gruff, Charlie (IKne3meq5aSn9XLyUdCD)=young, Antoni (ErXwobaYiN019PkySvjV)=narrator. Or enter any custom voice ID from ElevenLabs Voice Library.'),
});

export const VoiceoverGeneratorInputSchema = z.object({
  // Option 1: Simple single-voice generation (original)
  voiceoverScript: z.string().optional().describe('The voiceover script text to convert to speech (for single-voice mode)'),
  voiceId: z.string().optional().default('21m00Tcm4TlvDq8ikWAM').describe('Voice ID for single-voice mode. Use common IDs: Rachel (21m00Tcm4TlvDq8ikWAM)=soft female (default), Adam (pNInz6obpgDQGcFmaJgB)=deep male, Arnold (VR6AewLTigWG4xSOukaG)=gruff, Charlie (IKne3meq5aSn9XLyUdCD)=young, Antoni (ErXwobaYiN019PkySvjV)=narrator. Or paste any custom voice ID from ElevenLabs.'),
  
  // Option 2: Multi-character voice mapping (enhanced)
  script: z.any().optional().describe('The full comic script with characters and panels (for multi-character mode)'),
  characterVoiceMapping: z.array(CharacterVoiceMappingSchema).optional().describe('Multi-character mode: Assign a different voice to each character. Click "Add Item" to map character names to voices. You can use common voice IDs or paste custom ones from ElevenLabs Voice Library.'),
  
  // Common parameters
  modelId: z.enum(['eleven_flash_v2_5', 'eleven_turbo_v2_5', 'eleven_multilingual_v2', 'eleven_turbo_v2', 'eleven_monolingual_v1']).default('eleven_flash_v2_5').describe('ElevenLabs model (Flash v2.5 recommended for speed)'),
  outputFormat: z.string().default('mp3_44100_128').describe('Audio output format'),
  language: z.string().optional().describe('Language code (e.g., "en", "es", "fr")'),
  tags: z.array(z.string()).optional().describe('Tags to categorize the transcription'),
});

export const DialogueSegmentSchema = z.object({
  character: z.string().describe('Character speaking'),
  dialogue: z.string().describe('The dialogue text'),
  voiceId: z.string().describe('Voice ID used for this segment'),
  audioBase64: z.string().describe('Base64-encoded audio for this segment'),
  captions: z.array(z.any()).describe('Caption timing for this segment'),
});

export const VoiceoverGeneratorOutputSchema = z.object({
  success: z.boolean().describe('Whether the generation was successful'),
  mode: z.enum(['single-voice', 'multi-character']).describe('Generation mode used'),
  
  // Single-voice output
  audioBase64: z.string().optional().describe('Base64-encoded audio data (single-voice mode)'),
  captions: z.array(z.any()).optional().describe('Caption data with timing information (single-voice mode)'),
  
  // Multi-character output
  dialogueSegments: z.array(DialogueSegmentSchema).optional().describe('Individual dialogue segments per character (multi-character mode)'),
  characterVoiceMapping: z.array(CharacterVoiceMappingSchema).optional().describe('Final character-to-voice mapping used'),
  
  // Common output
  language: z.string().describe('Language of the generated audio'),
  transcription: z.any().optional().describe('Transcription database record'),
});

// Agent 5: Image Generator Schemas
export const ImageGeneratorInputSchema = z.object({
  panels: z.array(PanelPromptSchema).describe('Panels with prompts from Art Director (Agent 3)'),
  artStyle: z.string().describe('Consistent art style to apply'),
  
  // Model selection
  provider: z.enum(['gemini-flash', 'gemini-pro', 'dall-e-3']).default('gemini-flash').describe('Image generation provider: gemini-flash (Nano Banana - fast, 1024px), gemini-pro (Nano Banana Pro - advanced, up to 4K), dall-e-3 (OpenAI)'),
  
  // Resolution and aspect ratio
  aspectRatio: z.enum(['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']).default('1:1').describe('Aspect ratio for generated images'),
  resolution: z.enum(['1K', '2K', '4K']).default('1K').describe('Image resolution tier (4K only available for gemini-pro)'),
  
  // Quality options
  quality: z.enum(['standard', 'hd']).default('standard').describe('Image quality (for DALL-E 3: hd costs more)'),
  
  // Style reference support (optional)
  styleReferenceImages: z.array(z.string()).optional().describe('Optional: URLs or base64 of reference images for style matching (works best with Gemini models)'),
  styleStrength: z.number().min(0).max(1).default(0.7).optional().describe('How strongly to match reference style (0-1, higher = stronger matching)'),
});

export const GeneratedPanelSchema = z.object({
  panelNumber: z.number().describe('Panel number'),
  imageUrl: z.string().describe('URL of the generated image'),
  imageBase64: z.string().optional().describe('Base64-encoded image data (if requested)'),
  prompt: z.string().describe('The prompt used for generation'),
  continuesFromPanel: z.number().nullable().optional().describe('Reference to previous panel if continuity was used'),
  generationMethod: z.enum(['text-to-image', 'image-to-image']).describe('Method used for generation'),
});

export const ImageGeneratorOutputSchema = z.object({
  success: z.boolean().describe('Whether image generation was successful'),
  panels: z.array(GeneratedPanelSchema).describe('Generated panel images with metadata'),
  artStyle: z.string().describe('Art style used for all panels'),
  totalPanels: z.number().describe('Total number of panels generated'),
  error: z.string().optional().describe('Error message if generation failed'),
});

