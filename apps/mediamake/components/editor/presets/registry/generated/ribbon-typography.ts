/**
 * Ribbon Typography Preset
 *
 * Creates flowing silk ribbon text effect where words connect as a continuous ribbon
 * rippling through 3D space with physics-inspired animations. Features spring-damper
 * model for weight/elasticity effects, wind gust waves via staggered keyframe effects,
 * and elegant knot formations using perspective transforms and bezier positioning.
 *
 * Key Features:
 * - 3D ribbon flow with perspective transforms (1200px)
 * - Physics-based spring animations for weight and elasticity
 * - Wind gust effects using staggered keyframe animations
 * - Elegant knot/bow formations at designated moments
 * - Gradient opacity along ribbon length
 * - Overlapped timing for smooth flow continuity
 * - Word connections with bezier-style curves
 * - Backface culling for clean 3D rendering
 *
 * Technical Details:
 * - Uses BaseLayout with preserve-3d for 3D context
 * - Chains TextAtoms with calculated bezier connections
 * - Generic effects with complex translateX/Y/Z and rotateX/Y
 * - Skew transforms for ribbon twist effect
 * - Perlin-inspired noise patterns for natural wind randomness
 * - ScaleY based on word importance from caption metadata
 * - Staggered timing with 0.15-0.2s overlap per word
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption objects with word-level timing'),
  font: z.string()
    .optional()
    .default('Inter')
    .describe('Font family with optional weight and style (e.g., "Inter:400", "Roboto:700:italic")'),
  fontSize: z.number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Base font size in pixels'),
  textColor: z.string()
    .default('#FFFFFF')
    .describe('Text color for ribbon words'),
  ribbonColor: z.string()
    .default('#FFFFFF')
    .describe('Color of ribbon connectors between words'),
  windIntensity: z.number()
    .min(0)
    .max(5)
    .default(1.5)
    .describe('Intensity of wind gust effects (0 = none, 5 = extreme)'),
  physicsWeight: z.number()
    .min(0)
    .max(2)
    .default(0.8)
    .describe('Physics weight causing sagging (0 = none, 2 = heavy)'),
  elasticity: z.number()
    .min(0)
    .max(2)
    .default(1.2)
    .describe('Spring elasticity for ribbon bounce (0 = stiff, 2 = very elastic)'),
  knotFrequency: z.number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Probability of ribbon forming knots/bows (0 = never, 1 = always)'),
  flowSpeed: z.number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Speed multiplier for ribbon flow animations'),
  depthRange: z.number()
    .min(50)
    .max(500)
    .default(200)
    .describe('Z-depth range for 3D ribbon movement (pixels)'),
  overlapDuration: z.number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Overlap duration between word animations in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];
  
  // Helper: Simple pseudo-random number generator for consistent randomness
  const seededRandom = (seed: number): number => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
    const fontParts = fontString.split(':');
    const fontStyle: React.CSSProperties = {};
    
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
    
    return { fontFamily, fontStyle };
  };

  // Helper: Generate Perlin-like noise value for natural wind
  const generateWindNoise = (time: number, seed: number): number => {
    const t = time * 0.5 + seed;
    const noise = 
      Math.sin(t) * 0.5 +
      Math.sin(t * 2.3 + 1.5) * 0.3 +
      Math.sin(t * 4.7 + 3.2) * 0.2;
    return noise;
  };

  // Helper: Calculate bezier curve path for ribbon connections
  const calculateBezierTransform = (
    wordIndex: number,
    totalWords: number,
    time: number,
    windIntensity: number,
  ): { translateX: number; translateY: number; translateZ: number; rotateX: number; rotateY: number; skewX: number } => {
    const progress = wordIndex / Math.max(totalWords - 1, 1);
    const windNoise = generateWindNoise(time, wordIndex * 123.456);
    
    // Base ribbon flow path
    const baseX = Math.sin(progress * Math.PI * 2) * 50;
    const baseY = Math.cos(progress * Math.PI * 3) * 30 - progress * params.physicsWeight * 20;
    const baseZ = Math.sin(progress * Math.PI * 4) * params.depthRange;
    
    // Wind effects
    const windX = windNoise * windIntensity * 40;
    const windY = Math.sin(windNoise * 2) * windIntensity * 20;
    const windZ = Math.cos(windNoise * 1.5) * windIntensity * 30;
    
    // Rotation based on ribbon curvature
    const rotateX = (Math.cos(progress * Math.PI * 2) * 15 + windNoise * windIntensity * 10);
    const rotateY = (Math.sin(progress * Math.PI * 3) * 20 + windNoise * windIntensity * 15);
    
    // Skew for ribbon twist
    const skewX = Math.sin(progress * Math.PI * 4 + time) * 5;
    
    return {
      translateX: baseX + windX,
      translateY: baseY + windY,
      translateZ: baseZ + windZ,
      rotateX,
      rotateY,
      skewX,
    };
  };

  // Helper: Check if this position should form a knot
  const shouldFormKnot = (captionIndex: number, wordIndex: number): boolean => {
    const seed = captionIndex * 1000 + wordIndex;
    return seededRandom(seed) < params.knotFrequency;
  };

  // Parse font configuration
  const { fontFamily, fontStyle } = parseFontString(params.font);

  const allWordComponents: RenderableComponentData[] = [];
  let globalTime = 0;

  captions.forEach((caption, captionIndex) => {
    const words = caption.words || [];
    const captionStartTime = caption.absoluteStart;
    
    words.forEach((word, wordIndex) => {
      const wordId = `ribbon-word-${captionIndex}-${wordIndex}`;
      const wordStart = word.start; // Relative to caption
      const wordDuration = word.duration;
      const totalWords = words.length;
      
      // Calculate word importance for scaleY (ribbon width)
      const wordImportance = word.confidence || 0.8;
      const ribbonWidth = 0.8 + (wordImportance * 0.4); // 0.8 to 1.2 scale
      
      // Calculate overlap timing
      const effectStart = wordStart;
      const effectDuration = wordDuration + params.overlapDuration;
      
      // Determine if this word should form a knot
      const isKnotPoint = shouldFormKnot(captionIndex, wordIndex);
      
      // Create 3D ribbon flow effect with physics
      const flowEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: effectStart,
        duration: effectDuration / params.flowSpeed,
        mode: 'provider',
        targetIds: [wordId],
        ranges: (() => {
          const ranges: any[] = [];
          const steps = 8; // Keyframes for smooth curve
          
          for (let i = 0; i <= steps; i++) {
            const prog = i / steps;
            const time = globalTime + wordStart + (prog * effectDuration);
            const transforms = calculateBezierTransform(wordIndex, totalWords, time, params.windIntensity);
            
            // Add knot loop effect at midpoint if designated
            let knotMultiplier = 1;
            if (isKnotPoint && prog > 0.3 && prog < 0.7) {
              knotMultiplier = 1 + Math.sin((prog - 0.3) / 0.4 * Math.PI) * 0.5;
            }
            
            ranges.push(
              { key: 'translateX', val: transforms.translateX * knotMultiplier, prog },
              { key: 'translateY', val: transforms.translateY * knotMultiplier, prog },
              { key: 'translateZ', val: transforms.translateZ * knotMultiplier, prog },
              { key: 'rotateX', val: transforms.rotateX * knotMultiplier, prog },
              { key: 'rotateY', val: transforms.rotateY * knotMultiplier, prog },
              { key: 'skewX', val: transforms.skewX, prog },
              { key: 'scaleY', val: ribbonWidth * knotMultiplier, prog },
            );
          }
          
          return ranges;
        })(),
      };
      
      // Opacity gradient along ribbon length
      const opacityEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: effectStart,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.2 },
          { key: 'opacity', val: 1, prog: 0.8 },
          { key: 'opacity', val: 0.3, prog: 1 },
        ],
      };
      
      // Wind gust effect (sudden force creating waves)
      const windGustEffect: GenericEffectData = {
        type: 'ease-out',
        start: effectStart + wordDuration * 0.4,
        duration: 0.3 / params.flowSpeed,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: params.windIntensity * 60 * (seededRandom(wordIndex * 789) - 0.5), prog: 0.5 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: params.windIntensity * -30 * seededRandom(wordIndex * 456), prog: 0.5 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      };
      
      // Spring elasticity effect
      const springEffect: GenericEffectData = {
        type: 'spring',
        start: effectStart,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'scaleX', val: 0.95, prog: 0 },
          { key: 'scaleX', val: 1 + (params.elasticity * 0.05), prog: 0.3 },
          { key: 'scaleX', val: 0.98, prog: 0.6 },
          { key: 'scaleX', val: 1, prog: 1 },
        ],
      };
      
      // Create word component
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            whiteSpace: 'nowrap',
            backfaceVisibility: 'hidden',
            marginRight: '0.5em',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0, // All words start together (sentence-level timing)
            duration: caption.duration,
          },
        },
        effects: [
          { id: `${wordId}-flow`, componentId: 'generic', data: flowEffect },
          { id: `${wordId}-opacity`, componentId: 'generic', data: opacityEffect },
          { id: `${wordId}-wind`, componentId: 'generic', data: windGustEffect },
          { id: `${wordId}-spring`, componentId: 'generic', data: springEffect },
        ],
      };
      
      allWordComponents.push(wordComponent);
    });
    
    globalTime += caption.duration;
  });

  // Create ribbon segments container with 3D preserve
  const ribbonContainer: RenderableComponentData = {
    id: 'ribbon-segments-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-row items-center justify-center flex-wrap',
        style: {
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: globalTime,
      },
    },
    childrenData: allWordComponents,
  };

  // Create 3D stage with perspective
  const ribbon3DStage: RenderableComponentData = {
    id: 'ribbon-3d-stage',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: globalTime,
      },
    },
    childrenData: [ribbonContainer],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'ribbon-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          perspective: '1200px',
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: captions[0]?.absoluteStart || 0,
        duration: globalTime,
      },
    },
    childrenData: [ribbon3DStage],
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
  id: 'ribbon-typography',
  title: 'Ribbon Typography',
  description: 'Flowing silk ribbon text effect where words connect as a continuous ribbon rippling through 3D space. Features physics-inspired spring animations for weight/elasticity effects, wind gust waves via staggered keyframe effects, and elegant knot formations. Uses perspective transforms, bezier positioning, and gradient opacity along ribbon length.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'ribbon', '3d', 'physics', 'wind', 'kinetic', 'flow', 'spring', 'elastic', 'bezier', 'perspective'],
  defaultInputParams: {
    captions: [],
    font: 'Inter',
    fontSize: 48,
    textColor: '#FFFFFF',
    ribbonColor: '#FFFFFF',
    windIntensity: 1.5,
    physicsWeight: 0.8,
    elasticity: 1.2,
    knotFrequency: 0.15,
    flowSpeed: 1,
    depthRange: 200,
    overlapDuration: 0.2,
  },
  dependencies: {},
};

export const ribbonTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
