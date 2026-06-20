/**
 * Analog TV Burn-In Transition Preset
 *
 * Simulates CRT monitor phosphor burn and signal interference with horizontal scan lines,
 * RGB color bleeding, static noise, and phosphor trail effects. Creates authentic analog TV
 * transition aesthetics between media items with tuning-in distortion effects.
 *
 * Features:
 * - Rolling horizontal scan lines that continuously animate across the screen
 * - RGB color shift/bleeding effects using box-shadow techniques
 * - Static noise texture with opacity animation during transitions
 * - Phosphor trail effects on outgoing media with delayed opacity fade
 * - Signal distortion on incoming media with skewX animation that stabilizes
 * - Configurable 0.7s overlap between media items for transition period
 *
 * Use cases:
 * - Creating retro CRT/VHS aesthetic transitions between clips
 * - Adding analog TV nostalgia to modern content
 * - Building glitch-style video montages
 * - Simulating old television broadcast effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media: z
    .array(
      z.object({
        src: z.string().describe('Media source URL'),
        type: z.enum(['image', 'video']).describe('Media type'),
        duration: z.number().describe('Duration in seconds'),
      }),
    )
    .describe('Array of media items to transition between'),
  trackName: z
    .string()
    .default('tv-burn-in-track')
    .describe('Name for the track container ID'),
  overlapDuration: z
    .number()
    .default(0.7)
    .describe('Duration of transition overlap in seconds'),
  scanLineCount: z
    .number()
    .default(3)
    .min(1)
    .max(10)
    .describe('Number of scan lines to animate'),
  scanLineSpeed: z
    .number()
    .default(3)
    .describe('Speed multiplier for scan line animation'),
  rgbBleedIntensity: z
    .number()
    .default(0.5)
    .min(0)
    .max(1)
    .describe('Intensity of RGB color bleeding effect (0-1)'),
  staticNoiseOpacity: z
    .number()
    .default(0.3)
    .min(0)
    .max(1)
    .describe('Base opacity of static noise texture'),
  distortionIntensity: z
    .number()
    .default(5)
    .min(0)
    .max(15)
    .describe('Intensity of signal distortion skewX in degrees'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { presets } = props;
  const {
    media,
    trackName,
    overlapDuration,
    scanLineCount,
    scanLineSpeed,
    rgbBleedIntensity,
    staticNoiseOpacity,
    distortionIntensity,
  } = params;

  // Validate we have media items
  if (!media || media.length === 0) {
    throw new Error('At least one media item is required');
  }

  // Calculate total duration with overlaps
  const totalDuration = media.reduce((sum, item, index) => {
    if (index === 0) return item.duration;
    return sum + item.duration - overlapDuration;
  }, 0);

  // Create media items with overlapping timing
  const mediaChildren: RenderableComponentData[] = [];
  let currentTime = 0;

  media.forEach((item, index) => {
    const isFirst = index === 0;
    const isLast = index === media.length - 1;

    // Calculate timing
    const startTime = isFirst ? 0 : currentTime - overlapDuration;
    const itemDuration = isFirst ? item.duration : item.duration + overlapDuration;

    const mediaId = `${trackName}-media-${index}`;
    const componentId = item.type === 'video' ? 'VideoAtom' : 'ImageAtom';

    // Create base media item
    const mediaItem: RenderableComponentData = {
      id: mediaId,
      type: 'atom',
      componentId: componentId as any,
      data: {
        src: item.src,
        className: 'w-full h-full object-cover',
      } as any,
      context: {
        timing: {
          start: startTime,
          duration: itemDuration,
        },
      },
      effects: [],
    };

    // Add phosphor trail effect (fade out) for outgoing media
    if (!isLast) {
      const fadeOutStart = item.duration - overlapDuration;
      mediaItem.effects!.push({
        id: `phosphor-trail-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: fadeOutStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [mediaId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      } as any);
    }

    // Add signal distortion effect (skewX) for incoming media
    if (!isFirst) {
      mediaItem.effects!.push({
        id: `signal-distortion-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [mediaId],
          ranges: [
            { key: 'skewX', val: -distortionIntensity, prog: 0 },
            { key: 'skewX', val: 0, prog: 1 },
          ],
        },
      } as any);

      // Add fade in during distortion
      mediaItem.effects!.push({
        id: `fade-in-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [mediaId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      } as any);
    }

    mediaChildren.push(mediaItem);
    currentTime += item.duration;
  });

  // Create scan lines with staggered animation
  const scanLines: RenderableComponentData[] = [];
  for (let i = 0; i < scanLineCount; i++) {
    const scanLineId = `scan-line-${i}`;
    const opacity = 0.2 - i * 0.05; // Decreasing opacity for each line
    const delay = (i * 0.3) / scanLineSpeed; // Staggered delay

    scanLines.push({
      id: scanLineId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class='absolute w-full h-px' style='background-color: rgba(255, 255, 255, ${opacity});'></div>`,
        className: 'absolute w-full h-px',
        style: {
          top: 0,
        },
      } as any,
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: `scan-line-animation-${i}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: delay,
            duration: (totalDuration - delay) / scanLineSpeed,
            mode: 'provider',
            targetIds: [scanLineId],
            ranges: [
              { key: 'translateY', val: '-100%', prog: 0 },
              { key: 'translateY', val: '200vh', prog: 1 },
            ],
          },
        },
      ] as any,
    } as RenderableComponentData);
  }

  // Create RGB bleeding overlay
  const rgbBleedId = 'rgb-bleeding-overlay';
  const shadowIntensity = rgbBleedIntensity * 0.5;
  const rgbOverlay: RenderableComponentData = {
    id: rgbBleedId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class='absolute inset-0 pointer-events-none'></div>`,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        boxShadow: `2px 0 0 rgba(255, 0, 0, ${shadowIntensity}), -2px 0 0 rgba(0, 255, 0, ${shadowIntensity}), 0 2px 0 rgba(0, 0, 255, ${shadowIntensity})`,
        mixBlendMode: 'screen',
      },
    } as any,
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [] as any,
  };

  // Add RGB bleed intensity animation during transitions
  let transitionTime = media[0].duration - overlapDuration;
  for (let i = 1; i < media.length; i++) {
    rgbOverlay.effects!.push({
      id: `rgb-bleed-${i}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: transitionTime,
        duration: overlapDuration,
        mode: 'provider',
        targetIds: [rgbBleedId],
        ranges: [
          { key: 'opacity', val: 0.3, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.5 },
          { key: 'opacity', val: 0.3, prog: 1 },
        ],
      },
    } as any);
    transitionTime += media[i].duration - overlapDuration;
  }

  // Create static noise canvas
  const staticNoiseId = 'static-noise-canvas';
  const staticNoise: RenderableComponentData = {
    id: staticNoiseId,
    type: 'atom',
    componentId: 'CanvasAtom',
    data: {
      className: 'absolute inset-0 pointer-events-none',
      style: {
        opacity: staticNoiseOpacity,
        mixBlendMode: 'overlay',
      },
    } as any,
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [] as any,
  };

  // Add static noise opacity animation during transitions
  transitionTime = media[0].duration - overlapDuration;
  for (let i = 1; i < media.length; i++) {
    staticNoise.effects!.push({
      id: `static-noise-${i}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: transitionTime,
        duration: overlapDuration,
        mode: 'provider',
        targetIds: [staticNoiseId],
        ranges: [
          { key: 'opacity', val: staticNoiseOpacity, prog: 0 },
          { key: 'opacity', val: 0.8, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    } as any);
    transitionTime += media[i].duration - overlapDuration;
  }

  // Assemble root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root`,
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
      ...mediaChildren,
      ...scanLines,
      rgbOverlay,
      staticNoise,
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

const presetMetadata: PresetMetadata = {
  id: 'analog-tv-burn-in-transition',
  title: 'Analog TV Burn-In Transition',
  description:
    'Simulates CRT monitor phosphor burn and signal interference with horizontal scan lines, RGB color bleeding, static noise, and phosphor trail effects. Creates authentic analog TV transition aesthetics between media items with tuning-in distortion effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'crt', 'analog', 'tv', 'retro', 'glitch', 'vhs'],
  defaultInputParams: {
    media: [
      {
        src: 'https://example.com/video1.mp4',
        type: 'video',
        duration: 5,
      },
      {
        src: 'https://example.com/video2.mp4',
        type: 'video',
        duration: 5,
      },
    ],
    trackName: 'tv-burn-in-track',
    overlapDuration: 0.7,
    scanLineCount: 3,
    scanLineSpeed: 3,
    rgbBleedIntensity: 0.5,
    staticNoiseOpacity: 0.3,
    distortionIntensity: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const analogTvBurnInTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};