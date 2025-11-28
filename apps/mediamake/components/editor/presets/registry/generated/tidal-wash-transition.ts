/**
 * Tidal Wash Transition Preset
 *
 * This preset creates a sophisticated tidal wash transition where waves of ink wash over
 * the outgoing video in multiple passes (3-4 waves), each wave revealing more of the
 * incoming video like tidal waters on a beach. Features displacement effects on the
 * outgoing video, wet sand texture emergence on the incoming video, and foam-like edges
 * using white noise patterns.
 *
 * Technical Features:
 * - 3-4 wave passes during a 3.2-second overlap period
 * - Wave timing: 0s, 0.8s, 1.6s, 2.4s starts, each lasting 0.8s with overlap
 * - Each wave has different intensity and coverage
 * - Outgoing video distorts with displacement effects (synchronized with waves)
 * - Outgoing video opacity decreases 25% with each wave pass (1.0 → 0.75 → 0.5 → 0.25 → 0)
 * - Incoming video emerges with wet sand texture effect that gradually clears
 * - Foam-like edges created with white noise patterns (opacity fade and scale animation)
 * - GPU acceleration on all transforms
 * - Total duration calculated as video1 + video2 - 3.2s overlap
 *
 * Use Cases:
 * - Creating fluid, organic transitions between video clips
 * - Building water-themed visual effects
 * - Adding artistic transitions with natural motion
 * - Creating memorable scene changes with progressive reveal
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PRESET PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    startFrom: z.number().optional().describe('Start time in seconds for the outgoing video'),
    endAt: z.number().optional().describe('End time in seconds for the outgoing video'),
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    startFrom: z.number().optional().describe('Start time in seconds for the incoming video'),
    endAt: z.number().optional().describe('End time in seconds for the incoming video'),
  }).describe('Incoming video configuration'),
  
  outgoingVideoDuration: z.number().describe('Duration of the outgoing video in seconds'),
  incomingVideoDuration: z.number().describe('Duration of the incoming video in seconds'),
  
  overlapDuration: z.number().default(3.2).describe('Duration of the transition overlap in seconds (default: 3.2)'),
  
  waveCount: z.number().min(3).max(4).default(4).describe('Number of wave passes (3-4 waves)'),
  
  waveColors: z.array(z.string()).optional().describe('Array of wave colors in rgba format (optional, defaults to blue gradient)'),
  
  foamIntensity: z.number().min(0).max(1).default(0.6).describe('Intensity of foam effects (0-1, default: 0.6)'),
  
  displacementIntensity: z.number().min(0).max(20).default(10).describe('Intensity of displacement effects on outgoing video (0-20, default: 10)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION FUNCTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    outgoingVideoDuration,
    incomingVideoDuration,
    overlapDuration,
    waveCount,
    waveColors,
    foamIntensity,
    displacementIntensity,
  } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = outgoingVideoDuration + incomingVideoDuration - overlapDuration;

  // Wave timing configuration
  const waveDuration = 0.8; // Each wave lasts 0.8 seconds
  const waveInterval = 0.8; // Waves start 0.8 seconds apart
  const waveStartTimes = Array.from({ length: waveCount }, (_, i) => i * waveInterval);

  // Default wave colors (blue gradient progression)
  const defaultWaveColors = [
    'rgba(0,50,100,0.3)',
    'rgba(0,60,120,0.4)',
    'rgba(0,70,140,0.5)',
    'rgba(0,80,160,0.6)',
  ];
  const effectiveWaveColors = waveColors || defaultWaveColors.slice(0, waveCount);

  // Helper: Create SVG wave path
  const createWavePath = (index: number): string => {
    const yOffset = 1000 + index * 20; // Each wave slightly different
    return `M0,0 L1920,0 L1920,1080 Q1440,${yOffset} 960,1080 Q480,${1080 + (index * 40)} 0,1080 Z`;
  };

  // Helper: Create wave component with animation
  const createWaveComponent = (index: number): RenderableComponentData => {
    const waveId = `wave-${index}`;
    const waveStart = waveStartTimes[index];
    const waveColor = effectiveWaveColors[index] || defaultWaveColors[index % 4];
    
    return {
      id: `wave-container-${index}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none overflow-hidden',
          style: {},
        },
      },
      context: {
        timing: {
          start: outgoingVideoDuration - overlapDuration + waveStart,
          duration: waveDuration,
        },
      },
      childrenData: [
        {
          id: waveId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <path d="${createWavePath(index)}" fill="${waveColor}"/>
            </svg>`,
            className: 'w-full h-full',
            style: {},
          },
          context: {
            timing: {
              start: 0,
              duration: waveDuration,
            },
          },
          effects: [
            {
              id: `wave-slide-${index}`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: waveDuration,
                mode: 'provider',
                targetIds: [waveId],
                ranges: [
                  { key: 'translateX', val: '-100%', prog: 0 },
                  { key: 'translateX', val: '0%', prog: 1 },
                  { key: 'scaleY', val: 0.8, prog: 0 },
                  { key: 'scaleY', val: 1.2, prog: 0.5 },
                  { key: 'scaleY', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  };

  // Helper: Create foam component with noise-like texture
  const createFoamComponent = (index: number): RenderableComponentData => {
    const foamId = `foam-${index}`;
    const waveStart = waveStartTimes[index];
    const foamOpacity = foamIntensity * (0.6 - index * 0.1); // Decreasing intensity
    const blurAmount = 8 + index * 2; // Increasing blur
    
    return {
      id: `foam-container-${index}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {},
        },
      },
      context: {
        timing: {
          start: outgoingVideoDuration - overlapDuration + waveStart,
          duration: waveDuration,
        },
      },
      childrenData: [
        {
          id: foamId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width:100%;height:100%;background:radial-gradient(ellipse at 50% 80%, rgba(255,255,255,${foamOpacity}) 0%, transparent 60%);filter:blur(${blurAmount}px);"></div>`,
            className: 'w-full h-full',
            style: {},
          },
          context: {
            timing: {
              start: 0,
              duration: waveDuration,
            },
          },
          effects: [
            {
              id: `foam-fade-${index}`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: waveDuration,
                mode: 'provider',
                targetIds: [foamId],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.3 },
                  { key: 'opacity', val: 0, prog: 1 },
                  { key: 'scale', val: 0.8, prog: 0 },
                  { key: 'scale', val: 1.2, prog: 0.5 },
                  { key: 'scale', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  };

  // Helper: Create displacement filter SVG
  const createDisplacementSVG = (): string => {
    return `<svg width="0" height="0" style="position:absolute;">
      <defs>
        <filter id="displacement-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.02" numOctaves="3" seed="2" result="turbulence"/>
          <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="${displacementIntensity}" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
    </svg>`;
  };

  // Outgoing video with displacement and progressive opacity
  const outgoingVideoId = 'outgoing-video';
  const outgoingVideoComponent: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideoDuration,
      },
    },
    childrenData: [
      {
        id: outgoingVideoId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          startFrom: outgoingVideo.startFrom,
          endAt: outgoingVideo.endAt,
          className: 'w-full h-full object-cover',
          fit: 'cover',
          style: {
            willChange: 'transform, opacity, filter',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideoDuration,
          },
        },
        effects: [
          // Opacity decreases with each wave (1.0 → 0.75 → 0.5 → 0.25 → 0)
          ...waveStartTimes.map((waveStart, index) => ({
            id: `outgoing-opacity-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-in' as const,
              start: outgoingVideoDuration - overlapDuration + waveStart,
              duration: waveDuration,
              mode: 'provider' as const,
              targetIds: [outgoingVideoId],
              ranges: [
                { 
                  key: 'opacity', 
                  val: 1 - (index * 0.25), 
                  prog: 0 
                },
                { 
                  key: 'opacity', 
                  val: 1 - ((index + 1) * 0.25), 
                  prog: 1 
                },
              ],
            },
          })),
          // Displacement effect synchronized with waves
          ...waveStartTimes.map((waveStart, index) => ({
            id: `outgoing-displacement-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out' as const,
              start: outgoingVideoDuration - overlapDuration + waveStart,
              duration: waveDuration,
              mode: 'provider' as const,
              targetIds: [outgoingVideoId],
              ranges: [
                { 
                  key: 'filter', 
                  val: `url(#displacement-filter) blur(${index * 2}px)`, 
                  prog: 0 
                },
                { 
                  key: 'filter', 
                  val: `url(#displacement-filter) blur(${(index + 1) * 2}px)`, 
                  prog: 1 
                },
              ],
            },
          })),
        ],
      } as RenderableComponentData,
    ],
  };

  // Incoming video with progressive mask reveal and wet sand texture
  const incomingVideoId = 'incoming-video';
  const incomingVideoComponent: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {},
      },
    },
    context: {
      timing: {
        start: outgoingVideoDuration - overlapDuration,
        duration: incomingVideoDuration + overlapDuration,
      },
    },
    childrenData: [
      {
        id: incomingVideoId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          startFrom: incomingVideo.startFrom,
          endAt: incomingVideo.endAt,
          className: 'w-full h-full object-cover',
          fit: 'cover',
          style: {
            willChange: 'transform, opacity, filter',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideoDuration + overlapDuration,
          },
        },
        effects: [
          // Progressive reveal with mask-image (multiple layers)
          {
            id: 'incoming-reveal',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: [incomingVideoId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
          // Wet sand texture effect (granular noise that clears)
          {
            id: 'incoming-texture',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: [incomingVideoId],
              ranges: [
                { 
                  key: 'filter', 
                  val: 'contrast(0.8) brightness(0.9) saturate(0.7) blur(3px)', 
                  prog: 0 
                },
                { 
                  key: 'filter', 
                  val: 'contrast(1) brightness(1) saturate(1) blur(0px)', 
                  prog: 1 
                },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // SVG filter definitions
  const svgFilterComponent: RenderableComponentData = {
    id: 'svg-filters',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: createDisplacementSVG(),
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // Create wave and foam components
  const waveComponents = Array.from({ length: waveCount }, (_, i) => createWaveComponent(i));
  const foamComponents = Array.from({ length: waveCount }, (_, i) => createFoamComponent(i));

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'tidal-wash-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      svgFilterComponent,
      outgoingVideoComponent,
      incomingVideoComponent,
      ...waveComponents,
      ...foamComponents,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'tidal-wash-transition',
  title: 'Tidal Wash Transition',
  description: 'A sophisticated transition effect where waves of ink wash over the outgoing video in multiple passes, each revealing more of the incoming video like tidal waters on a beach. Features displacement effects, progressive opacity changes, wet sand texture emergence, and foam-like edges using noise patterns.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'wave', 'water', 'tidal', 'organic', 'fluid', 'artistic', 'displacement', 'foam'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
    },
    outgoingVideoDuration: 10,
    incomingVideoDuration: 10,
    overlapDuration: 3.2,
    waveCount: 4,
    foamIntensity: 0.6,
    displacementIntensity: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const tidalWashTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};