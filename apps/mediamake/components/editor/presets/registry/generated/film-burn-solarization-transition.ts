/**
 * Film Burn Solarization Transition Preset
 *
 * Simulates old film stock burning away with extreme color inversion and brightness, revealing incoming video underneath.
 * Features organic burn hotspots, progressive filter chains (invert, brightness, contrast, sepia), and subtle inverse color echoes on incoming video.
 *
 * Features:
 * - **Film Burn Effect**: Outgoing video appears to burn away with extreme color inversion
 * - **Solarization Filters**: Progressive filter chain with invert, brightness, contrast, and sepia
 * - **Organic Burn Spread**: Multiple circular gradient masks with different origins and timing
 * - **Color Inversion**: Brightness surges to 300%, contrast drops to 20%, sepia adds vintage coloring
 * - **Inverse Color Echo**: Incoming video has subtle inverse color effect that fades away
 * - **Hotspot Animation**: Burn spots expand from random origins with scale and opacity animations
 *
 * Use cases:
 * - Creating vintage film burn transitions between clips
 * - Simulating old film stock degradation effects
 * - Adding artistic solarization transitions
 * - Creating organic, non-linear transition effects
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
    src: z.string().describe('Source URL of outgoing video'),
    startFrom: z.number().optional().describe('Start time of outgoing video playback in seconds'),
    endAt: z.number().optional().describe('End time of outgoing video playback in seconds'),
    playbackRate: z.number().optional().default(1).describe('Playback rate of outgoing video'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    startFrom: z.number().optional().describe('Start time of incoming video playback in seconds'),
    endAt: z.number().optional().describe('End time of incoming video playback in seconds'),
    playbackRate: z.number().optional().default(1).describe('Playback rate of incoming video'),
  }).describe('Incoming video configuration'),
  transitionDuration: z.number().default(1.5).describe('Duration of the transition overlap in seconds'),
  burnHotspots: z.object({
    count: z.number().min(1).max(5).default(3).describe('Number of burn hotspots to generate'),
    minSize: z.number().default(180).describe('Minimum size of burn hotspots in pixels'),
    maxSize: z.number().default(220).describe('Maximum size of burn hotspots in pixels'),
    maxScale: z.number().default(2).describe('Maximum scale factor for burn expansion'),
  }).optional().describe('Configuration for burn hotspot generation'),
  filterIntensity: z.object({
    invert: z.number().min(0).max(100).default(100).describe('Maximum invert percentage (0-100)'),
    brightness: z.number().min(100).max(500).default(300).describe('Maximum brightness percentage'),
    contrast: z.number().min(0).max(100).default(20).describe('Minimum contrast percentage'),
    sepia: z.number().min(0).max(100).default(60).describe('Maximum sepia percentage'),
  }).optional().describe('Intensity configuration for filter effects'),
  incomingEcho: z.object({
    initialInvert: z.number().min(0).max(100).default(30).describe('Initial invert percentage for incoming video echo effect'),
    echoDuration: z.number().default(2).describe('Duration of the inverse color echo effect in seconds'),
  }).optional().describe('Configuration for incoming video inverse color echo'),
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
    burnHotspots = {
      count: 3,
      minSize: 180,
      maxSize: 220,
      maxScale: 2,
    },
    filterIntensity = {
      invert: 100,
      brightness: 300,
      contrast: 20,
      sepia: 60,
    },
    incomingEcho = {
      initialInvert: 30,
      echoDuration: 2,
    },
  } = params;

  // Helper function to generate random burn hotspot positions
  const generateHotspotPosition = (index: number, total: number) => {
    // Predefined positions for organic spread
    const positions = [
      { top: '30%', left: '20%' },
      { top: '60%', left: '70%' },
      { top: '15%', left: '55%' },
      { top: '45%', left: '35%' },
      { top: '75%', left: '50%' },
    ];
    return positions[index % positions.length];
  };

  // Helper function to generate radial gradient colors
  const generateGradientColor = (index: number) => {
    const colors = [
      'rgba(255,200,100,0.9), rgba(255,150,0,0.6)',
      'rgba(255,180,80,0.9), rgba(255,130,30,0.6)',
      'rgba(255,220,120,0.9), rgba(255,170,50,0.6)',
      'rgba(255,190,90,0.9), rgba(255,140,40,0.6)',
      'rgba(255,210,110,0.9), rgba(255,160,45,0.6)',
    ];
    return colors[index % colors.length];
  };

  // Generate burn hotspot children
  const burnHotspotsChildren: RenderableComponentData[] = [];
  
  for (let i = 0; i < (burnHotspots.count || 3); i++) {
    const position = generateHotspotPosition(i, burnHotspots.count || 3);
    const gradientColors = generateGradientColor(i);
    const size = Math.floor(
      (burnHotspots.minSize || 180) + 
      Math.random() * ((burnHotspots.maxSize || 220) - (burnHotspots.minSize || 180))
    );
    const startDelay = i * 0.2;
    const expandDuration = 1.0 + (Math.random() * 0.2);
    const maxScaleValue = (burnHotspots.maxScale || 2) + (Math.random() * 0.4 - 0.2);

    burnHotspotsChildren.push({
      id: `burn-mask-${i + 1}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class='burn-hotspot'></div>`,
        className: 'absolute',
        style: {
          width: `${size}px`,
          height: `${size}px`,
          top: position.top,
          left: position.left,
          background: `radial-gradient(circle, ${gradientColors}, transparent 70%)`,
          borderRadius: '50%',
          zIndex: 15,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: startDelay,
          duration: transitionDuration - startDelay,
        },
      },
      effects: [
        {
          id: `burn-mask-${i + 1}-expand`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: expandDuration,
            mode: 'provider',
            targetIds: [`burn-mask-${i + 1}`],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: maxScaleValue, prog: 1 },
              { key: 'opacity', val: 0.8 - (i * 0.05), prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  const childrenData: RenderableComponentData[] = [
    // Incoming video layer (bottom, z-0)
    {
      id: 'incoming-video-layer',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        startFrom: incomingVideo.startFrom || 0,
        endAt: incomingVideo.endAt,
        playbackRate: incomingVideo.playbackRate || 1,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration + 0.5,
        },
      },
      effects: [
        {
          id: 'incoming-inverse-color-echo',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: incomingEcho.echoDuration || 2,
            mode: 'provider',
            targetIds: ['incoming-video-layer'],
            ranges: [
              { key: 'filter-invert', val: incomingEcho.initialInvert || 30, prog: 0, unit: '%' },
              { key: 'filter-invert', val: 0, prog: 1, unit: '%' },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Outgoing video layer (top, z-10)
    {
      id: 'outgoing-video-layer',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        startFrom: outgoingVideo.startFrom || 0,
        endAt: outgoingVideo.endAt,
        playbackRate: outgoingVideo.playbackRate || 1,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 10,
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
          id: 'outgoing-solarization-filter',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-layer'],
            ranges: [
              { key: 'filter-invert', val: 0, prog: 0, unit: '%' },
              { key: 'filter-invert', val: filterIntensity.invert || 100, prog: 1, unit: '%' },
              { key: 'filter-brightness', val: 100, prog: 0, unit: '%' },
              { key: 'filter-brightness', val: filterIntensity.brightness || 300, prog: 1, unit: '%' },
              { key: 'filter-contrast', val: 100, prog: 0, unit: '%' },
              { key: 'filter-contrast', val: filterIntensity.contrast || 20, prog: 1, unit: '%' },
              { key: 'filter-sepia', val: 0, prog: 0, unit: '%' },
              { key: 'filter-sepia', val: filterIntensity.sepia || 60, prog: 1, unit: '%' },
            ],
          },
        },
        {
          id: 'outgoing-opacity-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionDuration - 0.5,
            duration: 0.5,
            mode: 'provider',
            targetIds: ['outgoing-video-layer'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Burn hotspot masks
    ...burnHotspotsChildren,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'film-burn-solarization-container',
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
        duration: transitionDuration + 0.5,
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
  id: 'film-burn-solarization-transition',
  title: 'Film Burn Solarization Transition',
  description: 'Simulates old film stock burning away with extreme color inversion and brightness, revealing incoming video. Features organic burn hotspots, progressive filter chains (invert, brightness, contrast, sepia), and subtle inverse color echoes on incoming video. 1.5s overlap duration with multiple circular gradient masks expanding from random origins.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'film', 'burn', 'solarization', 'vintage', 'organic', 'color-inversion'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      startFrom: 0,
      playbackRate: 1,
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      startFrom: 0,
      playbackRate: 1,
    },
    transitionDuration: 1.5,
    burnHotspots: {
      count: 3,
      minSize: 180,
      maxSize: 220,
      maxScale: 2,
    },
    filterIntensity: {
      invert: 100,
      brightness: 300,
      contrast: 20,
      sepia: 60,
    },
    incomingEcho: {
      initialInvert: 30,
      echoDuration: 2,
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const filmBurnSolarizationTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
