/**
 * Dreamy Watercolor Text Animation Preset
 *
 * This preset creates a hypnotic watercolor text animation where words materialize
 * through soft color clouds that coalesce into readable text. Features organic watercolor
 * splashes that form into letters, gentle pulsing breathing animations, chromatic aberration
 * effects, and floating color particles.
 *
 * Key Features:
 * - Watercolor cloud formation: Abstract splashes gradually form into readable text
 * - Breathing pulse animation: Gentle 1→1.05→1 scale animation creating a breathing effect
 * - Chromatic aberration: RGB channel offsets simulating watercolor color separation
 * - Floating particles: 10-15 color specks drifting around the text
 * - Fluid movement: Hypnotic and constantly evolving with overlapping animations
 * - GPU acceleration: Uses transform: translate3d() for optimal performance
 *
 * Use Cases:
 * - Creating dreamy, artistic title sequences
 * - Poetic or melodic subtitle animations
 * - Abstract visual storytelling
 * - Music video text overlays
 * - Art-focused content presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  animationStyle: z
    .enum(['fade-blur'])
    .default('fade-blur')
    .describe('Text animation style (uses fade-blur for watercolor effect)'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  backgroundColor: z
    .string()
    .default('transparent')
    .describe('Background color behind text'),
  textShadow: z
    .string()
    .default('2px 0 0 rgba(255,0,0,0.3), -2px 0 0 rgba(0,255,255,0.3), 0 2px 20px rgba(0,0,0,0.3)')
    .describe('Text shadow with chromatic aberration effect'),
  blurDuration: z
    .number()
    .min(500)
    .max(5000)
    .default(3000)
    .describe('Duration of blur-in effect in milliseconds'),
  breathingDuration: z
    .number()
    .min(1000)
    .max(8000)
    .default(4000)
    .describe('Duration of breathing pulse animation in milliseconds'),
  particleCount: z
    .number()
    .min(5)
    .max(15)
    .default(10)
    .describe('Number of floating particles (5-15 for performance)'),
  particleDriftDuration: z
    .number()
    .min(5000)
    .max(15000)
    .default(10000)
    .describe('Duration of particle drift animation in milliseconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    animationStyle,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    backgroundColor,
    textShadow,
    blurDuration,
    breathingDuration,
    particleCount,
    particleDriftDuration,
  } = params;

  const { presets } = props;

  // Validate SubtitlesOverlay dependency
  if (!presets || !presets['SubtitlesOverlay']) {
    throw new Error('Preset dependency "SubtitlesOverlay" not found');
  }

  // Generate particle colors (watercolor palette)
  const generateParticleColor = (index: number): string => {
    const colors = [
      'rgba(255, 100, 150, 0.6)', // Pink
      'rgba(100, 200, 255, 0.5)', // Blue
      'rgba(255, 220, 100, 0.4)', // Yellow
      'rgba(200, 100, 255, 0.5)', // Purple
      'rgba(150, 255, 200, 0.6)', // Mint
      'rgba(255, 150, 100, 0.5)', // Orange
      'rgba(100, 150, 255, 0.4)', // Light blue
      'rgba(255, 200, 150, 0.6)', // Peach
      'rgba(200, 255, 100, 0.5)', // Lime
      'rgba(150, 100, 255, 0.4)', // Violet
    ];
    return colors[index % colors.length];
  };

  // Generate random position for particles
  const generateRandomPosition = (): { left: string; top: string } => {
    const left = Math.floor(Math.random() * 90) + 5; // 5% to 95%
    const top = Math.floor(Math.random() * 90) + 5;
    return { left: `${left}%`, top: `${top}%` };
  };

  // Generate random size for particles
  const generateParticleSize = (): number => {
    return Math.floor(Math.random() * 6) + 5; // 5px to 10px
  };

  // Create particle components
  const particles: RenderableComponentData[] = [];
  for (let i = 0; i < particleCount; i++) {
    const position = generateRandomPosition();
    const size = generateParticleSize();
    const color = generateParticleColor(i);
    const particleId = `watercolor-particle-${i}`;

    // Random drift animation parameters
    const driftX = (Math.random() - 0.5) * 100; // -50px to 50px
    const driftY = (Math.random() - 0.5) * 100;

    particles.push({
      id: particleId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute',
        style: {
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          backgroundColor: color,
          left: position.left,
          top: position.top,
          transform: 'translate3d(0, 0, 0)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: 15,
        },
      },
      effects: [
        {
          id: `particle-drift-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: particleDriftDuration / 1000,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: driftX, prog: 0.5 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: driftY, prog: 0.5 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Particle container
  const particleContainer: RenderableComponentData = {
    id: 'watercolor-particle-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 15,
      },
    },
    childrenData: particles,
  };

  // Call SubtitlesOverlay preset
  const subtitlesResult = await presets['SubtitlesOverlay'](
    {
      animationStyle,
      fontSize,
      fontFamily,
      fontWeight,
      textColor,
      backgroundColor,
      textShadow,
    },
    props,
  );

  // Extract subtitles container
  const subtitlesContainer =
    subtitlesResult?.output?.childrenData?.[0] || null;

  if (!subtitlesContainer) {
    throw new Error('SubtitlesOverlay did not return valid output');
  }

  // Add watercolor formation effects to text container
  const textContainerId = 'watercolor-text-container';
  const textContainer: RenderableComponentData = {
    ...subtitlesContainer,
    id: textContainerId,
    effects: [
      // Cloud formation effect: blur 20px → 0px, contrast 0.5 → 1, brightness 1.2 → 1
      {
        id: 'watercolor-formation',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: blurDuration / 1000,
          mode: 'provider',
          targetIds: [textContainerId],
          ranges: [
            { key: 'filter', val: 'blur(20px) contrast(0.5) brightness(1.2)', prog: 0 },
            { key: 'filter', val: 'blur(0px) contrast(1) brightness(1)', prog: 1 },
          ],
        },
      },
      // Breathing pulse animation: scale 1 → 1.05 → 1
      {
        id: 'watercolor-breathing',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: breathingDuration / 1000,
          mode: 'provider',
          targetIds: [textContainerId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.05, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'watercolor-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-col items-center justify-center',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 15,
      },
    },
    childrenData: [particleContainer, textContainer],
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
  id: 'watercolor-text-animation',
  title: 'Dreamy Watercolor Text Animation',
  description:
    'A hypnotic text animation where words materialize through soft watercolor clouds that coalesce into readable text. Features organic watercolor splashes that form into letters, gentle pulsing breathing animations, chromatic aberration effects, and floating color particles. The movement is fluid and constantly evolving with overlapping animations creating a dreamy aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'watercolor',
    'dreamy',
    'artistic',
    'fluid',
    'particles',
    'breathing',
    'chromatic-aberration',
    'abstract',
    'hypnotic',
  ],
  defaultInputParams: {
    animationStyle: 'fade-blur',
    fontSize: 64,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#ffffff',
    backgroundColor: 'transparent',
    textShadow:
      '2px 0 0 rgba(255,0,0,0.3), -2px 0 0 rgba(0,255,255,0.3), 0 2px 20px rgba(0,0,0,0.3)',
    blurDuration: 3000,
    breathingDuration: 4000,
    particleCount: 10,
    particleDriftDuration: 10000,
  },
  dependencies: {
    presets: ['SubtitlesOverlay'],
    helpers: [],
  },
};

export const watercolorTextAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
