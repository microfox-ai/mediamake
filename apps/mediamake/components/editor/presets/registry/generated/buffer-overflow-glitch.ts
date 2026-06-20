/**
 * Buffer Overflow Memory Glitch Preset
 *
 * This preset creates a technical glitch effect simulating a buffer overflow memory fault.
 * The image appears to exceed its memory allocation and spill into adjacent memory spaces,
 * with ghost copies breaking boundaries, flickering between blend modes, fragmented pieces
 * appearing in wrong positions/scales/colors, and hexadecimal memory address overlays
 * scrolling during peak glitch moments.
 *
 * Features:
 * - **Ghost Image Copies**: 4-6 offset duplicates positioned outside normal bounds
 * - **Flickering Blend Modes**: Difference, exclusion, overlay, screen, multiply, color-dodge
 * - **Random Transformations**: Translate jumps, scale variations (0.5-1.5), rotation (-180 to 180)
 * - **Memory Address Overlay**: Scrolling hexadecimal text with SEGFAULT/OVERFLOW messages
 * - **Glitch Bars**: Horizontal white bars with scaleX and opacity animations
 * - **Timing**: 0.2s build-up, 0.8s main glitch, 0.3s recovery (total 1.3s)
 *
 * Use cases:
 * - Creating technical glitch transitions
 * - Simulating computer memory errors
 * - Adding cyberpunk/digital corruption effects
 * - Tech demo visuals
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  imageSrc: z
    .string()
    .describe('Source URL or path of the image to apply glitch effect'),
  duration: z
    .number()
    .default(1.3)
    .describe('Total duration of the effect in seconds (default: 1.3s)'),
  ghostCount: z
    .number()
    .min(4)
    .max(6)
    .default(6)
    .describe('Number of ghost image copies (4-6, default: 6)'),
  glitchIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for glitch effects (0.5-2, default: 1)'),
  memoryTextSpeed: z
    .number()
    .default(1)
    .describe('Speed multiplier for memory address scrolling (default: 1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    imageSrc,
    duration = 1.3,
    ghostCount = 6,
    glitchIntensity = 1,
    memoryTextSpeed = 1,
  } = params;

  // Timing breakdown
  const buildUpDuration = 0.2;
  const mainGlitchDuration = 0.8;
  const recoveryDuration = 0.3;

  // Ghost configurations with blend modes
  const blendModes = [
    'difference',
    'exclusion',
    'overlay',
    'screen',
    'multiply',
    'color-dodge',
  ];

  // Generate ghost image copies
  const ghostChildren: RenderableComponentData[] = [];

  for (let i = 0; i < ghostCount; i++) {
    const ghostId = `ghost-${i + 1}`;
    const blendMode = blendModes[i % blendModes.length];
    const randomDelay = Math.random() * 0.2;
    const ghostDuration = mainGlitchDuration - randomDelay * 0.2;

    // Random transformations
    const translateXValues = [
      -20 * glitchIntensity,
      15 * glitchIntensity,
      -10 * glitchIntensity,
    ];
    const translateYValues = [
      10 * glitchIntensity,
      -15 * glitchIntensity,
      5 * glitchIntensity,
    ];
    const scaleValues = [0.8, 1.2, 0.9];
    const rotateValues = [-45, 90, -30];

    // Opacity flicker pattern
    const opacityPattern = [
      { val: 0, prog: 0 },
      { val: 0.7 * glitchIntensity, prog: 0.1 + i * 0.05 },
      { val: 0, prog: 0.3 + i * 0.05 },
      { val: 0.5 * glitchIntensity, prog: 0.5 + i * 0.05 },
      { val: 0, prog: 1 },
    ];

    ghostChildren.push({
      id: ghostId,
      type: 'atom' as const,
      componentId: 'ImageAtom',
      data: {
        src: imageSrc,
        className: 'absolute w-full h-full object-cover',
        style: {
          mixBlendMode: blendMode,
          contain: 'layout',
        },
      },
      context: {
        timing: {
          start: buildUpDuration + randomDelay,
          duration: ghostDuration,
        },
      },
      effects: [
        {
          id: `${ghostId}-animation`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: ghostDuration,
            mode: 'provider',
            targetIds: [ghostId],
            ranges: [
              // Opacity flicker
              ...opacityPattern,
              // Translate jumps
              { key: 'translateX', val: translateXValues[0], prog: 0 },
              { key: 'translateX', val: translateXValues[1], prog: 0.5 },
              { key: 'translateX', val: translateXValues[2], prog: 1 },
              { key: 'translateY', val: translateYValues[0], prog: 0 },
              { key: 'translateY', val: translateYValues[1], prog: 0.5 },
              { key: 'translateY', val: translateYValues[2], prog: 1 },
              // Scale variations
              { key: 'scale', val: scaleValues[0], prog: 0 },
              { key: 'scale', val: scaleValues[1], prog: 0.5 },
              { key: 'scale', val: scaleValues[2], prog: 1 },
              // Rotation
              { key: 'rotate', val: rotateValues[0], prog: 0 },
              { key: 'rotate', val: rotateValues[1], prog: 0.5 },
              { key: 'rotate', val: rotateValues[2], prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create glitch bars (horizontal white bars)
  const glitchBars: RenderableComponentData[] = [];
  const barPositions = [20, 45, 65, 85];
  const barDelays = [0, 0.05, 0.1, 0.08];

  for (let i = 0; i < 4; i++) {
    const barId = `glitch-bar-${i + 1}`;
    const barHeight = i % 2 === 0 ? 2 : 1;
    const barDuration = mainGlitchDuration - barDelays[i];

    glitchBars.push({
      id: barId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style='width: 100%; height: ${barHeight}px; background: white;'></div>`,
        className: 'absolute',
        style: {
          top: `${barPositions[i]}%`,
          left: 0,
          right: 0,
        },
      },
      context: {
        timing: {
          start: buildUpDuration + barDelays[i],
          duration: barDuration,
        },
      },
      effects: [
        {
          id: `${barId}-flicker`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: barDuration,
            mode: 'provider',
            targetIds: [barId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.1 + i * 0.02 },
              { key: 'opacity', val: 0, prog: 0.15 + i * 0.02 },
              { key: 'opacity', val: 0.8, prog: 0.3 + i * 0.05 },
              { key: 'opacity', val: 0, prog: 0.35 + i * 0.05 },
              { key: 'opacity', val: 1, prog: 0.6 + i * 0.05 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scaleX', val: 0.5, prog: 0 },
              { key: 'scaleX', val: 1.5 + i * 0.1, prog: 0.5 },
              { key: 'scaleX', val: 0.8 - i * 0.05, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Memory address overlay text
  const memoryText =
    '0x7FFF5FBFF8A0 0x7FFF5FBFF8B8 0x7FFF5FBFF8D0 0x7FFF5FBFF8E8 0x7FFF5FBFF900 0x7FFF5FBFF918 0x7FFF5FBFF930 0x7FFF5FBFF948 SEGFAULT 0x7FFF5FBFF960 0x7FFF5FBFF978 0x7FFF5FBFF990 0x7FFF5FBFF9A8 OVERFLOW 0x7FFF5FBFF9C0 0x7FFF5FBFF9D8 0x7FFF5FBFF9F0 0x7FFF5FBFFA08 0x7FFF5FBFFA20 0x7FFF5FBFFA38 0x7FFF5FBFFA50 0x7FFF5FBFFA68 MEMORY_FAULT 0x7FFF5FBFFA80 0x7FFF5FBFFA98 0x7FFF5FBFFAB0 0x7FFF5FBFFAC8 0x7FFF5FBFFAE0';

  const memoryOverlay: RenderableComponentData = {
    id: 'memory-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute bottom-0 left-0 right-0',
        style: {
          height: '80px',
          overflow: 'hidden',
          zIndex: 4,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: buildUpDuration,
        duration: mainGlitchDuration,
      },
    },
    childrenData: [
      {
        id: 'memory-text',
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: memoryText,
          style: {
            fontSize: '14px',
            color: '#00FF00',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            lineHeight: '1.5',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: mainGlitchDuration,
          },
        },
        effects: [
          {
            id: 'memory-scroll',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: mainGlitchDuration / memoryTextSpeed,
              mode: 'provider',
              targetIds: ['memory-text'],
              ranges: [
                { key: 'translateY', val: '100%', prog: 0 },
                { key: 'translateY', val: '-100%', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Main image with distortion effect
  const mainImage: RenderableComponentData = {
    id: 'main-image',
    type: 'atom' as const,
    componentId: 'ImageAtom',
    data: {
      src: imageSrc,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 1,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'main-image-distortion',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: buildUpDuration,
          duration: mainGlitchDuration,
          mode: 'provider',
          targetIds: ['main-image'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 5 * glitchIntensity, prog: 0.25 },
            { key: 'translateX', val: -3 * glitchIntensity, prog: 0.5 },
            { key: 'translateX', val: 2 * glitchIntensity, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
            {
              key: 'filter',
              val: 'hue-rotate(0deg)',
              prog: 0,
            },
            {
              key: 'filter',
              val: `hue-rotate(${180 * glitchIntensity}deg)`,
              prog: 0.5,
            },
            {
              key: 'filter',
              val: 'hue-rotate(0deg)',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Ghost container
  const ghostContainer: RenderableComponentData = {
    id: 'ghost-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'visible',
          zIndex: 2,
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: buildUpDuration,
        duration: mainGlitchDuration,
      },
    },
    childrenData: ghostChildren,
  };

  // Glitch bars container
  const glitchBarsContainer: RenderableComponentData = {
    id: 'glitch-bars-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 3,
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: buildUpDuration,
        duration: mainGlitchDuration,
      },
    },
    childrenData: glitchBars,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'buffer-overflow-glitch-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900',
        style: {
          overflow: 'visible',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      mainImage,
      ghostContainer,
      glitchBarsContainer,
      memoryOverlay,
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
  id: 'buffer-overflow-glitch',
  title: 'Buffer Overflow Memory Glitch',
  description:
    'A technical glitch effect simulating a buffer overflow memory fault. Features ghost image copies spilling beyond boundaries with offset positioning, flickering blend modes, hexadecimal memory address overlays, and fragmented duplicates at wrong scales and colors. Creates the visual sensation of data bleeding into adjacent memory spaces with rapid glitch bars during peak moments, evoking a real-time segmentation fault.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'glitch',
    'technical',
    'buffer-overflow',
    'memory',
    'corruption',
    'digital',
    'cyberpunk',
    'error',
    'segfault',
  ],
  defaultInputParams: {
    imageSrc: 'https://example.com/image.jpg',
    duration: 1.3,
    ghostCount: 6,
    glitchIntensity: 1,
    memoryTextSpeed: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const bufferOverflowGlitchPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
