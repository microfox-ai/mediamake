/**
 * Watercolor Typography Preset with Paint Splatter Effects
 *
 * This preset creates artistic watercolor typography with paint splatter effects,
 * wet-on-wet color blending, variable brush stroke weights, paper texture, gentle
 * tilting animations, and paint drip effects. It celebrates the handcrafted
 * imperfections of watercolor painting with translucent layered text and organic
 * paint drops.
 *
 * Features:
 * - Paint splatter effects around text with organic shapes
 * - Multiple overlapping text layers with varying opacities for depth
 * - Variable font weight animation simulating brush pressure
 * - Wet-on-wet color blending where colors meet
 * - Subtle paper texture bleeding through translucent paint
 * - Gentle tilting animations as if paper is being moved while paint is wet
 * - Occasional paint drips falling from letters
 * - Artistic, handcrafted aesthetic celebrating watercolor imperfections
 *
 * Use cases:
 * - Artistic titles and typography
 * - Handcrafted brand content
 * - Creative social media posts
 * - Art-focused video content
 * - Organic, natural-feeling text overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text to display with watercolor effect (single word or phrase)'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .optional()
    .describe('Duration in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(96)
    .optional()
    .describe('Font size in pixels'),
  font: z
    .string()
    .default('Inter')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Playfair Display:600:italic")',
    ),
  textColor: z
    .string()
    .default('rgba(88, 101, 242, 0.8)')
    .optional()
    .describe(
      'Primary text color (CSS color value, supports rgba for transparency)',
    ),
  splatters: z
    .array(
      z.object({
        color: z
          .string()
          .describe('Splatter color (CSS color, supports rgba)'),
        size: z.number().min(30).max(150).describe('Splatter size in pixels'),
        position: z
          .object({
            top: z.string().optional().describe('Top position (e.g., "-20px")'),
            right: z
              .string()
              .optional()
              .describe('Right position (e.g., "-25px")'),
            bottom: z
              .string()
              .optional()
              .describe('Bottom position (e.g., "-15px")'),
            left: z
              .string()
              .optional()
              .describe('Left position (e.g., "-30px")'),
          })
          .describe('Splatter position relative to text'),
        borderRadius: z
          .string()
          .default('40% 60% 60% 40%')
          .optional()
          .describe('Organic border radius for splatter shape'),
        blur: z
          .number()
          .min(2)
          .max(15)
          .default(8)
          .optional()
          .describe('Blur amount for soft edges'),
      }),
    )
    .default([
      {
        color: 'rgba(255, 107, 107, 0.3)',
        size: 80,
        position: { top: '-20px', left: '-30px' },
        borderRadius: '40% 60% 60% 40%',
        blur: 8,
      },
      {
        color: 'rgba(107, 169, 255, 0.25)',
        size: 60,
        position: { top: '10px', right: '-25px' },
        borderRadius: '60% 40% 40% 60%',
        blur: 6,
      },
      {
        color: 'rgba(255, 193, 7, 0.2)',
        size: 50,
        position: { bottom: '-15px', left: '20px' },
        borderRadius: '50% 50% 40% 60%',
        blur: 5,
      },
    ])
    .optional()
    .describe('Array of paint splatter configurations'),
  backgroundGradient: z
    .object({
      from: z
        .string()
        .default('rgb(255, 251, 235)')
        .optional()
        .describe('Gradient start color'),
      via: z
        .string()
        .default('rgb(255, 228, 230)')
        .optional()
        .describe('Gradient middle color'),
      to: z
        .string()
        .default('rgb(219, 234, 254)')
        .optional()
        .describe('Gradient end color'),
    })
    .default({
      from: 'rgb(255, 251, 235)',
      via: 'rgb(255, 228, 230)',
      to: 'rgb(219, 234, 254)',
    })
    .optional()
    .describe('Background gradient colors (simulating paper)'),
  drips: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable paint drip effects'),
  tiltAnimation: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable gentle tilting animation'),
  paperTexture: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable subtle paper texture overlay'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const duration = params.duration ?? 5;
  const fontSize = params.fontSize ?? 96;
  const textColor = params.textColor ?? 'rgba(88, 101, 242, 0.8)';
  const backgroundGradient = params.backgroundGradient ?? {
    from: 'rgb(255, 251, 235)',
    via: 'rgb(255, 228, 230)',
    to: 'rgb(219, 234, 254)',
  };

  // Parse font string
  const fontString = params.font ?? 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  const baseContainerId = 'watercolor-root';
  const textContainerId = 'text-container';
  const wordGroupId = 'word-group';

  // Create paint splatters
  const splatters = params.splatters ?? [];
  const splatterChildren: RenderableComponentData[] = splatters.map(
    (splatter, index) => {
      const positionStyle: React.CSSProperties = {
        top: splatter.position.top,
        right: splatter.position.right,
        bottom: splatter.position.bottom,
        left: splatter.position.left,
        zIndex: -1,
      };

      return {
        id: `paint-splatter-${index}`,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${splatter.size}px; height: ${splatter.size}px; background: ${splatter.color}; border-radius: ${splatter.borderRadius}; filter: blur(${splatter.blur}px);"></div>`,
          className: 'absolute',
          style: positionStyle,
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData;
    },
  );

  // Create text layers for depth
  const textLayerBaseId = 'text-layer-base';
  const textLayerTopId = 'text-layer-top';

  // Base layer (blurred, lower opacity)
  const textLayerBase: RenderableComponentData = {
    id: textLayerBaseId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: `text-6xl font-bold`,
      style: {
        color: textColor.replace(/[\d.]+\)$/, '0.4)'), // Lower opacity
        fontSize: fontSize,
        ...fontStyle,
        filter: 'blur(1px)',
        position: 'absolute' as const,
        top: 0,
        left: 0,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['300', '400', '500', '600', '700'],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  } as RenderableComponentData;

  // Top layer (sharp, higher opacity)
  const textLayerTop: RenderableComponentData = {
    id: textLayerTopId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'text-6xl font-bold relative',
      style: {
        color: textColor,
        fontSize: fontSize,
        ...fontStyle,
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['300', '400', '500', '600', '700'],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  } as RenderableComponentData;

  // Font weight oscillation effect (simulating brush pressure)
  const fontWeightEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: 3,
    mode: 'provider',
    targetIds: [textLayerTopId],
    ranges: [
      { key: 'fontWeight', val: 300, prog: 0 },
      { key: 'fontWeight', val: 700, prog: 0.5 },
      { key: 'fontWeight', val: 300, prog: 1 },
    ],
  };

  // Opacity animation for base layer
  const baseOpacityEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: 4,
    mode: 'provider',
    targetIds: [textLayerBaseId],
    ranges: [
      { key: 'opacity', val: 0.3, prog: 0 },
      { key: 'opacity', val: 0.5, prog: 0.5 },
      { key: 'opacity', val: 0.3, prog: 1 },
    ],
  };

  // Paint drip
  let dripChild: RenderableComponentData | null = null;
  if (params.drips !== false) {
    const dripId = 'drip-1';
    dripChild = {
      id: dripId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 6px; height: 20px; background: linear-gradient(to bottom, ${textColor.replace(/[\d.]+\)$/, '0.6)')}, transparent); border-radius: 0 0 50% 50%;"></div>`,
        className: 'absolute',
        style: {
          bottom: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData;

    // Drip animation
    const dripEffect: GenericEffectData = {
      type: 'ease-in',
      start: duration * 0.3,
      duration: 2,
      mode: 'provider',
      targetIds: [dripId],
      ranges: [
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: 30, prog: 1 },
        { key: 'opacity', val: 0.6, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    dripChild.effects = [
      {
        id: 'drip-effect',
        componentId: 'generic',
        data: dripEffect,
      },
    ];
  }

  // Attach effects to text layers
  textLayerTop.effects = [
    {
      id: 'font-weight-oscillation',
      componentId: 'generic',
      data: fontWeightEffect,
    },
  ];

  textLayerBase.effects = [
    {
      id: 'base-opacity',
      componentId: 'generic',
      data: baseOpacityEffect,
    },
  ];

  // Word group container
  const wordGroupChildren = [
    ...splatterChildren,
    textLayerBase,
    textLayerTop,
  ];
  if (dripChild) {
    wordGroupChildren.push(dripChild);
  }

  const wordGroup: RenderableComponentData = {
    id: wordGroupId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative inline-block',
        style: {
          transformStyle: 'preserve-3d' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: wordGroupChildren,
  } as RenderableComponentData;

  // Tilt animation (rotateX and rotateY)
  if (params.tiltAnimation !== false) {
    const tiltEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: 6,
      mode: 'provider',
      targetIds: [wordGroupId],
      ranges: [
        { key: 'rotateX', val: -5, prog: 0 },
        { key: 'rotateX', val: 5, prog: 0.5 },
        { key: 'rotateX', val: -5, prog: 1 },
        { key: 'rotateY', val: -3, prog: 0 },
        { key: 'rotateY', val: 3, prog: 0.5 },
        { key: 'rotateY', val: -3, prog: 1 },
      ],
    };

    wordGroup.effects = [
      {
        id: 'tilt-animation',
        componentId: 'generic',
        data: tiltEffect,
      },
    ];
  }

  // Text container
  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-wrap gap-3 p-8 items-center justify-center',
        style: {
          transformStyle: 'preserve-3d' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [wordGroup],
  } as RenderableComponentData;

  // Paper texture overlay
  let paperTextureChild: RenderableComponentData | null = null;
  if (params.paperTexture !== false) {
    paperTextureChild = {
      id: 'paper-texture-overlay',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9IjAuMSIvPjwvc3ZnPg=='); opacity: 0.15;"></div>`,
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData;
  }

  // Root container
  const rootChildren = paperTextureChild
    ? [paperTextureChild, textContainer]
    : [textContainer];

  const rootContainer: RenderableComponentData = {
    id: baseContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          background: `linear-gradient(to bottom right, ${backgroundGradient.from}, ${backgroundGradient.via}, ${backgroundGradient.to})`,
          transformStyle: 'preserve-3d' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: rootChildren,
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
  id: 'watercolor-typography-splatter',
  title: 'Watercolor Typography with Paint Splatter',
  description:
    'Artistic watercolor typography preset featuring paint splatter effects, wet-on-wet color blending, variable brush stroke weights, paper texture, gentle tilting animations, and paint drip effects. Celebrates the handcrafted imperfections of watercolor painting with translucent layered text and organic paint drops.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'watercolor',
    'artistic',
    'paint',
    'splatter',
    'handcrafted',
    'organic',
    'texture',
    'text',
    'creative',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'WATERCOLOR',
    duration: 5,
    fontSize: 96,
    font: 'Inter:700',
    textColor: 'rgba(88, 101, 242, 0.8)',
    splatters: [
      {
        color: 'rgba(255, 107, 107, 0.3)',
        size: 80,
        position: { top: '-20px', left: '-30px' },
        borderRadius: '40% 60% 60% 40%',
        blur: 8,
      },
      {
        color: 'rgba(107, 169, 255, 0.25)',
        size: 60,
        position: { top: '10px', right: '-25px' },
        borderRadius: '60% 40% 40% 60%',
        blur: 6,
      },
      {
        color: 'rgba(255, 193, 7, 0.2)',
        size: 50,
        position: { bottom: '-15px', left: '20px' },
        borderRadius: '50% 50% 40% 60%',
        blur: 5,
      },
    ],
    backgroundGradient: {
      from: 'rgb(255, 251, 235)',
      via: 'rgb(255, 228, 230)',
      to: 'rgb(219, 234, 254)',
    },
    drips: true,
    tiltAnimation: true,
    paperTexture: true,
  },
};

// Export preset
export const watercolorTypographySplatterPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
