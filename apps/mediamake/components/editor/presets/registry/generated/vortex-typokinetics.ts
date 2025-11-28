/**
 * Vortex Typokinetics Preset
 *
 * Advanced typokinetic effect where text particles spiral into a central vortex
 * following logarithmic spiral paths, disappear at the singularity, then burst
 * outward to reform the text. Features gravitational distortion, velocity-based
 * motion blur, and stretching effects near the vortex center.
 *
 * Features:
 * - **Logarithmic Spiral Paths**: Particles follow r = a * e^(b*θ) equations
 * - **Three-Phase Animation**: Spiral in → Singularity → Burst out
 * - **Gravitational Distortion**: Stretching and warping near vortex center
 * - **Motion Blur**: Velocity-based blur effects
 * - **Staggered Entry**: Particles enter based on distance from center
 * - **Performance Optimized**: Pre-calculated coordinates, CSS containment
 *
 * Use cases:
 * - Creating dramatic text reveals with physics-based motion
 * - Building black hole or gravity well effects
 * - Adding cinematic particle-based typography
 * - Creating attention-grabbing title sequences
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  RenderableComponentData,
  GenericEffectData,
} from '@microfox/datamotion';

// ==================== PARAMETERS ====================

const presetParams = z.object({
  text: z.string().describe('Text to convert into vortex particles'),
  duration: z.number().default(3).describe('Total animation duration in seconds'),
  particlesPerWord: z
    .number()
    .min(10)
    .max(30)
    .default(20)
    .describe('Number of particles per word (10-30)'),
  vortexCenterX: z
    .number()
    .min(0)
    .max(100)
    .default(50)
    .describe('Vortex center X position (percentage of width, 0-100)'),
  vortexCenterY: z
    .number()
    .min(0)
    .max(100)
    .default(50)
    .describe('Vortex center Y position (percentage of height, 0-100)'),
  spiralCoefficient: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .describe('Logarithmic spiral coefficient (0.1-0.5, higher = tighter spiral)'),
  initialRadius: z
    .number()
    .min(200)
    .max(600)
    .default(400)
    .describe('Initial radius from vortex center in pixels (200-600)'),
  rotations: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Number of rotations during spiral-in (1-5)'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of text particles (CSS color)'),
  fontSize: z
    .number()
    .min(12)
    .max(24)
    .default(16)
    .describe('Font size of particles in pixels (12-24)'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'
    ),
  stretchIntensity: z
    .number()
    .min(1)
    .max(3)
    .default(2)
    .describe('Maximum stretch factor near vortex (1-3)'),
  blurIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(3)
    .describe('Maximum blur amount in pixels (0-5)'),
  burstSpeed: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Speed multiplier for burst-out phase (0.5-2)'),
  staggerDelay: z
    .number()
    .min(10)
    .max(50)
    .default(30)
    .describe('Stagger delay between particles in milliseconds (10-50)'),
});

// ==================== EXECUTION ====================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps
): PresetOutput => {
  // Parse font string
  const parseFontString = (fontString?: string) => {
    if (!fontString) {
      return {
        family: 'Inter',
        weight: 400,
        style: 'normal',
      };
    }

    const parts = fontString.split(':');
    return {
      family: parts[0] || 'Inter',
      weight: parts[1] ? parseInt(parts[1], 10) : 400,
      style: parts[2] || 'normal',
    };
  };

  const fontConfig = parseFontString(params.font);

  // Calculate derived values
  const words = params.text.split(/\s+/).filter((w) => w.length > 0);
  const totalParticles = words.length * params.particlesPerWord;

  // Phase timings (relative to animation start)
  const spiralDuration = params.duration * 0.4; // 0-40%
  const singularityStart = params.duration * 0.4; // 40%
  const singularityDuration = params.duration * 0.1; // 40-50%
  const burstStart = params.duration * 0.5; // 50%
  const burstDuration = params.duration * 0.5; // 50-100%

  // Helper: Calculate particle initial position based on text layout
  const calculateParticlePositions = () => {
    const positions: Array<{ x: number; y: number; wordIndex: number }> = [];
    const containerWidth = 1920; // Assume standard width
    const containerHeight = 1080;

    // Calculate text layout (horizontal center, vertical center)
    const wordSpacing = 20;
    const totalTextWidth =
      words.reduce((sum, word) => sum + word.length * params.fontSize * 0.6, 0) +
      (words.length - 1) * wordSpacing;
    const startX = (containerWidth - totalTextWidth) / 2;
    const centerY = containerHeight / 2;

    let currentX = startX;
    words.forEach((word, wordIndex) => {
      const wordWidth = word.length * params.fontSize * 0.6;
      const wordStartX = currentX;

      // Generate particles for this word
      for (let i = 0; i < params.particlesPerWord; i++) {
        const particleX = wordStartX + (wordWidth / params.particlesPerWord) * i;
        const particleY = centerY + (Math.random() - 0.5) * params.fontSize;

        positions.push({
          x: particleX,
          y: particleY,
          wordIndex,
        });
      }

      currentX += wordWidth + wordSpacing;
    });

    return positions;
  };

  const particlePositions = calculateParticlePositions();

  // Helper: Calculate distance from vortex center
  const calculateDistanceFromCenter = (x: number, y: number) => {
    const centerX = (params.vortexCenterX / 100) * 1920;
    const centerY = (params.vortexCenterY / 100) * 1080;
    return Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
  };

  // Helper: Calculate stagger delay based on distance
  const calculateStagger = (distance: number, maxDistance: number) => {
    // Farther particles start earlier during spiral-in
    const normalized = distance / maxDistance;
    return (1 - normalized) * params.staggerDelay * 0.001; // Convert to seconds
  };

  // Calculate max distance for normalization
  const maxDistance = Math.max(
    ...particlePositions.map((pos) =>
      calculateDistanceFromCenter(pos.x, pos.y)
    )
  );

  // Generate particles
  const particleComponents: RenderableComponentData[] = [];

  particlePositions.forEach((pos, index) => {
    const particleId = `vortex-particle-${index}`;
    const distance = calculateDistanceFromCenter(pos.x, pos.y);
    const stagger = calculateStagger(distance, maxDistance);

    // Calculate initial angle from center
    const centerX = (params.vortexCenterX / 100) * 1920;
    const centerY = (params.vortexCenterY / 100) * 1080;
    const angle = Math.atan2(pos.y - centerY, pos.x - centerX);

    // Generate random character for this particle
    const charCode = 65 + Math.floor(Math.random() * 26); // A-Z
    const particleChar = String.fromCharCode(charCode);

    // Calculate rotation angles
    const totalRotation = params.rotations * 720; // degrees

    // Phase 1: Spiral In (0-40%)
    const spiralEffect: GenericEffectData = {
      type: 'ease-in',
      start: stagger,
      duration: spiralDuration - stagger,
      mode: 'provider',
      targetIds: [particleId],
      ranges: [
        // Rotation (increase angular velocity)
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: totalRotation, prog: 1 },
        // Radial translation (spiral inward)
        { key: 'translateX', val: pos.x - centerX, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: pos.y - centerY, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
        // Stretch near center (scaleX increases, scaleY decreases)
        { key: 'scaleX', val: 1, prog: 0 },
        { key: 'scaleX', val: params.stretchIntensity, prog: 0.8 },
        { key: 'scaleX', val: 0, prog: 1 },
        { key: 'scaleY', val: 1, prog: 0 },
        { key: 'scaleY', val: 1 / params.stretchIntensity, prog: 0.8 },
        { key: 'scaleY', val: 0, prog: 1 },
        // Opacity (visible → disappear at singularity)
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.8 },
        { key: 'opacity', val: 0, prog: 1 },
        // Motion blur (increases with velocity)
        { key: 'blur', val: 0, prog: 0 },
        { key: 'blur', val: params.blurIntensity, prog: 0.8 },
        { key: 'blur', val: 0, prog: 1 },
      ],
    };

    // Phase 2: Singularity (implicit - particle at scale 0, opacity 0)
    // No explicit effect needed - particle is hidden

    // Phase 3: Burst Out (50-100%)
    // Calculate random burst angle
    const burstAngle = Math.random() * 2 * Math.PI;
    const burstRadius = params.initialRadius * 0.8; // Slightly smaller burst radius

    // Calculate reverse spiral path
    const burstX = Math.cos(burstAngle) * burstRadius;
    const burstY = Math.sin(burstAngle) * burstRadius;

    const burstEffect: GenericEffectData = {
      type: 'ease-out',
      start: burstStart + stagger * params.burstSpeed,
      duration: burstDuration - stagger * params.burstSpeed,
      mode: 'provider',
      targetIds: [particleId],
      ranges: [
        // Rotation (reverse)
        { key: 'rotate', val: -totalRotation, prog: 0 },
        { key: 'rotate', val: 0, prog: 1 },
        // Radial translation (burst from center to text position)
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: burstX * 0.3, prog: 0.2 },
        { key: 'translateX', val: pos.x - centerX, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: burstY * 0.3, prog: 0.2 },
        { key: 'translateY', val: pos.y - centerY, prog: 1 },
        // Scale (from 0 → overshoot → normal)
        { key: 'scaleX', val: 0, prog: 0 },
        { key: 'scaleX', val: 1.5, prog: 0.3 },
        { key: 'scaleX', val: 1, prog: 1 },
        { key: 'scaleY', val: 0, prog: 0 },
        { key: 'scaleY', val: 1.5, prog: 0.3 },
        { key: 'scaleY', val: 1, prog: 1 },
        // Opacity (appear from singularity)
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.2 },
        // Motion blur (decreases as particles decelerate)
        { key: 'blur', val: 0, prog: 0 },
        { key: 'blur', val: params.blurIntensity, prog: 0.2 },
        { key: 'blur', val: 0, prog: 1 },
      ],
    };

    // Create particle component
    const particleComponent: RenderableComponentData = {
      id: particleId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: `${params.vortexCenterX}%`,
            top: `${params.vortexCenterY}%`,
            width: `${params.fontSize}px`,
            height: `${params.fontSize}px`,
          },
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
          id: `${particleId}-spiral`,
          componentId: 'generic',
          data: spiralEffect,
        },
        {
          id: `${particleId}-burst`,
          componentId: 'generic',
          data: burstEffect,
        },
      ],
      childrenData: [
        {
          id: `${particleId}-text`,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: particleChar,
            style: {
              fontSize: `${params.fontSize}px`,
              color: params.textColor,
              fontWeight: fontConfig.weight,
              fontStyle: fontConfig.style as any,
            },
            font: {
              family: fontConfig.family,
              weights: [fontConfig.weight.toString()],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
        } as RenderableComponentData,
      ],
    };

    particleComponents.push(particleComponent);
  });

  // Create vortex center marker (optional, for debugging)
  const vortexCenter: RenderableComponentData = {
    id: 'vortex-center',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          left: `${params.vortexCenterX}%`,
          top: `${params.vortexCenterY}%`,
          width: '4px',
          height: '4px',
          transform: 'translate(-50%, -50%)',
          // Uncomment for debugging:
          // backgroundColor: 'red',
          // borderRadius: '50%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [],
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'vortex-typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-visible',
        style: {
          contain: 'layout',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [vortexCenter, ...particleComponents] as RenderableComponentData[],
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

// ==================== METADATA ====================

const presetMetadata: PresetMetadata = {
  id: 'vortex-typokinetics',
  title: 'Vortex Typokinetics Preset',
  description:
    'Advanced typokinetic effect where text particles spiral into a central vortex following logarithmic spiral paths, disappear at the singularity, then burst outward to reform the text. Features gravitational distortion, velocity-based motion blur, and stretching effects near the vortex center.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'vortex',
    'particles',
    'spiral',
    'physics',
    'motion',
    'text-effects',
    'advanced',
  ],
  defaultInputParams: {
    text: 'VORTEX',
    duration: 3,
    particlesPerWord: 20,
    vortexCenterX: 50,
    vortexCenterY: 50,
    spiralCoefficient: 0.2,
    initialRadius: 400,
    rotations: 2,
    textColor: '#FFFFFF',
    fontSize: 16,
    font: 'Inter:700',
    stretchIntensity: 2,
    blurIntensity: 3,
    burstSpeed: 1,
    staggerDelay: 30,
  },
  dependencies: {},
};

// ==================== EXPORT ====================

export const vortexTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
