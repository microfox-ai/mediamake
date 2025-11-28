/**
 * Film Perforation Damage Effect Preset
 *
 * SINGLE EFFECT:
 * This internal effect preset simulates mechanical film transport damage from damaged sprocket holes.
 * Creates abrupt vertical jumps, frame blacks (dropped frames), horizontal registration loss,
 * rotation wobbles, and tension-induced scaling that replicate physical film projection instability.
 *
 * The effect generates mechanical, non-eased transitions using instant progress changes (0.0001 gaps)
 * to create the abrupt, jerky behavior characteristic of physical film transport failures.
 *
 * Features:
 * - Vertical jumps: Instant translateY shifts simulating film losing vertical registration
 * - Frame blacks: Opacity cuts to 0 simulating dropped frames when perforations fail
 * - Registration loss: Horizontal translateX shifts when film loses lateral guide
 * - Film plane wobble: Small rotation angles when film isn't held flat
 * - Tension variations: scaleY pulsing simulating speed changes from inconsistent pull
 *
 * All effects are distributed across the duration based on damage severity and frequency parameters.
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to target'),
  damageSeverity: z.enum(['minor', 'moderate', 'severe']).describe('Severity of perforation damage affecting jump intensity and frequency'),
  damageType: z.enum(['tears', 'stretching', 'missing']).describe('Type of perforation damage affecting movement patterns'),
  jumpFrequency: z.number().min(0).max(10).describe('Number of vertical jump events per second'),
  registrationLoss: z.enum(['stable', 'loose', 'erratic']).describe('Horizontal registration stability level'),
  duration: z.number().describe('Total duration of the effect in seconds'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  };

  // Helper function to create instant transition (mechanical feel)
  const instantTransition = (prog: number, offset: number = 0.0001): number => {
    return prog + offset;
  };

  // Calculate damage parameters based on severity
  const severityConfig = {
    minor: {
      jumpAmplitude: { min: -15, max: -10 },
      blackDuration: 0.02,
      registrationShift: { min: 3, max: 8 },
      wobbleRange: { min: -0.2, max: 0.3 },
      tensionRange: { min: 0.99, max: 1.01 },
      blackFrequency: 0.15,
    },
    moderate: {
      jumpAmplitude: { min: -30, max: -20 },
      blackDuration: 0.04,
      registrationShift: { min: 8, max: 15 },
      wobbleRange: { min: -0.5, max: 0.5 },
      tensionRange: { min: 0.98, max: 1.02 },
      blackFrequency: 0.3,
    },
    severe: {
      jumpAmplitude: { min: -50, max: -35 },
      blackDuration: 0.06,
      registrationShift: { min: 15, max: 25 },
      wobbleRange: { min: -0.8, max: 0.8 },
      tensionRange: { min: 0.96, max: 1.04 },
      blackFrequency: 0.5,
    },
  };

  const config = severityConfig[params.damageSeverity];

  // Registration loss configuration
  const registrationConfig = {
    stable: {
      shiftFrequency: 0.1,
      holdDuration: { min: 0.1, max: 0.15 },
    },
    loose: {
      shiftFrequency: 0.4,
      holdDuration: { min: 0.15, max: 0.25 },
    },
    erratic: {
      shiftFrequency: 0.7,
      holdDuration: { min: 0.2, max: 0.35 },
    },
  };

  const regConfig = registrationConfig[params.registrationLoss];

  // Build combined animation ranges
  const ranges: Array<{ key: string; val: any; prog: number }> = [];

  // Calculate number of events based on duration and frequencies
  const totalJumps = Math.floor(params.jumpFrequency * params.duration);
  const totalBlacks = Math.floor(params.duration * config.blackFrequency);
  const totalRegistrationShifts = Math.floor(params.duration * regConfig.shiftFrequency);

  // Generate vertical jump events
  const jumpProgresses: number[] = [];
  for (let i = 0; i < totalJumps; i++) {
    const prog = randomInRange(0.05, 0.95);
    jumpProgresses.push(prog);
  }
  jumpProgresses.sort((a, b) => a - b);

  jumpProgresses.forEach((prog) => {
    const jumpAmount = randomInRange(config.jumpAmplitude.min, config.jumpAmplitude.max);
    const jumpDuration = 0.02; // 20ms jump hold

    // Instant jump down
    ranges.push({ key: 'translateY', val: 0, prog: prog });
    ranges.push({ key: 'translateY', val: jumpAmount, prog: instantTransition(prog) });
    // Hold position
    ranges.push({ key: 'translateY', val: jumpAmount, prog: prog + jumpDuration });
    // Instant return
    ranges.push({ key: 'translateY', val: 0, prog: instantTransition(prog + jumpDuration) });
  });

  // Generate frame black events (dropped frames)
  const blackProgresses: number[] = [];
  for (let i = 0; i < totalBlacks; i++) {
    const prog = randomInRange(0.05, 0.95);
    blackProgresses.push(prog);
  }
  blackProgresses.sort((a, b) => a - b);

  blackProgresses.forEach((prog) => {
    // Instant black
    ranges.push({ key: 'opacity', val: 1, prog: prog });
    ranges.push({ key: 'opacity', val: 0, prog: instantTransition(prog) });
    // Hold black
    ranges.push({ key: 'opacity', val: 0, prog: prog + config.blackDuration });
    // Instant return
    ranges.push({ key: 'opacity', val: 1, prog: instantTransition(prog + config.blackDuration) });
  });

  // Generate horizontal registration loss events
  const registrationProgresses: number[] = [];
  for (let i = 0; i < totalRegistrationShifts; i++) {
    const prog = randomInRange(0.05, 0.95);
    registrationProgresses.push(prog);
  }
  registrationProgresses.sort((a, b) => a - b);

  registrationProgresses.forEach((prog) => {
    const shiftAmount = randomInRange(config.registrationShift.min, config.registrationShift.max) * (Math.random() > 0.5 ? 1 : -1);
    const holdDuration = randomInRange(regConfig.holdDuration.min, regConfig.holdDuration.max);

    // Instant shift
    ranges.push({ key: 'translateX', val: 0, prog: prog });
    ranges.push({ key: 'translateX', val: shiftAmount, prog: instantTransition(prog) });
    // Hold shifted position
    ranges.push({ key: 'translateX', val: shiftAmount, prog: prog + holdDuration });
    // Instant return
    ranges.push({ key: 'translateX', val: 0, prog: instantTransition(prog + holdDuration) });
  });

  // Generate film plane wobble (rotation)
  const wobblePoints = 8;
  for (let i = 0; i <= wobblePoints; i++) {
    const prog = i / wobblePoints;
    const wobble = randomInRange(config.wobbleRange.min, config.wobbleRange.max);
    ranges.push({ key: 'rotate', val: wobble, prog: prog });
  }

  // Generate tension variations (scale pulsing)
  const tensionPoints = 12;
  for (let i = 0; i <= tensionPoints; i++) {
    const prog = i / tensionPoints;
    const tension = randomInRange(config.tensionRange.min, config.tensionRange.max);
    ranges.push({ key: 'scaleY', val: tension, prog: prog });
  }

  // Sort ranges by progress for proper animation sequencing
  ranges.sort((a, b) => a.prog - b.prog);

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Linear for mechanical, non-eased feel
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: ranges,
  };

  // Create effect
  const effect = {
    id: params.effectId || `film-perforation-damage-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'film-perforation-damage-container',
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
              duration: params.duration,
            },
          },
          effects: [effect],
          childrenData: [],
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'FilmPerforationDamage',
  title: 'Film Perforation Damage Effect',
  description: 'Internal effect preset that simulates mechanical film transport damage from sprocket hole failures. Creates abrupt vertical jumps, frame blacks (dropped frames), horizontal registration loss, rotation wobbles, and tension-induced scaling. Designed for mechanical, non-eased transitions that replicate physical film projection instability.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'film', 'mechanical', 'damage', 'glitch', 'vintage'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    damageSeverity: 'moderate',
    damageType: 'tears',
    jumpFrequency: 3,
    registrationLoss: 'loose',
    duration: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const FilmPerforationDamagePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
