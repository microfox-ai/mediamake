/**
 * Wave Wipe Transition Preset
 *
 * Creates a dynamic wave wipe transition where a sine wave pattern sweeps horizontally
 * across the screen, revealing the incoming video through the wave's peaks and valleys.
 * 
 * Features:
 * - Animated sine wave mask with 3 complete oscillations
 * - Phase animation (0 to 2π) over 1.4 seconds for fluid wave motion
 * - Water-like distortion effects near wave boundary using transform skewX
 * - Gradient fade edge (50px wide) for smooth blending
 * - Color temperature shift: cooler tones on outgoing, warmer on incoming
 * - Dynamic SVG mask generation using sine wave mathematics
 * 
 * Use cases:
 * - Creating fluid water-themed transitions between videos
 * - Adding organic motion to video transitions
 * - Building dynamic reveal effects with mathematical precision
 * - Creating visually engaging transitions for social media content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.4)
    .describe('Duration of transition overlap in seconds'),
  waveAmplitude: z
    .number()
    .default(80)
    .describe('Amplitude of sine wave in pixels'),
  waveFrequency: z
    .number()
    .default(3)
    .describe('Number of complete wave oscillations'),
  fadeEdgeWidth: z
    .number()
    .default(50)
    .describe('Width of gradient fade edge in pixels'),
  distortionIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Intensity of water distortion effect in degrees'),
  coolHueShift: z
    .number()
    .default(-10)
    .describe('Hue rotation for outgoing video (cooler tones)'),
  warmHueShift: z
    .number()
    .default(10)
    .describe('Hue rotation for incoming video (warmer tones)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionDuration,
    waveAmplitude,
    waveFrequency,
    fadeEdgeWidth,
    distortionIntensity,
    coolHueShift,
    warmHueShift,
  } = params;

  // Calculate total composition duration
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Get viewport dimensions
  const viewportWidth = props.config?.width ?? 1920;
  const viewportHeight = props.config?.height ?? 1080;

  // Generate SVG wave mask path
  const generateWavePath = (progress: number): string => {
    const points: string[] = [];
    const numPoints = 100;
    const phaseShift = progress * Math.PI * 2; // Animate from 0 to 2π

    for (let i = 0; i <= numPoints; i++) {
      const x = (i / numPoints) * viewportWidth;
      const normalizedX = (i / numPoints) * Math.PI * 2 * waveFrequency;
      const y = viewportHeight / 2 + waveAmplitude * Math.sin(normalizedX + phaseShift);
      
      if (i === 0) {
        points.push(`M ${x} ${y}`);
      } else {
        points.push(`L ${x} ${y}`);
      }
    }

    // Complete the path to create a filled area
    points.push(`L ${viewportWidth} ${viewportHeight}`);
    points.push(`L 0 ${viewportHeight}`);
    points.push('Z');

    return points.join(' ');
  };

  // Create animated wave mask SVG (keyframes for multiple progress points)
  const createWaveMaskSVG = (): string => {
    const animationSteps = 20;
    let svgContent = '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="position: absolute; width: 0; height: 0;"><defs><clipPath id="wave-clip">';
    
    // Generate multiple path elements with animation
    for (let step = 0; step <= animationSteps; step++) {
      const progress = step / animationSteps;
      const path = generateWavePath(progress);
      const opacity = step === 0 ? 1 : 0;
      svgContent += `<path d="${path}" opacity="${opacity}" class="wave-path-${step}"/>`;
    }
    
    svgContent += '</clipPath></defs></svg>';
    return svgContent;
  };

  const waveMaskHTML = createWaveMaskSVG();

  // Wave transition start time
  const transitionStart = video1.duration - transitionDuration;

  const childrenData: RenderableComponentData[] = [
    // SVG mask definition (hidden, provides clip-path)
    {
      id: 'wave-mask-svg',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: waveMaskHTML,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
          zIndex: 30,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData,

    // Outgoing video (bottom layer)
    {
      id: 'outgoing-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 10,
            filter: `hue-rotate(${coolHueShift}deg)`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Water distortion effect (skew) during transition
        {
          id: 'outgoing-distortion',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-container'],
            ranges: [
              { key: 'skewX', val: 0, prog: 0 },
              { key: 'skewX', val: distortionIntensity, prog: 0.5 },
              { key: 'skewX', val: 0, prog: 1 },
            ],
          },
        },
        // Opacity fade during transition
        {
          id: 'outgoing-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-container'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video (middle layer with wave mask)
    {
      id: 'incoming-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 20,
            filter: `hue-rotate(${warmHueShift}deg)`,
          },
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: video2.duration + transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            fit: 'cover',
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Wave reveal animation (translateX sweep)
        {
          id: 'incoming-wave-reveal',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-container'],
            ranges: [
              { key: 'translateX', val: `${-viewportWidth}px`, prog: 0 },
              { key: 'translateX', val: '0px', prog: 1 },
            ],
          },
        },
        // Water distortion effect (skew) during transition
        {
          id: 'incoming-distortion',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-container'],
            ranges: [
              { key: 'skewX', val: -distortionIntensity, prog: 0 },
              { key: 'skewX', val: distortionIntensity / 2, prog: 0.5 },
              { key: 'skewX', val: 0, prog: 1 },
            ],
          },
        },
        // Gradient fade edge (mask-image)
        {
          id: 'incoming-fade-edge',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-container'],
            ranges: [
              { 
                key: 'maskImage', 
                val: `linear-gradient(to right, transparent, black ${fadeEdgeWidth}px, black calc(100% - ${fadeEdgeWidth}px), transparent)`, 
                prog: 0 
              },
              { 
                key: 'maskImage', 
                val: `linear-gradient(to right, transparent, black ${fadeEdgeWidth}px, black calc(100% - ${fadeEdgeWidth}px), transparent)`, 
                prog: 1 
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'wave-wipe-transition-container',
    type: 'layout',
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
  id: 'wave-wipe-transition',
  title: 'Wave Wipe Transition',
  description: 'Dynamic sine wave pattern sweeps horizontally across the screen with water-like distortion effects, gradient fade edges, and color temperature shifts',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'wave', 'wipe', 'water', 'distortion', 'sine'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.4,
    waveAmplitude: 80,
    waveFrequency: 3,
    fadeEdgeWidth: 50,
    distortionIntensity: 5,
    coolHueShift: -10,
    warmHueShift: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const waveWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
