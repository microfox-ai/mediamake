/**
 * Dramatic Polaroid Slam Transition Preset
 *
 * A high-energy transition effect where a new polaroid image crashes onto a stack with force.
 * The incoming polaroid drops rapidly with minimal rotation, hitting the stack with a shake
 * effect that ripples through visible polaroids. On impact, creates a brief flash/brightness
 * spike and a subtle dust particle burst for dramatic cinematic effect.
 *
 * Features:
 * - **Rapid Drop Animation**: Incoming polaroid falls from -80% translateY with aggressive easing
 * - **Impact Shake**: 3-cycle rapid oscillation on impact with ±3px movement
 * - **Sympathetic Shake**: Outgoing polaroid receives delayed shake on impact
 * - **Brightness Spike**: Brief 1 to 1.4 to 1 brightness filter on impact
 * - **Flash Overlay**: White flash overlay pulses on impact for dramatic effect
 * - **Dust Burst**: Radial gradient simulates dust particles bursting on impact
 * - **Lens Flare**: Subtle light leak effect for cinematic drama
 * - **Classic Polaroid Frame**: White frame with thick bottom border (iconic aesthetic)
 * - **Short Timing**: 0.5s overlap for snappy, punchy transitions
 *
 * Use Cases:
 * - High-energy photo transitions for social media content
 * - Dynamic photo stack reveals for presentations
 * - Impactful image galleries with cinematic flair
 * - Rapid-fire photo montages with dramatic effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingImage: z.object({
    src: z.string().describe('Source URL of the outgoing image'),
  }).describe('Outgoing image data'),
  incomingImage: z.object({
    src: z.string().describe('Source URL of the incoming image'),
  }).describe('Incoming image data'),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Total transition duration in seconds (default: 1.0s)'),
  overlapDuration: z
    .number()
    .default(0.5)
    .describe('Overlap duration for incoming/outgoing polaroids (default: 0.5s)'),
  dropEasing: z
    .string()
    .default('cubic-bezier(0.55, 0, 1, 0.45)')
    .describe('Easing function for drop animation (default: cubic-bezier(0.55, 0, 1, 0.45))'),
  shakeIntensity: z
    .number()
    .default(3)
    .describe('Shake intensity in pixels (default: 3px)'),
  brightnessSpike: z
    .number()
    .default(1.4)
    .describe('Peak brightness value on impact (default: 1.4)'),
  flashOpacity: z
    .number()
    .default(0.6)
    .describe('Maximum flash overlay opacity (default: 0.6)'),
  polaroidWidth: z
    .number()
    .default(400)
    .describe('Width of polaroid frame in pixels (default: 400px)'),
  polaroidHeight: z
    .number()
    .default(480)
    .describe('Height of polaroid frame in pixels (default: 480px)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingImage,
    incomingImage,
    transitionDuration,
    overlapDuration,
    dropEasing,
    shakeIntensity,
    brightnessSpike,
    flashOpacity,
    polaroidWidth,
    polaroidHeight,
  } = params;

  // Calculate timing
  const outgoingDuration = transitionDuration;
  const incomingStart = transitionDuration - overlapDuration;
  const incomingDuration = overlapDuration;
  
  // Drop animation: first 60% of overlap (0.3s of 0.5s overlap)
  const dropDuration = overlapDuration * 0.6;
  
  // Impact shake timing
  const impactShakeStart = dropDuration; // Starts after drop completes
  const impactShakeDuration = 0.1; // 100ms
  
  // Sympathetic shake (delayed by 50ms)
  const sympatheticShakeStart = impactShakeStart + 0.05;
  const sympatheticShakeDuration = 0.08; // 80ms
  
  // Brightness spike timing
  const brightnessStart = impactShakeStart;
  const brightnessDuration = 0.15; // 150ms
  
  // Flash, dust, lens flare timing (all at impact moment)
  const flashDuration = 0.15;
  const dustDuration = 0.2;
  const flareDuration = 0.2;

  // Build children data
  const childrenData: RenderableComponentData[] = [
    // Polaroid stack container
    {
      id: 'polaroid-stack-container',
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
          duration: transitionDuration,
        },
      },
      childrenData: [
        // Outgoing polaroid
        {
          id: 'outgoing-polaroid',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute p-2 pb-8 bg-white shadow-2xl',
              style: {
                width: `${polaroidWidth}px`,
                height: `${polaroidHeight}px`,
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingDuration,
            },
          },
          childrenData: [
            {
              id: 'outgoing-image',
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: outgoingImage.src,
                className: 'w-full h-full object-cover',
              },
              context: {
                timing: {
                  start: 0,
                  duration: outgoingDuration,
                },
              },
            } as RenderableComponentData,
          ],
          effects: [
            // Sympathetic shake effect (delayed)
            {
              id: 'sympathetic-shake-outgoing',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: sympatheticShakeStart,
                duration: sympatheticShakeDuration,
                mode: 'provider',
                targetIds: ['outgoing-polaroid'],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: -2, prog: 0.25 },
                  { key: 'translateX', val: 2, prog: 0.5 },
                  { key: 'translateX', val: -2, prog: 0.75 },
                  { key: 'translateX', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
        
        // Incoming polaroid
        {
          id: 'incoming-polaroid',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute p-2 pb-8 bg-white shadow-2xl',
              style: {
                width: `${polaroidWidth}px`,
                height: `${polaroidHeight}px`,
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              },
            },
          },
          context: {
            timing: {
              start: incomingStart,
              duration: incomingDuration,
            },
          },
          childrenData: [
            {
              id: 'incoming-image',
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: incomingImage.src,
                className: 'w-full h-full object-cover',
              },
              context: {
                timing: {
                  start: 0,
                  duration: incomingDuration,
                },
              },
            } as RenderableComponentData,
          ],
          effects: [
            // Drop animation
            {
              id: 'drop-animation-effect',
              componentId: 'generic',
              data: {
                type: dropEasing as any,
                start: 0,
                duration: dropDuration,
                mode: 'provider',
                targetIds: ['incoming-polaroid'],
                ranges: [
                  { key: 'translateY', val: '-80%', prog: 0 },
                  { key: 'translateY', val: '0%', prog: 1 },
                ],
              },
            },
            // Impact shake (3 cycles)
            {
              id: 'impact-shake-incoming',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: impactShakeStart,
                duration: impactShakeDuration,
                mode: 'provider',
                targetIds: ['incoming-polaroid'],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: shakeIntensity, prog: 0.16 },
                  { key: 'translateX', val: -shakeIntensity, prog: 0.33 },
                  { key: 'translateX', val: shakeIntensity, prog: 0.5 },
                  { key: 'translateX', val: -shakeIntensity, prog: 0.66 },
                  { key: 'translateX', val: 2, prog: 0.83 },
                  { key: 'translateX', val: 0, prog: 1 },
                ],
              },
            },
            // Brightness spike
            {
              id: 'brightness-spike-effect',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: brightnessStart,
                duration: brightnessDuration,
                mode: 'provider',
                targetIds: ['incoming-polaroid'],
                ranges: [
                  { key: 'brightness', val: 1, prog: 0 },
                  { key: 'brightness', val: brightnessSpike, prog: 0.4 },
                  { key: 'brightness', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
        
        // Flash overlay
        {
          id: 'flash-overlay',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                backgroundColor: 'rgba(255, 255, 255, 1)',
                mixBlendMode: 'screen',
              },
            },
          },
          context: {
            timing: {
              start: incomingStart + impactShakeStart,
              duration: flashDuration,
            },
          },
          effects: [
            {
              id: 'flash-opacity-effect',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: flashDuration,
                mode: 'provider',
                targetIds: ['flash-overlay'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: flashOpacity, prog: 0.3 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
        
        // Dust particle burst
        {
          id: 'dust-particle-burst',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute pointer-events-none',
              style: {
                width: '200px',
                height: '200px',
                left: '50%',
                top: '50%',
                marginLeft: '-100px',
                marginTop: '-100px',
                background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 70%)',
                filter: 'blur(8px)',
              },
            },
          },
          context: {
            timing: {
              start: incomingStart + impactShakeStart,
              duration: dustDuration,
            },
          },
          effects: [
            {
              id: 'dust-burst-scale-effect',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: dustDuration,
                mode: 'provider',
                targetIds: ['dust-particle-burst'],
                ranges: [
                  { key: 'scale', val: 0.3, prog: 0 },
                  { key: 'scale', val: 1.5, prog: 1 },
                ],
              },
            },
            {
              id: 'dust-burst-opacity-effect',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: dustDuration,
                mode: 'provider',
                targetIds: ['dust-particle-burst'],
                ranges: [
                  { key: 'opacity', val: 0.8, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
        
        // Lens flare overlay
        {
          id: 'lens-flare-overlay',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute pointer-events-none',
              style: {
                width: '150px',
                height: '150px',
                right: '10%',
                top: '15%',
                background: 'radial-gradient(circle, rgba(255,220,150,0.7) 0%, rgba(255,220,150,0) 60%)',
                filter: 'blur(12px)',
                mixBlendMode: 'screen',
              },
            },
          },
          context: {
            timing: {
              start: incomingStart + impactShakeStart,
              duration: flareDuration,
            },
          },
          effects: [
            {
              id: 'lens-flare-pulse-effect',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: flareDuration,
                mode: 'provider',
                targetIds: ['lens-flare-overlay'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.7, prog: 0.4 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'dramatic-polaroid-slam-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-neutral-800',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData,
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
  id: 'dramatic-polaroid-slam',
  title: 'Dramatic Polaroid Slam Transition',
  description:
    'High-energy polaroid stack transition with impact slam, shake effects, brightness spike, flash overlay, and dust burst animation. Features rapid drop animation with minimal rotation, sympathetic shake on outgoing image, and cinematic lens flare on impact. Classic white polaroid frame with thick bottom border for iconic aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'polaroid', 'slam', 'impact', 'shake', 'dramatic', 'cinematic'],
  defaultInputParams: {
    outgoingImage: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
    },
    incomingImage: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
    },
    transitionDuration: 1.0,
    overlapDuration: 0.5,
    dropEasing: 'cubic-bezier(0.55, 0, 1, 0.45)',
    shakeIntensity: 3,
    brightnessSpike: 1.4,
    flashOpacity: 0.6,
    polaroidWidth: 400,
    polaroidHeight: 480,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const dramaticPolaroidSlamPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
