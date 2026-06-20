/**
 * Generative Mandala Typography System Preset
 *
 * This preset creates evolving sacred geometry patterns synchronized to music, where text forms
 * circular mandala patterns with multiple concentric rings rotating at different speeds.
 *
 * Features:
 * - **Concentric Ring System**: Center ring (titles), middle rings (captions), outer rings (keywords)
 * - **BPM-Synchronized Rotation**: Each ring rotates at rates derived from audio tempo (1x, 0.5x, 2x BPM)
 * - **Audio-Reactive Breathing**: Text size and spacing expand/contract with music using waveform effects
 * - **Sacred Geometry Overlays**: Visual guides with connecting lines between related words
 * - **Color Coding**: Warm colors (center/important) to cool colors (outer rings)
 * - **Ethereal Glow Effects**: Drop-shadow filters for mystical appearance
 *
 * Use cases:
 * - Creating music-synchronized typography art
 * - Building spiritual/meditative visual content
 * - Designing complex circular text layouts
 * - Creating watch-mechanism-like animated text systems
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  audioSrc: z.string().describe('Audio source URL for music synchronization'),
  titleText: z.string().default('SACRED').describe('Center title text'),
  captionTexts: z
    .array(z.string())
    .default([
      'HARMONY',
      'BALANCE',
      'ENERGY',
      'LIGHT',
      'SPIRIT',
      'WISDOM',
    ])
    .describe('Array of caption texts for middle rings (6 captions recommended)'),
  keywords: z
    .array(z.string())
    .default([
      'COSMIC',
      'DIVINE',
      'ETERNAL',
      'MYSTIC',
      'SACRED',
      'CELESTIAL',
      'INFINITE',
      'RADIANT',
      'LUMINOUS',
      'VIBRANT',
      'TRANSCEND',
      'UNIVERSAL',
    ])
    .describe('Array of keyword texts for outer rings (12 keywords recommended)'),
  bpm: z
    .number()
    .min(60)
    .max(180)
    .default(120)
    .describe('Beats per minute for rotation synchronization'),
  outerRingRadius: z
    .number()
    .default(420)
    .describe('Radius of outer ring in pixels'),
  middleRingRadius: z
    .number()
    .default(280)
    .describe('Radius of middle ring in pixels'),
  centerFontSize: z.number().default(48).describe('Font size for center title'),
  middleFontSize: z.number().default(24).describe('Font size for middle ring captions'),
  outerFontSize: z.number().default(18).describe('Font size for outer ring keywords'),
  breathingIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .describe('Intensity of breathing/scaling effect (0.1-2)'),
  rotationSpeed: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Global rotation speed multiplier'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (hex code)'),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  // Fetch audio duration for timing
  let audioDuration = 30; // Default fallback
  try {
    if (fetcher) {
      const audioAnalysis = await fetcher('/api/analyze-audio', {
        audioSrc: params.audioSrc,
      });
      audioDuration = audioAnalysis.durationInSeconds || 30;
    }
  } catch (error) {
    console.warn('Audio analysis failed, using default duration');
  }

  // Calculate rotation durations based on BPM
  const secondsPerBeat = 60 / params.bpm;
  const outerRingDuration = (secondsPerBeat * 8) / params.rotationSpeed; // 2x BPM (faster)
  const middleRingDuration = (secondsPerBeat * 16) / params.rotationSpeed; // 1x BPM (baseline)
  const centerRingDuration = (secondsPerBeat * 32) / params.rotationSpeed; // 0.5x BPM (slower)

  // Helper: Create text wrapper for positioning
  const createTextWrapper = (
    id: string,
    angle: number,
    radius: number,
    textContent: string,
    fontSize: number,
    color: string,
  ): RenderableComponentData => {
    return {
      id: `${id}-wrapper`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            transform: `rotate(${angle}deg) translateY(-${radius}px)`,
            transformOrigin: 'center center',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: audioDuration,
        },
      },
      childrenData: [
        {
          id,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: textContent,
            style: {
              fontSize: `${fontSize}px`,
              fontWeight: '600',
              color,
              textTransform: 'uppercase' as const,
              letterSpacing: '2px',
              filter: `drop-shadow(0 0 ${fontSize * 0.5}px ${color}80)`,
              transform: `rotate(-${angle}deg)`, // Counter-rotate text
            },
            font: {
              family: 'Inter',
              weights: ['600'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: audioDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  };

  // Create outer ring keywords (12 items, evenly spaced)
  const outerRingChildren: RenderableComponentData[] = [];
  const outerAngleStep = 360 / 12;
  for (let i = 0; i < 12; i++) {
    const angle = i * outerAngleStep;
    const keyword = params.keywords[i] || 'KEYWORD';
    outerRingChildren.push(
      createTextWrapper(
        `outer-keyword-${i}`,
        angle,
        params.outerRingRadius,
        keyword,
        params.outerFontSize,
        '#4FC3F7', // Cool blue for outer ring
      ),
    );
  }

  // Create middle ring captions (6 items, evenly spaced)
  const middleRingChildren: RenderableComponentData[] = [];
  const middleAngleStep = 360 / 6;
  for (let i = 0; i < 6; i++) {
    const angle = i * middleAngleStep;
    const caption = params.captionTexts[i] || 'CAPTION';
    middleRingChildren.push(
      createTextWrapper(
        `middle-caption-${i}`,
        angle,
        params.middleRingRadius,
        caption,
        params.middleFontSize,
        '#FFA726', // Warm orange for middle ring
      ),
    );
  }

  // Audio atom
  const audioAtom: RenderableComponentData = {
    id: 'audio-source',
    type: 'atom',
    componentId: 'AudioAtom',
    data: {
      src: params.audioSrc,
      volume: 1,
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  } as RenderableComponentData;

  // Sacred geometry background SVG
  const sacredGeometryBackground: RenderableComponentData = {
    id: 'sacred-geometry-background',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style='width: 100%; height: 100%; position: absolute; opacity: 0.15;'>
        <svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg' style='width: 100%; height: 100%;'>
          <circle cx='50' cy='50' r='40' fill='none' stroke='#ffffff' stroke-width='0.2'/>
          <circle cx='50' cy='50' r='30' fill='none' stroke='#ffffff' stroke-width='0.2'/>
          <circle cx='50' cy='50' r='20' fill='none' stroke='#ffffff' stroke-width='0.2'/>
          <line x1='10' y1='50' x2='90' y2='50' stroke='#ffffff' stroke-width='0.1'/>
          <line x1='50' y1='10' x2='50' y2='90' stroke='#ffffff' stroke-width='0.1'/>
          <line x1='20' y1='20' x2='80' y2='80' stroke='#ffffff' stroke-width='0.1'/>
          <line x1='80' y1='20' x2='20' y2='80' stroke='#ffffff' stroke-width='0.1'/>
        </svg>
      </div>`,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  } as RenderableComponentData;

  // Connecting lines SVG
  const connectingLines: RenderableComponentData = {
    id: 'connecting-lines-svg',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<svg width='100%' height='100%' style='position: absolute; top: 0; left: 0;'>
        <line x1='50%' y1='50%' x2='50%' y2='20%' stroke='rgba(255,255,255,0.2)' stroke-width='1'/>
        <line x1='50%' y1='50%' x2='80%' y2='50%' stroke='rgba(255,255,255,0.2)' stroke-width='1'/>
        <line x1='50%' y1='50%' x2='20%' y2='50%' stroke='rgba(255,255,255,0.2)' stroke-width='1'/>
        <line x1='50%' y1='50%' x2='80%' y2='80%' stroke='rgba(255,255,255,0.2)' stroke-width='1'/>
        <line x1='50%' y1='50%' x2='20%' y2='20%' stroke='rgba(255,255,255,0.2)' stroke-width='1'/>
      </svg>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  } as RenderableComponentData;

  // Outer ring container with rotation effect
  const outerRingContainer: RenderableComponentData = {
    id: 'outer-ring-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    effects: [
      {
        id: 'outer-ring-rotation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: outerRingDuration,
          mode: 'provider',
          targetIds: ['outer-ring-container'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 360, prog: 1 },
          ],
        },
      },
      {
        id: 'outer-ring-breathing',
        componentId: 'waveform',
        data: {
          audioSrc: params.audioSrc,
          audioProperty: 'bass' as const,
          effectType: 'scale' as const,
          intensity: params.breathingIntensity,
          baseScale: 1,
          sensitivity: 1.2,
          threshold: 0.1,
          mode: 'provider',
          targetIds: ['outer-ring-container'],
          start: 0,
          duration: audioDuration,
          smoothNormalisation: 2,
        },
      },
    ],
    childrenData: outerRingChildren,
  } as RenderableComponentData;

  // Middle ring container with rotation effect
  const middleRingContainer: RenderableComponentData = {
    id: 'middle-ring-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    effects: [
      {
        id: 'middle-ring-rotation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: middleRingDuration,
          mode: 'provider',
          targetIds: ['middle-ring-container'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: -360, prog: 1 }, // Counter-rotation
          ],
        },
      },
      {
        id: 'middle-ring-breathing',
        componentId: 'waveform',
        data: {
          audioSrc: params.audioSrc,
          audioProperty: 'mid' as const,
          effectType: 'scale' as const,
          intensity: params.breathingIntensity * 0.8,
          baseScale: 1,
          sensitivity: 1.0,
          threshold: 0.15,
          mode: 'provider',
          targetIds: ['middle-ring-container'],
          start: 0,
          duration: audioDuration,
          smoothNormalisation: 2,
        },
      },
    ],
    childrenData: middleRingChildren,
  } as RenderableComponentData;

  // Center title
  const centerTitle: RenderableComponentData = {
    id: 'center-title',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.titleText,
      style: {
        fontSize: `${params.centerFontSize}px`,
        fontWeight: '700',
        color: '#FF5252', // Warm red for center (most important)
        textTransform: 'uppercase' as const,
        letterSpacing: '6px',
        filter: `drop-shadow(0 0 ${params.centerFontSize * 0.4}px #FF525280)`,
        textAlign: 'center' as const,
      },
      font: {
        family: 'Inter',
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  } as RenderableComponentData;

  // Center ring container with rotation effect
  const centerRingContainer: RenderableComponentData = {
    id: 'center-ring-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    effects: [
      {
        id: 'center-ring-rotation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: centerRingDuration,
          mode: 'provider',
          targetIds: ['center-ring-container'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 360, prog: 1 },
          ],
        },
      },
      {
        id: 'center-ring-breathing',
        componentId: 'waveform',
        data: {
          audioSrc: params.audioSrc,
          audioProperty: 'treble' as const,
          effectType: 'scale' as const,
          intensity: params.breathingIntensity * 0.6,
          baseScale: 1,
          sensitivity: 0.8,
          threshold: 0.2,
          mode: 'provider',
          targetIds: ['center-ring-container'],
          start: 0,
          duration: audioDuration,
          smoothNormalisation: 2,
        },
      },
    ],
    childrenData: [centerTitle],
  } as RenderableComponentData;

  // Connecting lines container
  const connectingLinesContainer: RenderableComponentData = {
    id: 'connecting-lines-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          opacity: 0.3,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: [connectingLines],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'mandala-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: [
      audioAtom,
      sacredGeometryBackground,
      outerRingContainer,
      middleRingContainer,
      centerRingContainer,
      connectingLinesContainer,
    ],
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
  id: 'mandala-typography-system',
  title: 'Generative Mandala Typography System',
  description:
    'Text forms evolving sacred geometry patterns synchronized to music. Multiple rings rotate at BPM-derived speeds with breathing animations. Center for titles, middle for captions, outer for keywords.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'mandala',
    'sacred-geometry',
    'music-sync',
    'circular',
    'rotation',
    'audio-reactive',
    'breathing',
    'kinetic',
  ],
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    audioSrc: 'https://example.com/audio.mp3',
    titleText: 'SACRED',
    captionTexts: [
      'HARMONY',
      'BALANCE',
      'ENERGY',
      'LIGHT',
      'SPIRIT',
      'WISDOM',
    ],
    keywords: [
      'COSMIC',
      'DIVINE',
      'ETERNAL',
      'MYSTIC',
      'SACRED',
      'CELESTIAL',
      'INFINITE',
      'RADIANT',
      'LUMINOUS',
      'VIBRANT',
      'TRANSCEND',
      'UNIVERSAL',
    ],
    bpm: 120,
    outerRingRadius: 420,
    middleRingRadius: 280,
    centerFontSize: 48,
    middleFontSize: 24,
    outerFontSize: 18,
    breathingIntensity: 0.3,
    rotationSpeed: 1,
    backgroundColor: '#000000',
  },
};

// Export preset
export const mandalaTypographySystemPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
