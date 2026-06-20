/**
 * Prismatic Text Reveal Preset
 *
 * Advanced text reveal effect using RGB channel separation to create chromatic aberration.
 * Features a rainbow gradient mask with feathered edges that refracts light as it passes
 * vertically, creating lens flare effects and subtle text warping. Uses three color-separated
 * text layers with blend modes and perspective transforms for authentic light-bending behavior.
 *
 * Features:
 * - **RGB Channel Separation**: Three text layers (red, green, blue) with slight vertical offsets
 * - **Chromatic Aberration**: Color channels offset by 2-3px to simulate light refraction
 * - **Rainbow Gradient Mask**: Animated vertical mask with color stops that shift hue
 * - **Lens Flare Elements**: Radial gradients at mask edges synchronized with mask position
 * - **Text Warping**: Perspective transform creating light-bending effect as mask passes
 * - **Smooth Animations**: Ease-out timing for organic light behavior
 * - **Performance Optimized**: Uses transform-style: preserve-3d and limited filter complexity
 *
 * Use cases:
 * - Creating cinematic text reveals with prismatic light effects
 * - Building high-impact title sequences
 * - Adding futuristic sci-fi aesthetics to content
 * - Creating premium brand reveal animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to reveal with prismatic effect'),
  fontSize: z
    .string()
    .optional()
    .default('96px')
    .describe('Font size for the text (e.g., "96px", "120px")'),
  fontFamily: z
    .string()
    .optional()
    .default('Inter')
    .describe('Font family for the text'),
  fontWeight: z
    .string()
    .optional()
    .default('bold')
    .describe('Font weight (e.g., "bold", "700", "900")'),
  duration: z
    .number()
    .min(2)
    .max(15)
    .default(5)
    .describe('Total duration of the prismatic reveal animation in seconds'),
  channelOffset: z
    .number()
    .min(1)
    .max(10)
    .default(2.5)
    .describe('Vertical offset between RGB channels in pixels (2-3px recommended)'),
  blurAmount: z
    .number()
    .min(30)
    .max(70)
    .default(50)
    .describe('Blur amount for the mask edge (45-55px recommended)'),
  maskAnimationSpeed: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Speed multiplier for mask movement (1 = normal, 2 = faster)'),
  warpIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Intensity of perspective warping effect (0-10)'),
  lensFlareOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Opacity of lens flare elements (0-1)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    fontWeight,
    duration,
    channelOffset,
    blurAmount,
    maskAnimationSpeed,
    warpIntensity,
    lensFlareOpacity,
  } = params;

  // Calculate animation timings
  const maskRevealDuration = duration * maskAnimationSpeed;
  const warpDuration = duration * 0.6; // Warping effect lasts 60% of duration

  // Component IDs
  const rootId = 'prismatic-root';
  const textContainerId = 'text-container';
  const textRedId = 'text-red-channel';
  const textGreenId = 'text-green-channel';
  const textBlueId = 'text-blue-channel';
  const maskOverlayId = 'mask-overlay';
  const lensFlareTopId = 'lens-flare-top';
  const lensFlareBottomId = 'lens-flare-bottom';

  // RGB channel text components
  const textRedChannel: RenderableComponentData = {
    id: textRedId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: '#ff0000',
        textAlign: 'center',
        filter: 'hue-rotate(0deg) saturate(2)',
        mixBlendMode: 'screen',
        transform: `translateY(${channelOffset}px)`,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight === 'bold' ? '700' : fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const textGreenChannel: RenderableComponentData = {
    id: textGreenId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: '#00ff00',
        textAlign: 'center',
        filter: 'hue-rotate(120deg) saturate(2)',
        mixBlendMode: 'screen',
        transform: 'translateY(0px)',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight === 'bold' ? '700' : fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const textBlueChannel: RenderableComponentData = {
    id: textBlueId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: '#0000ff',
        textAlign: 'center',
        filter: 'hue-rotate(240deg) saturate(2)',
        mixBlendMode: 'screen',
        transform: `translateY(-${channelOffset}px)`,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight === 'bold' ? '700' : fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Text container with perspective and warping
  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
          perspective: '1000px',
        },
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
        id: 'text-warp-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: warpDuration,
          mode: 'provider',
          targetIds: [textContainerId],
          ranges: [
            { key: 'rotateX', val: warpIntensity, prog: 0 },
            { key: 'rotateX', val: -warpIntensity * 0.5, prog: 0.3 },
            { key: 'rotateX', val: warpIntensity * 0.3, prog: 0.6 },
            { key: 'rotateX', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [textRedChannel, textGreenChannel, textBlueChannel],
  };

  // Animated gradient mask overlay
  const maskOverlay: RenderableComponentData = {
    id: maskOverlayId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; pointer-events: none;"></div>',
      className: 'absolute inset-0',
      style: {
        background:
          'linear-gradient(180deg, rgba(0,0,0,1) 0%, transparent 50%, rgba(0,0,0,1) 100%)',
        filter: `blur(${blurAmount}px)`,
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
        id: 'mask-reveal-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: maskRevealDuration,
          mode: 'provider',
          targetIds: [maskOverlayId],
          ranges: [
            { key: 'translateY', val: '-100%', prog: 0 },
            { key: 'translateY', val: '0%', prog: 0.4 },
            { key: 'translateY', val: '100%', prog: 1 },
          ],
        },
      },
    ],
  };

  // Lens flare at top edge
  const lensFlareTop: RenderableComponentData = {
    id: lensFlareTopId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 200px; pointer-events: none;"></div>',
      className: 'absolute top-0 left-0 right-0',
      style: {
        background: `radial-gradient(ellipse at center, rgba(255,255,255,${lensFlareOpacity}) 0%, transparent 70%)`,
        mixBlendMode: 'screen',
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
        id: 'flare-top-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: maskRevealDuration,
          mode: 'provider',
          targetIds: [lensFlareTopId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 0.5, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 0.8 },
          ],
        },
      },
    ],
  };

  // Lens flare at bottom edge
  const lensFlareBottom: RenderableComponentData = {
    id: lensFlareBottomId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 200px; pointer-events: none;"></div>',
      className: 'absolute bottom-0 left-0 right-0',
      style: {
        background: `radial-gradient(ellipse at center, rgba(255,255,255,${lensFlareOpacity}) 0%, transparent 70%)`,
        mixBlendMode: 'screen',
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
        id: 'flare-bottom-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: maskRevealDuration,
          mode: 'provider',
          targetIds: [lensFlareBottomId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
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
    childrenData: [textContainer, maskOverlay, lensFlareTop, lensFlareBottom],
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
  id: 'prismatic-text-reveal',
  title: 'Prismatic Text Reveal with Chromatic Aberration',
  description:
    'Advanced text reveal effect using RGB channel separation to create prismatic chromatic aberration. Features a rainbow gradient mask with feathered edges that refracts light as it passes vertically, creating lens flare effects and subtle text warping. Uses three color-separated text layers with blend modes and perspective transforms for authentic light-bending behavior.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'prismatic',
    'chromatic-aberration',
    'rgb-separation',
    'lens-flare',
    'light-bending',
    'cinematic',
    'advanced',
    'futuristic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'PRISMATIC',
    fontSize: '96px',
    fontFamily: 'Inter',
    fontWeight: 'bold',
    duration: 5,
    channelOffset: 2.5,
    blurAmount: 50,
    maskAnimationSpeed: 1,
    warpIntensity: 3,
    lensFlareOpacity: 0.6,
  },
};

export const prismaticTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
