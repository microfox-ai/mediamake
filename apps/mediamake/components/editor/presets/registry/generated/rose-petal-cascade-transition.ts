/**
 * Rose Petal Cascade Transition Preset
 * 
 * A romantic wedding transition where virtual rose petals fall gently across the screen
 * while scenes transition. Features realistic physics with gentle swaying, occasional spins,
 * and varying speeds. Petals accumulate to create a soft veil effect that obscures the
 * outgoing scene while revealing the incoming one.
 * 
 * Features:
 * - 19 rose petals with varying sizes (scale 0.5 to 1.5)
 * - Realistic physics: sine wave sway, rotation, and varying fall speeds
 * - Depth variation: near petals (larger, blurred), far petals (smaller, sharper)
 * - Soft shadows and transparency
 * - Warm romantic glow background transition
 * - Veil effect with accumulated opacity
 * - 4s total duration with staggered petal starts
 * 
 * Technical Details:
 * - Uses ShapeAtom with petal clip-path
 * - Transform-only animations for performance
 * - Cubic-bezier easing for natural motion
 * - Container contains layout for optimization
 * - Limited to 19 petals for performance
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Preset parameters schema
const presetParams = z.object({
  media1: z
    .object({
      src: z.string().describe('Source URL of outgoing media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Outgoing media'),
  media2: z
    .object({
      src: z.string().describe('Source URL of incoming media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Incoming media'),
  transitionDuration: z
    .number()
    .default(4)
    .describe('Duration of transition in seconds (default: 4s)'),
  petalColor: z
    .string()
    .default('#FFB6C1')
    .describe('Color of rose petals (default: light pink)'),
  petalCount: z
    .number()
    .min(10)
    .max(20)
    .default(19)
    .describe('Number of rose petals (10-20, default: 19)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration, petalColor, petalCount } = params;

  // Helper to create petal SVG path
  const createPetalPath = (): string => {
    return 'M50,10 Q70,30 60,50 Q70,70 50,90 Q30,70 40,50 Q30,30 50,10 Z';
  };

  // Helper to generate random value in range
  const randomRange = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  };

  // Calculate base layout duration
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Determine component IDs for media
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Generate petals with depth layers
  const generatePetals = (): RenderableComponentData[] => {
    const petals: RenderableComponentData[] = [];
    
    // Define depth layers (near, mid, far)
    const layerConfig = [
      { count: 5, scale: [1.25, 1.5], blur: 2, opacity: [0.6, 0.75], zIndex: 30, duration: [4.5, 5] },
      { count: 8, scale: [0.9, 1.2], blur: 0, opacity: [0.8, 0.9], zIndex: 20, duration: [3.5, 4.5] },
      { count: 6, scale: [0.65, 0.85], blur: 0, opacity: [0.88, 0.95], zIndex: 10, duration: [3, 4] },
    ];

    let petalIndex = 0;

    layerConfig.forEach((layer, layerIdx) => {
      const count = Math.min(layer.count, petalCount - petalIndex);
      
      for (let i = 0; i < count; i++) {
        const scale = randomRange(layer.scale[0], layer.scale[1]);
        const baseSize = 60;
        const size = baseSize * scale;
        const opacity = randomRange(layer.opacity[0], layer.opacity[1]);
        const blur = layer.blur;
        const fallDuration = randomRange(layer.duration[0], layer.duration[1]);
        const startDelay = randomRange(0, 1.5);
        const leftPosition = randomRange(0, 100);
        const swayAmplitude = randomRange(30, 80);
        const rotationSpeed = randomRange(2, 5);

        // Create petal shape atom
        const petalId = `rose-petal-${layerIdx}-${i}`;
        
        const petal: RenderableComponentData = {
          id: petalId,
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shape: 'circle',
            color: petalColor,
            style: {
              position: 'absolute',
              width: `${size}px`,
              height: `${size}px`,
              left: `${leftPosition}%`,
              top: '-100px',
              clipPath: `path('${createPetalPath()}')`,
              filter: blur > 0 
                ? `blur(${blur}px) drop-shadow(2px 4px 6px rgba(0,0,0,0.15))` 
                : `drop-shadow(${layerIdx === 0 ? '2px 4px 6px' : layerIdx === 1 ? '1px 2px 4px' : '0px 1px 2px'} rgba(0,0,0,${layerIdx === 0 ? 0.15 : layerIdx === 1 ? 0.12 : 0.08}))`,
              opacity: opacity,
              zIndex: layer.zIndex,
            },
          },
          context: {
            timing: {
              start: media1.duration - transitionDuration + startDelay,
              duration: fallDuration,
            },
          },
          effects: [
            // Fall effect (translateY)
            {
              id: `${petalId}-fall`,
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: fallDuration,
                mode: 'provider',
                targetIds: [petalId],
                ranges: [
                  { 
                    key: 'translateY', 
                    val: '-100px', 
                    prog: 0 
                  },
                  { 
                    key: 'translateY', 
                    val: `${(props.config?.height ?? 1080) + 100}px`, 
                    prog: 1 
                  },
                ],
              },
            },
            // Sway effect (translateX sine wave approximation)
            {
              id: `${petalId}-sway`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: fallDuration,
                mode: 'provider',
                targetIds: [petalId],
                ranges: [
                  { key: 'translateX', val: '0px', prog: 0 },
                  { key: 'translateX', val: `${swayAmplitude / 2}px`, prog: 0.25 },
                  { key: 'translateX', val: '0px', prog: 0.5 },
                  { key: 'translateX', val: `${-swayAmplitude / 2}px`, prog: 0.75 },
                  { key: 'translateX', val: '0px', prog: 1 },
                ],
              },
            },
            // Rotation effect
            {
              id: `${petalId}-rotate`,
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: fallDuration,
                mode: 'provider',
                targetIds: [petalId],
                ranges: [
                  { key: 'rotate', val: 0, prog: 0 },
                  { key: 'rotate', val: 360 * rotationSpeed, prog: 1 },
                ],
              },
            },
          ],
        };

        petals.push(petal);
        petalIndex++;
        
        if (petalIndex >= petalCount) break;
      }
      
      if (petalIndex >= petalCount) return;
    });

    return petals;
  };

  // Create petal container
  const petalContainer: RenderableComponentData = {
    id: 'petal-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden pointer-events-none',
        style: {
          contain: 'layout',
        },
      },
    },
    context: {
      timing: {
        start: media1.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    childrenData: generatePetals(),
  };

  // Create warm glow overlay
  const warmGlowOverlay: RenderableComponentData = {
    id: 'warm-glow-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'radial-gradient(ellipse at center, rgba(255,228,225,0.3) 0%, transparent 70%)',
          mixBlendMode: 'soft-light',
          opacity: 0,
        },
      },
    },
    context: {
      timing: {
        start: media1.duration - transitionDuration + 0.5,
        duration: transitionDuration - 0.5,
      },
    },
    effects: [
      {
        id: 'warm-glow-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration - 1,
          mode: 'provider',
          targetIds: ['warm-glow-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create veil overlay
  const veilOverlay: RenderableComponentData = {
    id: 'veil-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'linear-gradient(180deg, rgba(255,182,193,0) 0%, rgba(255,182,193,0.2) 50%, rgba(255,182,193,0.4) 100%)',
          opacity: 0,
          zIndex: 40,
        },
      },
    },
    context: {
      timing: {
        start: media1.duration - transitionDuration + 1.5,
        duration: transitionDuration - 1.5,
      },
    },
    effects: [
      {
        id: 'veil-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: transitionDuration - 1.5,
          mode: 'provider',
          targetIds: ['veil-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Build final composition
  const childrenData: RenderableComponentData[] = [
    // Outgoing media
    {
      id: 'outgoing-media',
      type: 'atom',
      componentId: media1ComponentId,
      data: {
        src: media1.src,
        className: 'w-full h-full object-cover',
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: media1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Incoming media
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'w-full h-full object-cover',
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration,
          duration: media2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Warm glow overlay
    warmGlowOverlay,
    // Petal container
    petalContainer,
    // Veil overlay
    veilOverlay,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'rose-petal-cascade-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
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
  id: 'rose-petal-cascade-transition',
  title: 'Rose Petal Cascade Transition',
  description:
    'A romantic wedding transition where virtual rose petals fall gently across the screen with realistic physics, depth-of-field effect, and warm romantic glow',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'romantic', 'wedding', 'petals', 'cascade', 'particles'],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/wedding-ceremony.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/wedding-reception.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 4,
    petalColor: '#FFB6C1',
    petalCount: 19,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const rosePetalCascadeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
