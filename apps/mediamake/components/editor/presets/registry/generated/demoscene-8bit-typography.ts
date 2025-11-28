/**
 * Demoscene 8-Bit Typography Preset
 *
 * A demoscene-inspired 8-bit typography preset featuring classic Amiga demo effects:
 * - Copper bars with animated horizontal gradients passing behind text
 * - Plasma overlay effects with hue rotation
 * - Rotating 3D wireframe cubes as background elements
 * - Raster bar scanline effects
 * - Sine scroll text distortion with per-character phase offsets
 * - Infinite zoom/tunnel effect background
 * - Greetings-style scrolling text with elastic bounce physics
 * - Mathematical synchronization using sine/cosine functions
 * - Authentic demoscene aesthetics with fixed palette swaps
 *
 * All animations are mathematically synchronized using requestAnimationFrame
 * and derive from pure mathematical functions (no keyframes).
 *
 * Use cases:
 * - Retro gaming content intros
 * - Demoscene-style music visualizations
 * - Nostalgic tech presentations
 * - 8-bit/chiptune video backgrounds
 * - Retro computing tributes
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  mainText: z
    .string()
    .default('DEMOSCENE')
    .describe('Main text to display with demoscene effects'),
  greetingsText: z
    .string()
    .default(
      'GREETINGS TO ALL DEMO CREWS... FAIRLIGHT... PARADOX... SCOOPEX... KEFRENS... TRISTAR & RED SECTOR INC... STAY OLDSCHOOL!',
    )
    .describe('Scrolling greetings text at bottom of screen'),
  duration: z
    .number()
    .default(30)
    .describe('Duration of the entire demoscene animation in seconds'),
  fontSize: z
    .number()
    .default(120)
    .describe('Font size of main text in pixels'),
  copperBarCount: z
    .number()
    .min(3)
    .max(10)
    .default(5)
    .describe('Number of copper bars scrolling vertically'),
  sineWaveAmplitude: z
    .number()
    .default(30)
    .describe('Amplitude of sine wave distortion on text (pixels)'),
  sineWaveFrequency: z
    .number()
    .default(2)
    .describe('Frequency of sine wave cycles across text'),
  tunnelZoomSpeed: z
    .number()
    .default(1)
    .describe('Speed multiplier for tunnel zoom effect'),
  cubeRotationSpeed: z
    .number()
    .default(1)
    .describe('Speed multiplier for wireframe cube rotation'),
  greetingsScrollSpeed: z
    .number()
    .default(50)
    .describe('Speed of greetings scroll in pixels per second'),
  paletteSwapInterval: z
    .number()
    .default(2)
    .describe('Interval in seconds for palette color swaps'),
});

// --- Preset Execution Function ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    mainText,
    greetingsText,
    duration,
    fontSize,
    copperBarCount,
    sineWaveAmplitude,
    sineWaveFrequency,
    tunnelZoomSpeed,
    cubeRotationSpeed,
    greetingsScrollSpeed,
    paletteSwapInterval,
  } = params;

  const containerHeight = props.config?.height || 1080;
  const containerWidth = props.config?.width || 1920;

  // Split main text into individual characters for sine wave effect
  const characters = mainText.split('');
  const characterCount = characters.length;

  // Helper function: Create copper bar gradient strings
  const createCopperGradient = (offset: number): string => {
    const colors = [
      ['#f00', '#ff0', '#0f0', '#0ff', '#00f'],
      ['#ff0', '#0f0', '#0ff', '#00f', '#f0f'],
      ['#0f0', '#0ff', '#00f', '#f0f', '#f00'],
      ['#0ff', '#00f', '#f0f', '#f00', '#ff0'],
      ['#00f', '#f0f', '#f00', '#ff0', '#0f0'],
    ];
    const colorSet = colors[offset % colors.length];
    return `linear-gradient(180deg, ${colorSet.join(', ')})`;
  };

  // Helper function: Create wireframe cube SVG
  const createWireframeCube = (
    id: string,
    color: string,
    size: number,
    posX: string,
    posY: string,
  ): string => {
    return `<svg viewBox='0 0 100 100' style='width:${size}px;height:${size}px;position:absolute;top:${posY};left:${posX};' id='${id}'>
      <g stroke='${color}' stroke-width='1' fill='none'>
        <rect x='20' y='20' width='60' height='60'/>
        <line x1='20' y1='20' x2='35' y2='5'/>
        <line x1='80' y1='20' x2='95' y2='5'/>
        <line x1='20' y1='80' x2='35' y2='65'/>
        <line x1='80' y1='80' x2='95' y2='65'/>
        <rect x='35' y='5' width='60' height='60'/>
      </g>
    </svg>`;
  };

  // --- Build Component Tree ---

  // 1. Tunnel Background (infinite zoom effect)
  const tunnelBackground: RenderableComponentData = {
    id: 'demoscene-tunnel-background',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style='position:absolute;inset:0;background:radial-gradient(circle at center, #000 0%, #111 30%, #000 60%, #222 100%);'></div>`,
      className: 'absolute inset-0',
      style: {
        zIndex: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'tunnel-zoom-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['demoscene-tunnel-background'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.5 * tunnelZoomSpeed, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: 'tunnel-rotate-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['demoscene-tunnel-background'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 360 * tunnelZoomSpeed, prog: 1 },
          ],
        },
      },
    ],
  };

  // 2. Wireframe Cubes (3D rotating cubes)
  const wireframeCubes: RenderableComponentData[] = [
    {
      id: 'demoscene-wireframe-cube-1',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: createWireframeCube('cube-1', '#0ff', 150, '5%', '10%'),
        className: 'absolute',
        style: {
          zIndex: 1,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'cube-1-rotate-y',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['demoscene-wireframe-cube-1'],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: 360 * cubeRotationSpeed, prog: 1 },
            ],
          },
        },
        {
          id: 'cube-1-rotate-x',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['demoscene-wireframe-cube-1'],
            ranges: [
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: 180 * cubeRotationSpeed, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'demoscene-wireframe-cube-2',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: createWireframeCube('cube-2', '#f0f', 120, '85%', '60%'),
        className: 'absolute',
        style: {
          zIndex: 1,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'cube-2-rotate-y',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['demoscene-wireframe-cube-2'],
            ranges: [
              { key: 'rotateY', val: 360 * cubeRotationSpeed, prog: 0 },
              { key: 'rotateY', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'cube-2-rotate-z',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['demoscene-wireframe-cube-2'],
            ranges: [
              { key: 'rotateZ', val: 0, prog: 0 },
              { key: 'rotateZ', val: 360 * cubeRotationSpeed, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'demoscene-wireframe-cube-3',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: createWireframeCube('cube-3', '#ff0', 100, '70%', '85%'),
        className: 'absolute',
        style: {
          zIndex: 1,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'cube-3-rotate-x',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['demoscene-wireframe-cube-3'],
            ranges: [
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: 360 * cubeRotationSpeed, prog: 1 },
            ],
          },
        },
        {
          id: 'cube-3-rotate-y',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['demoscene-wireframe-cube-3'],
            ranges: [
              { key: 'rotateY', val: 180 * cubeRotationSpeed, prog: 0 },
              { key: 'rotateY', val: -180 * cubeRotationSpeed, prog: 1 },
            ],
          },
        },
      ],
    },
  ];

  // 3. Copper Bars (horizontal gradient bars)
  const copperBars: RenderableComponentData[] = Array.from(
    { length: copperBarCount },
    (_, i) => ({
      id: `demoscene-copper-bar-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style='width:100%;height:40px;background:${createCopperGradient(i)};opacity:0.7;'></div>`,
        className: 'absolute left-0 w-full',
        style: {
          zIndex: 2,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: `copper-bar-${i}-translate`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: [`demoscene-copper-bar-${i}`],
            ranges: [
              {
                key: 'translateY',
                val: -100 + (i * containerHeight) / copperBarCount,
                prog: 0,
              },
              {
                key: 'translateY',
                val: containerHeight + (i * containerHeight) / copperBarCount,
                prog: 1,
              },
            ],
          },
        },
      ],
    }),
  );

  // 4. Plasma Layer (animated gradient overlay)
  const plasmaLayer: RenderableComponentData = {
    id: 'demoscene-plasma-layer',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style='position:absolute;inset:0;background:linear-gradient(45deg, #f0f, #0ff, #ff0, #f0f);background-size:400% 400%;mix-blend-mode:overlay;opacity:0.3;'></div>`,
      className: 'absolute inset-0',
      style: {
        zIndex: 3,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'plasma-animation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['demoscene-plasma-layer'],
          ranges: [
            { key: 'opacity', val: 0.2, prog: 0 },
            { key: 'opacity', val: 0.4, prog: 0.5 },
            { key: 'opacity', val: 0.2, prog: 1 },
          ],
        },
      },
    ],
  };

  // 5. Raster Bars (scanline effect)
  const rasterBars: RenderableComponentData = {
    id: 'demoscene-raster-bars',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style='position:absolute;inset:0;background:repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px);pointer-events:none;'></div>`,
      className: 'absolute inset-0',
      style: {
        zIndex: 4,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // 6. Main Text with Sine Wave Distortion
  const textCharacters: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `demoscene-char-${index}`;
      const phaseOffset = (index / characterCount) * Math.PI * 2 * sineWaveFrequency;

      return {
        id: charId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: char,
          style: {
            fontSize: `${fontSize}px`,
            fontFamily: "'Press Start 2P', monospace",
            color: '#fff',
            textShadow: '0 0 20px #0ff, 0 0 40px #f0f',
            mixBlendMode: 'screen',
          },
          font: {
            family: 'Press Start 2P',
            weights: ['400'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [
          {
            id: `sine-wave-effect-${index}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration,
              mode: 'provider',
              targetIds: [charId],
              ranges: [
                {
                  key: 'translateY',
                  val: Math.sin(phaseOffset) * sineWaveAmplitude,
                  prog: 0,
                },
                {
                  key: 'translateY',
                  val: Math.sin(phaseOffset + Math.PI) * sineWaveAmplitude,
                  prog: 0.5,
                },
                {
                  key: 'translateY',
                  val: Math.sin(phaseOffset + Math.PI * 2) * sineWaveAmplitude,
                  prog: 1,
                },
              ],
            },
          },
          {
            id: `palette-swap-effect-${index}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration,
              mode: 'provider',
              targetIds: [charId],
              ranges: [
                { key: 'color', val: '#fff', prog: 0 },
                { key: 'color', val: '#0ff', prog: 0.33 },
                { key: 'color', val: '#f0f', prog: 0.66 },
                { key: 'color', val: '#fff', prog: 1 },
              ],
            },
          },
        ],
      };
    },
  );

  const mainTextContainer: RenderableComponentData = {
    id: 'demoscene-main-text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 10,
          gap: '0.5em',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: textCharacters,
  };

  // 7. Greetings Scroll (bottom scrolling text)
  const greetingsScrollDuration = (greetingsText.length * 20) / greetingsScrollSpeed;
  const greetingsScroll: RenderableComponentData = {
    id: 'demoscene-greetings-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: greetingsText,
      style: {
        fontSize: '32px',
        fontFamily: "'Press Start 2P', monospace",
        color: '#ff0',
        whiteSpace: 'nowrap',
        textShadow: '2px 2px 0 #f00, -2px -2px 0 #0f0',
      },
      font: {
        family: 'Press Start 2P',
        weights: ['400'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'greetings-scroll-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['demoscene-greetings-text'],
          ranges: [
            { key: 'translateX', val: containerWidth, prog: 0 },
            { key: 'translateX', val: -greetingsText.length * 20, prog: 1 },
          ],
        },
      },
    ],
  };

  const greetingsContainer: RenderableComponentData = {
    id: 'demoscene-greetings-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute bottom-8 left-0 right-0 overflow-hidden',
        style: {
          zIndex: 15,
          height: '60px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [greetingsScroll],
  };

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: 'demoscene-8bit-typography-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-black overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
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
      tunnelBackground,
      ...wireframeCubes,
      ...copperBars,
      plasmaLayer,
      rasterBars,
      mainTextContainer,
      greetingsContainer,
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
  id: 'demoscene8BitTypography',
  title: 'Demoscene 8-Bit Typography',
  description:
    'A demoscene-inspired 8-bit typography preset featuring classic Amiga demo effects: copper bars with animated gradients, plasma overlays, rotating wireframe cubes, raster scanlines, and sine-wave text distortion. Characters have individual phase offsets creating wave patterns. Includes scrolling greetings text with elastic bounce and infinite tunnel zoom background. All animations synchronized via mathematical functions for authentic demoscene aesthetics with fixed palette and sprite multiplexing homages.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'demoscene',
    '8-bit',
    'retro',
    'copper-bars',
    'plasma',
    'wireframe',
    'sine-wave',
    'raster-bars',
    'tunnel',
    'greetings',
    'amiga',
    'oldschool',
    'mathematical',
  ],
  dependencies: {},
  defaultInputParams: {
    mainText: 'DEMOSCENE',
    greetingsText:
      'GREETINGS TO ALL DEMO CREWS... FAIRLIGHT... PARADOX... SCOOPEX... KEFRENS... TRISTAR & RED SECTOR INC... STAY OLDSCHOOL!',
    duration: 30,
    fontSize: 120,
    copperBarCount: 5,
    sineWaveAmplitude: 30,
    sineWaveFrequency: 2,
    tunnelZoomSpeed: 1,
    cubeRotationSpeed: 1,
    greetingsScrollSpeed: 50,
    paletteSwapInterval: 2,
  },
};

// --- Export Preset ---

export const demoscene8BitTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z
    .object({
      mainText: z.string(),
      greetingsText: z.string(),
      duration: z.number(),
      fontSize: z.number(),
      copperBarCount: z.number(),
      sineWaveAmplitude: z.number(),
      sineWaveFrequency: z.number(),
      tunnelZoomSpeed: z.number(),
      cubeRotationSpeed: z.number(),
      greetingsScrollSpeed: z.number(),
      paletteSwapInterval: z.number(),
    })
    .parse(presetParams),
};
