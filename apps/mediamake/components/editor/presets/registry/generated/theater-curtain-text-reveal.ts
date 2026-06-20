/**
 * Theater Curtain Text Reveal Preset
 *
 * This preset creates a dramatic text reveal effect that mimics a theater curtain rising.
 * Text is fully formed but hidden behind a soft, feathered vertical mask that travels
 * from bottom to top, unveiling the text gracefully over 2-3 seconds.
 *
 * Features:
 * - **Soft Feathered Mask**: 40-60px gaussian blur creates a dreamy, cinematic transition
 * - **Curtain Rising Animation**: Vertical mask travels from bottom to top
 * - **Synchronized Scale Effect**: Subtle scale animation (0.95 → 1) adds depth
 * - **Smooth Reveal**: Text opacity fades in synchronized with mask movement
 * - **Configurable Timing**: Customizable duration and easing for different pacing needs
 * - **GPU Acceleration**: Optimized with transform: translateZ(0) and will-change
 *
 * Use cases:
 * - Classic film title reveals
 * - Cinematic opening credits
 * - Dramatic text introductions
 * - Theater-style presentations
 * - Elegant content reveals
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to reveal'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(2.5)
    .describe('Duration of the entire reveal animation in seconds'),
  blurAmount: z
    .number()
    .min(20)
    .max(100)
    .default(50)
    .describe('Gaussian blur amount for the mask edge in pixels (40-60px recommended)'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .describe('Font size of the text in pixels'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (Google Font)'),
  color: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  backgroundColor: z
    .string()
    .optional()
    .describe('Background color for the container (optional)'),
  easing: z
    .enum(['ease-out', 'ease-in', 'ease-in-out', 'linear'])
    .default('ease-out')
    .describe('Easing function for the animation'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    blurAmount,
    fontSize,
    fontWeight,
    fontFamily,
    color,
    backgroundColor,
    easing,
  } = params;

  // Generate unique IDs
  const containerId = 'theater-curtain-container';
  const textId = 'theater-curtain-text';
  const maskId = 'theater-curtain-mask';

  // Text component with scale effect
  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: 'absolute inset-0 flex items-center justify-center',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight,
        color,
        textAlign: 'center',
        zIndex: 1,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Opacity fade-in synchronized with mask movement
      {
        id: `${textId}-opacity`,
        componentId: 'generic',
        data: {
          type: easing,
          start: 0,
          duration: duration * 0.8, // 80% of total duration
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'opacity', val: 0.7, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      },
      // Subtle scale effect for depth
      {
        id: `${textId}-scale`,
        componentId: 'generic',
        data: {
          type: easing,
          start: 0,
          duration: duration * 0.8,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'scale', val: 0.95, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Mask overlay component
  const maskComponent: RenderableComponentData = {
    id: maskId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: linear-gradient(to bottom, black 0%, transparent 20%, transparent 80%, black 100%); filter: blur(${blurAmount}px);"></div>`,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 2,
        willChange: 'transform',
        transform: 'translateZ(0)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Mask travels from bottom to top (curtain rising)
      {
        id: `${maskId}-translate`,
        componentId: 'generic',
        data: {
          type: easing,
          start: 0,
          duration: duration * 0.8, // Complete by 80% of total duration
          mode: 'provider',
          targetIds: [maskId],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '-100%', prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full',
        style: backgroundColor ? { backgroundColor } : {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [textComponent, maskComponent],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'theater-curtain-text-reveal',
  title: 'Theater Curtain Text Reveal',
  description:
    'Typography preset featuring soft vertical mask reveal animation that rises like a theater curtain. Text appears with a dreamy feathered edge (40-60px gaussian blur) as a gradient mask travels from bottom to top. Includes synchronized subtle scale effect for added depth. Fully configurable timing, blur intensity, and easing for cinematic title reveals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'reveal',
    'curtain',
    'theater',
    'cinematic',
    'mask',
    'gradient',
    'dramatic',
    'title',
  ],
  defaultInputParams: {
    text: 'OPENING SCENE',
    duration: 2.5,
    blurAmount: 50,
    fontSize: 64,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: '#ffffff',
    easing: 'ease-out',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const theaterCurtainTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
