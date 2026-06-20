/**
 * Glitch Art Gradient Preset
 * 
 * This preset creates a corrupted video file aesthetic with RGB color channel separation,
 * datamosh effects, and digital glitch transitions. The gradient layers occasionally "break"
 * into separate RGB channels that shift and misalign, then reform. Features include:
 * 
 * - Three layered RGB gradients (red, green, blue) using screen blend mode
 * - Channel separation effects with step easing for digital feel
 * - Scale glitches that briefly distort the entire composition
 * - Opacity flickers simulating video corruption
 * - Scanline overlay for CRT monitor aesthetic
 * - Stable text with occasional jitter to maintain glitch aesthetic
 * 
 * Use cases:
 * - Tech-focused content with cyberpunk or digital corruption themes
 * - Music videos with glitch art aesthetic
 * - Social media content with edgy, modern visual style
 * - Artistic projects exploring digital artifacts and errors
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().default('GLITCH').describe('Text to display with glitch aesthetic'),
  duration: z.number().default(12).describe('Total duration of the composition in seconds'),
  textColor: z.string().default('#FFFFFF').describe('Color of the text element'),
  fontFamily: z.string().default('JetBrains Mono').describe('Font family for monospace glitch aesthetic'),
  fontSize: z.number().default(96).describe('Font size in pixels for the text'),
  channelSeparationIntensity: z.number().min(5).max(20).default(10).describe('Maximum pixel offset for RGB channel separation'),
  glitchFrequency: z.number().min(1).max(5).default(3).describe('Number of major glitch events during the duration'),
  scanlineIntensity: z.number().min(0).max(1).default(0.15).describe('Opacity of scanline overlay (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    textColor,
    fontFamily,
    fontSize,
    channelSeparationIntensity,
    glitchFrequency,
    scanlineIntensity,
  } = params;

  // Calculate glitch timing based on frequency
  const glitchInterval = duration / glitchFrequency;
  const transitionDuration = 0.3;
  const scaleGlitchDuration = 0.1;
  const flickerDuration = 0.15;

  // Generate glitch times dynamically
  const glitchTimes: number[] = [];
  for (let i = 1; i <= glitchFrequency; i++) {
    glitchTimes.push(i * glitchInterval - glitchInterval / 2);
  }

  // Create RGB channel separation effects
  const createChannelEffects = (channelId: string, glitchTime: number, offsetMultiplier: number) => {
    const effectId = `${channelId}-offset-${glitchTime}s`;
    return {
      id: effectId,
      componentId: 'generic',
      data: {
        mode: 'provider',
        targetIds: [channelId],
        type: 'step',
        start: glitchTime,
        duration: transitionDuration,
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: channelSeparationIntensity * offsetMultiplier, prog: 0.5 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      },
    };
  };

  // Generate all channel effects for each glitch time
  const allChannelEffects: any[] = [];
  glitchTimes.forEach((time) => {
    allChannelEffects.push(
      createChannelEffects('red-gradient-layer', time, 1),
      createChannelEffects('green-gradient-layer', time, -1),
      createChannelEffects('blue-gradient-layer', time, 0.5),
    );
  });

  // Create scale glitch effects
  const scaleGlitchEffects: any[] = glitchTimes.map((time, index) => ({
    id: `scale-glitch-${index}`,
    componentId: 'generic',
    data: {
      mode: 'provider',
      targetIds: ['red-gradient-layer', 'green-gradient-layer', 'blue-gradient-layer'],
      type: 'step',
      start: time + transitionDuration,
      duration: scaleGlitchDuration,
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1.02, prog: 1 },
      ],
    },
  }));

  // Create opacity flicker effects
  const flickerEffects: any[] = glitchTimes.map((time, index) => ({
    id: `opacity-flicker-${index}`,
    componentId: 'generic',
    data: {
      mode: 'provider',
      targetIds: ['glitch-gradient-root'],
      type: 'linear',
      start: time + transitionDuration + scaleGlitchDuration + 0.2,
      duration: flickerDuration,
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 0.33 },
        { key: 'opacity', val: 1, prog: 0.66 },
        { key: 'opacity', val: 0, prog: 0.83 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  }));

  // Create text jitter effects
  const textJitterEffects: any[] = glitchTimes.map((time, index) => ({
    id: `text-jitter-${index}`,
    componentId: 'generic',
    data: {
      mode: 'provider',
      targetIds: ['text-atom'],
      type: 'step',
      start: time + transitionDuration / 2,
      duration: 0.1,
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: index % 2 === 0 ? 2 : -2, prog: 0.5 },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    },
  }));

  // Build the composition structure
  const childrenData: RenderableComponentData[] = [
    // Red gradient layer
    {
      id: 'red-gradient-layer',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div class="absolute inset-0 mix-blend-screen" style="background: linear-gradient(45deg, #ff0000 0%, #ff0066 50%, #cc0033 100%);"></div>',
        className: 'absolute inset-0',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData,
    // Green gradient layer
    {
      id: 'green-gradient-layer',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div class="absolute inset-0 mix-blend-screen" style="background: linear-gradient(135deg, #00ff00 0%, #00ff99 50%, #00cc66 100%);"></div>',
        className: 'absolute inset-0',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData,
    // Blue gradient layer
    {
      id: 'blue-gradient-layer',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div class="absolute inset-0 mix-blend-screen" style="background: linear-gradient(225deg, #0000ff 0%, #0066ff 50%, #0033cc 100%);"></div>',
        className: 'absolute inset-0',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData,
    // Scanline overlay
    {
      id: 'scanline-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class="absolute inset-0 pointer-events-none" style="background: repeating-linear-gradient(0deg, rgba(0,0,0,${scanlineIntensity}) 0px, rgba(0,0,0,${scanlineIntensity}) 2px, transparent 2px, transparent 4px); mix-blend-mode: multiply;"></div>`,
        className: 'absolute inset-0',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData,
    // Text container
    {
      id: 'text-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center z-40',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [
        {
          id: 'text-atom',
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: text,
            className: 'relative',
            style: {
              fontSize: `${fontSize}px`,
              color: textColor,
              fontWeight: '700',
              letterSpacing: '0.2em',
              textShadow: '0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(0,255,255,0.3)',
            },
            font: {
              family: fontFamily,
              weights: ['700'],
              subsets: ['latin'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'glitch-gradient-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData,
    effects: [
      ...allChannelEffects,
      ...scaleGlitchEffects,
      ...flickerEffects,
      ...textJitterEffects,
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
  id: 'glitch-art-gradient',
  title: 'Glitch Art Gradient with Datamosh Effects',
  description: 'A corrupted video file aesthetic gradient with RGB channel separation, color banding, pixelation, and digital glitch transitions. Features three layered gradients for red, green, and blue channels that occasionally separate and snap back with step easing. Includes scanline overlay, scale glitches, opacity flickers, and subtle text jitter effects. The animation cycles through moments of perfect clarity followed by chaotic digital corruption for an unstable but controlled glitch aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: ['gradient', 'glitch', 'datamosh', 'rgb-split', 'digital', 'corruption', 'cyberpunk', 'tech', 'modern', 'artistic'],
  defaultInputParams: {
    text: 'GLITCH',
    duration: 12,
    textColor: '#FFFFFF',
    fontFamily: 'JetBrains Mono',
    fontSize: 96,
    channelSeparationIntensity: 10,
    glitchFrequency: 3,
    scanlineIntensity: 0.15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glitchArtGradientPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
