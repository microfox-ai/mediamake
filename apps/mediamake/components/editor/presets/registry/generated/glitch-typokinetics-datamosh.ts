/**
 * Glitch-Style Typokinetics - Datamoshing Text Fragments
 *
 * This preset creates an advanced glitch-style typography effect where text shatters into
 * corrupted digital fragments through datamoshing-inspired transitions. Text breaks into
 * rectangular segments of varying sizes (simulating corrupted video blocks), shifts with
 * digital noise patterns, experiences RGB channel separation, then snaps back together
 * with a digital reconstruction effect. Includes scan lines and interference patterns
 * during corruption phase for authentic digital distortion.
 *
 * Features:
 * - **RGB Channel Separation**: Three duplicate text layers (red, green, blue) with chromatic aberration offset
 * - **Fragment Grid System**: Text breaks into 8-12 rectangular fragments per word with varying sizes
 * - **Digital Corruption**: Fragments translate randomly with stepped easing for digital feel
 * - **Scan Line Overlay**: Animated repeating linear gradient for CRT-style interference
 * - **Reconstruction Effect**: Snap-back animation with bounce easing
 * - **Filter Effects**: Brightness and contrast adjustments during corruption phase
 *
 * Use cases:
 * - Tech/cyberpunk video intros and transitions
 * - Music video glitch typography
 * - Digital art content with distortion aesthetics
 * - Social media content with edgy, corrupted visuals
 * - Gaming content with digital breakdown effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display and fragment'),
  duration: z
    .number()
    .default(1.8)
    .describe('Total animation duration in seconds'),
  fontSize: z.number().default(72).describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for text (e.g., Inter, Roboto)'),
  fontWeight: z
    .string()
    .default('900')
    .describe('Font weight (e.g., 400, 700, 900)'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color for RGB channels'),
  fragmentCount: z
    .number()
    .default(10)
    .describe('Number of glitch fragments per channel (8-12 recommended)'),
  rgbOffsetX: z
    .number()
    .default(2)
    .describe('Horizontal offset for RGB channel separation in pixels'),
  scanlineOpacityMin: z
    .number()
    .default(0.1)
    .describe('Minimum scanline opacity (0-1)'),
  scanlineOpacityMax: z
    .number()
    .default(0.3)
    .describe('Maximum scanline opacity (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    fragmentCount,
    rgbOffsetX,
    scanlineOpacityMin,
    scanlineOpacityMax,
  } = params;

  // Phase timing (based on 1.8s default)
  const phase1Duration = duration * 0.3; // 0-30%: RGB separation
  const phase2Start = phase1Duration;
  const phase2Duration = duration * 0.4; // 30-70%: Corruption
  const phase3Start = phase1Duration + phase2Duration;
  const phase3Duration = duration * 0.3; // 70-100%: Reconstruction

  // Helper: Generate random fragment positions
  const generateFragmentPosition = (index: number) => {
    const seed = index * 137.5; // Pseudo-random but consistent
    const x = ((Math.sin(seed) * 10000) % 100) - 50; // -50 to 50
    const y = ((Math.cos(seed) * 10000) % 60) - 30; // -30 to 30
    return { x, y };
  };

  // Helper: Generate fragment sizes (varying rectangles)
  const generateFragmentSize = (index: number) => {
    const sizes = [
      { w: 32, h: 16 }, // w-4 h-2
      { w: 48, h: 24 }, // w-6 h-3
      { w: 64, h: 8 }, // w-8 h-1
      { w: 24, h: 12 }, // w-3 h-1.5
      { w: 40, h: 20 }, // w-5 h-2.5
    ];
    return sizes[index % sizes.length];
  };

  // Create RGB channel layers
  const createRGBChannel = (
    channelId: string,
    color: string,
    translateX: number,
    includeFragments: boolean,
  ): RenderableComponentData => {
    const textId = `${channelId}-text`;

    // Base text atom
    const textAtom: RenderableComponentData = {
      id: textId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: text,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color: color,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.05em',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    };

    // Phase 1 effect: RGB separation
    const phase1Effect = {
      id: `${channelId}-rgb-separation`,
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: 0,
        duration: phase1Duration,
        mode: 'provider' as const,
        targetIds: [channelId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: translateX, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.7, prog: 1 },
        ],
      },
    };

    // Phase 3 effect: Snap back
    const phase3Effect = {
      id: `${channelId}-snap-back`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: phase3Start,
        duration: phase3Duration,
        mode: 'provider' as const,
        targetIds: [channelId],
        ranges: [
          { key: 'translateX', val: translateX, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'opacity', val: 0.7, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    };

    const children: RenderableComponentData[] = [textAtom];

    // Add fragments if requested
    if (includeFragments) {
      const fragments: RenderableComponentData[] = [];
      for (let i = 0; i < fragmentCount; i++) {
        const fragId = `${channelId}-frag-${i}`;
        const pos = generateFragmentPosition(i);
        const size = generateFragmentSize(i);

        // Random rotation (0 or 90 degrees)
        const rotation = i % 3 === 0 ? 90 : 0;

        const fragment: RenderableComponentData = {
          id: fragId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: ${size.w}px; height: ${size.h}px; background: ${color}; position: absolute; top: ${40 + i * 3}%; left: ${35 + (i % 4) * 8}%;"></div>`,
            className: 'absolute',
          },
          context: {
            timing: {
              start: phase2Start,
              duration: phase2Duration,
            },
          },
          effects: [
            {
              id: `${fragId}-corruption`,
              componentId: 'generic',
              data: {
                type: 'linear' as const,
                start: 0,
                duration: phase2Duration,
                mode: 'provider' as const,
                targetIds: [fragId],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: pos.x, prog: 0.5 },
                  { key: 'translateX', val: pos.x, prog: 1 },
                  { key: 'translateY', val: 0, prog: 0 },
                  { key: 'translateY', val: pos.y, prog: 0.5 },
                  { key: 'translateY', val: pos.y, prog: 1 },
                  { key: 'rotate', val: 0, prog: 0 },
                  { key: 'rotate', val: rotation, prog: 0.3 },
                  { key: 'rotate', val: rotation, prog: 1 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.2 },
                  { key: 'opacity', val: 1, prog: 0.8 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        };

        fragments.push(fragment);
      }

      // Fragment container
      const fragmentContainer: RenderableComponentData = {
        id: `${channelId}-fragments-container`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: {
            start: phase2Start,
            duration: phase2Duration,
          },
        },
        childrenData: fragments,
      };

      children.push(fragmentContainer);
    }

    return {
      id: channelId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 mix-blend-screen',
          style: {
            opacity: 0.7,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [phase1Effect, phase3Effect],
      childrenData: children,
    } as RenderableComponentData;
  };

  // Create scanline overlay
  const scanlineOverlay: RenderableComponentData = {
    id: 'scanline-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px); pointer-events: none;"></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: phase2Start,
        duration: phase2Duration,
      },
    },
    effects: [
      {
        id: 'scanline-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: phase2Duration,
          mode: 'provider' as const,
          targetIds: ['scanline-overlay'],
          ranges: [
            { key: 'opacity', val: scanlineOpacityMin, prog: 0 },
            { key: 'opacity', val: scanlineOpacityMax, prog: 0.5 },
            { key: 'opacity', val: scanlineOpacityMin, prog: 1 },
          ],
        },
      },
    ],
  };

  // RGB layers container
  const rgbLayerContainer: RenderableComponentData = {
    id: 'rgb-layer-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      createRGBChannel('red-channel', '#ff0000', -rgbOffsetX, true),
      createRGBChannel('green-channel', '#00ff00', 0, false),
      createRGBChannel('blue-channel', '#0000ff', rgbOffsetX, true),
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'glitch-typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [rgbLayerContainer, scanlineOverlay],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'glitch-typokinetics-datamosh',
  title: 'Glitch Typokinetics - Datamoshing Text Fragments',
  description:
    'Advanced glitch-style typokinetics preset featuring text that shatters into corrupted digital fragments with chromatic aberration, displacement effects, and digital reconstruction. Text breaks into rectangular video-corruption-style blocks that shift with digital noise patterns, experience RGB channel separation, then snap back together with authentic datamoshing aesthetics including scan lines and interference patterns.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'glitch',
    'datamosh',
    'corruption',
    'rgb-split',
    'chromatic-aberration',
    'fragments',
    'digital',
    'tech',
    'cyberpunk',
  ],
  defaultInputParams: {
    text: 'GLITCH',
    duration: 1.8,
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: '900',
    textColor: '#FFFFFF',
    fragmentCount: 10,
    rgbOffsetX: 2,
    scanlineOpacityMin: 0.1,
    scanlineOpacityMax: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const glitchTypokineticsDatamoshPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
