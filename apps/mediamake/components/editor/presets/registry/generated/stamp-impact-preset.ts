/**
 * Stamp/Impact Preset
 * 
 * This preset simulates a rubber stamp hitting paper on the downbeat with physical deformation effects,
 * ink splatter, and paper depression shadow. Perfect for creating impactful title reveals or emphasis effects.
 * 
 * Features:
 * - Physical deformation: Text starts compressed vertically (scaleY: 0.8) and stretched horizontally (scaleX: 1.1)
 * - Spring-based bounce-back animation to normal proportions
 * - Ink splatter effect: 8-12 small dots that appear and fade quickly around text edges
 * - Paper depression shadow: Simulates stamp pressing into surface
 * - Subtle texture overlay for realistic macro stamp appearance
 * - Optional rotation jitter for organic stamp imperfection
 * 
 * Use cases:
 * - Title reveals with physical impact
 * - Emphasis markers for key points
 * - Retro/vintage video aesthetics
 * - Documentary-style annotations
 * - Brand stamp effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to display with stamp effect'),
  duration: z.number().default(2).describe('Duration of the entire stamp effect in seconds'),
  
  // Stamp appearance
  fontSize: z.number().default(80).describe('Font size in pixels'),
  fontWeight: z.string().default('black').describe('Font weight (e.g., "black", "bold", "900")'),
  textColor: z.string().default('#000000').describe('Text color (CSS color value)'),
  letterSpacing: z.string().default('0.15em').describe('Letter spacing for stamp-like appearance'),
  
  // Deformation effect
  initialScaleX: z.number().default(1.1).describe('Initial horizontal scale (compression effect)'),
  initialScaleY: z.number().default(0.8).describe('Initial vertical scale (stretch effect)'),
  deformationDuration: z.number().default(0.15).describe('Duration of scale animation in seconds'),
  
  // Rotation jitter
  enableRotationJitter: z.boolean().default(true).describe('Enable subtle rotation for organic imperfection'),
  initialRotation: z.number().default(-0.5).describe('Initial rotation in degrees'),
  
  // Ink splatter
  splattersCount: z.number().min(8).max(12).default(10).describe('Number of ink splatter dots'),
  splattersRadius: z.number().default(20).describe('Radius within which splatters appear (in pixels)'),
  splattersMaxOpacity: z.number().default(0.6).describe('Maximum opacity of splatter dots'),
  
  // Paper depression shadow
  shadowBlur: z.number().default(8).describe('Shadow blur amount in pixels'),
  shadowMaxOpacity: z.number().default(0.3).describe('Maximum shadow opacity'),
  shadowDuration: z.number().default(0.2).describe('Duration of shadow animation in seconds'),
  
  // Texture overlay
  textureEnabled: z.boolean().default(true).describe('Enable subtle textured overlay'),
  textureGrayscale: z.number().default(0.1).describe('Grayscale amount for texture (0-1)'),
  textureContrast: z.number().default(1.1).describe('Contrast amount for texture'),
  
  // Positioning
  position: z.object({
    horizontal: z.enum(['left', 'center', 'right']).default('center').describe('Horizontal alignment'),
    vertical: z.enum(['top', 'center', 'bottom']).default('center').describe('Vertical alignment'),
  }).default({ horizontal: 'center', vertical: 'center' }).describe('Positioning configuration'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate random position for splatter dots
  const generateSplatterPosition = (radius: number) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };

  // Helper function to generate random size for splatter dots
  const generateSplatterSize = () => {
    const sizes = ['w-0.5 h-0.5', 'w-1 h-1', 'w-1.5 h-1.5', 'w-2 h-2'];
    return sizes[Math.floor(Math.random() * sizes.length)];
  };

  // Generate positioning classes
  const getPositionClasses = () => {
    const { horizontal, vertical } = params.position;
    const horizontalClass = 
      horizontal === 'left' ? 'justify-start' :
      horizontal === 'right' ? 'justify-end' : 'justify-center';
    const verticalClass = 
      vertical === 'top' ? 'items-start' :
      vertical === 'bottom' ? 'items-end' : 'items-center';
    return `${horizontalClass} ${verticalClass}`;
  };

  // IDs
  const rootContainerId = 'stamp-root-container';
  const shadowElementId = 'shadow-element';
  const paperDepressionId = 'paper-depression-shadow';
  const stampEffectWrapperId = 'stamp-effect-wrapper';
  const textStampId = 'text-stamp';
  const inkSplatterContainerId = 'ink-splatter-container';

  // Create paper depression shadow element
  const shadowElement: RenderableComponentData = {
    id: shadowElementId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="
        width: 100%;
        height: 100%;
        background: radial-gradient(ellipse at center, rgba(0,0,0,${params.shadowMaxOpacity}) 0%, transparent 70%);
        filter: blur(${params.shadowBlur}px);
      "></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: `shadow-scale-effect-${shadowElementId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: params.shadowDuration,
          mode: 'provider',
          targetIds: [shadowElementId],
          ranges: [
            { key: 'scaleY', val: 0, prog: 0 },
            { key: 'scaleY', val: 1, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: params.shadowMaxOpacity, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Create paper depression shadow container
  const paperDepressionShadow: RenderableComponentData = {
    id: paperDepressionId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 -z-10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [shadowElement],
  };

  // Create text stamp with effects
  const textStamp: RenderableComponentData = {
    id: textStampId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: `font-black uppercase tracking-widest ${params.textureEnabled ? 'texture-overlay' : ''}`,
      style: {
        fontSize: params.fontSize,
        color: params.textColor,
        fontWeight: params.fontWeight,
        letterSpacing: params.letterSpacing,
        ...(params.textureEnabled && {
          filter: `grayscale(${params.textureGrayscale}) contrast(${params.textureContrast})`,
        }),
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: `stamp-deformation-effect-${textStampId}`,
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: params.deformationDuration,
          mode: 'provider',
          targetIds: [textStampId],
          ranges: [
            // Scale animation
            { key: 'scaleX', val: params.initialScaleX, prog: 0 },
            { key: 'scaleX', val: 1, prog: 1 },
            { key: 'scaleY', val: params.initialScaleY, prog: 0 },
            { key: 'scaleY', val: 1, prog: 1 },
            // Rotation jitter (if enabled)
            ...(params.enableRotationJitter
              ? [
                  { key: 'rotate', val: params.initialRotation, prog: 0 },
                  { key: 'rotate', val: 0, prog: 1 },
                ]
              : []),
            // Opacity (immediate full opacity)
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Create ink splatter dots
  const splatters = Array.from({ length: params.splattersCount }, (_, index) => {
    const position = generateSplatterPosition(params.splattersRadius);
    const size = generateSplatterSize();
    const delay = Math.random() * 0.1;
    const splatterId = `ink-splatter-${index}`;

    return {
      id: splatterId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class="rounded-full bg-current ${size}"></div>`,
        className: 'absolute',
        style: {
          left: `calc(50% + ${position.x}px)`,
          top: `calc(50% + ${position.y}px)`,
          transform: 'translate(-50%, -50%)',
          color: params.textColor,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        {
          id: `splatter-fade-effect-${splatterId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: delay,
            duration: 0.3,
            mode: 'provider',
            targetIds: [splatterId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: params.splattersMaxOpacity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    } as RenderableComponentData;
  });

  // Create ink splatter container
  const inkSplatterContainer: RenderableComponentData = {
    id: inkSplatterContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: splatters,
  };

  // Create stamp effect wrapper (contains text and splatters)
  const stampEffectWrapper: RenderableComponentData = {
    id: stampEffectWrapperId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative flex ${getPositionClasses()}`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textStamp, inkSplatterContainer],
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${getPositionClasses()}`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [paperDepressionShadow, stampEffectWrapper],
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
  id: 'stamp-impact-preset',
  title: 'Stamp/Impact Preset',
  description: 'Simulates a rubber stamp hitting paper on the downbeat with physical deformation (scale compression and stretch), ink splatter effect using animated dots, and paper depression shadow. Features spring-based bounce-back animation, staggered splatter animations, and subtle texture overlay for practical macro stamp effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['stamp', 'impact', 'title', 'text', 'animation', 'deformation', 'splatter', 'shadow', 'spring', 'physical', 'macro', 'vintage', 'retro'],
  dependencies: {},
  defaultInputParams: {
    text: 'APPROVED',
    duration: 2,
    fontSize: 80,
    fontWeight: 'black',
    textColor: '#000000',
    letterSpacing: '0.15em',
    initialScaleX: 1.1,
    initialScaleY: 0.8,
    deformationDuration: 0.15,
    enableRotationJitter: true,
    initialRotation: -0.5,
    splattersCount: 10,
    splattersRadius: 20,
    splattersMaxOpacity: 0.6,
    shadowBlur: 8,
    shadowMaxOpacity: 0.3,
    shadowDuration: 0.2,
    textureEnabled: true,
    textureGrayscale: 0.1,
    textureContrast: 1.1,
    position: {
      horizontal: 'center',
      vertical: 'center',
    },
  },
};

// Export preset
export const stampImpactPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
