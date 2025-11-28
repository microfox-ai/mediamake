/** 
 * Explosive Quad-Split Shatter Transition Preset
 *
 * This preset creates a dramatic transition where four video panels undergo an intense shake, 
 * then shatter outward in different directions with rotating debris and particle-like shadows, 
 * revealing a focused single video that scales up from behind.
 *
 * Features:
 * - Stable quad panel layout with configurable fade-in
 * - Intense 5-frame shake at 60fps (83ms) at the 0.5s mark
 * - Directional scatter with rotation and scaling (panels move off-screen)
 * - Particle-like shadow effects during scatter
 * - Selected video scales from 50% to 100% during the transition
 * - Total duration: 1.8 seconds
 * - Overlap period starts at 0.5s (shake moment)
 *
 * Technical Details:
 * - BaseLayout with overflow-visible to allow off-screen movement
 * - Four VideoAtoms at 50% width/height positioned in quadrants
 * - Shake effect: rapid translateX/Y alternating ±5px over 83ms
 * - Scatter effect: translate 200% in direction, rotate 15-45deg, scale to 0, opacity to 0
 * - Multiple box-shadow values for particle effect
 * - Selected video at z-index 0, panels at z-index 10
 *
 * Use cases:
 * - Dynamic video transitions with impact
 * - Breaking news or reveal moments
 * - Content highlighting from multiple sources
 * - Dramatic scene changes
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfx/datamotion';

const presetParams = z.object({
  videoTopLeftSrc: z.string().describe('Top-left video source URL'),
  videoTopRightSrc: z.string().describe('Top-right video source URL'),
  videoBottomLeftSrc: z.string().describe('Bottom-left video source URL'),
  videoBottomRightSrc: z.string().describe('Bottom-right video source URL'),
  videoSelectedSrc: z.string().describe('Selected focused video source URL'),
  
  transitionDuration: z.number().default(1.8).describe('Total transition duration in seconds'),
  stablePhase: z.number().default(0.5).describe('Duration of stable phase before shake (seconds)'),
  shakeDuration: z.number().default(0.083).describe('Duration of shake effect in seconds (5 frames at 60fps)'),
  
  shakeIntensity: z.number().default(5).describe('Shake intensity in pixels'),
  scatterDistance: z.number().default(200).describe('Scatter distance in percentage'),
  rotationMin: z.number().default(15).describe('Minimum rotation angle in degrees'),
  rotationMax: z.number().default(45).describe('Maximum rotation angle in degrees'),
  
  selectedVideoInitialScale: z.number().default(0.5).describe('Initial scale of selected video'),
  selectedVideoFinalScale: z.number().default(1).describe('Final scale of selected video'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    videoTopLeftSrc,
    videoTopRightSrc,
    videoBottomLeftSrc,
    videoBottomRightSrc,
    videoSelectedSrc,
    transitionDuration,
    stablePhase,
    shakeDuration,
    shakeIntensity,
    scatterDistance,
    rotationMin,
    rotationMax,
    selectedVideoInitialScale,
    selectedVideoFinalScale,
  } = params;

  // Calculate phases
  const scatterPhaseStart = stablePhase + shakeDuration;
  const scatterDuration = transitionDuration - scatterPhaseStart;

  // Randomize rotation for each panel (within specified range)
  const rotationTopLeft = -rotationMax;
  const rotationTopRight = rotationMax;
  const rotationBottomLeft = -rotationMin;
  const rotationBottomRight = rotationMax;

  const childrenData: RenderableComponentData[] = [
    // Selected video container (background layer, z-index 0)
    {
      id: 'selected-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            zIndex: 0,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        // Scale from 50% to 100% during scatter phase
        {
          id: 'reveal-effect-selected',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: stablePhase, // Start at shake moment
            duration: scatterDuration,
            mode: 'provider',
            targetIds: ['selected-video-container'],
            ranges: [
              { key: 'scale', val: selectedVideoInitialScale, prog: 0 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'scale', val: selectedVideoFinalScale, prog: 1 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'selected-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: videoSelectedSrc,
            fit: 'cover',
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
      ],
    },

    // Top-left panel
    {
      id: 'quad-panel-top-left',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '50%',
            height: '50%',
            top: '0%',
            left: '0%',
            zIndex: 10,
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
      effects: [
        // Shake effect
        {
          id: 'shake-effect-top-left',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: stablePhase,
            duration: shakeDuration,
            mode: 'provider',
            targetIds: ['quad-panel-top-left'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateX', val: -shakeIntensity, prog: 0.2 },
              { key: 'translateY', val: shakeIntensity, prog: 0.2 },
              { key: 'translateX', val: shakeIntensity, prog: 0.4 },
              { key: 'translateY', val: -shakeIntensity, prog: 0.4 },
              { key: 'translateX', val: -shakeIntensity, prog: 0.6 },
              { key: 'translateY', val: shakeIntensity, prog: 0.6 },
              { key: 'translateX', val: shakeIntensity, prog: 0.8 },
              { key: 'translateY', val: -shakeIntensity, prog: 0.8 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
        // Scatter effect
        {
          id: 'scatter-effect-top-left',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: scatterPhaseStart,
            duration: scatterDuration,
            mode: 'provider',
            targetIds: ['quad-panel-top-left'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'translateX', val: -scatterDistance, prog: 1 },
              { key: 'translateY', val: -scatterDistance, prog: 1 },
              { key: 'rotate', val: rotationTopLeft, prog: 1 },
              { key: 'scale', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Shadow effect for particle-like appearance
        {
          id: 'shadow-effect-top-left',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: scatterPhaseStart,
            duration: scatterDuration,
            mode: 'provider',
            targetIds: ['quad-panel-top-left'],
            ranges: [
              { key: 'boxShadow', val: '0 0 0 rgba(0,0,0,0)', prog: 0 },
              { key: 'boxShadow', val: '0 10px 30px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.3)', prog: 0.5 },
              { key: 'boxShadow', val: '0 0 0 rgba(0,0,0,0)', prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'video-top-left',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: videoTopLeftSrc,
            fit: 'cover',
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
      ],
    },

    // Top-right panel
    {
      id: 'quad-panel-top-right',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '50%',
            height: '50%',
            top: '0%',
            left: '50%',
            zIndex: 10,
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
      effects: [
        // Shake effect
        {
          id: 'shake-effect-top-right',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: stablePhase,
            duration: shakeDuration,
            mode: 'provider',
            targetIds: ['quad-panel-top-right'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateX', val: shakeIntensity, prog: 0.2 },
              { key: 'translateY', val: shakeIntensity, prog: 0.2 },
              { key: 'translateX', val: -shakeIntensity, prog: 0.4 },
              { key: 'translateY', val: -shakeIntensity, prog: 0.4 },
              { key: 'translateX', val: shakeIntensity, prog: 0.6 },
              { key: 'translateY', val: shakeIntensity, prog: 0.6 },
              { key: 'translateX', val: -shakeIntensity, prog: 0.8 },
              { key: 'translateY', val: -shakeIntensity, prog: 0.8 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
        // Scatter effect
        {
          id: 'scatter-effect-top-right',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: scatterPhaseStart,
            duration: scatterDuration,
            mode: 'provider',
            targetIds: ['quad-panel-top-right'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'translateX', val: scatterDistance, prog: 1 },
              { key: 'translateY', val: -scatterDistance, prog: 1 },
              { key: 'rotate', val: rotationTopRight, prog: 1 },
              { key: 'scale', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Shadow effect
        {
          id: 'shadow-effect-top-right',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: scatterPhaseStart,
            duration: scatterDuration,
            mode: 'provider',
            targetIds: ['quad-panel-top-right'],
            ranges: [
              { key: 'boxShadow', val: '0 0 0 rgba(0,0,0,0)', prog: 0 },
              { key: 'boxShadow', val: '0 10px 30px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.3)', prog: 0.5 },
              { key: 'boxShadow', val: '0 0 0 rgba(0,0,0,0)', prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'video-top-right',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: videoTopRightSrc,
            fit: 'cover',
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
      ],
    },

    // Bottom-left panel
    {
      id: 'quad-panel-bottom-left',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '50%',
            height: '50%',
            top: '50%',
            left: '0%',
            zIndex: 10,
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
      effects: [
        // Shake effect
        {
          id: 'shake-effect-bottom-left',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: stablePhase,
            duration: shakeDuration,
            mode: 'provider',
            targetIds: ['quad-panel-bottom-left'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateX', val: -shakeIntensity, prog: 0.2 },
              { key: 'translateY', val: -shakeIntensity, prog: 0.2 },
              { key: 'translateX', val: shakeIntensity, prog: 0.4 },
              { key: 'translateY', val: shakeIntensity, prog: 0.4 },
              { key: 'translateX', val: -shakeIntensity, prog: 0.6 },
              { key: 'translateY', val: -shakeIntensity, prog: 0.6 },
              { key: 'translateX', val: shakeIntensity, prog: 0.8 },
              { key: 'translateY', val: shakeIntensity, prog: 0.8 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
        // Scatter effect
        {
          id: 'scatter-effect-bottom-left',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: scatterPhaseStart,
            duration: scatterDuration,
            mode: 'provider',
            targetIds: ['quad-panel-bottom-left'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'translateX', val: -scatterDistance, prog: 1 },
              { key: 'translateY', val: scatterDistance, prog: 1 },
              { key: 'rotate', val: rotationBottomLeft, prog: 1 },
              { key: 'scale', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Shadow effect
        {
          id: 'shadow-effect-bottom-left',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: scatterPhaseStart,
            duration: scatterDuration,
            mode: 'provider',
            targetIds: ['quad-panel-bottom-left'],
            ranges: [
              { key: 'boxShadow', val: '0 0 0 rgba(0,0,0,0)', prog: 0 },
              { key: 'boxShadow', val: '0 10px 30px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.3)', prog: 0.5 },
              { key: 'boxShadow', val: '0 0 0 rgba(0,0,0,0)', prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'video-bottom-left',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: videoBottomLeftSrc,
            fit: 'cover',
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
      ],
    },

    // Bottom-right panel
    {
      id: 'quad-panel-bottom-right',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '50%',
            height: '50%',
            top: '50%',
            left: '50%',
            zIndex: 10,
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
      effects: [
        // Shake effect
        {
          id: 'shake-effect-bottom-right',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: stablePhase,
            duration: shakeDuration,
            mode: 'provider',
            targetIds: ['quad-panel-bottom-right'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateX', val: shakeIntensity, prog: 0.2 },
              { key: 'translateY', val: -shakeIntensity, prog: 0.2 },
              { key: 'translateX', val: -shakeIntensity, prog: 0.4 },
              { key: 'translateY', val: shakeIntensity, prog: 0.4 },
              { key: 'translateX', val: shakeIntensity, prog: 0.6 },
              { key: 'translateY', val: -shakeIntensity, prog: 0.6 },
              { key: 'translateX', val: -shakeIntensity, prog: 0.8 },
              { key: 'translateY', val: shakeIntensity, prog: 0.8 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
        // Scatter effect
        {
          id: 'scatter-effect-bottom-right',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: scatterPhaseStart,
            duration: scatterDuration,
            mode: 'provider',
            targetIds: ['quad-panel-bottom-right'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'translateX', val: scatterDistance, prog: 1 },
              { key: 'translateY', val: scatterDistance, prog: 1 },
              { key: 'rotate', val: rotationBottomRight, prog: 1 },
              { key: 'scale', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Shadow effect
        {
          id: 'shadow-effect-bottom-right',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: scatterPhaseStart,
            duration: scatterDuration,
            mode: 'provider',
            targetIds: ['quad-panel-bottom-right'],
            ranges: [
              { key: 'boxShadow', val: '0 0 0 rgba(0,0,0,0)', prog: 0 },
              { key: 'boxShadow', val: '0 10px 30px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.3)', prog: 0.5 },
              { key: 'boxShadow', val: '0 0 0 rgba(0,0,0,0)', prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'video-bottom-right',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: videoBottomRightSrc,
            fit: 'cover',
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
      ],
    },
  ];

  const rootContainer: RenderableComponentData = {
    id: 'explosive-shatter-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-visible',
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

const presetMetadata: PresetMetadata = {
  id: 'quad-split-explosive-shatter',
  title: 'Explosive Quad-Split Shatter Transition',
  description: 'A dramatic transition where four video panels shake intensely, then shatter outward in different directions with particle-like shadows, revealing a focused single video scaling up from behind. Features a 5-frame shake at 60fps, directional scatter with rotation, and smooth scale-up reveal over 1.8 seconds.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'video', 'quad-split', 'shatter', 'shake', 'explosion', 'effects'],
  defaultInputParams: {
    videoTopLeftSrc: 'https://example.com/video1.mp4',
    videoTopRightSrc: 'https://example.com/video2.mp4',
    videoBottomLeftSrc: 'https://example.com/video3.mp4',
    videoBottomRightSrc: 'https://example.com/video4.mp4',
    videoSelectedSrc: 'https://example.com/selected-video.mp4',
    transitionDuration: 1.8,
    stablePhase: 0.5,
    shakeDuration: 0.083,
    shakeIntensity: 5,
    scatterDistance: 200,
    rotationMin: 15,
    rotationMax: 45,
    selectedVideoInitialScale: 0.5,
    selectedVideoFinalScale: 1,
  },
  dependencies: {},
};

export const quadSplitExplosiveShatterPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
