/**
 * Portal Doorway Reveal Preset
 *
 * A sci-fi portal/doorway reveal preset where text appears to exist in another dimension.
 * Two door panels slide apart (left door slides left, right door slides right) revealing
 * glowing, energetic kinetic typography floating in a void with ethereal qualities.
 *
 * Features:
 * - Sliding door panels with gradient styling (gray tones)
 * - Portal glow effect with radial gradient (animated scale + opacity)
 * - Ethereal text with pulsing glow, float animation, and scale reveal
 * - Light rays emanating from portal edges (vertical beams with rotation)
 * - Particle effects (glowing orbs floating around the portal)
 * - Staggered text word reveal with energy buildup
 *
 * Technical Implementation:
 * - BaseLayout root container with black background
 * - Two door panels (left/right) with translateX animations sliding apart
 * - Portal glow using HTMLBlockAtom with radial gradient background
 * - Text container with TextAtom components for each word
 * - Light rays using HTMLBlockAtom with linear gradients and opacity animations
 * - Particles using HTMLBlockAtom with circular glow elements
 * - All effects use provider mode with targetIds
 *
 * Use cases:
 * - Sci-fi title reveals
 * - Dramatic text introductions
 * - Portal/dimensional transition effects
 * - High-energy typography animations
 * - Fantasy or futuristic content openings
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// --- Parameters Schema ---
const presetParams = z.object({
  text: z
    .string()
    .default('ENTER THE VOID')
    .describe('Text to reveal through the portal'),
  duration: z
    .number()
    .min(2)
    .max(15)
    .default(6)
    .describe('Total duration of the portal reveal animation in seconds'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")',
    ),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(72)
    .describe('Font size for the text in pixels'),
  textColor: z
    .string()
    .default('#64C8FF')
    .describe('Color of the text (cyan/blue glow theme)'),
  doorOpenDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration for doors to fully slide open in seconds'),
  textRevealDelay: z
    .number()
    .min(0)
    .max(3)
    .default(1)
    .describe('Delay before text starts revealing (relative to video start)'),
  wordStagger: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Time delay between each word reveal in seconds'),
  portalGlowColor: z
    .string()
    .default('rgba(100, 200, 255, 0.4)')
    .describe('Portal glow color (rgba format recommended)'),
  particleCount: z
    .number()
    .min(0)
    .max(20)
    .default(6)
    .describe('Number of particle effects (0 to disable)'),
  lightRayCount: z
    .number()
    .min(0)
    .max(8)
    .default(4)
    .describe('Number of light rays (0 to disable)'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    font,
    fontSize,
    textColor,
    doorOpenDuration,
    textRevealDelay,
    wordStagger,
    portalGlowColor,
    particleCount,
    lightRayCount,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:700';
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

  // Split text into words
  const words = text.split(' ').filter((w) => w.length > 0);

  // --- Helper: Create word components with staggered reveal effects ---
  const createWordComponents = (): RenderableComponentData[] => {
    return words.map((word, index) => {
      const wordId = `word-${index}`;
      const wordRevealStart = textRevealDelay + index * wordStagger;
      const wordRevealDuration = 0.8;

      // Word reveal effect: scale 0.5→1, opacity 0→1, float animation
      const wordRevealEffect: GenericEffectData = {
        type: 'ease-out',
        start: wordRevealStart,
        duration: wordRevealDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'scale', val: 0.5, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      // Float animation: subtle sine wave translateY
      const floatEffect: GenericEffectData = {
        type: 'linear',
        start: wordRevealStart + wordRevealDuration,
        duration: duration - (wordRevealStart + wordRevealDuration),
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -10, prog: 0.25 },
          { key: 'translateY', val: 0, prog: 0.5 },
          { key: 'translateY', val: 10, prog: 0.75 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      };

      // Pulsing glow effect using textShadow
      const glowPulseEffect: GenericEffectData = {
        type: 'linear',
        start: wordRevealStart + wordRevealDuration,
        duration: duration - (wordRevealStart + wordRevealDuration),
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          {
            key: 'textShadow',
            val: `0 0 20px ${textColor}, 0 0 40px ${textColor}`,
            prog: 0,
          },
          {
            key: 'textShadow',
            val: `0 0 30px ${textColor}, 0 0 60px ${textColor}, 0 0 80px ${textColor}`,
            prog: 0.5,
          },
          {
            key: 'textShadow',
            val: `0 0 20px ${textColor}, 0 0 40px ${textColor}`,
            prog: 1,
          },
        ],
      };

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: fontStyle.fontWeight || 700,
            fontStyle: fontStyle.fontStyle || 'normal',
            marginRight: '0.3em',
            textShadow: `0 0 20px ${textColor}, 0 0 40px ${textColor}`,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['700'],
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
            id: `${wordId}-reveal`,
            componentId: 'generic',
            data: wordRevealEffect,
          },
          {
            id: `${wordId}-float`,
            componentId: 'generic',
            data: floatEffect,
          },
          {
            id: `${wordId}-glow`,
            componentId: 'generic',
            data: glowPulseEffect,
          },
        ],
      } as RenderableComponentData;
    });
  };

  // --- Helper: Create light rays ---
  const createLightRays = (): RenderableComponentData[] => {
    const rays: RenderableComponentData[] = [];
    const positions = [0.25, 0.33, 0.67, 0.75];

    for (let i = 0; i < Math.min(lightRayCount, 4); i++) {
      const rayId = `light-ray-${i}`;
      const leftPos = `${positions[i] * 100}%`;

      // Rotation animation
      const rotationEffect: GenericEffectData = {
        type: 'linear',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [rayId],
        ranges: [
          { key: 'rotate', val: -5, prog: 0 },
          { key: 'rotate', val: 5, prog: 0.5 },
          { key: 'rotate', val: -5, prog: 1 },
        ],
      };

      // Opacity pulsing
      const opacityEffect: GenericEffectData = {
        type: 'linear',
        start: 0.5,
        duration: duration - 0.5,
        mode: 'provider',
        targetIds: [rayId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.6, prog: 0.3 },
          { key: 'opacity', val: 0.4, prog: 0.6 },
          { key: 'opacity', val: 0.6, prog: 1 },
        ],
      };

      rays.push({
        id: rayId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style='width: ${3 + i}px; height: 100%; background: linear-gradient(to bottom, transparent, rgba(100, 200, 255, 0.6), transparent);'></div>`,
          className: 'absolute top-0',
          style: {
            left: leftPos,
            transformOrigin: 'center center',
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
            id: `${rayId}-rotation`,
            componentId: 'generic',
            data: rotationEffect,
          },
          {
            id: `${rayId}-opacity`,
            componentId: 'generic',
            data: opacityEffect,
          },
        ],
      } as RenderableComponentData);
    }

    return rays;
  };

  // --- Helper: Create particles ---
  const createParticles = (): RenderableComponentData[] => {
    const particles: RenderableComponentData[] = [];
    const particlePositions = [
      { left: '20%', top: '30%' },
      { left: '70%', top: '40%' },
      { left: '45%', top: '60%' },
      { left: '30%', top: '70%' },
      { left: '60%', top: '25%' },
      { left: '80%', top: '65%' },
    ];

    for (let i = 0; i < Math.min(particleCount, 6); i++) {
      const particleId = `particle-${i}`;
      const pos = particlePositions[i];

      // Float animation
      const floatEffect: GenericEffectData = {
        type: 'linear',
        start: 0.8,
        duration: duration - 0.8,
        mode: 'provider',
        targetIds: [particleId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -20, prog: 0.33 },
          { key: 'translateY', val: 0, prog: 0.66 },
          { key: 'translateY', val: 20, prog: 1 },
        ],
      };

      // Opacity pulse
      const pulseEffect: GenericEffectData = {
        type: 'linear',
        start: 0.8,
        duration: duration - 0.8,
        mode: 'provider',
        targetIds: [particleId],
        ranges: [
          { key: 'opacity', val: 0.5, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.5 },
          { key: 'opacity', val: 0.5, prog: 1 },
        ],
      };

      const size = 4 + Math.floor(Math.random() * 3);

      particles.push({
        id: particleId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style='width: ${size}px; height: ${size}px; background: rgba(100, 200, 255, 0.8); border-radius: 50%; box-shadow: 0 0 10px rgba(100, 200, 255, 0.8);'></div>`,
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
            id: `${particleId}-float`,
            componentId: 'generic',
            data: floatEffect,
          },
          {
            id: `${particleId}-pulse`,
            componentId: 'generic',
            data: pulseEffect,
          },
        ],
      } as RenderableComponentData);
    }

    return particles;
  };

  // --- Portal Glow Effect ---
  const portalGlowId = 'portal-glow';
  const portalGlowScaleEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: doorOpenDuration,
    mode: 'provider',
    targetIds: [portalGlowId],
    ranges: [
      { key: 'scale', val: 0.5, prog: 0 },
      { key: 'scale', val: 1.2, prog: 1 },
    ],
  };

  const portalGlowOpacityEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: doorOpenDuration,
    mode: 'provider',
    targetIds: [portalGlowId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  const portalGlowComponent: RenderableComponentData = {
    id: portalGlowId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style='width: 100%; height: 100%; background: radial-gradient(ellipse at center, ${portalGlowColor} 0%, rgba(50, 150, 255, 0.2) 30%, transparent 70%);'></div>`,
      className: 'absolute inset-0',
      style: {
        zIndex: 10,
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
        id: `${portalGlowId}-scale`,
        componentId: 'generic',
        data: portalGlowScaleEffect,
      },
      {
        id: `${portalGlowId}-opacity`,
        componentId: 'generic',
        data: portalGlowOpacityEffect,
      },
    ],
  };

  // --- Door Panels ---
  const leftDoorId = 'left-door';
  const leftDoorSlideEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: doorOpenDuration,
    mode: 'provider',
    targetIds: [leftDoorId],
    ranges: [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: -100, prog: 1 },
    ],
  };

  const leftDoorComponent: RenderableComponentData = {
    id: leftDoorId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-gray-900 to-gray-800',
        style: {
          zIndex: 20,
        },
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
        id: `${leftDoorId}-slide`,
        componentId: 'generic',
        data: leftDoorSlideEffect,
      },
    ],
    childrenData: [],
  };

  const rightDoorId = 'right-door';
  const rightDoorSlideEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: doorOpenDuration,
    mode: 'provider',
    targetIds: [rightDoorId],
    ranges: [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: 100, prog: 1 },
    ],
  };

  const rightDoorComponent: RenderableComponentData = {
    id: rightDoorId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-gray-900 to-gray-800',
        style: {
          zIndex: 20,
        },
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
        id: `${rightDoorId}-slide`,
        componentId: 'generic',
        data: rightDoorSlideEffect,
      },
    ],
    childrenData: [],
  };

  // --- Light Rays Container ---
  const lightRaysContainer: RenderableComponentData = {
    id: 'light-rays-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 15,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: createLightRays(),
  };

  // --- Particles Container ---
  const particlesContainer: RenderableComponentData = {
    id: 'particles-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 12,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: createParticles(),
  };

  // --- Text Container ---
  const textContainer: RenderableComponentData = {
    id: 'text-dimension-container',
    type: 'layout' as const,
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
        id: 'text-words-wrapper',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-wrap gap-4 justify-center items-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: createWordComponents(),
      } as RenderableComponentData,
    ],
  };

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: 'portal-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      portalGlowComponent,
      leftDoorComponent,
      rightDoorComponent,
      lightRaysContainer,
      particlesContainer,
      textContainer,
    ],
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'portal-doorway-reveal',
  title: 'Portal Doorway Reveal',
  description:
    'A sci-fi portal/doorway reveal preset where text appears to exist in another dimension. Two door panels slide apart revealing glowing, energetic kinetic typography floating in a void with ethereal qualities - pulsing, floating with energy waves. Includes particle effects and light rays emanating from portal edges for dramatic effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'portal',
    'doorway',
    'reveal',
    'sci-fi',
    'kinetic',
    'typography',
    'glow',
    'particles',
    'light-rays',
    'dramatic',
    'ethereal',
    'dimensional',
    'floating',
    'pulsing',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'ENTER THE VOID',
    duration: 6,
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#64C8FF',
    doorOpenDuration: 2,
    textRevealDelay: 1,
    wordStagger: 0.2,
    portalGlowColor: 'rgba(100, 200, 255, 0.4)',
    particleCount: 6,
    lightRayCount: 4,
  },
};

// --- Export ---
export const portalDoorwayRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
