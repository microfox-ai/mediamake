/**
 * Typokinetics Ribbon Flow Preset
 *
 * This preset creates elegant serif typography that flows like silk ribbons being unfurled
 * across the screen. Each line of text reveals as a ribbon extends with graceful arcs,
 * flowing curves, and subtle 3D perspective transforms. Features shimmer effects that
 * travel along text as it reveals, suggesting the play of light on silk fabric.
 *
 * Features:
 * - **Ribbon Unfurl Animation**: Text reveals like ribbons unrolling from left to right
 * - **3D Perspective Transform**: Text twists in 3D space as it flows (rotateY animation)
 * - **Shimmer Effect**: Light travels along text during reveal
 * - **Serif Typography**: Uses refined serif fonts (Libre Baskerville, Source Serif Pro)
 * - **Staggered Lines**: Multiple lines unfurl sequentially with elegant timing
 * - **Clip-path Reveal**: Smooth polygon-based reveal for ribbon effect
 *
 * Use cases:
 * - Creating elegant title sequences
 * - Building sophisticated typography animations
 * - Adding ribbon-like text effects
 * - Creating flowing text reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Zod Parameter Schema ---

const presetParams = z.object({
  lines: z
    .array(
      z.object({
        text: z.string().describe('Text content for this line'),
        font: z
          .string()
          .optional()
          .describe(
            'Font family with optional weight and style (e.g., "Libre Baskerville:700", "Source Serif Pro:600")',
          ),
      }),
    )
    .min(1)
    .describe('Array of text lines to display with ribbon effect'),

  fontSize: z
    .number()
    .default(64)
    .describe('Font size in pixels for all text lines'),

  textColor: z
    .string()
    .default('#1a1a1a')
    .describe('Text color (CSS color value)'),

  lineSpacing: z
    .number()
    .default(20)
    .describe('Vertical spacing between lines in pixels'),

  revealDuration: z
    .number()
    .default(2)
    .describe('Duration of ribbon reveal animation per line (seconds)'),

  staggerDelay: z
    .number()
    .default(0.4)
    .describe('Delay between each line starting to reveal (seconds)'),

  shimmerDelay: z
    .number()
    .default(0.3)
    .describe('Delay before shimmer effect starts (seconds)'),

  shimmerDuration: z
    .number()
    .default(1.8)
    .describe('Duration of shimmer effect (seconds)'),

  rotateIntensity: z
    .number()
    .default(45)
    .describe('Initial rotation angle in degrees for 3D effect'),

  translateDistance: z
    .number()
    .default(100)
    .describe('Horizontal translation distance in pixels for ribbon entry'),
});

// --- Preset Execution Function ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    lines,
    fontSize,
    textColor,
    lineSpacing,
    revealDuration,
    staggerDelay,
    shimmerDelay,
    shimmerDuration,
    rotateIntensity,
    translateDistance,
  } = params;

  // Helper function: Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string | undefined) => {
    if (!fontString) {
      return {
        family: 'Libre Baskerville',
        weight: 700,
        style: 'normal' as const,
      };
    }

    const parts = fontString.split(':');
    const family = parts[0];
    const weight = parts.length > 1 ? parseInt(parts[1], 10) : 400;
    const style = parts.length > 2 ? (parts[2] as 'normal' | 'italic') : 'normal';

    return { family, weight, style };
  };

  // Build line containers with text and effects
  const lineContainers: RenderableComponentData[] = [];

  lines.forEach((line, index) => {
    const lineStartTime = index * staggerDelay;
    const fontConfig = parseFontString(line.font);

    const lineId = `line-${index}`;
    const textId = `text-${index}`;
    const shimmerId = `shimmer-${index}`;
    const containerEffectId = `container-effect-${index}`;
    const textEffectId = `text-effect-${index}`;
    const shimmerEffectId = `shimmer-effect-${index}`;

    // Create line container
    const lineContainer: RenderableComponentData = {
      id: lineId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative w-full transform-gpu',
          style: {
            transformStyle: 'preserve-3d',
            willChange: 'transform, clip-path',
            marginBottom: index < lines.length - 1 ? `${lineSpacing}px` : undefined,
          },
        },
      },
      context: {
        timing: {
          start: lineStartTime,
          duration: revealDuration + shimmerDuration,
        },
      },
      effects: [
        // 3D rotation and translation effect on container
        {
          id: containerEffectId,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: revealDuration,
            mode: 'provider',
            targetIds: [lineId],
            ranges: [
              { key: 'rotateY', val: rotateIntensity, prog: 0 },
              { key: 'rotateY', val: 0, prog: 1 },
              { key: 'translateX', val: -translateDistance, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        // Text atom
        {
          id: textId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: line.text,
            className: 'text-center transform-gpu',
            style: {
              fontSize: `${fontSize}px`,
              fontWeight: fontConfig.weight,
              fontStyle: fontConfig.style,
              color: textColor,
              letterSpacing: '0.02em',
              clipPath: 'polygon(0 0, 0% 0, 0% 100%, 0 100%)',
            },
            font: {
              family: fontConfig.family,
              weights: [fontConfig.weight.toString()],
              subsets: ['latin'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: revealDuration + shimmerDuration,
            },
          },
          effects: [
            // Clip-path reveal effect on text
            {
              id: textEffectId,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: revealDuration,
                mode: 'provider',
                targetIds: [textId],
                ranges: [
                  {
                    key: 'clipPath',
                    val: 'polygon(0 0, 0% 0, 0% 100%, 0 100%)',
                    prog: 0,
                  },
                  {
                    key: 'clipPath',
                    val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                    prog: 1,
                  },
                ],
              },
            },
          ],
        },
        // Shimmer overlay
        {
          id: shimmerId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; inset: 0; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%); mix-blend-mode: overlay; pointer-events: none;"></div>`,
            className: 'absolute inset-0',
            style: {
              willChange: 'transform',
              transform: 'translateX(-200%)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: revealDuration + shimmerDuration,
            },
          },
          effects: [
            // Shimmer movement effect
            {
              id: shimmerEffectId,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: shimmerDelay,
                duration: shimmerDuration,
                mode: 'provider',
                targetIds: [shimmerId],
                ranges: [
                  { key: 'translateX', val: -200, prog: 0 },
                  { key: 'translateX', val: 200, prog: 1 },
                ],
              },
            },
          ],
        },
      ],
    };

    lineContainers.push(lineContainer);
  });

  // Calculate total duration (last line start + reveal + shimmer)
  const totalDuration =
    (lines.length - 1) * staggerDelay + revealDuration + shimmerDuration;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-ribbon-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex flex-col items-center justify-center',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: lineContainers,
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'typokineticsRibbon',
  title: 'Typokinetics Ribbon Flow',
  description:
    'Elegant serif typography that flows like silk ribbons being unfurled across the screen. Each line of text reveals as a ribbon extends with graceful arcs, flowing curves, and subtle 3D perspective transforms. Features shimmer effects that travel along text as it reveals, suggesting the play of light on silk fabric. Uses refined serif fonts like Libre Baskerville or Source Serif Pro with strong contrast between thick and thin strokes.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'ribbon',
    'flow',
    'serif',
    'elegant',
    '3d',
    'shimmer',
    'perspective',
    'animated-text',
    'reveal',
  ],
  dependencies: {},
  defaultInputParams: {
    lines: [
      { text: 'Graceful Typography', font: 'Libre Baskerville:700' },
      { text: 'Flows Like Silk', font: 'Source Serif Pro:600' },
      { text: 'Ribbon Gymnastics', font: 'Libre Baskerville:700' },
    ],
    fontSize: 64,
    textColor: '#1a1a1a',
    lineSpacing: 20,
    revealDuration: 2,
    staggerDelay: 0.4,
    shimmerDelay: 0.3,
    shimmerDuration: 1.8,
    rotateIntensity: 45,
    translateDistance: 100,
  },
};

// --- Export Preset ---

export const typokineticsRibbonPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
