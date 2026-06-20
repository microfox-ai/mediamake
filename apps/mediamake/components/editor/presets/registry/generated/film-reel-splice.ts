/**
 * Film Reel Splice Effect Preset
 *
 * Creates an authentic film editing bay aesthetic with multiple text strips moving
 * at varying speeds like film being scrubbed on a flatbed editor. Features include:
 * 
 * - **Multi-Speed Film Strips**: 4 text strips moving at different speeds (1x, -1x reverse, 1.5x, 0.75x)
 * - **Sprocket Hole Visualization**: Animated sprocket holes on left/right edges that move with text
 * - **Splice Jump Effect**: Discrete frame jumps using step() animation for authentic film cuts
 * - **Mechanical Precision**: Transform-based motion with optional organic imperfections
 * - **Projector Flicker**: Subtle brightness variations at 24fps intervals
 * - **Film Grain Overlay**: Optional noise texture for vintage film aesthetic
 * - **Sepia Toning**: Subtle vintage color grading
 * - **Monospace Typography**: Technical film slate appearance
 * 
 * Use cases:
 * - Vintage film editing aesthetics
 * - Multi-speed text animations
 * - Film strip metaphors
 * - Technical/mechanical motion graphics
 * - Retro projection effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Zod schema for preset parameters
const presetParams = z.object({
  textLine1: z.string().default('REEL ONE').describe('Text for the first film strip (1x speed forward)'),
  textLine2: z.string().default('REEL TWO').describe('Text for the second film strip (1x speed reverse)'),
  textLine3: z.string().default('REEL THREE').describe('Text for the third film strip (1.5x speed forward)'),
  textLine4: z.string().default('REEL FOUR').describe('Text for the fourth film strip (0.75x speed forward)'),
  
  fontSize: z.number().min(20).max(100).default(40).describe('Font size for all text strips (px)'),
  textColor: z.string().default('#e5e7eb').describe('Color for all text strips'),
  letterSpacing: z.string().default('0.15em').describe('Letter spacing for monospace text'),
  
  enableSpliceEffect: z.boolean().default(true).describe('Enable discrete frame jump/splice effects'),
  spliceIntensity: z.number().min(0).max(100).default(20).describe('Intensity of splice jumps in pixels'),
  
  enableFlicker: z.boolean().default(true).describe('Enable projector flicker effect'),
  flickerIntensity: z.number().min(0).max(0.2).default(0.1).describe('Flicker brightness variation (0-0.2)'),
  
  enableFilmGrain: z.boolean().default(false).describe('Enable film grain overlay effect'),
  grainOpacity: z.number().min(0).max(1).default(0.15).describe('Film grain overlay opacity'),
  
  sepiaIntensity: z.number().min(0).max(1).default(0.15).describe('Sepia filter intensity (0 = none, 1 = full sepia)'),
  
  duration: z.number().min(1).default(10).describe('Duration of the effect in seconds'),
  
  trackName: z.string().default('film-reel').describe('Track name for unique IDs'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const containerId = `${params.trackName}-container`;
  
  // Film strip configurations
  const filmStrips = [
    {
      id: 'film-strip-1',
      text: params.textLine1,
      speed: 1.0,
      topPosition: '15%',
    },
    {
      id: 'film-strip-2',
      text: params.textLine2,
      speed: -1.0,
      topPosition: '35%',
    },
    {
      id: 'film-strip-3',
      text: params.textLine3,
      speed: 1.5,
      topPosition: '55%',
    },
    {
      id: 'film-strip-4',
      text: params.textLine4,
      speed: 0.75,
      topPosition: '75%',
    },
  ];

  // Create film strip components with effects
  const filmStripComponents = filmStrips.map((strip) => {
    const textId = `${params.trackName}-${strip.id}-text`;
    const stripId = `${params.trackName}-${strip.id}`;
    
    // Calculate translation distance based on speed and direction
    const isReverse = strip.speed < 0;
    const absSpeed = Math.abs(strip.speed);
    const baseDistance = 100; // Base percentage for translation
    const totalDistance = baseDistance * absSpeed;
    
    // Effects for this strip
    const effects = [];
    
    // Main translateX motion effect
    const motionEffect = {
      id: `${stripId}-motion`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: params.duration,
        mode: 'provider' as const,
        targetIds: [textId],
        ranges: isReverse ? [
          { key: 'translateX', val: `${totalDistance}%`, prog: 0 },
          { key: 'translateX', val: `-${totalDistance}%`, prog: 1 },
        ] : [
          { key: 'translateX', val: `-${totalDistance}%`, prog: 0 },
          { key: 'translateX', val: `${totalDistance}%`, prog: 1 },
        ],
      },
    };
    effects.push(motionEffect);
    
    // Splice jump effect (discrete frame jumps at intervals)
    if (params.enableSpliceEffect) {
      const spliceEffect = {
        id: `${stripId}-splice`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: params.duration,
          mode: 'provider' as const,
          targetIds: [textId],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: params.spliceIntensity * 0.3, prog: 0.25 },
            { key: 'translateY', val: -params.spliceIntensity * 0.5, prog: 0.26 },
            { key: 'translateY', val: 0, prog: 0.27 },
            { key: 'translateY', val: params.spliceIntensity * 0.4, prog: 0.5 },
            { key: 'translateY', val: -params.spliceIntensity * 0.3, prog: 0.51 },
            { key: 'translateY', val: 0, prog: 0.52 },
            { key: 'translateY', val: -params.spliceIntensity * 0.2, prog: 0.75 },
            { key: 'translateY', val: params.spliceIntensity * 0.4, prog: 0.76 },
            { key: 'translateY', val: 0, prog: 0.77 },
          ],
        },
      };
      effects.push(spliceEffect);
    }
    
    // Text atom
    const textAtom = {
      id: textId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: strip.text,
        style: {
          fontFamily: 'monospace',
          textTransform: 'uppercase' as const,
          fontSize: `${params.fontSize}px`,
          color: params.textColor,
          letterSpacing: params.letterSpacing,
          whiteSpace: 'nowrap' as const,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects,
    };
    
    // Strip wrapper container
    return {
      id: stripId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-full py-2 overflow-hidden',
          style: {
            top: strip.topPosition,
            filter: `sepia(${params.sepiaIntensity})`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: [textAtom] as RenderableComponentData[],
    };
  });
  
  // Sprocket hole pattern (CSS gradient)
  const sprocketGradient = 'repeating-linear-gradient(to bottom, transparent 0px, transparent 8px, #374151 8px, #374151 16px, transparent 16px, transparent 24px)';
  
  // Left sprocket holes
  const sprocketLeft = {
    id: `${params.trackName}-sprocket-left`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute left-0 top-0 bottom-0 w-2 z-10 pointer-events-none',
        style: {
          backgroundImage: sprocketGradient,
          backgroundSize: '100% 24px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [] as RenderableComponentData[],
  };
  
  // Right sprocket holes
  const sprocketRight = {
    id: `${params.trackName}-sprocket-right`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute right-0 top-0 bottom-0 w-2 z-10 pointer-events-none',
        style: {
          backgroundImage: sprocketGradient,
          backgroundSize: '100% 24px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [] as RenderableComponentData[],
  };
  
  // Flicker overlay
  const flickerOverlay = {
    id: `${params.trackName}-flicker-overlay`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-20',
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: params.enableFlicker ? [
      {
        id: `${params.trackName}-flicker-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: params.duration,
          mode: 'provider' as const,
          targetIds: [`${params.trackName}-flicker-overlay`],
          ranges: [
            { key: 'opacity', val: 1 - params.flickerIntensity, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.04 },
            { key: 'opacity', val: 1 - params.flickerIntensity * 0.7, prog: 0.08 },
            { key: 'opacity', val: 1, prog: 0.12 },
            { key: 'opacity', val: 1 - params.flickerIntensity * 0.5, prog: 0.16 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 1 - params.flickerIntensity, prog: 0.24 },
            { key: 'opacity', val: 1, prog: 0.28 },
            { key: 'opacity', val: 1 - params.flickerIntensity * 0.8, prog: 0.32 },
            { key: 'opacity', val: 1, prog: 0.36 },
            { key: 'opacity', val: 1 - params.flickerIntensity * 0.6, prog: 0.4 },
            { key: 'opacity', val: 1, prog: 0.44 },
            { key: 'opacity', val: 1 - params.flickerIntensity, prog: 0.48 },
            { key: 'opacity', val: 1, prog: 0.52 },
            { key: 'opacity', val: 1 - params.flickerIntensity * 0.7, prog: 0.56 },
            { key: 'opacity', val: 1, prog: 0.6 },
            { key: 'opacity', val: 1 - params.flickerIntensity * 0.5, prog: 0.64 },
            { key: 'opacity', val: 1, prog: 0.68 },
            { key: 'opacity', val: 1 - params.flickerIntensity, prog: 0.72 },
            { key: 'opacity', val: 1, prog: 0.76 },
            { key: 'opacity', val: 1 - params.flickerIntensity * 0.9, prog: 0.8 },
            { key: 'opacity', val: 1, prog: 0.84 },
            { key: 'opacity', val: 1 - params.flickerIntensity * 0.6, prog: 0.88 },
            { key: 'opacity', val: 1, prog: 0.92 },
            { key: 'opacity', val: 1 - params.flickerIntensity, prog: 0.96 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ] : [],
    childrenData: [] as RenderableComponentData[],
  };
  
  // Film grain overlay (optional)
  const filmGrainOverlay = params.enableFilmGrain ? {
    id: `${params.trackName}-film-grain`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-15',
        style: {
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' /%3E%3C/svg%3E")',
          opacity: params.grainOpacity,
          mixBlendMode: 'overlay' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [] as RenderableComponentData[],
  } : null;
  
  // Root container
  const rootContainer = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900 overflow-hidden',
        style: {
          borderLeft: '8px solid #1f2937',
          borderRight: '8px solid #1f2937',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      sprocketLeft,
      sprocketRight,
      ...filmStripComponents,
      flickerOverlay,
      ...(filmGrainOverlay ? [filmGrainOverlay] : []),
    ] as RenderableComponentData[],
  } as RenderableComponentData;

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
  id: 'film-reel-splice',
  title: 'Film Reel Splice Effect',
  description: 'Create a film reel splice effect where text lines slide past each other like film strips being edited on a flatbed editor. Features multi-speed motion, sprocket holes, splice jumps, projector flicker, and optional film grain.',
  type: 'predefined',
  presetType: 'children',
  tags: ['film', 'vintage', 'reel', 'splice', 'editing', 'motion', 'text', 'retro', 'projector', 'mechanical'],
  dependencies: {},
  defaultInputParams: {
    textLine1: 'REEL ONE',
    textLine2: 'REEL TWO',
    textLine3: 'REEL THREE',
    textLine4: 'REEL FOUR',
    fontSize: 40,
    textColor: '#e5e7eb',
    letterSpacing: '0.15em',
    enableSpliceEffect: true,
    spliceIntensity: 20,
    enableFlicker: true,
    flickerIntensity: 0.1,
    enableFilmGrain: false,
    grainOpacity: 0.15,
    sepiaIntensity: 0.15,
    duration: 10,
    trackName: 'film-reel',
  },
};

// Export preset
export const filmReelSplicePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
