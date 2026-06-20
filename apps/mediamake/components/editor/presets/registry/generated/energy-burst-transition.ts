/**
 * Energy Burst Transition Preset
 *
 * An explosive fighting-game-style transition featuring a dramatic compression-to-explosion sequence.
 * The outgoing scene compresses into a central point with intensifying brightness, triggers a bright flash
 * at maximum compression, then explodes outward with neon cyan/purple shockwave rings. Includes screen shake
 * at the moment of explosion for maximum impact.
 *
 * Features:
 * - **Compression Phase**: Outgoing scene scales down (1 to 0.3) with increasing brightness and vignette effect
 * - **Explosion Flash**: Bright white flash with overexposed whites at maximum compression point
 * - **Shockwave Rings**: 3 concentric neon rings (cyan/purple) that expand outward with opacity fade
 * - **Screen Shake**: Rapid shake effect at explosion moment for visceral impact
 * - **Incoming Scene Reveal**: New scene fades in during explosion phase
 *
 * Use cases:
 * - Gaming content transitions (special moves, ultimate abilities)
 * - Action sequence scene changes
 * - High-energy sports highlights
 * - Dynamic product reveals
 * - Music video scene transitions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ==================== PARAMS SCHEMA ====================

const presetParams = z.object({
  outgoingMediaSrc: z
    .string()
    .describe('Source URL or path for the outgoing scene media (video/image)'),
  incomingMediaSrc: z
    .string()
    .describe('Source URL or path for the incoming scene media (video/image)'),
  compressionDuration: z
    .number()
    .default(0.6)
    .describe('Duration of the compression phase in seconds'),
  flashDuration: z
    .number()
    .default(0.2)
    .describe('Duration of the white flash explosion in seconds'),
  expansionDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the shockwave expansion phase in seconds'),
  shockwaveCount: z
    .number()
    .default(3)
    .describe('Number of shockwave rings to generate'),
  shockwaveStagger: z
    .number()
    .default(0.05)
    .describe('Time offset between each shockwave ring in seconds'),
  shakeAmplitude: z
    .number()
    .default(10)
    .describe('Amplitude of screen shake effect in pixels'),
  shakeFrequency: z
    .number()
    .default(0.05)
    .describe('Frequency of screen shake oscillations in seconds'),
  primaryColor: z
    .string()
    .default('#06b6d4')
    .describe('Primary shockwave color (cyan by default)'),
  secondaryColor: z
    .string()
    .default('#a855f7')
    .describe('Secondary shockwave color (purple by default)'),
  tertiaryColor: z
    .string()
    .default('#67e8f9')
    .describe('Tertiary shockwave color (light cyan by default)'),
});

// ==================== EXECUTION FUNCTION ====================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingMediaSrc,
    incomingMediaSrc,
    compressionDuration,
    flashDuration,
    expansionDuration,
    shockwaveCount,
    shockwaveStagger,
    shakeAmplitude,
    shakeFrequency,
    primaryColor,
    secondaryColor,
    tertiaryColor,
  } = params;

  const totalDuration = compressionDuration + expansionDuration;
  const explosionStart = compressionDuration;

  // Helper function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Color array for shockwaves
  const shockwaveColors = [primaryColor, secondaryColor, tertiaryColor];

  // ==================== OUTGOING SCENE (COMPRESSION) ====================

  const outgoingSceneContainer: RenderableComponentData = {
    id: 'energy-burst-outgoing-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          background: 'radial-gradient(circle, transparent 0%, black 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: compressionDuration,
      },
    },
    effects: [
      // Compression scale effect (1 → 0.3)
      {
        id: 'outgoing-compression-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: compressionDuration,
          mode: 'provider',
          targetIds: ['energy-burst-outgoing-media'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.3, prog: 1 },
            { key: 'brightness', val: 1, prog: 0 },
            { key: 'brightness', val: 2.5, prog: 1 },
          ],
        },
      },
      // Vignette intensification
      {
        id: 'outgoing-vignette',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: compressionDuration,
          mode: 'provider',
          targetIds: ['energy-burst-outgoing-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'energy-burst-outgoing-media',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingMediaSrc,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: compressionDuration,
          },
        },
      },
    ],
  };

  // ==================== INCOMING SCENE (EXPANSION) ====================

  const incomingSceneContainer: RenderableComponentData = {
    id: 'energy-burst-incoming-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: explosionStart,
        duration: expansionDuration,
      },
    },
    effects: [
      // Fade in incoming scene
      {
        id: 'incoming-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: expansionDuration * 0.6,
          mode: 'provider',
          targetIds: ['energy-burst-incoming-media'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'energy-burst-incoming-media',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingMediaSrc,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: expansionDuration,
          },
        },
      },
    ],
  };

  // ==================== FLASH OVERLAY ====================

  const flashOverlay: RenderableComponentData = {
    id: 'energy-burst-flash',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      className: 'absolute inset-0 bg-white z-50',
      shape: 'rectangle',
      color: '#ffffff',
    },
    context: {
      timing: {
        start: explosionStart,
        duration: flashDuration,
      },
    },
    effects: [
      {
        id: 'flash-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: flashDuration,
          mode: 'provider',
          targetIds: ['energy-burst-flash'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // ==================== SHOCKWAVE RINGS ====================

  const shockwaveRings: RenderableComponentData[] = [];
  for (let i = 0; i < shockwaveCount; i++) {
    const ringStart = explosionStart + i * shockwaveStagger;
    const ringDuration = expansionDuration - i * shockwaveStagger;
    const color = shockwaveColors[i % shockwaveColors.length];
    const borderWidth = i === 1 ? 2 : 4; // Middle ring is thinner

    shockwaveRings.push({
      id: `energy-burst-shockwave-${i}`,
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        className: `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none`,
        shape: 'circle',
        color: 'transparent',
        style: {
          width: '100px',
          height: '100px',
          border: `${borderWidth}px solid ${color}`,
          boxShadow: `0 0 20px ${hexToRgba(color, 0.8)}, inset 0 0 20px ${hexToRgba(color, 0.3)}`,
        },
      },
      context: {
        timing: {
          start: ringStart,
          duration: ringDuration,
        },
      },
      effects: [
        {
          id: `shockwave-expansion-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: ringDuration,
            mode: 'provider',
            targetIds: [`energy-burst-shockwave-${i}`],
            ranges: [
              { key: 'scale', val: 0.1, prog: 0 },
              { key: 'scale', val: 30, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    });
  }

  // ==================== ROOT CONTAINER WITH SCREEN SHAKE ====================

  const rootContainer: RenderableComponentData = {
    id: 'energy-burst-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Screen shake at explosion moment
      {
        id: 'energy-burst-shake',
        componentId: 'shake',
        data: {
          type: 'shake',
          start: explosionStart,
          duration: flashDuration + 0.2,
          mode: 'provider',
          targetIds: ['energy-burst-root'],
          ranges: [
            { key: 'amplitude', val: shakeAmplitude, prog: 0 },
            { key: 'amplitude', val: 0, prog: 1 },
            { key: 'frequency', val: shakeFrequency, prog: 0 },
            { key: 'frequency', val: shakeFrequency, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      outgoingSceneContainer,
      incomingSceneContainer,
      flashOverlay,
      ...shockwaveRings,
    ],
  };

  return {
    output: {
      childrenData: [rootContainer as RenderableComponentData],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ==================== METADATA ====================

const presetMetadata: PresetMetadata = {
  id: 'energy-burst-transition',
  title: 'Energy Burst Transition',
  description:
    'An explosive fighting-game-style transition featuring a dramatic compression-to-explosion sequence. The outgoing scene compresses into a central point with intensifying brightness, triggers a bright flash at maximum compression, then explodes outward with neon cyan/purple shockwave rings. Includes screen shake at the moment of explosion for maximum impact. Perfect for gaming content, action sequences, or any video needing a powerful, dynamic transition.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'energy',
    'burst',
    'explosion',
    'fighting-game',
    'shockwave',
    'neon',
    'dynamic',
    'action',
    'gaming',
    'screen-shake',
    'flash',
    'compression',
  ],
  defaultInputParams: {
    outgoingMediaSrc: 'https://example.com/outgoing.mp4',
    incomingMediaSrc: 'https://example.com/incoming.mp4',
    compressionDuration: 0.6,
    flashDuration: 0.2,
    expansionDuration: 0.8,
    shockwaveCount: 3,
    shockwaveStagger: 0.05,
    shakeAmplitude: 10,
    shakeFrequency: 0.05,
    primaryColor: '#06b6d4',
    secondaryColor: '#a855f7',
    tertiaryColor: '#67e8f9',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ==================== EXPORT ====================

export const energyBurstTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
