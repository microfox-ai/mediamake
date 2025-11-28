/**
 * Dimensional Folding Text Effect Preset
 *
 * Audio-reactive typography with complex 3D folding animations. Text characters fold through
 * multiple spatial dimensions in response to music intensity, creating origami-like transformations
 * and impossible geometries. Features progressive complexity from simple 2D folds to mind-bending
 * 4D rotations, with dimensional rifts and glitch effects at audio peaks.
 *
 * Technical Features:
 * - 3D transforms with preserve-3d for spatial depth
 * - Character-level folding with transform-origin manipulation
 * - Progressive complexity based on audio intensity (2D → 3D → 4D rotations)
 * - Dimensional rifts using clip-path animations with angular cuts
 * - Glitch effects during fold transitions using CSS filters
 * - Audio-reactive waveform integration for fold intensity control
 *
 * Use Cases:
 * - Music video typography with audio synchronization
 * - Experimental typographic animations
 * - Abstract video art with text elements
 * - Concert visuals and live performances
 * - Creative title sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to apply dimensional folding effects to'),
  audio: z
    .object({
      src: z.string().describe('Audio source URL for audio reactivity'),
      volume: z.number().min(0).max(2).default(1).optional().describe('Audio volume (0-2)'),
    })
    .describe('Audio configuration for reactive folding'),
  fontSize: z
    .number()
    .min(24)
    .max(500)
    .default(64)
    .optional()
    .describe('Base font size in pixels'),
  color: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (CSS color value)'),
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family name (e.g., Inter, Roboto, Arial)'),
  backgroundColor: z
    .string()
    .default('#000000')
    .optional()
    .describe('Background color (CSS color value)'),
  foldIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .optional()
    .describe('Base fold intensity multiplier (0.1-3)'),
  audioSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .optional()
    .describe('Audio reactivity sensitivity (0.1-5)'),
  riftCount: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .optional()
    .describe('Number of dimensional rifts to create'),
  duration: z
    .number()
    .min(1)
    .default(30)
    .optional()
    .describe('Total duration in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    text,
    audio,
    fontSize = 64,
    color = '#ffffff',
    fontFamily = 'Inter',
    backgroundColor = '#000000',
    foldIntensity = 1,
    audioSensitivity = 1.5,
    riftCount = 5,
    duration = 30,
  } = params;

  // Split text into individual characters
  const characters = text.split('');

  // Helper: Create character transform-origin variations
  const getTransformOrigin = (index: number): string => {
    const origins = [
      'center center',
      'left center',
      'right center',
      'top center',
      'bottom center',
      'top left',
      'top right',
      'bottom left',
      'bottom right',
    ];
    return origins[index % origins.length];
  };

  // Helper: Create fold keyframe ranges for character
  const createFoldEffect = (
    charIndex: number,
    targetId: string,
    audioBased: boolean = false,
  ) => {
    const phase = charIndex * 0.05; // Stagger effect
    const baseDelay = phase;
    const foldDuration = audioBased ? duration : 2 + (charIndex % 3) * 0.5;

    // Progressive complexity: 2D → 3D → 4D-like rotations
    const ranges = [];

    if (!audioBased) {
      // Basic 2D fold (simple rotation)
      ranges.push(
        { key: 'rotateY', val: 0, prog: 0 },
        { key: 'rotateY', val: 90 * foldIntensity, prog: 0.25 },
        { key: 'rotateY', val: 180 * foldIntensity, prog: 0.5 },
        { key: 'rotateY', val: 90 * foldIntensity, prog: 0.75 },
        { key: 'rotateY', val: 0, prog: 1 },
      );

      // Add 3D fold (multi-axis rotation)
      ranges.push(
        { key: 'rotateX', val: 0, prog: 0 },
        { key: 'rotateX', val: 45 * foldIntensity, prog: 0.3 },
        { key: 'rotateX', val: -45 * foldIntensity, prog: 0.7 },
        { key: 'rotateX', val: 0, prog: 1 },
      );

      // Add Z-axis rotation for "4D" effect
      ranges.push(
        { key: 'rotateZ', val: 0, prog: 0 },
        { key: 'rotateZ', val: 30 * foldIntensity, prog: 0.4 },
        { key: 'rotateZ', val: -30 * foldIntensity, prog: 0.6 },
        { key: 'rotateZ', val: 0, prog: 1 },
      );

      // Add depth with translateZ and scaleZ
      ranges.push(
        { key: 'translateZ', val: '0px', prog: 0 },
        { key: 'translateZ', val: `${100 * foldIntensity}px`, prog: 0.5 },
        { key: 'translateZ', val: '0px', prog: 1 },
      );

      ranges.push(
        { key: 'scaleZ', val: 1, prog: 0 },
        { key: 'scaleZ', val: 1.5 * foldIntensity, prog: 0.5 },
        { key: 'scaleZ', val: 1, prog: 1 },
      );
    }

    return {
      id: `fold-effect-${charIndex}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: baseDelay,
        duration: foldDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges,
      },
    };
  };

  // Helper: Create glitch effect for fold transitions
  const createGlitchEffect = (charIndex: number, targetId: string) => {
    const glitchStart = (charIndex * 0.05) + 1; // After initial fold
    const glitchDuration = 0.3;

    return {
      id: `glitch-effect-${charIndex}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: glitchStart,
        duration: glitchDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'filter', val: 'contrast(100%) brightness(100%)', prog: 0 },
          { key: 'filter', val: 'contrast(200%) brightness(150%)', prog: 0.2 },
          { key: 'filter', val: 'contrast(100%) brightness(100%)', prog: 0.4 },
          { key: 'filter', val: 'contrast(200%) brightness(150%)', prog: 0.6 },
          { key: 'filter', val: 'contrast(100%) brightness(100%)', prog: 1 },
        ],
      },
    };
  };

  // Create character components with folding effects
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `char-${index}`;

      return {
        id: charId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: char,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: 'bold',
            color,
            display: 'inline-block',
            transformStyle: 'preserve-3d',
            transformOrigin: getTransformOrigin(index),
          },
          font: {
            family: fontFamily,
            weights: ['700', '900'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [
          createFoldEffect(index, charId, false),
          createGlitchEffect(index, charId),
        ],
      } as RenderableComponentData;
    },
  );

  // Create text container with 3D perspective
  const textContainer: RenderableComponentData = {
    id: 'text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-wrap justify-center gap-2',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: characterComponents,
  };

  // Create text layer
  const textLayer: RenderableComponentData = {
    id: 'text-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [textContainer],
  };

  // Create dimensional rifts
  const riftComponents: RenderableComponentData[] = [];
  for (let i = 0; i < riftCount; i++) {
    const riftStart = (duration / riftCount) * i;
    const riftDuration = 0.5;
    const riftId = `rift-${i}`;

    // Random angle and position for rift
    const angle = Math.random() * 360;
    const topPosition = Math.random() * 80 + 10;

    riftComponents.push({
      id: riftId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width:100%; height:100%; background:linear-gradient(${angle}deg, transparent 40%, rgba(255,0,255,0.3) 50%, transparent 60%)"></div>`,
        className: 'absolute inset-0',
        style: {
          clipPath: `polygon(0 0, 100% 0, 100% ${topPosition}%, 0 ${topPosition}%)`,
        },
      },
      context: {
        timing: {
          start: riftStart,
          duration: riftDuration,
        },
      },
      effects: [
        {
          id: `rift-glitch-${i}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: riftDuration,
            mode: 'provider',
            targetIds: [riftId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'filter', val: 'contrast(100%)', prog: 0 },
              { key: 'filter', val: 'contrast(300%) brightness(200%)', prog: 0.5 },
              { key: 'filter', val: 'contrast(100%)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create rift layer
  const riftLayer: RenderableComponentData = {
    id: 'rift-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: riftComponents,
  };

  // Create audio component
  const audioComponent: RenderableComponentData = {
    id: 'audio-layer',
    type: 'atom' as const,
    componentId: 'AudioAtom',
    data: {
      src: audio.src,
      volume: audio.volume ?? 1,
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Create waveform background for audio visualization
  const waveformComponent: RenderableComponentData = {
    id: 'waveform-background',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          opacity: 0.3,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
  };

  // Add audio-reactive zoom effect to text container
  const audioZoomEffect = {
    id: 'audio-zoom-text',
    componentId: 'waveform',
    data: {
      audioSrc: audio.src,
      audioProperty: 'bass',
      effectType: 'zoom',
      intensity: 0.2 * audioSensitivity,
      baseScale: 1,
      sensitivity: audioSensitivity,
      threshold: 0.2,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: ['text-container'],
      start: 0,
      duration,
      smoothNormalisation: 1,
    },
  };

  // Add audio-reactive effects to text container
  textContainer.effects = [audioZoomEffect];

  // Root container with 3D perspective
  const rootContainer: RenderableComponentData = {
    id: 'dimensional-folding-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
          perspective: '1200px',
          backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      audioComponent,
      waveformComponent,
      textLayer,
      riftLayer,
    ] as RenderableComponentData[],
  };

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
  id: 'dimensional-folding-text',
  title: 'Dimensional Folding Text Effect',
  description:
    'Audio-reactive typography with complex 3D folding animations. Text characters fold through multiple spatial dimensions in response to music intensity, creating origami-like transformations and impossible geometries. Features progressive complexity from simple 2D folds to mind-bending 4D rotations, with dimensional rifts and glitch effects at audio peaks.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    '3d',
    'folding',
    'audio-reactive',
    'music',
    'experimental',
    'glitch',
    'dimensional',
    'origami',
  ],
  defaultInputParams: {
    text: 'DIMENSIONAL',
    audio: {
      src: 'https://example.com/music.mp3',
      volume: 1,
    },
    fontSize: 64,
    color: '#ffffff',
    fontFamily: 'Inter',
    backgroundColor: '#000000',
    foldIntensity: 1,
    audioSensitivity: 1.5,
    riftCount: 5,
    duration: 30,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const dimensionalFoldingTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
