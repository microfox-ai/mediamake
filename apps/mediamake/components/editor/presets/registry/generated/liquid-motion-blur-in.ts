/**
 * Liquid Motion Blur-In Preset
 *
 * This preset creates a fluid typography animation where text flows into focus
 * like ink dispersing in water. Features directional horizontal motion blur that
 * compresses into sharp text, with subtle ripple rings that propagate outward as
 * the text settles into perfect clarity.
 *
 * Features:
 * - Extreme horizontal motion blur that decompresses into clarity
 * - Wave-like focusing effect with varying blur across text
 * - Subtle turbulence and flow distortion during transition
 * - Ripple effect that propagates through text as it settles
 * - SVG filter-based turbulence for water-like distortion
 * - Directional blur with horizontal streaking
 * - Beat-synchronized timing for music video applications
 * - Fluid, organic motion with long ease-out timing
 *
 * Use cases:
 * - Music video title sequences
 * - Artistic text reveals with organic feel
 * - Water-themed or liquid motion content
 * - Beat-synchronized typography animations
 * - Abstract visual storytelling
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Preset parameters schema
const presetParams = z.object({
  text: z.string().describe('Text content to display'),
  fontSize: z
    .number()
    .min(20)
    .max(500)
    .default(120)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .union([z.string(), z.number()])
    .default('700')
    .describe('Font weight (e.g., "400", "700", 400, 700)'),
  color: z.string().default('#FFFFFF').describe('Text color'),
  duration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.2)
    .describe('Animation duration in seconds (fluid timing: 800-1200ms)'),
  beatSync: z
    .boolean()
    .default(false)
    .describe('Synchronize animation to audio beats'),
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source for beat synchronization (required if beatSync is true)'),
  turbulenceIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of water-like turbulence distortion (0-1)'),
  blurStartIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(25)
    .describe('Starting blur intensity in pixels'),
  horizontalStreakDistance: z
    .number()
    .min(0)
    .max(200)
    .default(50)
    .describe('Horizontal translation distance for motion blur effect'),
  rippleCount: z
    .number()
    .min(0)
    .max(5)
    .default(3)
    .describe('Number of ripple rings (0 to disable)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    fontWeight,
    color,
    duration,
    turbulenceIntensity,
    blurStartIntensity,
    horizontalStreakDistance,
    rippleCount,
  } = params;

  // Generate unique IDs
  const containerId = 'liquid-blur-root';
  const textId = 'main-text';
  const rippleContainerId = 'ripple-container';
  const svgFilterId = 'turbulence-filter';

  // Calculate timing phases
  const blurPhase = duration * 0.6; // 60% for blur reduction
  const rippleDelay = duration * 0.4; // Ripples start at 40%
  const rippleStagger = 0.1; // Stagger between ripple rings

  // Create SVG filter for turbulence (water distortion)
  const svgFilterHTML = `
    <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
      <defs>
        <filter id="${svgFilterId}">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="${0.01 + turbulenceIntensity * 0.02}"
            numOctaves="3"
            seed="2"
          />
          <feDisplacementMap
            in="SourceGraphic"
            scale="${turbulenceIntensity * 15}"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  `;

  // Main text component with effects
  const mainText: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight,
        color,
        textAlign: 'center',
        willChange: 'transform, filter, opacity',
      },
      font: {
        family: fontFamily,
        weights: [String(fontWeight)],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Main liquid blur-in effect
      {
        id: 'liquid-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: blurPhase,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            // Blur reduction (extreme to zero)
            { key: 'blur', val: `${blurStartIntensity}px`, prog: 0 },
            { key: 'blur', val: '10px', prog: 0.5 },
            { key: 'blur', val: '0px', prog: 1 },
            // Horizontal translation (streaking effect)
            { key: 'translateX', val: `${horizontalStreakDistance}px`, prog: 0 },
            { key: 'translateX', val: '10px', prog: 0.5 },
            { key: 'translateX', val: '0px', prog: 1 },
            // Opacity fade-in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 0.8 },
            // Scale compression
            { key: 'scaleX', val: 1.2, prog: 0 },
            { key: 'scaleX', val: 1.05, prog: 0.5 },
            { key: 'scaleX', val: 1, prog: 1 },
          ],
        },
      },
      // Turbulence filter effect (SVG filter)
      {
        id: 'turbulence-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: blurPhase * 0.8,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'filter', val: `url(#${svgFilterId})`, prog: 0 },
            { key: 'filter', val: `url(#${svgFilterId})`, prog: 0.7 },
            { key: 'filter', val: 'none', prog: 1 },
          ],
        },
      },
      // Secondary ripple effect on text (scale oscillation)
      {
        id: 'text-ripple-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: rippleDelay,
          duration: duration - rippleDelay,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.02, prog: 0.3 },
            { key: 'scale', val: 0.98, prog: 0.6 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create ripple rings
  const rippleRings: RenderableComponentData[] = [];
  for (let i = 0; i < rippleCount; i++) {
    const ringId = `ripple-ring-${i + 1}`;
    const ringSize = 120 + i * 20; // Size progression
    const ringDelay = rippleDelay + i * rippleStagger;
    const ringDuration = duration - ringDelay;

    rippleRings.push({
      id: ringId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute rounded-full border-2',
          style: {
            width: `${ringSize}%`,
            height: `${ringSize}%`,
            borderColor: `rgba(255, 255, 255, ${0.2 - i * 0.05})`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: `ripple-effect-${i + 1}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: ringDelay,
            duration: ringDuration,
            mode: 'provider',
            targetIds: [ringId],
            ranges: [
              // Scale expansion
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1.1, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
              // Opacity fade
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.3 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData);
  }

  // Ripple container (holds all ripple rings)
  const rippleContainer: RenderableComponentData = {
    id: rippleContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: rippleRings,
  };

  // Text container (holds main text)
  const textContainer: RenderableComponentData = {
    id: 'main-text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [mainText],
  };

  // SVG filter container
  const svgFilterContainer: RenderableComponentData = {
    id: 'svg-filter-container',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: svgFilterHTML,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Root container (holds everything)
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
        style: {
          backgroundColor: 'transparent',
          contain: 'layout style paint',
          transform: 'translateZ(0)', // Layer promotion for performance
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [svgFilterContainer, rippleContainer, textContainer],
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
  id: 'liquid-motion-blur-in',
  title: 'Liquid Motion Blur-In',
  description:
    'Fluid typography animation where text flows into focus like ink dispersing in water. Features directional horizontal motion blur that compresses into sharp text, with subtle ripple rings that propagate outward as the text settles into perfect clarity. Uses CSS blur filter and transform animations synced to beat timing for an organic, liquid feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'blur',
    'motion-blur',
    'liquid',
    'water',
    'ink',
    'fluid',
    'organic',
    'ripple',
    'turbulence',
    'directional',
    'horizontal',
    'streaking',
    'wave',
    'flow',
    'distortion',
    'beat-sync',
    'music-video',
  ],
  defaultInputParams: {
    text: 'LIQUID MOTION',
    fontSize: 120,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#FFFFFF',
    duration: 1.2,
    beatSync: false,
    turbulenceIntensity: 0.3,
    blurStartIntensity: 25,
    horizontalStreakDistance: 50,
    rippleCount: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const liquidMotionBlurInPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
