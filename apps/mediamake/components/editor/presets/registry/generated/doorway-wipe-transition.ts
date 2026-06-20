/**
 * Doorway Wipe Transition Preset
 *
 * Creates a sophisticated three-layer doorway wipe transition that simulates
 * sliding through connected rooms. The transition features:
 *
 * - Outgoing video slides left with ease-in acceleration, revealing a doorway
 * - Dark doorway frame with rounded corners stays visible for 0.5s (threshold effect)
 * - Incoming video slides in from right with ease-out deceleration
 * - Motion blur applied during movement phases to enhance speed sensation
 * - Natural motion flow with contrasting easing curves
 *
 * Technical approach:
 * - Single BaseLayout container with black background and overflow hidden
 * - Three video atoms: outgoing (slides left), incoming (slides right), both with motion blur
 * - Doorway frame created with HTMLBlockAtom (gray rounded rectangle, centered)
 * - Effects use provider mode with targetIds for direct component targeting
 * - Transform translateX for horizontal sliding motion
 * - Filter blur for motion blur effect synchronized with movement
 * - Opacity fade for doorway frame appearance/disappearance
 *
 * Use cases:
 * - Cinematic transitions between video clips
 * - Spatial storytelling (moving through locations)
 * - Room-to-room navigation effects
 * - Architecture/interior design videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video that slides left'),
  
  outgoingVideoDuration: z
    .number()
    .positive()
    .describe('Duration of the outgoing video in seconds'),
  
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video that slides in from right'),
  
  incomingVideoDuration: z
    .number()
    .positive()
    .describe('Duration of the incoming video in seconds'),
  
  transitionDuration: z
    .number()
    .default(1.2)
    .describe('Total duration of the transition overlap in seconds'),
  
  doorwayWidth: z
    .number()
    .default(128)
    .describe('Width of the doorway frame in pixels (default 128px = w-32)'),
  
  doorwayColor: z
    .string()
    .default('#1f2937')
    .describe('Color of the doorway frame (default gray-900)'),
  
  doorwayBorderRadius: z
    .number()
    .default(16)
    .describe('Border radius of doorway corners in pixels'),
  
  doorwayVisibleDuration: z
    .number()
    .default(0.5)
    .describe('Duration the doorway frame stays fully visible in seconds'),
  
  motionBlurIntensity: z
    .number()
    .default(4)
    .describe('Maximum blur intensity in pixels during motion'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters
  const {
    outgoingVideoSrc,
    outgoingVideoDuration,
    incomingVideoSrc,
    incomingVideoDuration,
    transitionDuration,
    doorwayWidth,
    doorwayColor,
    doorwayBorderRadius,
    doorwayVisibleDuration,
    motionBlurIntensity,
  } = params;

  // Calculate total composition duration
  // Formula: video1.duration + video2.duration - overlap
  const totalDuration =
    outgoingVideoDuration + incomingVideoDuration - transitionDuration;

  // Timing calculations for doorway frame
  // Doorway appears at 0.5s, stays visible for doorwayVisibleDuration, fades out by 1.5s
  const doorwayFadeInStart = 0.5;
  const doorwayFadeInDuration = 0.5;
  const doorwayFullyVisibleAt = doorwayFadeInStart + doorwayFadeInDuration; // 1s
  const doorwayFadeOutStart = doorwayFullyVisibleAt + doorwayVisibleDuration; // 1.5s
  const doorwayFadeOutDuration = 0.5;

  // Outgoing video: slides left from 0 to -100% over 0-1.2s
  const outgoingSlideStart = 0;
  const outgoingSlideDuration = transitionDuration; // 1.2s

  // Incoming video: slides right from 100% to 0 over 0.8s-2s
  const incomingSlideStart = 0.8;
  const incomingSlideDuration = 1.2; // 2s - 0.8s

  // ============================================================================
  // OUTGOING VIDEO (slides left with ease-in, motion blur)
  // ============================================================================

  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full',
      style: {
        zIndex: 1,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideoDuration,
      },
    },
    effects: [
      // Slide left effect (0 to -100%)
      {
        id: 'outgoing-slide-left',
        componentId: 'generic',
        data: {
          type: 'ease-in', // Ease-in for acceleration
          start: outgoingSlideStart,
          duration: outgoingSlideDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '-100%', prog: 1 },
          ],
        },
      },
      // Motion blur during slide (0px -> 4px -> 0px)
      {
        id: 'outgoing-motion-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingSlideStart,
          duration: outgoingSlideDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${motionBlurIntensity}px)`, prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // ============================================================================
  // DOORWAY FRAME (HTMLBlockAtom with rounded rectangle)
  // ============================================================================

  const doorwayFrame: RenderableComponentData = {
    id: 'doorway-frame',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <div style="
          width: 100%;
          height: 100%;
          background-color: ${doorwayColor};
          border-radius: ${doorwayBorderRadius}px;
        "></div>
      `,
      className: 'absolute inset-y-0 left-1/2 -translate-x-1/2',
      style: {
        width: `${doorwayWidth}px`,
        zIndex: 2,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Fade in: opacity 0->1 over 0.5s-1s
      {
        id: 'doorway-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: doorwayFadeInStart,
          duration: doorwayFadeInDuration,
          mode: 'provider',
          targetIds: ['doorway-frame'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Fade out: opacity 1->0 over 1.5s-2s
      {
        id: 'doorway-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: doorwayFadeOutStart,
          duration: doorwayFadeOutDuration,
          mode: 'provider',
          targetIds: ['doorway-frame'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // ============================================================================
  // INCOMING VIDEO (slides right with ease-out, motion blur)
  // ============================================================================

  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full',
      style: {
        zIndex: 0,
      },
    },
    context: {
      timing: {
        start: outgoingVideoDuration - transitionDuration, // Overlap start
        duration: incomingVideoDuration + transitionDuration,
      },
    },
    effects: [
      // Slide in from right (100% to 0%)
      {
        id: 'incoming-slide-right',
        componentId: 'generic',
        data: {
          type: 'ease-out', // Ease-out for deceleration
          start: incomingSlideStart - (outgoingVideoDuration - transitionDuration), // Relative to incoming video start
          duration: incomingSlideDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'translateX', val: '100%', prog: 0 },
            { key: 'translateX', val: '0%', prog: 1 },
          ],
        },
      },
      // Motion blur during slide (0px -> 4px -> 0px)
      {
        id: 'incoming-motion-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: incomingSlideStart - (outgoingVideoDuration - transitionDuration),
          duration: incomingSlideDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${motionBlurIntensity}px)`, prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'doorway-transition-container',
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
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideo, doorwayFrame, incomingVideo],
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
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'doorway-wipe-transition',
  title: 'Doorway Wipe Transition',
  description:
    'A three-layer doorway wipe transition that creates the illusion of sliding through connected rooms. Features an outgoing video that slides left with ease-in acceleration revealing a dark doorway frame with rounded corners, followed by an incoming video sliding in from right with ease-out deceleration. The doorway frame creates a momentary "threshold" effect by pausing in place for 0.5 seconds. Motion blur enhances the speed sensation during movement phases.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'doorway', 'wipe', 'slide', 'cinematic', 'motion-blur'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    outgoingVideoDuration: 5,
    incomingVideoSrc: 'https://example.com/video2.mp4',
    incomingVideoDuration: 5,
    transitionDuration: 1.2,
    doorwayWidth: 128,
    doorwayColor: '#1f2937',
    doorwayBorderRadius: 16,
    doorwayVisibleDuration: 0.5,
    motionBlurIntensity: 4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const doorwayWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
