/**
 * Telescopic Zoom Reveal Preset
 *
 * This preset creates a dramatic telescopic zoom reveal effect that mimics looking through
 * a telescope or sniper scope. The text starts as a tiny point in the center and expands
 * outward with a circular mask that grows to reveal the full text.
 *
 * Features:
 * - **Telescopic Zoom**: Text scales from 0.01 to 1.05 to 1.0 with exponential acceleration
 * - **Circular Mask Reveal**: clip-path animates from circle(0%) to circle(100%)
 * - **Scope UI Elements**: Crosshairs, range markers, and targeting info that fade out
 * - **Breathing Animation**: Subtle scale oscillation (1.0 → 1.02 → 1.0) after reveal
 * - **GPU Optimized**: Uses transform: scale3d() for smooth performance
 * - **Exponential Easing**: Dramatic acceleration curve for zoom effect
 *
 * Use cases:
 * - Dramatic text reveals for action content
 * - Gaming intros and cinematics
 * - Military/tactical themed videos
 * - Sniper scope simulation effects
 * - High-impact title reveals
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
  text: z.string().describe('Text to display with telescopic zoom reveal'),
  fontSize: z
    .number()
    .min(12)
    .max(500)
    .default(72)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the revealed text'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")',
    ),
  zoomDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.2)
    .describe('Duration of the zoom reveal animation in seconds'),
  scopeFadeDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.4)
    .describe('Duration of the scope UI fade out in seconds'),
  breathingDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration of one breathing cycle in seconds'),
  breathingIntensity: z
    .number()
    .min(0)
    .max(0.1)
    .default(0.02)
    .describe('Scale intensity of breathing animation (0.01 = 1% scale change)'),
  totalDuration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Total duration of the preset in seconds'),
  scopeColor: z
    .string()
    .default('rgba(255,255,255,0.6)')
    .describe('Color of the scope UI elements'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color of the scene'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: Record<string, any> = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2]; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Calculate timing
  const zoomDuration = params.zoomDuration;
  const scopeFadeStart = zoomDuration - params.scopeFadeDuration;
  const breathingStart = zoomDuration;

  // Generate scope SVG HTML
  const scopeSvgHtml = `
    <svg width='100%' height='100%' viewBox='0 0 1920 1080' style='position: absolute; inset: 0;'>
      <line x1='960' y1='0' x2='960' y2='1080' stroke='${params.scopeColor}' stroke-width='2'/>
      <line x1='0' y1='540' x2='1920' y2='540' stroke='${params.scopeColor}' stroke-width='2'/>
      <circle cx='960' cy='540' r='100' fill='none' stroke='${params.scopeColor}' stroke-width='2'/>
      <circle cx='960' cy='540' r='200' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='1'/>
      <circle cx='960' cy='540' r='300' fill='none' stroke='rgba(255,255,255,0.2)' stroke-width='1'/>
      <text x='980' y='460' fill='${params.scopeColor}' font-size='14' font-family='monospace'>RNG: 1000m</text>
      <text x='980' y='480' fill='${params.scopeColor}' font-size='14' font-family='monospace'>AZ: 045°</text>
      <text x='980' y='500' fill='${params.scopeColor}' font-size='14' font-family='monospace'>WIND: 5 KPH</text>
    </svg>
  `;

  // --- Text Component ---
  const textId = 'telescopic-text';

  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: 'bold',
        color: params.textColor,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['700'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
  };

  // --- Text Container (for positioning) ---
  const textContainerId = 'text-container';

  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
      },
    },
    childrenData: [textComponent],
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
  };

  // --- Scope SVG Component ---
  const scopeId = 'scope-svg';

  const scopeSvgComponent: RenderableComponentData = {
    id: scopeId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: scopeSvgHtml,
      className: 'w-full h-full',
    },
    context: {
      timing: {
        start: 0,
        duration: zoomDuration,
      },
    },
  };

  // --- Scope Overlay Container ---
  const scopeOverlayId = 'scope-overlay';

  const scopeOverlay: RenderableComponentData = {
    id: scopeOverlayId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none flex items-center justify-center',
      },
    },
    childrenData: [scopeSvgComponent],
    context: {
      timing: {
        start: 0,
        duration: zoomDuration,
      },
    },
  };

  // --- Effects ---

  // Zoom reveal effect (scale + clip-path)
  const zoomRevealEffect = {
    id: 'zoom-reveal-effect',
    componentId: 'generic',
    data: {
      type: 'cubic-bezier(0.95, 0.05, 0.795, 0.035)', // Exponential acceleration
      start: 0,
      duration: zoomDuration,
      mode: 'provider',
      targetIds: [textContainerId],
      ranges: [
        // Scale animation: 0.01 → 1.05 → 1.0
        { key: 'scale', val: 0.01, prog: 0 },
        { key: 'scale', val: 1.05, prog: 0.85 },
        { key: 'scale', val: 1.0, prog: 1 },
        // Clip-path animation: circle(0%) → circle(100%)
        { key: 'clipPath', val: 'circle(0% at center)', prog: 0 },
        { key: 'clipPath', val: 'circle(100% at center)', prog: 1 },
      ],
    },
  };

  // Scope fade out effect
  const scopeFadeEffect = {
    id: 'scope-fade-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: scopeFadeStart,
      duration: params.scopeFadeDuration,
      mode: 'provider',
      targetIds: [scopeOverlayId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Breathing animation (looping scale oscillation)
  const breathingEffect = {
    id: 'breathing-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: breathingStart,
      duration: params.breathingDuration,
      mode: 'provider',
      targetIds: [textContainerId],
      loop: true,
      ranges: [
        { key: 'scale', val: 1.0, prog: 0 },
        { key: 'scale', val: 1.0 + params.breathingIntensity, prog: 0.5 },
        { key: 'scale', val: 1.0, prog: 1 },
      ],
    },
  };

  // Attach effects to text container
  textContainer.effects = [zoomRevealEffect, breathingEffect];

  // Attach scope fade effect to scope overlay
  scopeOverlay.effects = [scopeFadeEffect];

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: 'telescopic-zoom-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full overflow-hidden`,
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    childrenData: [textContainer, scopeOverlay],
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
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
  id: 'telescopic-zoom-reveal',
  title: 'Telescopic Zoom Reveal',
  description:
    'A dramatic telescopic zoom reveal effect that mimics looking through a telescope or sniper scope. Text starts as a tiny point and expands with circular mask reveal, scope UI elements, and breathing animation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'zoom',
    'telescopic',
    'scope',
    'sniper',
    'dramatic',
    'circular',
    'mask',
    'breathing',
    'exponential',
    'gpu-optimized',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'MISSION START',
    fontSize: 72,
    textColor: '#FFFFFF',
    fontFamily: 'Inter:700',
    zoomDuration: 1.2,
    scopeFadeDuration: 0.4,
    breathingDuration: 2,
    breathingIntensity: 0.02,
    totalDuration: 5,
    scopeColor: 'rgba(255,255,255,0.6)',
    backgroundColor: '#000000',
  },
};

// --- Export ---

export const telescopicZoomRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
