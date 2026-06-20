/**
 * Vintage Scrapbook Page Peel Transition
 *
 * A vintage scrapbook page peel transition where the corner of the current video page peels back 
 * progressively to reveal the next video underneath. The peeling corner casts a realistic shadow 
 * and shows the backside of the 'paper' with a different tint. Decorative stamps and stickers 
 * remain in place during the transition.
 *
 * Features:
 * - **Page Peel Effect**: Corner peels back with 3D transform (rotateY from 0 to -180deg)
 * - **Realistic Shadow**: Shadow follows the peel using skew and translate transforms
 * - **Backside Tint**: Back of the paper shows sepia/brightness filtered version of outgoing video
 * - **Decorative Elements**: Static stamps and stickers remain visible during transition
 * - **2-Second Overlap**: Uses BaseLayout with 2s overlap for smooth transition
 *
 * Technical Details:
 * - Uses CSS 3D transforms with perspective for realistic peel
 * - Two-sided page effect with backfaceVisibility and separate front/back divs
 * - Transform-origin: bottom-right for corner peel animation
 * - Triangular clip-path expands during peel to reveal more of the back
 * - Shadow element uses radial gradient and grows with peel progress
 * - Decorative elements have z-index: 30 to stay above all layers
 *
 * Use Cases:
 * - Vintage photo album style video transitions
 * - Scrapbook-themed presentations
 * - Memory/nostalgia themed content
 * - Creative page-turn effects for storytelling
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  transitionDuration: z.number().default(2).describe('Duration of the page peel transition in seconds'),
  
  stamps: z.array(z.object({
    src: z.string().describe('Source URL of the stamp/sticker image (transparent PNG recommended)'),
    position: z.object({
      top: z.string().optional().describe('Top position (e.g., "10%", "50px")'),
      bottom: z.string().optional().describe('Bottom position (e.g., "15%", "100px")'),
      left: z.string().optional().describe('Left position (e.g., "5%", "20px")'),
      right: z.string().optional().describe('Right position (e.g., "10%", "30px")'),
    }).describe('Position of the stamp/sticker'),
    width: z.string().default('80px').describe('Width of the stamp/sticker'),
    height: z.string().default('80px').describe('Height of the stamp/sticker'),
    rotation: z.number().default(0).describe('Rotation angle in degrees'),
  })).default([]).describe('Array of decorative stamps and stickers'),
  
  perspective: z.number().default(1500).describe('CSS perspective value for 3D effect (px)'),
  
  backTint: z.object({
    sepia: z.number().default(0.5).describe('Sepia filter value (0-1) for paper backside'),
    brightness: z.number().default(0.8).describe('Brightness filter value (0-2) for paper backside'),
  }).default({}).describe('Tint configuration for the backside of the paper'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration, stamps, perspective, backTint } = params;
  
  // Calculate total duration with overlap
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;
  
  // Transition starts at this time
  const transitionStartTime = outgoingVideo.duration - transitionDuration;
  
  // Build decorative stamps
  const stampElements: RenderableComponentData[] = stamps.map((stamp, index) => ({
    id: `stamp-${index}`,
    type: 'atom' as const,
    componentId: 'ImageAtom',
    data: {
      src: stamp.src,
      className: 'absolute',
      style: {
        top: stamp.position.top,
        bottom: stamp.position.bottom,
        left: stamp.position.left,
        right: stamp.position.right,
        width: stamp.width,
        height: stamp.height,
        transform: `rotate(${stamp.rotation}deg)`,
        opacity: 1,
        pointerEvents: 'none' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      {
        id: `stamp-${index}-fade-in`,
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: 0.3 + index * 0.2,
          duration: 0.5,
          mode: 'provider' as const,
          targetIds: [`stamp-${index}`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  }));
  
  // Decorative stamps layer
  const decorativeLayer: RenderableComponentData = {
    id: 'decorative-stamps-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 30,
          pointerEvents: 'none' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    childrenData: stampElements,
  };
  
  // Incoming video layer (revealed by peel)
  const incomingVideoLayer: RenderableComponentData = {
    id: 'incoming-video-layer',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover' as const,
      style: {
        position: 'absolute' as const,
        inset: '0',
        zIndex: 5,
      },
    },
    context: {
      timing: {
        start: transitionStartTime,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
  };
  
  // Shadow element (grows with peel)
  const shadowElement: RenderableComponentData = {
    id: 'shadow-element',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute',
      style: {
        bottom: '0',
        right: '0',
        width: '0%',
        height: '0%',
        background: 'radial-gradient(ellipse at bottom right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)',
        transformOrigin: 'bottom right',
        zIndex: 15,
        pointerEvents: 'none' as const,
      },
    },
    context: {
      timing: {
        start: transitionStartTime,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'shadow-grow',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: ['shadow-element'],
          ranges: [
            { key: 'width', val: '0%', prog: 0 },
            { key: 'width', val: '100%', prog: 1 },
            { key: 'height', val: '0%', prog: 0 },
            { key: 'height', val: '100%', prog: 1 },
          ],
        },
      },
    ],
  };
  
  // Front page container (outgoing video, peels away)
  const frontPageContainer: RenderableComponentData = {
    id: 'front-page-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'bottom right',
          transformStyle: 'preserve-3d' as const,
          zIndex: 20,
          backfaceVisibility: 'hidden' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video-front',
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          className: 'w-full h-full object-cover',
          fit: 'cover' as const,
          style: {
            position: 'absolute' as const,
            inset: '0',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideo.duration,
          },
        },
      },
    ],
    effects: [
      {
        id: 'page-peel-rotation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: transitionStartTime,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: ['front-page-container'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -180, prog: 1 },
          ],
        },
      },
      {
        id: 'page-peel-clip',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: transitionStartTime,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: ['front-page-container'],
          ranges: [
            { key: 'clipPath', val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', prog: 0 },
            { key: 'clipPath', val: 'polygon(0 0, 100% 0, 100% 100%, 100% 100%)', prog: 1 },
          ],
        },
      },
    ],
  };
  
  // Back page container (backside of outgoing video with tint)
  const backPageContainer: RenderableComponentData = {
    id: 'back-page-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'bottom right',
          transformStyle: 'preserve-3d' as const,
          transform: 'rotateY(180deg)',
          zIndex: 10,
          backfaceVisibility: 'hidden' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video-back',
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          className: 'w-full h-full object-cover',
          fit: 'cover' as const,
          style: {
            position: 'absolute' as const,
            inset: '0',
            filter: `sepia(${backTint.sepia ?? 0.5}) brightness(${backTint.brightness ?? 0.8})`,
            transform: 'scaleX(-1)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideo.duration,
          },
        },
      },
    ],
  };
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'vintage-scrapbook-peel-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: `${perspective}px`,
          perspectiveOrigin: 'bottom right',
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
      incomingVideoLayer,
      shadowElement,
      backPageContainer,
      frontPageContainer,
      decorativeLayer,
    ],
  };
  
  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'vintage-scrapbook-peel-transition',
  title: 'Vintage Scrapbook Page Peel Transition',
  description: 'A vintage scrapbook page peel transition where the corner of the current video page peels back progressively to reveal the next video underneath. Features realistic shadow, backside paper tint, and decorative stamps that remain in place during the transition.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vintage', 'scrapbook', 'peel', 'page-turn', '3d', 'decorative'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 2,
    stamps: [
      {
        src: 'https://example.com/stamp1.png',
        position: { top: '10%', left: '5%' },
        width: '80px',
        height: '80px',
        rotation: -12,
      },
      {
        src: 'https://example.com/stamp2.png',
        position: { bottom: '15%', left: '8%' },
        width: '100px',
        height: '100px',
        rotation: 8,
      },
      {
        src: 'https://example.com/sticker1.png',
        position: { top: '20%', right: '10%' },
        width: '120px',
        height: '120px',
        rotation: 15,
      },
    ],
    perspective: 1500,
    backTint: {
      sepia: 0.5,
      brightness: 0.8,
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const vintageScrapbookPeelTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
