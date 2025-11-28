/**
 * Broken Projector Transition Preset
 *
 * This preset simulates a malfunctioning old film projector transitioning between two video clips.
 * It creates an authentic vintage film equipment failure aesthetic with multiple overlapping effects.
 *
 * Features:
 * - **Frame Skipping**: Rapid vertical position jitter (translateY animating randomly between -10px and 10px)
 * - **Brightness Flicker**: Irregular brightness drops from 100% to 40% simulating a failing bulb
 * - **Double-Exposure**: Both videos visible at 0.6 opacity with screen blend mode during middle 1s
 * - **Film Grain**: Noise texture overlay that intensifies (opacity 0.2→0.4) during flicker moments
 * - **Dust Particles**: Multiple animated particles moving across screen with blur
 * - **Projector Gate Shadow**: Vertical moving bars with clip-path animation
 * - **Frame Drops**: Complete blackouts (opacity 0) for 50-100ms at random intervals using step easing
 *
 * Technical Implementation:
 * - Total overlap/transition duration: 2.8 seconds
 * - All effects use provider mode with targetIds
 * - Frame jitter updates at 100ms intervals
 * - Brightness flickers irregularly throughout transition
 * - Frame drops occur at random intervals with step easing
 * - Film grain increases during intense moments
 *
 * Use cases:
 * - Vintage film aesthetic transitions
 * - Retro/nostalgic video effects
 * - Simulating old projection equipment
 * - Creative glitch transitions with character
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video clip'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video clip'),
  transitionDuration: z.number().default(2.8).describe('Total duration of the transition overlap in seconds'),
  jitterIntensity: z.number().min(5).max(20).default(10).optional().describe('Maximum vertical jitter displacement in pixels'),
  brightnessFlickerMin: z.number().min(0.2).max(0.8).default(0.4).optional().describe('Minimum brightness value during flicker (0-1)'),
  doubleExposureOpacity: z.number().min(0.3).max(0.8).default(0.6).optional().describe('Opacity of both videos during double-exposure effect (0-1)'),
  grainBaseOpacity: z.number().min(0.1).max(0.3).default(0.2).optional().describe('Base opacity of film grain overlay'),
  grainFlickerOpacity: z.number().min(0.3).max(0.6).default(0.4).optional().describe('Increased opacity of grain during flicker moments'),
  frameDropCount: z.number().min(2).max(8).default(4).optional().describe('Number of frame drop blackouts during transition'),
  dustParticleCount: z.number().min(3).max(10).default(5).optional().describe('Number of dust particles to animate'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    transitionDuration,
    jitterIntensity = 10,
    brightnessFlickerMin = 0.4,
    doubleExposureOpacity = 0.6,
    grainBaseOpacity = 0.2,
    grainFlickerOpacity = 0.4,
    frameDropCount = 4,
    dustParticleCount = 5,
  } = params;

  // Helper function to create random frame jitter effect (multiple keyframes)
  const createJitterEffect = (targetId: string, duration: number): GenericEffectData => {
    const ranges: any[] = [];
    const jitterInterval = 0.1; // 100ms intervals
    const steps = Math.floor(duration / jitterInterval);
    
    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      const randomY = (Math.random() - 0.5) * 2 * jitterIntensity; // Random -10px to +10px
      ranges.push({ key: 'translateY', val: `${randomY}px`, prog });
    }
    
    return {
      type: 'linear',
      start: 0,
      duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // Helper function to create irregular brightness flicker
  const createBrightnessFlicker = (targetId: string, duration: number): GenericEffectData => {
    const ranges: any[] = [];
    const flickerPoints = 12; // Number of flicker moments
    
    for (let i = 0; i <= flickerPoints; i++) {
      const prog = i / flickerPoints;
      const brightness = Math.random() > 0.6 ? brightnessFlickerMin : 1.0;
      ranges.push({ key: 'brightness', val: brightness, prog });
    }
    
    return {
      type: 'linear',
      start: 0,
      duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // Helper function to create frame drop blackouts with step easing
  const createFrameDrops = (targetId: string, duration: number): GenericEffectData => {
    const ranges: any[] = [];
    const drops: number[] = [];
    
    // Generate random drop times
    for (let i = 0; i < frameDropCount; i++) {
      drops.push(Math.random() * duration);
    }
    drops.sort((a, b) => a - b);
    
    // Build ranges with step easing for instant drops
    let lastProg = 0;
    ranges.push({ key: 'opacity', val: 1, prog: 0 });
    
    drops.forEach((dropTime) => {
      const dropDuration = 0.05 + Math.random() * 0.05; // 50-100ms
      const startProg = dropTime / duration;
      const endProg = Math.min((dropTime + dropDuration) / duration, 1);
      
      // Before drop
      if (startProg > lastProg) {
        ranges.push({ key: 'opacity', val: 1, prog: startProg - 0.001 });
      }
      // Drop to black (instant with step easing handled by closely spaced keyframes)
      ranges.push({ key: 'opacity', val: 0, prog: startProg });
      ranges.push({ key: 'opacity', val: 0, prog: endProg });
      // Back to visible
      ranges.push({ key: 'opacity', val: 1, prog: endProg + 0.001 });
      
      lastProg = endProg;
    });
    
    ranges.push({ key: 'opacity', val: 1, prog: 1 });
    
    return {
      type: 'linear', // Using linear with close keyframes for step-like behavior
      start: 0,
      duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // Helper function to create film grain intensity variation
  const createGrainEffect = (): GenericEffectData => {
    const ranges: any[] = [];
    const grainPoints = 10;
    
    for (let i = 0; i <= grainPoints; i++) {
      const prog = i / grainPoints;
      // Intensify grain during flicker moments
      const opacity = Math.random() > 0.5 ? grainFlickerOpacity : grainBaseOpacity;
      ranges.push({ key: 'opacity', val: opacity, prog });
    }
    
    return {
      type: 'linear',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['film-grain-overlay'],
      ranges,
    };
  };

  // Helper function to create dust particle animation
  const createDustParticleEffect = (particleId: string, index: number): GenericEffectData => {
    const startX = Math.random() * 100;
    const startY = Math.random() * 100;
    const endX = startX + (Math.random() - 0.5) * 50;
    const endY = startY + (Math.random() * 100) - 50; // Generally move down
    
    return {
      type: 'linear',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: [particleId],
      ranges: [
        { key: 'translateX', val: `${startX}vw`, prog: 0 },
        { key: 'translateX', val: `${endX}vw`, prog: 1 },
        { key: 'translateY', val: `${startY}vh`, prog: 0 },
        { key: 'translateY', val: `${endY}vh`, prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.7, prog: 0.1 },
        { key: 'opacity', val: 0.7, prog: 0.9 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };
  };

  // Helper function to create projector gate shadow animation
  const createGateShadowEffect = (): GenericEffectData => {
    return {
      type: 'linear',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['projector-gate-shadow'],
      ranges: [
        { key: 'translateY', val: '-10px', prog: 0 },
        { key: 'translateY', val: '10px', prog: 0.25 },
        { key: 'translateY', val: '-5px', prog: 0.5 },
        { key: 'translateY', val: '5px', prog: 0.75 },
        { key: 'translateY', val: '0px', prog: 1 },
      ],
    };
  };

  // Calculate double-exposure timing (middle 1 second of transition)
  const doubleExposureStart = (transitionDuration - 1.0) / 2;
  const doubleExposureEnd = doubleExposureStart + 1.0;

  // Create outgoing video effects
  const outgoingJitter = createJitterEffect('outgoing-video', transitionDuration);
  const outgoingBrightness = createBrightnessFlicker('outgoing-video', transitionDuration);
  const outgoingFrameDrops = createFrameDrops('outgoing-video', transitionDuration);
  
  // Outgoing video fade to double-exposure then out
  const outgoingOpacityEffect: GenericEffectData = {
    type: 'ease-in',
    start: 0,
    duration: transitionDuration,
    mode: 'provider',
    targetIds: ['outgoing-video'],
    ranges: [
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: doubleExposureOpacity, prog: doubleExposureStart / transitionDuration },
      { key: 'opacity', val: doubleExposureOpacity, prog: doubleExposureEnd / transitionDuration },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  // Create incoming video effects
  const incomingJitter = createJitterEffect('incoming-video', transitionDuration);
  const incomingBrightness = createBrightnessFlicker('incoming-video', transitionDuration);
  const incomingFrameDrops = createFrameDrops('incoming-video', transitionDuration);
  
  // Incoming video fade from double-exposure to full
  const incomingOpacityEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: transitionDuration,
    mode: 'provider',
    targetIds: ['incoming-video'],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: doubleExposureOpacity, prog: doubleExposureStart / transitionDuration },
      { key: 'opacity', val: doubleExposureOpacity, prog: doubleExposureEnd / transitionDuration },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // Create screen blend mode effect during double-exposure
  const doubleExposureBlendEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: transitionDuration,
    mode: 'provider',
    targetIds: ['incoming-video'],
    ranges: [
      { key: 'mixBlendMode', val: 'normal', prog: 0 },
      { key: 'mixBlendMode', val: 'screen', prog: doubleExposureStart / transitionDuration },
      { key: 'mixBlendMode', val: 'screen', prog: doubleExposureEnd / transitionDuration },
      { key: 'mixBlendMode', val: 'normal', prog: 1 },
    ],
  };

  // Create grain effect
  const grainEffect = createGrainEffect();

  // Create gate shadow effect
  const gateShadowEffect = createGateShadowEffect();

  // Create dust particles
  const dustParticles: RenderableComponentData[] = [];
  const dustEffects: any[] = [];
  
  for (let i = 0; i < dustParticleCount; i++) {
    const particleId = `dust-particle-${i}`;
    const size = 2 + Math.random() * 3; // 2-5px
    
    dustParticles.push({
      id: particleId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class="rounded-full bg-gray-300 blur-sm" style="width: ${size}px; height: ${size}px;"></div>`,
        className: 'absolute pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData);
    
    dustEffects.push({
      id: `dust-effect-${i}`,
      componentId: 'generic',
      data: createDustParticleEffect(particleId, i),
    });
  }

  // Build the component tree
  const childrenData: RenderableComponentData[] = [
    // Outgoing video
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        className: 'w-full h-full object-cover',
        volume: 0,
        muted: true,
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
    
    // Incoming video
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideoSrc,
        className: 'w-full h-full object-cover',
        volume: 0,
        muted: true,
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
    
    // Film grain overlay
    {
      id: 'film-grain-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div class="grain-texture"></div>',
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'overlay',
          backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')",
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
    
    // Dust particles
    ...dustParticles,
    
    // Projector gate shadow
    {
      id: 'projector-gate-shadow',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.4) 2%, rgba(0,0,0,0.6) 4%, transparent 6%, transparent 94%, rgba(0,0,0,0.6) 96%, rgba(0,0,0,0.4) 98%, transparent 100%)',
            mixBlendMode: 'multiply',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'broken-projector-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-950',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Outgoing video effects
      {
        id: 'outgoing-jitter',
        componentId: 'generic',
        data: outgoingJitter,
      },
      {
        id: 'outgoing-brightness',
        componentId: 'generic',
        data: outgoingBrightness,
      },
      {
        id: 'outgoing-frame-drops',
        componentId: 'generic',
        data: outgoingFrameDrops,
      },
      {
        id: 'outgoing-opacity',
        componentId: 'generic',
        data: outgoingOpacityEffect,
      },
      
      // Incoming video effects
      {
        id: 'incoming-jitter',
        componentId: 'generic',
        data: incomingJitter,
      },
      {
        id: 'incoming-brightness',
        componentId: 'generic',
        data: incomingBrightness,
      },
      {
        id: 'incoming-frame-drops',
        componentId: 'generic',
        data: incomingFrameDrops,
      },
      {
        id: 'incoming-opacity',
        componentId: 'generic',
        data: incomingOpacityEffect,
      },
      {
        id: 'incoming-blend',
        componentId: 'generic',
        data: doubleExposureBlendEffect,
      },
      
      // Grain effect
      {
        id: 'grain-effect',
        componentId: 'generic',
        data: grainEffect,
      },
      
      // Gate shadow effect
      {
        id: 'gate-shadow-effect',
        componentId: 'generic',
        data: gateShadowEffect,
      },
      
      // Dust particle effects
      ...dustEffects,
    ],
    childrenData,
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
  id: 'broken-projector-transition',
  title: 'Broken Projector Transition',
  description: 'A cinematic transition effect that simulates old film projection equipment malfunctioning between two video clips. Features frame skipping with rapid position jitters, brightness fluctuations mimicking a failing bulb, double-exposure ghost images with screen blend mode, increasing film grain and dust particles during flicker moments, projector gate shadow animations with moving vertical bars, and random frame drop blackouts for authentic vintage film equipment failure aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vintage', 'film', 'projector', 'glitch', 'retro', 'cinematic'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 2.8,
    jitterIntensity: 10,
    brightnessFlickerMin: 0.4,
    doubleExposureOpacity: 0.6,
    grainBaseOpacity: 0.2,
    grainFlickerOpacity: 0.4,
    frameDropCount: 4,
    dustParticleCount: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const brokenProjectorTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};