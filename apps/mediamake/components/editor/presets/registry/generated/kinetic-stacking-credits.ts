/**
 * Kinetic Stacking Credits Preset
 *
 * A typographic kinetic preset where text lines rise from the bottom like movie credits,
 * but with modern stacking animation. Each line emerges with a subtle elastic bounce,
 * rising smoothly from below the viewport (translateY: 100vh) and settling into its
 * final position with a gentle overshoot. As new lines appear, previous lines compress
 * slightly (scale down to 0.95) and fade back (opacity to 0.7) creating a depth hierarchy.
 * The most recent line stays at full opacity and scale.
 *
 * Features:
 * - Bottom-anchored vertical stacking layout
 * - Rise animation with spring easing for organic motion
 * - Elastic bounce effect (overshoot to 1.05, settle to 1.0)
 * - Compression and fade-back for previous lines
 * - Staggered cascading timing (0.3s intervals)
 * - GPU-accelerated transforms with will-change
 * - Configurable text lines, timing, and styling
 *
 * Use cases:
 * - Movie-style end credits with modern flair
 * - Cinematic text reveals
 * - Sequential information display
 * - Story-based text animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Input parameters schema
const presetParams = z.object({
  textLines: z
    .array(z.string())
    .min(1)
    .describe('Array of text lines to display in stacking order'),
  staggerDelay: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .optional()
    .describe('Delay between each line animation in seconds (default: 0.3)'),
  riseDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .optional()
    .describe('Duration of rise animation in seconds (default: 1.2)'),
  compressionDuration: z
    .number()
    .min(0.2)
    .max(1)
    .default(0.4)
    .optional()
    .describe('Duration of compression animation in seconds (default: 0.4)'),
  fontSize: z
    .string()
    .default('clamp(24px, 4vw, 48px)')
    .optional()
    .describe('Font size (responsive clamp recommended)'),
  fontWeight: z
    .string()
    .default('600')
    .optional()
    .describe('Font weight (default: 600)'),
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (default: white)'),
  font: z
    .string()
    .default('Inter')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:600", "Roboto:700:italic")',
    ),
  compressedOpacity: z
    .number()
    .min(0.3)
    .max(1)
    .default(0.7)
    .optional()
    .describe('Opacity of compressed previous lines (default: 0.7)'),
  compressedScale: z
    .number()
    .min(0.8)
    .max(0.99)
    .default(0.95)
    .optional()
    .describe('Scale of compressed previous lines (default: 0.95)'),
  overshootScale: z
    .number()
    .min(1)
    .max(1.2)
    .default(1.05)
    .optional()
    .describe('Overshoot scale during bounce (default: 1.05)'),
  verticalSpacing: z
    .string()
    .default('0.5rem')
    .optional()
    .describe('Vertical spacing between lines (default: 0.5rem)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    textLines,
    staggerDelay = 0.3,
    riseDuration = 1.2,
    compressionDuration = 0.4,
    fontSize = 'clamp(24px, 4vw, 48px)',
    fontWeight = '600',
    textColor = '#ffffff',
    font = 'Inter',
    compressedOpacity = 0.7,
    compressedScale = 0.95,
    overshootScale = 1.05,
    verticalSpacing = '0.5rem',
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
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

  // Calculate total duration: last line start + rise duration
  const totalDuration = textLines.length * staggerDelay + riseDuration;

  // Create all line components and effects
  const lineComponents: RenderableComponentData[] = [];
  const allEffects: any[] = [];

  textLines.forEach((lineText, index) => {
    const lineId = `line-${index}`;
    const lineContainerId = `line-container-${index}`;
    const lineStartTime = index * staggerDelay;

    // Create text atom for this line
    const textAtom: RenderableComponentData = {
      id: lineId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: lineText,
        style: {
          fontSize,
          fontWeight: fontStyle.fontWeight || fontWeight,
          color: textColor,
          textAlign: 'center',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight
            ? [fontStyle.fontWeight.toString()]
            : [fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    };

    // Create container for this line
    const lineContainer: RenderableComponentData = {
      id: lineContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'w-full text-center',
          style: {
            paddingTop: verticalSpacing,
            paddingBottom: verticalSpacing,
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: [textAtom],
    };

    lineComponents.push(lineContainer);

    // Create rise animation effect for this line
    const riseEffectData: GenericEffectData = {
      type: 'spring',
      start: lineStartTime,
      duration: riseDuration,
      mode: 'provider',
      targetIds: [lineContainerId],
      ranges: [
        // Rise from bottom with spring easing
        { key: 'translateY', val: '100vh', prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
        // Fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
        // Bounce with overshoot
        { key: 'scale', val: compressedScale, prog: 0 },
        { key: 'scale', val: overshootScale, prog: 0.7 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };

    const riseEffect = {
      id: `rise-effect-${index}`,
      componentId: 'generic',
      data: riseEffectData,
    };

    allEffects.push(riseEffect);

    // Create compression effect for when next line appears
    // This compresses the current line when the next one starts rising
    if (index < textLines.length - 1) {
      const nextLineStartTime = (index + 1) * staggerDelay;

      const compressEffectData: GenericEffectData = {
        type: 'ease-out',
        start: nextLineStartTime,
        duration: compressionDuration,
        mode: 'provider',
        targetIds: [lineContainerId],
        ranges: [
          // Scale down
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: compressedScale, prog: 1 },
          // Fade back
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: compressedOpacity, prog: 1 },
        ],
      };

      const compressEffect = {
        id: `compress-effect-${index}`,
        componentId: 'generic',
        data: compressEffectData,
      };

      allEffects.push(compressEffect);
    }
  });

  // Create root container with bottom-anchored layout
  const rootContainer: RenderableComponentData = {
    id: 'kinetic-stacking-credits-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'flex flex-col justify-end items-center h-full relative overflow-hidden',
        style: {
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: lineComponents,
    effects: allEffects,
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
  id: 'kinetic-stacking-credits',
  title: 'Kinetic Stacking Credits',
  description:
    'Typographic kinetic preset where text lines rise from the bottom like movie credits with modern stacking animation. Each line emerges with elastic bounce from below viewport, settling with gentle overshoot. Previous lines compress and fade creating depth hierarchy. Uses spring easing for organic motion with staggered cascading effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'credits',
    'stacking',
    'movie',
    'bounce',
    'spring',
    'cascade',
    'rise',
    'vertical',
    'depth',
    'hierarchy',
  ],
  dependencies: {},
  defaultInputParams: {
    textLines: [
      'First line rises',
      'Second line appears',
      'Third line follows',
      'Building the tower',
      'Each line compresses previous',
    ],
    staggerDelay: 0.3,
    riseDuration: 1.2,
    compressionDuration: 0.4,
    fontSize: 'clamp(24px, 4vw, 48px)',
    fontWeight: '600',
    textColor: '#ffffff',
    font: 'Inter:600',
    compressedOpacity: 0.7,
    compressedScale: 0.95,
    overshootScale: 1.05,
    verticalSpacing: '0.5rem',
  },
};

// Export preset
export const kineticStackingCreditsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
