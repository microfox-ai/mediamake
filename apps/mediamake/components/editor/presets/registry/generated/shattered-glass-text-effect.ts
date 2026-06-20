/**
 * Shattered Glass Text Effect Preset
 *
 * This preset creates a high-impact shattered glass text effect where words appear whole,
 * then fracture into sharp angular pieces that fly apart with realistic physics. The effect
 * mimics slow-motion footage of breaking glass with crystalline shimmer effects.
 *
 * Features:
 * - **Fracture Line Overlay**: SVG crack lines appear first, creating the breaking pattern
 * - **Fragmented Text**: Text duplicated into 5-6 polygonal fragments using clip-path masks
 * - **Physics-Based Motion**: Larger fragments move slower, smaller shards faster
 * - **Crystalline Shimmer**: Opacity flickers and color shifts during break
 * - **3D Tumbling**: Fragments separate with translateX/Y/Z and rotateX/Y/Z transforms
 * - **Staggered Animation**: Fragments animate with 50ms cascade delay
 *
 * Use cases:
 * - High-impact title reveals for tech content
 * - Dramatic text transitions for music videos
 * - Edgy intros for gaming or action content
 * - Social media attention-grabbing text effects
 * - Creative typography for modern brands
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z.string().default('SHATTER').describe('Text to display and shatter'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total duration of the effect in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(300)
    .default(96)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:900", "Roboto:700")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color in hex format'),
  fragmentCount: z
    .number()
    .min(4)
    .max(6)
    .default(5)
    .describe('Number of fragments to create (4-6 for performance)'),
  crackDuration: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.4)
    .describe(
      'Duration of crack formation phase as percentage of total (0-1)',
    ),
  pauseDuration: z
    .number()
    .min(0)
    .max(0.3)
    .default(0.1)
    .describe('Brief pause duration before shattering (0-0.3)'),
  shimmerIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity of crystalline shimmer effect (0-2)'),
  physicsSensitivity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe(
      'Physics sensitivity multiplier - higher values increase movement speed',
    ),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font family and weight
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    let fontWeight = 900;
    if (fontString.includes(':')) {
      const parts = fontString.split(':');
      if (parts.length > 1) {
        fontWeight = parseInt(parts[1], 10) || 900;
      }
    }
    return { fontFamily, fontWeight };
  };

  const { fontFamily, fontWeight } = parseFontString(params.fontFamily);

  // Calculate phase timings (relative to container start)
  const crackPhaseEnd = params.duration * params.crackDuration;
  const pausePhaseEnd = crackPhaseEnd + params.pauseDuration;
  const shatterPhaseStart = pausePhaseEnd;
  const shatterPhaseDuration = params.duration - shatterPhaseStart;

  // Fragment clip-path definitions (5 angular polygonal shapes)
  const fragmentClipPaths = [
    'polygon(0% 0%, 50% 0%, 25% 100%, 0% 100%)', // Left large fragment
    'polygon(50% 0%, 100% 0%, 100% 50%, 75% 100%, 25% 100%)', // Top-right large fragment
    'polygon(100% 50%, 100% 100%, 75% 100%)', // Bottom-right small shard
    'polygon(0% 50%, 25% 100%, 0% 100%)', // Bottom-left small shard
    'polygon(0% 50%, 50% 0%, 100% 50%)', // Top center shard
  ];

  // Take only the requested number of fragments
  const selectedClipPaths = fragmentClipPaths.slice(0, params.fragmentCount);

  // Fragment physics data (size estimates for physics)
  // Larger fragments = slower movement, smaller shards = faster
  const fragmentSizes = [0.8, 1.0, 0.3, 0.3, 0.5]; // Relative sizes
  const selectedSizes = fragmentSizes.slice(0, params.fragmentCount);

  // Create fragment components with physics-based effects
  const createFragmentEffect = (
    fragmentIndex: number,
    fragmentSize: number,
  ): GenericEffectData[] => {
    const effects: GenericEffectData[] = [];

    // Stagger delay (50ms = 0.05s per fragment)
    const staggerDelay = fragmentIndex * 0.05;

    // Physics calculations
    const sizeMultiplier = 1 / fragmentSize; // Smaller = faster
    const baseSpeed = 150 * params.physicsSensitivity;
    const translateDistance = baseSpeed * sizeMultiplier;
    const rotationRange = 360 * sizeMultiplier;

    // Random direction for each fragment
    const randomAngle = (fragmentIndex * 137.5) % 360; // Golden angle distribution
    const radians = (randomAngle * Math.PI) / 180;
    const translateX = Math.cos(radians) * translateDistance;
    const translateY = Math.sin(radians) * translateDistance;
    const translateZ = -100 * sizeMultiplier;

    // Random rotation axes
    const rotateX = (fragmentIndex * 73) % rotationRange - rotationRange / 2;
    const rotateY = (fragmentIndex * 97) % rotationRange - rotationRange / 2;
    const rotateZ = (fragmentIndex * 113) % rotationRange - rotationRange / 2;

    // Scale based on size (larger fragments scale less)
    const minScale = fragmentSize > 0.5 ? 0.8 : 0.3;

    // Phase 1: Vibration effect during pause (20-30%)
    if (params.pauseDuration > 0) {
      effects.push({
        type: 'linear',
        start: crackPhaseEnd + staggerDelay,
        duration: params.pauseDuration,
        mode: 'provider',
        targetIds: [`fragment-${fragmentIndex}`],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: 2, prog: 0.25 },
          { key: 'translateX', val: -2, prog: 0.5 },
          { key: 'translateX', val: 2, prog: 0.75 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      } as GenericEffectData);
    }

    // Phase 2: Main shatter effect (30-100%)
    effects.push({
      type: 'ease-out',
      start: shatterPhaseStart + staggerDelay,
      duration: shatterPhaseDuration,
      mode: 'provider',
      targetIds: [`fragment-${fragmentIndex}`],
      ranges: [
        // Translation (flying apart)
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: translateX, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: translateY, prog: 1 },
        { key: 'translateZ', val: 0, prog: 0 },
        { key: 'translateZ', val: translateZ, prog: 1 },
        // Rotation (tumbling)
        { key: 'rotateX', val: 0, prog: 0 },
        { key: 'rotateX', val: rotateX, prog: 1 },
        { key: 'rotateY', val: 0, prog: 0 },
        { key: 'rotateY', val: rotateY, prog: 1 },
        { key: 'rotateZ', val: 0, prog: 0 },
        { key: 'rotateZ', val: rotateZ, prog: 1 },
        // Scale (shrinking as they fly away)
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: minScale, prog: 1 },
        // Opacity fade out
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    } as GenericEffectData);

    // Phase 3: Crystalline shimmer (opacity flickers and brightness)
    if (params.shimmerIntensity > 0) {
      effects.push({
        type: 'linear',
        start: shatterPhaseStart + staggerDelay,
        duration: shatterPhaseDuration * 0.4, // Shimmer in first 40% of shatter
        mode: 'provider',
        targetIds: [`fragment-${fragmentIndex}`],
        ranges: [
          // Brightness shimmer
          {
            key: 'brightness',
            val: 1,
            prog: 0,
          },
          {
            key: 'brightness',
            val: 1 + 0.5 * params.shimmerIntensity,
            prog: 0.2,
          },
          {
            key: 'brightness',
            val: 1,
            prog: 0.4,
          },
          {
            key: 'brightness',
            val: 1 + 0.3 * params.shimmerIntensity,
            prog: 0.6,
          },
          {
            key: 'brightness',
            val: 1,
            prog: 1,
          },
          // Hue rotate for color shift
          { key: 'hueRotate', val: 0, prog: 0 },
          {
            key: 'hueRotate',
            val: 30 * params.shimmerIntensity,
            prog: 0.5,
          },
          { key: 'hueRotate', val: 0, prog: 1 },
        ],
      } as GenericEffectData);
    }

    return effects;
  };

  // Create fragment components
  const fragmentComponents: RenderableComponentData[] = selectedClipPaths.map(
    (clipPath, index) => {
      const fragmentId = `fragment-${index}`;
      const fragmentSize = selectedSizes[index];
      const fragmentEffects = createFragmentEffect(index, fragmentSize);

      return {
        id: fragmentId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: params.text,
          style: {
            fontSize: params.fontSize,
            fontWeight: fontWeight,
            color: params.textColor,
            clipPath: clipPath,
            WebkitClipPath: clipPath,
            position: 'absolute' as const,
            top: 0,
            left: 0,
          },
          font: {
            family: fontFamily,
            weights: [fontWeight.toString()],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: fragmentEffects.map((effectData, effectIndex) => ({
          id: `effect-${fragmentId}-${effectIndex}`,
          componentId: 'generic',
          data: effectData,
        })),
      } as RenderableComponentData;
    },
  );

  // Create fracture lines overlay (SVG)
  const fractureLinesSvg = `
    <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0; pointer-events: none;">
      <line x1="50%" y1="0%" x2="25%" y2="100%" stroke="white" stroke-width="2" opacity="0.8"/>
      <line x1="50%" y1="0%" x2="75%" y2="100%" stroke="white" stroke-width="2" opacity="0.8"/>
      <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="white" stroke-width="2" opacity="0.8"/>
      <line x1="25%" y1="100%" x2="75%" y2="100%" stroke="white" stroke-width="2" opacity="0.8"/>
    </svg>
  `;

  const fractureOverlay: RenderableComponentData = {
    id: 'fracture-lines-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; pointer-events: none;">${fractureLinesSvg}</div>`,
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
        id: 'fracture-lines-fade',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: crackPhaseEnd,
          mode: 'provider',
          targetIds: ['fracture-lines-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      },
      {
        id: 'fracture-lines-fade-out',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: crackPhaseEnd,
          duration: params.duration - crackPhaseEnd,
          mode: 'provider',
          targetIds: ['fracture-lines-overlay'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Root container with 3D transform support
  const rootContainer: RenderableComponentData = {
    id: 'shattered-glass-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      {
        id: 'text-wrapper',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              transformStyle: 'preserve-3d' as const,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: [fractureOverlay, ...fragmentComponents],
      } as RenderableComponentData,
    ],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'shattered-glass-text-effect',
  title: 'Shattered Glass Text Effect',
  description:
    'High-impact text effect where words appear whole then fracture into sharp angular fragments that fly apart with realistic physics. Features crystalline shimmer effects, crack formation overlays, and staggered fragment animations with 3D tumbling motion. Each text element is duplicated into 5-6 polygonal fragments using clip-path masks that separate along fracture lines with physics-based movement - larger pieces move slower, smaller shards faster.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'shatter',
    'glass',
    'break',
    'fracture',
    '3d',
    'physics',
    'dramatic',
    'kinetic',
  ],
  defaultInputParams: {
    text: 'SHATTER',
    duration: 3,
    fontSize: 96,
    fontFamily: 'Inter:900',
    textColor: '#ffffff',
    fragmentCount: 5,
    crackDuration: 0.4,
    pauseDuration: 0.1,
    shimmerIntensity: 1,
    physicsSensitivity: 1,
  },
  dependencies: {},
};

export const shatteredGlassTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
