/**
 * Sports Racing Track Text Animation Preset
 *
 * ESPN-style kinetic typography where words sprint along a curved racing track with
 * acceleration/braking zones, banking rotations, motion blur, speed lines, stadium light
 * flares, and camera shake on impacts. Features dynamic curved path animations with
 * variable speed physics.
 *
 * Features:
 * - Racing track path animation with straight segments and curved sections
 * - Variable speed physics (fast on straights, slow on curves)
 * - Banking rotation up to 25deg in curves (motorcycle-style lean)
 * - Motion blur from 0 to 8px based on velocity
 * - Dynamic speed lines with opacity fades
 * - Stadium light flares that track with text
 * - Camera shake on impactful moments
 * - Radial gradient background (gray-900 via gray-800 to black)
 *
 * Use cases:
 * - High-energy sports content
 * - Dynamic title sequences
 * - Kinetic typography for ESPN-style broadcasts
 * - Racing-themed text animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================
// PARAMETERS SCHEMA
// ============================================================

const presetParams = z.object({
  words: z
    .array(z.string())
    .default(['SPRINT', 'ACCELERATE', 'VICTORY'])
    .describe('Array of words to animate along the racing track'),
  wordDuration: z
    .number()
    .default(2.5)
    .describe('Duration for each word animation in seconds'),
  fontSize: z
    .string()
    .default('8xl')
    .describe('Tailwind font size class (e.g., "8xl", "7xl", "6xl")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the text (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .default('black')
    .describe('Font weight (e.g., "black", "bold", "extrabold")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color in hex or CSS color format'),
  textShadow: z
    .string()
    .default('0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,0,0,0.3)')
    .describe('Text shadow CSS value for glow effect'),
  speedLineCount: z
    .number()
    .default(3)
    .describe('Number of speed lines to generate'),
  cameraShake: z
    .boolean()
    .default(true)
    .describe('Enable camera shake on impactful moments'),
  lightFlares: z
    .boolean()
    .default(true)
    .describe('Enable stadium light flares that track with text'),
  motionBlur: z
    .boolean()
    .default(true)
    .describe('Enable motion blur during acceleration'),
});

// ============================================================
// PRESET EXECUTION
// ============================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    words,
    wordDuration,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    textShadow,
    speedLineCount,
    cameraShake,
    lightFlares,
    motionBlur,
  } = params;

  const totalDuration = words.length * wordDuration;

  // Helper: Create speed line HTML
  const createSpeedLineHTML = (
    index: number,
    totalLines: number,
  ): string => {
    const topPercent = 20 + (index * 40) / (totalLines - 1 || 1);
    const width = 250 + index * 50;
    const opacity = 0.2 + index * 0.05;
    const height = 2;

    return `<div style="position: absolute; top: ${topPercent}%; left: -100%; width: ${width}px; height: ${height}px; background: linear-gradient(90deg, transparent, rgba(255,255,255,${opacity}), transparent);"></div>`;
  };

  // Helper: Create light flare HTML
  const createLightFlareHTML = (
    size: number,
    color: string,
    opacity: number,
  ): string => {
    return `<div style="position: absolute; top: 50%; left: 50%; width: ${size}px; height: ${size}px; border-radius: 50%; background: radial-gradient(circle, ${color}, transparent); mix-blend-mode: screen; transform: translate(-50%, -50%); opacity: ${opacity};"></div>`;
  };

  // Generate speed line components
  const speedLineComponents: RenderableComponentData[] = [];
  for (let i = 0; i < speedLineCount; i++) {
    const speedLineId = `speed-line-${i}`;
    speedLineComponents.push({
      id: speedLineId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: createSpeedLineHTML(i, speedLineCount),
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: `${speedLineId}-animation`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: totalDuration,
            mode: 'provider',
            targetIds: [speedLineId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 180 + i * 20, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6 - i * 0.1, prog: 0.15 + i * 0.05 },
              { key: 'opacity', val: 0.6 - i * 0.1, prog: 0.85 - i * 0.05 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Generate word components with racing track animations
  const wordComponents: RenderableComponentData[] = [];
  words.forEach((word, index) => {
    const wordId = `word-${index}`;
    const start = index * wordDuration;
    const lightFlareId = lightFlares ? `light-flare-${index}` : '';

    // Track animation keyframes (varying paths and speeds)
    const animationType = index % 3;
    let wordEffect;

    if (animationType === 0) {
      // Straight acceleration: fast horizontal movement
      wordEffect = {
        id: `${wordId}-track-animation`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.45, 0, 0.55, 1)',
          start: 0,
          duration: wordDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'translateX', val: -400, prog: 0 },
            { key: 'translateX', val: 0, prog: 0.4 },
            { key: 'translateX', val: 400, prog: 1 },
            { key: 'rotate', val: -15, prog: 0 },
            { key: 'rotate', val: 0, prog: 0.4 },
            { key: 'rotate', val: 15, prog: 1 },
            ...(motionBlur
              ? [
                  { key: 'filter', val: 'blur(8px)', prog: 0 },
                  { key: 'filter', val: 'blur(0px)', prog: 0.3 },
                  { key: 'filter', val: 'blur(8px)', prog: 1 },
                ]
              : []),
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      };
    } else if (animationType === 1) {
      // Curved section: explosive launch with banking
      wordEffect = {
        id: `${wordId}-track-animation`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          start: 0,
          duration: wordDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'translateX', val: -500, prog: 0 },
            { key: 'translateX', val: 0, prog: 0.5 },
            { key: 'translateX', val: 500, prog: 1 },
            { key: 'translateY', val: 100, prog: 0 },
            { key: 'translateY', val: 0, prog: 0.5 },
            { key: 'translateY', val: -100, prog: 1 },
            { key: 'rotate', val: -25, prog: 0 },
            { key: 'rotate', val: 0, prog: 0.5 },
            { key: 'rotate', val: 25, prog: 1 },
            ...(motionBlur
              ? [
                  { key: 'filter', val: 'blur(8px)', prog: 0 },
                  { key: 'filter', val: 'blur(0px)', prog: 0.4 },
                  { key: 'filter', val: 'blur(8px)', prog: 1 },
                ]
              : []),
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      };
    } else {
      // Victory lap: scale up with rotation
      wordEffect = {
        id: `${wordId}-track-animation`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.45, 0, 0.55, 1)',
          start: 0,
          duration: wordDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'translateX', val: -600, prog: 0 },
            { key: 'translateX', val: 0, prog: 0.35 },
            { key: 'translateX', val: 600, prog: 1 },
            { key: 'translateY', val: -150, prog: 0 },
            { key: 'translateY', val: 0, prog: 0.35 },
            { key: 'translateY', val: 150, prog: 1 },
            { key: 'rotate', val: 20, prog: 0 },
            { key: 'rotate', val: 0, prog: 0.35 },
            { key: 'rotate', val: -20, prog: 1 },
            ...(motionBlur
              ? [
                  { key: 'filter', val: 'blur(8px)', prog: 0 },
                  { key: 'filter', val: 'blur(0px)', prog: 0.25 },
                  { key: 'filter', val: 'blur(8px)', prog: 1 },
                ]
              : []),
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 1, prog: 0.35 },
            { key: 'scale', val: 1.2, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.15 },
            { key: 'opacity', val: 1, prog: 0.85 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      };
    }

    wordComponents.push({
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        className: `font-${fontWeight} uppercase tracking-wider text-${fontSize}`,
        style: {
          color: textColor,
          textShadow: textShadow,
        },
        font: {
          family: fontFamily,
          weights: ['900'],
        },
      },
      context: {
        timing: {
          start,
          duration: wordDuration,
        },
      },
      effects: [wordEffect],
    } as RenderableComponentData);

    // Add light flare if enabled
    if (lightFlares) {
      const flareSize = 100 + index * 25;
      const flareColors = [
        'rgba(255,255,255,0.8)',
        'rgba(255,200,0,0.6)',
        'rgba(255,0,0,0.7)',
      ];
      const flareColor = flareColors[index % flareColors.length];

      wordComponents.push({
        id: lightFlareId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: createLightFlareHTML(flareSize, flareColor, 0.8),
        },
        context: {
          timing: {
            start,
            duration: wordDuration,
          },
        },
        effects: [
          {
            id: `${lightFlareId}-tracking`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: wordDuration,
              mode: 'provider',
              targetIds: [lightFlareId],
              ranges:
                animationType === 0
                  ? [
                      { key: 'translateX', val: -400, prog: 0 },
                      { key: 'translateX', val: 0, prog: 0.4 },
                      { key: 'translateX', val: 400, prog: 1 },
                      { key: 'scale', val: 0.5, prog: 0 },
                      { key: 'scale', val: 1.5, prog: 0.5 },
                      { key: 'scale', val: 0.5, prog: 1 },
                      { key: 'opacity', val: 0, prog: 0 },
                      { key: 'opacity', val: 0.8, prog: 0.3 },
                      { key: 'opacity', val: 0, prog: 1 },
                    ]
                  : animationType === 1
                    ? [
                        { key: 'translateX', val: -500, prog: 0 },
                        { key: 'translateX', val: 0, prog: 0.5 },
                        { key: 'translateX', val: 500, prog: 1 },
                        { key: 'translateY', val: 100, prog: 0 },
                        { key: 'translateY', val: 0, prog: 0.5 },
                        { key: 'translateY', val: -100, prog: 1 },
                        { key: 'scale', val: 0.7, prog: 0 },
                        { key: 'scale', val: 1.8, prog: 0.5 },
                        { key: 'scale', val: 0.7, prog: 1 },
                        { key: 'opacity', val: 0, prog: 0 },
                        { key: 'opacity', val: 0.6, prog: 0.3 },
                        { key: 'opacity', val: 0, prog: 1 },
                      ]
                    : [
                        { key: 'translateX', val: -600, prog: 0 },
                        { key: 'translateX', val: 0, prog: 0.35 },
                        { key: 'translateX', val: 600, prog: 1 },
                        { key: 'translateY', val: -150, prog: 0 },
                        { key: 'translateY', val: 0, prog: 0.35 },
                        { key: 'translateY', val: 150, prog: 1 },
                        { key: 'scale', val: 0.6, prog: 0 },
                        { key: 'scale', val: 2, prog: 0.4 },
                        { key: 'scale', val: 0.6, prog: 1 },
                        { key: 'opacity', val: 0, prog: 0 },
                        { key: 'opacity', val: 0.7, prog: 0.25 },
                        { key: 'opacity', val: 0, prog: 1 },
                      ],
            },
          },
        ],
      } as RenderableComponentData);
    }
  });

  // Speed line layer container
  const speedLinesLayer: RenderableComponentData = {
    id: 'speed-lines-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: speedLineComponents,
  };

  // Text track container
  const textTrackContainer: RenderableComponentData = {
    id: 'text-track-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordComponents,
  };

  // Root container with optional camera shake
  const rootContainer: RenderableComponentData = {
    id: 'racing-track-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          background:
            'radial-gradient(circle at center, #111827 0%, #1f2937 50%, #000000 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: cameraShake
      ? [
          {
            id: 'camera-shake-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: totalDuration,
              mode: 'provider',
              targetIds: ['racing-track-root'],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: 5, prog: 0.1 },
                { key: 'translateX', val: -5, prog: 0.12 },
                { key: 'translateX', val: 0, prog: 0.14 },
                { key: 'translateX', val: 8, prog: 0.35 },
                { key: 'translateX', val: -8, prog: 0.37 },
                { key: 'translateX', val: 0, prog: 0.39 },
                { key: 'translateX', val: 10, prog: 0.6 },
                { key: 'translateX', val: -10, prog: 0.62 },
                { key: 'translateX', val: 0, prog: 0.64 },
              ],
            },
          },
        ]
      : [],
    childrenData: [speedLinesLayer, textTrackContainer],
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

// ============================================================
// METADATA
// ============================================================

const presetMetadata: PresetMetadata = {
  id: 'sports-racing-track-text',
  title: 'Sports Racing Track Text Animation',
  description:
    'ESPN-style kinetic typography where words sprint along a curved racing track with acceleration/braking zones, banking rotations, motion blur, speed lines, stadium light flares, and camera shake on impacts. Features dynamic curved path animations with variable speed physics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'kinetic',
    'sports',
    'racing',
    'espn',
    'motion',
    'blur',
    'speed',
    'track',
    'dynamic',
  ],
  dependencies: {},
  defaultInputParams: {
    words: ['SPRINT', 'ACCELERATE', 'VICTORY'],
    wordDuration: 2.5,
    fontSize: '8xl',
    fontFamily: 'Inter',
    fontWeight: 'black',
    textColor: '#FFFFFF',
    textShadow: '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,0,0,0.3)',
    speedLineCount: 3,
    cameraShake: true,
    lightFlares: true,
    motionBlur: true,
  },
};

// ============================================================
// EXPORT
// ============================================================

export const sportsRacingTrackTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};