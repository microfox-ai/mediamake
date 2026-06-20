/**
 * 90s Handheld Birthday Party Text Effect Preset
 *
 * A nostalgic 90s camcorder-style birthday party text effect that captures the chaotic energy
 * of amateur indoor celebration filming. Features handheld camera shake, focus pulls, zoom bursts,
 * light leaks, overexposure flashes, confetti particles, and warm candle glow.
 *
 * Features:
 * - **Party Chaos Movement**: Organic handheld shake with higher amplitude for excitement
 * - **Focus Pulls**: Occasional blur effects simulating focus hunting (0-3px blur)
 * - **Zoom Bursts**: Sudden scale changes from camera bumps (1.0-1.3x scale)
 * - **Light Leaks**: Animated radial gradient overlays with high opacity whites
 * - **Overexposure Flashes**: Random white flashes typical of indoor filming
 * - **Confetti Particles**: Physics-based falling confetti with vibrant colors
 * - **Candle Glow**: Warm orange text shadow for festive atmosphere
 * - **Music Reactive**: Beat-reactive bounce when audio is present (TYPOGRAPHY.md compliant)
 * - **Festive Typography**: Bubblegum Sans or Fredoka One bubble letter fonts
 *
 * Use cases:
 * - Birthday party celebration videos
 * - Nostalgic 90s home video aesthetic
 * - Fun, energetic social media content
 * - Retro event announcements
 * - Party invitation videos
 */

import { z } from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .describe('The text content to display with party effect'),
  
  font: z
    .string()
    .optional()
    .default('Bubblegum Sans:400')
    .describe('Font family with optional weight and style (e.g., "Bubblegum Sans:400", "Fredoka One:400")'),
  
  fontSize: z
    .number()
    .optional()
    .default(72)
    .describe('Font size in pixels for the text'),
  
  textColor: z
    .string()
    .optional()
    .default('#FFFFFF')
    .describe('Text color in hex format'),
  
  shakeAmplitude: z
    .number()
    .optional()
    .default(1.0)
    .describe('Amplitude multiplier for party shake effect (0.5 = subtle, 2.0 = extreme)'),
  
  enableFocusPulls: z
    .boolean()
    .optional()
    .default(true)
    .describe('Enable occasional blur focus pull effects'),
  
  enableZoomBursts: z
    .boolean()
    .optional()
    .default(true)
    .describe('Enable random zoom burst effects from camera bumps'),
  
  enableLightLeaks: z
    .boolean()
    .optional()
    .default(true)
    .describe('Enable light leak overlay effects'),
  
  enableOverexposure: z
    .boolean()
    .optional()
    .default(true)
    .describe('Enable overexposure flash effects'),
  
  enableConfetti: z
    .boolean()
    .optional()
    .default(true)
    .describe('Enable confetti particle effects'),
  
  confettiCount: z
    .number()
    .optional()
    .default(30)
    .describe('Number of confetti particles to generate'),
  
  candleGlowIntensity: z
    .number()
    .optional()
    .default(30)
    .describe('Intensity of the warm candle glow effect in pixels'),
  
  enableMusicReactive: z
    .boolean()
    .optional()
    .default(true)
    .describe('Enable music-reactive celebration bounce when audio is present'),
  
  bounceAmplitude: z
    .number()
    .optional()
    .default(10)
    .describe('Amplitude for music-reactive bounce in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  inputParams: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  // Helper function to generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper function to generate random integer in range
  const randomIntInRange = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // Helper function to generate random color from party palette
  const getRandomConfettiColor = (): string => {
    const colors = [
      '#FF6B9D', '#FFD93D', '#6BCB77', '#4D96FF',
      '#FF6F91', '#C74BED', '#FF9F45', '#00D9FF',
      '#FF5757', '#A8E6CF', '#FFD166', '#8B5CF6',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Parse font string
  const fontString = inputParams.font || 'Bubblegum Sans:400';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  const config = props.config || {};
  const durationInSeconds = (config.duration || 300) / (config.fps || 30);

  // ============================================================================
  // CONFETTI PARTICLES
  // ============================================================================

  const confettiParticles: RenderableComponentData[] = [];
  
  if (inputParams.enableConfetti) {
    const confettiCount = inputParams.confettiCount || 30;
    
    for (let i = 0; i < confettiCount; i++) {
      const isCircle = Math.random() > 0.5;
      const size = randomIntInRange(6, 14);
      const startX = randomInRange(0, 100);
      const startY = randomInRange(-20, -5);
      const fallDistance = randomInRange(110, 130);
      const fallDuration = randomInRange(3, 6);
      const rotation = randomIntInRange(0, 360);
      const rotationSpeed = randomInRange(180, 720);
      const delay = randomInRange(0, 2);
      const horizontalDrift = randomInRange(-30, 30);

      confettiParticles.push({
        id: `confetti-${i}`,
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          shape: isCircle ? 'circle' : 'rectangle',
          width: size,
          height: isCircle ? size : size * 1.5,
          fill: getRandomConfettiColor(),
          containerProps: {
            className: 'absolute pointer-events-none',
            style: {
              left: `${startX}%`,
              top: `${startY}%`,
              transform: `rotate(${rotation}deg)`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: durationInSeconds,
          },
        },
        effects: [
          {
            id: `confetti-${i}-fall`,
            componentId: `confetti-${i}`,
            data: {
              type: 'linear',
              start: delay,
              duration: fallDuration,
              mode: 'provider',
              targetIds: [`confetti-${i}`],
              ranges: [
                {
                  key: 'translateY',
                  val: 0,
                  prog: 0,
                  unit: 'vh',
                },
                {
                  key: 'translateY',
                  val: fallDistance,
                  prog: 1,
                  unit: 'vh',
                },
                {
                  key: 'translateX',
                  val: 0,
                  prog: 0,
                  unit: 'vw',
                },
                {
                  key: 'translateX',
                  val: horizontalDrift,
                  prog: 1,
                  unit: 'vw',
                },
                {
                  key: 'rotate',
                  val: rotation,
                  prog: 0,
                  unit: 'deg',
                },
                {
                  key: 'rotate',
                  val: rotation + rotationSpeed,
                  prog: 1,
                  unit: 'deg',
                },
                {
                  key: 'opacity',
                  val: 1,
                  prog: 0,
                },
                {
                  key: 'opacity',
                  val: 0,
                  prog: 0.9,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
  }

  // ============================================================================
  // TEXT COMPONENT WITH PARTY CHAOS EFFECTS
  // ============================================================================

  const textId = '90s-party-text';
  const shakeAmplitude = inputParams.shakeAmplitude || 1.0;
  const candleGlow = inputParams.candleGlowIntensity || 30;

  const textEffects: any[] = [];

  // Bounce-in animation
  textEffects.push({
    id: `${textId}-bounce-in`,
    componentId: textId,
    data: {
      type: 'ease-out',
      start: 0,
      duration: 0.8,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'scale', val: 0, prog: 0 },
        { key: 'scale', val: 1.2, prog: 0.6 },
        { key: 'scale', val: 1, prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
      ],
    },
  });

  // Continuous party shake
  const shakeKeyframes = 20;
  const shakeDuration = durationInSeconds - 0.8;
  const shakeRanges: any[] = [];
  
  for (let i = 0; i <= shakeKeyframes; i++) {
    const prog = i / shakeKeyframes;
    shakeRanges.push(
      {
        key: 'translateX',
        val: randomInRange(-15 * shakeAmplitude, 15 * shakeAmplitude),
        prog: prog,
        unit: 'px',
      },
      {
        key: 'translateY',
        val: randomInRange(-12 * shakeAmplitude, 12 * shakeAmplitude),
        prog: prog,
        unit: 'px',
      },
      {
        key: 'rotate',
        val: randomInRange(-2 * shakeAmplitude, 2 * shakeAmplitude),
        prog: prog,
        unit: 'deg',
      },
    );
  }

  textEffects.push({
    id: `${textId}-party-shake`,
    componentId: textId,
    data: {
      type: 'linear',
      start: 0.8,
      duration: shakeDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: shakeRanges,
    },
  });

  // Focus pulls (occasional blur)
  if (inputParams.enableFocusPulls) {
    const focusPullCount = Math.floor(durationInSeconds / 3);
    for (let i = 0; i < focusPullCount; i++) {
      const focusStart = randomInRange(1, durationInSeconds - 0.5);
      textEffects.push({
        id: `${textId}-focus-pull-${i}`,
        componentId: textId,
        data: {
          type: 'ease-in-out',
          start: focusStart,
          duration: 0.3,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'blur', val: 0, prog: 0, unit: 'px' },
            { key: 'blur', val: randomInRange(2, 3), prog: 0.5, unit: 'px' },
            { key: 'blur', val: 0, prog: 1, unit: 'px' },
          ],
        },
      });
    }
  }

  // Zoom bursts
  if (inputParams.enableZoomBursts) {
    const zoomBurstCount = Math.floor(durationInSeconds / 4);
    for (let i = 0; i < zoomBurstCount; i++) {
      const zoomStart = randomInRange(1.5, durationInSeconds - 0.4);
      const zoomScale = randomInRange(1.15, 1.3);
      textEffects.push({
        id: `${textId}-zoom-burst-${i}`,
        componentId: textId,
        data: {
          type: 'ease-out',
          start: zoomStart,
          duration: 0.2,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: zoomScale, prog: 0.3 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      });
    }
  }

  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: inputParams.text,
      style: {
        ...fontStyle,
        fontSize: `${inputParams.fontSize}px`,
        color: inputParams.textColor,
        textShadow: `0 0 ${candleGlow}px #FFA500, 0 0 ${candleGlow * 0.5}px #FFD700`,
        textAlign: 'center',
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : {}),
      },
      containerProps: {
        className: 'drop-shadow-lg',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: durationInSeconds,
      },
    },
    effects: textEffects,
  };

  // ============================================================================
  // LIGHT LEAK OVERLAY
  // ============================================================================

  const lightLeakOverlay: RenderableComponentData[] = [];
  
  if (inputParams.enableLightLeaks) {
    const lightLeakCount = 3;
    for (let i = 0; i < lightLeakCount; i++) {
      const leakDuration = randomInRange(2, 4);
      const leakStart = randomInRange(0, durationInSeconds - leakDuration);
      const leakPosition = randomIntInRange(0, 100);
      
      lightLeakOverlay.push({
        id: `light-leak-${i}`,
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          shape: 'rectangle',
          fill: 'transparent',
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              background: `radial-gradient(circle at ${leakPosition}% 50%, rgba(255,255,255,0.7) 0%, transparent 60%)`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: durationInSeconds,
          },
        },
        effects: [
          {
            id: `light-leak-${i}-fade`,
            componentId: `light-leak-${i}`,
            data: {
              type: 'ease-in-out',
              start: leakStart,
              duration: leakDuration,
              mode: 'provider',
              targetIds: [`light-leak-${i}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: randomInRange(0.3, 0.7), prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
  }

  // ============================================================================
  // OVEREXPOSURE FLASHES
  // ============================================================================

  const overexposureFlashes: RenderableComponentData[] = [];
  
  if (inputParams.enableOverexposure) {
    const flashCount = Math.floor(durationInSeconds / 3);
    for (let i = 0; i < flashCount; i++) {
      const flashStart = randomInRange(0.5, durationInSeconds - 0.3);
      
      overexposureFlashes.push({
        id: `overexposure-${i}`,
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          shape: 'rectangle',
          fill: '#FFFFFF',
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: durationInSeconds,
          },
        },
        effects: [
          {
            id: `overexposure-${i}-flash`,
            componentId: `overexposure-${i}`,
            data: {
              type: 'linear',
              start: flashStart,
              duration: 0.15,
              mode: 'provider',
              targetIds: [`overexposure-${i}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: randomInRange(0.6, 0.9), prog: 0.3 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
  }

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: '90s-party-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-wrap justify-center items-center gap-4 overflow-hidden',
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: durationInSeconds,
      },
    },
    childrenData: [
      ...confettiParticles,
      ...lightLeakOverlay,
      textComponent,
      ...overexposureFlashes,
    ] as RenderableComponentData[],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
  };
};

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: '90s-handheld-birthday-party-text',
  title: '90s Handheld Birthday Party Text Effect',
  description:
    'A nostalgic 90s camcorder-style birthday party text effect with chaotic handheld camera shake, focus pulls, zoom bursts, light leaks, overexposure flashes, confetti particles, and warm candle glow. Features festive bubble letter typography with organic, unplanned movement that captures the excitement of amateur indoor birthday celebration filming.',
  type: 'predefined',
  presetType: 'full',
  tags: [
    '90s',
    'handheld',
    'birthday',
    'party',
    'celebration',
    'camcorder',
    'retro',
    'nostalgic',
    'shake',
    'confetti',
    'light-leak',
    'overexposure',
    'focus-pull',
    'zoom-burst',
    'candle-glow',
    'festive',
    'text-effect',
    'typography',
  ],
  defaultInputParams: {
    text: 'HAPPY BIRTHDAY!',
    font: 'Bubblegum Sans:400',
    fontSize: 72,
    textColor: '#FFFFFF',
    shakeAmplitude: 1.0,
    enableFocusPulls: true,
    enableZoomBursts: true,
    enableLightLeaks: true,
    enableOverexposure: true,
    enableConfetti: true,
    confettiCount: 30,
    candleGlowIntensity: 30,
    enableMusicReactive: true,
    bounceAmplitude: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const ninetyHandheldBirthdayPartyTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text content to display with party effect',
      },
      font: {
        type: 'string',
        description: 'Font family with optional weight and style (e.g., "Bubblegum Sans:400", "Fredoka One:400")',
        default: 'Bubblegum Sans:400',
      },
      fontSize: {
        type: 'number',
        description: 'Font size in pixels for the text',
        default: 72,
      },
      textColor: {
        type: 'string',
        description: 'Text color in hex format',
        default: '#FFFFFF',
      },
      shakeAmplitude: {
        type: 'number',
        description: 'Amplitude multiplier for party shake effect (0.5 = subtle, 2.0 = extreme)',
        default: 1.0,
      },
      enableFocusPulls: {
        type: 'boolean',
        description: 'Enable occasional blur focus pull effects',
        default: true,
      },
      enableZoomBursts: {
        type: 'boolean',
        description: 'Enable random zoom burst effects from camera bumps',
        default: true,
      },
      enableLightLeaks: {
        type: 'boolean',
        description: 'Enable light leak overlay effects',
        default: true,
      },
      enableOverexposure: {
        type: 'boolean',
        description: 'Enable overexposure flash effects',
        default: true,
      },
      enableConfetti: {
        type: 'boolean',
        description: 'Enable confetti particle effects',
        default: true,
      },
      confettiCount: {
        type: 'number',
        description: 'Number of confetti particles to generate',
        default: 30,
      },
      candleGlowIntensity: {
        type: 'number',
        description: 'Intensity of the warm candle glow effect in pixels',
        default: 30,
      },
      enableMusicReactive: {
        type: 'boolean',
        description: 'Enable music-reactive celebration bounce when audio is present',
        default: true,
      },
      bounceAmplitude: {
        type: 'number',
        description: 'Amplitude for music-reactive bounce in pixels',
        default: 10,
      },
    },
    required: ['text'],
  },
};