/**
 * Scrapbook Tape Peel Transition Preset
 * 
 * This preset creates a charming, crafty transition where decorative washi tape strips
 * appear to hold the outgoing image in place, then peel away one by one with 3D rotation
 * animations. The outgoing image then falls/slides away with rotation, revealing the 
 * incoming image underneath with a subtle fade-in. Features stop-motion aesthetic through
 * stepped animations, perfect for DIY/scrapbooking YouTube content.
 * 
 * Features:
 * - Decorative washi tape strips at corners (pastel colors: pink, mint, cream)
 * - Sequential tape peel animation with 3D rotateX (0deg to 90deg)
 * - Staggered timing (150ms apart) for natural peel effect
 * - Stop-motion aesthetic using steps(6, end) easing
 * - Outgoing image falls with translateY and rotate
 * - Incoming image revealed with subtle fade-in and scale
 * - Warm scrapbook background (amber-100)
 * - 1.5s transition overlap
 * 
 * Use cases:
 * - DIY/craft YouTube content transitions
 * - Scrapbooking video intros/outros
 * - Memory/photo album style videos
 * - Crafty tutorial content
 * - Nostalgic/vintage style presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of outgoing media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of incoming media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of transition overlap in seconds'),
  tapeColors: z
    .object({
      topLeft: z.string().default('#ffc0cb').describe('Top-left tape color (pastel pink)'),
      topRight: z.string().default('#98d8c8').describe('Top-right tape color (pastel mint)'),
      bottomLeft: z.string().default('#f5f5dc').describe('Bottom-left tape color (pastel cream)'),
      bottomRight: z.string().default('#ffc0cb').describe('Bottom-right tape color (pastel pink)'),
    })
    .default({
      topLeft: '#ffc0cb',
      topRight: '#98d8c8',
      bottomLeft: '#f5f5dc',
      bottomRight: '#ffc0cb',
    })
    .describe('Washi tape colors for each corner'),
  backgroundColor: z
    .string()
    .default('#fef3c7')
    .describe('Background color (default: amber-100)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration, tapeColors, backgroundColor } = params;

  // Calculate BaseLayout duration (overlap subtraction)
  const baseLayoutDuration = media1.duration + media2.duration - transitionDuration;

  // Determine component IDs based on media type
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Timing calculations
  const tapePeelStart1 = 0;
  const tapePeelStart2 = 0.15; // 150ms stagger
  const tapePeelStart3 = 0.3;  // 300ms stagger
  const tapePeelStart4 = 0.45; // 450ms stagger
  const tapePeelDuration = 0.3;

  const outgoingFallStart = 0.9; // 60% of 1.5s overlap
  const outgoingFallDuration = 0.6;

  // Helper function to create tape strip HTML
  const createTapeHTML = (color: string): string => {
    return `<div style='width: 80px; height: 30px; background: linear-gradient(135deg, ${color} 0%, ${adjustColorBrightness(color, -10)} 50%, ${color} 100%); border-radius: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'></div>`;
  };

  // Helper function to adjust color brightness
  const adjustColorBrightness = (hex: string, percent: number): string => {
    // Simple brightness adjustment (this is a basic implementation)
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  };

  const childrenData: RenderableComponentData[] = [
    // Incoming media (z-0, underneath)
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration,
          duration: media2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-reveal-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'opacity', val: 0.9, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              { key: 'scale', val: 0.98, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Outgoing media (z-10, on top)
    {
      id: 'outgoing-media',
      type: 'atom',
      componentId: media1ComponentId,
      data: {
        src: media1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-fall-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingFallStart,
            duration: outgoingFallDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: 120, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 8, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Tape strip: top-left (z-20)
    {
      id: 'tape-top-left',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: createTapeHTML(tapeColors.topLeft),
        className: 'absolute',
        style: {
          top: '5%',
          left: '5%',
          zIndex: 20,
          transformOrigin: 'center center',
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
          id: 'tape-peel-effect-1',
          componentId: 'generic',
          data: {
            type: 'steps(6, end)',
            start: tapePeelStart1,
            duration: tapePeelDuration,
            mode: 'provider',
            targetIds: ['tape-top-left'],
            ranges: [
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: 90, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Tape strip: top-right (z-20)
    {
      id: 'tape-top-right',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: createTapeHTML(tapeColors.topRight),
        className: 'absolute',
        style: {
          top: '5%',
          right: '5%',
          zIndex: 20,
          transformOrigin: 'center center',
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
          id: 'tape-peel-effect-2',
          componentId: 'generic',
          data: {
            type: 'steps(6, end)',
            start: tapePeelStart2,
            duration: tapePeelDuration,
            mode: 'provider',
            targetIds: ['tape-top-right'],
            ranges: [
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: 90, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Tape strip: bottom-left (z-20)
    {
      id: 'tape-bottom-left',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: createTapeHTML(tapeColors.bottomLeft),
        className: 'absolute',
        style: {
          bottom: '5%',
          left: '5%',
          zIndex: 20,
          transformOrigin: 'center center',
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
          id: 'tape-peel-effect-3',
          componentId: 'generic',
          data: {
            type: 'steps(6, end)',
            start: tapePeelStart3,
            duration: tapePeelDuration,
            mode: 'provider',
            targetIds: ['tape-bottom-left'],
            ranges: [
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: 90, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Tape strip: bottom-right (z-20)
    {
      id: 'tape-bottom-right',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: createTapeHTML(tapeColors.bottomRight),
        className: 'absolute',
        style: {
          bottom: '5%',
          right: '5%',
          zIndex: 20,
          transformOrigin: 'center center',
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
          id: 'tape-peel-effect-4',
          componentId: 'generic',
          data: {
            type: 'steps(6, end)',
            start: tapePeelStart4,
            duration: tapePeelDuration,
            mode: 'provider',
            targetIds: ['tape-bottom-right'],
            ranges: [
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: 90, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'scrapbook-tape-peel-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
          backgroundColor: backgroundColor,
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
  id: 'scrapbook-tape-peel-transition',
  title: 'Scrapbook Tape Peel Transition',
  description:
    'A charming, crafty transition where decorative washi tape strips hold the outgoing image, then peel away one by one with 3D rotation animations. The outgoing image falls/slides away with rotation, revealing the incoming image underneath with a subtle fade-in. Features stop-motion aesthetic through stepped animations, perfect for DIY/scrapbooking YouTube content.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'scrapbook', 'washi-tape', 'crafty', 'diy', 'stop-motion', 'nostalgic'],
  defaultInputParams: {
    media1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
      type: 'image',
      duration: 5,
    },
    media2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
      type: 'image',
      duration: 5,
    },
    transitionDuration: 1.5,
    tapeColors: {
      topLeft: '#ffc0cb',
      topRight: '#98d8c8',
      bottomLeft: '#f5f5dc',
      bottomRight: '#ffc0cb',
    },
    backgroundColor: '#fef3c7',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const scrapbookTapePeelTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
