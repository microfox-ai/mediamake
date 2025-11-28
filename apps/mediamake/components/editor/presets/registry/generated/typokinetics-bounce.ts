/**
 * Typokinetics Bouncing Word Preset
 *
 * This preset creates a physics-based bouncing word animation with realistic
 * deformation, energy loss, and classic animation principles applied to typography.
 *
 * Features:
 * - **Physics-Based Motion**: Gravity, momentum, and realistic bouncing
 * - **Squash-and-Stretch**: Deformation on impact with elastic recovery
 * - **Energy Loss**: Each bounce reduces height by 70%
 * - **Rolling Motion**: Rotation based on horizontal travel distance
 * - **Dynamic Shadow**: Shadow scales with word height from ground
 * - **Wobble Effect**: Post-impact oscillations simulating elasticity
 * - **Classic Animation**: Follows traditional animation principles
 *
 * Use cases:
 * - Creating dynamic typography animations
 * - Adding playful motion to titles and text
 * - Building physics-based text effects
 * - Creating engaging social media content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  word: z.string().default('BOUNCE').describe('The word to animate'),
  fontSize: z
    .number()
    .default(80)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter:700')
    .describe('Font family with optional weight (e.g., "Inter:700")'),
  textColor: z.string().default('#FFFFFF').describe('Text color'),
  duration: z
    .number()
    .default(6)
    .describe('Total animation duration in seconds'),
  bounceCount: z
    .number()
    .default(3)
    .describe('Number of bounces before settling'),
  energyLoss: z
    .number()
    .default(0.7)
    .describe('Energy retention per bounce (0.7 = 70% height retained)'),
  initialVelocityX: z
    .number()
    .default(20)
    .describe('Initial horizontal velocity'),
  initialVelocityY: z
    .number()
    .default(-80)
    .describe('Initial vertical velocity (negative = upward)'),
  gravity: z.number().default(60).describe('Gravity acceleration'),
  squashIntensity: z
    .number()
    .default(0.3)
    .describe('Squash deformation intensity (0-1)'),
  wobbleIntensity: z
    .number()
    .default(0.05)
    .describe('Wobble oscillation intensity'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.fontFamily || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontWeight = fontString.includes(':')
    ? parseInt(fontString.split(':')[1], 10)
    : 700;

  const wordId = 'bouncing-word';
  const shadowId = 'ground-shadow';

  // Physics calculation helper
  const calculateBouncePhysics = () => {
    const phases: Array<{
      start: number;
      duration: number;
      startY: number;
      endY: number;
      startX: number;
      endX: number;
      rotation: number;
      scaleY: number[];
    }> = [];

    let currentTime = 0;
    let velocityY = params.initialVelocityY;
    let positionY = -80; // Start at top-left
    let positionX = -40;
    let totalRotation = 0;

    const timeStep = 0.016; // ~60fps
    const bounceHeight = 60; // Ground level

    for (let bounce = 0; bounce < params.bounceCount; bounce++) {
      // Calculate fall duration using physics: t = sqrt(2h/g)
      const fallHeight = Math.abs(positionY - bounceHeight);
      const fallDuration = Math.sqrt((2 * fallHeight) / params.gravity);

      // Fall phase
      const fallStartY = positionY;
      const fallEndY = bounceHeight;
      const fallStartX = positionX;
      const horizontalDistance = params.initialVelocityX * fallDuration;
      const fallEndX = positionX + horizontalDistance;

      // Rotation based on horizontal travel
      const rotationDelta = (horizontalDistance / params.fontSize) * 180;
      totalRotation += rotationDelta;

      phases.push({
        start: currentTime,
        duration: fallDuration,
        startY: fallStartY,
        endY: fallEndY,
        startX: fallStartX,
        endX: fallEndX,
        rotation: totalRotation,
        scaleY: [1, 1], // Normal during fall
      });

      currentTime += fallDuration;

      // Squash phase (impact)
      const squashDuration = 0.1;
      const squashScaleY = 1 - params.squashIntensity;
      phases.push({
        start: currentTime,
        duration: squashDuration,
        startY: fallEndY,
        endY: fallEndY,
        startX: fallEndX,
        endX: fallEndX,
        rotation: totalRotation,
        scaleY: [1, squashScaleY, 1.2, 1], // Squash -> stretch -> normal
      });

      currentTime += squashDuration;

      // Wobble phase (elasticity)
      const wobbleDuration = 0.2;
      phases.push({
        start: currentTime,
        duration: wobbleDuration,
        startY: fallEndY,
        endY: fallEndY,
        startX: fallEndX,
        endX: fallEndX,
        rotation: totalRotation,
        scaleY: [
          1,
          1 + params.wobbleIntensity,
          1 - params.wobbleIntensity,
          1,
        ],
      });

      currentTime += wobbleDuration;

      // Calculate next bounce velocity (energy loss)
      velocityY = velocityY * params.energyLoss;
      const riseHeight = (velocityY * velocityY) / (2 * params.gravity);
      positionY = bounceHeight - riseHeight;
      positionX = fallEndX;

      // Stop if bounce is too small
      if (riseHeight < 5) break;

      // Rise phase
      const riseDuration = Math.abs(velocityY) / params.gravity;
      const riseStartX = positionX;
      const riseHorizontalDistance = params.initialVelocityX * riseDuration;
      const riseEndX = positionX + riseHorizontalDistance;
      const riseRotationDelta = (riseHorizontalDistance / params.fontSize) * 180;
      totalRotation += riseRotationDelta;

      phases.push({
        start: currentTime,
        duration: riseDuration,
        startY: bounceHeight,
        endY: positionY,
        startX: riseStartX,
        endX: riseEndX,
        rotation: totalRotation,
        scaleY: [1, 1], // Normal during rise
      });

      currentTime += riseDuration;
    }

    // Final roll-off phase
    const rollOffDuration = params.duration - currentTime;
    if (rollOffDuration > 0) {
      const rollOffDistance = params.initialVelocityX * rollOffDuration;
      const rollOffRotation = (rollOffDistance / params.fontSize) * 180;
      totalRotation += rollOffRotation;

      phases.push({
        start: currentTime,
        duration: rollOffDuration,
        startY: bounceHeight,
        endY: bounceHeight,
        startX: positionX,
        endX: 120, // Roll off screen
        rotation: totalRotation,
        scaleY: [1, 1],
      });
    }

    return phases;
  };

  const bouncePhases = calculateBouncePhysics();

  // Create animation effect ranges
  const createAnimationRanges = (): GenericEffectData['ranges'] => {
    const ranges: GenericEffectData['ranges'] = [];
    const totalDuration = params.duration;

    bouncePhases.forEach((phase, index) => {
      const startProg = phase.start / totalDuration;
      const endProg = (phase.start + phase.duration) / totalDuration;

      // Position keyframes
      ranges.push({
        key: 'translateX',
        val: `${phase.startX}%`,
        prog: startProg,
      });
      ranges.push({
        key: 'translateX',
        val: `${phase.endX}%`,
        prog: endProg,
      });

      ranges.push({
        key: 'translateY',
        val: `${phase.startY}%`,
        prog: startProg,
      });
      ranges.push({
        key: 'translateY',
        val: `${phase.endY}%`,
        prog: endProg,
      });

      // Rotation keyframes
      ranges.push({
        key: 'rotate',
        val: `${phase.rotation}deg`,
        prog: endProg,
      });

      // ScaleY keyframes (squash-stretch)
      if (phase.scaleY.length > 2) {
        // Multi-step scale (squash phase)
        phase.scaleY.forEach((scale, scaleIndex) => {
          const scaleProg =
            startProg +
            (endProg - startProg) * (scaleIndex / (phase.scaleY.length - 1));
          ranges.push({
            key: 'scaleY',
            val: scale,
            prog: scaleProg,
          });
        });
      } else {
        // Simple scale
        ranges.push({
          key: 'scaleY',
          val: phase.scaleY[0],
          prog: startProg,
        });
        ranges.push({
          key: 'scaleY',
          val: phase.scaleY[1] || phase.scaleY[0],
          prog: endProg,
        });
      }
    });

    return ranges;
  };

  // Create shadow animation ranges
  const createShadowRanges = (): GenericEffectData['ranges'] => {
    const ranges: GenericEffectData['ranges'] = [];
    const totalDuration = params.duration;
    const groundLevel = 60; // Ground Y position

    bouncePhases.forEach((phase) => {
      const startProg = phase.start / totalDuration;
      const endProg = (phase.start + phase.duration) / totalDuration;

      // Calculate shadow size based on height from ground
      const startHeight = Math.abs(phase.startY - groundLevel);
      const endHeight = Math.abs(phase.endY - groundLevel);

      const startScale = Math.max(0.3, 1 - startHeight / 100);
      const endScale = Math.max(0.3, 1 - endHeight / 100);

      const startOpacity = Math.max(0.2, 1 - startHeight / 150);
      const endOpacity = Math.max(0.2, 1 - endHeight / 150);

      ranges.push({ key: 'scale', val: startScale, prog: startProg });
      ranges.push({ key: 'scale', val: endScale, prog: endProg });
      ranges.push({ key: 'opacity', val: startOpacity, prog: startProg });
      ranges.push({ key: 'opacity', val: endOpacity, prog: endProg });
    });

    return ranges;
  };

  // Create word effect
  const wordEffect = {
    id: 'bounce-animation',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: params.duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: createAnimationRanges(),
    } as GenericEffectData,
  };

  // Create shadow effect
  const shadowEffect = {
    id: 'shadow-animation',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: params.duration,
      mode: 'provider',
      targetIds: [shadowId],
      ranges: createShadowRanges(),
    } as GenericEffectData,
  };

  // Create word component
  const wordComponent = {
    id: wordId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.word,
      className: 'inline-block',
      style: {
        fontSize: `${params.fontSize}px`,
        fontWeight: fontWeight,
        color: params.textColor,
        transformOrigin: 'center center',
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
    effects: [wordEffect],
  } as RenderableComponentData;

  // Create shadow component
  const shadowComponent = {
    id: shadowId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          bottom: '5%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '120px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          filter: 'blur(8px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [shadowEffect],
    childrenData: [],
  } as RenderableComponentData;

  // Create root container
  const rootContainer = {
    id: 'typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [wordComponent, shadowComponent],
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
  id: 'typokinetics-bounce',
  title: 'Typokinetics Bouncing Word',
  description:
    'Physics-based typography animation where a word bounces across the screen like a rubber ball, featuring squash-and-stretch deformation, rolling rotation, dynamic shadow, and wobble effects based on classic animation principles.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'physics',
    'bounce',
    'animation',
    'kinetic',
    'squash-stretch',
    'motion',
    'text',
    'dynamic',
  ],
  defaultInputParams: {
    word: 'BOUNCE',
    fontSize: 80,
    fontFamily: 'Inter:700',
    textColor: '#FFFFFF',
    duration: 6,
    bounceCount: 3,
    energyLoss: 0.7,
    initialVelocityX: 20,
    initialVelocityY: -80,
    gravity: 60,
    squashIntensity: 0.3,
    wobbleIntensity: 0.05,
  },
  dependencies: {},
};

// Export preset
export const typokineticsBouncePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
