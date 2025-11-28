/**
 * Split-Text Typokinetics Preset
 *
 * A typokinetic preset where text is divided into upper and lower halves using CSS clip-path.
 * The top half drifts left while the bottom half drifts right, creating a shearing/split-screen
 * effect. The halves periodically realign, creating 'beats' of perfect readability alternating
 * with abstract fragmented moments - like viewing text through moving water or heat distortion.
 *
 * Features:
 * - **Split-Screen Effect**: Text divided horizontally with independent movement
 * - **Shearing Motion**: Top half drifts left, bottom half drifts right
 * - **Alignment Beats**: Periodic moments of perfect clarity at 0%, 50%, 100% progress
 * - **Subtle Opacity Fade**: Enhanced separation during maximum drift
 * - **Optimized Performance**: Uses will-change for transform and clip-path
 * - **High-Contrast Typography**: Didot 200 weight for elegant thin serifs
 *
 * Use cases:
 * - Creating artistic fragmented text effects
 * - Building kinetic typography with split-screen aesthetics
 * - Adding dynamic text animations that alternate between readable and abstract
 * - Creating heat distortion or water-like text effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display with split effect'),
  duration: z.number().default(6).describe('Duration of the animation in seconds'),
  driftDistance: z.number().default(60).describe('Maximum horizontal drift distance in pixels'),
  font: z
    .string()
    .default('Didot:200')
    .optional()
    .describe('Font family with optional weight (e.g., "Didot:200", "CormorantGaramond:300")'),
  fontSize: z.number().default(80).describe('Font size in pixels'),
  textColor: z.string().default('#FFFFFF').describe('Text color (CSS color value)'),
  minOpacity: z.number().min(0).max(1).default(0.9).describe('Minimum opacity during maximum separation'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.font || 'Didot:200';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font weight
  let fontWeight = 200;
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontWeight = parseInt(fontParts[1], 10);
    }
  }

  const driftDistance = params.driftDistance ?? 60;
  const minOpacity = params.minOpacity ?? 0.9;
  const duration = params.duration ?? 6;

  // Component IDs
  const containerId = 'split-text-container';
  const topHalfId = 'top-half-text';
  const bottomHalfId = 'bottom-half-text';

  // Top half effect: translateX from 0 to -driftDistance to 0
  const topHalfEffect = {
    id: 'top-half-drift-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [topHalfId],
      ranges: [
        // TranslateX animation
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: -driftDistance, prog: 0.5 },
        { key: 'translateX', val: 0, prog: 1 },
        // Opacity animation
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: minOpacity, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Bottom half effect: translateX from 0 to driftDistance to 0
  const bottomHalfEffect = {
    id: 'bottom-half-drift-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [bottomHalfId],
      ranges: [
        // TranslateX animation
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: driftDistance, prog: 0.5 },
        { key: 'translateX', val: 0, prog: 1 },
        // Opacity animation
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: minOpacity, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Top half text component (upper 50% clipped)
  const topHalfText: RenderableComponentData = {
    id: topHalfId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'absolute inset-0 flex items-center justify-center',
      style: {
        clipPath: 'inset(0 0 50% 0)',
        willChange: 'transform, clip-path',
        fontSize: params.fontSize,
        fontWeight,
        color: params.textColor,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [topHalfEffect],
  };

  // Bottom half text component (lower 50% clipped)
  const bottomHalfText: RenderableComponentData = {
    id: bottomHalfId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'absolute inset-0 flex items-center justify-center',
      style: {
        clipPath: 'inset(50% 0 0 0)',
        willChange: 'transform, clip-path',
        fontSize: params.fontSize,
        fontWeight,
        color: params.textColor,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [bottomHalfEffect],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          willChange: 'transform, clip-path',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [topHalfText, bottomHalfText] as RenderableComponentData[],
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
  id: 'split-text-typokinetics',
  title: 'Split-Text Typokinetics',
  description:
    'A typokinetic preset where text is divided into upper and lower halves using CSS clip-path. The top half drifts left while the bottom half drifts right, creating a shearing/split-screen effect. The halves periodically realign, creating "beats" of perfect readability alternating with abstract fragmented moments - like viewing text through moving water or heat distortion. Uses Didot 200 weight for high-contrast thin serifs.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'typokinetics',
    'split-screen',
    'shearing',
    'kinetic',
    'animated',
    'clip-path',
    'drift',
    'fragmented',
    'artistic',
    'heat-distortion',
    'water-effect',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'KINETIC',
    duration: 6,
    driftDistance: 60,
    font: 'Didot:200',
    fontSize: 80,
    textColor: '#FFFFFF',
    minOpacity: 0.9,
  },
};

// Export preset
export const splitTextTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
