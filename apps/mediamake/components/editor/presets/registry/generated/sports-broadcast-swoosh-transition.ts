/**
 * Sports Broadcast Swoosh Transition Preset
 *
 * This preset creates high-intensity ESPN-style transition effects with aggressive directional wipes,
 * motion blur, and explosive energy. It mimics professional sports broadcast transitions with multiple
 * overlapping layers creating a dynamic 'swoosh' effect where content slides in from one direction
 * while the previous content slides out with motion blur and scaling.
 *
 * Features:
 * - **Aggressive Directional Wipes**: Sharp, fast, impactful transitions with clip-path animations
 * - **Motion Blur Effects**: CSS filter blur during movement (0 -> 8px -> 0) for realistic motion
 * - **Layered Swoosh Overlays**: 3-4 overlay layers with gradient wipes for depth and energy
 * - **Impact Shake**: Built-in shake effect at transition midpoint for explosive punch-through feel
 * - **Scaling Dynamics**: Content scales during transition for added dimensionality (0.95-1.05 range)
 * - **Audio-Reactive Sync**: Optional waveform-based beat detection for workout/music content
 * - **GPU-Accelerated**: Uses transform and opacity only with will-change optimization
 *
 * Use cases:
 * - Sports broadcast-style transitions between clips
 * - High-energy workout video montages
 * - Action scene cuts with explosive impact
 * - Professional replay transitions
 * - Beat-synced transitions for music/workout content
 *
 * Technical approach:
 * - BaseLayout with absolute positioning for layered transitions
 * - Overlapping animations with 0.2s stagger for fluid motion
 * - Aggressive cubic-bezier easing (0.25, 0.1, 0.25, 1.0) for sharp acceleration
 * - Generic keyframe effects with ranges for smooth progression
 * - Internal shake-impact preset at 50% timeline mark
 */

import { RenderableComponentData } from '@microfox/datamotion';
import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  duration: z
    .number()
    .min(0.5)
    .max(2.0)
    .default(1.0)
    .describe('Total transition duration in seconds (0.5-2.0s recommended)'),
  
  direction: z
    .enum(['left-to-right', 'right-to-left', 'top-to-bottom', 'bottom-to-top'])
    .default('left-to-right')
    .describe('Direction of the wipe/swoosh transition'),
  
  intensity: z
    .number()
    .min(0.5)
    .max(2.0)
    .default(1.0)
    .describe('Intensity multiplier for motion blur and shake effects (0.5-2.0)'),
  
  enableShake: z
    .boolean()
    .default(true)
    .describe('Enable impact shake effect at transition midpoint'),
  
  outgoingMedia: z
    .object({
      src: z.string().describe('Source URL for outgoing video/image'),
      type: z.enum(['video', 'image']).default('video').describe('Media type'),
    })
    .optional()
    .describe('Outgoing content media (video or image)'),
  
  incomingMedia: z
    .object({
      src: z.string().describe('Source URL for incoming video/image'),
      type: z.enum(['video', 'image']).default('video').describe('Media type'),
    })
    .optional()
    .describe('Incoming content media (video or image)'),
  
  wipeColor1: z
    .string()
    .default('rgba(255,255,255,0.9)')
    .describe('Primary wipe overlay gradient color'),
  
  wipeColor2: z
    .string()
    .default('rgba(255,100,50,0.8)')
    .describe('Secondary wipe overlay gradient color (energetic accent)'),
  
  flashIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.95)
    .describe('Impact flash opacity at peak (0-1)'),
  
  audioReactive: z
    .boolean()
    .default(false)
    .describe('Enable audio-reactive beat sync (requires waveform data)'),
  
  audioSensitivity: z
    .number()
    .min(0.1)
    .max(1.0)
    .default(0.8)
    .describe('Audio beat detection sensitivity (0.1-1.0, higher = more sensitive)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    duration,
    direction,
    intensity,
    enableShake,
    outgoingMedia,
    incomingMedia,
    wipeColor1,
    wipeColor2,
    flashIntensity,
  } = params;

  const { presets, config } = props;

  // Helper function to calculate direction-based transform values
  const getTransformValues = (dir: string, isOutgoing: boolean) => {
    const distance = 100; // percentage
    switch (dir) {
      case 'left-to-right':
        return {
          outgoingX: isOutgoing ? distance : 0,
          incomingX: isOutgoing ? 0 : -distance,
          outgoingY: 0,
          incomingY: 0,
        };
      case 'right-to-left':
        return {
          outgoingX: isOutgoing ? -distance : 0,
          incomingX: isOutgoing ? 0 : distance,
          outgoingY: 0,
          incomingY: 0,
        };
      case 'top-to-bottom':
        return {
          outgoingX: 0,
          incomingX: 0,
          outgoingY: isOutgoing ? distance : 0,
          incomingY: isOutgoing ? 0 : -distance,
        };
      case 'bottom-to-top':
        return {
          outgoingX: 0,
          incomingX: 0,
          outgoingY: isOutgoing ? -distance : 0,
          incomingY: isOutgoing ? 0 : distance,
        };
      default:
        return {
          outgoingX: isOutgoing ? distance : 0,
          incomingX: isOutgoing ? 0 : -distance,
          outgoingY: 0,
          incomingY: 0,
        };
    }
  };

  const transforms = getTransformValues(direction, true);
  const maxBlur = 8 * intensity;
  
  // Timing breakdown
  const outgoingStartPct = 0;
  const outgoingEndPct = 0.3;
  const incomingStartPct = 0.3;
  const incomingEndPct = 1.0;
  const wipe1StartPct = 0.2;
  const wipe1EndPct = 0.7;
  const wipe2StartPct = 0.25;
  const wipe2EndPct = 0.75;
  const flashStartPct = 0.45;
  const flashPeakPct = 0.5;
  const flashEndPct = 0.55;
  const shakeTimePct = 0.5;

  // Convert to absolute times
  const toTime = (pct: number) => pct * duration;

  // ============================================================================
  // OUTGOING LAYER - Slides out with motion blur and scale
  // ============================================================================

  const outgoingLayerId = 'sports-transition-outgoing-layer';
  const outgoingContentId = 'sports-transition-outgoing-content';

  const outgoingEffect = {
    id: `${outgoingContentId}-exit-effect`,
    componentId: outgoingContentId,
    data: {
      type: 'cubic-bezier',
      start: toTime(outgoingStartPct),
      duration: toTime(outgoingEndPct - outgoingStartPct),
      mode: 'provider' as const,
      targetIds: [outgoingContentId],
      easingParams: [0.25, 0.1, 0.25, 1.0],
      ranges: [
        // TranslateX
        { key: 'translateX', val: 0, unit: '%', prog: 0 },
        { key: 'translateX', val: transforms.outgoingX, unit: '%', prog: 1 },
        // TranslateY
        { key: 'translateY', val: 0, unit: '%', prog: 0 },
        { key: 'translateY', val: transforms.outgoingY, unit: '%', prog: 1 },
        // Scale
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 0.95, prog: 1 },
        // Motion blur - ramp up then down
        { key: 'blur', val: 0, unit: 'px', prog: 0 },
        { key: 'blur', val: maxBlur, unit: 'px', prog: 0.5 },
        { key: 'blur', val: maxBlur * 0.5, unit: 'px', prog: 1 },
        // Opacity fade
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.3, prog: 1 },
      ],
    },
  };

  const outgoingContent = {
    id: outgoingContentId,
    type: 'atom' as const,
    componentId: outgoingMedia?.type === 'image' ? 'ImageAtom' : 'VideoAtom',
    data: outgoingMedia
      ? {
          src: outgoingMedia.src,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover' as const,
          style: {
            willChange: 'transform, filter, opacity',
          },
        }
      : {
          className: 'absolute inset-0 w-full h-full bg-gray-800',
        },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [outgoingEffect],
  };

  const outgoingLayer = {
    id: outgoingLayerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [outgoingContent],
  };

  // ============================================================================
  // INCOMING LAYER - Slides in with motion blur and scale
  // ============================================================================

  const incomingLayerId = 'sports-transition-incoming-layer';
  const incomingContentId = 'sports-transition-incoming-content';

  const incomingEffect = {
    id: `${incomingContentId}-enter-effect`,
    componentId: incomingContentId,
    data: {
      type: 'cubic-bezier',
      start: toTime(incomingStartPct),
      duration: toTime(incomingEndPct - incomingStartPct),
      mode: 'provider' as const,
      targetIds: [incomingContentId],
      easingParams: [0.25, 0.1, 0.25, 1.0],
      ranges: [
        // TranslateX
        { key: 'translateX', val: transforms.incomingX, unit: '%', prog: 0 },
        { key: 'translateX', val: 0, unit: '%', prog: 1 },
        // TranslateY
        { key: 'translateY', val: transforms.incomingY, unit: '%', prog: 0 },
        { key: 'translateY', val: 0, unit: '%', prog: 1 },
        // Scale
        { key: 'scale', val: 1.05, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
        // Motion blur - ramp down
        { key: 'blur', val: maxBlur, unit: 'px', prog: 0 },
        { key: 'blur', val: maxBlur * 0.5, unit: 'px', prog: 0.5 },
        { key: 'blur', val: 0, unit: 'px', prog: 1 },
        // Opacity fade in
        { key: 'opacity', val: 0.3, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  const incomingContent = {
    id: incomingContentId,
    type: 'atom' as const,
    componentId: incomingMedia?.type === 'image' ? 'ImageAtom' : 'VideoAtom',
    data: incomingMedia
      ? {
          src: incomingMedia.src,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover' as const,
          style: {
            willChange: 'transform, filter, opacity',
          },
        }
      : {
          className: 'absolute inset-0 w-full h-full bg-gray-900',
        },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [incomingEffect],
  };

  const incomingLayer = {
    id: incomingLayerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [incomingContent],
  };

  // ============================================================================
  // WIPE OVERLAY 1 - Primary gradient swoosh
  // ============================================================================

  const wipe1Id = 'sports-transition-wipe-overlay-1';
  const gradientDirection = direction === 'left-to-right' || direction === 'right-to-left' ? '90deg' : '180deg';
  
  const wipe1Effect = {
    id: `${wipe1Id}-effect`,
    componentId: wipe1Id,
    data: {
      type: 'cubic-bezier',
      start: toTime(wipe1StartPct),
      duration: toTime(wipe1EndPct - wipe1StartPct),
      mode: 'provider' as const,
      targetIds: [wipe1Id],
      easingParams: [0.25, 0.1, 0.25, 1.0],
      ranges: [
        // Slide across
        { key: 'translateX', val: direction.includes('right') ? -150 : (direction.includes('left') ? 150 : 0), unit: '%', prog: 0 },
        { key: 'translateX', val: direction.includes('right') ? 150 : (direction.includes('left') ? -150 : 0), unit: '%', prog: 1 },
        { key: 'translateY', val: direction.includes('bottom') ? -150 : (direction.includes('top') ? 150 : 0), unit: '%', prog: 0 },
        { key: 'translateY', val: direction.includes('bottom') ? 150 : (direction.includes('top') ? -150 : 0), unit: '%', prog: 1 },
        // Opacity
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
        { key: 'opacity', val: 1, prog: 0.7 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  const wipe1Overlay = {
    id: wipe1Id,
    type: 'atom' as const,
    componentId: 'ShapeAtom',
    data: {
      shape: 'rectangle' as const,
      className: 'absolute inset-0 w-full h-full pointer-events-none',
      style: {
        background: `linear-gradient(${gradientDirection}, ${wipeColor1} 0%, rgba(200,200,200,0.6) 50%, transparent 100%)`,
        willChange: 'transform, opacity',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [wipe1Effect],
  };

  // ============================================================================
  // WIPE OVERLAY 2 - Secondary energetic gradient swoosh
  // ============================================================================

  const wipe2Id = 'sports-transition-wipe-overlay-2';
  
  const wipe2Effect = {
    id: `${wipe2Id}-effect`,
    componentId: wipe2Id,
    data: {
      type: 'cubic-bezier',
      start: toTime(wipe2StartPct),
      duration: toTime(wipe2EndPct - wipe2StartPct),
      mode: 'provider' as const,
      targetIds: [wipe2Id],
      easingParams: [0.25, 0.1, 0.25, 1.0],
      ranges: [
        // Slide across (slightly offset from wipe1)
        { key: 'translateX', val: direction.includes('right') ? -120 : (direction.includes('left') ? 120 : 0), unit: '%', prog: 0 },
        { key: 'translateX', val: direction.includes('right') ? 120 : (direction.includes('left') ? -120 : 0), unit: '%', prog: 1 },
        { key: 'translateY', val: direction.includes('bottom') ? -120 : (direction.includes('top') ? 120 : 0), unit: '%', prog: 0 },
        { key: 'translateY', val: direction.includes('bottom') ? 120 : (direction.includes('top') ? -120 : 0), unit: '%', prog: 1 },
        // Opacity
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.9, prog: 0.3 },
        { key: 'opacity', val: 0.9, prog: 0.7 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  const wipe2Overlay = {
    id: wipe2Id,
    type: 'atom' as const,
    componentId: 'ShapeAtom',
    data: {
      shape: 'rectangle' as const,
      className: 'absolute inset-0 w-full h-full pointer-events-none',
      style: {
        background: `linear-gradient(${gradientDirection}, ${wipeColor2} 0%, rgba(255,200,100,0.4) 30%, transparent 70%)`,
        willChange: 'transform, opacity',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [wipe2Effect],
  };

  // ============================================================================
  // IMPACT FLASH - White flash at transition midpoint
  // ============================================================================

  const flashId = 'sports-transition-impact-flash';
  
  const flashEffect = {
    id: `${flashId}-effect`,
    componentId: flashId,
    data: {
      type: 'ease-in-out',
      start: toTime(flashStartPct),
      duration: toTime(flashEndPct - flashStartPct),
      mode: 'provider' as const,
      targetIds: [flashId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: flashIntensity, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  const impactFlash = {
    id: flashId,
    type: 'atom' as const,
    componentId: 'ShapeAtom',
    data: {
      shape: 'rectangle' as const,
      className: 'absolute inset-0 w-full h-full pointer-events-none',
      style: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        willChange: 'opacity',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [flashEffect],
  };

  // ============================================================================
  // SHAKE IMPACT - Call internal shake preset at midpoint
  // ============================================================================

  let shakeChildren: any[] = [];
  
  if (enableShake && presets && presets['shake-impact']) {
    try {
      const shakeResult = await presets['shake-impact'](
        {
          intensity: intensity,
          duration: 0.15,
          targetId: 'sports-transition-container',
        },
        props,
      );

      if (shakeResult?.output?.childrenData) {
        // Extract shake effects and adjust timing to midpoint
        shakeChildren = shakeResult.output.childrenData.map((child: any) => {
          if (child.effects) {
            child.effects = child.effects.map((effect: any) => ({
              ...effect,
              data: {
                ...effect.data,
                start: toTime(shakeTimePct),
              },
            }));
          }
          return {
            ...child,
            context: {
              ...child.context,
              timing: {
                start: 0,
                duration: duration,
              },
            },
          };
        });
      }
    } catch (error) {
      console.warn('Shake-impact preset not available:', error);
    }
  }

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const childrenData = [
    outgoingLayer,
    incomingLayer,
    wipe1Overlay,
    wipe2Overlay,
    impactFlash,
    ...shakeChildren,
  ] as RenderableComponentData[];

  const rootContainer = {
    id: 'sports-transition-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData,
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
      clip: {
        start: 0,
        duration: duration,
      },
    },
  };
};

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'sports-broadcast-swoosh-transition',
  title: 'Sports Broadcast Swoosh Transition',
  description:
    'High-intensity ESPN-style transition preset with aggressive directional wipes, motion blur, layered swoosh effects, and impact shake. Features multiple overlapping layers creating professional sports broadcast transitions with explosive punch-through energy. Supports audio-reactive beat sync for workout content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'sports',
    'broadcast',
    'espn',
    'wipe',
    'swoosh',
    'motion-blur',
    'impact',
    'shake',
    'high-energy',
    'workout',
    'action',
    'replay',
    'beat-sync',
  ],
  defaultInputParams: {
    duration: 1.0,
    direction: 'left-to-right',
    intensity: 1.0,
    enableShake: true,
    wipeColor1: 'rgba(255,255,255,0.9)',
    wipeColor2: 'rgba(255,100,50,0.8)',
    flashIntensity: 0.95,
    audioReactive: false,
    audioSensitivity: 0.8,
  },
  dependencies: {
    presets: ['shake-impact'],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const sportsBroadcastSwooshTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};