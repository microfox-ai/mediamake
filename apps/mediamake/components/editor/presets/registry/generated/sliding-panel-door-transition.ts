/**
 * Sliding Panel Door Transition Preset
 *
 * A cinematic transition where the screen splits into 5 vertical panels that slide apart
 * like elevator doors, revealing the new scene behind. Features:
 * - Lock release compression animation at the start (panels slightly compress before sliding)
 * - Odd panels slide up, even panels slide down at different speeds with staggered timing
 * - Metallic edge shine effects on panel boundaries
 * - Mechanical sound effects for lock release and panel movement
 * - Smooth overlap transition between outgoing and incoming videos
 *
 * Use cases:
 * - Creating dramatic scene transitions
 * - Building elevator/door-style reveals
 * - Adding mechanical/industrial visual effects
 * - Creating split-screen transition effects
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
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video that will split into panels and slide away'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video that will be revealed behind the panels'),
  
  transitionDuration: z.number().default(1.3).describe('Total duration of the transition effect in seconds (lock release + slide animations)'),
  
  lockReleaseDuration: z.number().default(0.2).describe('Duration of the initial lock release compression effect in seconds'),
  
  mechanicalSound1: z.object({
    src: z.string().describe('Sound effect for lock release (plays at start)'),
  }).optional().describe('Optional mechanical sound effect for lock release click'),
  
  mechanicalSound2: z.object({
    src: z.string().describe('Sound effect for panel sliding (plays after lock release)'),
  }).optional().describe('Optional mechanical sound effect for panel sliding whoosh'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionDuration,
    lockReleaseDuration,
    mechanicalSound1,
    mechanicalSound2,
  } = params;

  // Calculate timing
  const baseLayoutDuration = video1.duration + video2.duration - transitionDuration;
  const slideDuration = transitionDuration - lockReleaseDuration;
  const panelSlideStart = video1.duration - transitionDuration + lockReleaseDuration;

  // Helper function to create panel effects
  const createPanelEffects = (panelId: string, index: number): any[] => {
    const isOdd = index % 2 === 1;
    const staggerDelay = index * 0.05; // 50ms stagger per panel
    
    const effects: any[] = [];

    // Lock release compression effect (0 to lockReleaseDuration)
    effects.push({
      id: `${panelId}-lock-release`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: video1.duration - transitionDuration,
        duration: lockReleaseDuration,
        mode: 'provider',
        targetIds: [panelId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 0.95, prog: 1 },
        ],
      },
    });

    // Slide animation (starts after lock release)
    const slideStart = panelSlideStart + staggerDelay;
    const actualSlideDuration = Math.max(0.1, slideDuration - staggerDelay);
    
    effects.push({
      id: `${panelId}-slide`,
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: slideStart,
        duration: actualSlideDuration,
        mode: 'provider',
        targetIds: [panelId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: isOdd ? -100 : 100, prog: 1 },
          { key: 'scale', val: 0.95, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    });

    return effects;
  };

  // Helper function to create edge shine effects
  const createEdgeShineEffect = (edgeId: string, leftPercent: number): any => {
    return {
      id: `${edgeId}-shine`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: panelSlideStart,
        duration: slideDuration,
        mode: 'provider',
        targetIds: [edgeId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.8, prog: 0.3 },
          { key: 'opacity', val: 0.8, prog: 0.7 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    };
  };

  // Create panel data structures
  const panelClipPaths = [
    'polygon(0% 0, 20% 0, 20% 100%, 0% 100%)',
    'polygon(20% 0, 40% 0, 40% 100%, 20% 100%)',
    'polygon(40% 0, 60% 0, 60% 100%, 40% 100%)',
    'polygon(60% 0, 80% 0, 80% 100%, 60% 100%)',
    'polygon(80% 0, 100% 0, 100% 100%, 80% 100%)',
  ];

  const edgePositions = [20, 40, 60, 80]; // Left percentages for edges

  // Build panel nodes
  const panelNodes: RenderableComponentData[] = panelClipPaths.map((clipPath, index) => {
    const panelId = `panel-${index + 1}`;
    return {
      id: panelId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0',
        fit: 'cover',
        style: {
          zIndex: 10,
          clipPath,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: createPanelEffects(panelId, index),
    } as RenderableComponentData;
  });

  // Build edge shine nodes
  const edgeShineNodes: RenderableComponentData[] = edgePositions.map((leftPercent, index) => {
    const edgeId = `edge-shine-${index + 1}`;
    return {
      id: edgeId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute',
        style: {
          left: `${leftPercent}%`,
          top: 0,
          width: '4px',
          height: '100%',
          zIndex: 15,
          background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [createEdgeShineEffect(edgeId, leftPercent)],
    } as RenderableComponentData;
  });

  // Build child nodes array
  const childrenData: RenderableComponentData[] = [
    // Incoming video (behind panels)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute inset-0',
        fit: 'cover',
        style: {
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration,
          duration: video2.duration + transitionDuration,
        },
      },
    } as RenderableComponentData,
    
    // Outgoing video panels
    ...panelNodes,
    
    // Edge shine effects
    ...edgeShineNodes,
    
    // Mechanical sound effects (if provided)
    ...(mechanicalSound1 ? [{
      id: 'mechanical-sound-1',
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: mechanicalSound1.src,
        volume: 0.7,
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration,
          duration: 0.5,
        },
      },
    } as RenderableComponentData] : []),
    
    ...(mechanicalSound2 ? [{
      id: 'mechanical-sound-2',
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: mechanicalSound2.src,
        volume: 0.8,
      },
      context: {
        timing: {
          start: panelSlideStart,
          duration: slideDuration,
        },
      },
    } as RenderableComponentData] : []),
  ];

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: 'sliding-panel-door-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-gray-800',
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'sliding-panel-door-transition',
  title: 'Sliding Panel Door Transition',
  description: 'A cinematic transition where the screen splits into 5 vertical panels that slide apart like elevator doors, revealing the new scene. Features lock release compression animation, alternating up/down panel movements with staggered timing, metallic edge shine effects, and mechanical sound design.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'panel', 'door', 'elevator', 'mechanical', 'cinematic', 'split-screen'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.3,
    lockReleaseDuration: 0.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const slidingPanelDoorTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
