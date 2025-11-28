/**
 * Laser Etching Typography Preset
 *
 * This preset creates a dramatic "laser etching" effect where text appears to be burned into
 * a digital surface by pink and cyan laser beams. Each character undergoes a multi-stage animation:
 *
 * 1. **Laser Trace**: A bright laser point traces the outline of each character with glowing effects
 * 2. **Heat Glow**: Intense white-to-pink/cyan glow appears as the laser "burns" the text
 * 3. **Smoke/Vapor**: Multiple particle effects emit from the etching point, drifting upward
 * 4. **Surface Distortion**: Heat distortion overlay pulses with backdrop blur variance
 * 5. **Metallic Reveal**: Text fills in with a reflective metallic gradient finish
 * 6. **Overburn Flares**: Occasional intensity spikes create bright flares with bloom effects
 *
 * Features:
 * - Sequential character animation with customizable delays
 * - GPU-accelerated transforms for smooth performance
 * - Particle system for smoke/vapor effects
 * - Dynamic heat distortion with animated blur
 * - Metallic gradient text with reflection simulation
 * - Overburn flares with radial gradients and scale blooms
 * - Customizable colors, timing, and intensity
 *
 * Technical Implementation:
 * - TextAtom with metallic gradient backgrounds for reflective quality
 * - HTMLBlockAtom for laser points with radial gradients and box-shadow glow
 * - HTMLBlockAtom for smoke particles with blur filters and opacity/translate animations
 * - BaseLayout with backdrop-filter for surface distortion
 * - Generic effects with provider mode for all animations
 * - Sequential timing with configurable character delays
 *
 * Use Cases:
 * - Tech product reveals
 * - Sci-fi title sequences
 * - Gaming overlays and transitions
 * - Futuristic brand intros
 * - Digital art demonstrations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z
    .string()
    .default('LASER')
    .describe('Text to etch with laser effect (uppercase recommended)'),
  
  fontSize: z
    .number()
    .min(60)
    .max(300)
    .default(120)
    .describe('Font size in pixels'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (bold fonts work best)'),
  
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (700 = bold)'),
  
  laserColor: z
    .string()
    .default('#ff69b4')
    .describe('Primary laser color (pink default)'),
  
  secondaryLaserColor: z
    .string()
    .default('#00ffff')
    .describe('Secondary laser color (cyan default)'),
  
  characterDelay: z
    .number()
    .min(0.05)
    .max(1)
    .default(0.4)
    .describe('Delay between character animations in seconds'),
  
  laserTraceDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.6)
    .describe('Duration of laser trace animation per character'),
  
  heatGlowDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.6)
    .describe('Duration of heat glow effect'),
  
  textRevealDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Delay before text fill appears (relative to trace start)'),
  
  smokeParticleCount: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Number of smoke particles per character'),
  
  overburnIntensity: z
    .number()
    .min(0)
    .max(3)
    .default(1)
    .describe('Intensity of overburn flare effects'),
  
  surfaceColor: z
    .string()
    .default('#0a0a0a')
    .describe('Background surface color'),
  
  duration: z
    .number()
    .min(2)
    .max(30)
    .default(5)
    .describe('Total preset duration in seconds'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Split text into characters
  const characters = params.text.split('');
  const numCharacters = characters.length;

  // Calculate timing
  const totalAnimationTime = numCharacters * params.characterDelay + params.laserTraceDuration + params.heatGlowDuration;
  const effectiveDuration = Math.max(params.duration, totalAnimationTime + 1);

  // Helper: Create character wrapper with text, laser point, and smoke particles
  const createCharacterWrapper = (char: string, index: number): RenderableComponentData => {
    const charStartTime = index * params.characterDelay;
    const charWrapperId = `char-wrapper-${index}`;
    const charTextId = `char-text-${index}`;
    const laserPointId = `laser-point-${index}`;
    const smokeContainerId = `smoke-container-${index}`;

    // Metallic gradient for reflective text
    const metallicGradient = `linear-gradient(180deg, #e0e0e0 0%, #a0a0a0 40%, #606060 60%, #a0a0a0 100%)`;

    // Character text with metallic gradient
    const charText: RenderableComponentData = {
      id: charTextId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: char,
        style: {
          fontSize: params.fontSize,
          fontWeight: params.fontWeight,
          opacity: 0,
          background: metallicGradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        },
        font: {
          family: params.fontFamily,
          weights: [params.fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: effectiveDuration,
        },
      },
    };

    // Laser point (bright glowing dot)
    const laserPoint: RenderableComponentData = {
      id: laserPointId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style='width:8px;height:8px;border-radius:50%;background:radial-gradient(circle,#fff 0%,${params.laserColor} 40%,${params.secondaryLaserColor} 70%,transparent 100%);box-shadow:0 0 20px 10px rgba(255,105,180,0.8),0 0 40px 20px rgba(0,255,255,0.6);'></div>`,
        style: {
          position: 'absolute',
          top: '0',
          left: '0',
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: effectiveDuration,
        },
      },
    };

    // Smoke particles
    const smokeParticles: RenderableComponentData[] = [];
    for (let i = 0; i < params.smokeParticleCount; i++) {
      const particleId = `smoke-particle-${index}-${i}`;
      const particleSize = 5 + Math.random() * 3;
      const particleOpacity = 0.4 + Math.random() * 0.3;
      
      smokeParticles.push({
        id: particleId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style='width:${particleSize}px;height:${particleSize}px;border-radius:50%;background:rgba(200,200,200,${particleOpacity});filter:blur(2px);'></div>`,
          style: {
            position: 'absolute',
            opacity: 0,
            top: `${20 + i * 15}px`,
            left: `${10 + i * 5}px`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: effectiveDuration,
          },
        },
      });
    }

    const smokeContainer: RenderableComponentData = {
      id: smokeContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none overflow-visible',
        },
      },
      childrenData: smokeParticles,
      context: {
        timing: {
          start: 0,
          duration: effectiveDuration,
        },
      },
    };

    // Character wrapper
    return {
      id: charWrapperId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
          style: {
            display: 'inline-block',
          },
        },
      },
      childrenData: [charText, laserPoint, smokeContainer],
      context: {
        timing: {
          start: 0,
          duration: effectiveDuration,
        },
      },
    };
  };

  // Helper: Create effects for a character
  const createCharacterEffects = (index: number): any[] => {
    const charStartTime = index * params.characterDelay;
    const charTextId = `char-text-${index}`;
    const laserPointId = `laser-point-${index}`;
    const smokeContainerId = `smoke-container-${index}`;

    const effects: any[] = [];

    // 1. Laser point opacity (appears, then fades)
    effects.push({
      id: `laser-point-opacity-${index}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: charStartTime,
        duration: params.laserTraceDuration + 0.1,
        mode: 'provider',
        targetIds: [laserPointId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.85 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    });

    // 2. Laser point position (traces character outline - simplified rectangular path)
    const charWidth = params.fontSize * 0.5; // Approximate char width
    const charHeight = params.fontSize * 0.8;
    effects.push({
      id: `laser-point-position-${index}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: charStartTime,
        duration: params.laserTraceDuration,
        mode: 'provider',
        targetIds: [laserPointId],
        ranges: [
          // Top-left to top-right
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: charWidth, prog: 0.25 },
          // Top-right to bottom-right
          { key: 'translateX', val: charWidth, prog: 0.25 },
          { key: 'translateX', val: charWidth, prog: 0.5 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: 0, prog: 0.25 },
          { key: 'translateY', val: charHeight, prog: 0.5 },
          // Bottom-right to bottom-left
          { key: 'translateX', val: charWidth, prog: 0.5 },
          { key: 'translateX', val: 0, prog: 0.75 },
          { key: 'translateY', val: charHeight, prog: 0.5 },
          { key: 'translateY', val: charHeight, prog: 0.75 },
          // Bottom-left to top-left
          { key: 'translateX', val: 0, prog: 0.75 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: charHeight, prog: 0.75 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    });

    // 3. Text reveal (opacity fade-in)
    const textRevealStart = charStartTime + params.textRevealDelay;
    effects.push({
      id: `text-reveal-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: textRevealStart,
        duration: 0.4,
        mode: 'provider',
        targetIds: [charTextId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      } as GenericEffectData,
    });

    // 4. Heat glow (intense white to pink/cyan)
    const heatGlowStart = charStartTime + params.textRevealDelay - 0.1;
    effects.push({
      id: `heat-glow-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: heatGlowStart,
        duration: params.heatGlowDuration,
        mode: 'provider',
        targetIds: [charTextId],
        ranges: [
          { key: 'textShadow', val: `0 0 30px #fff, 0 0 60px ${params.laserColor}, 0 0 90px ${params.secondaryLaserColor}`, prog: 0 },
          { key: 'textShadow', val: `0 0 5px rgba(255,105,180,0.3)`, prog: 1 },
        ],
      } as GenericEffectData,
    });

    // 5. Smoke particles (staggered fade + translate)
    for (let i = 0; i < params.smokeParticleCount; i++) {
      const particleId = `smoke-particle-${index}-${i}`;
      const particleStartOffset = 0.2 + i * 0.15;
      const particleDuration = 0.7 + i * 0.1;
      const driftX = -10 + Math.random() * 20;
      const driftY = -35 - Math.random() * 20;

      effects.push({
        id: `smoke-${index}-${i}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: charStartTime + particleStartOffset,
          duration: particleDuration,
          mode: 'provider',
          targetIds: [particleId],
          ranges: [
            { key: 'opacity', val: 0.7, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: driftY, prog: 1 },
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: driftX, prog: 1 },
          ],
        } as GenericEffectData,
      });
    }

    return effects;
  };

  // Create character wrappers
  const characterWrappers = characters.map((char, index) =>
    createCharacterWrapper(char, index)
  );

  // Create all effects
  const allCharacterEffects: any[] = [];
  for (let i = 0; i < numCharacters; i++) {
    allCharacterEffects.push(...createCharacterEffects(i));
  }

  // Characters container
  const charactersContainer: RenderableComponentData = {
    id: 'characters-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-row items-center justify-center',
        style: {
          gap: '0px',
        },
      },
    },
    childrenData: characterWrappers,
    context: {
      timing: {
        start: 0,
        duration: effectiveDuration,
      },
    },
  };

  // Heat distortion overlay
  const heatDistortionOverlay: RenderableComponentData = {
    id: 'heat-distortion-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          opacity: 0.3,
          backdropFilter: 'blur(2px)',
        },
      },
    },
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: effectiveDuration,
      },
    },
  };

  // Surface layer
  const surfaceLayer: RenderableComponentData = {
    id: 'surface-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          background: `linear-gradient(135deg, ${params.surfaceColor} 0%, #1a1a1a 50%, ${params.surfaceColor} 100%)`,
        },
      },
    },
    childrenData: [heatDistortionOverlay],
    context: {
      timing: {
        start: 0,
        duration: effectiveDuration,
      },
    },
  };

  // Overburn flares
  const overburnFlares: RenderableComponentData[] = [
    {
      id: 'overburn-flare-0',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style='width:60px;height:60px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.9) 0%,rgba(255,105,180,0.6) 30%,rgba(0,255,255,0.3) 60%,transparent 100%);'></div>`,
        style: {
          position: 'absolute',
          opacity: 0,
          transform: 'scale(0.5)',
          left: '30%',
          top: '50%',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: effectiveDuration,
        },
      },
    },
    {
      id: 'overburn-flare-1',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style='width:80px;height:80px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.95) 0%,rgba(0,255,255,0.7) 25%,rgba(255,105,180,0.4) 50%,transparent 100%);'></div>`,
        style: {
          position: 'absolute',
          opacity: 0,
          transform: 'scale(0.5)',
          left: '70%',
          top: '50%',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: effectiveDuration,
        },
      },
    },
  ];

  const overburnEffectsContainer: RenderableComponentData = {
    id: 'overburn-effects-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none flex items-center justify-center',
      },
    },
    childrenData: overburnFlares,
    context: {
      timing: {
        start: 0,
        duration: effectiveDuration,
      },
    },
  };

  // Overburn flare effects
  const overburnFlareEffects: any[] = [
    {
      id: 'overburn-flare-0-effect',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0.55 * params.overburnIntensity,
        duration: 0.25,
        mode: 'provider',
        targetIds: ['overburn-flare-0'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.9 * params.overburnIntensity, prog: 0.3 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'scale', val: 0.5, prog: 0 },
          { key: 'scale', val: 1.5, prog: 0.3 },
          { key: 'scale', val: 2, prog: 1 },
        ],
      } as GenericEffectData,
    },
    {
      id: 'overburn-flare-1-effect',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: (numCharacters * params.characterDelay * 0.7) * params.overburnIntensity,
        duration: 0.3,
        mode: 'provider',
        targetIds: ['overburn-flare-1'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.95 * params.overburnIntensity, prog: 0.25 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'scale', val: 0.5, prog: 0 },
          { key: 'scale', val: 1.8, prog: 0.25 },
          { key: 'scale', val: 2.5, prog: 1 },
        ],
      } as GenericEffectData,
    },
  ];

  // Heat distortion effect
  const heatDistortionEffect = {
    id: 'heat-distortion-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: effectiveDuration * 0.6,
      mode: 'provider',
      targetIds: ['heat-distortion-overlay'],
      ranges: [
        { key: 'opacity', val: 0.1, prog: 0 },
        { key: 'opacity', val: 0.4, prog: 0.5 },
        { key: 'opacity', val: 0.2, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'laser-etching-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          backgroundColor: params.surfaceColor,
        },
      },
    },
    childrenData: [surfaceLayer, charactersContainer, overburnEffectsContainer],
    effects: [heatDistortionEffect, ...allCharacterEffects, ...overburnFlareEffects],
    context: {
      timing: {
        start: 0,
        duration: effectiveDuration,
      },
    },
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

// --- Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'laser-etching-typography',
  title: 'Laser Etching Typography',
  description:
    'A dramatic typography effect where text appears to be etched by pink and cyan laser beams. Features laser point tracing with glow effects, sequential character animation, smoke/vapor particles, heat glow transitions, metallic text finish, and occasional overburn flares for added intensity.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'laser',
    'etching',
    'sci-fi',
    'tech',
    'futuristic',
    'particles',
    'glow',
    'metallic',
    'sequential',
    'effects',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'LASER',
    fontSize: 120,
    fontFamily: 'Inter',
    fontWeight: '700',
    laserColor: '#ff69b4',
    secondaryLaserColor: '#00ffff',
    characterDelay: 0.4,
    laserTraceDuration: 0.6,
    heatGlowDuration: 0.6,
    textRevealDelay: 0.1,
    smokeParticleCount: 3,
    overburnIntensity: 1,
    surfaceColor: '#0a0a0a',
    duration: 5,
  },
};

// --- Export ---
export const laserEtchingTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};