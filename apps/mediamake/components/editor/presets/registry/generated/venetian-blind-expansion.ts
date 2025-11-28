/**
 * Venetian Blind Expansion Preset
 *
 * Creates a 3D venetian blind opening effect where horizontal slats rotate and expand from the center line outward.
 * Each slat starts as a thin line at the center (50% position), then rotates along its X-axis while simultaneously
 * moving to its final vertical position. The rotation creates a 3D flip effect that adds depth and sophistication.
 *
 * Features:
 * - 12 horizontal slats that expand from center outward
 * - 3D rotateX transformation (90deg to 0deg) for flip effect
 * - Simultaneous translateY movement from center to final position
 * - ScaleY expansion from thin line (0.1) to full height (1)
 * - Cascading animation based on distance from center
 * - Subtle light leak effects between slats during animation
 * - Center-to-edge stagger timing (slats closer to center animate first)
 * - GPU-accelerated transforms with perspective
 *
 * Technical Implementation:
 * - Parent container with perspective: 1000px for 3D depth
 * - 12 slat BaseLayouts positioned at 8.33% intervals
 * - Each slat uses rotateX, translateY, scaleY, and opacity transforms
 * - Stagger timing calculated as Math.abs(index - 5.5) * 100ms
 * - Light leaks positioned between slats with opacity pulses
 * - 2s total animation with 600ms per slat, 1.6s cascade time
 *
 * Use cases:
 * - Reveal transitions that mimic opening window blinds
 * - Sophisticated 3D entrance effects
 * - Revealing content with mechanical precision
 * - Video transitions with architectural feel
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  slatCount: z
    .number()
    .int()
    .min(8)
    .max(16)
    .default(12)
    .describe('Number of horizontal slats (8-16)'),
  animationDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Total animation duration in seconds'),
  slatAnimationDuration: z
    .number()
    .min(0.3)
    .max(1.5)
    .default(0.6)
    .describe('Duration for each individual slat animation in seconds'),
  staggerDelay: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.1)
    .describe('Delay between slat animations in seconds (cascade speed)'),
  perspective: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .describe('3D perspective value in pixels for depth effect'),
  initialRotation: z
    .number()
    .min(60)
    .max(120)
    .default(90)
    .describe('Initial rotateX angle in degrees (90 = edge-on view)'),
  initialScale: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.1)
    .describe('Initial scaleY value (thin line thickness)'),
  initialOpacity: z
    .number()
    .min(0.3)
    .max(1)
    .default(0.7)
    .describe('Initial opacity of slats'),
  slatColor: z
    .string()
    .default('from-gray-800 to-gray-900')
    .describe('Tailwind gradient classes for slat color'),
  lightLeakIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Maximum opacity of light leak effects between slats'),
  lightLeakDuration: z
    .number()
    .min(0.3)
    .max(1.5)
    .default(0.8)
    .describe('Duration of light leak pulse effect in seconds'),
  backgroundColor: z
    .string()
    .default('bg-black')
    .describe('Background color Tailwind class'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    slatCount,
    animationDuration,
    slatAnimationDuration,
    staggerDelay,
    perspective,
    initialRotation,
    initialScale,
    initialOpacity,
    slatColor,
    lightLeakIntensity,
    lightLeakDuration,
    backgroundColor,
  } = params;

  // Calculate slat height percentage
  const slatHeightPercent = 100 / slatCount;
  
  // Calculate center point for stagger timing
  const centerIndex = (slatCount - 1) / 2;

  // Helper function to calculate stagger delay based on distance from center
  const calculateStaggerStart = (index: number): number => {
    const distanceFromCenter = Math.abs(index - centerIndex);
    return distanceFromCenter * staggerDelay;
  };

  // Helper function to calculate translateY offset from center
  const calculateCenterOffset = (index: number): string => {
    const finalTopPercent = index * slatHeightPercent;
    const centerPercent = 50;
    const offsetPercent = finalTopPercent + slatHeightPercent / 2 - centerPercent;
    return `${offsetPercent}%`;
  };

  const childrenData: RenderableComponentData[] = [];

  // Create slats
  for (let i = 0; i < slatCount; i++) {
    const slatId = `slat-${i}`;
    const topPosition = `${i * slatHeightPercent}%`;
    const staggerStart = calculateStaggerStart(i);
    const centerOffset = calculateCenterOffset(i);

    // Slat container
    const slat: RenderableComponentData = {
      id: slatId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-full origin-center',
          style: {
            height: `${slatHeightPercent}%`,
            top: topPosition,
            willChange: 'transform, opacity',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: animationDuration,
        },
      },
      effects: [
        {
          id: `slat-expand-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: staggerStart,
            duration: slatAnimationDuration,
            mode: 'provider',
            targetIds: [slatId],
            ranges: [
              // RotateX: 90deg (edge-on) to 0deg (face-on)
              { key: 'rotateX', val: initialRotation, prog: 0 },
              { key: 'rotateX', val: 0, prog: 1 },
              // TranslateY: from center to final position
              { key: 'translateY', val: `-${centerOffset}`, prog: 0 },
              { key: 'translateY', val: '0%', prog: 1 },
              // ScaleY: thin line to full height
              { key: 'scaleY', val: initialScale, prog: 0 },
              { key: 'scaleY', val: 1, prog: 1 },
              // Opacity: fade in
              { key: 'opacity', val: initialOpacity, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: `slat-${i}-content`,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div class='w-full h-full bg-gradient-to-r ${slatColor}'></div>`,
          },
          context: {
            timing: {
              start: 0,
              duration: animationDuration,
            },
          },
        } as RenderableComponentData,
      ],
    };

    childrenData.push(slat);

    // Create light leak between slats (except after last slat)
    if (i < slatCount - 1) {
      const lightLeakId = `light-leak-${i}`;
      const lightLeakTop = `${(i + 1) * slatHeightPercent}%`;
      const lightLeakStaggerStart = calculateStaggerStart(i + 0.5);

      const lightLeak: RenderableComponentData = {
        id: lightLeakId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute w-full pointer-events-none',
            style: {
              height: '1px',
              top: lightLeakTop,
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: animationDuration,
          },
        },
        effects: [
          {
            id: `light-leak-pulse-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: lightLeakStaggerStart,
              duration: lightLeakDuration,
              mode: 'provider',
              targetIds: [lightLeakId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: lightLeakIntensity, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      };

      childrenData.push(lightLeak);
    }
  }

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'venetian-blind-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full overflow-hidden ${backgroundColor}`,
        style: {
          perspective: `${perspective}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: animationDuration,
      },
    },
    childrenData,
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

const presetMetadata: PresetMetadata = {
  id: 'venetian-blind-expansion',
  title: 'Venetian Blind Expansion',
  description:
    'Horizontal slats rotate and expand from center line outward, like blinds opening to reveal a window view. Each slat starts as a thin line at the center, then rotates along its X-axis while moving to its final vertical position. Creates a sophisticated 3D flip effect with cascading animation and light leak effects between slats.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'reveal',
    '3d',
    'venetian',
    'blinds',
    'mechanical',
    'architectural',
    'cascade',
    'rotation',
    'expansion',
  ],
  defaultInputParams: {
    slatCount: 12,
    animationDuration: 2,
    slatAnimationDuration: 0.6,
    staggerDelay: 0.1,
    perspective: 1000,
    initialRotation: 90,
    initialScale: 0.1,
    initialOpacity: 0.7,
    slatColor: 'from-gray-800 to-gray-900',
    lightLeakIntensity: 0.3,
    lightLeakDuration: 0.8,
    backgroundColor: 'bg-black',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const venetianBlindExpansionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
