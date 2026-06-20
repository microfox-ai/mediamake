/**
 * 90s PAL/NTSC Conversion Transition Preset
 *
 * This preset emulates the characteristic artifacts from PAL/NTSC format conversion
 * that were common when sharing VHS tapes internationally during the 1990s.
 *
 * Features:
 * - **Interlaced Combing Effect**: Horizontal line artifacts from reversed field order
 * - **Frame Rate Judder**: Choppy motion from 25fps PAL / 30fps NTSC conversion
 * - **Color Space Conversion Errors**: Oversaturated reds and unnatural skin tones
 * - **Aspect Ratio Issues**: Inconsistent pillarboxing/letterboxing with vertical squashing
 * - **Temporal Ghosting**: Frame blending artifacts creating ghost frames during motion
 * - **Progressive Degradation**: Generational quality loss (contrast, blur, brightness shifts)
 * - **Motion Artifacts**: Uneven timing patterns simulating conversion glitches
 *
 * Use cases:
 * - Creating nostalgic 90s-style video transitions
 * - Emulating international tape sharing artifacts
 * - Adding authentic VHS conversion aesthetics
 * - Simulating "copy of a copy" degradation effects
 */

import { z } from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ----- PARAMS SCHEMA -----
const presetParams = z.object({
  sourceVideo: z.string().describe('Source video URL to transition from'),
  destinationVideo: z.string().describe('Destination video URL to transition to'),
  transitionDuration: z.number().default(2).describe('Duration of the transition in seconds'),
  aspectRatioMode: z.enum(['pal-squash', 'ntsc-stretch', 'pillarbox', 'letterbox'])
    .default('pal-squash')
    .describe('Aspect ratio conversion mode (PAL vertical squash, NTSC horizontal stretch, or black bars)'),
  colorShiftIntensity: z.number().min(0).max(2).default(1.0)
    .describe('Intensity of color space conversion errors (0 = none, 1 = standard, 2 = extreme)'),
  combingIntensity: z.number().min(0).max(1).default(0.6)
    .describe('Intensity of interlaced combing effect (0 = none, 1 = maximum)'),
  ghostFrameOpacity: z.number().min(0).max(1).default(0.3)
    .describe('Opacity of temporal ghost frames for motion blur artifacts'),
  degradationAmount: z.number().min(0).max(2).default(1.0)
    .describe('Amount of generational quality loss (0 = none, 1 = standard, 2 = extreme)'),
  judderIntensity: z.number().min(0).max(1).default(1.0)
    .describe('Intensity of frame rate judder effect (0 = smooth, 1 = maximum judder)'),
});

// ----- EXECUTION FUNCTION -----
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    sourceVideo,
    destinationVideo,
    transitionDuration,
    aspectRatioMode,
    colorShiftIntensity,
    combingIntensity,
    ghostFrameOpacity,
    degradationAmount,
    judderIntensity,
  } = params;

  // Helper: Calculate aspect ratio transform based on mode
  const getAspectRatioTransform = (): { scaleY?: number; scaleX?: number; padding?: string } => {
    switch (aspectRatioMode) {
      case 'pal-squash':
        return { scaleY: 0.94 }; // PAL vertical squash
      case 'ntsc-stretch':
        return { scaleX: 1.06 }; // NTSC horizontal stretch
      case 'pillarbox':
        return { padding: '0 6%' }; // Vertical black bars
      case 'letterbox':
        return { padding: '4% 0' }; // Horizontal black bars
      default:
        return { scaleY: 0.94 };
    }
  };

  const aspectTransform = getAspectRatioTransform();

  // Helper: Generate color shift filter based on intensity
  const getColorShiftFilter = (intensity: number): string => {
    const saturate = 1 + (0.4 * intensity);
    const hueRotate = 5 * intensity;
    const contrast = 0.9 - (0.05 * (degradationAmount - 1));
    const brightness = 1.05 + (0.05 * degradationAmount);
    const blur = 0.5 + (0.5 * degradationAmount);
    
    return `saturate(${saturate}) hue-rotate(${hueRotate}deg) contrast(${contrast}) brightness(${brightness}) blur(${blur}px)`;
  };

  // ----- COMPONENT TREE -----

  // Ghost frame layers (temporal ghosting)
  const ghostFrameEarly: RenderableComponentData = {
    id: 'pal-ntsc-ghost-frame-early',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: sourceVideo,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        opacity: ghostFrameOpacity,
        mixBlendMode: 'screen',
      },
      startFrom: -0.04, // One PAL frame early
      muted: true,
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration * 0.8, // Fade out during transition
      },
    },
  };

  const ghostFrameLate: RenderableComponentData = {
    id: 'pal-ntsc-ghost-frame-late',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: sourceVideo,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        opacity: ghostFrameOpacity * 0.8,
        mixBlendMode: 'screen',
      },
      startFrom: 0.04, // One PAL frame late
      muted: true,
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration * 0.8,
      },
    },
  };

  // Source video layer
  const sourceVideoLayer: RenderableComponentData = {
    id: 'pal-ntsc-source-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: sourceVideo,
      className: 'absolute inset-0 w-full h-full object-cover',
      muted: false,
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'source-video-opacity-fade',
        componentId: 'pal-ntsc-source-video',
        data: {
          type: 'ease-in-out',
          start: transitionDuration * 0.4,
          duration: transitionDuration * 0.6,
          mode: 'provider',
          targetIds: ['pal-ntsc-source-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Destination video layer
  const destinationVideoLayer: RenderableComponentData = {
    id: 'pal-ntsc-destination-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: destinationVideo,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        opacity: 0,
      },
      muted: true,
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'destination-video-opacity-fade',
        componentId: 'pal-ntsc-destination-video',
        data: {
          type: 'ease-in-out',
          start: transitionDuration * 0.4,
          duration: transitionDuration * 0.6,
          mode: 'provider',
          targetIds: ['pal-ntsc-destination-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Video content wrapper with effects and aspect ratio
  const videoContentWrapper: RenderableComponentData = {
    id: 'pal-ntsc-video-content-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          ...(aspectTransform.scaleY && { transform: `scaleY(${aspectTransform.scaleY})` }),
          ...(aspectTransform.scaleX && { transform: `scaleX(${aspectTransform.scaleX})` }),
          filter: getColorShiftFilter(colorShiftIntensity),
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      ghostFrameEarly,
      ghostFrameLate,
      sourceVideoLayer,
      destinationVideoLayer,
    ],
    effects: [
      // Aspect ratio jitter effect
      {
        id: 'aspect-ratio-jitter',
        componentId: 'pal-ntsc-video-content-wrapper',
        data: {
          type: 'steps',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['pal-ntsc-video-content-wrapper'],
          ranges: [
            { key: 'scaleY', val: 0.92, prog: 0 },
            { key: 'scaleY', val: 0.96, prog: 0.5 },
            { key: 'scaleY', val: 0.93, prog: 1 },
          ],
        },
      },
    ],
  };

  // Aspect ratio container (with padding for pillarbox/letterbox)
  const aspectRatioContainer: RenderableComponentData = {
    id: 'pal-ntsc-aspect-ratio-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          ...(aspectTransform.padding && { padding: aspectTransform.padding }),
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [videoContentWrapper],
  };

  // Interlace combing overlay
  const interlaceCombingOverlay: RenderableComponentData = {
    id: 'pal-ntsc-interlace-combing-overlay',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      className: 'absolute inset-0 pointer-events-none z-10',
      style: {
        background: 'repeating-linear-gradient(transparent, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px)',
        opacity: combingIntensity,
        mixBlendMode: 'multiply',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Combing flicker effect (field order problems)
      {
        id: 'combing-flicker',
        componentId: 'pal-ntsc-interlace-combing-overlay',
        data: {
          type: 'steps',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['pal-ntsc-interlace-combing-overlay'],
          ranges: [
            { key: 'opacity', val: combingIntensity * 0.8, prog: 0 },
            { key: 'opacity', val: combingIntensity, prog: 0.5 },
            { key: 'opacity', val: combingIntensity * 0.7, prog: 1 },
          ],
        },
      },
    ],
  };

  // Color conversion overlay (appears mid-transition)
  const colorConversionOverlay: RenderableComponentData = {
    id: 'pal-ntsc-color-conversion-overlay',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      className: 'absolute inset-0 pointer-events-none z-20',
      style: {
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(255,80,80,0.08) 100%)',
        opacity: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Color shift pulse
      {
        id: 'color-shift-pulse',
        componentId: 'pal-ntsc-color-conversion-overlay',
        data: {
          type: 'ease-in-out',
          start: transitionDuration * 0.25,
          duration: transitionDuration * 0.5,
          mode: 'provider',
          targetIds: ['pal-ntsc-color-conversion-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.4 * colorShiftIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Noise grain overlay
  const noiseGrainOverlay: RenderableComponentData = {
    id: 'pal-ntsc-noise-grain-overlay',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      className: 'absolute inset-0 pointer-events-none z-30',
      style: {
        backgroundImage: `url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noise)"/%3E%3C/svg%3E')`,
        opacity: 0.12 * degradationAmount,
        mixBlendMode: 'overlay',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'pal-ntsc-conversion-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      aspectRatioContainer,
      interlaceCombingOverlay,
      colorConversionOverlay,
      noiseGrainOverlay,
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

// ----- METADATA -----
const presetMetadata: PresetMetadata = {
  id: 'pal-ntsc-conversion-transition',
  title: '90s PAL/NTSC Conversion Transition',
  description:
    'A nostalgic VHS-era transition that emulates the artifacts from PAL/NTSC format conversion when sharing tapes internationally. Features interlaced combing effects, frame rate judder, color space conversion errors (oversaturated reds, unnatural skin tones), temporal ghosting from frame blending, inconsistent pillarboxing/letterboxing, and progressive generational quality loss. Creates that authentic "copy of a copy" converted look with motion artifacts and color shifts.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vhs', 'pal', 'ntsc', 'conversion', 'retro', '90s', 'artifacts', 'interlaced', 'nostalgia'],
  defaultInputParams: {
    sourceVideo: 'https://example.com/source-video.mp4',
    destinationVideo: 'https://example.com/destination-video.mp4',
    transitionDuration: 2,
    aspectRatioMode: 'pal-squash',
    colorShiftIntensity: 1.0,
    combingIntensity: 0.6,
    ghostFrameOpacity: 0.3,
    degradationAmount: 1.0,
    judderIntensity: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ----- EXPORT -----
export const palNtscConversionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
