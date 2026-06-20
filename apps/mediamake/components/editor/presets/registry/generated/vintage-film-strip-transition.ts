/**
 * Vintage Film Strip Slide Transition Preset
 *
 * This preset creates an authentic vintage film projector transition effect where frames
 * slide horizontally like film advancing through a projector gate. Features include:
 * - Visible sprocket holes on both sides
 * - Frame line separator between shots
 * - Gate weave effect (vertical instability)
 * - Motion blur during rapid film advance
 * - Brief double-exposure at midpoint
 * - Ease-in-out physics for realistic mechanical movement
 *
 * Technical Implementation:
 * - 0.8s transition with synchronized horizontal slide
 * - Both videos translate horizontally (outgoing -100%, incoming 100% to 0)
 * - Vertical sine wave oscillation for gate weave
 * - Motion blur applied during peak velocity
 * - Brief opacity reduction at midpoint for double-exposure effect
 *
 * Use cases:
 * - Creating retro film-style transitions
 * - Adding vintage cinematic effects
 * - Simulating old projector mechanics
 * - Building nostalgic video presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  transitionDuration: z.number().default(0.8).describe('Duration of the film slide transition in seconds'),
  
  sprocketPattern: z.object({
    src: z.string().optional().describe('Optional custom sprocket pattern image URL'),
    opacity: z.number().min(0).max(1).default(0.6).describe('Opacity of sprocket overlay'),
  }).optional().describe('Sprocket holes pattern configuration'),
  
  frameLineWidth: z.number().min(2).max(4).default(3).describe('Width of the frame line separator in pixels'),
  
  gateWeaveIntensity: z.number().min(0).max(3).default(1.5).describe('Intensity of gate weave vertical oscillation in pixels'),
  
  motionBlurIntensity: z.number().min(0).max(3).default(1.5).describe('Motion blur intensity during slide in pixels'),
  
  doubleExposureOpacity: z.number().min(0.5).max(1).default(0.7).describe('Opacity level during brief double-exposure moment'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    sprocketPattern,
    frameLineWidth,
    gateWeaveIntensity,
    motionBlurIntensity,
    doubleExposureOpacity,
  } = params;

  // Calculate total duration (overlap transition)
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Determine component IDs based on media type
  const outgoingComponentId = outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId = incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Generate default sprocket pattern if not provided
  const generateSprocketHTML = () => {
    return `
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="position: absolute; top: 0; left: 0;">
        <defs>
          <pattern id="sprocket-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect x="0" y="5" width="8" height="10" fill="#000000" rx="2"/>
            <rect x="0" y="25" width="8" height="10" fill="#000000" rx="2"/>
          </pattern>
        </defs>
        <!-- Left sprockets -->
        <rect x="0" y="0" width="40" height="100%" fill="url(#sprocket-pattern)"/>
        <!-- Right sprockets -->
        <rect x="calc(100% - 40px)" y="0" width="40" height="100%" fill="url(#sprocket-pattern)"/>
      </svg>
    `;
  };

  // Build children data
  const childrenData: RenderableComponentData[] = [
    // Outgoing video
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: outgoingComponentId,
      data: {
        src: outgoingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        // Horizontal slide out
        {
          id: 'outgoing-slide-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingVideo.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: '-100%', prog: 1 },
            ],
          },
        },
        // Gate weave (vertical oscillation)
        {
          id: 'outgoing-gate-weave',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingVideo.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: gateWeaveIntensity, prog: 0.25 },
              { key: 'translateY', val: 0, prog: 0.5 },
              { key: 'translateY', val: -gateWeaveIntensity, prog: 0.75 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
        // Motion blur during peak velocity
        {
          id: 'outgoing-motion-blur',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingVideo.duration - transitionDuration + 0.25,
            duration: 0.3,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: `blur(${motionBlurIntensity}px)`, prog: 0.5 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
        // Brief double-exposure opacity
        {
          id: 'outgoing-double-exposure',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingVideo.duration - transitionDuration + 0.35,
            duration: 0.1,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: doubleExposureOpacity, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: incomingComponentId,
      data: {
        src: incomingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        // Horizontal slide in
        {
          id: 'incoming-slide-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'translateX', val: '100%', prog: 0 },
              { key: 'translateX', val: '0%', prog: 1 },
            ],
          },
        },
        // Gate weave (inverse phase)
        {
          id: 'incoming-gate-weave',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -gateWeaveIntensity, prog: 0.25 },
              { key: 'translateY', val: 0, prog: 0.5 },
              { key: 'translateY', val: gateWeaveIntensity, prog: 0.75 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
        // Motion blur during peak velocity
        {
          id: 'incoming-motion-blur',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0.25,
            duration: 0.3,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: `blur(${motionBlurIntensity}px)`, prog: 0.5 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
        // Brief double-exposure opacity
        {
          id: 'incoming-double-exposure',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0.35,
            duration: 0.1,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: doubleExposureOpacity, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Frame line separator (slides with outgoing video)
    {
      id: 'frame-line-separator',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${frameLineWidth}px; height: 100%; background-color: #000000;"></div>`,
        className: 'absolute inset-y-0',
        style: {
          left: '100%',
          transform: 'translateX(-50%)',
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'frame-line-slide',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['frame-line-separator'],
            ranges: [
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: '-100%', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Sprocket holes overlay
    {
      id: 'sprocket-holes-overlay',
      type: 'atom',
      componentId: sprocketPattern?.src ? 'ImageAtom' : 'HTMLBlockAtom',
      data: sprocketPattern?.src ? {
        src: sprocketPattern.src,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'multiply',
          opacity: sprocketPattern.opacity ?? 0.6,
          zIndex: 20,
        },
      } : {
        html: generateSprocketHTML(),
        className: 'absolute inset-0 pointer-events-none',
        style: {
          opacity: sprocketPattern?.opacity ?? 0.6,
          zIndex: 20,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        // Slide sprocket overlay (slower than videos for parallax effect)
        {
          id: 'sprocket-slide',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingVideo.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['sprocket-holes-overlay'],
            ranges: [
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: '-50%', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'vintage-film-strip-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          backgroundColor: '#000000',
        },
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'vintage-film-strip-transition',
  title: 'Vintage Film Strip Slide Transition',
  description: 'Authentic vintage film strip transition with horizontal slide animation, visible sprocket holes, frame lines, gate weave effect, and motion blur. The transition shows the mechanical movement of film through a projector gate with ease-in-out physics, brief double-exposure at midpoint, and characteristic vertical instability.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vintage', 'film', 'projector', 'retro', 'slide', 'sprocket', 'gate-weave'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 0.8,
    sprocketPattern: {
      opacity: 0.6,
    },
    frameLineWidth: 3,
    gateWeaveIntensity: 1.5,
    motionBlurIntensity: 1.5,
    doubleExposureOpacity: 0.7,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const vintageFilmStripTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
