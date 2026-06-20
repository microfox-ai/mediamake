/**
 * CRT Terminal Typokinetic Preset
 *
 * A retro-futuristic typokinetic preset inspired by 80s analog video graphics like Blade Runner and TRON.
 * Features CRT scanlines, RGB color separation, phosphor glow, VHS tracking lines, data corruption glitch effects,
 * and terminal-style typing with block cursor. Text appears locked to frame like hardware-based video titling systems.
 *
 * Features:
 * - **CRT Display Effect**: Scanlines, phosphor glow, contrast/brightness filtering for authentic CRT look
 * - **RGB Color Separation**: Triple text rendering with red, green, and blue channels for chromatic aberration
 * - **Glitch Effects**: Rapid position displacement effects that snap back to create corruption-style glitches
 * - **VHS Tracking Lines**: Animated horizontal lines that scroll through without affecting text position
 * - **Terminal Cursor**: Blinking block cursor with phosphor glow
 * - **Hardware-Locked Text**: Text maintains stable position like analog video titlers
 * - **Customizable Colors**: Green (classic), amber, white terminal colors
 * - **Dynamic Sizing**: Responsive text sizing and positioning
 *
 * Use cases:
 * - Creating retro-futuristic title sequences
 * - Building cyberpunk-style text overlays
 * - Adding authentic 80s terminal aesthetics
 * - Creating Blade Runner / TRON-inspired graphics
 * - Simulating analog video titling systems
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to display in CRT terminal style'),
  duration: z.number().default(10).describe('Duration of the preset in seconds'),
  terminalColor: z
    .enum(['green', 'amber', 'white', 'cyan'])
    .default('green')
    .describe('Terminal text color scheme (green = classic, amber = vintage, white = modern, cyan = TRON)'),
  fontSize: z
    .number()
    .default(48)
    .describe('Font size for the terminal text in pixels'),
  glitchIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of glitch effects (0 = no glitch, 1 = max glitch)'),
  scanlineOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.03)
    .describe('Opacity of CRT scanlines (0 = invisible, 1 = opaque)'),
  rgbSeparation: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Amount of RGB channel separation in pixels'),
  cursorBlink: z
    .boolean()
    .default(true)
    .describe('Whether the terminal cursor should blink'),
  vhsTrackingLines: z
    .boolean()
    .default(true)
    .describe('Whether to show VHS tracking lines'),
  position: z
    .object({
      horizontal: z
        .enum(['left', 'center', 'right'])
        .default('left')
        .describe('Horizontal alignment of text'),
      vertical: z
        .enum(['top', 'center', 'bottom'])
        .default('center')
        .describe('Vertical alignment of text'),
    })
    .default({ horizontal: 'left', vertical: 'center' })
    .describe('Position of the text on screen'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Color mapping for terminal colors
  const colorMap = {
    green: {
      main: '#0f0',
      shadow: '#0f0',
      red: '#f00',
      blue: '#00f',
    },
    amber: {
      main: '#ffb000',
      shadow: '#ffb000',
      red: '#ff5500',
      blue: '#0088ff',
    },
    white: {
      main: '#ffffff',
      shadow: '#ffffff',
      red: '#ff6666',
      blue: '#6666ff',
    },
    cyan: {
      main: '#00ffff',
      shadow: '#00ffff',
      red: '#ff00ff',
      blue: '#0000ff',
    },
  };

  const colors = colorMap[params.terminalColor];

  // Position mapping
  const horizontalAlign = {
    left: 'items-start',
    center: 'items-center',
    right: 'items-end',
  };

  const verticalAlign = {
    top: 'justify-start',
    center: 'justify-center',
    bottom: 'justify-end',
  };

  const horizontalPadding = {
    left: 'pl-12',
    center: 'px-12',
    right: 'pr-12',
  };

  const verticalPadding = {
    top: 'pt-12',
    center: 'py-12',
    bottom: 'pb-12',
  };

  // Generate unique IDs
  const containerId = 'crt-display-root';
  const scanlineId = 'scanline-overlay';
  const vhsContainerId = 'vhs-tracking-container';
  const terminalContainerId = 'terminal-display-container';
  const rgbStackId = 'rgb-text-stack';
  const textRedId = 'text-red-channel';
  const textGreenId = 'text-green-channel';
  const textBlueId = 'text-blue-channel';
  const cursorContainerId = 'cursor-container';
  const cursorId = 'block-cursor';
  const phosphorGlowId = 'phosphor-glow-container';
  const vhsLine1Id = 'vhs-line-1';
  const vhsLine2Id = 'vhs-line-2';
  const vhsLine3Id = 'vhs-line-3';

  // Glitch effect for text (applied to RGB stack container)
  const glitchEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [rgbStackId],
    ranges: [
      // Glitch moments at random intervals
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateX', val: params.glitchIntensity * 10, prog: 0.15 },
      { key: 'translateY', val: params.glitchIntensity * 5, prog: 0.15 },
      { key: 'translateX', val: 0, prog: 0.151 },
      { key: 'translateY', val: 0, prog: 0.151 },
      { key: 'translateX', val: -params.glitchIntensity * 8, prog: 0.4 },
      { key: 'translateY', val: params.glitchIntensity * 3, prog: 0.4 },
      { key: 'translateX', val: 0, prog: 0.401 },
      { key: 'translateY', val: 0, prog: 0.401 },
      { key: 'translateX', val: params.glitchIntensity * 6, prog: 0.65 },
      { key: 'translateY', val: -params.glitchIntensity * 4, prog: 0.65 },
      { key: 'translateX', val: 0, prog: 0.651 },
      { key: 'translateY', val: 0, prog: 0.651 },
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };

  // VHS tracking line animations
  const vhsLine1Effect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [vhsLine1Id],
    ranges: [
      { key: 'translateY', val: '-100vh', prog: 0 },
      { key: 'translateY', val: '200vh', prog: 1 },
    ],
  };

  const vhsLine2Effect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration * 1.3,
    mode: 'provider',
    targetIds: [vhsLine2Id],
    ranges: [
      { key: 'translateY', val: '-100vh', prog: 0 },
      { key: 'translateY', val: '200vh', prog: 1 },
    ],
  };

  const vhsLine3Effect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration * 0.8,
    mode: 'provider',
    targetIds: [vhsLine3Id],
    ranges: [
      { key: 'translateY', val: '-100vh', prog: 0 },
      { key: 'translateY', val: '200vh', prog: 1 },
    ],
  };

  // Cursor blink effect
  const cursorBlinkEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [cursorId],
    ranges: [
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.45 },
      { key: 'opacity', val: 0, prog: 0.5 },
      { key: 'opacity', val: 0, prog: 0.95 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // Build VHS tracking lines
  const vhsLines: RenderableComponentData[] = params.vhsTrackingLines
    ? [
        {
          id: vhsLine1Id,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: '',
            className: 'absolute left-0 right-0 h-px bg-white/20',
            style: {
              top: '0%',
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
              id: 'vhs-line-1-effect',
              componentId: 'generic',
              data: vhsLine1Effect,
            },
          ],
        } as RenderableComponentData,
        {
          id: vhsLine2Id,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: '',
            className: 'absolute left-0 right-0 h-px bg-white/15',
            style: {
              top: '0%',
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
              id: 'vhs-line-2-effect',
              componentId: 'generic',
              data: vhsLine2Effect,
            },
          ],
        } as RenderableComponentData,
        {
          id: vhsLine3Id,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: '',
            className: 'absolute left-0 right-0 h-px bg-white/10',
            style: {
              top: '0%',
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
              id: 'vhs-line-3-effect',
              componentId: 'generic',
              data: vhsLine3Effect,
            },
          ],
        } as RenderableComponentData,
      ]
    : [];

  // Build cursor
  const cursor: RenderableComponentData[] = params.cursorBlink
    ? [
        {
          id: cursorContainerId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'relative ml-1',
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
              id: cursorId,
              type: 'atom',
              componentId: 'HTMLBlockAtom',
              data: {
                html: '',
                className: 'inline-block',
                style: {
                  width: '0.6em',
                  height: '1.2em',
                  backgroundColor: colors.main,
                  boxShadow: `0 0 5px ${colors.shadow}, 0 0 10px ${colors.shadow}`,
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
                  id: 'cursor-blink-effect',
                  componentId: 'generic',
                  data: cursorBlinkEffect,
                },
              ],
            } as RenderableComponentData,
          ],
        } as RenderableComponentData,
      ]
    : [];

  // Build RGB text stack
  const rgbTextStack: RenderableComponentData = {
    id: rgbStackId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-row items-center',
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
        id: 'glitch-effect',
        componentId: 'generic',
        data: glitchEffect,
      },
    ],
    childrenData: [
      // Red channel (left offset)
      {
        id: textRedId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: params.text,
          className: 'absolute font-mono',
          style: {
            fontSize: params.fontSize,
            color: colors.red,
            transform: `translateX(-${params.rgbSeparation}px)`,
            mixBlendMode: 'screen',
            opacity: 0.7,
          },
          font: {
            family: 'JetBrains Mono',
            weights: ['400', '700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      } as RenderableComponentData,
      // Green channel (center, main)
      {
        id: textGreenId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: params.text,
          className: 'absolute font-mono',
          style: {
            fontSize: params.fontSize,
            color: colors.main,
            transform: 'translateX(0px)',
            mixBlendMode: 'screen',
            textShadow: `0 0 5px ${colors.shadow}, 0 0 10px ${colors.shadow}, 0 0 15px ${colors.shadow}, 0 0 20px ${colors.shadow}`,
          },
          font: {
            family: 'JetBrains Mono',
            weights: ['400', '700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      } as RenderableComponentData,
      // Blue channel (right offset)
      {
        id: textBlueId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: params.text,
          className: 'absolute font-mono',
          style: {
            fontSize: params.fontSize,
            color: colors.blue,
            transform: `translateX(${params.rgbSeparation}px)`,
            mixBlendMode: 'screen',
            opacity: 0.7,
          },
          font: {
            family: 'JetBrains Mono',
            weights: ['400', '700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      } as RenderableComponentData,
      ...cursor,
    ],
  } as RenderableComponentData;

  // Build terminal display container
  const terminalDisplay: RenderableComponentData = {
    id: terminalContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex flex-col ${verticalAlign[params.position.vertical]} ${horizontalAlign[params.position.horizontal]} ${horizontalPadding[params.position.horizontal]} ${verticalPadding[params.position.vertical]} z-10`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [rgbTextStack],
  } as RenderableComponentData;

  // Build VHS tracking container
  const vhsTrackingContainer: RenderableComponentData = {
    id: vhsContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-40 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: vhsLines,
  } as RenderableComponentData;

  // Build scanline overlay
  const scanlineOverlay: RenderableComponentData = {
    id: scanlineId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-50',
        style: {
          background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, ${params.scanlineOpacity}) 2px, rgba(0, 255, 0, ${params.scanlineOpacity}) 4px)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [],
  } as RenderableComponentData;

  // Build phosphor glow container
  const phosphorGlow: RenderableComponentData = {
    id: phosphorGlowId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-5',
        style: {
          background: `radial-gradient(ellipse at center, rgba(0, 255, 0, 0.05) 0%, transparent 70%)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [],
  } as RenderableComponentData;

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
        style: {
          filter: 'contrast(1.2) brightness(1.1)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      scanlineOverlay,
      vhsTrackingContainer,
      terminalDisplay,
      phosphorGlow,
    ],
  } as RenderableComponentData;

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
  id: 'crt-terminal-typokinetic',
  title: 'CRT Terminal Typokinetic Preset',
  description:
    'A retro-futuristic typokinetic preset inspired by 80s analog video graphics like Blade Runner and TRON. Features CRT scanlines, RGB color separation, phosphor glow, VHS tracking lines, data corruption glitch effects, and terminal-style typing with block cursor. Text appears locked to frame like hardware-based video titling systems.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'crt',
    'terminal',
    'retro',
    '80s',
    'blade-runner',
    'tron',
    'glitch',
    'scanlines',
    'vhs',
    'cyberpunk',
    'typokinetic',
    'analog',
    'video-titling',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'VOIGHT-KAMPFF TEST',
    duration: 10,
    terminalColor: 'green',
    fontSize: 48,
    glitchIntensity: 0.3,
    scanlineOpacity: 0.03,
    rgbSeparation: 2,
    cursorBlink: true,
    vhsTrackingLines: true,
    position: {
      horizontal: 'left',
      vertical: 'center',
    },
  },
};

// Export preset
export const crtTerminalTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
