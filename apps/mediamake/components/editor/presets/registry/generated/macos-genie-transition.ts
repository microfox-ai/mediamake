/**
 * macOS Genie Effect Video Transition Preset
 *
 * This preset creates a stunning macOS-style "genie effect" transition between two videos,
 * complete with a circular progress ring loader that appears during the transition.
 *
 * Features:
 * - **Iconic Genie Effect**: Outgoing video performs the classic macOS dock minimize animation
 *   - First compresses vertically (scaleY 1 → 0.1) while maintaining width
 *   - Then compresses horizontally (scaleX 1 → 0.1) creating the signature swoosh
 *   - Translates downward (translateY to 50%) for the swoosh motion path
 *   - Applies subtle blur during scaling for depth perception
 * - **Progress Ring Loader**: Circular SVG-based progress indicator
 *   - Appears during transition with fade in/out
 *   - Fills clockwise using stroke-dashoffset animation
 *   - Clean, minimal design with white stroke on transparent background
 * - **Spring-Bounce Entry**: Incoming video expands with elastic physics
 *   - Scales from 0 → 1.05 → 1.0 with overshoot
 *   - Uses custom cubic-bezier for authentic spring feel
 *   - Includes blur-to-clear effect for professional polish
 * - **Precise Timing Control**: 1 second overlap period with choreographed effects
 *
 * Use cases:
 * - Creating macOS-inspired video transitions
 * - Building polished UI-style video experiences
 * - Adding recognizable brand-style effects to content
 * - Professional video editing with signature transitions
 *
 * Technical Implementation:
 * - BaseLayout container with 3s total duration (2s + 2s - 1s overlap)
 * - Outgoing video: 0-2s with complex multi-stage transform effects
 * - Progress ring: 0.5-2s with opacity fade in/out
 * - Incoming video: 1-3s with spring scale and blur effects
 * - All effects use 'provider' mode with targetIds for clean DOM structure
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Duration of the transition overlap in seconds'),
  progressRingSize: z
    .number()
    .default(120)
    .describe('Size of the progress ring in pixels'),
  progressRingStrokeWidth: z
    .number()
    .default(8)
    .describe('Width of the progress ring stroke'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration, progressRingSize, progressRingStrokeWidth } = params;

  // Calculate total duration with overlap
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Calculate timing markers
  const outgoingStart = 0;
  const outgoingDuration = outgoingVideo.duration;
  const progressStart = transitionDuration * 0.5; // Start halfway before transition
  const progressDuration = transitionDuration + (transitionDuration * 0.5);
  const incomingStart = outgoingVideo.duration - transitionDuration;
  const incomingDuration = incomingVideo.duration + transitionDuration;

  // Genie effect timing breakdown
  const genieScaleYDuration = transitionDuration * 0.6; // First 60% for vertical compression
  const genieScaleXStart = genieScaleYDuration; // Start horizontal compression after vertical
  const genieScaleXDuration = transitionDuration * 0.4; // Last 40% for horizontal compression

  // Progress ring SVG calculations
  const radius = (progressRingSize - progressRingStrokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = progressRingSize / 2;

  // Create progress ring HTML with inline animation
  const progressRingHTML = `
    <svg width="${progressRingSize}" height="${progressRingSize}" viewBox="0 0 ${progressRingSize} ${progressRingSize}" style="transform: rotate(-90deg);">
      <circle 
        cx="${center}" 
        cy="${center}" 
        r="${radius}" 
        fill="none" 
        stroke="rgba(255,255,255,0.2)" 
        stroke-width="${progressRingStrokeWidth}"
      />
      <circle 
        cx="${center}" 
        cy="${center}" 
        r="${radius}" 
        fill="none" 
        stroke="#ffffff" 
        stroke-width="${progressRingStrokeWidth}" 
        stroke-linecap="round" 
        stroke-dasharray="${circumference}" 
        stroke-dashoffset="${circumference}"
        style="
          animation: progressFill ${progressDuration}s linear forwards;
        "
      />
      <style>
        @keyframes progressFill {
          0% { stroke-dashoffset: ${circumference}; }
          100% { stroke-dashoffset: 0; }
        }
      </style>
    </svg>
  `;

  // Build outgoing video with genie effect
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'macos-genie-outgoing-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
          transformOrigin: 'center bottom',
        },
      },
    },
    context: {
      timing: {
        start: outgoingStart,
        duration: outgoingDuration,
      },
    },
    childrenData: [
      {
        id: 'macos-genie-outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          fit: 'cover',
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
      // Vertical compression (scaleY: 1 → 0.1)
      {
        id: 'genie-scaleY',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
          start: outgoingDuration - transitionDuration,
          duration: genieScaleYDuration,
          mode: 'provider',
          targetIds: ['macos-genie-outgoing-container'],
          ranges: [
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: 0.1, prog: 1 },
          ],
        },
      },
      // Horizontal compression (scaleX: 1 → 0.1)
      {
        id: 'genie-scaleX',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
          start: outgoingDuration - transitionDuration + genieScaleXStart,
          duration: genieScaleXDuration,
          mode: 'provider',
          targetIds: ['macos-genie-outgoing-container'],
          ranges: [
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: 0.1, prog: 1 },
          ],
        },
      },
      // Swoosh motion path (translateY to 50%)
      {
        id: 'genie-translateY',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
          start: outgoingDuration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['macos-genie-outgoing-container'],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '50%', prog: 1 },
          ],
        },
      },
      // Blur for depth
      {
        id: 'genie-blur',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: outgoingDuration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['macos-genie-outgoing-container'],
          ranges: [
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: 4, prog: 1 },
          ],
        },
      },
      // Fade out at the end
      {
        id: 'genie-fadeout',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: outgoingDuration - (transitionDuration * 0.25),
          duration: transitionDuration * 0.25,
          mode: 'provider',
          targetIds: ['macos-genie-outgoing-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Build progress ring loader
  const progressRingContainer: RenderableComponentData = {
    id: 'macos-genie-progress-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
        style: {
          zIndex: 20,
        },
      },
    },
    context: {
      timing: {
        start: progressStart,
        duration: progressDuration,
      },
    },
    childrenData: [
      {
        id: 'macos-genie-progress-ring',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: progressRingHTML,
          className: 'progress-ring',
        },
        context: {
          timing: {
            start: 0,
            duration: progressDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Fade in and out
      {
        id: 'progress-opacity',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: progressDuration,
          mode: 'provider',
          targetIds: ['macos-genie-progress-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Build incoming video with spring-bounce effect
  const incomingVideoContainer: RenderableComponentData = {
    id: 'macos-genie-incoming-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 5,
          transformOrigin: 'center center',
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
        id: 'macos-genie-incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          fit: 'cover',
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
      // Spring scale with overshoot (0 → 1.05 → 1)
      {
        id: 'incoming-spring-scale',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          start: 0,
          duration: transitionDuration * 1.2,
          mode: 'provider',
          targetIds: ['macos-genie-incoming-container'],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1.05, prog: 0.8 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Blur to clear
      {
        id: 'incoming-blur',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration * 1.2,
          mode: 'provider',
          targetIds: ['macos-genie-incoming-container'],
          ranges: [
            { key: 'blur', val: 4, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
      // Fade in
      {
        id: 'incoming-fadein',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: transitionDuration * 0.6,
          mode: 'provider',
          targetIds: ['macos-genie-incoming-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'macos-genie-root',
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
    childrenData: [
      outgoingVideoContainer,
      progressRingContainer,
      incomingVideoContainer,
    ],
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
  id: 'macos-genie-transition',
  title: 'macOS Genie Effect Video Transition',
  description:
    'macOS-style genie effect transition between videos with circular progress ring loader. Features iconic vertical-to-horizontal compression with swoosh motion path, spring-bounce incoming animation, and clockwise-filling progress indicator.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'video', 'macos', 'genie', 'progress', 'spring', 'animation'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.0,
    progressRingSize: 120,
    progressRingStrokeWidth: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const macosGenieTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
