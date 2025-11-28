/**
 * Organic Film Burn Transition Preset
 *
 * Creates a cinematic film burn transition effect where the outgoing video appears to 
 * burn away with irregular, animated borders, revealing the incoming video underneath.
 * Simulates celluloid melting with authentic projector flicker at 24fps intervals.
 *
 * Features:
 * - **Irregular Burn Edges**: Complex polygon clip-path morphs from full frame to jagged shapes
 * - **Projector Flicker**: Rapid opacity variations (0.7-1.0) at 24fps to simulate analog film
 * - **Overexposed Reveal**: Incoming video starts highly saturated and bright, normalizing smoothly
 * - **Subtle Zoom**: Incoming video has slight scale effect for depth
 * - **1.2 Second Duration**: Optimized timing for cinematic feel
 *
 * Use cases:
 * - Vintage film aesthetic transitions
 * - Nostalgic video montages
 * - Period piece content
 * - Creative video storytelling with analog warmth
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    startFrom: z.number().optional().describe('Start time of outgoing video (seconds)'),
  }).describe('The video that burns away'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    startFrom: z.number().optional().describe('Start time of incoming video (seconds)'),
  }).describe('The video that is revealed'),
  
  transitionDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the burn transition in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;
  
  // IDs for targeting
  const outgoingVideoId = 'outgoing-video';
  const incomingVideoId = 'incoming-video';
  
  // Create flicker keyframes (30 keyframes over 1.2s at ~24fps)
  const generateFlickerKeyframes = () => {
    const keyframes = [];
    const flickerValues = [1, 0.85, 1, 0.75, 0.95, 0.8, 1, 0.7, 0.9, 0.75, 1, 0.85, 0.7, 0.95, 0.8, 1, 0.75, 0.85, 0.7, 0.9, 0.8, 1, 0.75, 0.85, 0.7, 0.9, 0.75, 0.8, 0.7, 0.5, 0];
    
    for (let i = 0; i < flickerValues.length; i++) {
      keyframes.push({
        key: 'opacity',
        val: flickerValues[i],
        prog: i / (flickerValues.length - 1),
      });
    }
    
    return keyframes;
  };
  
  // Build child nodes
  const childrenData: RenderableComponentData[] = [
    // Incoming video (bottom layer, z-0)
    {
      id: incomingVideoId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        startFrom: incomingVideo.startFrom || 0,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        // Filter effect: saturate(3) brightness(1.8) blur(1px) → normal
        {
          id: 'incoming-filter-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [incomingVideoId],
            ranges: [
              { key: 'filter', val: 'saturate(3) brightness(1.8) blur(1px)', prog: 0 },
              { key: 'filter', val: 'saturate(2) brightness(1.4) blur(0.5px)', prog: 0.5 },
              { key: 'filter', val: 'saturate(1) brightness(1) blur(0px)', prog: 1 },
            ],
          },
        },
        // Scale effect: 1.02 → 1.0
        {
          id: 'incoming-scale-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [incomingVideoId],
            ranges: [
              { key: 'scale', val: 1.02, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Outgoing video (top layer, z-10)
    {
      id: outgoingVideoId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        startFrom: outgoingVideo.startFrom || 0,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
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
        // Clip-path effect: morphs from full rectangle to irregular burned shape
        {
          id: 'burn-clip-path-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [outgoingVideoId],
            ranges: [
              { key: 'clipPath', val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', prog: 0 },
              { key: 'clipPath', val: 'polygon(5% 3%, 95% 8%, 92% 45%, 88% 88%, 7% 93%, 3% 52%)', prog: 0.3 },
              { key: 'clipPath', val: 'polygon(15% 10%, 85% 18%, 78% 48%, 70% 82%, 18% 88%, 12% 55%)', prog: 0.6 },
              { key: 'clipPath', val: 'polygon(45% 42%, 55% 43%, 54% 57%, 46% 56%)', prog: 1 },
            ],
          },
        },
        // Flicker opacity effect: rapid variations at 24fps
        {
          id: 'flicker-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [outgoingVideoId],
            ranges: generateFlickerKeyframes(),
          },
        },
      ],
    } as RenderableComponentData,
  ];
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'organic-film-burn-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
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
  id: 'organic-film-burn-transition',
  title: 'Organic Film Burn Transition',
  description: 'A 1.2 second organic film burn transition effect with irregular, animated borders that simulate celluloid melting. Features morphing clip-path polygons, overexposed incoming video with saturation effects, and 24fps flicker simulation for authentic projector aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'film', 'burn', 'vintage', 'organic', 'analog', 'projector', 'flicker', 'celluloid'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
    },
    transitionDuration: 1.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const organicFilmBurnTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
