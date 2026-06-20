/**
 * Dramatic Crash Zoom Effect Preset
 *
 * This preset creates an explosive, cinematic crash zoom effect mimicking techniques from action films
 * and music videos. It features three distinct animation phases:
 * 
 * 1. Hold Phase (0-20%): Brief static moment to establish the scene
 * 2. Acceleration Phase (20-60%): Explosive zoom with rapid scale increase, translation to focal point,
 *    overshoot bounce, and motion blur for speed sensation
 * 3. Settle Phase (60-100%): Deceleration with spring-like bounce and camera shake for impact
 *
 * Features:
 * - Exponential acceleration with overshoot and bounce-back for dynamic feel
 * - Motion blur during fast movement phase (20-50% range) enhancing speed sensation
 * - Camera shake at end of zoom (85-100% range) for extra impact
 * - Hardware-accelerated transforms using transform3d() and will-change properties
 * - Customizable focal point, zoom intensity, blur intensity, and shake amount
 * - Three distinct timing phases with different easing curves
 *
 * Use cases:
 * - Creating dramatic reveals in music videos
 * - Building impactful transitions in action sequences
 * - Adding "bass drop" style visual effects
 * - Highlighting key moments with explosive camera movement
 * - Creating whip-pan-style transitions with zoom
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  imageSrc: z
    .string()
    .describe('Image source URL or local path to apply the crash zoom effect to'),
  
  focalPoint: z
    .object({
      x: z.number().min(0).max(1).describe('Horizontal focal point (0 = left, 0.5 = center, 1 = right)'),
      y: z.number().min(0).max(1).describe('Vertical focal point (0 = top, 0.5 = center, 1 = bottom)'),
    })
    .default({ x: 0.5, y: 0.5 })
    .describe('Target focal point for the crash zoom (normalized coordinates 0-1)'),
  
  zoomIntensity: z
    .number()
    .min(2)
    .max(5)
    .default(3)
    .describe('Final zoom scale multiplier (2x to 5x)'),
  
  blurIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Maximum motion blur in pixels during fast movement phase'),
  
  shakeAmount: z
    .number()
    .min(0)
    .max(30)
    .default(5)
    .describe('Camera shake intensity in pixels at the end of the zoom'),
  
  duration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .describe('Total duration of the crash zoom effect in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    imageSrc,
    focalPoint,
    zoomIntensity,
    blurIntensity,
    shakeAmount,
    duration,
  } = params;

  // Calculate timing phases (as percentages, then convert to seconds)
  const holdDuration = duration * 0.2; // 0-20%: Hold phase
  const zoomStart = duration * 0.2; // 20%: Zoom starts
  const zoomDuration = duration * 0.4; // 20-60%: Zoom phase
  const settleStart = duration * 0.6; // 60%: Settle starts
  const settleDuration = duration * 0.4; // 60-100%: Settle phase
  
  // Motion blur timing (20-50% of total duration)
  const blurStart = duration * 0.2;
  const blurDuration = duration * 0.3; // 30% duration (from 20% to 50%)
  
  // Camera shake timing (85-100% of total duration)
  const shakeStart = duration * 0.85;
  const shakeDuration = duration * 0.15;

  // Calculate translation values to move focal point to center
  // focalPoint is normalized (0-1), we need to convert to percentage offset
  // Center is at 50%, so offset = (focalPoint * 100 - 50)
  const translateXTarget = (focalPoint.x - 0.5) * -100; // Negative because we move image opposite to focal point
  const translateYTarget = (focalPoint.y - 0.5) * -100;

  // Build the composition structure
  const rootContainer: RenderableComponentData = {
    id: 'crash-zoom-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full',
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
        id: 'image-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center will-change-transform will-change-filter',
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
            id: 'target-image',
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: imageSrc,
              className: 'w-full h-full object-cover',
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
        ] as RenderableComponentData[],
        effects: [
          // PHASE 1: Hold effect (0-20%)
          {
            id: 'hold-phase-effect',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: holdDuration,
              mode: 'provider',
              targetIds: ['image-container'],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          },
          
          // PHASE 2: Acceleration phase with overshoot (20-60%)
          {
            id: 'zoom-acceleration-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: zoomStart,
              duration: zoomDuration,
              mode: 'provider',
              targetIds: ['image-container'],
              ranges: [
                // Scale with overshoot
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: zoomIntensity, prog: 0.6 },
                { key: 'scale', val: zoomIntensity * 1.15, prog: 0.85 }, // Overshoot
                { key: 'scale', val: zoomIntensity, prog: 1 },
                
                // Translate to focal point
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: translateXTarget, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: translateYTarget, prog: 1 },
              ],
            },
          },
          
          // PHASE 3: Settle phase with bounce (60-100%)
          {
            id: 'settle-phase-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: settleStart,
              duration: settleDuration,
              mode: 'provider',
              targetIds: ['image-container'],
              ranges: [
                // Subtle bounce-back on scale
                { key: 'scale', val: zoomIntensity, prog: 0 },
                { key: 'scale', val: zoomIntensity * 1.08, prog: 0.3 }, // Small bounce up
                { key: 'scale', val: zoomIntensity * 0.98, prog: 0.7 }, // Slight under
                { key: 'scale', val: zoomIntensity, prog: 1 }, // Settle
              ],
            },
          },
          
          // Motion blur effect (20-50%)
          {
            id: 'motion-blur-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: blurStart,
              duration: blurDuration,
              mode: 'provider',
              targetIds: ['image-container'],
              ranges: [
                { key: 'filter', val: 'blur(0px)', prog: 0 },
                { key: 'filter', val: `blur(${blurIntensity}px)`, prog: 0.5 },
                { key: 'filter', val: 'blur(0px)', prog: 1 },
              ],
            },
          },
          
          // Camera shake effect (85-100%)
          {
            id: 'camera-shake-effect',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: shakeStart,
              duration: shakeDuration,
              mode: 'provider',
              targetIds: ['image-container'],
              ranges: [
                // Shake X axis
                { key: 'translateX', val: translateXTarget - shakeAmount, prog: 0 },
                { key: 'translateX', val: translateXTarget + shakeAmount, prog: 0.25 },
                { key: 'translateX', val: translateXTarget - shakeAmount * 0.5, prog: 0.5 },
                { key: 'translateX', val: translateXTarget + shakeAmount * 0.3, prog: 0.75 },
                { key: 'translateX', val: translateXTarget, prog: 1 },
                
                // Shake Y axis (different pattern for more organic feel)
                { key: 'translateY', val: translateYTarget + shakeAmount * 0.5, prog: 0 },
                { key: 'translateY', val: translateYTarget - shakeAmount * 0.8, prog: 0.33 },
                { key: 'translateY', val: translateYTarget + shakeAmount * 0.6, prog: 0.66 },
                { key: 'translateY', val: translateYTarget, prog: 1 },
              ],
            },
          },
        ],
      },
    ] as RenderableComponentData[],
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
  id: 'crash-zoom-effect',
  title: 'Dramatic Crash Zoom Effect',
  description:
    'Mimics sudden, impactful zoom techniques from action films with explosive acceleration, overshoot bounce, motion blur, and camera shake. Features three distinct phases: hold, zoom, and settle with dynamic effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['effects', 'zoom', 'crash', 'dramatic', 'action', 'motion-blur', 'camera-shake', 'visual', 'animation'],
  dependencies: {},
  defaultInputParams: {
    imageSrc: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809',
    focalPoint: { x: 0.5, y: 0.5 },
    zoomIntensity: 3,
    blurIntensity: 8,
    shakeAmount: 5,
    duration: 1.5,
  },
};

// Export preset
export const crashZoomEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};