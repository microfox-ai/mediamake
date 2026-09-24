/**
 * Elastic Stretch Text Animation Preset
 *
 * This preset creates a text animation where text begins compressed and stretches horizontally
 * like elastic being pulled, overshooting the target before snapping back to natural spacing
 * with a satisfying elastic bounce. The animation feels tactile and physical, as if the text
 * has actual weight and elasticity. Includes subtle skewing during the stretch phase to enhance
 * the elastic feeling. Perfect for playful brands or children's content. Includes optional 
 * 'boing' sound effect at the snap-back moment.
 *
 * Features:
 * - Multi-phase animation: compress → stretch/overshoot → snap back → settle
 * - Letter spacing animation: -0.3em → 0.1em → -0.05em → 0em
 * - Skew effects during stretch: 0 → 5deg → -3deg → 0deg
 * - Scale effects: 1 → 1.1 → 0.95 → 1
 * - Optional audio 'boing' sound effect at snap-back moment
 * - Composite layers with translateZ(0) for performance
 * - Custom elastic easing with cubic-bezier
 *
 * Use cases:
 * - Playful brand introductions
 * - Children's content titles
 * - Fun product announcements
 * - Casual social media content
 * - Game UI text animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  text: z.string().describe('Text to animate with elastic stretch effect'),
  fontSize: z
    .string()
    .optional()
    .default('72px')
    .describe('Font size for the text (e.g., "72px", "48px")'),
  fontWeight: z
    .string()
    .optional()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  color: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Text color (e.g., "#ffffff", "rgb(255,255,255)")'),
  fontFamily: z
    .string()
    .optional()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  duration: z
    .number()
    .min(1)
    .max(3)
    .optional()
    .default(1.6)
    .describe('Total animation duration in seconds (1.4-1.8 recommended)'),
  enableSound: z
    .boolean()
    .optional()
    .default(false)
    .describe('Enable optional "boing" sound effect at snap-back moment'),
  boingSoundSrc: z
    .string()
    .optional()
    .describe(
      'URL or path to boing sound effect audio file (required if enableSound is true)',
    ),
  boingSoundVolume: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.8)
    .describe('Volume level for boing sound effect (0-1)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize = '72px',
    fontWeight = '700',
    color = '#ffffff',
    fontFamily = 'Inter',
    duration = 1.6,
    enableSound = false,
    boingSoundSrc,
    boingSoundVolume = 0.8,
  } = params;

  // Calculate phase timings
  const phase1Duration = 0.8; // Compress to stretch/overshoot
  const phase2Duration = 0.2; // Snap back
  const phase3Duration = duration - phase1Duration - phase2Duration; // Settle

  const phase2Start = phase1Duration;
  const phase3Start = phase1Duration + phase2Duration;

  // IDs
  const containerID = 'elastic-root-container';
  const wrapperID = 'transform-wrapper';
  const textID = 'text-element';
  const audioID = 'audio-boing';

  // Build children data
  const childrenData: RenderableComponentData[] = [];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerID,
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
        id: wrapperID,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            style: {
              display: 'inline-block',
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden',
              willChange: 'transform',
              transform: 'translateZ(0)',
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
          {
            id: textID,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: text,
              style: {
                fontSize: fontSize,
                fontWeight: fontWeight,
                color: color,
                textAlign: 'center',
                display: 'inline-block',
                whiteSpace: 'nowrap',
              },
              font: {
                family: fontFamily,
                weights: [fontWeight],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            effects: [
              // Letter spacing effect (Phase 1, 2, 3)
              {
                id: 'letter-spacing-effect',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: duration,
                  mode: 'provider',
                  targetIds: [textID],
                  ranges: [
                    // Phase 1: -0.3em to 0.15em (overshoot)
                    { key: 'letterSpacing', val: '-0.3em', prog: 0 },
                    {
                      key: 'letterSpacing',
                      val: '0.15em',
                      prog: phase1Duration / duration,
                    },
                    // Phase 2: snap back to -0.05em
                    {
                      key: 'letterSpacing',
                      val: '-0.05em',
                      prog: phase2Start / duration,
                    },
                    {
                      key: 'letterSpacing',
                      val: '-0.05em',
                      prog: (phase2Start + phase2Duration) / duration,
                    },
                    // Phase 3: settle to 0em
                    { key: 'letterSpacing', val: '0em', prog: 1 },
                  ],
                },
              },
              // SkewX effect (Phase 1, 2, 3)
              {
                id: 'skew-effect',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: duration,
                  mode: 'provider',
                  targetIds: [textID],
                  ranges: [
                    // Phase 1: 0 to 5deg
                    { key: 'skewX', val: 0, prog: 0 },
                    { key: 'skewX', val: 5, prog: phase1Duration / duration },
                    // Phase 2: snap to -3deg
                    { key: 'skewX', val: -3, prog: phase2Start / duration },
                    {
                      key: 'skewX',
                      val: -3,
                      prog: (phase2Start + phase2Duration) / duration,
                    },
                    // Phase 3: settle to 0deg
                    { key: 'skewX', val: 0, prog: 1 },
                  ],
                },
              },
              // ScaleX effect (Phase 1, 2, 3)
              {
                id: 'scale-effect',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: duration,
                  mode: 'provider',
                  targetIds: [textID],
                  ranges: [
                    // Phase 1: 1 to 1.1
                    { key: 'scaleX', val: 1, prog: 0 },
                    { key: 'scaleX', val: 1.1, prog: phase1Duration / duration },
                    // Phase 2: snap to 0.95
                    { key: 'scaleX', val: 0.95, prog: phase2Start / duration },
                    {
                      key: 'scaleX',
                      val: 0.95,
                      prog: (phase2Start + phase2Duration) / duration,
                    },
                    // Phase 3: settle to 1
                    { key: 'scaleX', val: 1, prog: 1 },
                  ],
                },
              },
            ],
          },
        ],
        effects: [],
      },
    ],
    effects: [],
  };

  childrenData.push(rootContainer);

  // Optional audio boing sound
  if (enableSound && boingSoundSrc) {
    const audioComponent: RenderableComponentData = {
      id: audioID,
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: boingSoundSrc,
        volume: boingSoundVolume,
        startFrom: 0,
      },
      context: {
        timing: {
          start: phase2Start, // Start at snap-back moment (phase 2)
          duration: 0.5, // Short duration for sound effect
        },
      },
      effects: [],
    };

    childrenData.push(audioComponent);
  }

  return {
    output: {
      childrenData: childrenData as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'elastic-stretch-text',
  title: 'Elastic Stretch Text Animation',
  description:
    'Text animation where text begins compressed and stretches horizontally like elastic being pulled, overshooting the target before snapping back to natural spacing with a satisfying elastic bounce. Includes optional "boing" sound effect at snap-back moment. Perfect for playful brands or children\'s content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'elastic',
    'stretch',
    'bounce',
    'playful',
    'children',
    'typography',
    'kinetic',
    'fun',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'ELASTIC!',
    fontSize: '72px',
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Inter',
    duration: 1.6,
    enableSound: false,
    boingSoundVolume: 0.8,
  },
};

// Export preset
export const elasticStretchTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
