/**
 * Cinematic Lens Defocus Effect
 * 
 * A photorealistic lens defocus effect where text shrinks into a distant blurred point,
 * simulating camera depth of field with exponential blur, chromatic aberration, and vignette.
 * 
 * Features:
 * - Conditional blur: Sharp until 50% scale, then exponential blur to 20px
 * - Chromatic aberration via RGB text-shadow separation
 * - Closing vignette overlay that intensifies as text shrinks
 * - Perspective depth (500px) for realistic 3D space
 * - GPU-accelerated with transform: scale3d() for smooth performance
 * - Dynamic blur calculation based on scale threshold
 * 
 * Technical Implementation:
 * - BaseLayout root with perspective: 500px
 * - Vignette overlay (radial-gradient) animates from transparent to dark edges
 * - Text container with preserveTransform3d
 * - TextAtom with chromatic aberration (RGB text-shadow offsets)
 * - Generic effect animates scale (1 → 0) and opacity (1 → 0)
 * - Filter effect conditionally applies blur based on scale progress
 * 
 * Use Cases:
 * - Cinematic text transitions
 * - Camera focus pull effects
 * - Depth of field simulations
 * - Professional video intros/outros
 * - Text vanishing into distance
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

// --- Parameter Schema ---

const presetParams = z.object({
  text: z.string().default('FOCUS').describe('Text to display'),
  
  duration: z.number().min(0.5).max(10).default(3).describe('Total animation duration in seconds'),
  
  font: z.string()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  fontSize: z.number().min(24).max(200).default(96).describe('Font size in pixels'),
  
  textColor: z.string().default('#ffffff').describe('Base text color (hex or rgba)'),
  
  // Chromatic aberration
  chromaticIntensity: z.number().min(0).max(10).default(2).describe('Chromatic aberration intensity (pixel offset for RGB separation)'),
  
  // Blur parameters
  blurThreshold: z.number().min(0).max(1).default(0.5).describe('Scale threshold where blur starts (0 = start, 1 = never blur)'),
  maxBlur: z.number().min(0).max(50).default(20).describe('Maximum blur amount in pixels'),
  
  // Vignette parameters
  vignetteIntensity: z.number().min(0).max(1).default(0.8).describe('Maximum vignette darkness (0 = transparent, 1 = black)'),
  
  // Performance
  useGPUAcceleration: z.boolean().default(true).describe('Use GPU-accelerated transforms (scale3d)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    font,
    fontSize,
    textColor,
    chromaticIntensity,
    blurThreshold,
    maxBlur,
    vignetteIntensity,
    useGPUAcceleration,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
    const fontStyle: React.CSSProperties = {};
    
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Component IDs
  const rootId = 'cinematic-defocus-root';
  const vignetteId = 'vignette-overlay';
  const textContainerId = 'text-filter-container';
  const textId = 'main-text';

  // --- Text Atom Data ---
  
  const textAtomData: TextAtomData = {
    text: text,
    style: {
      fontSize: `${fontSize}px`,
      color: textColor,
      ...fontStyle,
      // Chromatic aberration via RGB text-shadow
      textShadow: `${chromaticIntensity}px 0 0 rgba(255,0,0,0.3), -${chromaticIntensity}px 0 0 rgba(0,255,255,0.3)`,
      filter: 'contrast(1.1) saturate(1.2)',
    },
    font: {
      family: fontFamily,
      weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
    },
  };

  // --- Effects ---

  // Main scale and opacity effect
  const scaleOpacityEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // Scale: 1 → 0
      { key: useGPUAcceleration ? 'scale3d' : 'scale', val: useGPUAcceleration ? '1,1,1' : 1, prog: 0 },
      { key: useGPUAcceleration ? 'scale3d' : 'scale', val: useGPUAcceleration ? '0,0,0' : 0, prog: 1 },
      
      // Opacity: 1 → 0 (vanish at end)
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0.8, prog: 0.7 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  // Conditional blur effect (sharp until blurThreshold, then exponential blur)
  const blurEffect: GenericEffectData = {
    type: 'ease-in',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // Sharp until blurThreshold
      { key: 'filter', val: `blur(0px) contrast(1.1) saturate(1.2)`, prog: 0 },
      { key: 'filter', val: `blur(0px) contrast(1.1) saturate(1.2)`, prog: blurThreshold },
      
      // Exponential blur increase
      { key: 'filter', val: `blur(${maxBlur * 0.3}px) contrast(1.05) saturate(1.1)`, prog: blurThreshold + (1 - blurThreshold) * 0.3 },
      { key: 'filter', val: `blur(${maxBlur * 0.6}px) contrast(1.02) saturate(1.05)`, prog: blurThreshold + (1 - blurThreshold) * 0.6 },
      { key: 'filter', val: `blur(${maxBlur}px) contrast(1) saturate(1)`, prog: 1 },
    ],
  };

  // Vignette intensity effect (transparent → dark edges)
  const vignetteEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [vignetteId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 0.3, prog: 0.3 },
      { key: 'opacity', val: vignetteIntensity, prog: 1 },
    ],
  };

  // --- Component Structure ---

  const mainTextComponent: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: textAtomData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: `${textId}-scale-opacity`,
        componentId: 'generic',
        data: scaleOpacityEffect,
      },
      {
        id: `${textId}-blur`,
        componentId: 'generic',
        data: blurEffect,
      },
    ],
  };

  const textFilterContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout',
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
    childrenData: [mainTextComponent],
  };

  const vignetteOverlay: RenderableComponentData = {
    id: vignetteId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; pointer-events: none;"></div>',
      className: 'absolute inset-0',
      style: {
        background: `radial-gradient(circle at center, transparent 0%, transparent 40%, rgba(0,0,0,0) 40%, rgba(0,0,0,${vignetteIntensity}) 100%)`,
        opacity: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: `${vignetteId}-intensity`,
        componentId: 'generic',
        data: vignetteEffect,
      },
    ],
  };

  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
        style: {
          perspective: '500px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [vignetteOverlay, textFilterContainer],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'cinematic-lens-defocus',
  title: 'Cinematic Lens Defocus Effect',
  description: 'A photorealistic lens defocus effect where text shrinks into a distant blurred point, simulating camera depth of field. Features conditional blur (sharp until 50% scale, then exponential blur to 20px), chromatic aberration via RGB separation, closing vignette overlay, and perspective depth. GPU-accelerated with transform: scale3d() and dynamic blur calculation based on scale threshold.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'cinematic', 'lens', 'defocus', 'blur', 'vignette', 'chromatic-aberration', 'camera', 'depth-of-field', 'focus-pull', 'photographic', 'gpu-accelerated'],
  defaultInputParams: {
    text: 'FOCUS',
    duration: 3,
    font: 'Inter:700',
    fontSize: 96,
    textColor: '#ffffff',
    chromaticIntensity: 2,
    blurThreshold: 0.5,
    maxBlur: 20,
    vignetteIntensity: 0.8,
    useGPUAcceleration: true,
  },
  dependencies: {},
};

// --- Export ---

export const cinematicLensDefocusPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
