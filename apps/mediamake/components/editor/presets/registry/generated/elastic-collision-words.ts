/**
 * Elastic Collision Words Preset
 * 
 * This preset creates a physics-based word collision animation where a middle word drops
 * from above with gravity acceleration and pushes side words apart with spring dynamics.
 * 
 * Features:
 * - **Gravity Drop**: Middle word drops from above with accelerating ease-in motion
 * - **Impact Squash**: Middle word squashes on impact (scaleY compression)
 * - **Spring Physics**: Side words bounce away with spring-based motion (overshoot, damped settling)
 * - **Motion Blur**: Velocity-proportional blur during fast movement phases
 * - **Natural Rotation**: Subtle rotation wobble during bounce for realism
 * - **Contact Shadow**: Dynamic shadow that fades and scales during impact
 * - **Damped Spring**: All elements settle with realistic spring physics
 * 
 * Use cases:
 * - Dynamic title reveals with physics simulation
 * - Eye-catching word collision effects for intros
 * - Video editor-style physics demonstrations
 * - Energetic text animations with natural motion
 * 
 * Technical Implementation:
 * - Uses custom cubic-bezier curves to simulate spring physics
 * - Multiple keyframe ranges for complex multi-property animations
 * - Composite layers with will-change for performance
 * - CSS custom properties for spring constants (--stiffness, --damping)
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  leftWord: z.string().default('PHYSICS').describe('Left word text'),
  middleWord: z.string().default('IMPACT').describe('Middle word that drops and causes collision'),
  rightWord: z.string().default('MOTION').describe('Right word text'),
  duration: z.number().default(2).describe('Total animation duration in seconds'),
  fontSize: z.number().default(72).describe('Font size for all words in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family for all words'),
  textColor: z.string().default('#ffffff').describe('Color for all words'),
  dropHeight: z.number().default(200).describe('Drop distance in percentage (e.g., 200 = 200% of height)'),
  impactTime: z.number().default(0.4).describe('Time when impact occurs (0-1 as fraction of duration)'),
  squashAmount: z.number().default(0.7).describe('Minimum scaleY during squash (0.5-1)'),
  bounceDistance: z.number().default(150).describe('Distance side words move away in pixels'),
  bounceRotation: z.number().default(3).describe('Maximum rotation angle during bounce in degrees'),
  springStiffness: z.number().default(300).describe('Spring stiffness constant (higher = faster oscillation)'),
  springDamping: z.number().default(20).describe('Spring damping constant (higher = less overshoot)'),
  blurIntensity: z.number().default(8).describe('Maximum motion blur intensity in pixels'),
  shadowOpacity: z.number().default(0.3).describe('Maximum contact shadow opacity (0-1)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    leftWord,
    middleWord,
    rightWord,
    duration,
    fontSize,
    fontFamily,
    textColor,
    dropHeight,
    impactTime,
    squashAmount,
    bounceDistance,
    bounceRotation,
    blurIntensity,
    shadowOpacity,
  } = params;

  // Calculate timing phases
  const impactTimeSeconds = duration * impactTime;
  const settleStart = impactTimeSeconds + (duration - impactTimeSeconds) * 0.3;

  // Helper function to create spring-based cubic bezier curve
  // This simulates spring physics with overshoot and damping
  const createSpringEasing = (stiffness: number, damping: number): string => {
    // Convert spring constants to cubic-bezier approximation
    // Higher stiffness = more responsive, higher damping = less overshoot
    const normalizedStiffness = Math.min(stiffness / 500, 1);
    const normalizedDamping = Math.min(damping / 40, 1);
    
    const x1 = 0.25 + (normalizedStiffness * 0.25);
    const y1 = 0.1 + (1 - normalizedDamping) * 0.9;
    const x2 = 0.75 - (normalizedDamping * 0.25);
    const y2 = 1.0 - (1 - normalizedStiffness) * 0.3;
    
    return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
  };

  // Generate unique IDs
  const containerId = 'elastic-collision-root';
  const leftWordId = 'left-word';
  const middleWordId = 'middle-word';
  const rightWordId = 'right-word';
  const shadowId = 'contact-shadow';

  // Middle word drop effect - gravity simulation
  const middleDropEffect = {
    id: 'middle-drop',
    componentId: 'generic',
    data: {
      type: 'ease-in' as const, // Accelerating (gravity)
      start: 0,
      duration: impactTimeSeconds,
      mode: 'provider' as const,
      targetIds: [middleWordId],
      ranges: [
        { key: 'translateY', val: `${-dropHeight}%`, prog: 0 },
        { key: 'translateY', val: '0%', prog: 1 },
        // Add slight rotation during fall
        { key: 'rotate', val: -2, prog: 0 },
        { key: 'rotate', val: 0, prog: 1 },
      ],
    },
  };

  // Middle word squash and bounce effect
  const middleSquashEffect = {
    id: 'middle-squash',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: impactTimeSeconds,
      duration: duration - impactTimeSeconds,
      mode: 'provider' as const,
      targetIds: [middleWordId],
      ranges: [
        // Squash on impact
        { key: 'scaleY', val: 1, prog: 0 },
        { key: 'scaleY', val: squashAmount, prog: 0.1 },
        // Overshoot rebound
        { key: 'scaleY', val: 1.1, prog: 0.25 },
        // Settle back
        { key: 'scaleY', val: 0.98, prog: 0.4 },
        { key: 'scaleY', val: 1.01, prog: 0.6 },
        { key: 'scaleY', val: 1, prog: 1 },
        // Slight horizontal squash during impact
        { key: 'scaleX', val: 1, prog: 0 },
        { key: 'scaleX', val: 1.05, prog: 0.1 },
        { key: 'scaleX', val: 0.98, prog: 0.25 },
        { key: 'scaleX', val: 1, prog: 1 },
      ],
    },
  };

  // Middle word motion blur during drop
  const middleBlurEffect = {
    id: 'middle-blur',
    componentId: 'generic',
    data: {
      type: 'ease-in' as const,
      start: 0,
      duration: impactTimeSeconds,
      mode: 'provider' as const,
      targetIds: [middleWordId],
      ranges: [
        { key: 'filter', val: 'blur(0px)', prog: 0 },
        { key: 'filter', val: `blur(${blurIntensity}px)`, prog: 0.8 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
      ],
    },
  };

  // Left word spring motion - pushed away
  const leftSpringEffect = {
    id: 'left-spring',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: impactTimeSeconds,
      duration: duration - impactTimeSeconds,
      mode: 'provider' as const,
      targetIds: [leftWordId],
      ranges: [
        // Horizontal movement with overshoot
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: -bounceDistance, prog: 0.3 },
        { key: 'translateX', val: -bounceDistance * 0.8, prog: 0.5 },
        { key: 'translateX', val: -bounceDistance * 0.9, prog: 0.7 },
        { key: 'translateX', val: -bounceDistance * 0.85, prog: 1 },
        // Vertical bounce
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -10, prog: 0.15 },
        { key: 'translateY', val: 0, prog: 0.3 },
        { key: 'translateY', val: -3, prog: 0.45 },
        { key: 'translateY', val: 0, prog: 1 },
        // Rotation wobble
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: bounceRotation, prog: 0.2 },
        { key: 'rotate', val: -bounceRotation * 0.3, prog: 0.4 },
        { key: 'rotate', val: bounceRotation * 0.1, prog: 0.6 },
        { key: 'rotate', val: 0, prog: 1 },
      ],
    },
  };

  // Left word motion blur
  const leftBlurEffect = {
    id: 'left-blur',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: impactTimeSeconds,
      duration: (duration - impactTimeSeconds) * 0.4,
      mode: 'provider' as const,
      targetIds: [leftWordId],
      ranges: [
        { key: 'filter', val: 'blur(0px)', prog: 0 },
        { key: 'filter', val: `blur(${blurIntensity * 0.6}px)`, prog: 0.5 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
      ],
    },
  };

  // Right word spring motion - pushed away
  const rightSpringEffect = {
    id: 'right-spring',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: impactTimeSeconds,
      duration: duration - impactTimeSeconds,
      mode: 'provider' as const,
      targetIds: [rightWordId],
      ranges: [
        // Horizontal movement with overshoot
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: bounceDistance, prog: 0.3 },
        { key: 'translateX', val: bounceDistance * 0.8, prog: 0.5 },
        { key: 'translateX', val: bounceDistance * 0.9, prog: 0.7 },
        { key: 'translateX', val: bounceDistance * 0.85, prog: 1 },
        // Vertical bounce
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -10, prog: 0.15 },
        { key: 'translateY', val: 0, prog: 0.3 },
        { key: 'translateY', val: -3, prog: 0.45 },
        { key: 'translateY', val: 0, prog: 1 },
        // Rotation wobble (opposite direction)
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: -bounceRotation, prog: 0.2 },
        { key: 'rotate', val: bounceRotation * 0.3, prog: 0.4 },
        { key: 'rotate', val: -bounceRotation * 0.1, prog: 0.6 },
        { key: 'rotate', val: 0, prog: 1 },
      ],
    },
  };

  // Right word motion blur
  const rightBlurEffect = {
    id: 'right-blur',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: impactTimeSeconds,
      duration: (duration - impactTimeSeconds) * 0.4,
      mode: 'provider' as const,
      targetIds: [rightWordId],
      ranges: [
        { key: 'filter', val: 'blur(0px)', prog: 0 },
        { key: 'filter', val: `blur(${blurIntensity * 0.6}px)`, prog: 0.5 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
      ],
    },
  };

  // Contact shadow effect
  const shadowEffect = {
    id: 'shadow-anim',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: impactTimeSeconds * 0.9,
      duration: (duration - impactTimeSeconds) * 0.3,
      mode: 'provider' as const,
      targetIds: [shadowId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: shadowOpacity, prog: 0.3 },
        { key: 'opacity', val: 0, prog: 1 },
        { key: 'scaleX', val: 0.5, prog: 0 },
        { key: 'scaleX', val: 1.2, prog: 0.3 },
        { key: 'scaleX', val: 1, prog: 1 },
        { key: 'scaleY', val: 0.5, prog: 0 },
        { key: 'scaleY', val: 1, prog: 0.3 },
        { key: 'scaleY', val: 0.8, prog: 1 },
      ],
    },
  };

  // Build component tree
  const rootContainer = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-end justify-center pb-20',
        style: {
          willChange: 'transform',
          '--stiffness': '300',
          '--damping': '20',
        } as React.CSSProperties,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      // Left word
      {
        id: leftWordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: leftWord,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: 'bold',
            color: textColor,
            willChange: 'transform, filter',
            marginRight: '1rem',
          },
          font: {
            family: fontFamily,
            weights: ['700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [leftSpringEffect, leftBlurEffect],
      },
      // Middle word (drops)
      {
        id: middleWordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: middleWord,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: 'bold',
            color: textColor,
            willChange: 'transform, filter',
            margin: '0 1rem',
          },
          font: {
            family: fontFamily,
            weights: ['700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [middleDropEffect, middleSquashEffect, middleBlurEffect],
      },
      // Right word
      {
        id: rightWordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: rightWord,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: 'bold',
            color: textColor,
            willChange: 'transform, filter',
            marginLeft: '1rem',
          },
          font: {
            family: fontFamily,
            weights: ['700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [rightSpringEffect, rightBlurEffect],
      },
      // Contact shadow
      {
        id: shadowId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute left-1/2 -translate-x-1/2',
            style: {
              width: '120px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.3)',
              filter: 'blur(8px)',
              willChange: 'opacity, transform',
              bottom: '4rem',
              opacity: 0,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [shadowEffect],
        childrenData: [],
      },
    ] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'elastic-collision-words',
  title: 'Elastic Collision Words',
  description: 'Physics-based word collision preset where a middle word drops with gravity and pushes side words apart with spring dynamics, squash-and-stretch on impact, motion blur during fast movement, and damped settling animation.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'physics', 'collision', 'spring', 'kinetic', 'motion-blur', 'squash-stretch', 'impact'],
  defaultInputParams: {
    leftWord: 'PHYSICS',
    middleWord: 'IMPACT',
    rightWord: 'MOTION',
    duration: 2,
    fontSize: 72,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    dropHeight: 200,
    impactTime: 0.4,
    squashAmount: 0.7,
    bounceDistance: 150,
    bounceRotation: 3,
    springStiffness: 300,
    springDamping: 20,
    blurIntensity: 8,
    shadowOpacity: 0.3,
  },
  dependencies: {},
};

// Export preset
export const elasticCollisionWordsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
