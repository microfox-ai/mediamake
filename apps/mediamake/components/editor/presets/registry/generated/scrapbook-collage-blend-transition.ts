/**
 * Scrapbook Collage Blend Transition Preset
 *
 * This preset creates a dynamic scrapbook collage transition effect where multiple torn paper pieces
 * containing fragments of both videos overlap and blend together during the transition. The effect
 * features 6-8 irregular torn paper shapes showing the outgoing video that slowly drift, rotate, and
 * fade while new torn shapes containing the incoming video slide in from various angles.
 *
 * Features:
 * - **Torn Paper Shapes**: 6-8 irregular torn SVG masks for authentic scrapbook aesthetic
 * - **Blend Modes**: Mix of multiply, screen, overlay, and normal blend modes for artistic double-exposure effects
 * - **Drift & Rotate**: Subtle drift animations with random translate and rotate values
 * - **Slide In Animations**: Incoming pieces slide in from outside viewport with gentle drift
 * - **Coffee Stain Overlays**: Animated coffee stain textures that fade in during overlap
 * - **Ink Splatter Effects**: Ink splatter shapes that scale from 0 to 1 at random times
 * - **Paper Crinkle Animation**: Subtle scale animation (1→1.02→1) for each piece
 * - **Extended Blend Duration**: 3 second overlap period for smooth transition
 *
 * Use cases:
 * - Creating artistic video transitions with scrapbook aesthetic
 * - Building memory/photo album style video sequences
 * - Adding vintage/crafted feel to video content
 * - Creating unique storytelling transitions between scenes
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of video1 in seconds'),
  }).describe('First video (outgoing)'),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of video2 in seconds'),
  }).describe('Second video (incoming)'),
  transitionDuration: z.number().default(3).describe('Duration of the transition overlap in seconds (default: 3s)'),
  coffeeStainOpacity: z.number().min(0).max(1).default(0.4).describe('Peak opacity of coffee stain overlays (default: 0.4)'),
  inkSplatterOpacity: z.number().min(0).max(1).default(0.7).describe('Opacity of ink splatter effects (default: 0.7)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, coffeeStainOpacity, inkSplatterOpacity } = params;

  // Calculate total duration with extended blend
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Define torn paper clip paths (irregular shapes)
  const tornPaperClips = [
    'polygon(5% 0%, 95% 3%, 100% 92%, 8% 100%, 0% 45%)',
    'polygon(2% 5%, 100% 0%, 97% 88%, 10% 100%, 0% 60%)',
    'polygon(0% 8%, 92% 0%, 100% 95%, 5% 100%)',
    'polygon(3% 2%, 100% 8%, 95% 100%, 0% 92%)',
    'polygon(8% 0%, 100% 5%, 92% 100%, 0% 95%)',
    'polygon(0% 3%, 95% 0%, 100% 97%, 5% 100%)',
  ];

  // Define blend modes (2 multiply, 2 screen, 2 overlay)
  const blendModes: Array<'multiply' | 'screen' | 'overlay' | 'normal'> = [
    'multiply',
    'screen',
    'overlay',
    'normal',
    'multiply',
    'screen',
  ];

  // Define positions for outgoing pieces
  const outgoingPositions = [
    { width: '45%', height: '40%', top: '5%', left: '2%' },
    { width: '50%', height: '35%', top: '8%', right: '3%' },
    { width: '40%', height: '45%', top: '35%', left: '8%' },
    { width: '48%', height: '38%', top: '40%', right: '5%' },
    { width: '38%', height: '32%', bottom: '10%', left: '5%' },
    { width: '42%', height: '36%', bottom: '8%', right: '8%' },
  ];

  // Define initial positions for incoming pieces (off-screen)
  const incomingInitialPositions = [
    { width: '52%', height: '42%', top: '3%', left: '-60%' },
    { width: '46%', height: '38%', top: '5%', right: '-55%' },
    { width: '44%', height: '40%', top: '-50%', left: '25%' },
    { width: '50%', height: '44%', bottom: '-55%', left: '20%' },
    { width: '40%', height: '35%', top: '30%', left: '-50%' },
    { width: '48%', height: '40%', top: '35%', right: '-55%' },
  ];

  // Define final positions for incoming pieces
  const incomingFinalPositions = [
    { left: '2%' },
    { right: '3%' },
    { left: '25%', top: '5%' },
    { left: '20%', bottom: '8%' },
    { left: '8%' },
    { right: '5%' },
  ];

  // Helper: Generate random drift values
  const generateDriftValues = () => {
    const translateX = (Math.random() * 40 - 20).toFixed(1); // -20px to 20px
    const translateY = (Math.random() * 40 - 20).toFixed(1);
    const rotate = (Math.random() * 6 - 3).toFixed(1); // -3deg to 3deg
    return { translateX, translateY, rotate };
  };

  // Helper: Generate crinkle effect (scale 1 → 1.02 → 1)
  const generateCrinkleEffect = (pieceId: string, duration: number) => {
    return {
      id: `crinkle-${pieceId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: 0,
        duration: duration,
        mode: 'provider' as const,
        targetIds: [pieceId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1.02, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    };
  };

  // Create outgoing torn pieces (video1)
  const outgoingPieces: RenderableComponentData[] = outgoingPositions.map((pos, index) => {
    const pieceId = `outgoing-piece-${index}`;
    const drift = generateDriftValues();
    const driftStartTime = video1.duration - transitionDuration;

    return {
      id: pieceId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          style: {
            position: 'absolute',
            ...pos,
            clipPath: tornPaperClips[index],
            mixBlendMode: blendModes[index],
            overflow: 'hidden',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        // Drift animation (starts at transition)
        {
          id: `drift-out-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out' as const,
            start: driftStartTime,
            duration: transitionDuration,
            mode: 'provider' as const,
            targetIds: [pieceId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: `${drift.translateX}px`, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: `${drift.translateY}px`, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: `${drift.rotate}deg`, prog: 1 },
            ],
          },
        },
        // Fade out during transition
        {
          id: `fade-out-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in' as const,
            start: driftStartTime,
            duration: transitionDuration,
            mode: 'provider' as const,
            targetIds: [pieceId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Paper crinkle effect
        generateCrinkleEffect(pieceId, video1.duration),
      ],
      childrenData: [
        {
          id: `${pieceId}-video`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  // Create incoming torn pieces (video2)
  const incomingPieces: RenderableComponentData[] = incomingInitialPositions.map((initialPos, index) => {
    const pieceId = `incoming-piece-${index}`;
    const finalPos = incomingFinalPositions[index];
    const drift = generateDriftValues();
    const incomingStart = video1.duration - transitionDuration;

    return {
      id: pieceId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          style: {
            position: 'absolute',
            ...initialPos,
            clipPath: tornPaperClips[index],
            mixBlendMode: blendModes[index],
            overflow: 'hidden',
          },
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: video2.duration + transitionDuration,
        },
      },
      effects: [
        // Slide in from outside viewport (1s)
        {
          id: `slide-in-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out' as const,
            start: 0,
            duration: 1,
            mode: 'provider' as const,
            targetIds: [pieceId],
            ranges: [
              // Animate to final position
              ...Object.entries(finalPos).map(([key, val]) => ({
                key,
                val: val,
                prog: 1,
              })),
            ],
          },
        },
        // Fade in
        {
          id: `fade-in-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out' as const,
            start: 0,
            duration: 1,
            mode: 'provider' as const,
            targetIds: [pieceId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Gentle drift after slide-in
        {
          id: `drift-in-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out' as const,
            start: 1,
            duration: transitionDuration - 1,
            mode: 'provider' as const,
            targetIds: [pieceId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: `${drift.translateX}px`, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: `${drift.translateY}px`, prog: 1 },
            ],
          },
        },
        // Paper crinkle effect
        generateCrinkleEffect(pieceId, video2.duration + transitionDuration),
      ],
      childrenData: [
        {
          id: `${pieceId}-video`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  // Coffee stain overlays
  const coffeeStainOverlays: RenderableComponentData[] = [
    {
      id: 'coffee-stain-1',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(circle, rgba(101,67,33,0.8) 0%, rgba(101,67,33,0.4) 40%, rgba(101,67,33,0) 70%);"></div>`,
        className: 'absolute',
        style: {
          top: '15%',
          left: '10%',
          width: '30%',
          height: '30%',
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'coffee-stain-1-anim',
          componentId: 'generic',
          data: {
            type: 'ease-in-out' as const,
            start: 0,
            duration: transitionDuration,
            mode: 'provider' as const,
            targetIds: ['coffee-stain-1'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: coffeeStainOpacity, prog: 0.27 },
              { key: 'opacity', val: coffeeStainOpacity * 0.5, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    {
      id: 'coffee-stain-2',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(circle, rgba(101,67,33,0.8) 0%, rgba(101,67,33,0.4) 40%, rgba(101,67,33,0) 70%);"></div>`,
        className: 'absolute',
        style: {
          bottom: '20%',
          right: '15%',
          width: '25%',
          height: '25%',
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration + 0.5,
          duration: transitionDuration - 0.5,
        },
      },
      effects: [
        {
          id: 'coffee-stain-2-anim',
          componentId: 'generic',
          data: {
            type: 'ease-in-out' as const,
            start: 0,
            duration: transitionDuration - 0.5,
            mode: 'provider' as const,
            targetIds: ['coffee-stain-2'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: coffeeStainOpacity, prog: 0.3 },
              { key: 'opacity', val: coffeeStainOpacity * 0.5, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Ink splatter effects
  const inkSplatters: RenderableComponentData[] = [
    {
      id: 'ink-splatter-1',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"%23000\"/><circle cx=\"20\" cy=\"30\" r=\"15\" fill=\"%23000\"/><circle cx=\"75\" cy=\"65\" r=\"18\" fill=\"%23000\"/></svg>') no-repeat center; background-size: contain;"></div>`,
        className: 'absolute',
        style: {
          top: '40%',
          left: '5%',
          width: '20%',
          height: '20%',
          opacity: inkSplatterOpacity,
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration + 0.5,
          duration: transitionDuration - 0.5,
        },
      },
      effects: [
        {
          id: 'ink-splatter-1-scale',
          componentId: 'generic',
          data: {
            type: 'spring' as const,
            start: 0,
            duration: 0.5,
            mode: 'provider' as const,
            targetIds: ['ink-splatter-1'],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    {
      id: 'ink-splatter-2',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"45\" cy=\"55\" r=\"35\" fill=\"%23000\"/><circle cx=\"70\" cy=\"30\" r=\"12\" fill=\"%23000\"/><circle cx=\"25\" cy=\"75\" r=\"20\" fill=\"%23000\"/></svg>') no-repeat center; background-size: contain;"></div>`,
        className: 'absolute',
        style: {
          top: '25%',
          right: '10%',
          width: '18%',
          height: '18%',
          opacity: inkSplatterOpacity * 0.86,
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration + 1,
          duration: transitionDuration - 1,
        },
      },
      effects: [
        {
          id: 'ink-splatter-2-scale',
          componentId: 'generic',
          data: {
            type: 'spring' as const,
            start: 0,
            duration: 0.5,
            mode: 'provider' as const,
            targetIds: ['ink-splatter-2'],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    {
      id: 'ink-splatter-3',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"45\" r=\"38\" fill=\"%23000\"/><circle cx=\"15\" cy=\"20\" r=\"10\" fill=\"%23000\"/><circle cx=\"80\" cy=\"75\" r=\"16\" fill=\"%23000\"/></svg>') no-repeat center; background-size: contain;"></div>`,
        className: 'absolute',
        style: {
          bottom: '30%',
          left: '45%',
          width: '22%',
          height: '22%',
          opacity: inkSplatterOpacity * 0.93,
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration + 1.5,
          duration: transitionDuration - 1.5,
        },
      },
      effects: [
        {
          id: 'ink-splatter-3-scale',
          componentId: 'generic',
          data: {
            type: 'spring' as const,
            start: 0,
            duration: 0.5,
            mode: 'provider' as const,
            targetIds: ['ink-splatter-3'],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'scrapbook-collage-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#1a1a1a',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      ...outgoingPieces,
      ...incomingPieces,
      ...coffeeStainOverlays,
      ...inkSplatters,
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
  id: 'scrapbook-collage-blend-transition',
  title: 'Scrapbook Collage Blend Transition',
  description: 'A creative transition effect featuring multiple torn paper pieces containing fragments of both videos that overlap and blend together. The outgoing video appears through 6 irregular torn paper shapes that drift, rotate, and fade while new torn shapes containing the incoming video slide in from various angles. Artistic double-exposure effects are achieved through mix blend modes (multiply, screen, overlay, normal). Coffee stain and ink splatter overlays animate in during the transition period, and subtle paper crinkle animations add texture to individual pieces.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'scrapbook', 'collage', 'torn-paper', 'blend-modes', 'artistic', 'vintage'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 3,
    coffeeStainOpacity: 0.4,
    inkSplatterOpacity: 0.7,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const scrapbookCollageBlendTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
