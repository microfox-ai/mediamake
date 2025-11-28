/**
 * Chaotic Marker Splash Transition Preset
 *
 * An explosive marker-based video transition featuring aggressive scribble animations.
 * The outgoing video gets "crossed out" with violent marker strokes while the incoming
 * video bursts through with energetic splatter effects.
 *
 * Features:
 * - Rapid shake effects synchronized with scribble animations
 * - Multiple scribble overlays with varying thickness and opacity
 * - Uneven, artistic transition with random marker patterns
 * - Combined shake, blur, and fade effects on outgoing video
 * - Scale burst effect on incoming video with spring easing
 * - 0.8s overlap period for dynamic transition
 *
 * Use Cases:
 * - Energetic social media content
 * - Music video transitions
 * - Action-packed montages
 * - Youth-oriented content
 * - Creative portfolio reels
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video to transition from'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video to transition to'),
  
  overlapDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the transition overlap in seconds'),
  
  shakeAmplitude: z
    .number()
    .default(15)
    .describe('Maximum shake amplitude in pixels'),
  
  scribbleCount: z
    .number()
    .default(4)
    .describe('Number of scribble overlay animations'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    overlapDuration,
    shakeAmplitude,
    scribbleCount,
  } = params;

  // Calculate total duration: sum of both videos minus overlap
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - overlapDuration;

  // Timing constants
  const transitionStart = outgoingVideo.duration - overlapDuration;
  const incomingStart = transitionStart;

  // Helper function to generate random scribble SVG paths
  const generateScribblePath = (index: number): string => {
    const paths: string[] = [
      // Diagonal cross-out strokes
      `<svg width='100%' height='100%' viewBox='0 0 1920 1080' preserveAspectRatio='none' style='mix-blend-mode: multiply; opacity: 0.9;'>
        <path d='M100,200 Q300,150 500,250 T900,300 L1200,400 Q1400,350 1600,450' stroke='#000' stroke-width='12' fill='none' stroke-linecap='round'/>
        <path d='M200,600 Q500,550 800,650 T1400,700' stroke='#000' stroke-width='18' fill='none' stroke-linecap='round'/>
      </svg>`,
      
      // Large X cross-out
      `<svg width='100%' height='100%' viewBox='0 0 1920 1080' preserveAspectRatio='none' style='mix-blend-mode: multiply; opacity: 0.7;'>
        <path d='M1800,150 L100,950' stroke='#000' stroke-width='25' fill='none' stroke-linecap='round'/>
        <path d='M100,100 L1800,1000' stroke='#000' stroke-width='20' fill='none' stroke-linecap='round'/>
      </svg>`,
      
      // Circular scribbles
      `<svg width='100%' height='100%' viewBox='0 0 1920 1080' preserveAspectRatio='none' style='mix-blend-mode: multiply; opacity: 0.8;'>
        <circle cx='960' cy='540' r='200' stroke='#000' stroke-width='15' fill='none'/>
        <path d='M600,300 Q800,400 1000,300 T1400,400' stroke='#000' stroke-width='10' fill='none' stroke-linecap='round'/>
      </svg>`,
      
      // Random squiggles
      `<svg width='100%' height='100%' viewBox='0 0 1920 1080' preserveAspectRatio='none' style='mix-blend-mode: multiply; opacity: 0.6;'>
        <path d='M300,800 Q600,700 900,850 T1500,900' stroke='#000' stroke-width='8' fill='none' stroke-linecap='round'/>
        <path d='M1700,200 L1500,400 L1650,600' stroke='#000' stroke-width='22' fill='none' stroke-linecap='round'/>
      </svg>`,
      
      // Splatter effect
      `<svg width='100%' height='100%' viewBox='0 0 1920 1080' preserveAspectRatio='none' style='mix-blend-mode: multiply; opacity: 0.75;'>
        <path d='M400,500 Q600,400 800,500 L1000,600 Q1200,550 1400,600' stroke='#000' stroke-width='14' fill='none' stroke-linecap='round'/>
        <circle cx='1600' cy='300' r='40' fill='#000' opacity='0.3'/>
        <circle cx='300' cy='800' r='30' fill='#000' opacity='0.4'/>
      </svg>`,
      
      // Aggressive slashes
      `<svg width='100%' height='100%' viewBox='0 0 1920 1080' preserveAspectRatio='none' style='mix-blend-mode: multiply; opacity: 0.85;'>
        <path d='M0,0 L1920,1080' stroke='#000' stroke-width='28' fill='none' stroke-linecap='round'/>
        <path d='M500,0 L1500,1080' stroke='#000' stroke-width='16' fill='none' stroke-linecap='round'/>
      </svg>`,
    ];
    
    return paths[index % paths.length];
  };

  // Generate shake keyframes (12fps = ~0.083s intervals)
  const shakeKeyframes = [
    { key: 'translateX', val: 0, prog: 0 },
    { key: 'translateX', val: 15, prog: 0.083 },
    { key: 'translateX', val: -12, prog: 0.167 },
    { key: 'translateX', val: 10, prog: 0.25 },
    { key: 'translateX', val: -15, prog: 0.333 },
    { key: 'translateX', val: 8, prog: 0.417 },
    { key: 'translateX', val: -10, prog: 0.5 },
    { key: 'translateX', val: 12, prog: 0.583 },
    { key: 'translateX', val: -8, prog: 0.667 },
    { key: 'translateX', val: 5, prog: 0.75 },
    { key: 'translateX', val: -5, prog: 0.833 },
    { key: 'translateX', val: 0, prog: 1 },
    { key: 'translateY', val: 0, prog: 0 },
    { key: 'translateY', val: -10, prog: 0.083 },
    { key: 'translateY', val: 12, prog: 0.167 },
    { key: 'translateY', val: -15, prog: 0.25 },
    { key: 'translateY', val: 8, prog: 0.333 },
    { key: 'translateY', val: -12, prog: 0.417 },
    { key: 'translateY', val: 15, prog: 0.5 },
    { key: 'translateY', val: -8, prog: 0.583 },
    { key: 'translateY', val: 10, prog: 0.667 },
    { key: 'translateY', val: -5, prog: 0.75 },
    { key: 'translateY', val: 5, prog: 0.833 },
    { key: 'translateY', val: 0, prog: 1 },
  ];

  // Build scribble overlays
  const scribbleOverlays: RenderableComponentData[] = [];
  const scribbleStarts = [0.8, 0.7, 0.6, 0.5, 0.45, 0.4]; // Staggered starts
  const scribbleDurations = [0.4, 0.3, 0.35, 0.3, 0.25, 0.35]; // Varying durations
  
  for (let i = 0; i < Math.min(scribbleCount, 6); i++) {
    const scribbleStart = transitionStart + (overlapDuration - scribbleStarts[i]);
    const scribbleDuration = scribbleDurations[i];
    
    scribbleOverlays.push({
      id: `scribble-overlay-${i + 1}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: generateScribblePath(i),
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: scribbleStart,
          duration: scribbleDuration,
        },
      },
      effects: [
        {
          id: `scribble-${i + 1}-draw`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [`scribble-overlay-${i + 1}`],
            type: 'ease-out',
            start: 0,
            duration: scribbleDuration,
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.9 - i * 0.1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Build component tree
  const childrenData: RenderableComponentData[] = [
    // Outgoing video container
    {
      id: 'outgoing-container',
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
          duration: outgoingVideo.duration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-video',
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
              duration: outgoingVideo.duration,
            },
          },
          effects: [
            // Shake effect
            {
              id: 'outgoing-shake-effect',
              componentId: 'generic',
              data: {
                mode: 'provider',
                targetIds: ['outgoing-video'],
                type: 'linear',
                start: transitionStart,
                duration: overlapDuration,
                ranges: shakeKeyframes,
              },
            },
            // Fade effect
            {
              id: 'outgoing-fade-effect',
              componentId: 'generic',
              data: {
                mode: 'provider',
                targetIds: ['outgoing-video'],
                type: 'ease-in-out',
                start: transitionStart,
                duration: overlapDuration,
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0.3, prog: 0.7 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
            // Blur effect
            {
              id: 'outgoing-blur-effect',
              componentId: 'generic',
              data: {
                mode: 'provider',
                targetIds: ['outgoing-video'],
                type: 'ease-in-out',
                start: transitionStart,
                duration: overlapDuration,
                ranges: [
                  { key: 'blur', val: 0, prog: 0 },
                  { key: 'blur', val: 3, prog: 0.5 },
                  { key: 'blur', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
    
    // Incoming video container
    {
      id: 'incoming-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: incomingVideo.duration + overlapDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-video',
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
              duration: incomingVideo.duration + overlapDuration,
            },
          },
          effects: [
            // Scale burst effect
            {
              id: 'incoming-scale-effect',
              componentId: 'generic',
              data: {
                mode: 'provider',
                targetIds: ['incoming-video'],
                type: 'spring',
                start: 0,
                duration: overlapDuration,
                ranges: [
                  { key: 'scale', val: 0.8, prog: 0 },
                  { key: 'scale', val: 1.1, prog: 0.6 },
                  { key: 'scale', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
    
    // Scribble overlays
    ...scribbleOverlays,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'chaotic-marker-splash-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-white w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'chaotic-marker-splash-transition',
  title: 'Chaotic Marker Splash Transition',
  description:
    'An explosive marker-based transition where videos switch through aggressive scribble animations. Outgoing video gets crossed out with marker strokes while incoming video bursts through with energetic splatter effects. Features synchronized shake, blur, and scale animations with varying scribble thickness and opacity for an artistic, chaotic feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'marker',
    'scribble',
    'chaotic',
    'explosive',
    'artistic',
    'shake',
    'burst',
    'energetic',
    'video',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 0.8,
    shakeAmplitude: 15,
    scribbleCount: 4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const chaoticMarkerSplashTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};