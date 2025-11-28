/**
 * Beat-Synced Typokinetic Lyrics Preset
 *
 * This preset creates an energetic typokinetics experience where individual words
 * pulse with staggered timing based on audio beats, similar to a sophisticated
 * karaoke-style presentation. Words anticipate beats slightly (0.05s offset),
 * fading up just before the beat hits for maximum impact.
 *
 * Features:
 * - **Audio Beat Synchronization**: Fetches audio beat data and aligns word opacity pulses
 * - **Anticipation Effect**: Words pulse 0.05s before beat hits for rhythmic impact
 * - **Multiple Pulse Styles**: Sharp (0.1s), Smooth (0.3s), Bouncy (0.2s with spring easing)
 * - **Baseline Opacity**: Readable but subdued (0.5-0.6) baseline, pulsing to full opacity (1.0)
 * - **Word-Level Timing**: Each word has unique timing aligned to beat timestamps
 * - **Flexible Layout**: Flex-wrap word spacing with configurable gap and alignment
 * - **Performance Optimized**: Limits simultaneous animations to viewport-visible words
 *
 * Use cases:
 * - Creating music video lyrics with beat-synced pulses
 * - Building dynamic karaoke-style presentations
 * - Adding rhythmic emphasis to spoken word content
 * - Creating engaging social media lyric videos
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  audio: z.object({
    src: z.string().describe('Audio source URL for beat analysis'),
    volume: z.number().min(0).max(2).default(1).optional().describe('Audio volume (0-2)'),
  }).describe('Audio configuration with source and volume'),
  
  captions: z.array(z.any()).describe('Array of caption objects with word-level timing (TranscriptionSentence[])'),
  
  pulseStyle: z.enum(['sharp', 'smooth', 'bouncy']).default('smooth').describe('Pulse animation style: sharp (0.1s, electronic), smooth (0.3s, acoustic), bouncy (0.2s spring, pop)'),
  
  baselineOpacity: z.number().min(0.3).max(0.8).default(0.6).describe('Baseline opacity for words when not pulsing (0.5-0.6 recommended)'),
  
  anticipationOffset: z.number().min(0).max(0.2).default(0.05).describe('Time offset before beat for pulse start (seconds, default 0.05)'),
  
  fontSize: z.number().min(24).max(120).default(48).optional().describe('Font size in pixels'),
  
  fontFamily: z.string().default('Inter').optional().describe('Font family (e.g., "Inter", "Roboto")'),
  
  fontWeight: z.string().default('700').optional().describe('Font weight (e.g., "400", "700")'),
  
  textColor: z.string().default('#ffffff').optional().describe('Text color (CSS color value)'),
  
  wordSpacing: z.number().min(0).max(50).default(8).optional().describe('Gap between words in pixels'),
  
  lineSpacing: z.number().min(0).max(100).default(20).optional().describe('Gap between caption lines in pixels'),
  
  alignment: z.enum(['left', 'center', 'right']).default('center').optional().describe('Horizontal alignment of words'),
  
  verticalPosition: z.enum(['top', 'center', 'bottom']).default('bottom').optional().describe('Vertical position of captions'),
  
  maxSimultaneousPulses: z.number().min(1).max(20).default(10).optional().describe('Maximum simultaneous beat pulses (performance optimization)'),
});

// Preset execution
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { audio, captions, pulseStyle, baselineOpacity, anticipationOffset, fontSize, fontFamily, fontWeight, textColor, wordSpacing, lineSpacing, alignment, verticalPosition, maxSimultaneousPulses } = params;
  const { fetcher } = props;

  // Validate inputs
  if (!audio?.src) {
    throw new Error('Audio source is required for beat analysis');
  }

  if (!captions || captions.length === 0) {
    throw new Error('Captions array is required and must not be empty');
  }

  // Fetch audio beat analysis
  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: audio.src,
  });

  if (!analysis || analysis.length === 0) {
    throw new Error('No beats detected in audio file');
  }

  // Helper: Get pulse duration based on style
  const getPulseDuration = (style: string): number => {
    switch (style) {
      case 'sharp':
        return 0.1;
      case 'smooth':
        return 0.3;
      case 'bouncy':
        return 0.2;
      default:
        return 0.3;
    }
  };

  // Helper: Get easing type based on style
  const getEasingType = (style: string): 'linear' | 'ease-in-out' | 'spring' => {
    switch (style) {
      case 'sharp':
        return 'linear';
      case 'smooth':
        return 'ease-in-out';
      case 'bouncy':
        return 'spring';
      default:
        return 'ease-in-out';
    }
  };

  const pulseDuration = getPulseDuration(pulseStyle);
  const easingType = getEasingType(pulseStyle);

  // Helper: Find beats aligned to a word's timing window
  const findBeatsForWord = (wordAbsoluteStart: number, wordDuration: number): any[] => {
    const wordEnd = wordAbsoluteStart + wordDuration;
    return analysis.filter((beat: any) => {
      return beat.timestamp >= wordAbsoluteStart && beat.timestamp <= wordEnd;
    });
  };

  // Helper: Create beat pulse effects for a word
  const createBeatPulseEffects = (wordId: string, wordAbsoluteStart: number, beats: any[]): any[] => {
    // Limit to maxSimultaneousPulses (performance optimization)
    const limitedBeats = beats.slice(0, maxSimultaneousPulses);
    
    return limitedBeats.map((beat: any, index: number) => {
      // Calculate effect start time (relative to word start, with anticipation offset)
      const relativeStart = beat.timestamp - wordAbsoluteStart - anticipationOffset;
      
      const effectData: GenericEffectData = {
        type: easingType,
        start: Math.max(0, relativeStart), // Ensure non-negative start
        duration: pulseDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: baselineOpacity, prog: 0 },
          { key: 'opacity', val: 1.0, prog: 0.5 },
          { key: 'opacity', val: baselineOpacity, prog: 1 },
        ],
      };

      return {
        id: `beat-pulse-${wordId}-${index}`,
        componentId: 'generic',
        data: effectData,
      };
    });
  };

  // Build caption line containers with words
  const captionLineContainers: RenderableComponentData[] = (captions as TranscriptionSentence[]).map((caption, captionIndex) => {
    const captionId = `caption-line-${captionIndex}`;

    // Build word atoms with beat pulse effects
    const wordAtoms: RenderableComponentData[] = caption.words.map((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;

      // Find beats that occur during this word's timing window
      const wordBeats = findBeatsForWord(word.absoluteStart, word.duration);

      // Create beat pulse effects for this word
      const beatPulseEffects = createBeatPulseEffects(wordId, word.absoluteStart, wordBeats);

      const textData: TextAtomData = {
        text: word.text,
        className: 'opacity-60', // Baseline opacity via Tailwind class
        style: {
          fontSize: fontSize || 48,
          fontWeight: fontWeight || '700',
          color: textColor || '#ffffff',
        },
        font: {
          family: fontFamily || 'Inter',
          weights: [fontWeight || '700'],
        },
      };

      return {
        id: wordId,
        componentId: 'TextAtom',
        type: 'atom' as const,
        data: textData,
        context: {
          timing: {
            start: word.start, // Relative to caption container
            duration: word.duration,
          },
        },
        effects: beatPulseEffects,
      } as RenderableComponentData;
    });

    return {
      id: captionId,
      componentId: 'BaseLayout',
      type: 'layout' as const,
      data: {
        containerProps: {
          className: `flex flex-wrap gap-${wordSpacing || 2} justify-${alignment || 'center'} items-center`,
          style: {
            gap: `${wordSpacing || 8}px`,
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart, // Relative to beat-sync-wrapper (which starts at 0)
          duration: caption.duration,
        },
      },
      childrenData: wordAtoms,
    } as RenderableComponentData;
  });

  // Beat-sync wrapper (main container for all captions)
  const beatSyncWrapper: RenderableComponentData = {
    id: 'beat-sync-wrapper',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${verticalPosition === 'top' ? 'items-start pt-8' : verticalPosition === 'center' ? 'items-center' : 'items-end pb-8'} justify-center px-8`,
        style: {
          flexDirection: 'column',
          gap: `${lineSpacing || 20}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
    childrenData: captionLineContainers,
  } as RenderableComponentData;

  // Audio track
  const audioTrack: RenderableComponentData = {
    id: 'audio-track',
    componentId: 'AudioAtom',
    type: 'atom' as const,
    data: {
      src: audio.src,
      volume: audio.volume || 1,
    },
    context: {
      timing: {
        start: 0,
        duration: durationInSeconds,
      },
    },
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'beat-sync-typokinetic-root',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
    childrenData: [audioTrack, beatSyncWrapper],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'beatSyncTypokineticLyrics',
  title: 'Beat-Synced Typokinetic Lyrics',
  description: 'Energetic typokinetics preset where individual words pulse with staggered timing based on audio beats, like a sophisticated karaoke-style lyric video. Words anticipate beats slightly, fading up just before the beat hits for maximum impact. Supports three pulse styles (sharp, smooth, bouncy) with baseline opacity of 0.5-0.6 pulsing to full opacity on beats.',
  type: 'predefined',
  presetType: 'children',
  tags: ['audio', 'beat-sync', 'typokinetics', 'lyrics', 'karaoke', 'captions', 'rhythm', 'music-video'],
  dependencies: {},
  defaultInputParams: {
    audio: {
      src: 'https://example.com/audio.mp3',
      volume: 1,
    },
    captions: [],
    pulseStyle: 'smooth',
    baselineOpacity: 0.6,
    anticipationOffset: 0.05,
    fontSize: 48,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#ffffff',
    wordSpacing: 8,
    lineSpacing: 20,
    alignment: 'center',
    verticalPosition: 'bottom',
    maxSimultaneousPulses: 10,
  },
};

// Export preset
export const beatSyncTypokineticLyricsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
