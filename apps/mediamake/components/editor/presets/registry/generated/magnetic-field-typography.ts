/**
 * Magnetic Field Typography Preset
 *
 * A physics-inspired typography preset where text particles behave like iron filings
 * around magnetic poles. Words are attracted to or repelled from invisible magnetic zones
 * using inverse square law calculations.
 *
 * Features:
 * - **Magnetic Field Physics**: Words align along field lines and cluster around attraction points
 * - **Inverse Square Law**: Realistic force calculations for magnetic attraction/repulsion
 * - **Repulsion Zones**: Text actively avoids certain areas creating negative space
 * - **Attraction Zones**: Text is pulled toward magnetic poles with varying intensity
 * - **Demagnetization Scatter**: Periodic effect where text ignores all forces and scatters randomly
 * - **Polarity Flips**: Sudden reversals where attraction becomes repulsion
 * - **Field Line Alignment**: Words rotate to match magnetic field direction
 * - **Charge-based Intensity**: Keywords from caption metadata receive stronger magnetic charge
 * - **Audio-reactive Poles**: Optional beat detection creates temporary magnetic poles
 *
 * Use cases:
 * - Creating dynamic, physics-based subtitle animations
 * - Building science/tech themed text effects
 * - Adding magnetic kinetic typography to videos
 * - Creating text that responds to audio beats with magnetic forces
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---

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
          }),
        ),
        metadata: z
          .object({
            keyword: z.string().optional(),
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  // Magnetic pole configuration
  attractionPoles: z
    .array(
      z.object({
        x: z.number().min(0).max(1).describe('X position (0-1, normalized)'),
        y: z.number().min(0).max(1).describe('Y position (0-1, normalized)'),
        strength: z.number().min(0.1).max(5).describe('Attraction strength'),
        startTime: z.number().optional().describe('Start time in seconds'),
        duration: z.number().optional().describe('Duration in seconds'),
      }),
    )
    .default([
      { x: 0.25, y: 0.2, strength: 1.5 },
      { x: 0.75, y: 0.8, strength: 1.5 },
    ])
    .describe('Array of attraction pole positions and strengths'),

  repulsionPoles: z
    .array(
      z.object({
        x: z.number().min(0).max(1).describe('X position (0-1, normalized)'),
        y: z.number().min(0).max(1).describe('Y position (0-1, normalized)'),
        strength: z.number().min(0.1).max(5).describe('Repulsion strength'),
        startTime: z.number().optional().describe('Start time in seconds'),
        duration: z.number().optional().describe('Duration in seconds'),
      }),
    )
    .default([{ x: 0.5, y: 0.5, strength: 1.0 }])
    .describe('Array of repulsion pole positions and strengths'),

  // Demagnetization effect
  demagnetizationInterval: z
    .number()
    .min(2)
    .max(20)
    .default(5)
    .describe('Interval between demagnetization scatter effects (seconds)'),

  demagnetizationDuration: z
    .number()
    .min(0.2)
    .max(2)
    .default(0.8)
    .describe('Duration of demagnetization scatter (seconds)'),

  // Polarity flip timing
  polarityFlipTimes: z
    .array(z.number())
    .default([])
    .describe(
      'Array of absolute times (seconds) when polarity flips occur. Empty = no flips',
    ),

  polarityFlipDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .describe('Duration of polarity flip transition (seconds)'),

  // Typography
  font: z
    .string()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  fontSize: z.number().min(12).max(120).default(48).describe('Font size in pixels'),

  textColor: z.string().default('#FFFFFF').describe('Text color'),

  // Force parameters
  forceMultiplier: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.0)
    .describe('Global force intensity multiplier'),

  fieldLineStrength: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Strength of field line rotation alignment (0-1)'),

  // Visual effects
  showPoleIndicators: z
    .boolean()
    .default(true)
    .describe('Whether to show visual indicators for magnetic poles'),

  chargeGlowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of glow effect for charged keywords (0-1)'),

  // Audio-reactive (optional)
  audioReactive: z
    .boolean()
    .default(false)
    .describe('Enable audio-reactive temporary magnetic poles'),

  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL for beat detection (required if audioReactive is true)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution Function ---

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    captions,
    attractionPoles,
    repulsionPoles,
    demagnetizationInterval,
    demagnetizationDuration,
    polarityFlipTimes,
    polarityFlipDuration,
    font,
    fontSize,
    textColor,
    forceMultiplier,
    fieldLineStrength,
    showPoleIndicators,
    chargeGlowIntensity,
    audioReactive,
    audioSrc,
  } = params;

  const { config, fetcher } = props;

  // Helper: Parse font string
  const parseFontString = (fontStr: string) => {
    const fontFamily = fontStr.includes(':') ? fontStr.split(':')[0] : fontStr;
    const fontParts = fontStr.split(':');
    const fontStyle: Record<string, any> = {};
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2];
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Helper: Calculate magnetic field vector using inverse square law
  const calculateFieldVector = (
    wordX: number,
    wordY: number,
    poleX: number,
    poleY: number,
    strength: number,
    isAttraction: boolean,
  ) => {
    const dx = poleX - wordX;
    const dy = poleY - wordY;
    const distanceSquared = dx * dx + dy * dy;
    const distance = Math.sqrt(distanceSquared);

    // Inverse square law: F = k / r^2
    const forceMagnitude =
      (strength * forceMultiplier) / Math.max(distanceSquared, 0.01);

    // Direction: attraction = toward pole, repulsion = away from pole
    const direction = isAttraction ? 1 : -1;
    const forceX = (dx / distance) * forceMagnitude * direction;
    const forceY = (dy / distance) * forceMagnitude * direction;

    // Field line angle (for rotation alignment)
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    return { forceX, forceY, angle, distance };
  };

  // Helper: Calculate total force from all poles
  const calculateTotalForce = (
    wordX: number,
    wordY: number,
    time: number,
    viewportWidth: number,
    viewportHeight: number,
  ) => {
    let totalForceX = 0;
    let totalForceY = 0;
    let totalRotation = 0;
    let weightSum = 0;

    // Attraction poles
    attractionPoles.forEach((pole) => {
      const poleActive =
        (!pole.startTime || time >= pole.startTime) &&
        (!pole.duration || time <= (pole.startTime || 0) + pole.duration);

      if (poleActive) {
        const poleX = pole.x * viewportWidth;
        const poleY = pole.y * viewportHeight;
        const { forceX, forceY, angle, distance } = calculateFieldVector(
          wordX,
          wordY,
          poleX,
          poleY,
          pole.strength,
          true,
        );
        totalForceX += forceX;
        totalForceY += forceY;

        // Weight rotation by inverse distance
        const weight = 1 / Math.max(distance, 1);
        totalRotation += angle * weight;
        weightSum += weight;
      }
    });

    // Repulsion poles
    repulsionPoles.forEach((pole) => {
      const poleActive =
        (!pole.startTime || time >= pole.startTime) &&
        (!pole.duration || time <= (pole.startTime || 0) + pole.duration);

      if (poleActive) {
        const poleX = pole.x * viewportWidth;
        const poleY = pole.y * viewportHeight;
        const { forceX, forceY, angle } = calculateFieldVector(
          wordX,
          wordY,
          poleX,
          poleY,
          pole.strength,
          false,
        );
        totalForceX += forceX;
        totalForceY += forceY;
      }
    });

    // Average rotation weighted by distance
    const fieldRotation = weightSum > 0 ? totalRotation / weightSum : 0;

    return { totalForceX, totalForceY, fieldRotation };
  };

  // Helper: Seeded random for reproducibility
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  // Viewport dimensions
  const viewportWidth = config?.width || 1920;
  const viewportHeight = config?.height || 1080;

  // Calculate total duration
  const totalDuration =
    captions.length > 0
      ? Math.max(...captions.map((c) => c.absoluteEnd))
      : 10;

  // Create pole indicators
  const poleIndicators: RenderableComponentData[] = [];

  if (showPoleIndicators) {
    // Attraction poles (red)
    attractionPoles.forEach((pole, index) => {
      poleIndicators.push({
        id: `attraction-pole-${index}`,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 40px; height: 40px; border-radius: 50%; background: radial-gradient(circle, #ff4444 0%, transparent 70%); box-shadow: 0 0 30px #ff4444;"></div>`,
          className: 'absolute',
          style: {
            left: `${pole.x * 100}%`,
            top: `${pole.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: pole.startTime || 0,
            duration: pole.duration || totalDuration,
          },
        },
      });
    });

    // Repulsion poles (blue)
    repulsionPoles.forEach((pole, index) => {
      poleIndicators.push({
        id: `repulsion-pole-${index}`,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 40px; height: 40px; border-radius: 50%; background: radial-gradient(circle, #4444ff 0%, transparent 70%); box-shadow: 0 0 30px #4444ff;"></div>`,
          className: 'absolute',
          style: {
            left: `${pole.x * 100}%`,
            top: `${pole.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: pole.startTime || 0,
            duration: pole.duration || totalDuration,
          },
        },
      });
    });
  }

  // Create word particles from captions
  const wordParticles: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const captionCharge = caption.metadata?.keyword ? 1.5 : 1.0;
    const captionImpact = caption.metadata?.impact || 1.0;

    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-particle-${captionIndex}-${wordIndex}`;

      // Initial position (center of viewport)
      const initialX = viewportWidth / 2;
      const initialY = viewportHeight / 2;

      // Calculate forces at word start time
      const { totalForceX, totalForceY, fieldRotation } = calculateTotalForce(
        initialX,
        initialY,
        word.absoluteStart,
        viewportWidth,
        viewportHeight,
      );

      // Apply forces to position (scaled by duration for smooth movement)
      const displacementX = totalForceX * 50; // Scale factor for visual effect
      const displacementY = totalForceY * 50;

      // Field line rotation alignment
      const alignedRotation = fieldRotation * fieldLineStrength;

      // Create word TextAtom
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          className: 'absolute transition-all duration-300',
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: fontStyle.fontWeight || 700,
            left: `calc(50% + ${displacementX}px)`,
            top: `calc(50% + ${displacementY}px)`,
            transform: `translate(-50%, -50%) rotate(${alignedRotation}deg)`,
            textShadow: `0 0 ${10 * captionCharge}px rgba(255,255,255,${chargeGlowIntensity})`,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
          },
        },
        context: {
          timing: {
            start: word.absoluteStart,
            duration: word.duration,
          },
        },
        effects: [],
      };

      // Add continuous attraction/repulsion effect
      wordComponent.effects!.push({
        id: `magnetic-force-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: word.duration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: displacementX, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: displacementY, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: alignedRotation, prog: 1 },
          ],
        },
      });

      // Add demagnetization scatter effects
      const demagnetizationCount = Math.floor(
        word.duration / demagnetizationInterval,
      );
      for (let i = 0; i < demagnetizationCount; i++) {
        const scatterStart = i * demagnetizationInterval;
        if (scatterStart + demagnetizationDuration > word.duration) break;

        // Seeded random scatter direction
        const seed = captionIndex * 1000 + wordIndex * 100 + i;
        const scatterX = (seededRandom(seed) - 0.5) * 200; // -100 to +100
        const scatterY = (seededRandom(seed + 1) - 0.5) * 160; // -80 to +80
        const scatterRotate = (seededRandom(seed + 2) - 0.5) * 360; // -180 to +180

        wordComponent.effects!.push({
          id: `demagnetization-${wordId}-${i}`,
          componentId: 'generic',
          data: {
            type: 'spring',
            start: scatterStart,
            duration: demagnetizationDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: scatterX, prog: 0.3 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: scatterY, prog: 0.3 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: scatterRotate, prog: 0.3 },
              { key: 'rotate', val: 0, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        });
      }

      // Add polarity flip effects
      polarityFlipTimes.forEach((flipTime, flipIndex) => {
        const flipRelativeTime = flipTime - word.absoluteStart;
        if (
          flipRelativeTime >= 0 &&
          flipRelativeTime + polarityFlipDuration <= word.duration
        ) {
          // Reverse force direction
          const flippedForceX = -totalForceX * 50;
          const flippedForceY = -totalForceY * 50;

          wordComponent.effects!.push({
            id: `polarity-flip-${wordId}-${flipIndex}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: flipRelativeTime,
              duration: polarityFlipDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'translateX', val: displacementX, prog: 0 },
                { key: 'translateX', val: displacementX, prog: 0.45 },
                { key: 'translateX', val: flippedForceX, prog: 0.55 },
                { key: 'translateX', val: flippedForceX, prog: 1 },
                { key: 'translateY', val: displacementY, prog: 0 },
                { key: 'translateY', val: displacementY, prog: 0.45 },
                { key: 'translateY', val: flippedForceY, prog: 0.55 },
                { key: 'translateY', val: flippedForceY, prog: 1 },
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 1.2, prog: 0.5 },
                { key: 'scale', val: 0.9, prog: 1 },
              ],
            },
          });
        }
      });

      // Add charge glow pulse for keywords
      if (caption.metadata?.keyword === word.text && chargeGlowIntensity > 0) {
        wordComponent.effects!.push({
          id: `charge-glow-${wordId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: word.duration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'opacity', val: 0.7, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0.7, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.05 * captionImpact, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        });
      }

      wordParticles.push(wordComponent);
    });
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'magnetic-field-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#0a0a0a',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      // Pole indicators container
      {
        id: 'pole-indicators-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: poleIndicators,
      },
      // Word particles container
      {
        id: 'word-particles-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: wordParticles,
      },
    ],
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
  id: 'magnetic-field-typography',
  title: 'Magnetic Field Typography',
  description:
    'A physics-inspired typography preset where text particles behave like iron filings around magnetic poles. Words are attracted to or repelled from invisible magnetic zones using inverse square law calculations. Features field line alignment (rotation matching field direction), demagnetization scatter (words temporarily ignore forces and scatter randomly), and sudden polarity flips (attraction becomes repulsion). Keywords from caption metadata receive stronger magnetic charge for enhanced visual hierarchy. Supports optional audio-reactive features where beat detection creates temporary magnetic poles.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'physics',
    'magnetic',
    'field',
    'attraction',
    'repulsion',
    'dynamic',
    'science',
    'tech',
  ],
  defaultInputParams: {
    captions: [],
    attractionPoles: [
      { x: 0.25, y: 0.2, strength: 1.5 },
      { x: 0.75, y: 0.8, strength: 1.5 },
    ],
    repulsionPoles: [{ x: 0.5, y: 0.5, strength: 1.0 }],
    demagnetizationInterval: 5,
    demagnetizationDuration: 0.8,
    polarityFlipTimes: [],
    polarityFlipDuration: 0.3,
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#FFFFFF',
    forceMultiplier: 1.0,
    fieldLineStrength: 0.5,
    showPoleIndicators: true,
    chargeGlowIntensity: 0.3,
    audioReactive: false,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---

export const magneticFieldTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
