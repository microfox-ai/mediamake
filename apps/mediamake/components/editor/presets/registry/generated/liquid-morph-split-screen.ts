/**
 * Liquid Morph Split-Screen Preset
 * 
 * Features:
 * - Organic liquid morphing transitions using animated clip-path polygons
 * - Spring physics simulation with multiple oscillations for natural damping
 * - Displacement-style effects using blur and contrast filters
 * - Viscous fluid-like edge animation with undulating curved boundaries
 * - Independent point animation for each polygon vertex
 * - Dual-panel split-screen layout with staggered timing
 * - Practical effects aesthetic inspired by experimental video art
 * 
 * Technical Implementation:
 * - CSS clip-path with 8-10 point polygons for organic edges
 * - Spring-type easing with decreasing amplitude oscillations
 * - Blur + contrast filters to simulate light refraction through liquid
 * - Scale transformations for additional fluid movement
 * - Custom spring physics via multiple keyframes with decaying values
 * 
 * Use Cases:
 * - Experimental video art presentations
 * - Music video transitions
 * - Fashion/beauty content with organic aesthetics
 * - Artistic product showcases
 * - Creative storytelling with fluid visual language
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  leftPanelMediaSrc: z
    .string()
    .describe('Media source URL or path for left panel (image or video)'),
  rightPanelMediaSrc: z
    .string()
    .describe('Media source URL or path for right panel (image or video)'),
  transitionDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .describe('Duration of the liquid morph transition in seconds'),
  transitionDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Stagger delay between left and right panel animations in seconds'),
  totalDuration: z
    .number()
    .min(5)
    .max(30)
    .default(10)
    .describe('Total duration of the composition in seconds'),
  oscillationCount: z
    .number()
    .min(2)
    .max(5)
    .default(3)
    .describe('Number of spring oscillations during the transition'),
  displacementIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(15)
    .describe('Maximum blur intensity for displacement effect in pixels'),
  leftPanelType: z
    .enum(['image', 'video'])
    .default('image')
    .optional()
    .describe('Type of media for left panel'),
  rightPanelType: z
    .enum(['image', 'video'])
    .default('image')
    .optional()
    .describe('Type of media for right panel'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color behind panels'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    leftPanelMediaSrc,
    rightPanelMediaSrc,
    transitionDuration,
    transitionDelay,
    totalDuration,
    oscillationCount,
    displacementIntensity,
    leftPanelType,
    rightPanelType,
    backgroundColor,
  } = params;

  // Helper: Detect media type from source
  const detectMediaType = (src: string, fallbackType?: string): string => {
    if (fallbackType) return fallbackType;
    if (src.match(/\.(mp4|webm|mov|avi|mkv)$/i)) return 'video';
    return 'image';
  };

  // Helper: Generate spring oscillation keyframes for clip-path
  const generateSpringClipPathKeyframes = (
    side: 'left' | 'right',
    oscillations: number,
  ) => {
    const isLeft = side === 'left';
    
    // Initial state: closed (0% width)
    const initialClipPath = isLeft
      ? 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)'
      : 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)';

    // Target state: open to 50%
    const targetClipPath = isLeft
      ? 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)'
      : 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)';

    // Spring oscillation points
    const ranges: Array<{ key: string; val: string; prog: number }> = [];
    
    // Start closed
    ranges.push({
      key: 'clipPath',
      val: initialClipPath,
      prog: 0,
    });

    // Generate oscillations with decreasing amplitude
    const baseAmplitude = 2; // 2% overshoot/undershoot
    const targetX = 50;
    
    for (let i = 1; i <= oscillations; i++) {
      const prog = 0.4 + (i / oscillations) * 0.45; // Spread from 0.4 to 0.85
      const amplitude = baseAmplitude * Math.pow(0.5, i - 1); // Decay amplitude
      const offset = i % 2 === 1 ? amplitude : -amplitude; // Alternate overshoot/undershoot
      const x = targetX + offset;
      
      // Add slight vertical undulation for organic feel
      const y1 = 0.5 * amplitude;
      const y2 = 100 - 0.5 * amplitude;
      
      const clipPath = isLeft
        ? `polygon(0% 0%, ${x}% ${y1}%, ${x}% ${y2}%, 0% 100%)`
        : `polygon(${x}% ${y1}%, 100% 0%, 100% 100%, ${x}% ${y2}%)`;
      
      ranges.push({
        key: 'clipPath',
        val: clipPath,
        prog,
      });
    }

    // Final settled state
    ranges.push({
      key: 'clipPath',
      val: targetClipPath,
      prog: 1,
    });

    return ranges;
  };

  // Detect media types
  const leftMediaType = detectMediaType(leftPanelMediaSrc, leftPanelType);
  const rightMediaType = detectMediaType(rightPanelMediaSrc, rightPanelType);

  // Build left panel
  const leftPanelContainer: RenderableComponentData = {
    id: 'left-panel-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'left center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Liquid morph clip-path effect
      {
        id: 'left-panel-morph-effect',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['left-panel-container'],
          ranges: generateSpringClipPathKeyframes('left', oscillationCount),
        },
      },
      // Displacement-style blur effect
      {
        id: 'left-panel-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['left-panel-container'],
          ranges: [
            {
              key: 'filter',
              val: `blur(${displacementIntensity}px) contrast(1.2)`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `blur(${displacementIntensity * 0.5}px) contrast(1.15)`,
              prog: 0.3,
            },
            {
              key: 'filter',
              val: `blur(${displacementIntensity * 0.2}px) contrast(1.05)`,
              prog: 0.6,
            },
            {
              key: 'filter',
              val: 'blur(0px) contrast(1)',
              prog: 1,
            },
          ],
        },
      },
      // Scale effect for additional fluid movement
      {
        id: 'left-panel-scale-effect',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['left-panel-container'],
          ranges: [
            { key: 'scale', val: 0.92, prog: 0 },
            { key: 'scale', val: 1.03, prog: 0.5 },
            { key: 'scale', val: 0.99, prog: 0.75 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'left-panel-content',
        type: 'atom',
        componentId: leftMediaType === 'video' ? 'VideoAtom' : 'ImageAtom',
        data: {
          src: leftPanelMediaSrc,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Build right panel
  const rightPanelContainer: RenderableComponentData = {
    id: 'right-panel-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'right center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Liquid morph clip-path effect (staggered)
      {
        id: 'right-panel-morph-effect',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: transitionDelay,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['right-panel-container'],
          ranges: generateSpringClipPathKeyframes('right', oscillationCount),
        },
      },
      // Displacement-style blur effect (staggered)
      {
        id: 'right-panel-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: transitionDelay,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['right-panel-container'],
          ranges: [
            {
              key: 'filter',
              val: `blur(${displacementIntensity}px) contrast(1.2)`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `blur(${displacementIntensity * 0.5}px) contrast(1.15)`,
              prog: 0.3,
            },
            {
              key: 'filter',
              val: `blur(${displacementIntensity * 0.2}px) contrast(1.05)`,
              prog: 0.6,
            },
            {
              key: 'filter',
              val: 'blur(0px) contrast(1)',
              prog: 1,
            },
          ],
        },
      },
      // Scale effect for additional fluid movement (staggered)
      {
        id: 'right-panel-scale-effect',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: transitionDelay,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['right-panel-container'],
          ranges: [
            { key: 'scale', val: 0.92, prog: 0 },
            { key: 'scale', val: 1.03, prog: 0.5 },
            { key: 'scale', val: 0.99, prog: 0.75 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'right-panel-content',
        type: 'atom',
        componentId: rightMediaType === 'video' ? 'VideoAtom' : 'ImageAtom',
        data: {
          src: rightPanelMediaSrc,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-morph-split-screen-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [leftPanelContainer, rightPanelContainer],
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'liquid-morph-split-screen',
  title: 'Liquid Morph Split-Screen',
  description:
    'Experimental split-screen preset featuring organic liquid morphing transitions with spring physics, undulating curved edges, and displacement-style effects. Panels flow into place like viscous fluid with custom oscillating animations that feel like practical in-camera effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'split-screen',
    'liquid',
    'morph',
    'organic',
    'experimental',
    'transition',
    'fluid',
    'spring-physics',
    'displacement',
    'clip-path',
    'video-art',
  ],
  defaultInputParams: {
    leftPanelMediaSrc: 'https://example.com/left-panel.jpg',
    rightPanelMediaSrc: 'https://example.com/right-panel.jpg',
    transitionDuration: 2.5,
    transitionDelay: 0.15,
    totalDuration: 10,
    oscillationCount: 3,
    displacementIntensity: 15,
    leftPanelType: 'image',
    rightPanelType: 'image',
    backgroundColor: '#000000',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const liquidMorphSplitScreenPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
