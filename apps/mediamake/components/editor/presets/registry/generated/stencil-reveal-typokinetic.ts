/**
 * Stencil Reveal Typokinetic Preset
 *
 * This preset creates a spray-paint stencil reveal effect that mimics graffiti art.
 * Features aggressive, quick appearance on the downbeat with texture, color variation,
 * and spray particle effects.
 *
 * Features:
 * - **Rapid Opacity Fade-In**: 0 to 1 over 50ms for instant impact
 * - **Grainy Texture Overlay**: Noise overlay simulating spray paint particles
 * - **Color Variation**: Gradient with uneven paint coverage simulation
 * - **Blur-to-Sharp Focus**: 2px to 0 blur transition suggesting paint settling
 * - **Rough Expanded Edges**: Slight scale animation for expansion feel
 * - **Spray Particle Effects**: Random particle divs with staggered opacity animations
 * - **Drop Shadow**: Adds depth to the stencil effect
 *
 * Use cases:
 * - Creating graffiti-style text reveals
 * - Urban/street art video intros
 * - Music video typography
 * - Social media content with edgy aesthetics
 * - High-energy title sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().describe('Text to display with stencil reveal effect'),
  duration: z.number().default(2).describe('Total duration in seconds'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Primary text color (e.g., "#FFFFFF")'),
  fontSize: z
    .number()
    .default(96)
    .describe('Font size in pixels for the text'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe(
      'Font family to use (e.g., "Inter", "Roboto", "BebasNeue:700:normal")',
    ),
  noiseTextureSrc: z
    .string()
    .optional()
    .describe(
      'URL to noise texture image for grainy overlay (optional, defaults to data URI)',
    ),
  sprayParticleCount: z
    .number()
    .default(8)
    .min(0)
    .max(20)
    .describe('Number of spray particle effects around text edges'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
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

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(
    params.fontFamily || 'Inter',
  );

  // Generate spray particles
  const generateSprayParticles = () => {
    const particles: RenderableComponentData[] = [];
    const particlePositions = [
      { top: '20%', left: '10%', size: 8 },
      { top: '30%', right: '15%', size: 6 },
      { top: '50%', left: '5%', size: 10 },
      { bottom: '25%', right: '8%', size: 7 },
      { top: '15%', right: '20%', size: 9 },
      { bottom: '30%', left: '12%', size: 5 },
      { top: '40%', right: '10%', size: 8 },
      { bottom: '20%', left: '18%', size: 6 },
    ];

    for (let i = 0; i < params.sprayParticleCount; i++) {
      const position = particlePositions[i % particlePositions.length];
      const startDelay = i * 0.02;

      particles.push({
        id: `particle-${i}`,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${position.size}px; height: ${position.size}px; background-color: currentColor; border-radius: 50%;"></div>`,
          className: 'absolute pointer-events-none',
          style: {
            top: position.top,
            left: position.left,
            right: position.right,
            bottom: position.bottom,
            color: params.textColor,
          },
        },
        context: {
          timing: {
            start: startDelay,
            duration: 0.2,
          },
        },
        effects: [
          {
            id: `particle-opacity-${i}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: 0.2,
              mode: 'provider',
              targetIds: [`particle-${i}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.3, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return particles;
  };

  // Default noise texture (simple data URI for grainy effect)
  const defaultNoiseTexture =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" /%3E%3C/filter%3E%3Crect width="200" height="200" filter="url(%23noise)" opacity="0.5"/%3E%3C/svg%3E';

  const noiseTextureSrc = params.noiseTextureSrc || defaultNoiseTexture;

  // Text container with effects
  const textContainerId = 'stencil-text-container';
  const textAtomId = 'stencil-text-atom';

  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      {
        id: textAtomId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: params.text,
          className: 'font-black uppercase',
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            ...fontStyle,
            letterSpacing: '0.05em',
            filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.6))',
            background: `linear-gradient(135deg, currentColor 0%, currentColor 60%, rgba(0,0,0,0.8) 100%)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [
          // Rapid opacity fade-in (0 to 1 over 50ms)
          {
            id: 'stencil-opacity-fade',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: 0.05,
              mode: 'provider',
              targetIds: [textAtomId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
    effects: [
      // Blur to sharp focus (2px to 0) over 100ms
      {
        id: 'stencil-blur-focus',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.1,
          mode: 'provider',
          targetIds: [textContainerId],
          ranges: [
            { key: 'filter', val: 'blur(2px) contrast(0.8)', prog: 0 },
            { key: 'filter', val: 'blur(0px) contrast(1)', prog: 1 },
          ],
        },
      },
      // Scale expansion (0.95 to 1.0) over 100ms
      {
        id: 'stencil-scale-expand',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.1,
          mode: 'provider',
          targetIds: [textContainerId],
          ranges: [
            { key: 'scale', val: 0.95, prog: 0 },
            { key: 'scale', val: 1.0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Noise overlay
  const noiseOverlay: RenderableComponentData = {
    id: 'noise-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background-image: url('${noiseTextureSrc}'); background-size: cover; background-repeat: repeat; mix-blend-mode: multiply; opacity: 0.2; pointer-events: none;"></div>`,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        mixBlendMode: 'multiply',
        opacity: 0.2,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  // Generate spray particles
  const sprayParticles = generateSprayParticles();

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'stencil-reveal-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      textContainer,
      noiseOverlay,
      ...sprayParticles,
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

const presetMetadata: PresetMetadata = {
  id: 'stencil-reveal-typokinetic',
  title: 'Stencil Reveal Typokinetic',
  description:
    'A spray-paint stencil reveal effect that mimics graffiti art with aggressive, quick appearance on the downbeat. Features rapid opacity fade-in (50ms), grainy texture overlay, uneven gradient color coverage, blur-to-sharp focus pull, rough expanded edges, and subtle scale expansion. Simulates high-speed filmed spray paint particles with staggered opacity animations and texture depth.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'stencil',
    'graffiti',
    'spray-paint',
    'urban',
    'street-art',
    'texture',
    'particles',
    'reveal',
  ],
  defaultInputParams: {
    text: 'SPRAY PAINT',
    duration: 2,
    textColor: '#FFFFFF',
    fontSize: 96,
    fontFamily: 'Inter',
    sprayParticleCount: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const stencilRevealTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
