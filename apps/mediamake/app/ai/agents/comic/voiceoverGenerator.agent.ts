import { AiRouter } from '@microfox/ai-router';
import {
  VoiceoverGeneratorInputSchema,
  VoiceoverGeneratorOutputSchema,
} from './zod';
import { z } from 'zod/v4';

/**
 * Voiceover Generator Agent - Agent 4
 * Converts the voiceoverScript to audio using ElevenLabs TTS
 */

const aiRouter = new AiRouter();

// Default voice mappings for character types
const DEFAULT_CHARACTER_VOICES = {
  male: 'pNInz6obpgDQGcFmaJgB', // Adam - deep male
  female: '21m00Tcm4TlvDq8ikWAM', // Rachel - clear female
  gruff: 'VR6AewLTigWG4xSOukaG', // Arnold - deep gruff
  young: 'IKne3meq5aSn9XLyUdCD', // Charlie - casual young
  narrator: 'ErXwobaYiN019PkySvjV', // Antoni - clear narrator
};

/**
 * Generate voiceover with a single voice (original mode)
 */
async function generateSingleVoiceVoiceover({
  voiceoverScript,
  voiceId,
  modelId,
  outputFormat,
  language,
  tags,
  ctx,
}: any) {
  if (!voiceoverScript || voiceoverScript.trim() === '') {
    throw new Error('Voiceover script is required for audio generation');
  }

  ctx.response.writeMessageMetadata({
    loader: 'Generating single-voice voiceover...',
  });

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/transcribe/elevenlabs`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: voiceoverScript,
        voiceId,
        modelId,
        outputFormat,
        language,
        tags: tags || ['comic', 'voiceover'],
      }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to generate voiceover');
  }

  const result = await response.json();

  ctx.response.writeMessageMetadata({
    loader: 'Single-voice voiceover complete!',
  });

  return {
    success: result.success,
    mode: 'single-voice' as const,
    audioBase64: result.audioBase64,
    captions: result.captions,
    language: result.language,
    transcription: result.transcription,
  };
}

/**
 * Generate voiceover with multiple character voices (enhanced mode)
 */
async function generateMultiCharacterVoiceover({
  script,
  characterVoiceMapping,
  modelId,
  outputFormat,
  language,
  tags,
  ctx,
}: any) {
  ctx.response.writeMessageMetadata({
    loader: 'Generating multi-character voiceover...',
  });

  // Build voice mapping lookup
  const voiceMap = new Map<string, string>();
  characterVoiceMapping.forEach((mapping: any) => {
    voiceMap.set(mapping.characterName.toLowerCase(), mapping.voiceId);
  });

  // Extract dialogues from panels
  const panels = script.panels || [];
  const dialogueSegments = [];

  ctx.response.writeMessageMetadata({
    loader: `Processing ${panels.length} dialogue segments...`,
  });

  // Generate audio for each dialogue
  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];
    const characterName = panel.character;
    const dialogue = panel.dialogue;

    if (!dialogue || dialogue.trim() === '') {
      continue;
    }

    // Find voice for this character
    const characterVoiceId = voiceMap.get(characterName.toLowerCase()) || DEFAULT_CHARACTER_VOICES.narrator;

    ctx.response.writeMessageMetadata({
      loader: `Generating voice for ${characterName} (${i + 1}/${panels.length})...`,
    });

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/transcribe/elevenlabs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: dialogue,
            voiceId: characterVoiceId,
            modelId,
            outputFormat,
            language,
            tags: [...(tags || []), 'comic', 'voiceover', `character:${characterName}`],
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Failed to generate voice for ${characterName}:`, errorData);
        continue; // Skip this segment but continue with others
      }

      const result = await response.json();

      dialogueSegments.push({
        character: characterName,
        dialogue: dialogue,
        voiceId: characterVoiceId,
        audioBase64: result.audioBase64,
        captions: result.captions || [],
      });
    } catch (error) {
      console.error(`Error generating voice for ${characterName}:`, error);
      // Continue with other segments
    }
  }

  ctx.response.writeMessageMetadata({
    loader: 'Multi-character voiceover complete!',
  });

  return {
    success: true,
    mode: 'multi-character' as const,
    dialogueSegments,
    characterVoiceMapping,
    language: language || 'en',
  };
}

const voiceoverGeneratorAgent = aiRouter
  .agent('/', async ctx => {
    try {
      const {
        voiceoverScript,
        voiceId = '21m00Tcm4TlvDq8ikWAM',
        script,
        characterVoiceMapping,
        modelId = 'eleven_flash_v2_5',
        outputFormat = 'mp3_44100_128',
        language,
        tags,
      } = ctx.request.params as z.infer<typeof VoiceoverGeneratorInputSchema>;

      // Determine mode: multi-character or single-voice
      const isMultiCharacter = script && characterVoiceMapping && characterVoiceMapping.length > 0;

      if (isMultiCharacter) {
        // Multi-character mode
        return await generateMultiCharacterVoiceover({
          script,
          characterVoiceMapping,
          modelId,
          outputFormat,
          language,
          tags,
          ctx,
        });
      } else {
        // Single-voice mode (original)
        return await generateSingleVoiceVoiceover({
          voiceoverScript,
          voiceId,
          modelId,
          outputFormat,
          language,
          tags,
          ctx,
        });
      }
    } catch (error) {
      console.error('Error generating voiceover:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'voiceoverGenerator',
    name: 'Voiceover Generator',
    description:
      'Converts text scripts to high-quality audio using ElevenLabs Text-to-Speech. Supports two modes: 1) Single-voice mode: Takes a voiceover script and generates audio with one voice. 2) Multi-character mode: Takes a comic script with character-to-voice mappings and generates separate audio for each character\'s dialogue with word-level timing.',
    inputSchema: VoiceoverGeneratorInputSchema,
    outputSchema: VoiceoverGeneratorOutputSchema,
    metadata: {
      category: 'comic',
      tags: ['comic', 'voiceover', 'tts', 'elevenlabs', 'audio', 'multi-character'],
      icon: '🎙️',
      title: 'Voiceover Generator',
    },
  });

export default voiceoverGeneratorAgent;

