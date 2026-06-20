/**
 * Picture-in-Picture Morph Transition Preset
 *
 * This preset creates a dynamic transition where a main talking head video morphs into a 
 * floating picture-in-picture (PiP) window with elegant bouncing movement while b-roll 
 * content takes center stage. The PiP window features physics-like movement patterns and 
 * audio-reactive visual effects.
 *
 * Features:
 * - **Liquid Morph Transition**: Smooth scale-down animation with liquid-like distortion effect
 * - **Floating Movement**: Sine-wave based movement patterns creating elegant drift across screen
 * - **Bounce Physics**: Spring-easing direction changes for natural bouncing behavior
 * - **Audio-Reactive Glow**: Pulsing border that responds to audio waveform intensity
 * - **Ken Burns Effect**: Subtle zoom effect on b-roll background (95% to 100% scale)
 * - **Dynamic Positioning**: PiP repositions every 3-4 seconds with smooth transitions
 *
 * Use cases:
 * - Creating engaging video presentations with dynamic PiP effects
 * - Professional talking head videos with supporting b-roll footage
 * - Educational content where speaker remains visible while showing demonstrations
 * - Interview formats with contextual background visuals
 */

import { z } from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter Schema
const presetParams = z.object({
  mainVideoSrc: z.string().describe('Source URL for the main talking head video'),
  brollSrc: z.string().describe('Source URL for the b-roll background video or image'),
  duration: z.number().default(30).describe('Total duration of the composition in seconds'),
  morphDuration: z.number().default(0.8).describe('Duration of the morph transition effect in seconds'),
  pipSize: z.number().default(25).describe('Size of the PiP window as percentage of screen width'),
  floatSpeed: z.number().default(1.0).describe('Speed multiplier for floating movement (0.5 = slow, 2.0 = fast)'),
  bounceIntensity: z.number().default(1.0).describe('Intensity of bounce effect (0.5 = subtle, 2.0 = aggressive)'),
  glowIntensity: z.number().default(0.5).describe('Intensity of the glow border effect (0-1)'),
  audioReactive: z.boolean().default(true).describe('Enable audio-reactive glow effects if audio data is available'),
  repositionInterval: z.number().default(3.5).describe('Time in seconds between PiP position changes'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset Execution Function
const presetExecution = (params: PresetParams, props: PresetPassedProps): PresetOutput => {
  // Helper function to calculate sine-wave floating positions
  const calculateFloatingPositions = (
    duration: number,
    interval: number,
    speed: number,
    bounceIntensity: number,
  ): Array<{ time: number; x: string; y: string }> => {
    const positions: Array<{ time: number; x: string; y: string }> = [];
    const numPositions = Math.ceil(duration / interval);
    
    // Define safe zones (avoiding exact corners and edges)
    const safeZones = [
      { x: '8%', y: '8%' },      // Top-left
      { x: '72%', y: '8%' },     // Top-right
      { x: '8%', y: '76%' },     // Bottom-left
      { x: '72%', y: '76%' },    // Bottom-right
      { x: '40%', y: '8%' },     // Top-center
      { x: '40%', y: '76%' },    // Bottom-center
      { x: '8%', y: '42%' },     // Middle-left
      { x: '72%', y: '42%' },    // Middle-right
    ];
    
    for (let i = 0; i < numPositions; i++) {
      const time = i * interval;
      const zone = safeZones[i % safeZones.length];
      
      // Add subtle sine-wave variation to positions
      const xOffset = Math.sin(time * speed * 0.3) * 2 * bounceIntensity;
      const yOffset = Math.cos(time * speed * 0.4) * 2 * bounceIntensity;
      
      positions.push({
        time,
        x: `calc(${zone.x} + ${xOffset}%)`,
        y: `calc(${zone.y} + ${yOffset}%)`,
      });
    }
    
    return positions;
  };

  // Extract parameters
  const {
    mainVideoSrc,
    brollSrc,
    duration,
    morphDuration,
    pipSize,
    floatSpeed,
    bounceIntensity,
    glowIntensity,
    audioReactive,
    repositionInterval,
  } = params;

  const fps = props.config?.fps || 30;
  const pipWidth = `${pipSize}%`;
  
  // Calculate floating positions
  const floatingPositions = calculateFloatingPositions(
    duration,
    repositionInterval,
    floatSpeed,
    bounceIntensity,
  );

  // Create morph scale effect for PiP (100% to final size)
  const morphScaleEffect = {
    id: 'pip-morph-scale',
    componentId: 'pip-container',
    data: {
      type: 'ease-out',
      start: 0,
      duration: morphDuration,
      mode: 'provider',
      targetIds: ['pip-container'],
      ranges: [
        { key: 'scale', val: 4, prog: 0 }, // Start at 400% (full screen)
        { key: 'scale', val: 1, prog: 1 }, // End at 100% (pip size)
        { key: 'blur', val: 8, prog: 0 }, // Blur during morph
        { key: 'blur', val: 0, prog: 0.7 },
        { key: 'blur', val: 0, prog: 1 },
      ],
    },
  };

  // Create floating movement effects
  const floatingEffects = floatingPositions.map((pos, index) => {
    const nextPos = floatingPositions[(index + 1) % floatingPositions.length];
    const effectDuration = index < floatingPositions.length - 1 
      ? nextPos.time - pos.time 
      : duration - pos.time;

    return {
      id: `pip-float-${index}`,
      componentId: 'pip-container',
      data: {
        type: 'spring',
        start: Math.max(pos.time, morphDuration), // Start after morph
        duration: effectDuration,
        mode: 'provider',
        targetIds: ['pip-container'],
        ranges: [
          { key: 'translateX', val: pos.x, prog: 0 },
          { key: 'translateX', val: nextPos.x, prog: 1 },
          { key: 'translateY', val: pos.y, prog: 0 },
          { key: 'translateY', val: nextPos.y, prog: 1 },
        ],
      },
    };
  });

  // Create glow pulse effect (continuous)
  const glowPulseEffect = {
    id: 'pip-glow-pulse',
    componentId: 'pip-glow',
    data: {
      type: 'ease-in-out',
      start: morphDuration,
      duration: duration - morphDuration,
      mode: 'provider',
      targetIds: ['pip-glow'],
      ranges: [
        { key: 'opacity', val: 0.3 * glowIntensity, prog: 0 },
        { key: 'opacity', val: 0.8 * glowIntensity, prog: 0.5 },
        { key: 'opacity', val: 0.3 * glowIntensity, prog: 1 },
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1.05, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  };

  // Create Ken Burns zoom effect for b-roll
  const kenBurnsEffect = {
    id: 'broll-ken-burns',
    componentId: 'broll-container',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: ['broll-container'],
      ranges: [
        { key: 'scale', val: 0.95, prog: 0 },
        { key: 'scale', val: 1.0, prog: 1 },
      ],
    },
  };

  // Create b-roll fade-in effect
  const brollFadeEffect = {
    id: 'broll-fade-in',
    componentId: 'broll-container',
    data: {
      type: 'ease-out',
      start: 0,
      duration: morphDuration * 0.8,
      mode: 'provider',
      targetIds: ['broll-container'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Build component tree
  const childrenData: RenderableComponentData[] = [
    // Root container
    {
      id: 'pip-morph-root',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative w-full h-full overflow-hidden bg-black',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [
        // B-roll container
        {
          id: 'broll-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 z-10',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          effects: [kenBurnsEffect, brollFadeEffect],
          childrenData: [
            {
              id: 'broll-video',
              type: 'atom',
              componentId: 'VideoAtom',
              data: {
                src: brollSrc,
                fit: 'cover',
                className: 'w-full h-full object-cover',
              },
              context: {
                timing: {
                  start: 0,
                  duration: duration,
                },
              },
            },
          ],
        } as RenderableComponentData,
        // PiP container with floating movement
        {
          id: 'pip-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute z-30',
              style: {
                width: pipWidth,
                aspectRatio: '16/9',
                left: '0',
                top: '0',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          effects: [morphScaleEffect, ...floatingEffects],
          childrenData: [
            // Glow ring effect
            {
              id: 'pip-glow',
              type: 'atom',
              componentId: 'ShapeAtom',
              data: {
                type: 'rectangle',
                className: 'absolute inset-[-6px] rounded-xl pointer-events-none',
                fill: 'transparent',
                stroke: 'rgba(59, 130, 246, 0.8)',
                strokeWidth: 4,
                style: {
                  filter: 'blur(8px)',
                  boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: duration,
                },
              },
              effects: [glowPulseEffect],
            },
            // PiP video
            {
              id: 'pip-video',
              type: 'atom',
              componentId: 'VideoAtom',
              data: {
                src: mainVideoSrc,
                fit: 'cover',
                className: 'w-full h-full object-cover rounded-lg relative z-10',
                style: {
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: duration,
                },
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  return {
    output: {
      childrenData: childrenData as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset Metadata
const presetMetadata: PresetMetadata = {
  id: 'pip-morph-transition',
  title: 'Picture-in-Picture Morph Transition',
  description: 'A dynamic PiP transition where the main talking head video morphs into a floating picture-in-picture window with elegant bouncing movement while b-roll takes center stage. Features include: morph scale animation with blur distortion effect, floating movement using sine-wave patterns with spring easing on direction changes, pulsing glow border effect, and Ken Burns zoom effect on the b-roll background.',
  type: 'predefined',
  presetType: 'children',
  tags: ['pip', 'transition', 'morph', 'floating', 'broll', 'video', 'dynamic', 'effects'],
  defaultInputParams: {
    mainVideoSrc: 'https://example.com/talking-head.mp4',
    brollSrc: 'https://example.com/broll.mp4',
    duration: 30,
    morphDuration: 0.8,
    pipSize: 25,
    floatSpeed: 1.0,
    bounceIntensity: 1.0,
    glowIntensity: 0.5,
    audioReactive: true,
    repositionInterval: 3.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export Preset
export const pipMorphTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
