/**
 * Multi-Circle Ripple Reveal Effect Preset
 * 
 * Creates a water droplet-inspired ripple reveal effect with multiple concentric circles 
 * that expand at different rates and varying opacity, simulating a slow-motion droplet 
 * impact on water. Each circle has staggered timing offsets (50-100ms) creating a 
 * beautiful, layered, organic reveal effect.
 * 
 * Features:
 * - 4 concentric circles with different expansion speeds
 * - Staggered timing offsets (0.1s between circles)
 * - Progressive transparency (innermost most opaque, outer circles more transparent)
 * - Customizable origin point (default center, can be offset)
 * - Blur effect that decreases as circles expand (4px to 0)
 * - Screen blend mode for luminous overlap effect
 * - Total duration: 2 seconds with self-contained timing
 * 
 * Use cases:
 * - Revealing emotional or impactful scenes
 * - Dramatic content transitions
 * - Water-themed visual effects
 * - Organic, dynamic reveals for important moments
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  trackId: z.string().default('ripple-reveal').describe('Unique ID for the ripple reveal effect'),
  duration: z.number().default(2).describe('Total duration of the ripple reveal effect in seconds'),
  revealX: z.string().default('50%').describe('Horizontal origin point of the ripple effect (CSS value, e.g., "50%", "200px")'),
  revealY: z.string().default('50%').describe('Vertical origin point of the ripple effect (CSS value, e.g., "50%", "200px")'),
  circleCount: z.number().min(3).max(5).default(4).describe('Number of concentric ripple circles (3-5)'),
  circleColor: z.string().default('white').describe('Color of the ripple circles (CSS color value)'),
  circleBorderWidth: z.number().default(3).describe('Border width of the ripple circles in pixels'),
  initialCircleSize: z.number().default(100).describe('Initial size of the circles in pixels'),
  maxScale: z.number().default(2.5).describe('Maximum scale factor for the innermost circle'),
  startTime: z.number().default(0).describe('Start time of the effect relative to parent timeline'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackId,
    duration,
    revealX,
    revealY,
    circleCount,
    circleColor,
    circleBorderWidth,
    initialCircleSize,
    maxScale,
    startTime,
  } = params;

  // Helper function to calculate scale and opacity for each circle
  const calculateCircleParams = (index: number, totalCircles: number) => {
    // Innermost circle (index 0) is fastest and most opaque
    // Outer circles progressively slower and more transparent
    const normalizedIndex = index / (totalCircles - 1); // 0 to 1
    
    const scaleMultiplier = 1 - (normalizedIndex * 0.36); // 1.0 to 0.64
    const maxCircleScale = maxScale * scaleMultiplier;
    
    const initialOpacity = 0.9 - (normalizedIndex * 0.45); // 0.9 to 0.45
    
    return {
      maxScale: maxCircleScale,
      initialOpacity,
      timingOffset: index * 0.1, // 100ms stagger
    };
  };

  // Create ripple circles
  const rippleCircles: RenderableComponentData[] = [];
  
  for (let i = 0; i < circleCount; i++) {
    const circleId = `${trackId}-circle-${i}`;
    const circleParams = calculateCircleParams(i, circleCount);
    
    // Create generic effect for this circle
    const circleEffect: GenericEffectData = {
      type: 'ease-out',
      start: circleParams.timingOffset,
      duration: duration,
      mode: 'provider',
      targetIds: [circleId],
      ranges: [
        // Scale animation (0 to maxScale)
        { key: 'scale', val: 0, prog: 0 },
        { key: 'scale', val: circleParams.maxScale, prog: 1 },
        
        // Opacity animation (initialOpacity to 0)
        { key: 'opacity', val: circleParams.initialOpacity, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
        
        // Blur animation (4px to 0)
        { key: 'filter', val: 'blur(4px)', prog: 0 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
      ],
    };

    // Create circle component
    const circleComponent: RenderableComponentData = {
      id: circleId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="
          width: ${initialCircleSize}px;
          height: ${initialCircleSize}px;
          border-radius: 50%;
          border: ${circleBorderWidth}px solid ${circleColor};
          box-sizing: border-box;
        "></div>`,
        className: 'absolute',
        style: {
          top: revealY,
          left: revealX,
          transform: 'translate(-50%, -50%)',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
          transformOrigin: 'center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration + circleParams.timingOffset,
        },
      },
      effects: [
        {
          id: `${circleId}-effect`,
          componentId: 'generic',
          data: circleEffect,
        },
      ],
    };

    rippleCircles.push(circleComponent);
  }

  // Create ripple container
  const rippleContainer: RenderableComponentData = {
    id: `${trackId}-ripple-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          '--reveal-x': revealX,
          '--reveal-y': revealY,
        } as React.CSSProperties,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration + 0.3, // Account for last circle's offset
      },
    },
    childrenData: rippleCircles as RenderableComponentData[],
  };

  // Create revealed content container (user content goes here)
  const revealedContentContainer: RenderableComponentData = {
    id: `${trackId}-revealed-content`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration + 0.3,
      },
    },
    childrenData: [],
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: `${trackId}-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: startTime,
        duration: duration + 0.3,
      },
    },
    childrenData: [
      revealedContentContainer,
      rippleContainer,
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
  id: 'ripple-reveal-effect',
  title: 'Multi-Circle Ripple Reveal Effect',
  description: 'Water droplet-inspired ripple reveal with 3-5 concentric circles expanding at different rates and varying opacity, creating an organic, layered reveal effect. Circles originate from a customizable point with staggered timing offsets and gradually fade out as they expand.',
  type: 'predefined',
  presetType: 'children',
  tags: ['reveal', 'ripple', 'water', 'organic', 'animation', 'circles', 'transition', 'dramatic'],
  defaultInputParams: {
    trackId: 'ripple-reveal',
    duration: 2,
    revealX: '50%',
    revealY: '50%',
    circleCount: 4,
    circleColor: 'white',
    circleBorderWidth: 3,
    initialCircleSize: 100,
    maxScale: 2.5,
    startTime: 0,
  },
  dependencies: {},
};

// Export preset
export const rippleRevealEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
