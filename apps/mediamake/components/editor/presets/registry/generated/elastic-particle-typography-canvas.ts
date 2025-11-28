/**
 * Elastic Particle Typography Preset
 *
 * A particle-based elastic typography system where text explodes into energetic particles
 * before reforming with magnetic attraction. Features gradient particles with rainbow trails,
 * continuous vibration fields, and periodic explosion cycles.
 *
 * Features:
 * - **Particle Explosion**: Letters scatter into hundreds of small dots with random trajectories
 * - **Magnetic Assembly**: Particles converge with elastic physics to form letter shapes
 * - **Rainbow Gradient Trails**: Particles trail rainbow colors using hue-rotate animation
 * - **Vibration Field**: Assembled text pulses and shakes with unstable energy
 * - **Explosion Cycles**: Letters periodically scatter and reform at 5s intervals
 * - **Elastic Physics**: Smooth elastic easing for particle motion
 * - **Scale Effects**: Particles scale during assembly for emergence effect
 *
 * Use Cases:
 * - High-energy title sequences
 * - Dynamic brand reveals
 * - Music video typography
 * - Kinetic logo animations
 * - Explosive text effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter Schema
const presetParams = z.object({
  text: z
    .string()
    .default('ELASTIC')
    .describe('Text content to display as particle typography'),
  fontSize: z
    .number()
    .min(32)
    .max(500)
    .default(128)
    .optional()
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter:900')
    .optional()
    .describe('Font family with optional weight (e.g., "Inter:900")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Base text color in hex format'),
  particlesPerLetter: z
    .number()
    .min(10)
    .max(50)
    .default(25)
    .optional()
    .describe('Number of particles per letter'),
  scatterRadius: z
    .number()
    .min(50)
    .max(500)
    .default(200)
    .optional()
    .describe('Maximum scatter distance in pixels'),
  assemblyDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .optional()
    .describe('Duration of particle assembly in seconds'),
  vibrationIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe('Vibration intensity in pixels'),
  explosionInterval: z
    .number()
    .min(2)
    .max(20)
    .default(5)
    .optional()
    .describe('Interval between explosions in seconds'),
  explosionForce: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.8)
    .optional()
    .describe('Force multiplier for explosions (0.1 to 1)'),
  enableRainbowTrail: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable rainbow gradient trails on particles'),
  duration: z
    .number()
    .min(5)
    .max(120)
    .default(30)
    .optional()
    .describe('Total preset duration in seconds'),
});

// Preset Execution Function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize = 128,
    fontFamily = 'Inter:900',
    textColor = '#FFFFFF',
    particlesPerLetter = 25,
    scatterRadius = 200,
    assemblyDuration = 1.5,
    vibrationIntensity = 2,
    explosionInterval = 5,
    explosionForce = 0.8,
    enableRainbowTrail = true,
    duration = 30,
  } = params;

  // Parse font family and weight
  const fontParts = fontFamily.split(':');
  const fontFamilyName = fontParts[0];
  const fontWeight = fontParts.length > 1 ? parseInt(fontParts[1], 10) : 900;

  // Calculate total particle count
  const letterCount = text.length;
  const totalParticles = letterCount * particlesPerLetter;

  // Generate particle system using HTMLBlockAtom with inline styles and animations
  const particleSystemId = 'particle-canvas-layer';
  
  // Create particle HTML with CSS animations
  const generateParticleHTML = () => {
    const particles = [];
    
    for (let i = 0; i < totalParticles; i++) {
      // Random scatter position
      const randomX = (Math.random() - 0.5) * 2 * scatterRadius;
      const randomY = (Math.random() - 0.5) * 2 * scatterRadius;
      
      // Random delay for staggered assembly
      const assemblyDelay = Math.random() * 0.5;
      
      // Random hue for rainbow effect
      const hue = Math.random() * 360;
      
      // Particle size variation
      const particleSize = 2 + Math.random() * 2;
      
      particles.push(`
        <div class="particle" style="
          position: absolute;
          width: ${particleSize}px;
          height: ${particleSize}px;
          border-radius: 50%;
          background: ${enableRainbowTrail ? `hsl(${hue}, 100%, 50%)` : textColor};
          box-shadow: 
            0 0 4px rgba(255,255,255,0.6),
            0 0 8px rgba(255,255,255,0.4),
            0 0 12px rgba(255,255,255,0.2);
          animation: 
            particle-assemble-${i} ${assemblyDuration}s ease-out ${assemblyDelay}s both,
            particle-vibrate ${0.1}s infinite ${assemblyDuration + assemblyDelay}s,
            particle-explode ${explosionInterval}s infinite ${assemblyDuration + assemblyDelay}s,
            ${enableRainbowTrail ? `particle-hue-rotate 2s linear infinite,` : ''}
            particle-scale ${assemblyDuration}s ease-out ${assemblyDelay}s both;
          transform-origin: center;
        "></div>
        <style>
          @keyframes particle-assemble-${i} {
            0% {
              transform: translate(${randomX}px, ${randomY}px);
              opacity: 0;
            }
            100% {
              transform: translate(0px, 0px);
              opacity: 1;
            }
          }
          @keyframes particle-vibrate {
            0%, 100% { transform: translate(0px, 0px); }
            25% { transform: translate(${vibrationIntensity}px, ${-vibrationIntensity}px); }
            50% { transform: translate(${-vibrationIntensity}px, ${vibrationIntensity}px); }
            75% { transform: translate(${vibrationIntensity}px, ${vibrationIntensity}px); }
          }
          @keyframes particle-explode {
            0%, 90% { transform: translate(0px, 0px); opacity: 1; }
            95% { 
              transform: translate(${randomX * explosionForce}px, ${randomY * explosionForce}px);
              opacity: 0.5;
            }
            100% { transform: translate(0px, 0px); opacity: 1; }
          }
          ${enableRainbowTrail ? `
          @keyframes particle-hue-rotate {
            0% { filter: hue-rotate(0deg); }
            100% { filter: hue-rotate(360deg); }
          }
          ` : ''}
          @keyframes particle-scale {
            0% { transform: scale(0); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }
        </style>
      `);
    }
    
    return particles.join('');
  };

  const particleLayer: RenderableComponentData = {
    id: particleSystemId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
          ${generateParticleHTML()}
        </div>
      `,
      className: 'absolute inset-0',
      style: {
        zIndex: 10,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Assembled text layer (fades in after assembly)
  const assembledTextId = 'assembled-text-atom';
  
  const assembledTextLayer: RenderableComponentData = {
    id: 'assembled-text-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 5,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      {
        id: assembledTextId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: text,
          className: 'text-center font-bold',
          style: {
            fontSize: fontSize,
            color: textColor,
            textShadow: '0 0 20px rgba(255,255,255,0.5)',
            fontWeight: fontWeight,
            letterSpacing: '0.1em',
          },
          font: {
            family: fontFamilyName,
            weights: [fontWeight.toString()],
            display: 'swap',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          // Fade in after assembly
          {
            id: 'text-fade-in',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: assemblyDuration,
              duration: 0.5,
              mode: 'provider',
              targetIds: [assembledTextId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
          // Continuous vibration
          {
            id: 'text-vibration',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: assemblyDuration + 0.5,
              duration: duration - assemblyDuration - 0.5,
              mode: 'provider',
              targetIds: [assembledTextId],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: vibrationIntensity, prog: 0.125 },
                { key: 'translateX', val: 0, prog: 0.25 },
                { key: 'translateX', val: -vibrationIntensity, prog: 0.375 },
                { key: 'translateX', val: 0, prog: 0.5 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: -vibrationIntensity, prog: 0.125 },
                { key: 'translateY', val: 0, prog: 0.25 },
                { key: 'translateY', val: vibrationIntensity, prog: 0.375 },
                { key: 'translateY', val: 0, prog: 0.5 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Root container with radial gradient background
  const rootContainer: RenderableComponentData = {
    id: 'particle-typography-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          background: 'radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [particleLayer, assembledTextLayer],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset Metadata
const presetMetadata: PresetMetadata = {
  id: 'elastic-particle-typography-canvas',
  title: 'Elastic Particle Typography with Canvas Rendering',
  description:
    'Particle-based elastic typography where text explodes into energetic particles before reforming with magnetic attraction. Features rainbow gradient trails, vibration field, and periodic explosion effects with elastic physics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'particles',
    'elastic',
    'kinetic',
    'explosion',
    'magnetic',
    'rainbow',
    'gradient',
    'vibration',
    'energy',
    'modern',
    'dynamic',
    'canvas',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'ELASTIC',
    fontSize: 128,
    fontFamily: 'Inter:900',
    textColor: '#FFFFFF',
    particlesPerLetter: 25,
    scatterRadius: 200,
    assemblyDuration: 1.5,
    vibrationIntensity: 2,
    explosionInterval: 5,
    explosionForce: 0.8,
    enableRainbowTrail: true,
    duration: 30,
  },
};

// Export Preset
export const elasticParticleTypographyCanvasPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
