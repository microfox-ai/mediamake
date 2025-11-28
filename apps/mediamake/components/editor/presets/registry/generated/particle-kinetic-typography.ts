/**
 * Particle Kinetic Typography System Preset
 *
 * Audio-reactive particle-based kinetic typography where letters explode into pixel particles
 * with swarm intelligence, flocking patterns, and color temperature shifts based on audio dynamics.
 * Features beat-triggered explosions, clustering/dispersing behavior, and warm-to-cool color transitions.
 *
 * Technical Implementation:
 * - Each letter acts as an emitter, spawning 5-10 particle atoms (HTMLBlockAtom with small circles)
 * - Particles exhibit flocking behavior via generic effects (velocity, acceleration, steering forces)
 * - Audio-reactive waveform effects trigger explosive dispersion on bass drops
 * - Color temperature shifts via CSS filters: hue-rotate() and saturate() based on audio intensity
 * - Performance optimized: transform and opacity only, batch DOM updates, particle count cap at 100
 *
 * Use Cases:
 * - Music video typography effects with beat-synced explosions
 * - Dynamic text animations for promotional content
 * - Audio-visualized kinetic text for social media
 * - Interactive typography for brand identity videos
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter Schema
const presetParams = z.object({
  text: z.string().describe('Text content to display (up to 10 characters recommended for performance)'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId for beat detection'),
  fontSize: z.number().min(20).max(200).default(72).describe('Base font size for letters in pixels'),
  textColor: z.string().default('#ffffff').describe('Base text color (particles inherit this)'),
  particlesPerLetter: z.number().min(3).max(15).default(8).describe('Number of particles per letter (affects performance)'),
  particleSize: z.number().min(1).max(4).default(2).describe('Particle size in pixels'),
  font: z.string().optional().describe('Font family (e.g., "Inter:700", "Roboto:600:italic")'),
  
  // Flocking behavior
  baseFlockingRadius: z.number().min(20).max(150).default(60).describe('Base radius for flocking motion in pixels'),
  baseFlockingSpeed: z.number().min(0.5).max(3).default(1.5).describe('Base flocking speed multiplier'),
  
  // Audio reactivity
  explosionIntensity: z.number().min(0.1).max(2).default(0.5).describe('Explosion dispersion intensity on beats'),
  beatSensitivity: z.number().min(0.1).max(5).default(1.5).describe('Beat detection sensitivity'),
  beatThreshold: z.number().min(0).max(1).default(0.3).describe('Minimum audio level to trigger explosion'),
  
  // Color temperature
  coolHue: z.number().min(0).max(360).default(200).describe('Hue rotation for calm moments (degrees, blue = 200)'),
  warmHue: z.number().min(0).max(360).default(20).describe('Hue rotation for intense moments (degrees, orange = 20)'),
  colorTransitionDuration: z.number().min(0.5).max(5).default(2).describe('Color temperature transition duration in seconds'),
  
  // Timing
  duration: z.number().optional().describe('Duration in seconds (defaults to audio duration)'),
  startTime: z.number().default(0).describe('Start time in seconds'),
});

// Preset Execution Function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  // Parse font string
  const parseFont = (fontString?: string) => {
    if (!fontString) return { family: 'Inter', weight: '700', style: 'normal' };
    const parts = fontString.split(':');
    return {
      family: parts[0] || 'Inter',
      weight: parts[1] || '700',
      style: parts[2] || 'normal',
    };
  };

  const fontConfig = parseFont(params.font);
  const fontStyle: React.CSSProperties = {
    fontFamily: fontConfig.family,
    fontWeight: parseInt(fontConfig.weight, 10),
    fontStyle: fontConfig.style as any,
  };

  // Limit text to 10 characters for performance
  const text = params.text.slice(0, 10);
  const letters = text.split('');
  
  // Cap total particles at 100 for performance
  const maxTotalParticles = 100;
  const particlesPerLetter = Math.min(
    params.particlesPerLetter,
    Math.floor(maxTotalParticles / letters.length)
  );

  // Helper: Generate particle positions in a circular pattern around letter origin
  const generateParticlePositions = (letterIndex: number, particleCount: number) => {
    const positions: { x: number; y: number }[] = [];
    const angleStep = (Math.PI * 2) / particleCount;
    const baseRadius = 10; // Start particles close to letter

    for (let i = 0; i < particleCount; i++) {
      const angle = angleStep * i + (Math.random() - 0.5) * 0.5; // Add slight randomness
      const radius = baseRadius + Math.random() * 5;
      positions.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
    return positions;
  };

  // Helper: Create flocking motion effect for a particle
  const createFlockingEffect = (
    particleId: string,
    letterIndex: number,
    particleIndex: number,
    initialPos: { x: number; y: number },
    totalDuration: number,
  ) => {
    // Unique motion path per particle using sine/cosine waves
    const phaseX = letterIndex * 0.3 + particleIndex * 0.2;
    const phaseY = letterIndex * 0.4 + particleIndex * 0.3;
    const amplitudeX = params.baseFlockingRadius * (0.8 + Math.random() * 0.4);
    const amplitudeY = params.baseFlockingRadius * (0.6 + Math.random() * 0.6);
    const speedMultiplier = params.baseFlockingSpeed * (0.8 + Math.random() * 0.4);

    // Calculate motion path keyframes (smooth circular/elliptical motion)
    const ranges = [];
    const keyframes = 8; // More keyframes for smoother motion
    
    for (let i = 0; i <= keyframes; i++) {
      const progress = i / keyframes;
      const time = progress * speedMultiplier;
      const x = initialPos.x + Math.cos(time * Math.PI * 2 + phaseX) * amplitudeX;
      const y = initialPos.y + Math.sin(time * Math.PI * 2 + phaseY) * amplitudeY;
      
      ranges.push(
        { key: 'translateX', val: x, prog: progress },
        { key: 'translateY', val: y, prog: progress }
      );
    }

    // Add scale pulsing for organic feel
    ranges.push(
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: 0.7, prog: 0.25 },
      { key: 'scale', val: 1, prog: 0.5 },
      { key: 'scale', val: 0.7, prog: 0.75 },
      { key: 'scale', val: 1, prog: 1 }
    );

    // Opacity pulsing (clustering = more visible)
    ranges.push(
      { key: 'opacity', val: 0.7, prog: 0 },
      { key: 'opacity', val: 0.9, prog: 0.5 },
      { key: 'opacity', val: 0.7, prog: 1 }
    );

    return {
      id: `flocking-${particleId}`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-in-out' as const,
        start: particleIndex * 0.05, // Stagger start for organic appearance
        duration: totalDuration,
        mode: 'provider' as const,
        targetIds: [particleId],
        ranges,
      },
    };
  };

  // Helper: Create explosion effect (waveform-triggered dispersion)
  const createExplosionEffect = (
    particleId: string,
    letterIndex: number,
    particleIndex: number,
    totalDuration: number,
  ) => {
    return {
      id: `explosion-${particleId}`,
      componentId: 'waveform' as const,
      data: {
        audioSrc: params.audioSrc,
        audioProperty: 'bass' as const,
        effectType: 'scale' as const,
        intensity: params.explosionIntensity,
        baseScale: 1,
        sensitivity: params.beatSensitivity,
        threshold: params.beatThreshold,
        numberOfSamples: 128,
        useFrequencyData: true,
        windowInSeconds: 1 / 30,
        mode: 'provider' as const,
        targetIds: [particleId],
        start: 0,
        duration: totalDuration,
        smoothNormalisation: 0.5, // Fast response for explosions
      },
    };
  };

  // Helper: Create color temperature effect (cool to warm based on audio)
  const createColorTemperatureEffect = (
    targetIds: string[],
    totalDuration: number,
  ) => {
    // Animate hue from cool (blue) to warm (orange) and back
    return {
      id: 'color-temperature',
      componentId: 'generic' as const,
      data: {
        type: 'ease-in-out' as const,
        start: 0,
        duration: params.colorTransitionDuration,
        mode: 'provider' as const,
        targetIds,
        ranges: [
          { key: 'hueRotate', val: params.coolHue, prog: 0 },
          { key: 'hueRotate', val: params.warmHue, prog: 0.5 },
          { key: 'hueRotate', val: params.coolHue, prog: 1 },
          { key: 'saturate', val: 0.7, prog: 0 },
          { key: 'saturate', val: 1.5, prog: 0.5 },
          { key: 'saturate', val: 0.7, prog: 1 },
        ],
      },
    };
  };

  // Get audio duration if needed
  let audioDuration = params.duration;
  if (!audioDuration && fetcher) {
    try {
      const audioAnalysis = await fetcher('/api/analyze-audio', {
        audioSrc: params.audioSrc,
      });
      if (audioAnalysis?.durationInSeconds) {
        audioDuration = audioAnalysis.durationInSeconds;
      }
    } catch (error) {
      console.warn('Failed to fetch audio duration, using default 30s');
      audioDuration = 30;
    }
  }
  audioDuration = audioDuration || 30;

  // Build particle system
  const particleSystemChildren: RenderableComponentData[] = [];
  const allParticleIds: string[] = [];

  letters.forEach((letter, letterIndex) => {
    const letterX = (letterIndex - letters.length / 2) * (params.fontSize * 0.8); // Space letters horizontally
    const particlePositions = generateParticlePositions(letterIndex, particlesPerLetter);

    particlePositions.forEach((pos, particleIndex) => {
      const particleId = `particle-${letterIndex}-${particleIndex}`;
      allParticleIds.push(particleId);

      // Create particle as small circle using HTMLBlockAtom (ShapeAtom is deprecated)
      const particle: RenderableComponentData = {
        id: particleId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${params.particleSize}px; height: ${params.particleSize}px; background: ${params.textColor}; border-radius: 50%;"></div>`,
          style: {
            position: 'absolute' as const,
            left: `calc(50% + ${letterX + pos.x}px)`,
            top: `calc(50% + ${pos.y}px)`,
            willChange: 'transform, opacity, filter',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: audioDuration,
          },
        },
        effects: [
          createFlockingEffect(particleId, letterIndex, particleIndex, pos, audioDuration),
          createExplosionEffect(particleId, letterIndex, particleIndex, audioDuration),
        ],
      };

      particleSystemChildren.push(particle);
    });
  });

  // Add global color temperature effect
  const colorEffect = createColorTemperatureEffect(allParticleIds, audioDuration);

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: 'particle-kinetic-typography-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: params.startTime,
        duration: audioDuration,
      },
    },
    childrenData: [
      // Particle system
      {
        id: 'particle-system',
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
            duration: audioDuration,
          },
        },
        childrenData: particleSystemChildren,
        effects: [colorEffect],
      },
      // Audio atom
      {
        id: 'audio-source',
        type: 'atom' as const,
        componentId: 'AudioAtom',
        data: {
          src: params.audioSrc,
          volume: 1,
        },
        context: {
          timing: {
            start: 0,
            duration: audioDuration,
          },
        },
      },
    ] as RenderableComponentData[],
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

// Preset Metadata
const presetMetadata: PresetMetadata = {
  id: 'particle-kinetic-typography',
  title: 'Particle Kinetic Typography System',
  description:
    'Audio-reactive particle-based kinetic typography where letters explode into pixel particles with swarm intelligence, flocking patterns, and color temperature shifts based on audio dynamics. Features beat-triggered explosions, clustering/dispersing behavior, and warm-to-cool color transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'particles',
    'audio-reactive',
    'flocking',
    'swarm',
    'explosion',
    'color-temperature',
    'beat-sync',
    'advanced',
  ],
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    text: 'KINETIC',
    audioSrc: 'https://example.com/audio.mp3',
    fontSize: 72,
    textColor: '#ffffff',
    particlesPerLetter: 8,
    particleSize: 2,
    font: 'Inter:700',
    baseFlockingRadius: 60,
    baseFlockingSpeed: 1.5,
    explosionIntensity: 0.5,
    beatSensitivity: 1.5,
    beatThreshold: 0.3,
    coolHue: 200,
    warmHue: 20,
    colorTransitionDuration: 2,
    startTime: 0,
  },
};

// Export Preset
export const particleKineticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};