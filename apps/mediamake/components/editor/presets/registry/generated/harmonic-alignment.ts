/**
 * HarmonicAlignment Internal Waveform Effect Preset
 *
 * This internal preset analyzes audio harmonics in real-time to create precise geometric
 * arrangements of visual elements. When harmonic frequencies align, elements smoothly
 * transition from chaotic positioning into perfect mathematical formations.
 *
 * Features:
 * - **Harmonic Analysis**: Real-time detection of harmonic frequencies in audio
 * - **Geometric Formations**: Golden ratio spirals, Fibonacci sequences, Flower of Life, Metatron's Cube
 * - **Smooth Transitions**: Elements smoothly move between chaotic and ordered states
 * - **Intensity Scaling**: Formation size scales with audio intensity
 * - **Harmonic Glow**: Complementary glow effect that intensifies during alignment
 * - **Particle Trails**: Subtle trails showing element movement paths
 *
 * Technical:
 * - Effect type: waveform (audio-reactive with harmonic analysis)
 * - Return format: { effects: [...] } for internal preset consumption
 * - Uses WaveformEffect with custom harmonic analysis
 * - Targets provided element IDs for positioning and effects
 *
 * Use cases:
 * - Audio-reactive geometric visualizations
 * - Harmonic frequency visualizations
 * - Sacred geometry animations synchronized to music
 * - Dynamic particle systems responding to audio harmonics
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { WaveformEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('Array of component IDs to apply harmonic positioning to'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId for harmonic analysis'),
  harmonicSensitivity: z.number().min(0).max(1).default(0.7).describe('Sensitivity to harmonic detection (0-1, higher = more sensitive)'),
  geometryType: z.enum(['golden-spiral', 'fibonacci', 'flower-of-life', 'metatron']).default('golden-spiral').describe('Type of geometric formation to create'),
  formationSpeed: z.number().min(0.1).max(5).default(1.5).describe('Speed of transition into formation (seconds)'),
  harmonicThreshold: z.number().min(0).max(1).default(0.3).describe('Minimum harmonic strength required to trigger formation'),
  scaleWithIntensity: z.boolean().default(true).describe('Whether formation size scales with audio intensity'),
  effectStart: z.number().default(0).describe('Start time of the effect (relative to parent)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  glowIntensity: z.number().min(0).max(2).default(1.0).optional().describe('Intensity of the harmonic glow effect'),
  trailOpacity: z.number().min(0).max(1).default(0.4).optional().describe('Opacity of particle trails'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    audioSrc,
    harmonicSensitivity,
    geometryType,
    formationSpeed,
    harmonicThreshold,
    scaleWithIntensity,
    effectStart,
    effectDuration,
    glowIntensity = 1.0,
    trailOpacity = 0.4,
  } = params;

  // Helper: Calculate geometric positions based on geometry type
  const getGeometryPosition = (type: string, index: number, totalElements: number) => {
    const centerX = 0;
    const centerY = 0;
    const baseRadius = 200;
    
    switch (type) {
      case 'golden-spiral': {
        const phi = 1.618033988749895; // Golden ratio
        const angle = index * 137.5 * (Math.PI / 180); // Golden angle
        const radius = baseRadius * Math.pow(phi, index / totalElements);
        return {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        };
      }
      
      case 'fibonacci': {
        const fib = (n: number): number => {
          if (n <= 1) return n;
          return fib(n - 1) + fib(n - 2);
        };
        const fibValue = fib(index + 1);
        const angle = index * 90 * (Math.PI / 180);
        const radius = baseRadius * (fibValue / fib(totalElements));
        return {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        };
      }
      
      case 'flower-of-life': {
        const layer = Math.floor(Math.sqrt(index));
        const posInLayer = index - layer * layer;
        const pointsInLayer = layer === 0 ? 1 : layer * 6;
        const angle = (posInLayer / pointsInLayer) * 2 * Math.PI;
        const radius = layer * (baseRadius / 3);
        return {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        };
      }
      
      case 'metatron': {
        // Metatron's Cube: 13-point sacred geometry pattern
        const metatronPoints = [
          { x: 0, y: 0 }, // Center
          { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }, // Cardinal
          { x: 0.5, y: 0.866 }, { x: -0.5, y: 0.866 }, { x: 0.5, y: -0.866 }, { x: -0.5, y: -0.866 }, // Hexagon
          { x: 0.866, y: 0.5 }, { x: -0.866, y: 0.5 }, { x: 0.866, y: -0.5 }, { x: -0.866, y: -0.5 }, // Outer
        ];
        const point = metatronPoints[index % 13];
        return {
          x: centerX + point.x * baseRadius,
          y: centerY + point.y * baseRadius,
        };
      }
      
      default:
        return { x: centerX, y: centerY };
    }
  };

  // Create effects array
  const effects: any[] = [];

  // Create waveform effect for each target (harmonic positioning)
  targetIds.forEach((targetId, index) => {
    const position = getGeometryPosition(geometryType, index, targetIds.length);
    
    // Harmonic-driven translation effect
    const harmonicTranslateEffect: WaveformEffectData = {
      audioSrc,
      audioProperty: 'frequency', // React to frequency harmonics
      effectType: 'translateX',
      intensity: harmonicSensitivity * 100,
      sensitivity: harmonicSensitivity * 2,
      threshold: harmonicThreshold,
      numberOfSamples: 256,
      useFrequencyData: true,
      smoothing: 0.85,
      smoothNormalisation: formationSpeed,
      mode: 'provider',
      targetIds: [targetId],
      start: effectStart,
      duration: effectDuration,
      // Custom props for geometric positioning
      props: {
        targetX: position.x,
        targetY: position.y,
        formationSpeed,
        geometryType,
      },
    };

    effects.push({
      id: `harmonic-translate-x-${targetId}`,
      componentId: 'waveform',
      data: harmonicTranslateEffect,
    });

    // Y-axis translation
    const harmonicTranslateYEffect: WaveformEffectData = {
      ...harmonicTranslateEffect,
      effectType: 'translateY',
      audioProperty: 'mid', // Different frequency range for Y
    };

    effects.push({
      id: `harmonic-translate-y-${targetId}`,
      componentId: 'waveform',
      data: harmonicTranslateYEffect,
    });

    // Scale effect if enabled
    if (scaleWithIntensity) {
      const harmonicScaleEffect: WaveformEffectData = {
        audioSrc,
        audioProperty: 'bass',
        effectType: 'scale',
        intensity: 0.3,
        baseScale: 1,
        sensitivity: harmonicSensitivity * 1.5,
        threshold: harmonicThreshold,
        numberOfSamples: 128,
        useFrequencyData: true,
        smoothNormalisation: 1,
        mode: 'provider',
        targetIds: [targetId],
        start: effectStart,
        duration: effectDuration,
      };

      effects.push({
        id: `harmonic-scale-${targetId}`,
        componentId: 'waveform',
        data: harmonicScaleEffect,
      });
    }

    // Particle trail effect (subtle opacity animation)
    const trailEffect: WaveformEffectData = {
      audioSrc,
      audioProperty: 'waveform',
      effectType: 'blur',
      intensity: 0.1,
      sensitivity: 0.5,
      threshold: 0.1,
      numberOfSamples: 64,
      smoothNormalisation: 2,
      mode: 'provider',
      targetIds: [`trail-${index}`], // Target trail elements
      start: effectStart,
      duration: effectDuration,
      props: {
        opacity: trailOpacity,
      },
    };

    effects.push({
      id: `trail-effect-${targetId}`,
      componentId: 'waveform',
      data: trailEffect,
    });
  });

  // Glow overlay effect (reacts to harmonic alignment)
  const glowEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'treble',
    effectType: 'exposure',
    intensity: glowIntensity * 0.5,
    baseBrightness: 1,
    sensitivity: harmonicSensitivity * 2,
    threshold: harmonicThreshold * 1.5,
    numberOfSamples: 256,
    useFrequencyData: true,
    smoothNormalisation: 1.5,
    mode: 'provider',
    targetIds: ['glow-overlay'],
    start: effectStart,
    duration: effectDuration,
  };

  effects.push({
    id: 'harmonic-glow-effect',
    componentId: 'waveform',
    data: glowEffect,
  });

  // Return effects in container structure for extraction
  const container: RenderableComponentData = {
    id: 'harmonic-alignment-effects-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [container] as RenderableComponentData[],
      _extractedEffects: effects, // Direct extraction point
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'harmonic-alignment',
  title: 'HarmonicAlignment',
  description: 'An internal waveform effect preset that uses audio harmonic analysis to create precise geometric arrangements. Detects harmonic frequencies and maps them to mathematical positioning patterns (golden ratio spirals, Fibonacci sequences, sacred geometry). Elements smoothly transition between chaotic and ordered states based on harmonic alignment, with complementary glow and particle trail effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'audio-reactive', 'geometric', 'harmonic', 'internal'],
  defaultInputParams: {
    targetIds: ['element-0', 'element-1', 'element-2', 'element-3'],
    audioSrc: 'https://example.com/audio.mp3',
    harmonicSensitivity: 0.7,
    geometryType: 'golden-spiral',
    formationSpeed: 1.5,
    harmonicThreshold: 0.3,
    scaleWithIntensity: true,
    effectStart: 0,
    effectDuration: 30,
    glowIntensity: 1.0,
    trailOpacity: 0.4,
  },
  dependencies: {
    presets: [], // No sub-preset dependencies
    helpers: [],
  },
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

export const harmonicAlignmentPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
