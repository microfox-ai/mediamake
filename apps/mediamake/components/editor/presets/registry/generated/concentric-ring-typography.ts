/**
 * Concentric Ring Typography Reveal Preset
 *
 * Data visualization inspired sunburst chart typography with concentric rings.
 * Each ring represents a sentence/category from captions, with words arranged
 * in circular paths. Features parallax rotation (outer rings slower, inner faster),
 * typewriter reveals along circular trajectories, segment highlighting with
 * color-coded gradient from warm center to cool outer rings, and subtle ambient
 * rotation for organic motion after initial reveal.
 *
 * Features:
 * - **Concentric Ring Layout**: Multiple rings with progressive sizing
 * - **Sunburst Chart Style**: Words arranged in circular paths around center
 * - **Parallax Rotation**: Inner rings spin faster, outer rings slower
 * - **Typewriter Reveals**: Words appear sequentially along circular paths
 * - **Color Gradient**: Warm center (orange) to cool outer (blue)
 * - **Ambient Rotation**: Continuous subtle rotation on outer rings
 * - **Segment Highlighting**: Related words glow together
 * - **Clinical Precision**: Data visualization aesthetic with organic motion
 *
 * Use cases:
 * - Creating data visualization style typography
 * - Building sunburst chart inspired text animations
 * - Creating circular text layouts with depth
 * - Adding parallax motion to concentric text rings
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters ---
const presetParams = z.object({
  trackId: z.string().describe('Unique ID for this preset instance'),
  captions: z
    .array(z.any())
    .describe('Array of caption sentences with timing and words'),
  maxRings: z
    .number()
    .min(1)
    .max(8)
    .default(4)
    .describe('Maximum number of concentric rings (1-8)'),
  baseRingSize: z
    .number()
    .min(64)
    .max(256)
    .default(128)
    .describe('Size of innermost ring in pixels'),
  ringSizeIncrement: z
    .number()
    .min(64)
    .max(256)
    .default(128)
    .describe('Size increase between rings in pixels'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  innerRingColor: z
    .string()
    .default('#fb923c')
    .describe('Color for innermost ring (warm, e.g., orange)'),
  outerRingColor: z
    .string()
    .default('#60a5fa')
    .describe('Color for outermost ring (cool, e.g., blue)'),
  initialRotationSpeed: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Speed multiplier for initial spin-in animation'),
  ambientRotationSpeed: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .describe('Speed of continuous ambient rotation in degrees per second'),
  wordRevealDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .describe('Duration for each word typewriter reveal in seconds'),
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Intensity of text glow/shadow (0-1)'),
  enableAmbientRotation: z
    .boolean()
    .default(true)
    .describe('Enable subtle continuous rotation on outer rings'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackId,
    captions,
    maxRings,
    baseRingSize,
    ringSizeIncrement,
    font,
    innerRingColor,
    outerRingColor,
    initialRotationSpeed,
    ambientRotationSpeed,
    wordRevealDuration,
    glowIntensity,
    enableAmbientRotation,
  } = params;

  // Parse font string
  const fontString = font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontStyle: React.CSSProperties = { fontWeight: 700 };
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10) || 700;
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10) || 700;
    }
  }

  // Helper: Interpolate color
  const interpolateColor = (
    color1: string,
    color2: string,
    factor: number,
  ): string => {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    const r1 = parseInt(hex1.substring(0, 2), 16);
    const g1 = parseInt(hex1.substring(2, 4), 16);
    const b1 = parseInt(hex1.substring(4, 6), 16);
    const r2 = parseInt(hex2.substring(0, 2), 16);
    const g2 = parseInt(hex2.substring(2, 4), 16);
    const b2 = parseInt(hex2.substring(4, 6), 16);
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  // Calculate total duration
  const totalDuration =
    captions.length > 0
      ? Math.max(
          ...(captions as TranscriptionSentence[]).map(
            (c) => c.absoluteStart + c.duration,
          ),
        )
      : 10;

  // Map sentences to rings (limit by maxRings)
  const ringsData = (captions as TranscriptionSentence[])
    .slice(0, maxRings)
    .map((caption, ringIndex) => {
      const ringSize = baseRingSize + ringIndex * ringSizeIncrement;
      const ringRadius = ringSize / 2;
      const colorFactor = ringIndex / Math.max(maxRings - 1, 1);
      const ringColor = interpolateColor(
        innerRingColor,
        outerRingColor,
        colorFactor,
      );
      const fontSize = Math.max(14 - ringIndex * 2, 10);

      // Parallax: inner rings rotate faster
      const rotationDuration = 1 + ringIndex * 0.3 * (1 / initialRotationSpeed);
      const randomStartAngle = Math.random() * 360 - 180;

      // Words for this ring
      const words = caption.words || [];
      const wordCount = words.length;

      return {
        ringIndex,
        caption,
        words,
        ringSize,
        ringRadius,
        ringColor,
        fontSize,
        rotationDuration,
        randomStartAngle,
        wordCount,
      };
    });

  // Build rings
  const ringContainers: RenderableComponentData[] = ringsData.map((ring) => {
    const {
      ringIndex,
      caption,
      words,
      ringSize,
      ringRadius,
      ringColor,
      fontSize,
      rotationDuration,
      randomStartAngle,
      wordCount,
    } = ring;

    // Build word components
    const wordComponents: RenderableComponentData[] = words.map(
      (word, wordIndex) => {
        const wordId = `${trackId}-ring${ringIndex}-word${wordIndex}`;

        // Position word along circular path
        const angleStep = 360 / Math.max(wordCount, 1);
        const angle = angleStep * wordIndex;
        const radians = (angle * Math.PI) / 180;

        // Calculate position
        const x = Math.cos(radians) * ringRadius;
        const y = Math.sin(radians) * ringRadius;

        // Word reveal effect (typewriter)
        const wordRevealEffect: GenericEffectData = {
          type: 'ease-out',
          start: word.start,
          duration: wordRevealDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        };

        return {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: `${fontSize}px`,
              color: ringColor,
              ...fontStyle,
              textShadow: `0 0 ${8 * glowIntensity}px ${ringColor}`,
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${angle + 90}deg)`,
              transformOrigin: 'center center',
              whiteSpace: 'nowrap',
            },
            font: {
              family: fontFamily,
              weights: [fontStyle.fontWeight?.toString() || '700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          effects: [
            {
              id: `${wordId}-reveal`,
              componentId: 'generic',
              data: wordRevealEffect,
            },
          ],
        } as RenderableComponentData;
      },
    );

    // Ring rotation effect (spin into view)
    const ringRotationEffect: GenericEffectData = {
      type: 'ease-out',
      start: 0,
      duration: rotationDuration,
      mode: 'provider',
      targetIds: [`${trackId}-ring${ringIndex}`],
      ranges: [
        { key: 'rotate', val: randomStartAngle, prog: 0 },
        { key: 'rotate', val: 0, prog: 1 },
      ],
    };

    // Ambient rotation effect (continuous)
    const ambientRotationEffect: GenericEffectData | null =
      enableAmbientRotation && ringIndex >= 2
        ? {
            type: 'linear',
            start: rotationDuration,
            duration: totalDuration - rotationDuration,
            mode: 'provider',
            targetIds: [`${trackId}-ring${ringIndex}`],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              {
                key: 'rotate',
                val:
                  ambientRotationSpeed * (totalDuration - rotationDuration) * 0.5,
                prog: 1,
              },
            ],
          }
        : null;

    const ringEffects = [
      {
        id: `${trackId}-ring${ringIndex}-rotation`,
        componentId: 'generic',
        data: ringRotationEffect,
      },
    ];

    if (ambientRotationEffect) {
      ringEffects.push({
        id: `${trackId}-ring${ringIndex}-ambient`,
        componentId: 'generic',
        data: ambientRotationEffect,
      });
    }

    return {
      id: `${trackId}-ring${ringIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute transform-gpu',
          style: {
            width: `${ringSize}px`,
            height: `${ringSize}px`,
            borderRadius: '50%',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      effects: ringEffects,
      childrenData: wordComponents,
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackId}-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: ringContainers,
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'concentric-ring-typography',
  title: 'Concentric Ring Typography Reveal',
  description:
    'Data visualization inspired sunburst chart typography with concentric rings. Each ring represents a sentence/category from captions, with words arranged in circular paths. Features parallax rotation (outer rings slower, inner faster), typewriter reveals along circular trajectories, segment highlighting with color-coded gradient from warm center to cool outer, and subtle ambient rotation for organic motion after initial reveal.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'captions',
    'sunburst',
    'concentric',
    'rings',
    'circular',
    'data-visualization',
    'parallax',
    'typewriter',
    'gradient',
    'ambient',
    'rotation',
  ],
  dependencies: {},
  defaultInputParams: {
    trackId: 'concentric-ring-typography-1',
    captions: [],
    maxRings: 4,
    baseRingSize: 128,
    ringSizeIncrement: 128,
    font: 'Inter:700',
    innerRingColor: '#fb923c',
    outerRingColor: '#60a5fa',
    initialRotationSpeed: 2,
    ambientRotationSpeed: 0.5,
    wordRevealDuration: 0.3,
    glowIntensity: 0.6,
    enableAmbientRotation: true,
  },
};

// --- Export ---
export const concentricRingTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
