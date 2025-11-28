/**
 * Analog Glitch Text Effect Preset
 *
 * A sophisticated glitch text effect inspired by analog video synthesis and circuit bending.
 * Creates organic wave-based distortions with magnetic field warping, oscilloscope-style patterns,
 * and voltage spike overexposure. Features smooth sine wave distortions mixed with sudden electrical
 * surges, RGB splitting that intensifies during peak distortion, and continuous slight rotation for
 * electrical instability. Designed to feel like beautiful analog chaos rather than digital corruption.
 *
 * Features:
 * - **Analog Wave Distortion**: Smooth sine wave-based transforms that mimic magnetic field distortion
 * - **Voltage Spikes**: Random brightness bursts (overexposure to white) with immediate falloff
 * - **RGB Chromatic Aberration**: Three color layers with blend modes that split during distortion peaks
 * - **Electrical Instability**: Continuous slight rotation (-2deg to 2deg) for organic chaos
 * - **Oscilloscope Patterns**: Wave distortion rolls through letters like an oscilloscope display
 *
 * Use cases:
 * - Creating analog-style glitch effects for music videos
 * - Building retro VHS or CRT-style text animations
 * - Adding organic electronic chaos to titles
 * - Simulating circuit-bent video synthesis aesthetics
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

const presetParams = z.object({
  text: z.string().describe('The text to display with glitch effect'),
  duration: z
    .number()
    .default(10)
    .describe('Duration of the effect in seconds'),
  fontSize: z
    .number()
    .default(96)
    .describe('Font size for the text (in pixels)'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the text'),
  fontWeight: z
    .string()
    .default('900')
    .describe('Font weight (e.g., "400", "700", "900")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base color for the main text layer'),
  // Wave distortion parameters
  waveAmplitude: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe('Amplitude of wave distortion in pixels'),
  waveCycle: z
    .number()
    .min(500)
    .max(5000)
    .default(2000)
    .describe('Duration of one wave cycle in milliseconds'),
  waveFrequency: z
    .number()
    .min(0.1)
    .max(5)
    .default(2)
    .describe('Frequency multiplier for wave oscillation'),
  // Voltage spike parameters
  spikeIntensity: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('Intensity of voltage spike brightness (multiplier)'),
  spikeFrequency: z
    .number()
    .min(300)
    .max(2000)
    .default(650)
    .describe('Average time between voltage spikes in milliseconds'),
  spikeDuration: z
    .number()
    .min(20)
    .max(200)
    .default(50)
    .describe('Duration of each voltage spike in milliseconds'),
  // RGB split parameters
  rgbSplitAmount: z
    .number()
    .min(1)
    .max(20)
    .default(4)
    .describe('Maximum RGB split distance in pixels'),
  rgbSplitIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.6)
    .describe('Opacity of RGB layers (0-1)'),
  // Rotation instability
  rotationAmount: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Maximum rotation in degrees for electrical instability'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const containerId = 'analog-glitch-root';
  const mainTextId = 'analog-glitch-main-text';
  const rgbRedId = 'analog-glitch-rgb-red';
  const rgbGreenId = 'analog-glitch-rgb-green';
  const rgbBlueId = 'analog-glitch-rgb-blue';

  const {
    text,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    waveAmplitude,
    waveCycle,
    waveFrequency,
    spikeIntensity,
    spikeFrequency,
    spikeDuration,
    rgbSplitAmount,
    rgbSplitIntensity,
    rotationAmount,
  } = params;

  // Helper: Calculate number of wave cycles and voltage spikes
  const calculateEffectTiming = () => {
    const durationMs = duration * 1000;
    const cycleDurationSec = waveCycle / 1000;
    const numWaveCycles = Math.ceil(duration / cycleDurationSec);
    const numSpikes = Math.floor(durationMs / spikeFrequency);

    return { numWaveCycles, numSpikes, cycleDurationSec, durationMs };
  };

  const { numWaveCycles, numSpikes, cycleDurationSec, durationMs } =
    calculateEffectTiming();

  // === WAVE DISTORTION EFFECTS ===
  // Continuous wave distortion using translateY and rotate with sine wave timing
  const createWaveDistortionEffect = (
    targetId: string,
    effectId: string,
  ): GenericEffectData => {
    const ranges = [];

    // Create smooth sine wave pattern across multiple cycles
    for (let i = 0; i <= numWaveCycles; i++) {
      const prog = i / numWaveCycles;
      const time = prog * duration;

      // Sine wave calculation for Y translation
      const phase = (time / cycleDurationSec) * Math.PI * 2 * waveFrequency;
      const translateY = Math.sin(phase) * waveAmplitude;

      // Slight rotation oscillation (out of phase with translation)
      const rotPhase = phase + Math.PI / 2;
      const rotate = Math.sin(rotPhase) * (rotationAmount / 2);

      ranges.push(
        { key: 'translateY', val: translateY, prog },
        { key: 'rotate', val: rotate, prog },
      );
    }

    return {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // === ROTATION INSTABILITY EFFECT ===
  // Continuous slight rotation for electrical instability
  const createRotationInstabilityEffect = (
    targetId: string,
    effectId: string,
  ): GenericEffectData => {
    const ranges = [];
    const numRotationCycles = Math.ceil(duration / 0.3); // Faster rotation cycles

    for (let i = 0; i <= numRotationCycles; i++) {
      const prog = i / numRotationCycles;
      const time = prog * duration;

      // Random-ish rotation pattern using multiple sine waves
      const phase1 = (time / 0.3) * Math.PI * 2;
      const phase2 = (time / 0.5) * Math.PI * 2;
      const rotate =
        Math.sin(phase1) * rotationAmount * 0.6 +
        Math.sin(phase2) * rotationAmount * 0.4;

      ranges.push({ key: 'rotate', val: rotate, prog });
    }

    return {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // === VOLTAGE SPIKE EFFECTS ===
  // Random brightness spikes with immediate falloff
  const createVoltageSpikeEffects = (targetId: string) => {
    const spikeEffects = [];
    const spikeDurationSec = spikeDuration / 1000;

    for (let i = 0; i < numSpikes; i++) {
      // Random timing with some variance
      const baseTime = (i * spikeFrequency) / 1000;
      const variance = (Math.random() - 0.5) * (spikeFrequency / 2000);
      const spikeStart = Math.max(0, baseTime + variance);

      if (spikeStart + spikeDurationSec > duration) continue;

      const spikeEffect: GenericEffectData = {
        type: 'ease-out',
        start: spikeStart,
        duration: spikeDurationSec,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          {
            key: 'filter',
            val: `brightness(${100 * spikeIntensity}%) contrast(200%)`,
            prog: 0,
          },
          { key: 'filter', val: 'brightness(100%) contrast(100%)', prog: 0.3 },
          { key: 'filter', val: 'brightness(100%) contrast(100%)', prog: 1 },
        ],
      };

      spikeEffects.push({
        id: `${targetId}-voltage-spike-${i}`,
        componentId: 'generic',
        data: spikeEffect,
      });
    }

    return spikeEffects;
  };

  // === RGB SPLIT EFFECTS ===
  // RGB layers that shift during peak distortion moments
  const createRgbSplitEffect = (
    targetId: string,
    direction: 'left' | 'right' | 'up',
  ): GenericEffectData => {
    const ranges = [];

    // Sync RGB split with wave cycles - intensify during peaks
    for (let i = 0; i <= numWaveCycles * 4; i++) {
      const prog = i / (numWaveCycles * 4);
      const time = prog * duration;

      // Calculate wave phase for synchronization
      const phase = (time / cycleDurationSec) * Math.PI * 2 * waveFrequency;
      const intensity = Math.abs(Math.sin(phase)); // 0-1 based on wave position

      // RGB split amount based on wave intensity
      const splitAmount = intensity * rgbSplitAmount;

      let translateX = 0;
      let translateY = 0;

      if (direction === 'left') {
        translateX = -splitAmount;
      } else if (direction === 'right') {
        translateX = splitAmount;
      } else if (direction === 'up') {
        translateY = -splitAmount * 0.5;
      }

      ranges.push(
        { key: 'translateX', val: translateX, prog },
        { key: 'translateY', val: translateY, prog },
      );
    }

    return {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // === BUILD EFFECT ARRAYS ===
  const mainTextWaveEffect = {
    id: 'main-wave-distortion',
    componentId: 'generic',
    data: createWaveDistortionEffect(mainTextId, 'main-wave'),
  };

  const mainTextRotationEffect = {
    id: 'main-rotation-instability',
    componentId: 'generic',
    data: createRotationInstabilityEffect(mainTextId, 'main-rotation'),
  };

  const mainTextSpikeEffects = createVoltageSpikeEffects(mainTextId);

  const rgbRedSplitEffect = {
    id: 'rgb-red-split',
    componentId: 'generic',
    data: createRgbSplitEffect(rgbRedId, 'left'),
  };

  const rgbGreenSplitEffect = {
    id: 'rgb-green-split',
    componentId: 'generic',
    data: createRgbSplitEffect(rgbGreenId, 'right'),
  };

  const rgbBlueSplitEffect = {
    id: 'rgb-blue-split',
    componentId: 'generic',
    data: createRgbSplitEffect(rgbBlueId, 'up'),
  };

  // === BUILD COMPONENT TREE ===

  const rgbRedLayer: RenderableComponentData = {
    id: rgbRedId,
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text: text,
      className: 'text-6xl font-black absolute inset-0 flex items-center justify-center',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: '#ff0000',
        mixBlendMode: 'screen',
        opacity: rgbSplitIntensity,
        pointerEvents: 'none',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [rgbRedSplitEffect],
  };

  const rgbGreenLayer: RenderableComponentData = {
    id: rgbGreenId,
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text: text,
      className: 'text-6xl font-black absolute inset-0 flex items-center justify-center',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: '#00ff00',
        mixBlendMode: 'screen',
        opacity: rgbSplitIntensity,
        pointerEvents: 'none',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [rgbGreenSplitEffect],
  };

  const rgbBlueLayer: RenderableComponentData = {
    id: rgbBlueId,
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text: text,
      className: 'text-6xl font-black absolute inset-0 flex items-center justify-center',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: '#0000ff',
        mixBlendMode: 'overlay',
        opacity: rgbSplitIntensity,
        pointerEvents: 'none',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [rgbBlueSplitEffect],
  };

  const rgbLayerContainer: RenderableComponentData = {
    id: 'rgb-layer-container',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [rgbRedLayer, rgbGreenLayer, rgbBlueLayer] as RenderableComponentData[],
  };

  const mainText: RenderableComponentData = {
    id: mainTextId,
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text: text,
      className: 'text-6xl font-black',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: textColor,
        textShadow: '0 0 20px rgba(255,255,255,0.5)',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      mainTextWaveEffect,
      mainTextRotationEffect,
      ...mainTextSpikeEffects,
    ],
  };

  const rootContainer: RenderableComponentData = {
    id: containerId,
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [rgbLayerContainer, mainText] as RenderableComponentData[],
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
  id: 'analog-glitch-text-effect',
  title: 'Analog Glitch Text Effect',
  description:
    'A sophisticated glitch text effect inspired by analog video synthesis and circuit bending. Creates organic, wave-based distortions with magnetic field warping, oscilloscope-style patterns, and voltage spike overexposure. Features smooth sine wave distortions mixed with sudden electrical surges, RGB splitting that intensifies during peak distortion, and continuous slight rotation for electrical instability. Designed to feel like beautiful analog chaos rather than digital corruption.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'glitch',
    'analog',
    'vhs',
    'crt',
    'retro',
    'distortion',
    'wave',
    'rgb-split',
    'chromatic-aberration',
    'voltage',
    'circuit-bending',
    'oscilloscope',
    'magnetic',
    'organic',
    'chaos',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'ANALOG GLITCH',
    duration: 10,
    fontSize: 96,
    fontFamily: 'Inter',
    fontWeight: '900',
    textColor: '#FFFFFF',
    waveAmplitude: 10,
    waveCycle: 2000,
    waveFrequency: 2,
    spikeIntensity: 5,
    spikeFrequency: 650,
    spikeDuration: 50,
    rgbSplitAmount: 4,
    rgbSplitIntensity: 0.6,
    rotationAmount: 2,
  },
};

export const analogGlitchTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
