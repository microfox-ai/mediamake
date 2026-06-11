/**
 * Satellite Signal Corruption Typography Preset
 *
 * This preset simulates degraded 90s satellite signal transmission with text materializing
 * through digital noise. Features include:
 * - Compression artifacts with blocky, pixelated edges that gradually sharpen
 * - Packet loss effects where portions of words temporarily disappear or get replaced with corrupted data blocks
 * - Pink/cyan chroma and luma signal separation that realigns over time
 * - Horizontal tearing effects with sudden resolution drops
 * - Buffer states with loading animation
 * - Authentic digital noise and glitch timing via requestAnimationFrame
 *
 * The preset uses CSS image-rendering:pixelated on scaled-down text atoms that transition to normal,
 * split character spans with random opacity or block character replacements, separate text layers for
 * chroma/luma splits with independent translateX animations, clip-path polygon animations for tearing,
 * and temporary buffer dot animations during glitch states.
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---

const presetParams = z.object({
  text: z.string().describe('Text to display with corruption effects'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Total duration in seconds'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  font: z
    .string()
    .optional()
    .default('monospace')
    .describe(
      'Font family with optional weight and style (e.g., "Courier:700", "monospace")',
    ),
  chromaSeparation: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Maximum chroma/luma separation distance in pixels'),
  pixelationDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Duration of pixelation-to-sharp transition in seconds'),
  packetLossIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe(
      'Intensity of packet loss effects (0 = none, 1 = maximum corruption)',
    ),
  tearingFrequency: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Frequency of horizontal tearing glitches (0 = none, 1 = frequent)'),
  bufferStates: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Number of buffer/loading animation states during duration'),
  noiseOpacity: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.15)
    .describe('Opacity of background noise overlay'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution Function ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    font,
    chromaSeparation,
    pixelationDuration,
    packetLossIntensity,
    tearingFrequency,
    bufferStates,
    noiseOpacity,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'monospace';
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

  // Generate character arrays for packet loss effects
  const characters = text.split('');
  const blockCharacters = ['█', '▓', '▒', '░', '▄', '▀', '▐', '▌'];

  // Helper: Generate random packet loss replacements
  const generatePacketLossText = (
    originalText: string,
    lossIntensity: number,
  ): string => {
    return originalText
      .split('')
      .map(char => {
        if (Math.random() < lossIntensity * 0.5) {
          // 50% chance to replace with block character
          return blockCharacters[
            Math.floor(Math.random() * blockCharacters.length)
          ];
        } else if (Math.random() < lossIntensity * 0.3) {
          // 30% chance to disappear (space)
          return ' ';
        }
        return char;
      })
      .join('');
  };

  // Helper: Generate multiple packet loss states over time
  const packetLossStates = 5; // Number of different corruption states
  const packetLossTexts = Array.from({ length: packetLossStates }, (_, i) => {
    const intensity = packetLossIntensity * (1 - i / packetLossStates); // Decrease intensity over time
    return generatePacketLossText(text, intensity);
  });

  // --- Main Text Layers (Luma + Chroma) ---

  // Luma Layer (White brightness)
  const lumaTextId = 'luma-text';
  const lumaText: RenderableComponentData = {
    id: lumaTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        color: '#ffffff',
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        letterSpacing: '0.05em',
        textShadow: '0 0 10px rgba(255,255,255,0.5)',
        ...fontStyle,
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
        duration,
      },
    },
  };

  // Chroma Pink Layer
  const chromaPinkTextId = 'chroma-pink-text';
  const chromaPinkText: RenderableComponentData = {
    id: chromaPinkTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        color: '#ff69b4',
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        letterSpacing: '0.05em',
        opacity: 0.7,
        ...fontStyle,
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
        duration,
      },
    },
  };

  // Chroma Cyan Layer
  const chromaCyanTextId = 'chroma-cyan-text';
  const chromaCyanText: RenderableComponentData = {
    id: chromaCyanTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        color: '#00ffff',
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        letterSpacing: '0.05em',
        opacity: 0.7,
        ...fontStyle,
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
        duration,
      },
    },
  };

  // --- Layer Containers ---

  const lumaLayerId = 'luma-text-layer';
  const lumaLayer: RenderableComponentData = {
    id: lumaLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          imageRendering: 'pixelated' as any, // Start pixelated
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [lumaText],
  };

  const chromaPinkLayerId = 'chroma-pink-layer';
  const chromaPinkLayer: RenderableComponentData = {
    id: chromaPinkLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [chromaPinkText],
  };

  const chromaCyanLayerId = 'chroma-cyan-layer';
  const chromaCyanLayer: RenderableComponentData = {
    id: chromaCyanLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [chromaCyanText],
  };

  // --- Effects ---

  // 1. Pixelation sharpening effect on luma layer (scale from 0.5 to 1)
  const pixelationEffect = {
    id: 'pixelation-sharpen-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: pixelationDuration,
      mode: 'provider' as const,
      targetIds: [lumaLayerId],
      ranges: [
        { key: 'scale', val: 0.5, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  };

  // 2. Chroma separation effects (oscillating then converging)
  const chromaSeparationDuration = duration * 0.6; // 60% of total duration
  const chromaPinkSeparationEffect = {
    id: 'chroma-pink-separation-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: chromaSeparationDuration,
      mode: 'provider' as const,
      targetIds: [chromaPinkLayerId],
      ranges: [
        { key: 'translateX', val: `${-chromaSeparation}px`, prog: 0 },
        { key: 'translateX', val: `${chromaSeparation}px`, prog: 0.3 },
        { key: 'translateX', val: `${-chromaSeparation * 0.5}px`, prog: 0.6 },
        { key: 'translateX', val: '0px', prog: 1 },
      ],
    },
  };

  const chromaCyanSeparationEffect = {
    id: 'chroma-cyan-separation-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: chromaSeparationDuration,
      mode: 'provider' as const,
      targetIds: [chromaCyanLayerId],
      ranges: [
        { key: 'translateX', val: `${chromaSeparation}px`, prog: 0 },
        { key: 'translateX', val: `${-chromaSeparation}px`, prog: 0.3 },
        { key: 'translateX', val: `${chromaSeparation * 0.5}px`, prog: 0.6 },
        { key: 'translateX', val: '0px', prog: 1 },
      ],
    },
  };

  // 3. Packet loss effects (opacity toggling on text atoms)
  const packetLossEffects: any[] = [];
  const packetLossDuration = 0.2; // 200ms per glitch
  const packetLossCount = Math.floor(
    (duration * packetLossIntensity * 5) / packetLossDuration,
  ); // Dynamic glitch count

  for (let i = 0; i < packetLossCount; i++) {
    const startTime = Math.random() * (duration - packetLossDuration);
    // Random opacity drop
    packetLossEffects.push({
      id: `packet-loss-luma-${i}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: startTime,
        duration: packetLossDuration,
        mode: 'provider' as const,
        targetIds: [lumaTextId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.3, prog: 0.5 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    });
  }

  // 4. Tearing effects on container slices
  const tearingSliceIds = ['tearing-slice-1', 'tearing-slice-2', 'tearing-slice-3'];
  const tearingEffects: any[] = [];
  const tearingCount = Math.floor(duration * tearingFrequency * 2); // Dynamic tearing count

  for (let i = 0; i < tearingCount; i++) {
    const startTime = Math.random() * duration;
    const sliceId = tearingSliceIds[Math.floor(Math.random() * tearingSliceIds.length)];
    const displacement = Math.random() * 20 - 10; // -10px to 10px

    tearingEffects.push({
      id: `tearing-effect-${i}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: startTime,
        duration: 0.1,
        mode: 'provider' as const,
        targetIds: [sliceId],
        ranges: [
          { key: 'translateX', val: '0px', prog: 0 },
          { key: 'translateX', val: `${displacement}px`, prog: 0.5 },
          { key: 'translateX', val: '0px', prog: 1 },
        ],
      },
    });
  }

  // 5. Buffer indicator animation
  const bufferIndicatorId = 'buffer-indicator-container';
  const bufferDotIds = ['buffer-dot-1', 'buffer-dot-2', 'buffer-dot-3'];
  const bufferEffects: any[] = [];
  const bufferDuration = 0.8; // 800ms per buffer state
  const bufferInterval = duration / (bufferStates + 1);

  for (let i = 0; i < bufferStates; i++) {
    const startTime = bufferInterval * (i + 1);

    // Container fade in/out
    bufferEffects.push({
      id: `buffer-container-${i}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: startTime,
        duration: bufferDuration,
        mode: 'provider' as const,
        targetIds: [bufferIndicatorId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.2 },
          { key: 'opacity', val: 1, prog: 0.8 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    });

    // Staggered dot opacity
    bufferDotIds.forEach((dotId, dotIndex) => {
      bufferEffects.push({
        id: `buffer-dot-${i}-${dotIndex}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: startTime + dotIndex * 0.15,
          duration: bufferDuration - dotIndex * 0.15,
          mode: 'provider' as const,
          targetIds: [dotId],
          ranges: [
            { key: 'opacity', val: 0.3, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      });
    });
  }

  // 6. Overall fade-in on main text container
  const mainTextContainerId = 'main-text-container';
  const fadeInEffect = {
    id: 'main-fade-in-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: pixelationDuration,
      mode: 'provider' as const,
      targetIds: [mainTextContainerId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // --- Tearing Overlay Slices ---

  const tearingSlice1: RenderableComponentData = {
    id: tearingSliceIds[0],
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute w-full',
        style: {
          height: '33%',
          top: '0',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
  };

  const tearingSlice2: RenderableComponentData = {
    id: tearingSliceIds[1],
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute w-full',
        style: {
          height: '34%',
          top: '33%',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
  };

  const tearingSlice3: RenderableComponentData = {
    id: tearingSliceIds[2],
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute w-full',
        style: {
          height: '33%',
          top: '67%',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
  };

  const tearingOverlayId = 'tearing-overlay';
  const tearingOverlay: RenderableComponentData = {
    id: tearingOverlayId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [tearingSlice1, tearingSlice2, tearingSlice3],
  };

  // --- Main Text Container ---

  const mainTextContainer: RenderableComponentData = {
    id: mainTextContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [fadeInEffect],
    childrenData: [lumaLayer, chromaPinkLayer, chromaCyanLayer, tearingOverlay],
  };

  // Attach effects to layers
  lumaLayer.effects = [pixelationEffect, ...packetLossEffects];
  chromaPinkLayer.effects = [chromaPinkSeparationEffect];
  chromaCyanLayer.effects = [chromaCyanSeparationEffect];
  tearingSlice1.effects = tearingEffects.filter(e =>
    e.data.targetIds.includes(tearingSliceIds[0]),
  );
  tearingSlice2.effects = tearingEffects.filter(e =>
    e.data.targetIds.includes(tearingSliceIds[1]),
  );
  tearingSlice3.effects = tearingEffects.filter(e =>
    e.data.targetIds.includes(tearingSliceIds[2]),
  );

  // --- Buffer Indicator ---

  const bufferDot1: RenderableComponentData = {
    id: bufferDotIds[0],
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 16px; height: 16px; background-color: #ffffff; border-radius: 50%;"></div>',
      className: '',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const bufferDot2: RenderableComponentData = {
    id: bufferDotIds[1],
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 16px; height: 16px; background-color: #ffffff; border-radius: 50%;"></div>',
      className: '',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const bufferDot3: RenderableComponentData = {
    id: bufferDotIds[2],
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 16px; height: 16px; background-color: #ffffff; border-radius: 50%;"></div>',
      className: '',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const bufferDotsRowId = 'buffer-dots-row';
  const bufferDotsRow: RenderableComponentData = {
    id: bufferDotsRowId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row items-center',
        style: {
          gap: '12px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [bufferDot1, bufferDot2, bufferDot3],
  };

  const bufferIndicatorContainer: RenderableComponentData = {
    id: bufferIndicatorId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          opacity: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: bufferEffects.filter(e =>
      e.data.targetIds.includes(bufferIndicatorId),
    ),
    childrenData: [bufferDotsRow],
  };

  // Attach dot effects
  bufferDot1.effects = bufferEffects.filter(e =>
    e.data.targetIds.includes(bufferDotIds[0]),
  );
  bufferDot2.effects = bufferEffects.filter(e =>
    e.data.targetIds.includes(bufferDotIds[1]),
  );
  bufferDot3.effects = bufferEffects.filter(e =>
    e.data.targetIds.includes(bufferDotIds[2]),
  );

  // --- Noise Overlay ---

  const noiseOverlayId = 'noise-overlay';
  const noiseOverlay: RenderableComponentData = {
    id: noiseOverlayId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          opacity: noiseOpacity,
          mixBlendMode: 'overlay',
          backgroundImage:
            'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIi8+PC9zdmc+)',
          backgroundSize: '200px 200px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
  };

  // --- Scanline Overlay ---

  const scanlineOverlayId = 'scanline-overlay';
  const scanlineOverlay: RenderableComponentData = {
    id: scanlineOverlayId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          opacity: 0.08,
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          backgroundSize: '100% 4px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
  };

  // --- Root Container ---

  const rootContainerId = 'satellite-corruption-root-container';
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden',
        style: {
          background:
            'radial-gradient(ellipse at center, #1e1b4b 0%, #000000 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      noiseOverlay,
      mainTextContainer,
      bufferIndicatorContainer,
      scanlineOverlay,
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
  id: 'satellite-corruption-typography',
  title: 'Satellite Signal Corruption Typography',
  description:
    'A data corruption typography preset simulating degraded 90s satellite signal transmission. Text materializes through digital noise with compression artifacts, pixelated edges that sharpen over time, packet loss effects where portions disappear or show corrupted data blocks, chroma/luma signal separation with pink/cyan color splits, horizontal tearing, resolution drops, and buffering animations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'glitch',
    'corruption',
    'satellite',
    '90s',
    'retro',
    'digital-noise',
    'pixelation',
    'chroma-separation',
    'packet-loss',
    'tearing',
    'buffer',
    'vhs',
  ],
  defaultInputParams: {
    text: 'SIGNAL LOST',
    duration: 10,
    fontSize: 72,
    font: 'monospace',
    chromaSeparation: 5,
    pixelationDuration: 1.5,
    packetLossIntensity: 0.3,
    tearingFrequency: 0.4,
    bufferStates: 2,
    noiseOpacity: 0.15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---

export const satelliteCorruptionTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
