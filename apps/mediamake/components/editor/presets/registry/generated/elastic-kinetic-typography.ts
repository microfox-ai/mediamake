/**
 * Elastic Kinetic Typography Preset
 *
 * Creates physics-based elastic typography with rubber band slingshot effects.
 * Each character enters from random off-screen positions with extreme overshoot,
 * creating a living organism effect with iridescent gradients that pulse with motion.
 *
 * Features:
 * - Individual character physics simulation with varying tension
 * - Extreme elastic overshoot animations (200% → -20% → 5% → 0%)
 * - Random off-screen entry positions per character
 * - Iridescent gradients that shift based on velocity
 * - Continuous micro-movements after main animation (scale, rotate)
 * - Audio-reactive elasticity tied to bass frequencies (optional)
 * - Waveform integration for dynamic effect intensity
 *
 * Use cases:
 * - High-impact title reveals with slingshot effects
 * - Music video typography with audio-reactive motion
 * - Dynamic brand animations with elastic physics
 * - Experimental kinetic typography with organic movement
 * - Social media content with attention-grabbing text
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
  TextAtomData,
  WaveformEffectData,
} from '@microfox/remotion';

// --- Parameter Schema ---

const presetParams = z.object({
  text: z
    .string()
    .default('ELASTIC')
    .describe('Text to display with elastic physics'),
  
  // Font Configuration
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:900", "BebasNeue:700")'),
  fontSize: z
    .number()
    .min(24)
    .max(400)
    .default(96)
    .describe('Base font size in pixels'),
  
  // Color & Gradient
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (overridden by gradient)'),
  iridescent: z
    .boolean()
    .default(true)
    .describe('Enable iridescent gradient effect'),
  gradientColors: z
    .array(z.string())
    .default(['#ff00ff', '#00ffff', '#ffff00', '#ff00ff'])
    .describe('Gradient color stops for iridescent effect'),
  
  // Physics Animation
  elasticIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Intensity multiplier for elastic overshoot'),
  animationDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Main elastic animation duration in seconds'),
  staggerDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Maximum random delay between character animations'),
  
  // Micro-Movement
  microMovementEnabled: z
    .boolean()
    .default(true)
    .describe('Enable continuous micro-movements after main animation'),
  microMovementDuration: z
    .number()
    .min(2)
    .max(6)
    .default(3.5)
    .describe('Duration of micro-movement loop in seconds'),
  microMovementIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Intensity of micro-movements (scale/rotate range)'),
  
  // Audio Integration
  audioReactive: z
    .boolean()
    .default(false)
    .describe('Enable audio-reactive elasticity'),
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL or ref:componentId for audio-reactive effects'),
  audioSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .describe('Sensitivity to audio (bass) for elastic intensity modulation'),
  
  // Positioning
  position: z
    .enum(['center', 'top', 'bottom'])
    .default('center')
    .describe('Vertical position of text'),
  
  // Timing
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(10)
    .describe('Total duration of the preset in seconds'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { config } = props;
  const fps = config?.fps ?? 30;
  
  // Parse font string
  const fontString = params.font || 'Inter:900';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }
  if (!fontStyle.fontWeight) {
    fontStyle.fontWeight = 900; // Default to black weight
  }
  
  // Calculate positioning
  const getPositionStyle = () => {
    switch (params.position) {
      case 'top':
        return 'items-start pt-20';
      case 'bottom':
        return 'items-end pb-20';
      default:
        return 'items-center';
    }
  };
  
  // Helper: Generate random off-screen position
  const getRandomOffScreenPosition = () => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 200 + Math.random() * 100; // 200-300% off-screen
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };
  
  // Helper: Generate elastic keyframes with extreme overshoot
  const generateElasticKeyframes = (
    startPos: { x: number; y: number },
    intensity: number,
  ) => {
    const overshoot1 = -20 * intensity; // First overshoot (opposite direction)
    const overshoot2 = 5 * intensity;   // Second overshoot (same direction)
    
    return {
      translateX: [
        { key: 'translateX', val: startPos.x, prog: 0 },
        { key: 'translateX', val: overshoot1 * 0.5, prog: 0.5 },
        { key: 'translateX', val: overshoot2 * 0.3, prog: 0.75 },
        { key: 'translateX', val: 0, prog: 1 },
      ],
      translateY: [
        { key: 'translateY', val: startPos.y, prog: 0 },
        { key: 'translateY', val: overshoot1 * 0.3, prog: 0.5 },
        { key: 'translateY', val: overshoot2 * 0.2, prog: 0.75 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
      scale: [
        { key: 'scale', val: 0.8, prog: 0 },
        { key: 'scale', val: 1.2 * intensity, prog: 0.4 },
        { key: 'scale', val: 0.95, prog: 0.7 },
        { key: 'scale', val: 1, prog: 1 },
      ],
      opacity: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.2 },
      ],
    };
  };
  
  // Helper: Generate micro-movement keyframes
  const generateMicroMovementKeyframes = (intensity: number) => {
    const scaleRange = 0.02 * intensity;
    const rotateRange = 1 * intensity;
    
    return [
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: 1 + scaleRange, prog: 0.33 },
      { key: 'scale', val: 1 - scaleRange * 0.5, prog: 0.66 },
      { key: 'scale', val: 1, prog: 1 },
      { key: 'rotate', val: -rotateRange, prog: 0 },
      { key: 'rotate', val: rotateRange, prog: 0.5 },
      { key: 'rotate', val: -rotateRange, prog: 1 },
    ];
  };
  
  // Split text into characters
  const characters = params.text.split('');
  
  // Create character components
  const characterComponents: RenderableComponentData[] = characters.map((char, index) => {
    const charId = `char-${index}`;
    const containerId = `char-container-${index}`;
    
    // Random off-screen position
    const startPos = getRandomOffScreenPosition();
    
    // Random stagger delay
    const randomDelay = Math.random() * params.staggerDelay;
    
    // Varying tension (intensity) per character
    const tensionVariation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
    const charIntensity = params.elasticIntensity * tensionVariation;
    
    // Generate elastic keyframes
    const elasticKeyframes = generateElasticKeyframes(startPos, charIntensity);
    
    // Main elastic animation
    const mainElasticEffect: GenericEffectData = {
      type: 'spring',
      start: randomDelay,
      duration: params.animationDuration,
      mode: 'provider',
      targetIds: [containerId],
      ranges: [
        ...elasticKeyframes.translateX,
        ...elasticKeyframes.translateY,
        ...elasticKeyframes.scale,
        ...elasticKeyframes.opacity,
      ],
    };
    
    // Micro-movement effect (starts after main animation)
    const microMovementEffect: GenericEffectData | null = params.microMovementEnabled
      ? {
          type: 'ease-in-out',
          start: randomDelay + params.animationDuration,
          duration: params.duration - (randomDelay + params.animationDuration),
          mode: 'provider',
          targetIds: [containerId],
          ranges: generateMicroMovementKeyframes(params.microMovementIntensity),
        }
      : null;
    
    // Iridescent gradient animation (background-position shift)
    const gradientEffect: GenericEffectData | null = params.iridescent
      ? {
          type: 'linear',
          start: 0,
          duration: params.duration,
          mode: 'provider',
          targetIds: [charId],
          ranges: [
            { key: 'backgroundPosition', val: '0% 50%', prog: 0 },
            { key: 'backgroundPosition', val: '100% 50%', prog: 0.5 },
            { key: 'backgroundPosition', val: '0% 50%', prog: 1 },
          ],
        }
      : null;
    
    // Audio-reactive effect (optional)
    const audioEffect: WaveformEffectData | null =
      params.audioReactive && params.audioSrc
        ? {
            audioSrc: params.audioSrc,
            audioProperty: 'bass',
            effectType: 'scale',
            intensity: 0.15 * params.audioSensitivity,
            baseScale: 1,
            sensitivity: params.audioSensitivity,
            threshold: 0.2,
            numberOfSamples: 128,
            useFrequencyData: true,
            windowInSeconds: 1 / fps,
            mode: 'provider',
            targetIds: [containerId],
            start: 0,
            duration: params.duration,
            smoothNormalisation: 1,
          }
        : null;
    
    // Build effects array
    const effects: any[] = [
      {
        id: `elastic-effect-${index}`,
        componentId: 'generic',
        data: mainElasticEffect,
      },
    ];
    
    if (microMovementEffect) {
      effects.push({
        id: `micro-movement-${index}`,
        componentId: 'generic',
        data: microMovementEffect,
      });
    }
    
    if (gradientEffect) {
      effects.push({
        id: `gradient-effect-${index}`,
        componentId: 'generic',
        data: gradientEffect,
      });
    }
    
    if (audioEffect) {
      effects.push({
        id: `audio-effect-${index}`,
        componentId: 'waveform',
        data: audioEffect,
      });
    }
    
    // Character container (for position/transform effects)
    const characterContainer: RenderableComponentData = {
      id: containerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects,
      childrenData: [
        {
          id: charId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: char === ' ' ? '\u00A0' : char, // Non-breaking space for spaces
            className: 'text-6xl font-black',
            style: {
              fontSize: params.fontSize,
              fontWeight: fontStyle.fontWeight,
              ...(params.iridescent
                ? {
                    background: `linear-gradient(90deg, ${params.gradientColors.join(', ')})`,
                    backgroundSize: '200% 200%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))',
                  }
                : {
                    color: params.textColor,
                    textShadow: '0 0 20px rgba(255,255,255,0.3)',
                  }),
            },
            font: {
              family: fontFamily,
              weights: [fontStyle.fontWeight.toString()],
            },
          } as TextAtomData,
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
        } as RenderableComponentData,
      ],
    };
    
    return characterContainer;
  });
  
  // Iridescent background layer (optional)
  const backgroundLayer: RenderableComponentData = {
    id: 'iridescent-background',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%;"></div>',
      className: 'w-full h-full',
      style: {
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(45deg, ${params.gradientColors.join(', ')})`,
        backgroundSize: '400% 400%',
        opacity: 0.15,
        mixBlendMode: 'screen',
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'background-gradient-animation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: params.duration,
          mode: 'provider',
          targetIds: ['iridescent-background'],
          ranges: [
            { key: 'backgroundPosition', val: '0% 50%', prog: 0 },
            { key: 'backgroundPosition', val: '100% 50%', prog: 0.5 },
            { key: 'backgroundPosition', val: '0% 50%', prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'elastic-kinetic-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full overflow-hidden flex ${getPositionStyle()} justify-center`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      backgroundLayer,
      {
        id: 'character-grid-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative flex flex-row items-center justify-center',
            style: {
              gap: `${params.fontSize * 0.1}px`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: characterComponents,
      } as RenderableComponentData,
    ],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'elastic-kinetic-typography',
  title: 'Elastic Kinetic Typography with Iridescent Gradients',
  description:
    'Advanced kinetic typography preset featuring physics-based elastic animations with extreme overshoot. Each character enters from random off-screen positions with slingshot effects, maintains continuous micro-movements, and features iridescent gradients that pulse with velocity. Creates a living organism effect with text that never fully settles, combining rubber band physics with oil-slick color shifts for high-impact visual compositions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'elastic',
    'physics',
    'gradient',
    'iridescent',
    'slingshot',
    'overshoot',
    'audio-reactive',
    'waveform',
    'micro-movement',
    'dynamic',
    'text',
    'title',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'ELASTIC',
    font: 'Inter:900',
    fontSize: 96,
    textColor: '#ffffff',
    iridescent: true,
    gradientColors: ['#ff00ff', '#00ffff', '#ffff00', '#ff00ff'],
    elasticIntensity: 1.5,
    animationDuration: 1.2,
    staggerDelay: 0.5,
    microMovementEnabled: true,
    microMovementDuration: 3.5,
    microMovementIntensity: 1,
    audioReactive: false,
    audioSensitivity: 1.5,
    position: 'center',
    duration: 10,
  },
};

// --- Export ---

export const elasticKineticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
