/**
 * Retro TV Typokinetics - Late Night Commercial Style
 *
 * This preset creates an aggressive chromatic typokinetics effect inspired by late-night retro TV commercials
 * and used car dealership ads. Features rainbow chrome text with full spectrum hue rotation, excessive star-burst
 * effects, bad chroma key fringing, severe VHS generation loss, random frame drops, action lines, and intense
 * neon glow with lens flares.
 *
 * Features:
 * - Rainbow chrome text with animated hue rotation
 * - Excessive star-burst effects with rotation and scaling
 * - Bad chroma key effect (green/blue fringing)
 * - Severe VHS generation loss (reduced contrast, color bleeding, soft focus)
 * - Random frame drops (simulated dropped frames)
 * - Action lines radiating from behind text
 * - Intense neon glow with lens flares and light bleeds
 *
 * Use cases:
 * - Creating retro TV commercial aesthetics
 * - Building cheesy video transition effects
 * - Adding aggressive kinetic typography
 * - Creating VHS-style glitch effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z
    .string()
    .default('SALE! SALE! SALE!')
    .describe('Text to display with retro TV effects'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Duration of the effect in seconds'),
  fontSize: z
    .number()
    .min(32)
    .max(256)
    .default(96)
    .describe('Font size in pixels'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Impact:700", "BebasNeue")',
    ),
  intensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Overall intensity multiplier for effects'),
  enableStarBursts: z
    .boolean()
    .default(true)
    .describe('Enable star-burst effects'),
  enableActionLines: z
    .boolean()
    .default(true)
    .describe('Enable action lines background'),
  enableLensFlares: z
    .boolean()
    .default(true)
    .describe('Enable lens flare effects'),
  enableVHSFilter: z
    .boolean()
    .default(true)
    .describe('Enable VHS generation loss filter'),
  enableFrameDrops: z
    .boolean()
    .default(true)
    .describe('Enable random frame drop simulation'),
  chromaKeyIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Intensity of bad chroma key fringing effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    font,
    intensity,
    enableStarBursts,
    enableActionLines,
    enableLensFlares,
    enableVHSFilter,
    enableFrameDrops,
    chromaKeyIntensity,
  } = params;

  // Parse font string
  const fontString = font || 'Impact:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  const childrenData: RenderableComponentData[] = [];

  // VHS filter overlay (if enabled)
  if (enableVHSFilter) {
    childrenData.push({
      id: 'vhs-filter-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='width: 100%; height: 100%; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, transparent 2px, transparent 4px);'></div>",
        className: 'absolute inset-0 pointer-events-none',
        style: {
          filter:
            'contrast(80%) brightness(110%) blur(0.3px) saturate(130%)',
          mixBlendMode: 'overlay',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData);
  }

  // Action lines container (if enabled)
  if (enableActionLines) {
    const actionLinesChildren: RenderableComponentData[] = [];

    for (let i = 0; i < 4; i++) {
      const rotation = i * 45;
      const speed = 360 * intensity;

      actionLinesChildren.push({
        id: `action-line-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style='width: 200%; height: 4px; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,${0.8 - i * 0.1}) 50%, transparent 100%);'></div>`,
          className: 'absolute',
          style: {
            transformOrigin: 'center',
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
            id: `action-line-${i}-rotate`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [`action-line-${i}`],
              ranges: [
                { key: 'rotate', val: rotation, prog: 0 },
                { key: 'rotate', val: rotation + speed, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    childrenData.push({
      id: 'action-lines-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className:
            'absolute inset-0 flex items-center justify-center pointer-events-none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: actionLinesChildren,
    } as RenderableComponentData);
  }

  // Star-burst container (if enabled)
  if (enableStarBursts) {
    const starBurstChildren: RenderableComponentData[] = [];

    const starBurstConfigs = [
      {
        id: 'star-burst-1',
        size: 600 * intensity,
        color: '#ffff00',
        opacity: 0.6 * intensity,
        rotationSpeed: 180,
        scalePattern: [0.8, 1.2, 0.8],
      },
      {
        id: 'star-burst-2',
        size: 500 * intensity,
        color: '#ff00ff',
        opacity: 0.5 * intensity,
        rotationSpeed: -240,
        scalePattern: [1, 0.7, 1],
      },
      {
        id: 'star-burst-3',
        size: 700 * intensity,
        color: '#00ffff',
        opacity: 0.4 * intensity,
        rotationSpeed: 300,
        scalePattern: [0.9, 0.9, 0.9],
      },
    ];

    starBurstConfigs.forEach((config) => {
      starBurstChildren.push({
        id: config.id,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style='width: ${config.size}px; height: ${config.size}px; background: conic-gradient(from 0deg, transparent 0%, ${config.color} 5%, transparent 10%, transparent 20%, ${config.color} 25%, transparent 30%, transparent 40%, ${config.color} 45%, transparent 50%, transparent 60%, ${config.color} 65%, transparent 70%, transparent 80%, ${config.color} 85%, transparent 90%); opacity: ${config.opacity};'></div>`,
          className: 'absolute',
          style: {
            transformOrigin: 'center',
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
            id: `${config.id}-rotate`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [config.id],
              ranges: [
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: config.rotationSpeed, prog: 1 },
              ],
            },
          },
          {
            id: `${config.id}-scale`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [config.id],
              ranges: [
                { key: 'scale', val: config.scalePattern[0], prog: 0 },
                { key: 'scale', val: config.scalePattern[1], prog: 0.5 },
                { key: 'scale', val: config.scalePattern[2], prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    });

    childrenData.push({
      id: 'star-burst-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className:
            'absolute inset-0 flex items-center justify-center pointer-events-none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: starBurstChildren,
    } as RenderableComponentData);
  }

  // Text container with rainbow chrome effect
  const textShadows = [
    // Bad chroma key fringing
    `-${chromaKeyIntensity}px 0 0 #00ff00`,
    `${chromaKeyIntensity}px 0 0 #0000ff`,
    `-${chromaKeyIntensity - 1}px 0 0 #00ff00`,
    `${chromaKeyIntensity - 1}px 0 0 #0000ff`,
    // Intense neon glow
    '0 0 20px #ffffff',
    '0 0 40px #ffffff',
    '0 0 60px #ffffff',
    '0 0 80px #ff00ff',
    '0 0 100px #ff00ff',
  ].join(', ');

  const textEffects: any[] = [
    // Entrance animation (spin and scale)
    {
      id: 'text-entrance',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: 0.8 * intensity,
        mode: 'provider',
        targetIds: ['rainbow-chrome-text'],
        ranges: [
          { key: 'scale', val: 3, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
          { key: 'rotate', val: 720, prog: 0 },
          { key: 'rotate', val: 0, prog: 1 },
        ],
      },
    },
  ];

  // Hue rotation effect (rainbow chrome animation)
  textEffects.push({
    id: 'text-hue-rotate',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: ['rainbow-chrome-text'],
      ranges: [
        { key: 'filter:hue-rotate', val: '0deg', prog: 0 },
        { key: 'filter:hue-rotate', val: '360deg', prog: 1 },
      ],
    },
  });

  // Frame drop effect (if enabled)
  if (enableFrameDrops) {
    textEffects.push({
      id: 'text-frame-drop',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: ['rainbow-chrome-text'],
        ranges: [
          { key: 'translateX', val: '0px', prog: 0 },
          { key: 'translateX', val: '5px', prog: 0.2 },
          { key: 'translateX', val: '5px', prog: 0.22 },
          { key: 'translateX', val: '0px', prog: 0.24 },
          { key: 'translateX', val: '-3px', prog: 0.5 },
          { key: 'translateX', val: '-3px', prog: 0.52 },
          { key: 'translateX', val: '0px', prog: 0.54 },
          { key: 'translateX', val: '4px', prog: 0.8 },
          { key: 'translateX', val: '4px', prog: 0.82 },
          { key: 'translateX', val: '0px', prog: 0.84 },
        ],
      },
    });
  }

  childrenData.push({
    id: 'text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      {
        id: 'rainbow-chrome-text',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: text,
          className: 'text-8xl font-black uppercase tracking-wider',
          style: {
            fontSize: fontSize,
            background:
              'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: textShadows,
            filter:
              'drop-shadow(0 0 30px rgba(255,255,255,0.8)) drop-shadow(0 0 60px rgba(255,0,255,0.6))',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : { weights: ['700'] }),
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: textEffects,
      } as RenderableComponentData,
    ],
  } as RenderableComponentData);

  // Lens flare overlay (if enabled)
  if (enableLensFlares) {
    const lensFlareChildren: RenderableComponentData[] = [];

    const lensFlareConfigs = [
      {
        id: 'lens-flare-1',
        size: 300 * intensity,
        position: { top: '20%', left: '30%' },
        gradient:
          'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,100,255,0.4) 30%, transparent 70%)',
        pulsePattern: [0.3, 0.8, 0.3, 0.9, 0.3],
      },
      {
        id: 'lens-flare-2',
        size: 200 * intensity,
        position: { top: '50%', right: '20%' },
        gradient:
          'radial-gradient(circle, rgba(255,255,0,0.7) 0%, rgba(255,150,0,0.3) 40%, transparent 70%)',
        pulsePattern: [0.4, 0.9, 0.2, 0.8, 0.4],
      },
      {
        id: 'lens-flare-3',
        size: 250 * intensity,
        position: { bottom: '15%', left: '15%' },
        gradient:
          'radial-gradient(circle, rgba(0,255,255,0.6) 0%, rgba(0,100,255,0.3) 35%, transparent 65%)',
        pulsePattern: [0.5, 0.2, 0.9, 0.3, 0.5],
      },
    ];

    lensFlareConfigs.forEach((config) => {
      lensFlareChildren.push({
        id: config.id,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style='width: ${config.size}px; height: ${config.size}px; border-radius: 50%; background: ${config.gradient};'></div>`,
          className: 'absolute',
          style: config.position,
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `${config.id}-pulse`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [config.id],
              ranges: config.pulsePattern.map((val, idx) => ({
                key: 'opacity',
                val: val,
                prog: idx / (config.pulsePattern.length - 1),
              })),
            },
          },
        ],
      } as RenderableComponentData);
    });

    childrenData.push({
      id: 'lens-flare-overlay',
      type: 'layout',
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
          duration: duration,
        },
      },
      childrenData: lensFlareChildren,
    } as RenderableComponentData);
  }

  const rootContainer: RenderableComponentData = {
    id: 'retro-tv-typokinetics-container',
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
        duration: duration,
      },
    },
    childrenData: childrenData,
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
  id: 'retro-tv-typokinetics',
  title: 'Retro TV Typokinetics - Late Night Commercial Style',
  description:
    'Aggressive chromatic typokinetics inspired by late-night retro TV commercials and used car dealership ads. Features rainbow chrome text with full spectrum hue rotation, excessive star-burst effects, bad chroma key fringing, severe VHS generation loss, random frame drops, action lines, and intense neon glow with lens flares. Maximum visual chaos using every effect in the palette.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'retro',
    'tv',
    'commercial',
    'rainbow',
    'chrome',
    'vhs',
    'glitch',
    'starburst',
    'lens-flare',
    'neon',
    'chroma-key',
  ],
  defaultInputParams: {
    text: 'SALE! SALE! SALE!',
    duration: 5,
    fontSize: 96,
    font: 'Impact:700',
    intensity: 1,
    enableStarBursts: true,
    enableActionLines: true,
    enableLensFlares: true,
    enableVHSFilter: true,
    enableFrameDrops: true,
    chromaKeyIntensity: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const retroTvTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
