/**
 * Glitch Rapid Cut Preset
 *
 * A glitch-style rapid cut preset inspired by corrupted digital video feeds and datamoshing techniques.
 * Images appear to tear into existence with horizontal scan lines, RGB channel separation, and pixel sorting effects.
 * Each image transition feels like a digital malfunction with fragments of previous images briefly persisting.
 *
 * Features:
 * - RGB channel separation with drop-shadow filters
 * - Horizontal scan line overlay
 * - Random frame drops and stutters (30-60ms durations)
 * - Digital noise bursts
 * - Color channel shifts (hue-rotate, saturate)
 * - Glitch transitions with clipPath, skewX, opacity flickers
 * - VHS tracking line effect
 * - Random duration logic for stutter frames
 *
 * Use cases:
 * - Corrupted digital video aesthetic
 * - Datamoshing style transitions
 * - Interrupted satellite transmission effects
 * - Tech/cyberpunk visual styles
 * - Damaged video file simulations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
        duration: z
          .number()
          .default(1)
          .describe('Base duration in seconds (may be shortened for stutter)'),
      }),
    )
    .describe('Array of images to display with glitch effects'),
  baseDuration: z
    .number()
    .default(1)
    .describe('Base duration per image in seconds'),
  stutterProbability: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Probability (0-1) that an image will be a stutter frame'),
  stutterDurationMin: z
    .number()
    .default(0.03)
    .describe('Minimum stutter duration in seconds (30ms)'),
  stutterDurationMax: z
    .number()
    .default(0.06)
    .describe('Maximum stutter duration in seconds (60ms)'),
  glitchTransitionDuration: z
    .number()
    .default(0.08)
    .describe('Duration of glitch transition effects (50-100ms)'),
  rgbSplitIntensity: z
    .number()
    .default(2)
    .describe('RGB channel split intensity in pixels'),
  scanLineOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity of scan line overlay'),
  noiseIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of digital noise bursts'),
  trackName: z
    .string()
    .default('glitch-rapid-cut')
    .describe('Track name for component IDs'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Generate random stutter duration
  const getStutterDuration = (): number => {
    return (
      Math.random() * (params.stutterDurationMax - params.stutterDurationMin) +
      params.stutterDurationMin
    );
  };

  // Helper: Determine if this image should stutter
  const shouldStutter = (): boolean => {
    return Math.random() < params.stutterProbability;
  };

  // Helper: Generate random clipPath inset values for glitch effect
  const randomClipPath = (): string => {
    const top = Math.random() * 30;
    const right = Math.random() * 10;
    const bottom = Math.random() * 30;
    const left = Math.random() * 10;
    return `inset(${top}% ${right}% ${bottom}% ${left}%)`;
  };

  // Helper: Generate random skewX value
  const randomSkewX = (): number => {
    return Math.random() * 10 - 5; // -5deg to 5deg
  };

  // Helper: Generate random hue-rotate value
  const randomHueRotate = (): number => {
    return Math.random() * 60 - 30; // -30deg to 30deg
  };

  // Helper: Generate random saturate value
  const randomSaturate = (): number => {
    return 0.8 + Math.random() * 0.4; // 0.8 to 1.2
  };

  // Calculate timing for each image
  let cumulativeTime = 0;
  const imageTimings: Array<{
    start: number;
    duration: number;
    isStutter: boolean;
  }> = [];

  params.images.forEach((image) => {
    const isStutter = shouldStutter();
    const duration = isStutter
      ? getStutterDuration()
      : image.duration || params.baseDuration;

    imageTimings.push({
      start: cumulativeTime,
      duration,
      isStutter,
    });

    cumulativeTime += duration;
  });

  const totalDuration = cumulativeTime;

  // Create image nodes with glitch effects
  const imageNodes: RenderableComponentData[] = params.images.map(
    (image, index) => {
      const timing = imageTimings[index];
      const imageId = `${params.trackName}-image-${index}`;

      // Create glitch transition effects
      const glitchEffects: any[] = [];

      // Effect 1: ClipPath glitch
      glitchEffects.push({
        id: `${imageId}-clippath-glitch`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: params.glitchTransitionDuration,
          mode: 'provider',
          targetIds: [imageId],
          ranges: [
            { key: 'clipPath', val: randomClipPath(), prog: 0 },
            { key: 'clipPath', val: 'inset(0% 0% 0% 0%)', prog: 0.5 },
            { key: 'clipPath', val: randomClipPath(), prog: 0.7 },
            { key: 'clipPath', val: 'inset(0% 0% 0% 0%)', prog: 1 },
          ],
        },
      });

      // Effect 2: SkewX glitch
      glitchEffects.push({
        id: `${imageId}-skew-glitch`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: params.glitchTransitionDuration,
          mode: 'provider',
          targetIds: [imageId],
          ranges: [
            { key: 'skewX', val: randomSkewX(), prog: 0 },
            { key: 'skewX', val: 0, prog: 0.5 },
            { key: 'skewX', val: randomSkewX(), prog: 0.8 },
            { key: 'skewX', val: 0, prog: 1 },
          ],
        },
      });

      // Effect 3: Opacity flicker
      glitchEffects.push({
        id: `${imageId}-opacity-flicker`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: params.glitchTransitionDuration,
          mode: 'provider',
          targetIds: [imageId],
          ranges: [
            { key: 'opacity', val: 0.3, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 0.5, prog: 0.4 },
            { key: 'opacity', val: 1, prog: 0.6 },
            { key: 'opacity', val: 0.8, prog: 0.8 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      });

      // Effect 4: Hue-rotate and saturate color shift
      const hueRotateVal = randomHueRotate();
      const saturateVal = randomSaturate();
      glitchEffects.push({
        id: `${imageId}-color-shift`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: params.glitchTransitionDuration * 2,
          mode: 'provider',
          targetIds: [imageId],
          ranges: [
            {
              key: 'filter',
              val: `hue-rotate(${hueRotateVal}deg) saturate(${saturateVal})`,
              prog: 0,
            },
            { key: 'filter', val: 'hue-rotate(0deg) saturate(1)', prog: 1 },
          ],
        },
      });

      // Add noise burst effect during transition
      if (params.noiseIntensity > 0 && !timing.isStutter) {
        glitchEffects.push({
          id: `${imageId}-noise-burst`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: params.glitchTransitionDuration,
            mode: 'provider',
            targetIds: [imageId],
            ranges: [
              { key: 'brightness', val: 1 + params.noiseIntensity, prog: 0 },
              { key: 'brightness', val: 1, prog: 0.5 },
              { key: 'brightness', val: 1 + params.noiseIntensity * 0.5, prog: 0.7 },
              { key: 'brightness', val: 1, prog: 1 },
            ],
          },
        });
      }

      return {
        id: imageId,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: image.src,
          className: 'absolute inset-0 object-cover',
          style: {
            filter: `drop-shadow(${params.rgbSplitIntensity}px 0 0 red) drop-shadow(-${params.rgbSplitIntensity}px 0 0 cyan)`,
          },
        },
        context: {
          timing: {
            start: timing.start,
            duration: timing.duration,
          },
        },
        effects: glitchEffects,
      } as RenderableComponentData;
    },
  );

  // Create scan line overlay
  const scanLineOverlay: RenderableComponentData = {
    id: `${params.trackName}-scanline-overlay`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; pointer-events: none; opacity: ${params.scanLineOpacity}; background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.15) 1px, transparent 1px, transparent 2px);"></div>`,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData;

  // Create VHS tracking line effect
  const trackingLine: RenderableComponentData = {
    id: `${params.trackName}-tracking-line`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="position: absolute; width: 100%; height: 2px; background: rgba(255, 255, 255, 0.8); left: 0; top: 0;"></div>',
      className: 'absolute',
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: `${params.trackName}-tracking-line-anim`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: [`${params.trackName}-tracking-line`],
          ranges: [
            { key: 'translateY', val: '0vh', prog: 0 },
            { key: 'translateY', val: '100vh', prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Create image sequence container
  const imageSequenceContainer: RenderableComponentData = {
    id: `${params.trackName}-image-sequence`,
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
        duration: totalDuration,
      },
    },
    childrenData: imageNodes,
  } as RenderableComponentData;

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: `${params.trackName}-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [imageSequenceContainer, scanLineOverlay, trackingLine],
  } as RenderableComponentData;

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
  id: 'glitch-rapid-cut',
  title: 'Glitch Rapid Cut Preset',
  description:
    'A glitch-style rapid cut preset inspired by corrupted digital video feeds and datamoshing techniques. Features horizontal scan lines, RGB channel separation, pixel sorting effects, digital malfunction transitions, frame stutters, and color channel shifts. Creates the aesthetic of damaged video files or interrupted satellite transmissions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'glitch',
    'rapid-cut',
    'datamosh',
    'corrupted',
    'digital',
    'vhs',
    'rgb-split',
    'scan-lines',
    'stutter',
    'cyberpunk',
  ],
  defaultInputParams: {
    images: [
      { src: 'https://picsum.photos/1920/1080?random=1', duration: 1 },
      { src: 'https://picsum.photos/1920/1080?random=2', duration: 1 },
      { src: 'https://picsum.photos/1920/1080?random=3', duration: 1 },
      { src: 'https://picsum.photos/1920/1080?random=4', duration: 1 },
      { src: 'https://picsum.photos/1920/1080?random=5', duration: 1 },
    ],
    baseDuration: 1,
    stutterProbability: 0.3,
    stutterDurationMin: 0.03,
    stutterDurationMax: 0.06,
    glitchTransitionDuration: 0.08,
    rgbSplitIntensity: 2,
    scanLineOpacity: 0.3,
    noiseIntensity: 0.5,
    trackName: 'glitch-rapid-cut',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glitchRapidCutPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
