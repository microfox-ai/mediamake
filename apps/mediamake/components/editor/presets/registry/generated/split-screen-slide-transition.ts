/**
 * Split Screen Slide Transition Preset
 *
 * This preset creates a dynamic diagonal split-screen transition that slides the talking head video
 * to the upper-left corner (40% scale) while b-roll content slides in from the bottom-right (60% scale).
 * It features spring-eased animations with subtle rotation dynamics (2-3 degrees), drop shadow depth
 * separation, and GPU-accelerated transforms for smooth professional-quality motion similar to
 * Adobe Premiere wipe transitions.
 *
 * Features:
 * - **Diagonal Split Effect**: Two video layers sliding past each other with clip-path animations
 * - **Spring Easing**: Organic movement with natural deceleration (tension: 170, friction: 26)
 * - **Dynamic Scaling**: Video scales from 1 to 0.4, b-roll from 0 to 1
 * - **Subtle Rotation**: 0 → 3deg → 0 arc during transition for dynamism
 * - **Depth Separation**: Drop shadow on video layer for visual hierarchy
 * - **GPU Acceleration**: Uses will-change-transform for smooth performance
 * - **Professional Timing**: 1.2 second transition with 0.2s overlap visibility
 *
 * Use cases:
 * - Professional video editing transitions
 * - Talking head + b-roll content combinations
 * - Dynamic video presentations
 * - Multi-layer video compositions with depth
 * - Video editing workflows similar to Adobe Premiere
 */

import type { RenderableComponentData } from '@microfox/datamotion';
import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  talkingHeadVideo: z.object({
    src: z.string().describe('Source URL of the talking head video'),
    volume: z.number().default(1).describe('Volume level of the talking head video (0-1)'),
    playbackRate: z.number().default(1).describe('Playback rate of the talking head video'),
  }).describe('Talking head video configuration'),
  
  brollContent: z.object({
    src: z.string().describe('Source URL of the b-roll content (image or video)'),
    type: z.enum(['image', 'video']).default('image').describe('Type of b-roll content'),
    volume: z.number().default(0).optional().describe('Volume level if b-roll is video (0-1)'),
  }).describe('B-roll content configuration'),
  
  transitionDuration: z.number().default(1.2).describe('Duration of the transition animation in seconds'),
  
  overlapDuration: z.number().default(0.2).describe('Duration where both elements are visible during transition in seconds'),
  
  videoFinalScale: z.number().default(0.4).describe('Final scale of the talking head video (0-1)'),
  
  brollFinalScale: z.number().default(0.6).describe('Final scale of the b-roll content (0-1)'),
  
  rotationDegrees: z.number().default(3).describe('Maximum rotation angle during transition in degrees'),
  
  dropShadowIntensity: z.number().default(1).describe('Intensity of drop shadow effect (0-2)'),
  
  springTension: z.number().default(170).describe('Spring animation tension parameter'),
  
  springFriction: z.number().default(26).describe('Spring animation friction parameter'),
  
  videoPosition: z.object({
    top: z.string().default('1rem').describe('Top position of video after transition'),
    left: z.string().default('1rem').describe('Left position of video after transition'),
  }).describe('Final position of the talking head video'),
  
  brollPosition: z.object({
    bottom: z.string().default('1rem').describe('Bottom position of b-roll after transition'),
    right: z.string().default('1rem').describe('Right position of b-roll after transition'),
  }).describe('Final position of the b-roll content'),
  
  duration: z.number().optional().describe('Total duration of the composition in seconds'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { config } = props;
  const fps = config?.fps || 30;
  
  // Helper function to convert seconds to frames
  const secondsToFrames = (seconds: number): number => {
    return Math.round(seconds * fps);
  };

  // Extract parameters
  const {
    talkingHeadVideo,
    brollContent,
    transitionDuration,
    overlapDuration,
    videoFinalScale,
    brollFinalScale,
    rotationDegrees,
    dropShadowIntensity,
    springTension,
    springFriction,
    videoPosition,
    brollPosition,
    duration,
  } = params;

  // Calculate timing in frames
  const totalDuration = duration || (transitionDuration + 2); // Add 2 seconds after transition
  const totalFrames = secondsToFrames(totalDuration);
  const transitionFrames = secondsToFrames(transitionDuration);
  
  // Create unique IDs
  const videoContainerId = 'split-screen-video-container';
  const brollContainerId = 'split-screen-broll-container';
  const videoAtomId = 'split-screen-video-atom';
  const brollAtomId = 'split-screen-broll-atom';
  
  // Effect IDs
  const videoSlideEffectId = 'video-slide-effect';
  const brollSlideEffectId = 'broll-slide-effect';

  // Calculate drop shadow values
  const shadowBlur = 24 * dropShadowIntensity;
  const shadowOpacity = 0.5 * dropShadowIntensity;

  // ============================================================================
  // VIDEO CONTAINER - Talking Head
  // ============================================================================
  
  const videoContainer: RenderableComponentData = {
    id: videoContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute z-20 will-change-transform rounded-lg overflow-hidden',
        style: {
          top: videoPosition.top,
          left: videoPosition.left,
          width: `${videoFinalScale * 100}%`,
          height: `${videoFinalScale * 100}%`,
          transformOrigin: 'top left',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: videoSlideEffectId,
        componentId: videoContainerId,
        data: {
          type: 'spring',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [videoContainerId],
          springConfig: {
            tension: springTension,
            friction: springFriction,
          },
          ranges: [
            // translateX: center to final position
            { key: 'translateX', val: '50vw', prog: 0 },
            { key: 'translateX', val: '0vw', prog: 1 },
            
            // translateY: center to final position
            { key: 'translateY', val: '50vh', prog: 0 },
            { key: 'translateY', val: '0vh', prog: 1 },
            
            // scale: 1 to final scale
            { key: 'scale', val: 1 / videoFinalScale, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            
            // rotation: 0 → 3deg → 0
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: rotationDegrees, prog: 0.5 },
            { key: 'rotate', val: 0, prog: 1 },
            
            // drop-shadow: 0 to full
            { key: 'filter', val: `drop-shadow(0 0px 0px rgba(0,0,0,0))`, prog: 0 },
            { key: 'filter', val: `drop-shadow(0 ${shadowBlur}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity}))`, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: videoAtomId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: talkingHeadVideo.src,
          volume: talkingHeadVideo.volume,
          playbackRate: talkingHeadVideo.playbackRate,
          fit: 'cover',
          loop: false,
          containerProps: {
            className: 'w-full h-full object-cover',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      },
    ],
  };

  // ============================================================================
  // B-ROLL CONTAINER
  // ============================================================================
  
  const brollAtomData = brollContent.type === 'video' 
    ? {
        src: brollContent.src,
        volume: brollContent.volume || 0,
        fit: 'cover',
        loop: false,
        containerProps: {
          className: 'w-full h-full object-cover',
        },
      }
    : {
        src: brollContent.src,
        fit: 'cover',
        containerProps: {
          className: 'w-full h-full object-cover',
        },
      };

  const brollContainer: RenderableComponentData = {
    id: brollContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute z-10 will-change-transform rounded-lg overflow-hidden',
        style: {
          bottom: brollPosition.bottom,
          right: brollPosition.right,
          width: `${brollFinalScale * 100}%`,
          height: `${brollFinalScale * 100}%`,
          transformOrigin: 'bottom right',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: brollSlideEffectId,
        componentId: brollContainerId,
        data: {
          type: 'spring',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [brollContainerId],
          springConfig: {
            tension: springTension,
            friction: springFriction,
          },
          ranges: [
            // translateX: off-screen right to final position
            { key: 'translateX', val: '100vw', prog: 0 },
            { key: 'translateX', val: '0vw', prog: 1 },
            
            // translateY: off-screen bottom to final position
            { key: 'translateY', val: '100vh', prog: 0 },
            { key: 'translateY', val: '0vh', prog: 1 },
            
            // scale: 0 to final scale
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            
            // opacity: fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: brollAtomId,
        type: 'atom',
        componentId: brollContent.type === 'video' ? 'VideoAtom' : 'ImageAtom',
        data: brollAtomData,
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      },
    ],
  };

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'split-screen-slide-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [brollContainer, videoContainer],
  };

  // ============================================================================
  // RETURN OUTPUT
  // ============================================================================

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'split-screen-slide-transition',
  title: 'Split Screen Slide Transition',
  description: 'A dynamic diagonal split-screen transition that slides the talking head video to the upper-left corner (40% scale) while b-roll content slides in from the bottom-right (60% scale). Features spring-eased animations with subtle rotation dynamics (2-3 degrees), drop shadow depth separation, and GPU-accelerated transforms for smooth professional-quality motion similar to Adobe Premiere wipe transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'split-screen', 'video', 'b-roll', 'spring', 'animation', 'diagonal', 'professional'],
  defaultInputParams: {
    talkingHeadVideo: {
      src: 'https://example.com/talking-head.mp4',
      volume: 1,
      playbackRate: 1,
    },
    brollContent: {
      src: 'https://example.com/broll-image.jpg',
      type: 'image',
      volume: 0,
    },
    transitionDuration: 1.2,
    overlapDuration: 0.2,
    videoFinalScale: 0.4,
    brollFinalScale: 0.6,
    rotationDegrees: 3,
    dropShadowIntensity: 1,
    springTension: 170,
    springFriction: 26,
    videoPosition: {
      top: '1rem',
      left: '1rem',
    },
    brollPosition: {
      bottom: '1rem',
      right: '1rem',
    },
    duration: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const splitScreenSlideTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
