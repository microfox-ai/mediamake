/**
 * Camera Flash with Afterimage Transition
 *
 * A realistic camera flash transition that simulates the visual phenomenon after being flashed.
 * Includes sharp white flash, complementary color afterimage (purple-magenta tint), and pupil
 * dilation effect simulated by vignette expansion.
 *
 * Features:
 * - **Sharp White Flash**: Fast attack (0.08s) with peak at 20% of overlap
 * - **Afterimage Effect**: Purple/green complementary color overlay with screen blend mode
 * - **Pupil Dilation**: Vignette expansion simulating eye adjustment
 * - **Brightness Spike**: Outgoing image brightness 1→3→1 over first 50%
 * - **Warm Color Correction**: Incoming image with slight warm hue-rotate as eyes adjust
 * - **Fast Attack, Medium Decay**: Punchy timing with smooth fade-out
 *
 * Use cases:
 * - Creating realistic camera flash transitions between photos or videos
 * - Simulating photography-style transitions
 * - Adding dramatic impact between scenes
 * - Creating eye-catching visual effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingImageSrc: z.string().describe('Source URL of outgoing image/video'),
  incomingImageSrc: z.string().describe('Source URL of incoming image/video'),
  transitionDuration: z
    .number()
    .default(0.4)
    .describe('Duration of transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingImageSrc, incomingImageSrc, transitionDuration } = params;

  // Calculate timing for various effects
  const flashPeakTime = transitionDuration * 0.2; // 20% = 0.08s
  const flashAttackDuration = flashPeakTime; // 0-0.08s
  const flashDecayDuration = 0.04; // 0.08-0.12s

  const afterimageStartTime = transitionDuration * 0.25; // 25% = 0.1s
  const afterimagePeakTime = transitionDuration * 0.45; // 45% = 0.18s
  const afterimageEndTime = transitionDuration * 0.7; // 70% = 0.28s

  const incomingFadeStartTime = transitionDuration * 0.4; // 40% = 0.16s
  const incomingFadeDuration = transitionDuration * 0.6; // 40-100% = 0.16-0.4s

  // Outgoing image (bottom layer, z-index: 10)
  const outgoingImage: RenderableComponentData = {
    id: 'outgoing-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: outgoingImageSrc,
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
      // Brightness spike: 1→3→1 over first 50% (0-0.2s)
      {
        id: 'outgoing-brightness-spike',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration * 0.5,
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'brightness', val: 1, prog: 0 },
            { key: 'brightness', val: 3, prog: 0.5 },
            { key: 'brightness', val: 1, prog: 1 },
          ],
        },
      },
      // Opacity fade: 1→0 from 50-100% (0.2-0.4s)
      {
        id: 'outgoing-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: transitionDuration * 0.5,
          duration: transitionDuration * 0.5,
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming image (middle layer, z-index: 20)
  const incomingImage: RenderableComponentData = {
    id: 'incoming-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: incomingImageSrc,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 20,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Opacity fade in: 0→1 from 40-100% (0.16-0.4s)
      {
        id: 'incoming-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: incomingFadeStartTime,
          duration: incomingFadeDuration,
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Brightness and hue-rotate for warm color correction
      {
        id: 'incoming-color-adjust',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: incomingFadeStartTime,
          duration: incomingFadeDuration,
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'brightness', val: 1.5, prog: 0 },
            { key: 'brightness', val: 1, prog: 1 },
            { key: 'hueRotate', val: 5, prog: 0 }, // 5deg warm shift
            { key: 'hueRotate', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Vignette for pupil dilation effect (z-index: 30)
  const vignetteHtml = `<div style="width: 100%; height: 100%; background: radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.8) 100%);"></div>`;

  const vignettePupil: RenderableComponentData = {
    id: 'vignette-pupil',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: vignetteHtml,
      className: 'absolute inset-0',
      style: {
        zIndex: 30,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Scale animation: 1.1→1 simulating pupil dilation
      {
        id: 'vignette-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['vignette-pupil'],
          ranges: [
            { key: 'scale', val: 1.1, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Afterimage overlay (purple, screen blend mode, z-index: 35)
  const afterimageHtml = `<div style="width: 100%; height: 100%; background: #9932CC; mix-blend-mode: screen;"></div>`;

  const afterimageOverlay: RenderableComponentData = {
    id: 'afterimage-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: afterimageHtml,
      className: 'absolute inset-0',
      style: {
        zIndex: 35,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Afterimage opacity: delayed start at 25%, peaks at 45%, fades by 70%
      {
        id: 'afterimage-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: afterimageStartTime,
          duration: afterimageEndTime - afterimageStartTime,
          mode: 'provider',
          targetIds: ['afterimage-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            {
              key: 'opacity',
              val: 0.3,
              prog:
                (afterimagePeakTime - afterimageStartTime) /
                (afterimageEndTime - afterimageStartTime),
            },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // White flash (z-index: 40)
  const whiteFlashHtml = `<div style="width: 100%; height: 100%; background: white;"></div>`;

  const whiteFlash: RenderableComponentData = {
    id: 'white-flash',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: whiteFlashHtml,
      className: 'absolute inset-0',
      style: {
        zIndex: 40,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Flash opacity: 0→1→0 with peak at 20% (0.08s), fast attack
      {
        id: 'flash-opacity',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: flashAttackDuration + flashDecayDuration,
          mode: 'provider',
          targetIds: ['white-flash'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            {
              key: 'opacity',
              val: 1,
              prog: flashAttackDuration / (flashAttackDuration + flashDecayDuration),
            },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'camera-flash-transition-container',
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
        duration: transitionDuration,
      },
    },
    childrenData: [
      outgoingImage,
      incomingImage,
      vignettePupil,
      afterimageOverlay,
      whiteFlash,
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
  id: 'camera-flash-afterimage',
  title: 'Camera Flash with Afterimage Transition',
  description:
    'A realistic camera flash transition with purple/green complementary color afterimage effect, simulating the visual phenomenon after being flashed. Includes brightness spike, color overlay with screen blend mode, and pupil dilation vignette effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'flash', 'afterimage', 'camera', 'visual-effect'],
  defaultInputParams: {
    outgoingImageSrc: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    incomingImageSrc: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
    transitionDuration: 0.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cameraFlashAfterimagePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
