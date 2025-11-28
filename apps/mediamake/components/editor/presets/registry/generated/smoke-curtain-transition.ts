/**
 * Smoke Curtain Transition Preset
 *
 * A theatrical 2.2-second transition where fog particles form a vertical curtain that sweeps 
 * left-to-right, progressively covering the outgoing video while revealing the incoming video 
 * behind it. Features multi-layered smoke effects moving at different speeds for depth, 
 * clip-path masking animations, and subtle cool blue color temperature shifts during transition.
 *
 * FEATURES:
 * - Progressive clip-path curtain effect (left-to-right sweep)
 * - Multi-layered smoke particles (foreground, mid, background) with parallax speed
 * - Color temperature shifts (cool blue tint during transition)
 * - Synchronized opacity, blur, and hue-rotate animations
 * - 2.2-second theatrical transition timing
 *
 * USE CASES:
 * - Dramatic scene transitions
 * - Theatrical video reveals
 * - Story-driven content transitions
 * - Cinematic video sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  outgoingVideoDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  incomingVideoDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  transitionDuration: z
    .number()
    .default(2.2)
    .describe('Duration of the transition overlap in seconds (default: 2.2s)'),
  smokeIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.6)
    .describe('Intensity of the smoke effect (0.1 to 1, default: 0.6)'),
  smokeColor: z
    .string()
    .default('rgba(180, 200, 220, 0.5)')
    .describe('Color of the smoke particles (default: cool blue)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    outgoingVideoDuration,
    incomingVideoSrc,
    incomingVideoDuration,
    transitionDuration,
    smokeIntensity,
    smokeColor,
  } = params;

  // Calculate timing
  const baseLayoutDuration =
    outgoingVideoDuration + incomingVideoDuration - transitionDuration;
  const incomingStartTime = outgoingVideoDuration - transitionDuration;

  // Parse smoke color for layering
  const parseSmokeColor = (color: string, opacity: number): string => {
    // Extract RGB values and apply new opacity
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity * smokeIntensity})`;
    }
    return color;
  };

  const childrenData: RenderableComponentData[] = [
    // Outgoing video (bottom layer, z-index: 1)
    {
      id: 'smoke-curtain-outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        volume: 1,
        muted: false,
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideoDuration,
        },
      },
      effects: [
        // Clip-path animation: full rectangle to right edge (curtain sweep)
        {
          id: 'outgoing-clip-path',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingVideoDuration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['smoke-curtain-outgoing-video'],
            ranges: [
              {
                key: 'clipPath',
                val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                prog: 0,
              },
              {
                key: 'clipPath',
                val: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)',
                prog: 1,
              },
            ],
          },
        },
        // Opacity fade: 1 → 0.3 → 0
        {
          id: 'outgoing-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingVideoDuration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['smoke-curtain-outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.6 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Blur: 0 → 12px
        {
          id: 'outgoing-blur',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingVideoDuration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['smoke-curtain-outgoing-video'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(12px)', prog: 1 },
            ],
          },
        },
        // Hue rotate: 0 → 10deg (warm shift)
        {
          id: 'outgoing-hue',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingVideoDuration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['smoke-curtain-outgoing-video'],
            ranges: [
              { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
              { key: 'filter', val: 'hue-rotate(10deg)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video (middle layer, z-index: 2)
    {
      id: 'smoke-curtain-incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideoSrc,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        volume: 0,
        muted: true,
      },
      context: {
        timing: {
          start: incomingStartTime,
          duration: incomingVideoDuration + transitionDuration,
        },
      },
      effects: [
        // Clip-path animation: left edge to full rectangle (reveal)
        {
          id: 'incoming-clip-path',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['smoke-curtain-incoming-video'],
            ranges: [
              {
                key: 'clipPath',
                val: 'polygon(0 0, 0 0, 0 100%, 0 100%)',
                prog: 0,
              },
              {
                key: 'clipPath',
                val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                prog: 1,
              },
            ],
          },
        },
        // Opacity fade: 0 → 1
        {
          id: 'incoming-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['smoke-curtain-incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Blur: 15px → 0
        {
          id: 'incoming-blur',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['smoke-curtain-incoming-video'],
            ranges: [
              { key: 'filter', val: 'blur(15px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
        // Hue rotate: -10deg → 0 (cool to neutral)
        {
          id: 'incoming-hue',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['smoke-curtain-incoming-video'],
            ranges: [
              { key: 'filter', val: 'hue-rotate(-10deg)', prog: 0 },
              { key: 'filter', val: 'hue-rotate(0deg)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Smoke layer container (top layer, z-index: 3)
    {
      id: 'smoke-curtain-smoke-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 3,
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: incomingStartTime,
          duration: transitionDuration,
        },
      },
      childrenData: [
        // Background smoke layer (slowest)
        {
          id: 'smoke-layer-background',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: 100%; height: 100%; background: radial-gradient(ellipse at center, ${parseSmokeColor(smokeColor, 0.5)} 0%, ${parseSmokeColor(smokeColor, 0.3)} 30%, transparent 70%);"></div>`,
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            // Opacity: 0 → 0.8 → 0
            {
              id: 'smoke-bg-opacity',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['smoke-layer-background'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.8, prog: 0.5 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
            // Translate (slow sweep left-to-right)
            {
              id: 'smoke-bg-translate',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['smoke-layer-background'],
                ranges: [
                  { key: 'translateX', val: '-20%', prog: 0 },
                  { key: 'translateX', val: '120%', prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // Mid smoke layer (medium speed)
        {
          id: 'smoke-layer-mid',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: 100%; height: 100%; background: radial-gradient(ellipse at center, ${parseSmokeColor(smokeColor, 0.6)} 0%, ${parseSmokeColor(smokeColor, 0.4)} 40%, transparent 75%);"></div>`,
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            // Opacity: 0 → 1 → 0
            {
              id: 'smoke-mid-opacity',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['smoke-layer-mid'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.5 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
            // Translate (medium speed sweep)
            {
              id: 'smoke-mid-translate',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: transitionDuration * 0.85,
                mode: 'provider',
                targetIds: ['smoke-layer-mid'],
                ranges: [
                  { key: 'translateX', val: '-30%', prog: 0 },
                  { key: 'translateX', val: '130%', prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // Foreground smoke layer (fastest)
        {
          id: 'smoke-layer-foreground',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: 100%; height: 100%; background: radial-gradient(ellipse at center, ${parseSmokeColor(smokeColor, 0.7)} 0%, ${parseSmokeColor(smokeColor, 0.5)} 50%, transparent 80%);"></div>`,
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            // Opacity: 0 → 1.2 → 0
            {
              id: 'smoke-fg-opacity',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['smoke-layer-foreground'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1.2, prog: 0.5 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
            // Translate (fast sweep left-to-right)
            {
              id: 'smoke-fg-translate',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: transitionDuration * 0.7,
                mode: 'provider',
                targetIds: ['smoke-layer-foreground'],
                ranges: [
                  { key: 'translateX', val: '-40%', prog: 0 },
                  { key: 'translateX', val: '140%', prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'smoke-curtain-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          backgroundColor: '#000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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
  id: 'smoke-curtain-transition',
  title: 'Smoke Curtain Transition',
  description:
    'A theatrical 2.2-second transition where fog particles form a vertical curtain that sweeps left-to-right, progressively covering the outgoing video while revealing the incoming video behind it. Features multi-layered smoke effects moving at different speeds for depth, clip-path masking animations, and subtle cool blue color temperature shifts during transition.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'smoke',
    'fog',
    'curtain',
    'theatrical',
    'cinematic',
    'masking',
    'video',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    outgoingVideoDuration: 10,
    incomingVideoSrc: 'https://example.com/video2.mp4',
    incomingVideoDuration: 10,
    transitionDuration: 2.2,
    smokeIntensity: 0.6,
    smokeColor: 'rgba(180, 200, 220, 0.5)',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const smokeCurtainTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
