/**
 * Shatter Reassemble Blur Typography Preset
 *
 * This preset creates a kinetic typography effect where text appears to be broken into fragments
 * that are initially out of focus and scattered, then reconstruct into sharp typography on beats.
 * Think of it as a reverse explosion - blurred shards of letters floating in space that
 * magnetically snap together.
 *
 * Features:
 * - Fragment-level text splitting with irregular clip-paths for shattered glass aesthetic
 * - Individual blur (10-25px) and position offset per fragment
 * - Glass-like refraction effects using backdrop filters and skew transforms
 * - Subtle light scattering during the blur phase
 * - Beat-synced reassembly with magnetic snap feel (spring/custom easing)
 * - Fragments accelerate as they approach final positions
 * - Performance optimized with CSS containment
 *
 * Use cases:
 * - Dynamic title reveals synchronized to music beats
 * - Explosive typography for impact moments
 * - Kinetic text animations for music videos
 * - Dramatic scene transitions with text reconstruction
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  text: z.string().describe('Text to shatter and reassemble'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Base font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color for fragments'),
  
  // Audio beat detection
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL for beat detection (optional - if not provided, uses timed reassembly)'),
  
  // Timing configuration
  reassembleStart: z
    .number()
    .min(0)
    .default(0)
    .describe('Time in seconds when reassembly begins (used if no audio)'),
  reassembleDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .describe('Duration of reassembly animation in seconds'),
  totalDuration: z
    .number()
    .min(1)
    .default(5)
    .describe('Total duration of the preset in seconds'),
  
  // Fragment configuration
  fragmentCount: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe('Number of fragments to split text into (more = finer shatter)'),
  initialBlurMin: z
    .number()
    .min(5)
    .max(20)
    .default(10)
    .describe('Minimum blur amount in pixels for fragments'),
  initialBlurMax: z
    .number()
    .min(15)
    .max(40)
    .default(25)
    .describe('Maximum blur amount in pixels for fragments'),
  
  // Position scatter configuration
  scatterRadiusX: z
    .number()
    .min(50)
    .max(500)
    .default(200)
    .describe('Horizontal scatter radius in pixels'),
  scatterRadiusY: z
    .number()
    .min(50)
    .max(500)
    .default(150)
    .describe('Vertical scatter radius in pixels'),
  rotationRange: z
    .number()
    .min(0)
    .max(180)
    .default(45)
    .describe('Maximum rotation angle for scattered fragments in degrees'),
  
  // Visual effects
  enableGlassEffect: z
    .boolean()
    .default(true)
    .describe('Enable glass-like refraction and backdrop blur'),
  enableLightScatter: z
    .boolean()
    .default(true)
    .describe('Enable light scattering effect during blur phase'),
  glassBlurAmount: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Backdrop blur amount for glass effect in pixels'),
  
  // Animation easing
  easingType: z
    .enum(['spring', 'magnetic', 'ease-out'])
    .default('magnetic')
    .describe('Easing type for reassembly animation'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  // Parse font configuration
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: Record<string, any> = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2]; // 'normal' | 'italic'
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font || 'Inter:700');

  // Generate random value within range
  const randomRange = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  };

  // Generate irregular clip-path for fragment
  const generateIrregularClipPath = (index: number, total: number): string => {
    // Create polygon with random points for shattered glass effect
    const points = 5 + Math.floor(Math.random() * 3); // 5-7 points
    const clipPoints: string[] = [];
    
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 360 + randomRange(-20, 20);
      const radius = randomRange(40, 60);
      const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
      const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
      clipPoints.push(`${x}% ${y}%`);
    }
    
    return `polygon(${clipPoints.join(', ')})`;
  };

  // Easing function mapping
  const getEasingType = (type: string): string => {
    if (type === 'magnetic') {
      return 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    }
    if (type === 'spring') {
      return 'spring';
    }
    return 'ease-out';
  };

  const easingFunction = getEasingType(params.easingType);

  // Split text into fragments
  const textFragments: string[] = [];
  const text = params.text;
  const charsPerFragment = Math.max(1, Math.floor(text.length / params.fragmentCount));
  
  for (let i = 0; i < text.length; i += charsPerFragment) {
    const fragment = text.slice(i, i + charsPerFragment);
    if (fragment.trim()) {
      textFragments.push(fragment);
    }
  }

  // Beat detection (if audio provided)
  let beatTime = params.reassembleStart;
  if (params.audioSrc && props.fetcher) {
    try {
      const { analysis } = await props.fetcher('/api/analyze-audio', {
        audioSrc: params.audioSrc,
      });
      
      if (analysis && analysis.length > 0) {
        // Find first strong beat after reassembleStart
        const strongBeats = analysis
          .filter((beat: any) => 
            beat.timestamp >= params.reassembleStart && 
            beat.intensity > 0.6
          )
          .sort((a: any, b: any) => b.intensity - a.intensity);
        
        if (strongBeats.length > 0) {
          beatTime = strongBeats[0].timestamp;
        }
      }
    } catch (error) {
      // Fallback to timed reassembly if audio analysis fails
      console.warn('Audio analysis failed, using timed reassembly');
    }
  }

  // Create fragment atoms with effects
  const fragmentChildren: RenderableComponentData[] = textFragments.map((fragment, index) => {
    const fragmentId = `shatter-fragment-${index}`;
    
    // Random scatter positions
    const randomX = randomRange(-params.scatterRadiusX, params.scatterRadiusX);
    const randomY = randomRange(-params.scatterRadiusY, params.scatterRadiusY);
    const randomRotation = randomRange(-params.rotationRange, params.rotationRange);
    const randomBlur = randomRange(params.initialBlurMin, params.initialBlurMax);
    
    // Random skew for refraction effect
    const randomSkewX = randomRange(-5, 5);
    const randomSkewY = randomRange(-5, 5);

    // Create effects for this fragment
    const fragmentEffects: any[] = [];

    // Blur effect
    fragmentEffects.push({
      id: `${fragmentId}-blur`,
      componentId: 'generic',
      data: {
        type: easingFunction,
        start: beatTime,
        duration: params.reassembleDuration,
        mode: 'provider',
        targetIds: [fragmentId],
        ranges: [
          { key: 'blur', val: randomBlur, prog: 0 },
          { key: 'blur', val: 0, prog: 1 },
        ],
      },
    });

    // Position effect (translateX, translateY)
    fragmentEffects.push({
      id: `${fragmentId}-position`,
      componentId: 'generic',
      data: {
        type: easingFunction,
        start: beatTime,
        duration: params.reassembleDuration,
        mode: 'provider',
        targetIds: [fragmentId],
        ranges: [
          { key: 'translateX', val: randomX, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: randomY, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    });

    // Rotation effect
    fragmentEffects.push({
      id: `${fragmentId}-rotate`,
      componentId: 'generic',
      data: {
        type: easingFunction,
        start: beatTime,
        duration: params.reassembleDuration,
        mode: 'provider',
        targetIds: [fragmentId],
        ranges: [
          { key: 'rotate', val: randomRotation, prog: 0 },
          { key: 'rotate', val: 0, prog: 1 },
        ],
      },
    });

    // Opacity effect
    fragmentEffects.push({
      id: `${fragmentId}-opacity`,
      componentId: 'generic',
      data: {
        type: easingFunction,
        start: beatTime,
        duration: params.reassembleDuration,
        mode: 'provider',
        targetIds: [fragmentId],
        ranges: [
          { key: 'opacity', val: 0.7, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    });

    // Skew effect for refraction (if glass effect enabled)
    if (params.enableGlassEffect) {
      fragmentEffects.push({
        id: `${fragmentId}-skew`,
        componentId: 'generic',
        data: {
          type: easingFunction,
          start: beatTime,
          duration: params.reassembleDuration,
          mode: 'provider',
          targetIds: [fragmentId],
          ranges: [
            { key: 'skewX', val: randomSkewX, prog: 0 },
            { key: 'skewX', val: 0, prog: 1 },
            { key: 'skewY', val: randomSkewY, prog: 0 },
            { key: 'skewY', val: 0, prog: 1 },
          ],
        },
      });
    }

    return {
      id: fragmentId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: fragment,
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          fontWeight: fontStyle.fontWeight || 700,
          ...(fontStyle.fontStyle ? { fontStyle: fontStyle.fontStyle } : {}),
          position: 'absolute' as const,
          clipPath: generateIrregularClipPath(index, textFragments.length),
          willChange: 'transform, filter, opacity',
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.totalDuration,
        },
      },
      effects: fragmentEffects,
    } as RenderableComponentData;
  });

  // Glass overlay layer
  const glassOverlay: RenderableComponentData = {
    id: 'shatter-glass-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          backdropFilter: params.enableGlassEffect ? `blur(${params.glassBlurAmount}px)` : 'none',
          mixBlendMode: 'overlay' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    effects: params.enableGlassEffect ? [
      {
        id: 'glass-fade-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: beatTime,
          duration: params.reassembleDuration,
          mode: 'provider',
          targetIds: ['shatter-glass-overlay'],
          ranges: [
            { key: 'opacity', val: 0.6, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ] : [],
    childrenData: [],
  };

  // Light scatter layer
  const lightScatterLayer: RenderableComponentData = {
    id: 'shatter-light-scatter',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, transparent 70%)',
          mixBlendMode: 'screen' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    effects: params.enableLightScatter ? [
      {
        id: 'light-scatter-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: beatTime,
          duration: params.reassembleDuration,
          mode: 'provider',
          targetIds: ['shatter-light-scatter'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'light-scatter-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: beatTime,
          duration: params.reassembleDuration,
          mode: 'provider',
          targetIds: ['shatter-light-scatter'],
          ranges: [
            { key: 'scale', val: 1.2, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ] : [],
    childrenData: [],
  };

  // Fragments container
  const fragmentsContainer: RenderableComponentData = {
    id: 'shatter-fragments-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    childrenData: fragmentChildren as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'shatter-reassemble-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
        style: {
          contain: 'layout style paint',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    childrenData: [
      fragmentsContainer,
      ...(params.enableGlassEffect ? [glassOverlay] : []),
      ...(params.enableLightScatter ? [lightScatterLayer] : []),
    ] as RenderableComponentData[],
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
  id: 'shatterReassembleBlurTypography',
  title: 'Shatter Reassemble Blur Typography',
  description:
    'A kinetic typography preset where text fragments appear blurred and scattered, then magnetically snap together on audio beats. Features glass-like refraction effects, light scattering, and satisfying spring-based reassembly animations. Fragments use irregular clip-paths for a shattered glass aesthetic, with individual blur (10-25px), random positions, and rotations that resolve into sharp, ordered typography.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'shatter',
    'reassemble',
    'blur',
    'fragments',
    'glass',
    'refraction',
    'light-scatter',
    'beat-sync',
    'magnetic',
    'spring',
    'explosion',
    'reverse',
    'impact',
    'music',
    'dynamic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'SHATTER',
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#FFFFFF',
    reassembleStart: 0,
    reassembleDuration: 1.5,
    totalDuration: 5,
    fragmentCount: 10,
    initialBlurMin: 10,
    initialBlurMax: 25,
    scatterRadiusX: 200,
    scatterRadiusY: 150,
    rotationRange: 45,
    enableGlassEffect: true,
    enableLightScatter: true,
    glassBlurAmount: 2,
    easingType: 'magnetic',
  },
};

export const shatterReassembleBlurTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};