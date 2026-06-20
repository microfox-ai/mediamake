/**
 * Glitch Typokinetics Preset
 *
 * This preset creates a glitch-inspired typokinetics effect where text lines slide past each other
 * with digital interference patterns. The effect simulates corrupted video data with text streams
 * moving in opposite directions, featuring occasional glitches - brief position jumps, duplication,
 * and distortion. The base motion is smooth horizontal slides, interrupted by random micro-pauses
 * and position shifts that simulate data corruption.
 *
 * Features:
 * - **Horizontal Sliding Text**: Text lines slide in opposite directions (left-to-right and right-to-left)
 * - **RGB Channel Splitting**: During glitch moments, text briefly separates into red, green, and blue components
 * - **Scan Line Effects**: Subtle scan lines overlay for enhanced technological aesthetic
 * - **Static Noise Overlays**: Brief static noise appears at transition/glitch points
 * - **Position Glitches**: Text jumps position suddenly using step easing to simulate data corruption
 * - **Opacity Flickers**: Random opacity changes create digital interference effect
 *
 * Use cases:
 * - Modern, high-energy video content
 * - Tech-focused presentations
 * - Music videos with edgy aesthetic
 * - Social media content requiring visual impact
 * - Gaming or esports intros/outros
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  textLine1: z
    .string()
    .default('DIGITAL')
    .describe('First text line (slides left-to-right)'),
  textLine2: z
    .string()
    .default('CORRUPTION')
    .describe('Second text line (slides left-to-right, below textLine1)'),
  textLine3: z
    .string()
    .default('SYSTEM')
    .describe('Third text line (slides right-to-left)'),
  textLine4: z
    .string()
    .default('ERROR')
    .describe('Fourth text line (slides right-to-left, below textLine3)'),
  glitchText: z
    .string()
    .default('GLITCH')
    .describe('Text to display during RGB split glitch effect'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(10)
    .describe('Total duration of the animation in seconds'),
  font: z
    .string()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "RobotoMono:600")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color for main text lines'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font configuration
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
    }
  } else {
    fontStyle.fontWeight = 700; // Default bold
  }

  const duration = params.duration;

  // --- Text Lines (Left-to-Right Group) ---
  const textLineLeft1: RenderableComponentData = {
    id: 'text-line-left-1',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.textLine1,
      className: 'absolute whitespace-nowrap mix-blend-screen',
      style: {
        fontSize: '72px',
        color: params.textColor,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        ...fontStyle,
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
      // Base slide animation
      {
        id: 'slide-left-1',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['text-line-left-1'],
          ranges: [
            { key: 'translateX', val: -1200, prog: 0 },
            { key: 'translateX', val: 400, prog: 1 },
          ],
        },
      },
      // Glitch jump at 25%
      {
        id: 'glitch-jump-left-1-25',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: duration * 0.25 - 0.05,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['text-line-left-1'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -20, prog: 0.33 },
            { key: 'translateY', val: 15, prog: 0.66 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
      // Glitch jump at 75%
      {
        id: 'glitch-jump-left-1-75',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: duration * 0.75 - 0.05,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['text-line-left-1'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 30, prog: 0.25 },
            { key: 'translateX', val: -25, prog: 0.5 },
            { key: 'translateX', val: 10, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      // Opacity flicker throughout
      {
        id: 'flicker-left-1',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['text-line-left-1'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.85, prog: 0.1 },
            { key: 'opacity', val: 1, prog: 0.15 },
            { key: 'opacity', val: 0.9, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 0.35 },
            { key: 'opacity', val: 0.8, prog: 0.55 },
            { key: 'opacity', val: 1, prog: 0.6 },
            { key: 'opacity', val: 0.85, prog: 0.8 },
            { key: 'opacity', val: 1, prog: 0.85 },
            { key: 'opacity', val: 0.9, prog: 0.95 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  const textLineLeft2: RenderableComponentData = {
    id: 'text-line-left-2',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.textLine2,
      className: 'absolute whitespace-nowrap mix-blend-screen',
      style: {
        fontSize: '72px',
        color: params.textColor,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        top: '120px',
        ...fontStyle,
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
      // Base slide animation
      {
        id: 'slide-left-2',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['text-line-left-2'],
          ranges: [
            { key: 'translateX', val: -1400, prog: 0 },
            { key: 'translateX', val: 600, prog: 1 },
          ],
        },
      },
      // Glitch jump at 50%
      {
        id: 'glitch-jump-left-2-50',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: duration * 0.5 - 0.05,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['text-line-left-2'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: 25, prog: 0.33 },
            { key: 'translateY', val: -10, prog: 0.66 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
      // Glitch jump at 75%
      {
        id: 'glitch-jump-left-2-75',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: duration * 0.75 - 0.05,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['text-line-left-2'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 30, prog: 0.25 },
            { key: 'translateX', val: -25, prog: 0.5 },
            { key: 'translateX', val: 10, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      // Opacity flicker
      {
        id: 'flicker-left-2',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['text-line-left-2'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.85, prog: 0.1 },
            { key: 'opacity', val: 1, prog: 0.15 },
            { key: 'opacity', val: 0.9, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 0.35 },
            { key: 'opacity', val: 0.8, prog: 0.55 },
            { key: 'opacity', val: 1, prog: 0.6 },
            { key: 'opacity', val: 0.85, prog: 0.8 },
            { key: 'opacity', val: 1, prog: 0.85 },
            { key: 'opacity', val: 0.9, prog: 0.95 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // --- Text Lines (Right-to-Left Group) ---
  const textLineRight1: RenderableComponentData = {
    id: 'text-line-right-1',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.textLine3,
      className: 'absolute whitespace-nowrap mix-blend-screen',
      style: {
        fontSize: '72px',
        color: params.textColor,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        ...fontStyle,
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
      // Base slide animation
      {
        id: 'slide-right-1',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['text-line-right-1'],
          ranges: [
            { key: 'translateX', val: 1200, prog: 0 },
            { key: 'translateX', val: -400, prog: 1 },
          ],
        },
      },
      // Glitch jump at 25%
      {
        id: 'glitch-jump-right-1-25',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: duration * 0.25 - 0.05,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['text-line-right-1'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -20, prog: 0.33 },
            { key: 'translateY', val: 15, prog: 0.66 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
      // Glitch jump at 75%
      {
        id: 'glitch-jump-right-1-75',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: duration * 0.75 - 0.05,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['text-line-right-1'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 30, prog: 0.25 },
            { key: 'translateX', val: -25, prog: 0.5 },
            { key: 'translateX', val: 10, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      // Opacity flicker
      {
        id: 'flicker-right-1',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['text-line-right-1'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.85, prog: 0.1 },
            { key: 'opacity', val: 1, prog: 0.15 },
            { key: 'opacity', val: 0.9, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 0.35 },
            { key: 'opacity', val: 0.8, prog: 0.55 },
            { key: 'opacity', val: 1, prog: 0.6 },
            { key: 'opacity', val: 0.85, prog: 0.8 },
            { key: 'opacity', val: 1, prog: 0.85 },
            { key: 'opacity', val: 0.9, prog: 0.95 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  const textLineRight2: RenderableComponentData = {
    id: 'text-line-right-2',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.textLine4,
      className: 'absolute whitespace-nowrap mix-blend-screen',
      style: {
        fontSize: '72px',
        color: params.textColor,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        top: '120px',
        ...fontStyle,
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
      // Base slide animation
      {
        id: 'slide-right-2',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['text-line-right-2'],
          ranges: [
            { key: 'translateX', val: 1400, prog: 0 },
            { key: 'translateX', val: -600, prog: 1 },
          ],
        },
      },
      // Glitch jump at 50%
      {
        id: 'glitch-jump-right-2-50',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: duration * 0.5 - 0.05,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['text-line-right-2'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: 25, prog: 0.33 },
            { key: 'translateY', val: -10, prog: 0.66 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
      // Glitch jump at 75%
      {
        id: 'glitch-jump-right-2-75',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: duration * 0.75 - 0.05,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['text-line-right-2'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 30, prog: 0.25 },
            { key: 'translateX', val: -25, prog: 0.5 },
            { key: 'translateX', val: 10, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      // Opacity flicker
      {
        id: 'flicker-right-2',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['text-line-right-2'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.85, prog: 0.1 },
            { key: 'opacity', val: 1, prog: 0.15 },
            { key: 'opacity', val: 0.9, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 0.35 },
            { key: 'opacity', val: 0.8, prog: 0.55 },
            { key: 'opacity', val: 1, prog: 0.6 },
            { key: 'opacity', val: 0.85, prog: 0.8 },
            { key: 'opacity', val: 1, prog: 0.85 },
            { key: 'opacity', val: 0.9, prog: 0.95 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // --- RGB Split Components ---
  const rgbRedText: RenderableComponentData = {
    id: 'rgb-red-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.glitchText,
      className: 'absolute whitespace-nowrap mix-blend-screen',
      style: {
        fontSize: '96px',
        color: '#ff0000',
        textTransform: 'uppercase',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%) translateX(-4px)',
        ...fontStyle,
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
  };

  const rgbGreenText: RenderableComponentData = {
    id: 'rgb-green-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.glitchText,
      className: 'absolute whitespace-nowrap mix-blend-screen',
      style: {
        fontSize: '96px',
        color: '#00ff00',
        textTransform: 'uppercase',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        ...fontStyle,
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
  };

  const rgbBlueText: RenderableComponentData = {
    id: 'rgb-blue-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.glitchText,
      className: 'absolute whitespace-nowrap mix-blend-screen',
      style: {
        fontSize: '96px',
        color: '#0000ff',
        textTransform: 'uppercase',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%) translateX(4px)',
        ...fontStyle,
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
  };

  // --- RGB Split Container ---
  const rgbSplitContainer: RenderableComponentData = {
    id: 'rgb-split-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          opacity: 0,
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
      // RGB split at 25%
      {
        id: 'rgb-split-25',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: duration * 0.25 - 0.05,
          duration: 0.15,
          mode: 'provider',
          targetIds: ['rgb-split-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // RGB split at 50%
      {
        id: 'rgb-split-50',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: duration * 0.5 - 0.05,
          duration: 0.15,
          mode: 'provider',
          targetIds: ['rgb-split-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // RGB split at 75%
      {
        id: 'rgb-split-75',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: duration * 0.75 - 0.05,
          duration: 0.15,
          mode: 'provider',
          targetIds: ['rgb-split-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [rgbRedText, rgbGreenText, rgbBlueText],
  };

  // --- Scan Lines Overlay ---
  const scanLinesOverlay: RenderableComponentData = {
    id: 'scan-lines-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div class='absolute inset-0 pointer-events-none' style='background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px); z-index: 100;'></div>",
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 100,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // --- Glitch Noise Overlay ---
  const noiseBlock: RenderableComponentData = {
    id: 'noise-block',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div class='w-full h-full' style='background: linear-gradient(90deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 75%, transparent 75%); background-size: 4px 4px;'></div>",
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const glitchNoiseOverlay: RenderableComponentData = {
    id: 'glitch-noise-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          opacity: 0,
          mixBlendMode: 'overlay',
          zIndex: 50,
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
      // Noise at 25%
      {
        id: 'noise-25',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: duration * 0.25 - 0.03,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['glitch-noise-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.3 },
            { key: 'opacity', val: 0.4, prog: 0.6 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Noise at 50%
      {
        id: 'noise-50',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: duration * 0.5 - 0.03,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['glitch-noise-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.3 },
            { key: 'opacity', val: 0.5, prog: 0.6 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Noise at 75%
      {
        id: 'noise-75',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: duration * 0.75 - 0.03,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['glitch-noise-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.3 },
            { key: 'opacity', val: 0.3, prog: 0.6 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [noiseBlock],
  };

  // --- Text Stream Containers ---
  const textStreamContainerLeft: RenderableComponentData = {
    id: 'text-stream-container-left',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center pointer-events-none',
        style: {
          top: '30%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textLineLeft1, textLineLeft2],
  };

  const textStreamContainerRight: RenderableComponentData = {
    id: 'text-stream-container-right',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute inset-0 flex items-center justify-end pointer-events-none',
        style: {
          top: '50%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textLineRight1, textLineRight2],
  };

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: 'glitch-typokinetics-container',
    type: 'layout',
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
      scanLinesOverlay,
      textStreamContainerLeft,
      textStreamContainerRight,
      rgbSplitContainer,
      glitchNoiseOverlay,
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
  id: 'glitch-typokinetics',
  title: 'Glitch Typokinetics',
  description:
    'A glitch-inspired typokinetics preset featuring text lines that slide past each other with digital interference patterns. Creates corrupted video data aesthetic with opposing text stream movements, RGB channel splitting during glitch moments, scan line effects, and static noise overlays. Includes smooth horizontal slides interrupted by random micro-pauses and position shifts simulating data corruption. Perfect for modern, high-energy, edgy technological content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'glitch',
    'rgb-split',
    'digital',
    'tech',
    'modern',
    'high-energy',
    'scanlines',
    'corruption',
    'interference',
  ],
  defaultInputParams: {
    textLine1: 'DIGITAL',
    textLine2: 'CORRUPTION',
    textLine3: 'SYSTEM',
    textLine4: 'ERROR',
    glitchText: 'GLITCH',
    duration: 10,
    font: 'Inter:700',
    textColor: '#ffffff',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---
export const glitchTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
