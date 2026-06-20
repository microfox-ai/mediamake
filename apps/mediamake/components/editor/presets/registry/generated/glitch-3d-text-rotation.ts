/**
 * Glitch 3D Text Rotation Preset
 *
 * A glitch-inspired 3D text rotation preset where typography appears to break through digital interference.
 * The text rotates in 3D space with intentional "errors" - sudden jumps in rotation angle, brief moments
 * where the text splits into RGB channels, and occasional position shifts. Starts with rapid micro-rotations
 * on all axes (like tuning into a signal), then stabilizes into a smooth Y-axis rotation from -45deg to 0deg.
 * During rotation, adds datamosh-style artifacts where parts of the text appear to lag behind.
 *
 * Features:
 * - RGB channel split effect with red, green, and blue text layers
 * - Micro-rotations with stepped easing for glitch effect (first 20%)
 * - Main Y-axis rotation with stuttered steps (steps(8) easing)
 * - RGB channel convergence animation
 * - Glitch moments at 30%, 50%, 70% with position shifts
 * - Scan lines overlay with pulsing opacity
 * - Static noise overlay using SVG feTurbulence
 * - Mix blend mode for enhanced glitch effect
 *
 * Technical Implementation:
 * - BaseLayout container with perspective for 3D transforms
 * - Four TextAtom layers: main white text + RGB channels (absolute positioned)
 * - Generic effects for rotation, translation, and opacity animations
 * - HTMLBlockAtom for scan lines and static noise overlays
 * - Stepped easing functions for stuttered, glitchy motion
 * - Performance optimized with limited glitch instances (3 total)
 *
 * Use Cases:
 * - Tech/cyberpunk video intros
 * - Digital corruption visual effects
 * - Futuristic title sequences
 * - Glitch art animations
 * - Data reconstruction visualizations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Preset parameters schema
const presetParams = z.object({
  text: z.string().default('GLITCH').describe('Text content to display'),
  duration: z
    .number()
    .default(3)
    .describe('Total duration of the animation in seconds'),
  fontSize: z
    .number()
    .default(72)
    .describe('Font size in pixels for all text layers'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .default('bold')
    .describe('Font weight (e.g., "bold", "700")'),
  rgbSplitDistance: z
    .number()
    .default(2)
    .describe('Distance in pixels for RGB channel separation'),
  glitchIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Multiplier for glitch effect intensity (0.5-2)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    rgbSplitDistance,
    glitchIntensity,
  } = params;

  // Helper function to create stepped easing ranges for glitchy motion
  const createSteppedRotation = (
    axis: 'X' | 'Y' | 'Z',
    startVal: number,
    endVal: number,
    startProg: number,
    endProg: number,
    steps: number,
  ): Array<{ key: string; val: number; prog: number }> => {
    const ranges = [];
    const key = `rotate${axis}`;
    const progressStep = (endProg - startProg) / steps;
    const valueStep = (endVal - startVal) / steps;

    for (let i = 0; i <= steps; i++) {
      ranges.push({
        key,
        val: startVal + valueStep * i,
        prog: startProg + progressStep * i,
      });
    }

    return ranges;
  };

  // Helper function to create glitch position shift
  const createGlitchShift = (
    targetId: string,
    glitchTime: number,
    intensity: number,
  ) => {
    const shiftX = (Math.random() - 0.5) * 20 * intensity;
    const shiftY = (Math.random() - 0.5) * 20 * intensity;
    const glitchDuration = 0.1;

    return {
      id: `glitch-shift-${targetId}-${glitchTime}`,
      componentId: 'generic' as const,
      data: {
        type: 'linear' as const,
        start: glitchTime * duration,
        duration: glitchDuration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'translateX', val: shiftX, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: shiftY, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Component IDs
  const containerId = 'glitch-3d-container';
  const textMainId = 'text-main';
  const textRId = 'text-r-channel';
  const textGId = 'text-g-channel';
  const textBId = 'text-b-channel';
  const scanlinesId = 'scanlines-overlay';
  const staticNoiseId = 'static-noise-overlay';

  // Main container effect: 3D rotation and transforms
  const containerEffect: GenericEffectData = {
    type: 'linear' as const,
    start: 0,
    duration: duration,
    mode: 'provider' as const,
    targetIds: [containerId],
    ranges: [
      // Micro-rotations phase (0-20%): Random jittery rotations on all axes
      ...createSteppedRotation('X', -5, 5, 0, 0.2, 3),
      ...createSteppedRotation('Y', -10, 10, 0, 0.2, 3),
      ...createSteppedRotation('Z', -3, 3, 0, 0.2, 3),

      // Main Y-axis rotation (20-100%): Stuttered rotation from -45deg to 0deg
      ...createSteppedRotation('Y', -45, 0, 0.2, 1, 8),

      // Keep X and Z stable after micro-rotation phase
      { key: 'rotateX', val: 0, prog: 0.2 },
      { key: 'rotateX', val: 0, prog: 1 },
      { key: 'rotateZ', val: 0, prog: 0.2 },
      { key: 'rotateZ', val: 0, prog: 1 },
    ],
  };

  // RGB channel separation effects
  const rgbREffect: GenericEffectData = {
    type: 'ease-out' as const,
    start: 0,
    duration: duration * 0.4,
    mode: 'provider' as const,
    targetIds: [textRId],
    ranges: [
      { key: 'translateX', val: -rgbSplitDistance, prog: 0 },
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'opacity', val: 0.7, prog: 0 },
      { key: 'opacity', val: 0.5, prog: 1 },
    ],
  };

  const rgbGEffect: GenericEffectData = {
    type: 'ease-out' as const,
    start: 0,
    duration: duration * 0.4,
    mode: 'provider' as const,
    targetIds: [textGId],
    ranges: [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'opacity', val: 0.7, prog: 0 },
      { key: 'opacity', val: 0.5, prog: 1 },
    ],
  };

  const rgbBEffect: GenericEffectData = {
    type: 'ease-out' as const,
    start: 0,
    duration: duration * 0.4,
    mode: 'provider' as const,
    targetIds: [textBId],
    ranges: [
      { key: 'translateX', val: rgbSplitDistance, prog: 0 },
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'opacity', val: 0.7, prog: 0 },
      { key: 'opacity', val: 0.5, prog: 1 },
    ],
  };

  // Main text fade-in effect
  const mainTextEffect: GenericEffectData = {
    type: 'ease-in' as const,
    start: 0,
    duration: duration * 0.3,
    mode: 'provider' as const,
    targetIds: [textMainId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // Scan lines pulsing effect
  const scanlinesEffect: GenericEffectData = {
    type: 'linear' as const,
    start: 0,
    duration: duration,
    mode: 'provider' as const,
    targetIds: [scanlinesId],
    ranges: [
      { key: 'opacity', val: 0.15, prog: 0 },
      { key: 'opacity', val: 0.3, prog: 0.3 },
      { key: 'opacity', val: 0.15, prog: 0.5 },
      { key: 'opacity', val: 0.3, prog: 0.7 },
      { key: 'opacity', val: 0.15, prog: 1 },
    ],
  };

  // Static noise intensity effect
  const staticNoiseEffect: GenericEffectData = {
    type: 'linear' as const,
    start: 0,
    duration: duration,
    mode: 'provider' as const,
    targetIds: [staticNoiseId],
    ranges: [
      { key: 'opacity', val: 0.03, prog: 0 },
      { key: 'opacity', val: 0.1, prog: 0.3 },
      { key: 'opacity', val: 0.03, prog: 0.5 },
      { key: 'opacity', val: 0.1, prog: 0.7 },
      { key: 'opacity', val: 0.03, prog: 1 },
    ],
  };

  // Glitch moment position shifts at 30%, 50%, 70%
  const glitch1Main = createGlitchShift(textMainId, 0.3, glitchIntensity);
  const glitch1R = createGlitchShift(textRId, 0.3, glitchIntensity * 1.5);
  const glitch2Main = createGlitchShift(textMainId, 0.5, glitchIntensity);
  const glitch2B = createGlitchShift(textBId, 0.5, glitchIntensity * 1.5);
  const glitch3Main = createGlitchShift(textMainId, 0.7, glitchIntensity);
  const glitch3G = createGlitchShift(textGId, 0.7, glitchIntensity * 1.5);

  // Text components with RGB split
  const textRChannel = {
    id: textRId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'text-red-500 absolute',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        mixBlendMode: 'screen',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight === 'bold' ? '700' : fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      { id: `${textRId}-rgb-effect`, componentId: 'generic', data: rgbREffect },
      glitch1R,
    ],
  } as RenderableComponentData;

  const textGChannel = {
    id: textGId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'text-green-500 absolute',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        mixBlendMode: 'screen',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight === 'bold' ? '700' : fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      { id: `${textGId}-rgb-effect`, componentId: 'generic', data: rgbGEffect },
      glitch3G,
    ],
  } as RenderableComponentData;

  const textBChannel = {
    id: textBId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'text-blue-500 absolute',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        mixBlendMode: 'screen',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight === 'bold' ? '700' : fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      { id: `${textBId}-rgb-effect`, componentId: 'generic', data: rgbBEffect },
      glitch2B,
    ],
  } as RenderableComponentData;

  const textMain = {
    id: textMainId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'text-white',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight === 'bold' ? '700' : fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      { id: `${textMainId}-fade-effect`, componentId: 'generic', data: mainTextEffect },
      glitch1Main,
      glitch2Main,
      glitch3Main,
    ],
  } as RenderableComponentData;

  // Glitch effect container with 3D transforms
  const glitchContainer = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      { id: `${containerId}-rotation-effect`, componentId: 'generic', data: containerEffect },
    ],
    childrenData: [textRChannel, textGChannel, textBChannel, textMain],
  } as RenderableComponentData;

  // Scan lines overlay
  const scanlinesOverlay = {
    id: scanlinesId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px); pointer-events: none;"></div>',
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      { id: `${scanlinesId}-pulse-effect`, componentId: 'generic', data: scanlinesEffect },
    ],
  } as RenderableComponentData;

  // Static noise overlay
  const staticNoiseOverlay = {
    id: staticNoiseId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<svg style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;"><filter id="noise-filter"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="1" /><feColorMatrix type="saturate" values="0" /></filter><rect width="100%" height="100%" filter="url(#noise-filter)" /></svg>',
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      { id: `${staticNoiseId}-intensity-effect`, componentId: 'generic', data: staticNoiseEffect },
    ],
  } as RenderableComponentData;

  // Root container with perspective
  const rootContainer = {
    id: 'glitch-3d-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1000px',
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [glitchContainer, scanlinesOverlay, staticNoiseOverlay],
  } as RenderableComponentData;

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
  id: 'glitch-3d-text-rotation',
  title: 'Glitch 3D Text Rotation',
  description:
    'A glitch-inspired 3D text rotation preset featuring RGB channel splitting, datamosh-style stuttered motion, and digital interference effects. The text rotates in 3D space with intentional "errors" - micro-rotations during signal tuning, smooth Y-axis rotation with stuttered steps, and RGB channel separation. Includes scan lines, static noise overlays, and position glitches that intensify at specific moments, creating the effect of corrupted data reconstructing itself into legible form.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'glitch',
    '3d',
    'rotation',
    'rgb-split',
    'datamosh',
    'cyberpunk',
    'tech',
    'corruption',
    'digital',
    'interference',
    'scanlines',
    'static',
    'noise',
  ],
  defaultInputParams: {
    text: 'GLITCH',
    duration: 3,
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: 'bold',
    rgbSplitDistance: 2,
    glitchIntensity: 1,
  },
  dependencies: {},
};

// Export preset
export const glitch3dTextRotationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
