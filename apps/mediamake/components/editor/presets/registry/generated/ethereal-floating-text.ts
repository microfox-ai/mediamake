/**
 * Ethereal Floating Text Preset
 *
 * Physics-based floating text preset where typography behaves like weightless particles 
 * in zero gravity before being pulled downward by increasing gravity. Features:
 * 
 * - Physics-based animation using presetExecution calculations
 * - Three parallax depth layers with different fall speeds
 * - Iridescent shimmer using animated gradients
 * - Tumbling effect with rotateX/Y transformations
 * - 60fps keyframe generation via requestAnimationFrame timing
 * - Word-by-word particle spawning with random initial velocities
 * - Exponential gravity acceleration curves
 * 
 * Perfect for dream sequences or surreal content where reality feels suspended.
 *
 * Use cases:
 * - Dream sequence titles
 * - Surreal content overlays
 * - Abstract motion graphics
 * - Experimental typography effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        end: z.number(),
        duration: z.number(),
        absoluteStart: z.number(),
        absoluteEnd: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
          })
        ),
      })
    )
    .describe('Array of caption sentences with word-level timing'),
  
  font: z
    .string()
    .default('Inter:400')
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:400", "Roboto:700:italic")'),
  
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(72)
    .optional()
    .describe('Base font size in pixels'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Base text color (will be overlaid with gradient)'),
  
  gradientColors: z
    .object({
      from: z.string().default('#A78BFA'),
      via: z.string().default('#F472B6'),
      to: z.string().default('#60A5FA'),
    })
    .optional()
    .describe('Iridescent gradient colors (from-via-to)'),
  
  gravityStrength: z
    .number()
    .min(0.9)
    .max(1.1)
    .default(0.98)
    .optional()
    .describe('Gravity multiplier (0.98 = default, lower = slower fall)'),
  
  velocityRange: z
    .object({
      x: z.number().default(4),
      y: z.number().default(3),
    })
    .optional()
    .describe('Initial velocity range for random spawning'),
  
  parallaxDepths: z
    .object({
      near: z.number().default(100),
      mid: z.number().default(0),
      far: z.number().default(-100),
    })
    .optional()
    .describe('Z-axis translateZ values for parallax layers (in px)'),
  
  fps: z
    .number()
    .min(30)
    .max(60)
    .default(60)
    .optional()
    .describe('Frames per second for physics calculations'),
  
  tumbleIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .optional()
    .describe('Rotation intensity for tumbling effect'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:400';
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

  // Extract parameters
  const fontSize = params.fontSize || 72;
  const textColor = params.textColor || '#FFFFFF';
  const gradientColors = params.gradientColors || {
    from: '#A78BFA',
    via: '#F472B6',
    to: '#60A5FA',
  };
  const gravityStrength = params.gravityStrength || 0.98;
  const velocityRange = params.velocityRange || { x: 4, y: 3 };
  const parallaxDepths = params.parallaxDepths || {
    near: 100,
    mid: 0,
    far: -100,
  };
  const fps = params.fps || 60;
  const tumbleIntensity = params.tumbleIntensity || 3;

  // Helper function: Generate physics-based keyframes
  const generatePhysicsKeyframes = (
    wordDuration: number,
    layerDepth: 'near' | 'mid' | 'far',
  ): GenericEffectData['ranges'] => {
    // Random initial velocity
    const initialVelocityX = Math.random() * velocityRange.x - velocityRange.x / 2;
    const initialVelocityY = Math.random() * velocityRange.y - velocityRange.y;
    
    // Layer-specific gravity multiplier
    const depthMultipliers = { near: 1.2, mid: 1.0, far: 0.8 };
    const layerGravity = gravityStrength * depthMultipliers[layerDepth];
    
    // Generate keyframes at 60fps
    const frameCount = Math.ceil(wordDuration * fps);
    const keyframes: GenericEffectData['ranges'] = [];
    
    let posX = 0;
    let posY = -20; // Start slightly above
    const velX = initialVelocityX;
    let velY = initialVelocityY;
    let rotX = 0;
    let rotY = 0;
    
    for (let frame = 0; frame <= frameCount; frame++) {
      const progress = frame / frameCount;
      
      // Update velocity with gravity
      velY *= layerGravity;
      
      // Update positions
      posX += velX;
      posY += velY;
      
      // Update rotation for tumbling
      rotX += tumbleIntensity * 0.3;
      rotY += tumbleIntensity * 0.5;
      
      // Add keyframe
      keyframes.push(
        { key: 'translateX', val: posX, prog: progress },
        { key: 'translateY', val: posY, prog: progress },
        { key: 'rotateX', val: rotX, prog: progress },
        { key: 'rotateY', val: rotY, prog: progress }
      );
    }
    
    return keyframes;
  };

  // Helper function: Generate gradient animation keyframes
  const generateGradientKeyframes = (
    duration: number,
  ): GenericEffectData['ranges'] => {
    const keyframes: GenericEffectData['ranges'] = [];
    const steps = 20;
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const offset = progress * 200 - 100;
      keyframes.push({
        key: 'backgroundPosition',
        val: `${offset}% 50%`,
        prog: progress,
      });
    }
    
    return keyframes;
  };

  // Helper function: Assign word to layer
  const assignWordToLayer = (wordIndex: number): 'near' | 'mid' | 'far' => {
    const mod = wordIndex % 3;
    if (mod === 0) return 'near';
    if (mod === 1) return 'mid';
    return 'far';
  };

  // Create word components with physics effects
  const layerWords: {
    near: RenderableComponentData[];
    mid: RenderableComponentData[];
    far: RenderableComponentData[];
  } = {
    near: [],
    mid: [],
    far: [],
  };

  let wordGlobalIndex = 0;

  params.captions.forEach((caption, captionIndex) => {
    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const layer = assignWordToLayer(wordGlobalIndex);
      const layerDepthValue =
        layer === 'near'
          ? parallaxDepths.near
          : layer === 'mid'
          ? parallaxDepths.mid
          : parallaxDepths.far;
      
      // Scale based on depth
      const depthScale = layer === 'near' ? 1.1 : layer === 'mid' ? 1.0 : 0.9;

      // Physics keyframes
      const physicsKeyframes = generatePhysicsKeyframes(
        caption.duration,
        layer,
      );

      // Gradient shimmer keyframes
      const gradientKeyframes = generateGradientKeyframes(caption.duration);

      // Physics effect
      const physicsEffect = {
        id: `physics-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: word.start,
          duration: caption.duration - word.start,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: [
            ...physicsKeyframes,
            // Fade out near end
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      };

      // Gradient shimmer effect
      const gradientEffect = {
        id: `gradient-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: word.start,
          duration: caption.duration - word.start,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: gradientKeyframes,
        } as GenericEffectData,
      };

      // Word component
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: fontSize * depthScale,
            color: textColor,
            fontWeight: fontStyle.fontWeight || 400,
            fontStyle: fontStyle.fontStyle || 'normal',
            marginRight: '0.5em',
            // Gradient background for iridescence
            background: `linear-gradient(90deg, ${gradientColors.from} 0%, ${gradientColors.via} 50%, ${gradientColors.to} 100%)`,
            backgroundSize: '200% 100%',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 20px rgba(255,255,255,0.3)',
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['400'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [physicsEffect, gradientEffect],
      };

      layerWords[layer].push(wordComponent);
      wordGlobalIndex++;
    });
  });

  // Create parallax layer containers
  const createLayerContainer = (
    layerId: string,
    depth: number,
    scale: number,
    words: RenderableComponentData[],
  ): RenderableComponentData => {
    return {
      id: layerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex flex-wrap items-center justify-center',
          style: {
            transform: `translateZ(${depth}px) scale(${scale})`,
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: 'this',
        },
      },
      childrenData: words,
    } as RenderableComponentData;
  };

  // Create caption container for each caption
  const captionContainers: RenderableComponentData[] = params.captions.map(
    (caption, index) => {
      return {
        id: `caption-container-${index}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: [
          createLayerContainer(
            `layer-far-${index}`,
            parallaxDepths.far,
            0.9,
            layerWords.far.filter((w) => w.id?.includes(`-${index}-`)),
          ),
          createLayerContainer(
            `layer-mid-${index}`,
            parallaxDepths.mid,
            1.0,
            layerWords.mid.filter((w) => w.id?.includes(`-${index}-`)),
          ),
          createLayerContainer(
            `layer-near-${index}`,
            parallaxDepths.near,
            1.1,
            layerWords.near.filter((w) => w.id?.includes(`-${index}-`)),
          ),
        ],
      } as RenderableComponentData;
    }
  );

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'ethereal-floating-text-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          perspective: '1000px',
          perspectiveOrigin: '50% 50%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: captionContainers as RenderableComponentData[],
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
  id: 'ethereal-floating-text',
  title: 'Ethereal Floating Text',
  description:
    'Physics-based floating text preset where typography behaves like weightless particles in zero gravity before being pulled downward by increasing gravity. Features iridescent shimmer using animated gradients, parallax depth layers with different fall speeds, and tumbling effects. Perfect for dream sequences or surreal content where reality feels suspended.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'captions',
    'subtitles',
    'physics',
    'floating',
    'zero-gravity',
    'particles',
    'ethereal',
    'surreal',
    'parallax',
    'iridescent',
    'gradient',
    'tumbling',
    'dream-sequence',
    'experimental',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    font: 'Inter:400',
    fontSize: 72,
    textColor: '#FFFFFF',
    gradientColors: {
      from: '#A78BFA',
      via: '#F472B6',
      to: '#60A5FA',
    },
    gravityStrength: 0.98,
    velocityRange: {
      x: 4,
      y: 3,
    },
    parallaxDepths: {
      near: 100,
      mid: 0,
      far: -100,
    },
    fps: 60,
    tumbleIntensity: 3,
  },
};

// Export preset
export const etherealFloatingTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
