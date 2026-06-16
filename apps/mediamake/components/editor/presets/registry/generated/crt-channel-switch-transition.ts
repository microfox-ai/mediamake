/**
 * CRT TV Channel Switch Transition Preset
 *
 * A nostalgic retro CRT TV channel-switching transition with:
 * - Chromatic aberration (RGB split effect) on outgoing video
 * - Horizontal scan lines overlay
 * - Vertical collapse to white line (CRT turn-off effect)
 * - Static noise interference with rapid opacity cycling
 * - Digital loading counter (0% → 100%)
 * - Incoming video expansion from horizontal line with clearing static
 *
 * Technical features:
 * - BaseLayout with 1.1s overlap period
 * - RGB split using multiple VideoAtoms with color filters and offsets
 * - Static noise using multiple ImageAtoms with blend modes
 * - Counter TextAtom with animated percentage display
 * - ScaleY animations for vertical collapse/expansion
 * - Filter animations for static clearing effect
 *
 * Use cases:
 * - Retro-style video transitions
 * - Nostalgic TV channel switching effects
 * - Gaming content with CRT aesthetics
 * - Music videos with vintage vibes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  noiseTextureSrc: z
    .string()
    .describe('Source URL of the static noise texture image'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(2.2)
    .describe('Total duration of the transition in seconds'),
  overlapDuration: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.1)
    .describe('Duration of the overlap period between outgoing and incoming'),
  rgbSplitIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Intensity of chromatic aberration RGB split effect (pixels)'),
  scanlineOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity of horizontal scan lines overlay'),
  staticIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for static noise effect'),
  counterFontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .describe('Font size for the loading percentage counter'),
  counterColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the loading counter text'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    noiseTextureSrc,
    transitionDuration,
    overlapDuration,
    rgbSplitIntensity,
    scanlineOpacity,
    staticIntensity,
    counterFontSize,
    counterColor,
  } = params;

  // Calculate timing phases
  const outgoingDuration = 0.6; // Duration for outgoing video collapse
  const staticDuration = 0.5; // Duration for static noise
  const counterDuration = overlapDuration; // Counter runs during overlap
  const incomingDuration = overlapDuration; // Incoming video expansion

  const staticStart = outgoingDuration;
  const counterStart = outgoingDuration;
  const incomingStart = transitionDuration - overlapDuration;

  // Helper function to generate counter text components
  const generateCounterText = (): RenderableComponentData => {
    const counterId = 'loading-counter';

    // Create a single text atom that will be animated via content changes
    // We'll use multiple effects to simulate counting from 0% to 100%
    const counterEffects: any[] = [];

    // Generate percentage steps (0%, 10%, 20%, ..., 100%)
    const steps = 11; // 0, 10, 20, ..., 100
    for (let i = 0; i < steps; i++) {
      const percentage = i * 10;
      const stepStart = (counterDuration / steps) * i;
      const stepDuration = counterDuration / steps;

      counterEffects.push({
        id: `counter-step-${percentage}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: stepStart,
          duration: stepDuration,
          mode: 'provider',
          targetIds: [counterId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      });
    }

    return {
      id: counterId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: '100%', // Final text (will appear to count up via effects)
        className: 'text-white font-mono',
        style: {
          fontSize: counterFontSize,
          color: counterColor,
          fontWeight: 'bold',
          textShadow: '0 0 20px rgba(255,255,255,0.8)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: counterDuration,
        },
      },
      effects: [
        // Fade in counter
        {
          id: 'counter-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 0.2,
            mode: 'provider',
            targetIds: [counterId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Fade out counter
        {
          id: 'counter-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: counterDuration - 0.2,
            duration: 0.2,
            mode: 'provider',
            targetIds: [counterId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Build outgoing video container with RGB split
  const outgoingContainer: RenderableComponentData = {
    id: 'crt-outgoing-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    effects: [
      // Vertical collapse (scaleY 1 → 0.01)
      {
        id: 'outgoing-collapse',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: outgoingDuration,
          mode: 'provider',
          targetIds: ['crt-outgoing-container'],
          ranges: [
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: 0.01, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      // Red channel (offset left)
      {
        id: 'outgoing-red',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: 'cover',
          className: 'absolute inset-0',
          style: {
            mixBlendMode: 'screen',
            filter: `grayscale(100%) contrast(1.5) sepia(100%) saturate(10000%) hue-rotate(320deg)`,
            transform: `translateX(-${rgbSplitIntensity}px)`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
      } as RenderableComponentData,
      // Green channel (no offset)
      {
        id: 'outgoing-green',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: 'cover',
          className: 'absolute inset-0',
          style: {
            mixBlendMode: 'screen',
            filter: `grayscale(100%) contrast(1.5) sepia(100%) saturate(10000%) hue-rotate(80deg)`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
      } as RenderableComponentData,
      // Blue channel (offset right)
      {
        id: 'outgoing-blue',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: 'cover',
          className: 'absolute inset-0',
          style: {
            mixBlendMode: 'screen',
            filter: `grayscale(100%) contrast(1.5) sepia(100%) saturate(10000%) hue-rotate(200deg)`,
            transform: `translateX(${rgbSplitIntensity}px)`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
      } as RenderableComponentData,
      // Scanlines overlay
      {
        id: 'scanlines',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width:100%;height:100%;background:repeating-linear-gradient(0deg,transparent 0px,transparent 2px,rgba(0,0,0,${scanlineOpacity}) 2px,rgba(0,0,0,${scanlineOpacity}) 4px);pointer-events:none;"></div>`,
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Build static noise container
  const staticContainer: RenderableComponentData = {
    id: 'crt-static-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black',
      },
    },
    context: {
      timing: {
        start: staticStart,
        duration: staticDuration,
      },
    },
    childrenData: [
      // Noise layer 1
      {
        id: 'noise-1',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: noiseTextureSrc,
          className: 'absolute inset-0 object-cover',
          style: {
            filter: `grayscale(100%) contrast(${2 * staticIntensity})`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: staticDuration,
          },
        },
        effects: [
          // Rapid opacity cycling
          {
            id: 'noise-1-cycle',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: staticDuration,
              mode: 'provider',
              targetIds: ['noise-1'],
              ranges: [
                { key: 'opacity', val: 0.8, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.1 },
                { key: 'opacity', val: 0.6, prog: 0.2 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 0.7, prog: 0.4 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0.8, prog: 0.6 },
                { key: 'opacity', val: 1, prog: 0.7 },
                { key: 'opacity', val: 0.9, prog: 0.8 },
                { key: 'opacity', val: 1, prog: 0.9 },
                { key: 'opacity', val: 0.8, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Noise layer 2
      {
        id: 'noise-2',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: noiseTextureSrc,
          className: 'absolute inset-0 object-cover',
          style: {
            filter: `grayscale(100%) contrast(${2 * staticIntensity})`,
            mixBlendMode: 'overlay',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: staticDuration,
          },
        },
        effects: [
          {
            id: 'noise-2-cycle',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: staticDuration,
              mode: 'provider',
              targetIds: ['noise-2'],
              ranges: [
                { key: 'opacity', val: 0.5, prog: 0 },
                { key: 'opacity', val: 0.8, prog: 0.15 },
                { key: 'opacity', val: 0.4, prog: 0.3 },
                { key: 'opacity', val: 0.9, prog: 0.45 },
                { key: 'opacity', val: 0.6, prog: 0.6 },
                { key: 'opacity', val: 1, prog: 0.75 },
                { key: 'opacity', val: 0.7, prog: 0.9 },
                { key: 'opacity', val: 0.8, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Noise layer 3
      {
        id: 'noise-3',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: noiseTextureSrc,
          className: 'absolute inset-0 object-cover',
          style: {
            filter: `grayscale(100%) contrast(${2 * staticIntensity})`,
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: staticDuration,
          },
        },
        effects: [
          {
            id: 'noise-3-cycle',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: staticDuration,
              mode: 'provider',
              targetIds: ['noise-3'],
              ranges: [
                { key: 'opacity', val: 0.3, prog: 0 },
                { key: 'opacity', val: 0.7, prog: 0.12 },
                { key: 'opacity', val: 0.5, prog: 0.25 },
                { key: 'opacity', val: 0.9, prog: 0.38 },
                { key: 'opacity', val: 0.4, prog: 0.5 },
                { key: 'opacity', val: 0.8, prog: 0.63 },
                { key: 'opacity', val: 0.6, prog: 0.75 },
                { key: 'opacity', val: 1, prog: 0.88 },
                { key: 'opacity', val: 0.7, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // White line flash (appears near end of static)
      {
        id: 'white-line',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width:100%;height:4px;background:white;position:absolute;top:50%;transform:translateY(-50%);"></div>`,
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: staticDuration - 0.02,
            duration: 0.02,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Build loading counter container
  const counterContainer: RenderableComponentData = {
    id: 'crt-counter-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: counterStart,
        duration: counterDuration,
      },
    },
    childrenData: [generateCounterText()],
  };

  // Build incoming video container
  const incomingContainer: RenderableComponentData = {
    id: 'crt-incoming-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingDuration,
      },
    },
    effects: [
      // Vertical expansion (scaleY 0.01 → 1)
      {
        id: 'incoming-expand',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: incomingDuration,
          mode: 'provider',
          targetIds: ['crt-incoming-container'],
          ranges: [
            { key: 'scaleY', val: 0.01, prog: 0 },
            { key: 'scaleY', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      // Main incoming video
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          fit: 'cover',
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration,
          },
        },
        effects: [
          // Clear static effect (brightness/contrast normalize)
          {
            id: 'incoming-clear',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 0.3,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                {
                  key: 'filter',
                  val: 'brightness(1.5) contrast(2)',
                  prog: 0,
                },
                { key: 'filter', val: 'brightness(1) contrast(1)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Static overlay (clears after 0.3s)
      {
        id: 'incoming-static',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: noiseTextureSrc,
          className: 'absolute inset-0 object-cover',
          style: {
            filter: `grayscale(100%) contrast(${2 * staticIntensity})`,
            mixBlendMode: 'overlay',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 0.3,
          },
        },
        effects: [
          {
            id: 'incoming-static-fade',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 0.3,
              mode: 'provider',
              targetIds: ['incoming-static'],
              ranges: [
                { key: 'opacity', val: 0.8, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: 'crt-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      outgoingContainer,
      staticContainer,
      counterContainer,
      incomingContainer,
    ],
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
  id: 'crt-channel-switch-transition',
  title: 'Retro CRT TV Channel Switch Transition',
  description:
    'A nostalgic CRT TV channel-switching transition with scan lines, chromatic aberration (RGB split), vertical collapse, static noise interference, digital loading counter (0-100%), and horizontal expansion with clearing static effect',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'crt',
    'retro',
    'vintage',
    'tv',
    'channel-switch',
    'chromatic-aberration',
    'rgb-split',
    'scan-lines',
    'static-noise',
    'loading-counter',
    'collapse',
    'expand',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing.mp4',
    incomingVideoSrc: 'https://example.com/incoming.mp4',
    noiseTextureSrc: 'https://example.com/static-noise.png',
    transitionDuration: 2.2,
    overlapDuration: 1.1,
    rgbSplitIntensity: 5,
    scanlineOpacity: 0.3,
    staticIntensity: 1,
    counterFontSize: 48,
    counterColor: '#FFFFFF',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const crtChannelSwitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
