/**
 * Radial Flash Wipe Transition Preset
 *
 * This preset creates a photographic-quality radial flash wipe transition where a white flash
 * originates from a configurable point and expands outward in a circular motion to reveal the
 * next video. The flash features a soft feathered edge, lens flare rays, color grading effects,
 * and a camera shake at peak intensity.
 *
 * Features:
 * - **Radial Flash Effect**: Soft-edged circular white flash that expands from center point
 * - **Lens Flare Rays**: Multiple light rays emanating from flash origin point
 * - **Color Grading**: Outgoing video desaturates and brightens, incoming video recovers color
 * - **Camera Shake**: Subtle shake effect during peak flash moment for added impact
 * - **Configurable Origin**: Adjustable flash origin point (center, corner, custom position)
 * - **Customizable Duration**: Adjustable transition overlap duration
 *
 * Use cases:
 * - Creating dramatic scene transitions with lens hotspot effect
 * - Simulating camera flash or exposure changes between clips
 * - Building cinematic transitions with photographic quality
 * - Adding professional polish to video sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  transitionDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the transition overlap in seconds'),
  
  flashOrigin: z
    .object({
      x: z.number().min(0).max(100).describe('X position as percentage (0-100)'),
      y: z.number().min(0).max(100).describe('Y position as percentage (0-100)'),
    })
    .default({ x: 50, y: 50 })
    .describe('Flash origin point as percentage of frame (center = 50,50)'),
  
  flashIntensity: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(0.9)
    .describe('Flash opacity intensity (0.5-1.5)'),
  
  flareIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Lens flare ray intensity (0-1)'),
  
  shakeIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Camera shake intensity in pixels during peak flash'),
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
    flashOrigin,
    flashIntensity,
    flareIntensity,
    shakeIntensity,
  } = params;

  // Calculate timing
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;
  const transitionStart = outgoingVideo.duration - transitionDuration;
  
  // Flash timing phases
  const flashExpansionDuration = transitionDuration * 0.6; // 0-60% of transition
  const flashPeakStart = transitionDuration * 0.45; // Peak at 45%
  const flashPeakEnd = transitionDuration * 0.55; // Peak ends at 55%
  const shakeDuration = flashPeakEnd - flashPeakStart; // 10% of transition
  
  // Camera shake helper function (must be inside presetExecution)
  const generateShakeKeyframes = (intensity: number) => {
    return [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: intensity * 0.8, prog: 0.2 },
      { key: 'translateX', val: -intensity, prog: 0.4 },
      { key: 'translateX', val: intensity * 0.6, prog: 0.6 },
      { key: 'translateX', val: -intensity * 0.4, prog: 0.8 },
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: -intensity * 0.6, prog: 0.25 },
      { key: 'translateY', val: intensity * 0.9, prog: 0.45 },
      { key: 'translateY', val: -intensity * 0.5, prog: 0.65 },
      { key: 'translateY', val: intensity * 0.3, prog: 0.85 },
      { key: 'translateY', val: 0, prog: 1 },
    ];
  };

  // Build component tree
  const childrenData: RenderableComponentData[] = [
    // Outgoing video with color grading effects
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        // Grayscale effect: 0 to 0.8 during transition
        {
          id: 'outgoing-grayscale',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionStart,
            duration: flashExpansionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'filter', val: 'grayscale(0) brightness(1)', prog: 0 },
              { key: 'filter', val: 'grayscale(0.8) brightness(1.8)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Incoming video with color recovery effects
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: transitionStart,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        // Start hidden, fade in as flash peaks
        {
          id: 'incoming-reveal',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: flashExpansionDuration * 0.5,
            duration: transitionDuration - (flashExpansionDuration * 0.5),
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Color recovery: grayscale 0.8 to 0, brightness 1.8 to 1
        {
          id: 'incoming-color-recovery',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: flashExpansionDuration * 0.5,
            duration: transitionDuration - (flashExpansionDuration * 0.5),
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'filter', val: 'grayscale(0.8) brightness(1.8)', prog: 0 },
              { key: 'filter', val: 'grayscale(0) brightness(1)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Radial flash shape using HTMLBlockAtom (ShapeAtom is deprecated)
    {
      id: 'radial-flash',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%;"></div>',
        className: 'absolute pointer-events-none',
        style: {
          width: '200%',
          height: '200%',
          left: '-50%',
          top: '-50%',
          background: 'radial-gradient(circle, white 40%, transparent 70%)',
          transformOrigin: `${flashOrigin.x}% ${flashOrigin.y}%`,
          opacity: 0,
          transform: 'scale(0)',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        // Flash expansion and fade
        {
          id: 'flash-expand',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: flashExpansionDuration,
            mode: 'provider',
            targetIds: ['radial-flash'],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 2.5, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: flashIntensity, prog: 0.5 },
              { key: 'opacity', val: flashIntensity * 0.7, prog: 1 },
            ],
          },
        },
        // Flash fade out
        {
          id: 'flash-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: flashExpansionDuration,
            duration: transitionDuration - flashExpansionDuration,
            mode: 'provider',
            targetIds: ['radial-flash'],
            ranges: [
              { key: 'opacity', val: flashIntensity * 0.7, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Lens flare ray 1 (vertical)
    {
      id: 'flare-ray-1',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%;"></div>',
        className: 'absolute pointer-events-none',
        style: {
          width: '4px',
          height: '150%',
          left: `${flashOrigin.x}%`,
          top: '-25%',
          marginLeft: '-2px',
          background: `linear-gradient(to bottom, transparent 0%, rgba(255,255,255,${flareIntensity}) 50%, transparent 100%)`,
          transformOrigin: `${flashOrigin.x}% ${flashOrigin.y + 25}%`,
          transform: 'rotate(0deg) scaleY(0)',
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'flare-1-animation',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: flashExpansionDuration * 0.3,
            duration: flashExpansionDuration * 0.4,
            mode: 'provider',
            targetIds: ['flare-ray-1'],
            ranges: [
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 1, prog: 0.5 },
              { key: 'scaleY', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Lens flare ray 2 (45 degrees)
    {
      id: 'flare-ray-2',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%;"></div>',
        className: 'absolute pointer-events-none',
        style: {
          width: '4px',
          height: '150%',
          left: `${flashOrigin.x}%`,
          top: '-25%',
          marginLeft: '-2px',
          background: `linear-gradient(to bottom, transparent 0%, rgba(255,255,255,${flareIntensity * 0.75}) 50%, transparent 100%)`,
          transformOrigin: `${flashOrigin.x}% ${flashOrigin.y + 25}%`,
          transform: 'rotate(45deg) scaleY(0)',
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'flare-2-animation',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: flashExpansionDuration * 0.35,
            duration: flashExpansionDuration * 0.35,
            mode: 'provider',
            targetIds: ['flare-ray-2'],
            ranges: [
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 1, prog: 0.5 },
              { key: 'scaleY', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Lens flare ray 3 (horizontal)
    {
      id: 'flare-ray-3',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%;"></div>',
        className: 'absolute pointer-events-none',
        style: {
          width: '4px',
          height: '150%',
          left: `${flashOrigin.x}%`,
          top: '-25%',
          marginLeft: '-2px',
          background: `linear-gradient(to bottom, transparent 0%, rgba(255,255,255,${flareIntensity * 0.75}) 50%, transparent 100%)`,
          transformOrigin: `${flashOrigin.x}% ${flashOrigin.y + 25}%`,
          transform: 'rotate(90deg) scaleY(0)',
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'flare-3-animation',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: flashExpansionDuration * 0.4,
            duration: flashExpansionDuration * 0.3,
            mode: 'provider',
            targetIds: ['flare-ray-3'],
            ranges: [
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 1, prog: 0.5 },
              { key: 'scaleY', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Lens flare ray 4 (135 degrees)
    {
      id: 'flare-ray-4',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%;"></div>',
        className: 'absolute pointer-events-none',
        style: {
          width: '4px',
          height: '150%',
          left: `${flashOrigin.x}%`,
          top: '-25%',
          marginLeft: '-2px',
          background: `linear-gradient(to bottom, transparent 0%, rgba(255,255,255,${flareIntensity * 0.75}) 50%, transparent 100%)`,
          transformOrigin: `${flashOrigin.x}% ${flashOrigin.y + 25}%`,
          transform: 'rotate(135deg) scaleY(0)',
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'flare-4-animation',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: flashExpansionDuration * 0.4,
            duration: flashExpansionDuration * 0.3,
            mode: 'provider',
            targetIds: ['flare-ray-4'],
            ranges: [
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 1, prog: 0.5 },
              { key: 'scaleY', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Root container with camera shake effect
  const rootContainer: RenderableComponentData = {
    id: 'radial-flash-wipe-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
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
      // Camera shake during peak flash
      {
        id: 'camera-shake',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: transitionStart + flashPeakStart,
          duration: shakeDuration,
          mode: 'provider',
          targetIds: ['radial-flash-wipe-container'],
          ranges: generateShakeKeyframes(shakeIntensity),
        },
      },
    ],
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
  id: 'radial-flash-wipe-transition',
  title: 'Radial Flash Wipe Transition',
  description:
    'A photographic radial flash wipe transition where a soft-edged white flash originates from a configurable point and expands outward in a circular motion to reveal the next video. Features feathered gradient edges, lens flare rays, color grading effects (desaturation/brightness), and camera shake at peak flash moment.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'flash', 'radial', 'wipe', 'lens-flare', 'cinematic'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      duration: 5,
    },
    transitionDuration: 0.8,
    flashOrigin: { x: 50, y: 50 },
    flashIntensity: 0.9,
    flareIntensity: 0.8,
    shakeIntensity: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const radialFlashWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
