/**
 * Underwater Current Text Animation Preset
 * 
 * Creates an immersive underwater environment where text flows with ocean currents.
 * Features:
 * - Curved current paths using combined translateX/Y with sine/cosine functions
 * - Rotation and scale variations for underwater drift
 * - Caustic light patterns as animated radial gradients
 * - Underwater blur, brightness, and hue-rotate filters
 * - Bobbing motion with secondary animations
 * - Bubble particles passing by
 * - Multiple text layers with different flow patterns
 * 
 * Use cases:
 * - Ocean-themed title sequences
 * - Underwater documentary titles
 * - Marine biology content intros
 * - Swimming/diving event graphics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import {
  GenericEffectData,
} from '@microfox/remotion';

const presetParams = z.object({
  text: z
    .string()
    .default('UNDERWATER CURRENT')
    .describe('Text to display (will be split into words)'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#e0f2ff')
    .describe('Primary text color (light blue for underwater look)'),
  backgroundColor: z
    .string()
    .default('#0a1f3d')
    .describe('Deep ocean background color'),
  duration: z
    .number()
    .min(3)
    .max(30)
    .default(10)
    .describe('Total animation duration in seconds'),
  currentSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Speed multiplier for current flow (higher = faster)'),
  driftIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity of drift/bobbing motion'),
  causticSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Speed of caustic light movement'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    font,
    fontSize,
    textColor,
    backgroundColor,
    duration,
    currentSpeed,
    driftIntensity,
    causticSpeed,
  } = params;

  // Parse font string
  const parseFontString = (fontString?: string) => {
    if (!fontString) {
      return {
        family: 'Inter',
        style: { fontWeight: 700 },
        weights: ['700'],
      };
    }

    const family = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: React.CSSProperties = {};
    const weights: string[] = [];

    if (fontString.includes(':')) {
      const parts = fontString.split(':');
      if (parts.length > 2) {
        fontStyle.fontStyle = parts[2] as any;
        fontStyle.fontWeight = parseInt(parts[1], 10);
        weights.push(parts[1]);
      } else if (parts.length > 1) {
        fontStyle.fontWeight = parseInt(parts[1], 10);
        weights.push(parts[1]);
      }
    } else {
      fontStyle.fontWeight = 700;
      weights.push('700');
    }

    return { family, style: fontStyle, weights };
  };

  const fontConfig = parseFontString(font);

  // Split text into words
  const words = text.trim().split(/\s+/);

  // Create text word components with underwater effects
  const textWords: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `underwater-word-${index}`;

    // Vary parameters per word for natural flow
    const phaseOffset = (index / words.length) * Math.PI * 2;
    const currentCycleDuration = 2.5 / currentSpeed;
    const bobbingCycleDuration = 3 / currentSpeed;
    const rotationCycleDuration = 4 / currentSpeed;

    // Current flow effect (curved path)
    const currentEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Horizontal current (sine wave)
        { key: 'translateX', val: Math.sin(phaseOffset) * 40 * driftIntensity, prog: 0 },
        {
          key: 'translateX',
          val: Math.sin(phaseOffset + Math.PI) * 40 * driftIntensity,
          prog: 0.25,
        },
        {
          key: 'translateX',
          val: Math.sin(phaseOffset + Math.PI * 2) * 40 * driftIntensity,
          prog: 0.5,
        },
        {
          key: 'translateX',
          val: Math.sin(phaseOffset + Math.PI * 3) * 40 * driftIntensity,
          prog: 0.75,
        },
        { key: 'translateX', val: Math.sin(phaseOffset) * 40 * driftIntensity, prog: 1 },
        // Vertical current (cosine wave, slower)
        { key: 'translateY', val: Math.cos(phaseOffset) * 20 * driftIntensity, prog: 0 },
        {
          key: 'translateY',
          val: Math.cos(phaseOffset + Math.PI / 2) * 20 * driftIntensity,
          prog: 0.33,
        },
        {
          key: 'translateY',
          val: Math.cos(phaseOffset + Math.PI) * 20 * driftIntensity,
          prog: 0.66,
        },
        { key: 'translateY', val: Math.cos(phaseOffset) * 20 * driftIntensity, prog: 1 },
      ],
    };

    // Bobbing motion effect (secondary animation)
    const bobbingEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'translateY', val: -8 * driftIntensity, prog: 0 },
        { key: 'translateY', val: 8 * driftIntensity, prog: 0.5 },
        { key: 'translateY', val: -8 * driftIntensity, prog: 1 },
      ],
    };

    // Rotation effect (tertiary animation)
    const rotationEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'rotate', val: -10, prog: 0 },
        { key: 'rotate', val: 10, prog: 0.5 },
        { key: 'rotate', val: -10, prog: 1 },
      ],
    };

    // Scale pulsing effect
    const scaleEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'scale', val: 0.95, prog: 0 },
        { key: 'scale', val: 1.05, prog: 0.5 },
        { key: 'scale', val: 0.95, prog: 1 },
      ],
    };

    // Opacity depth variation
    const opacityEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'opacity', val: 0.7, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.25 },
        { key: 'opacity', val: 0.8, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 0.75 },
        { key: 'opacity', val: 0.7, prog: 1 },
      ],
    };

    return {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: fontSize,
          fontWeight: fontConfig.style.fontWeight || 700,
          fontStyle: fontConfig.style.fontStyle || 'normal',
          color: textColor,
          textShadow: '0 0 20px rgba(100,200,255,0.6), 0 4px 8px rgba(0,0,0,0.3)',
          filter: 'blur(1px) brightness(110%) hue-rotate(10deg)',
          marginRight: '0.3em',
        },
        font: {
          family: fontConfig.family,
          weights: fontConfig.weights,
          display: 'swap' as const,
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
          id: `${wordId}-current`,
          componentId: 'generic',
          data: currentEffect,
        },
        {
          id: `${wordId}-bobbing`,
          componentId: 'generic',
          data: bobbingEffect,
        },
        {
          id: `${wordId}-rotation`,
          componentId: 'generic',
          data: rotationEffect,
        },
        {
          id: `${wordId}-scale`,
          componentId: 'generic',
          data: scaleEffect,
        },
        {
          id: `${wordId}-opacity`,
          componentId: 'generic',
          data: opacityEffect,
        },
      ],
    } as RenderableComponentData;
  });

  // Caustic light layer 1
  const causticLight1Id = 'caustic-light-1';
  const caustic1Effect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [causticLight1Id],
    ranges: [
      { key: 'translateX', val: '-10%', prog: 0 },
      { key: 'translateX', val: '10%', prog: 0.5 },
      { key: 'translateX', val: '-10%', prog: 1 },
      { key: 'translateY', val: '-5%', prog: 0 },
      { key: 'translateY', val: '5%', prog: 0.33 },
      { key: 'translateY', val: '-5%', prog: 0.66 },
      { key: 'translateY', val: '5%', prog: 1 },
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: 1.3, prog: 0.5 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  const causticLight1: RenderableComponentData = {
    id: causticLight1Id,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width:100%;height:100%;background:radial-gradient(ellipse at 50% 50%, rgba(100,200,255,0.8) 0%, transparent 50%);'></div>",
      style: {
        width: '100%',
        height: '100%',
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
        id: 'caustic1-movement',
        componentId: 'generic',
        data: caustic1Effect,
      },
    ],
  } as RenderableComponentData;

  // Caustic light layer 2
  const causticLight2Id = 'caustic-light-2';
  const caustic2Effect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [causticLight2Id],
    ranges: [
      { key: 'translateX', val: '15%', prog: 0 },
      { key: 'translateX', val: '-15%', prog: 0.5 },
      { key: 'translateX', val: '15%', prog: 1 },
      { key: 'translateY', val: '10%', prog: 0 },
      { key: 'translateY', val: '-10%', prog: 0.4 },
      { key: 'translateY', val: '10%', prog: 0.8 },
      { key: 'translateY', val: '-10%', prog: 1 },
      { key: 'scale', val: 1.2, prog: 0 },
      { key: 'scale', val: 0.9, prog: 0.5 },
      { key: 'scale', val: 1.2, prog: 1 },
    ],
  };

  const causticLight2: RenderableComponentData = {
    id: causticLight2Id,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width:100%;height:100%;background:radial-gradient(ellipse at 70% 30%, rgba(120,220,255,0.7) 0%, transparent 40%);'></div>",
      style: {
        width: '100%',
        height: '100%',
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
        id: 'caustic2-movement',
        componentId: 'generic',
        data: caustic2Effect,
      },
    ],
  } as RenderableComponentData;

  // Create bubble particles
  const bubbles: RenderableComponentData[] = [
    {
      id: 'bubble-1',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='position:absolute;width:12px;height:12px;border-radius:50%;background:rgba(180,230,255,0.4);box-shadow:inset -2px -2px 4px rgba(255,255,255,0.5);'></div>",
        style: {
          position: 'absolute' as const,
          left: '20%',
          top: '80%',
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
          id: 'bubble-1-rise',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['bubble-1'],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -800, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 30, prog: 0.5 },
              { key: 'translateX', val: -20, prog: 1 },
              { key: 'opacity', val: 0.4, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    } as RenderableComponentData,
    {
      id: 'bubble-2',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='position:absolute;width:16px;height:16px;border-radius:50%;background:rgba(180,230,255,0.3);box-shadow:inset -2px -2px 4px rgba(255,255,255,0.5);'></div>",
        style: {
          position: 'absolute' as const,
          left: '60%',
          top: '70%',
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
          id: 'bubble-2-rise',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['bubble-2'],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -900, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -40, prog: 0.5 },
              { key: 'translateX', val: 20, prog: 1 },
              { key: 'opacity', val: 0.3, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    } as RenderableComponentData,
    {
      id: 'bubble-3',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='position:absolute;width:10px;height:10px;border-radius:50%;background:rgba(180,230,255,0.5);box-shadow:inset -2px -2px 4px rgba(255,255,255,0.5);'></div>",
        style: {
          position: 'absolute' as const,
          left: '80%',
          top: '60%',
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
          id: 'bubble-3-rise',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['bubble-3'],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -700, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 25, prog: 0.5 },
              { key: 'translateX', val: -15, prog: 1 },
              { key: 'opacity', val: 0.5, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    } as RenderableComponentData,
  ];

  // Build the complete structure
  const rootContainer: RenderableComponentData = {
    id: 'underwater-current-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: backgroundColor,
          overflow: 'hidden',
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
      // Caustic layer 1
      {
        id: 'caustic-layer-1',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              zIndex: 1,
              pointerEvents: 'none' as const,
              mixBlendMode: 'screen' as const,
              opacity: 0.4,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [causticLight1],
      } as RenderableComponentData,
      // Caustic layer 2
      {
        id: 'caustic-layer-2',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              zIndex: 2,
              pointerEvents: 'none' as const,
              mixBlendMode: 'screen' as const,
              opacity: 0.3,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [causticLight2],
      } as RenderableComponentData,
      // Text current container
      {
        id: 'text-current-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
            style: {
              zIndex: 3,
              gap: '40px',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: textWords,
      } as RenderableComponentData,
      // Bubble particles layer
      {
        id: 'bubble-particles-layer',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              zIndex: 4,
              pointerEvents: 'none' as const,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: bubbles,
      } as RenderableComponentData,
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

const presetMetadata: PresetMetadata = {
  id: 'underwater-current-text',
  title: 'Underwater Current Text Animation',
  description:
    'Typography flowing in ocean currents with caustic light patterns, underwater drift effects, and bobbing motion. Text follows curved paths with rotation, blur, and color shifts simulating underwater viewing. Features animated caustic highlights, particle/bubble overlays, and powerful swift currents.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'underwater',
    'ocean',
    'current',
    'caustic',
    'drift',
    'bubbles',
    'marine',
    'water',
    'flow',
    'kinetic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'UNDERWATER CURRENT',
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#e0f2ff',
    backgroundColor: '#0a1f3d',
    duration: 10,
    currentSpeed: 1,
    driftIntensity: 1,
    causticSpeed: 1.5,
  },
};

export const underwaterCurrentTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
