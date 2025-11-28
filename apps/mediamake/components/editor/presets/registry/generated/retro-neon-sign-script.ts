/**
 * Retro Neon Sign Script Animation Preset
 *
 * A vintage neon sign preset featuring handwritten script text that flickers to life
 * like classic Vegas motel signage. Includes sequential tube illumination, electrical
 * flickering, power surges, double-stroke neon glow effects, color bleeding, 
 * micro-vibrations for buzz simulation, subtle reflections, and spark particles.
 *
 * Features:
 * - Bold flowing 1950s-style script typography (Yellowtail/Satisfy fonts)
 * - Sequential letter illumination with staggered timing
 * - Characteristic electrical flickering effects
 * - Power surge pulses that brighten the entire sign
 * - Multi-layer neon glow with double strokes (simulates glass tubing)
 * - Color bleeding into surrounding areas via textShadow
 * - Micro-vibrations for authentic neon buzz effect
 * - Subtle reflection beneath the text
 * - Spark particles during initial illumination
 * - Authentic neon aesthetics with customizable colors
 *
 * Use cases:
 * - Retro-styled title cards
 * - Vintage motel/diner aesthetic videos
 * - 1950s Vegas-style branding
 * - Nostalgic advertising content
 * - Retro gaming intros
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .default('Open')
    .describe('Text to display in neon sign style'),
  
  fontSize: z
    .number()
    .min(24)
    .max(500)
    .default(120)
    .describe('Font size in pixels for the neon text'),
  
  neonColor: z
    .string()
    .default('#ff00ff')
    .describe('Primary neon glow color (e.g., #ff00ff for magenta, #00ffff for cyan)'),
  
  tubeOuterColor: z
    .string()
    .default('#ff66ff')
    .describe('Outer tube stroke color for double-stroke effect (lighter shade of neon color)'),
  
  duration: z
    .number()
    .min(1)
    .max(60)
    .default(10)
    .describe('Total duration of the neon sign animation in seconds'),
  
  illuminationDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration for sequential letter illumination phase in seconds'),
  
  flickerIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Intensity of electrical flickering (0 = no flicker, 1 = maximum flicker)'),
  
  powerSurgeIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of power surge brightness spikes (0 = no surge, 1 = maximum surge)'),
  
  buzzyVibration: z
    .boolean()
    .default(true)
    .describe('Enable micro-vibrations to simulate neon buzz effect'),
  
  showReflection: z
    .boolean()
    .default(true)
    .describe('Show subtle reflection beneath the neon text'),
  
  showParticles: z
    .boolean()
    .default(true)
    .describe('Show electrical spark particles during initial illumination'),
  
  font: z
    .enum(['Yellowtail', 'Satisfy'])
    .default('Yellowtail')
    .describe('Handwritten script font choice (Yellowtail or Satisfy)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    neonColor,
    tubeOuterColor,
    duration,
    illuminationDuration,
    flickerIntensity,
    powerSurgeIntensity,
    buzzyVibration,
    showReflection,
    showParticles,
    font,
  } = params;

  // Helper: Parse character count for sequential illumination
  const parseCharacters = (text: string): string[] => {
    return text.split('');
  };

  const characters = parseCharacters(text);
  const characterCount = characters.length;

  // Calculate delay between character illuminations (100ms as specified)
  const characterDelay = 0.1; // 100ms in seconds
  const totalIlluminationTime = Math.min(characterCount * characterDelay, illuminationDuration);

  // ============================================================================
  // BASE NEON TEXT LAYER (with glow and stroke)
  // ============================================================================

  const neonBaseTextId = 'neon-base-text';
  
  const neonBaseText = {
    id: neonBaseTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      font: {
        family: font,
        weights: ['400'],
        display: 'swap' as const,
        preload: true,
      },
      style: {
        fontSize: `${fontSize}px`,
        color: neonColor,
        textAlign: 'center' as const,
        fontWeight: 'bold',
        letterSpacing: '0.05em',
        textShadow: `0 0 10px ${neonColor}, 0 0 20px ${neonColor}, 0 0 40px ${neonColor}, 0 0 80px ${neonColor}`,
        WebkitTextStroke: `2px ${neonColor}`,
        paintOrder: 'stroke fill',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [],
  };

  // ============================================================================
  // OUTER STROKE LAYER (simulates outer glass tube)
  // ============================================================================

  const neonStrokeTextId = 'neon-stroke-text';
  
  const neonStrokeText = {
    id: neonStrokeTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      font: {
        family: font,
        weights: ['400'],
        display: 'swap' as const,
        preload: true,
      },
      className: 'absolute top-0 left-0 w-full h-full',
      style: {
        fontSize: `${fontSize}px`,
        color: 'transparent',
        textAlign: 'center' as const,
        fontWeight: 'bold',
        letterSpacing: '0.05em',
        WebkitTextStroke: `4px ${tubeOuterColor}`,
        paintOrder: 'stroke fill',
        opacity: 0.6,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [],
  };

  // ============================================================================
  // SEQUENTIAL ILLUMINATION EFFECT (Base + Stroke)
  // ============================================================================

  const illuminationEffectBase = {
    id: 'illumination-effect-base',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: totalIlluminationTime,
      mode: 'provider' as const,
      targetIds: [neonBaseTextId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        { key: 'filter', val: 'brightness(0)', prog: 0 },
        { key: 'filter', val: 'brightness(1)', prog: 1 },
      ],
    },
  };

  const illuminationEffectStroke = {
    id: 'illumination-effect-stroke',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: totalIlluminationTime,
      mode: 'provider' as const,
      targetIds: [neonStrokeTextId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.6, prog: 1 },
      ],
    },
  };

  neonBaseText.effects.push(illuminationEffectBase);
  neonStrokeText.effects.push(illuminationEffectStroke);

  // ============================================================================
  // FLICKER EFFECT (throughout duration after illumination)
  // ============================================================================

  if (flickerIntensity > 0) {
    // Flicker starts after illumination, repeats every 2-3 seconds
    const flickerStartTime = totalIlluminationTime + 0.5;
    const flickerInterval = 2.5; // Average between 2-3 seconds
    const flickerDuration = 0.2; // 200ms flicker

    const numFlickers = Math.floor((duration - flickerStartTime) / flickerInterval);

    for (let i = 0; i < numFlickers; i++) {
      const flickerStart = flickerStartTime + i * flickerInterval;
      
      if (flickerStart + flickerDuration > duration) break;

      const flickerEffectBase = {
        id: `flicker-effect-base-${i}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: flickerStart,
          duration: flickerDuration,
          mode: 'provider' as const,
          targetIds: [neonBaseTextId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 1 - flickerIntensity * 0.2, prog: 0.2 },
            { key: 'opacity', val: 1, prog: 0.4 },
            { key: 'opacity', val: 1 - flickerIntensity * 0.1, prog: 0.6 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      };

      const flickerEffectStroke = {
        id: `flicker-effect-stroke-${i}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: flickerStart,
          duration: flickerDuration,
          mode: 'provider' as const,
          targetIds: [neonStrokeTextId],
          ranges: [
            { key: 'opacity', val: 0.6, prog: 0 },
            { key: 'opacity', val: 0.6 - flickerIntensity * 0.15, prog: 0.2 },
            { key: 'opacity', val: 0.6, prog: 0.4 },
            { key: 'opacity', val: 0.6 - flickerIntensity * 0.08, prog: 0.6 },
            { key: 'opacity', val: 0.6, prog: 1 },
          ],
        },
      };

      neonBaseText.effects.push(flickerEffectBase);
      neonStrokeText.effects.push(flickerEffectStroke);
    }
  }

  // ============================================================================
  // POWER SURGE EFFECT (every 4-5 seconds after illumination)
  // ============================================================================

  if (powerSurgeIntensity > 0) {
    const surgeStartTime = totalIlluminationTime + 2;
    const surgeInterval = 4.5; // Every 4-5 seconds
    const surgeDuration = 0.3;

    const numSurges = Math.floor((duration - surgeStartTime) / surgeInterval);

    for (let i = 0; i < numSurges; i++) {
      const surgeStart = surgeStartTime + i * surgeInterval;
      
      if (surgeStart + surgeDuration > duration) break;

      const brightnessMax = 1 + powerSurgeIntensity * 0.5; // Up to 150% brightness

      const surgeEffectBase = {
        id: `surge-effect-base-${i}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: surgeStart,
          duration: surgeDuration,
          mode: 'provider' as const,
          targetIds: [neonBaseTextId],
          ranges: [
            { key: 'filter', val: 'brightness(1)', prog: 0 },
            { key: 'filter', val: `brightness(${brightnessMax})`, prog: 0.5 },
            { key: 'filter', val: 'brightness(1)', prog: 1 },
          ],
        },
      };

      const surgeEffectStroke = {
        id: `surge-effect-stroke-${i}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: surgeStart,
          duration: surgeDuration,
          mode: 'provider' as const,
          targetIds: [neonStrokeTextId],
          ranges: [
            { key: 'opacity', val: 0.6, prog: 0 },
            { key: 'opacity', val: 0.6 + powerSurgeIntensity * 0.2, prog: 0.5 },
            { key: 'opacity', val: 0.6, prog: 1 },
          ],
        },
      };

      neonBaseText.effects.push(surgeEffectBase);
      neonStrokeText.effects.push(surgeEffectStroke);
    }
  }

  // ============================================================================
  // BUZZ MICRO-VIBRATION EFFECT (continuous subtle shake)
  // ============================================================================

  if (buzzyVibration) {
    const vibrationEffect = {
      id: 'buzz-vibration',
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: totalIlluminationTime,
        duration: duration - totalIlluminationTime,
        mode: 'provider' as const,
        targetIds: [neonBaseTextId, neonStrokeTextId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: 0.5, prog: 0.1 },
          { key: 'translateX', val: -0.5, prog: 0.2 },
          { key: 'translateX', val: 0.3, prog: 0.3 },
          { key: 'translateX', val: -0.3, prog: 0.4 },
          { key: 'translateX', val: 0, prog: 0.5 },
          { key: 'translateX', val: 0.4, prog: 0.6 },
          { key: 'translateX', val: -0.4, prog: 0.7 },
          { key: 'translateX', val: 0.2, prog: 0.8 },
          { key: 'translateX', val: -0.2, prog: 0.9 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: 0.3, prog: 0.15 },
          { key: 'translateY', val: -0.3, prog: 0.35 },
          { key: 'translateY', val: 0.2, prog: 0.55 },
          { key: 'translateY', val: -0.2, prog: 0.75 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    };

    neonBaseText.effects.push(vibrationEffect);
    neonStrokeText.effects.push(vibrationEffect);
  }

  // ============================================================================
  // REFLECTION (beneath the text)
  // ============================================================================

  let reflectionLayer = null;

  if (showReflection) {
    const reflectionTextId = 'reflection-text';
    
    const reflectionText = {
      id: reflectionTextId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: text,
        font: {
          family: font,
          weights: ['400'],
          display: 'swap' as const,
          preload: true,
        },
        style: {
          fontSize: `${fontSize}px`,
          color: neonColor,
          textAlign: 'center' as const,
          fontWeight: 'bold',
          letterSpacing: '0.05em',
          textShadow: `0 0 10px ${neonColor}, 0 0 20px ${neonColor}`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: 'reflection-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out' as const,
            start: 0,
            duration: totalIlluminationTime,
            mode: 'provider' as const,
            targetIds: [reflectionTextId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.2, prog: 1 },
            ],
          },
        },
      ],
    };

    reflectionLayer = {
      id: 'reflection-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-full',
          style: {
            top: '100%',
            transform: 'scaleY(-1)',
            filter: 'blur(4px)',
            marginTop: '8px',
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [reflectionText],
    };
  }

  // ============================================================================
  // SPARK PARTICLES (during initial illumination)
  // ============================================================================

  const particlePositions = [
    { left: '20%', top: '40%' },
    { left: '45%', top: '25%' },
    { left: '70%', top: '55%' },
    { left: '85%', top: '35%' },
    { left: '35%', top: '65%' },
    { left: '60%', top: '75%' },
  ];

  const particleSizes = [4, 3, 5, 3, 4, 3];

  const particleComponents = showParticles
    ? particlePositions.map((pos, index) => {
        const particleId = `particle-${index}`;
        const size = particleSizes[index];
        
        return {
          id: particleId,
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: ${size}px; height: ${size}px; background: ${neonColor}; border-radius: 50%; box-shadow: 0 0 ${size * 2}px ${neonColor};"></div>`,
            className: 'absolute',
            style: {
              left: pos.left,
              top: pos.top,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          effects: [
            {
              id: `particle-fade-${index}`,
              componentId: 'generic',
              data: {
                type: 'ease-out' as const,
                start: index * 0.08, // Stagger particles slightly
                duration: 0.5,
                mode: 'provider' as const,
                targetIds: [particleId],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.3 },
                  { key: 'opacity', val: 0, prog: 1 },
                  { key: 'scale', val: 0, prog: 0 },
                  { key: 'scale', val: 1.5, prog: 0.5 },
                  { key: 'scale', val: 0.5, prog: 1 },
                ],
              },
            },
          ],
        };
      })
    : [];

  // ============================================================================
  // PARTICLE CONTAINER
  // ============================================================================

  const particleContainer = showParticles
    ? {
        id: 'particle-container',
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
            duration: duration,
          },
        },
        childrenData: particleComponents,
      }
    : null;

  // ============================================================================
  // MAIN GLOW CONTAINER (holds neon layers + reflection + particles)
  // ============================================================================

  const mainGlowContainerChildren = [
    neonBaseText,
    neonStrokeText,
    ...(reflectionLayer ? [reflectionLayer] : []),
    ...(particleContainer ? [particleContainer] : []),
  ];

  const mainGlowContainer = {
    id: 'main-glow-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative p-8',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: mainGlowContainerChildren,
  };

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer = {
    id: 'retro-neon-sign-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [mainGlowContainer],
  } as RenderableComponentData;

  // ============================================================================
  // OUTPUT
  // ============================================================================

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'retro-neon-sign-script',
  title: 'Retro Neon Sign Script Animation',
  description:
    'A vintage neon sign preset with handwritten script text that flickers to life like classic Vegas motel signage. Features sequential tube illumination, electrical flickering, power surges, double-stroke neon glow effects, color bleeding, micro-vibrations for buzz simulation, subtle reflections, and spark particles during initial illumination. Bold flowing 1950s-style script typography with authentic neon aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'neon',
    'retro',
    'vintage',
    '1950s',
    'vegas',
    'motel',
    'sign',
    'script',
    'handwritten',
    'glow',
    'flicker',
    'electricity',
    'buzz',
    'reflection',
    'particles',
    'animation',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Open',
    fontSize: 120,
    neonColor: '#ff00ff',
    tubeOuterColor: '#ff66ff',
    duration: 10,
    illuminationDuration: 2,
    flickerIntensity: 0.7,
    powerSurgeIntensity: 0.5,
    buzzyVibration: true,
    showReflection: true,
    showParticles: true,
    font: 'Yellowtail',
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const retroNeonSignScriptPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
