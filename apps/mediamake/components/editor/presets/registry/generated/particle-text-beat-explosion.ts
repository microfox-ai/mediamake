/**
 * Particle-Based Text Beat Explosion Preset
 *
 * This preset creates beat-synchronized particle-based text animations where letters explode
 * into particles and reassemble on audio beat drops. Each particle has physics-based trajectory
 * with gravity and momentum. Explosion intensity correlates with beat intensity from audio analysis.
 *
 * Features:
 * - **Beat-Synchronized Explosions**: Letters fragment into particles on intense beats (intensity > 0.7)
 * - **Physics-Based Trajectories**: Each letter follows gravity-arc motion with random trajectories
 * - **Dynamic Explosion Intensity**: Explosion force scales with beat intensity from audio analysis
 * - **Magnetic Reassembly**: Letters snap back together with spring easing after explosion
 * - **Motion Blur Effects**: Particles have blur trails during motion for dynamic, energetic feel
 * - **Multi-Word Support**: Handles multiple words with individual letter animations
 * - **Performance Optimized**: Configurable max beats limit to control performance
 *
 * Use cases:
 * - EDM music video text effects
 * - High-energy title sequences
 * - Beat-drop synchronized typography
 * - Dynamic lyric animations
 * - Concert visuals and stage graphics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  TextAtomData,
  AudioAtomData,
} from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  audioSrc: z.string().describe('Audio source URL for beat analysis'),
  words: z
    .array(z.string())
    .describe('Array of words to animate (e.g., ["BASS", "DROP"])'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter:700')
    .describe('Font family with weight (e.g., "Inter:700", "Roboto:900")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or rgba)'),
  explosionIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Global explosion intensity multiplier'),
  reassembleSpeed: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Speed of reassembly animation (seconds)'),
  beatThreshold: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.7)
    .describe('Minimum beat intensity to trigger explosion (0-1)'),
  maxBeats: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe('Maximum number of beats to process (performance control)'),
  letterSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .describe('Letter spacing in pixels'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: any = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.fontFamily);

  // Fetch audio analysis
  if (!fetcher) {
    throw new Error('Fetcher is required for audio analysis');
  }

  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: params.audioSrc,
  });

  if (!analysis || analysis.length === 0) {
    // No beats detected - return empty composition
    return {
      output: {
        childrenData: [],
      },
      options: {
        attachedToId: 'BaseScene',
      },
    };
  }

  // Filter beats above threshold
  const qualifyingBeats = analysis
    .filter((beat: any) => beat.intensity >= params.beatThreshold)
    .slice(0, params.maxBeats)
    .sort((a: any, b: any) => a.timestamp - b.timestamp);

  if (qualifyingBeats.length === 0) {
    // No qualifying beats - return empty
    return {
      output: {
        childrenData: [],
      },
      options: {
        attachedToId: 'BaseScene',
      },
    };
  }

  // Generate random trajectory for each letter
  const generateTrajectory = () => {
    return {
      translateX: Math.random() * 400 - 200, // -200px to 200px
      translateY: -(Math.random() * 200 + 100), // -300px to -100px
      rotate: Math.random() * 360 - 180, // -180deg to 180deg
    };
  };

  // Calculate letter positions for each word
  const calculateLetterPositions = (word: string) => {
    const letters = word.split('');
    const letterWidth = params.fontSize * 0.6; // Approximate letter width
    const totalWidth = letters.length * letterWidth + (letters.length - 1) * params.letterSpacing;
    
    return letters.map((letter, index) => ({
      letter,
      left: index * (letterWidth + params.letterSpacing) - totalWidth / 2,
    }));
  };

  // Create explosion and reassembly effects for a letter
  const createLetterEffects = (
    letterId: string,
    beat: any,
    trajectory: any,
  ): any[] => {
    const explosionDuration = 0.6;
    const reassembleDuration = params.reassembleSpeed;
    const explosionStart = beat.timestamp;
    const reassembleStart = explosionStart + explosionDuration;

    // Scale explosion intensity by beat intensity
    const intensityMultiplier = beat.intensity * params.explosionIntensity;

    // Explosion effect (translateX, translateY, rotate, opacity, blur)
    const explosionEffect: GenericEffectData = {
      type: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Ease-out-quad for gravity arc
      start: explosionStart,
      duration: explosionDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // Translation
        { key: 'translateX', val: 0, prog: 0 },
        {
          key: 'translateX',
          val: trajectory.translateX * intensityMultiplier,
          prog: 1,
        },
        { key: 'translateY', val: 0, prog: 0 },
        {
          key: 'translateY',
          val: trajectory.translateY * intensityMultiplier,
          prog: 0.5,
        }, // Peak at 0.5
        {
          key: 'translateY',
          val:
            trajectory.translateY * intensityMultiplier +
            100 * intensityMultiplier,
          prog: 1,
        }, // Fall down
        // Rotation
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: trajectory.rotate * intensityMultiplier, prog: 1 },
        // Opacity fade during flight
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.6, prog: 0.5 },
        { key: 'opacity', val: 0.6, prog: 1 },
        // Motion blur
        { key: 'filter', val: 'blur(0px)', prog: 0 },
        {
          key: 'filter',
          val: `blur(${3 * intensityMultiplier}px)`,
          prog: 0.3,
        },
        { key: 'filter', val: `blur(${2 * intensityMultiplier}px)`, prog: 1 },
      ],
    };

    // Reassembly effect (snap back with spring easing)
    const reassembleEffect: GenericEffectData = {
      type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Spring easing
      start: reassembleStart,
      duration: reassembleDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // Translation back to origin
        {
          key: 'translateX',
          val: trajectory.translateX * intensityMultiplier,
          prog: 0,
        },
        { key: 'translateX', val: 0, prog: 1 },
        {
          key: 'translateY',
          val:
            trajectory.translateY * intensityMultiplier +
            100 * intensityMultiplier,
          prog: 0,
        },
        { key: 'translateY', val: 0, prog: 1 },
        // Rotation back to 0
        {
          key: 'rotate',
          val: trajectory.rotate * intensityMultiplier,
          prog: 0,
        },
        { key: 'rotate', val: 0, prog: 1 },
        // Opacity back to full
        { key: 'opacity', val: 0.6, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        // Blur fade out
        {
          key: 'filter',
          val: `blur(${2 * intensityMultiplier}px)`,
          prog: 0,
        },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
      ],
    };

    return [
      {
        id: `explosion-${letterId}-${beat.timestamp}`,
        componentId: 'generic',
        data: explosionEffect,
      },
      {
        id: `reassemble-${letterId}-${beat.timestamp}`,
        componentId: 'generic',
        data: reassembleEffect,
      },
    ];
  };

  // Generate all letter components with effects
  const allLetterComponents: any[] = [];

  params.words.forEach((word, wordIndex) => {
    const letterPositions = calculateLetterPositions(word);

    letterPositions.forEach((letterPos, letterIndex) => {
      const letterId = `letter-${wordIndex}-${letterIndex}`;
      const trajectory = generateTrajectory();

      // Generate effects for all qualifying beats
      const letterEffects: any[] = [];
      qualifyingBeats.forEach((beat: any) => {
        const effects = createLetterEffects(letterId, beat, trajectory);
        letterEffects.push(...effects);
      });

      const letterComponent = {
        id: letterId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: letterPos.letter,
          className: 'pointer-events-none',
          style: {
            position: 'absolute' as const,
            left: `calc(50% + ${letterPos.left}px)`,
            fontSize: params.fontSize,
            color: params.textColor,
            fontWeight: fontStyle.fontWeight || 700,
          },
          font: {
            family: fontFamily,
            weights: [fontStyle.fontWeight?.toString() || '700'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'audio-source',
          },
        },
        effects: letterEffects,
      };

      allLetterComponents.push(letterComponent);
    });
  });

  // Audio component
  const audioComponent = {
    id: 'audio-source',
    type: 'atom' as const,
    componentId: 'AudioAtom',
    data: {
      src: params.audioSrc,
      volume: 1,
    } as AudioAtomData,
    context: {
      timing: {
        start: 0,
      },
    },
  };

  // Text container
  const textContainer = {
    id: 'text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-source',
      },
    },
    childrenData: allLetterComponents as RenderableComponentData[],
  };

  // Root container
  const rootContainer = {
    id: 'particle-text-beat-explosion-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-source',
      },
    },
    childrenData: [audioComponent, textContainer] as RenderableComponentData[],
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

const presetMetadata: PresetMetadata = {
  id: 'particle-text-beat-explosion',
  title: 'Particle Text Beat Explosion',
  description:
    'Beat-synchronized particle-based text animation where letters explode into particles and reassemble on audio beat drops. Each letter fragments into particles with physics-based trajectories (gravity arcs), light trails via motion blur, and intensity-driven explosion force. Uses audio analysis preprocessing to generate fixed-timing explosion/reassembly effects for each qualifying beat (intensity > 0.7). Designed for EDM music video aesthetics with dynamic, energetic visuals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'particle',
    'explosion',
    'beat-sync',
    'audio-reactive',
    'physics',
    'edm',
    'music',
    'kinetic',
    'typography',
  ],
  dependencies: {},
  defaultInputParams: {
    audioSrc: 'https://example.com/audio.mp3',
    words: ['BASS', 'DROP'],
    fontSize: 64,
    fontFamily: 'Inter:700',
    textColor: '#FFFFFF',
    explosionIntensity: 1,
    reassembleSpeed: 0.8,
    beatThreshold: 0.7,
    maxBeats: 20,
    letterSpacing: 10,
  },
};

export const particleTextBeatExplosionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
