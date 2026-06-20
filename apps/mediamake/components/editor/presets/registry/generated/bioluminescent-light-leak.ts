/**
 * Bioluminescent Light Leak Preset
 *
 * Creates an ethereal, dreamlike light leak effect that pulses and breathes like bioluminescence.
 * Imagine underwater footage where light dances through water - fluid, organic movements with
 * caustic light patterns. The leak has a living quality, expanding and contracting rhythmically
 * like breathing.
 *
 * Features:
 * - Multiple organic blob shapes with fluid border-radius animations
 * - Soft, glowing edges using blur and blend modes
 * - Cool mystical colors (cyan, purple, deep blue) with warm accents
 * - Floating particle effects that drift like plankton or dust motes
 * - Slow color spectrum cycling via hue-rotate
 * - Breathing animations with scale pulsing (0.8 to 1.2)
 * - Rotation effects for organic movement
 * - Screen and color-dodge blend modes for ethereal glow
 *
 * Use cases:
 * - Transition effects with otherworldly atmosphere
 * - Overlay effects for dreamlike sequences
 * - Background effects for meditative content
 * - Atmospheric layers for music videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(4)
    .describe('Duration of the transition or overlay effect in seconds'),
  intensity: z
    .number()
    .min(0.3)
    .max(2)
    .default(1)
    .describe('Overall intensity of the light leak effect (affects opacity, blur, scale range)'),
  breathingSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Speed multiplier for breathing/pulsing animations (1 = normal, 2 = faster)'),
  particleCount: z
    .number()
    .min(5)
    .max(30)
    .default(12)
    .describe('Number of floating particle motes'),
  colorShiftSpeed: z
    .number()
    .min(0.3)
    .max(3)
    .default(1)
    .describe('Speed of color spectrum cycling (1 = normal, 2 = faster)'),
  enableParticles: z
    .boolean()
    .default(true)
    .describe('Enable or disable floating particle effects'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    intensity,
    breathingSpeed,
    particleCount,
    colorShiftSpeed,
    enableParticles,
  } = params;

  // Helper to generate random particle properties
  const generateParticle = (index: number) => {
    const sizes = [4, 5, 6, 7, 8, 9, 10];
    const size = sizes[index % sizes.length];
    
    // Distribute particles across the frame
    const topPositions = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90];
    const leftPositions = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95];
    
    const top = topPositions[index % topPositions.length];
    const left = leftPositions[(index * 3) % leftPositions.length];
    
    // Vary glow colors
    const glowColors = [
      'rgba(0, 255, 255, 0.5)',
      'rgba(138, 43, 226, 0.5)',
      'rgba(255, 200, 100, 0.4)',
    ];
    const glowColor = glowColors[index % glowColors.length];
    
    return { size, top, left, glowColor };
  };

  // Create particle children
  const particleChildren: RenderableComponentData[] = enableParticles
    ? Array.from({ length: particleCount }, (_, i) => {
        const { size, top, left, glowColor } = generateParticle(i);
        const particleId = `bioluminescent-particle-${i}`;
        
        // Vary animation timings for organic drift
        const driftX = (i % 3) === 0 ? 30 : (i % 3) === 1 ? -30 : 0;
        const driftY = (i % 2) === 0 ? 20 : -20;
        const baseOpacity = 0.15 + (i % 5) * 0.05;
        
        return {
          id: particleId,
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div></div>`,
            className: 'absolute rounded-full',
            style: {
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              top: `${top}%`,
              left: `${left}%`,
              boxShadow: `0 0 ${size * 1.5}px ${glowColor}`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
          effects: [
            {
              id: `particle-drift-${i}`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: duration / breathingSpeed,
                mode: 'provider',
                targetIds: [particleId],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: driftX, prog: 0.5 },
                  { key: 'translateX', val: 0, prog: 1 },
                  { key: 'translateY', val: 0, prog: 0 },
                  { key: 'translateY', val: driftY, prog: 0.5 },
                  { key: 'translateY', val: 0, prog: 1 },
                  { key: 'opacity', val: baseOpacity, prog: 0 },
                  { key: 'opacity', val: baseOpacity + 0.15, prog: 0.5 },
                  { key: 'opacity', val: baseOpacity, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData;
      })
    : [];

  // Blob 1 - Main cyan/purple gradient
  const blob1: RenderableComponentData = {
    id: 'bioluminescent-blob-1',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div></div>`,
      className: 'absolute',
      style: {
        width: '60%',
        height: '60%',
        top: '20%',
        left: '20%',
        borderRadius: '40% 60% 60% 40% / 60% 30% 70% 40%',
        background:
          'radial-gradient(ellipse at center, rgba(0, 255, 255, 0.6) 0%, rgba(138, 43, 226, 0.4) 40%, rgba(0, 0, 139, 0.2) 70%, transparent 100%)',
        filter: `blur(${40 * intensity}px)`,
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'blob-1-breathing',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration / breathingSpeed,
          mode: 'provider',
          targetIds: ['bioluminescent-blob-1'],
          ranges: [
            { key: 'scale', val: 0.8, prog: 0 },
            { key: 'scale', val: 1.2 * intensity, prog: 0.5 },
            { key: 'scale', val: 0.8, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 45, prog: 1 },
          ],
        },
      },
    ],
  };

  // Blob 2 - Purple/indigo gradient
  const blob2: RenderableComponentData = {
    id: 'bioluminescent-blob-2',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div></div>`,
      className: 'absolute',
      style: {
        width: '50%',
        height: '50%',
        top: '30%',
        left: '35%',
        borderRadius: '60% 40% 30% 70% / 40% 60% 40% 60%',
        background:
          'radial-gradient(ellipse at center, rgba(138, 43, 226, 0.7) 0%, rgba(75, 0, 130, 0.5) 50%, transparent 100%)',
        filter: `blur(${50 * intensity}px)`,
        mixBlendMode: 'color-dodge',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'blob-2-breathing',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration / (breathingSpeed * 1.2),
          mode: 'provider',
          targetIds: ['bioluminescent-blob-2'],
          ranges: [
            { key: 'scale', val: 0.9, prog: 0 },
            { key: 'scale', val: 1.1 * intensity, prog: 0.5 },
            { key: 'scale', val: 0.9, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: -30, prog: 1 },
          ],
        },
      },
    ],
  };

  // Blob 3 - Warm accent with cyan
  const blob3: RenderableComponentData = {
    id: 'bioluminescent-blob-3',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div></div>`,
      className: 'absolute',
      style: {
        width: '45%',
        height: '45%',
        top: '15%',
        left: '10%',
        borderRadius: '50% 50% 40% 60% / 30% 70% 30% 70%',
        background:
          'radial-gradient(ellipse at center, rgba(255, 200, 100, 0.3) 0%, rgba(0, 255, 255, 0.4) 40%, rgba(0, 0, 139, 0.2) 80%, transparent 100%)',
        filter: `blur(${45 * intensity}px)`,
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'blob-3-breathing',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration / (breathingSpeed * 0.8),
          mode: 'provider',
          targetIds: ['bioluminescent-blob-3'],
          ranges: [
            { key: 'scale', val: 0.85, prog: 0 },
            { key: 'scale', val: 1.15 * intensity, prog: 0.5 },
            { key: 'scale', val: 0.85, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 60, prog: 1 },
          ],
        },
      },
    ],
  };

  // Color shift layer
  const colorShiftLayer: RenderableComponentData = {
    id: 'bioluminescent-color-shift',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div></div>`,
      className: 'absolute inset-0',
      style: {
        background:
          'linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(138, 43, 226, 0.1) 50%, rgba(0, 0, 139, 0.1) 100%)',
        mixBlendMode: 'overlay',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'color-shift-hue-rotate',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration / colorShiftSpeed,
          mode: 'provider',
          targetIds: ['bioluminescent-color-shift'],
          ranges: [
            { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
            { key: 'filter', val: 'hue-rotate(360deg)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'bioluminescent-light-leak-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#050510',
        },
      },
      fitDurationTo: 'parent',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [blob1, blob2, blob3, ...particleChildren, colorShiftLayer],
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
  id: 'bioluminescent-light-leak',
  title: 'Bioluminescent Light Leak',
  description:
    'Ethereal, dreamlike light leak transition with organic bioluminescent glow effects. Features pulsing blob shapes that breathe and rotate, floating particle motes, and slow color spectrum cycling. Uses cool mystical colors (cyan, purple, deep blue) with warm accents. Creates an underwater, otherworldly atmosphere with soft glowing edges and hypnotic movements.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'light-leak',
    'bioluminescent',
    'ethereal',
    'underwater',
    'mystical',
    'breathing',
    'particles',
    'glow',
  ],
  defaultInputParams: {
    duration: 4,
    intensity: 1,
    breathingSpeed: 1,
    particleCount: 12,
    colorShiftSpeed: 1,
    enableParticles: true,
  },
  dependencies: {},
};

export const bioluminescentLightLeakPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};