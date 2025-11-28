/**
 * Masking Tape Rollout Transition Preset
 *
 * Creates a dynamic masking tape dispenser that rolls horizontally across the screen,
 * unrolling tape to cover the outgoing video, then continues rolling to reveal the incoming video.
 * Features 3D perspective, realistic physics including slight bounce at edges, visible tape thickness,
 * dynamic shadows, and synchronized adhesive sound effects.
 *
 * Features:
 * - 3D rolling tape dispenser with preserve-3d transform
 * - Rolling motion from left to right with 720-degree rotation
 * - Multiple tape strips that expand and contract sequentially
 * - Realistic skew transforms during tape expansion/contraction
 * - Subtle bounce physics when hitting screen edges
 * - Visible tape thickness and shadow effects
 * - Synchronized crinkle, stick, and unstick sound effects
 * - 1.8-second transition duration with precise timing
 *
 * Use cases:
 * - Creative transitions between video clips
 * - Playful handmade aesthetic for video edits
 * - Unique masking tape rollout reveal effects
 * - DIY/craft-style video transitions
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    startFrom: z.number().optional().describe('Start time of outgoing video (seconds)'),
    endAt: z.number().optional().describe('End time of outgoing video (seconds)'),
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    startFrom: z.number().optional().describe('Start time of incoming video (seconds)'),
  }).describe('Incoming video configuration'),
  
  transitionDuration: z.number().default(1.8).describe('Duration of the tape rollout transition (seconds)'),
  
  tapeColor: z.string().default('#fef3c7').describe('Color of the masking tape (default: amber-100)'),
  tapeTrailColor: z.string().default('#fefce8').describe('Color of the tape trail (default: yellow-50)'),
  
  crinkleSoundSrc: z.string().optional().describe('Source URL for tape crinkle sound effect'),
  stickSoundSrc: z.string().optional().describe('Source URL for tape stick sound effect'),
  unstickSoundSrc: z.string().optional().describe('Source URL for tape unstick sound effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    tapeColor,
    tapeTrailColor,
    crinkleSoundSrc,
    stickSoundSrc,
    unstickSoundSrc,
  } = params;

  // Calculate total duration (outgoing duration + transition overlap)
  const outgoingDuration = outgoingVideo.endAt 
    ? outgoingVideo.endAt - (outgoingVideo.startFrom || 0)
    : transitionDuration;
  
  const totalDuration = outgoingDuration;

  // Helper: Create tape strip with expansion/contraction animation
  const createTapeStrip = (index: number) => {
    const stripDelay = index * 0.1; // 100ms stagger between strips
    const expansionDuration = 0.9;
    const contractionStart = expansionDuration;
    const contractionDuration = 0.9;

    return {
      id: `tape-strip-${index}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class='w-full h-full' style='background-color: ${tapeTrailColor}; opacity: 0.9;'></div>`,
        className: 'absolute h-full',
        style: {
          left: 0,
          top: 0,
          width: '0%',
        },
      },
      context: {
        timing: {
          start: stripDelay,
          duration: expansionDuration + contractionDuration,
        },
      },
      effects: [
        // Expansion effect
        {
          id: `tape-strip-${index}-expand`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: expansionDuration,
            mode: 'provider',
            targetIds: [`tape-strip-${index}`],
            ranges: [
              { key: 'width', val: '0%', prog: 0 },
              { key: 'width', val: '100%', prog: 1 },
              { key: 'skewX', val: '5deg', prog: 0 },
              { key: 'skewX', val: '0deg', prog: 0.5 },
              { key: 'skewX', val: '-2deg', prog: 1 },
            ],
          },
        },
        // Contraction effect
        {
          id: `tape-strip-${index}-contract`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: contractionStart,
            duration: contractionDuration,
            mode: 'provider',
            targetIds: [`tape-strip-${index}`],
            ranges: [
              { key: 'width', val: '100%', prog: 0 },
              { key: 'width', val: '0%', prog: 1 },
              { key: 'skewX', val: '-2deg', prog: 0 },
              { key: 'skewX', val: '0deg', prog: 0.5 },
              { key: 'skewX', val: '5deg', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Create 8 tape strips with sequential timing
  const tapeStrips = Array.from({ length: 8 }, (_, i) => createTapeStrip(i));

  // Create rolling tape dispenser
  const tapeDispenser: RenderableComponentData = {
    id: 'tape-roll-dispenser',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class='w-24 h-24 rounded-full shadow-xl' style='background-color: ${tapeColor}; transform-style: preserve-3d;'></div>`,
      className: 'absolute',
      style: {
        top: '50%',
        left: '-96px',
        transform: 'translateY(-50%)',
        zIndex: 20,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'tape-roll-animation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['tape-roll-dispenser'],
          ranges: [
            // Move from left to right
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: 'calc(100vw + 96px)', prog: 1 },
            // Rotate 720 degrees (2 full rotations)
            { key: 'rotateZ', val: '0deg', prog: 0 },
            { key: 'rotateZ', val: '720deg', prog: 1 },
            // Slight bounce at edges
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: '-10px', prog: 0.05 },
            { key: 'translateY', val: '0px', prog: 0.1 },
            { key: 'translateY', val: '0px', prog: 0.9 },
            { key: 'translateY', val: '-10px', prog: 0.95 },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        },
      },
    ],
  };

  // Create tape trail container with all strips
  const tapeTrailContainer: RenderableComponentData = {
    id: 'tape-trail-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: tapeStrips,
  };

  // Create audio effects container
  const audioEffects: RenderableComponentData[] = [];

  if (crinkleSoundSrc) {
    audioEffects.push({
      id: 'crinkle-sound',
      type: 'atom' as const,
      componentId: 'AudioAtom',
      data: {
        src: crinkleSoundSrc,
        volume: 0.5,
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData);
  }

  if (stickSoundSrc) {
    audioEffects.push({
      id: 'stick-sound',
      type: 'atom' as const,
      componentId: 'AudioAtom',
      data: {
        src: stickSoundSrc,
        volume: 0.7,
      },
      context: {
        timing: {
          start: 0.6,
          duration: 0.5,
        },
      },
    } as RenderableComponentData);
  }

  if (unstickSoundSrc) {
    audioEffects.push({
      id: 'unstick-sound',
      type: 'atom' as const,
      componentId: 'AudioAtom',
      data: {
        src: unstickSoundSrc,
        volume: 0.6,
      },
      context: {
        timing: {
          start: 1.4,
          duration: 0.4,
        },
      },
    } as RenderableComponentData);
  }

  const audioEffectsContainer: RenderableComponentData = {
    id: 'audio-effects-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: audioEffects,
  };

  // Create tape animation container with dispenser and trail
  const tapeAnimationContainer: RenderableComponentData = {
    id: 'tape-animation-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [tapeTrailContainer, tapeDispenser],
  };

  // Create outgoing video
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      startFrom: outgoingVideo.startFrom || 0,
      endAt: outgoingVideo.endAt,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      style: {
        zIndex: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
  };

  // Create incoming video (starts at transition point)
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      startFrom: incomingVideo.startFrom || 0,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      style: {
        zIndex: 0,
      },
    },
    context: {
      timing: {
        start: outgoingDuration - transitionDuration,
        duration: transitionDuration * 2,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'masking-tape-transition-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideoNode,
      incomingVideoNode,
      tapeAnimationContainer,
      audioEffectsContainer,
    ],
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

const presetMetadata: PresetMetadata = {
  id: 'masking-tape-rollout-transition',
  title: 'Masking Tape Rollout Transition',
  description: 'A 3D masking tape dispenser rolls horizontally across the screen, leaving a trail of tape that covers the outgoing video, then unrolls to reveal the incoming video. Features realistic physics with bounce effects, visible tape thickness, shadows, and synchronized adhesive sound effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'tape', 'masking-tape', '3d', 'rollout', 'creative', 'handmade'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
      endAt: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
    },
    transitionDuration: 1.8,
    tapeColor: '#fef3c7',
    tapeTrailColor: '#fefce8',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const maskingTapeRolloutTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};