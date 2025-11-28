/**
 * Industrial Typokinetics - Brutal Machinery Text Preset
 *
 * This preset creates brutal industrial typokinetics where text is stamped, crushed,
 * and hammered into place with mechanical violence. Each word appears to be processed
 * through heavy machinery - imagine a massive hydraulic press slamming down on letters,
 * causing vibrations that ripple through neighboring text.
 *
 * Features:
 * - **Hydraulic Press Slam**: Text crashes into existence with scale 3.0→1.0 bounce
 * - **Squash and Stretch**: Mechanical deformation with scaleY 0.3→1.2→1.0
 * - **Vibration Aftershock**: Oscillating translateY ±5px with decay
 * - **Environmental Shake**: Parent container trembles from word impacts
 * - **Metal Fatigue Effect**: Text bends and warps before snapping into place
 * - **Stress Fractures**: Animated cracks via text-decoration and borders
 * - **Impact Particles**: Dust and debris from crushing impacts
 * - **Industrial Texture**: Contrast, brightness, sepia filters for rust/oil/grit
 * - **Weight and Impact**: Transform-origin: center bottom for realistic physics
 *
 * Use cases:
 * - Industrial/tech video intros
 * - Heavy metal music videos
 * - Construction/engineering content
 * - Action-packed title sequences
 * - Aggressive brand messaging
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to display (will be split into words)'),
  duration: z.number().default(5).describe('Total duration in seconds'),
  fontSize: z.number().default(112).describe('Font size in pixels (default: 112)'),
  fontFamily: z.string().default('Inter').describe('Font family (e.g., "Inter:900" for extra bold)'),
  textColor: z.string().default('#d4d4d8').describe('Text color (default: zinc-300)'),
  slamIntensity: z.number().min(0.1).max(3).default(1).describe('Slam effect intensity multiplier (0.1-3)'),
  shakeIntensity: z.number().min(0.1).max(3).default(1).describe('Environmental shake intensity (0.1-3)'),
  particleCount: z.number().min(0).max(8).default(4).describe('Number of impact particles per word (0-8)'),
  staggerDelay: z.number().min(0).max(1).default(0.2).describe('Delay between word impacts in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  let fontWeight = 900; // Default to black weight for industrial look
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontWeight = parseInt(fontParts[1], 10) || 900;
    }
  }

  // Split text into words
  const words = params.text.trim().split(/\s+/);
  
  // Calculate word timings
  const totalDuration = params.duration;
  const staggerDelay = params.staggerDelay;
  const slamDuration = 0.4; // Main slam animation
  const vibrationDuration = 0.5; // Aftershock vibration
  const settleDuration = 0.6; // Settle time
  const wordEffectDuration = slamDuration + vibrationDuration + settleDuration; // 1.5s total

  // Build word components with effects
  const wordContainers: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `word-${index}`;
    const wordTextId = `word-text-${index}`;
    const wordStart = index * staggerDelay;
    
    // Create particle components
    const particleComponents: RenderableComponentData[] = [];
    const particleCount = Math.min(params.particleCount, 8);
    
    for (let i = 0; i < particleCount; i++) {
      const particleId = `particle-${index}-${i}`;
      const particleSize = 6 + Math.random() * 6; // 6-12px
      const particleLeft = 20 + Math.random() * 60; // 20-80%
      const particleTop = -15 - Math.random() * 15; // -15px to -30px
      const particleOpacity = 0.5 + Math.random() * 0.3; // 0.5-0.8
      
      // Particle effect: fall and fade out
      const particleEffect: GenericEffectData = {
        type: 'ease-out',
        start: 0,
        duration: 0.8 * params.slamIntensity,
        mode: 'provider',
        targetIds: [particleId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: 200, prog: 1 },
          { key: 'opacity', val: particleOpacity, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.7 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };

      particleComponents.push({
        id: particleId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${particleSize}px; height: ${particleSize}px; background: rgba(161, 161, 170, ${particleOpacity}); border-radius: ${Math.random() > 0.5 ? '2px' : '50%'};"></div>`,
          style: {
            position: 'absolute',
            top: `${particleTop}px`,
            left: `${particleLeft}%`,
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: wordEffectDuration,
          },
        },
        effects: [
          {
            id: `particle-effect-${index}-${i}`,
            componentId: 'generic',
            data: particleEffect,
          },
        ],
      } as RenderableComponentData);
    }

    // Crack overlay effect: appear and fade
    const crackId = `crack-${index}`;
    const crackEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: slamDuration * 0.5,
      duration: 0.4,
      mode: 'provider',
      targetIds: [crackId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.5, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    const crackOverlay: RenderableComponentData = {
      id: crackId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="position: absolute; inset: 0; border-top: 2px solid rgba(0, 0, 0, 0.3); border-bottom: 1px solid rgba(0, 0, 0, 0.2); pointer-events: none;"></div>`,
        style: {
          position: 'absolute',
          inset: '0',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: wordEffectDuration,
        },
      },
      effects: [
        {
          id: `crack-effect-${index}`,
          componentId: 'generic',
          data: crackEffect,
        },
      ],
    } as RenderableComponentData;

    // Main word slam effect with squash-and-stretch
    const wordSlamEffect: GenericEffectData = {
      type: 'ease-out',
      start: 0,
      duration: slamDuration * params.slamIntensity,
      mode: 'provider',
      targetIds: [wordTextId],
      ranges: [
        // Scale slam: 3.0 → 1.0
        { key: 'scale', val: 3.0, prog: 0 },
        { key: 'scale', val: 1.0, prog: 1 },
        // Squash and stretch: scaleY 0.3 → 1.2 → 1.0
        { key: 'scaleY', val: 0.3, prog: 0 },
        { key: 'scaleY', val: 1.2, prog: 0.6 },
        { key: 'scaleY', val: 1.0, prog: 1 },
        // Opacity
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
      ],
    };

    // Vibration aftershock: oscillating translateY
    const vibrationEffect: GenericEffectData = {
      type: 'linear',
      start: slamDuration,
      duration: vibrationDuration * params.slamIntensity,
      mode: 'provider',
      targetIds: [wordTextId],
      ranges: [
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -5 * params.slamIntensity, prog: 0.15 },
        { key: 'translateY', val: 4 * params.slamIntensity, prog: 0.3 },
        { key: 'translateY', val: -3 * params.slamIntensity, prog: 0.45 },
        { key: 'translateY', val: 2 * params.slamIntensity, prog: 0.6 },
        { key: 'translateY', val: -1 * params.slamIntensity, prog: 0.75 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };

    // Word text component
    const wordTextComponent: RenderableComponentData = {
      id: wordTextId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        className: 'font-black text-zinc-300 uppercase tracking-tight',
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          fontWeight: fontWeight,
          filter: 'contrast(1.5) brightness(0.8) sepia(0.2)',
          textShadow: '2px 2px 0 #000, 4px 4px 8px rgba(0,0,0,0.5)',
          transformOrigin: 'center bottom',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight.toString()],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: wordEffectDuration,
        },
      },
      effects: [
        {
          id: `word-slam-${index}`,
          componentId: 'generic',
          data: wordSlamEffect,
        },
        {
          id: `word-vibration-${index}`,
          componentId: 'generic',
          data: vibrationEffect,
        },
      ],
    } as RenderableComponentData;

    // Word container with all children
    return {
      id: wordId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
          style: {
            overflow: 'visible',
            margin: '0 8px',
          },
        },
      },
      context: {
        timing: {
          start: wordStart,
          duration: wordEffectDuration,
        },
      },
      childrenData: [
        wordTextComponent,
        ...particleComponents,
        crackOverlay,
      ],
    } as RenderableComponentData;
  });

  // Environmental shake effect on root container
  // Triggered by each word impact
  const environmentalShakeEffects = words.map((_, index) => {
    const shakeStartTime = index * staggerDelay;
    const shakeEffect: GenericEffectData = {
      type: 'ease-out',
      start: shakeStartTime,
      duration: 0.3 * params.shakeIntensity,
      mode: 'provider',
      targetIds: ['industrial-root-container'],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: 10 * params.shakeIntensity, prog: 0.2 },
        { key: 'translateX', val: -8 * params.shakeIntensity, prog: 0.4 },
        { key: 'translateX', val: 5 * params.shakeIntensity, prog: 0.6 },
        { key: 'translateX', val: -3 * params.shakeIntensity, prog: 0.8 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -8 * params.shakeIntensity, prog: 0.3 },
        { key: 'translateY', val: 6 * params.shakeIntensity, prog: 0.5 },
        { key: 'translateY', val: -4 * params.shakeIntensity, prog: 0.7 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };

    return {
      id: `env-shake-${index}`,
      componentId: 'generic',
      data: shakeEffect,
    };
  });

  // Root container with environmental shake
  const rootContainer: RenderableComponentData = {
    id: 'industrial-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-wrap items-center justify-center p-8',
        style: {
          overflow: 'visible',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordContainers as RenderableComponentData[],
    effects: environmentalShakeEffects,
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
  id: 'industrial-typokinetics',
  title: 'Industrial Typokinetics - Brutal Machinery Text',
  description:
    'Brutal industrial typokinetics preset where text is stamped, crushed, and hammered into place with mechanical violence. Features hydraulic press slam effects, metal fatigue warping, stress fractures, vibration aftershocks, environmental shake, and industrial grit textures. Each word crashes into existence with weight, impact, dust particles, and shockwaves.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'industrial',
    'brutal',
    'machinery',
    'impact',
    'slam',
    'hydraulic',
    'mechanical',
    'vibration',
    'shake',
    'particles',
    'metal',
    'heavy',
    'aggressive',
    'tech',
    'modern',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'INDUSTRIAL IMPACT',
    duration: 5,
    fontSize: 112,
    fontFamily: 'Inter:900',
    textColor: '#d4d4d8',
    slamIntensity: 1,
    shakeIntensity: 1,
    particleCount: 4,
    staggerDelay: 0.2,
  },
};

// Export preset
export const industrialTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
