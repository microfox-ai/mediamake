/**
 * Brutal Concrete Poetry Text Effect Preset
 *
 * A brutalist text effect inspired by 1960s graphic design with degraded photostat aesthetics.
 * Features heavy industrial shake, extreme contrast (pure black/white), registration marks,
 * crop marks, torn paper edges, scotch tape artifacts, and aggressive slam-in animation.
 *
 * Features:
 * - Pure black and white (no mid-tones) via extreme contrast filter
 * - Heavy, low-frequency shake (industrial machinery vibration aesthetic)
 * - Registration marks and crop marks as design elements
 * - Torn paper edge clipping for DIY zine aesthetic
 * - Scotch tape artifacts (semi-transparent yellow overlays)
 * - Aggressive slam-in with spring overshoot
 * - Noise texture overlay for photostat degradation
 *
 * Use cases:
 * - Creating brutalist typography effects
 * - Building retro 1960s graphic design aesthetics
 * - DIY zine-style text overlays
 * - Industrial/concrete poetry visuals
 * - Degraded photostat reproduction effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- PARAMS SCHEMA ---
const presetParams = z.object({
  text: z
    .string()
    .default('CONCRETE')
    .describe('Text content to display in brutal concrete style'),
  duration: z
    .number()
    .default(5)
    .describe('Total duration of the text effect in seconds'),
  textColor: z
    .string()
    .default('#000000')
    .describe('Text color (default: pure black)'),
  backgroundColor: z
    .string()
    .default('#FFFFFF')
    .describe('Background color (default: pure white)'),
  fontSize: z
    .number()
    .default(7)
    .describe('Font size in rem units (default: 7rem, ~112px at base 16px)'),
  fontWeight: z
    .string()
    .default('black')
    .describe('Font weight (default: black/900)'),
  shakeIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Shake intensity multiplier (default: 1)'),
  slamInDuration: z
    .number()
    .default(0.4)
    .describe('Duration of slam-in animation in seconds'),
  shakeDuration: z
    .number()
    .default(5)
    .describe('Duration of continuous shake effect in seconds'),
});

// --- PRESET EXECUTION ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    textColor,
    backgroundColor,
    fontSize,
    fontWeight,
    shakeIntensity,
    slamInDuration,
    shakeDuration,
  } = params;

  // Calculate shake amplitudes based on intensity
  const shakeX = 8 * shakeIntensity;
  const shakeY = 5 * shakeIntensity;
  const regShakeX = 4 * shakeIntensity;
  const regShakeY = 3 * shakeIntensity;
  const cropShakeX = 3 * shakeIntensity;
  const cropShakeY = 2 * shakeIntensity;

  // --- COMPONENT IDs ---
  const containerId = 'brutal-concrete-container';
  const noiseOverlayId = 'brutal-concrete-noise';
  const cropMarkTLId = 'brutal-concrete-crop-tl';
  const cropMarkTRId = 'brutal-concrete-crop-tr';
  const cropMarkBLId = 'brutal-concrete-crop-bl';
  const cropMarkBRId = 'brutal-concrete-crop-br';
  const regMarkTLId = 'brutal-concrete-reg-tl';
  const regMarkTRId = 'brutal-concrete-reg-tr';
  const regMarkBLId = 'brutal-concrete-reg-bl';
  const regMarkBRId = 'brutal-concrete-reg-br';
  const tapeArtifact1Id = 'brutal-concrete-tape-1';
  const tapeArtifact2Id = 'brutal-concrete-tape-2';
  const tapeArtifact3Id = 'brutal-concrete-tape-3';
  const textContainerId = 'brutal-concrete-text-container';
  const textId = 'brutal-concrete-text';

  // --- NOISE OVERLAY (SVG noise texture) ---
  const noiseOverlay: RenderableComponentData = {
    id: noiseOverlayId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class="absolute inset-0 opacity-20 mix-blend-multiply" style="background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIvPjwvc3ZnPg=='); background-size: 200px 200px;"></div>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // --- CROP MARKS ---
  const createCropMark = (
    id: string,
    position: 'tl' | 'tr' | 'bl' | 'br',
  ): RenderableComponentData => {
    const positionStyles: Record<string, string> = {
      tl: 'top: 20px; left: 20px;',
      tr: 'top: 20px; right: 20px;',
      bl: 'bottom: 20px; left: 20px;',
      br: 'bottom: 20px; right: 20px;',
    };

    const horizontalHTML =
      position === 'tl' || position === 'bl'
        ? `<div class="absolute bg-black" style="${positionStyles[position]} width: 32px; height: 1px;"></div>`
        : `<div class="absolute bg-black" style="${positionStyles[position]} width: 32px; height: 1px; right: 20px;"></div>`;

    const verticalHTML =
      position === 'tl' || position === 'bl'
        ? `<div class="absolute bg-black" style="${positionStyles[position]} width: 1px; height: 32px;"></div>`
        : `<div class="absolute bg-black" style="${positionStyles[position]} width: 1px; height: 32px; right: 21px;"></div>`;

    return {
      id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `${horizontalHTML}${verticalHTML}`,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    };
  };

  const cropMarkTL = createCropMark(cropMarkTLId, 'tl');
  const cropMarkTR = createCropMark(cropMarkTRId, 'tr');
  const cropMarkBL = createCropMark(cropMarkBLId, 'bl');
  const cropMarkBR = createCropMark(cropMarkBRId, 'br');

  // --- REGISTRATION MARKS ---
  const createRegMark = (
    id: string,
    position: string,
  ): RenderableComponentData => {
    return {
      id,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: '+',
        className: `absolute text-2xl font-thin text-black ${position}`,
        style: {},
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    };
  };

  const regMarkTL = createRegMark(regMarkTLId, 'top-[40px] left-[40px]');
  const regMarkTR = createRegMark(regMarkTRId, 'top-[40px] right-[40px]');
  const regMarkBL = createRegMark(regMarkBLId, 'bottom-[40px] left-[40px]');
  const regMarkBR = createRegMark(regMarkBRId, 'bottom-[40px] right-[40px]');

  // --- TAPE ARTIFACTS ---
  const createTapeArtifact = (
    id: string,
    top: string,
    left: string,
    right: string,
    bottom: string,
    width: number,
    height: number,
    rotate: number,
  ): RenderableComponentData => {
    const positionStyle: Record<string, any> = {};
    if (top) positionStyle.top = top;
    if (left) positionStyle.left = left;
    if (right) positionStyle.right = right;
    if (bottom) positionStyle.bottom = bottom;

    return {
      id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class="absolute bg-yellow-100/40 backdrop-blur-sm" style="${Object.entries(positionStyle)
          .map(([k, v]) => `${k}: ${v};`)
          .join(' ')} width: ${width}px; height: ${height}px; transform: rotate(${rotate}deg);"></div>`,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    };
  };

  const tapeArtifact1 = createTapeArtifact(
    tapeArtifact1Id,
    '15%',
    '10%',
    '',
    '',
    80,
    30,
    3,
  );
  const tapeArtifact2 = createTapeArtifact(
    tapeArtifact2Id,
    '70%',
    '',
    '15%',
    '',
    60,
    25,
    -5,
  );
  const tapeArtifact3 = createTapeArtifact(
    tapeArtifact3Id,
    '',
    '20%',
    '',
    '10%',
    70,
    28,
    2,
  );

  // --- TEXT CONTAINER WITH TORN EDGE CLIP PATH ---
  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          clipPath:
            'polygon(2% 0%, 98% 1%, 99% 3%, 100% 97%, 98% 100%, 3% 99%, 0% 95%, 1% 4%)',
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
        id: textId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: text,
          className: `text-black uppercase tracking-tighter`,
          style: {
            fontSize: `${fontSize}rem`,
            fontWeight: fontWeight,
            filter: 'contrast(1000%) brightness(1.5)',
            WebkitTextStroke: '2px black',
            letterSpacing: '-0.05em',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // --- EFFECTS ---

  // Slam-in effect (scale 1.3 → 1, opacity 0 → 1)
  const slamInEffect = {
    id: 'brutal-concrete-slam-in',
    componentId: 'generic',
    data: {
      type: 'spring',
      start: 0,
      duration: slamInDuration,
      mode: 'provider',
      targetIds: [textId],
      springConfig: {
        mass: 1,
        damping: 80,
        stiffness: 10,
        overshootClamping: 0,
      },
      ranges: [
        { key: 'scale', val: 1.3, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.01 },
      ],
    },
  };

  // Heavy shake effect on text
  const heavyShakeText = {
    id: 'brutal-concrete-heavy-shake-text',
    componentId: 'generic',
    data: {
      type: 'spring',
      start: slamInDuration,
      duration: shakeDuration,
      mode: 'provider',
      targetIds: [textId],
      springConfig: {
        mass: 1,
        damping: 5,
        stiffness: 100,
        overshootClamping: 0,
      },
      ranges: [
        { key: 'translateX', val: shakeX, prog: 0 },
        { key: 'translateX', val: -shakeX, prog: 0.1 },
        { key: 'translateX', val: shakeX * 0.875, prog: 0.2 },
        { key: 'translateX', val: -shakeX * 0.75, prog: 0.3 },
        { key: 'translateX', val: shakeX * 0.625, prog: 0.4 },
        { key: 'translateX', val: -shakeX * 0.5, prog: 0.5 },
        { key: 'translateX', val: shakeX * 0.375, prog: 0.6 },
        { key: 'translateX', val: -shakeX * 0.25, prog: 0.7 },
        { key: 'translateX', val: shakeX * 0.125, prog: 0.8 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: -shakeY, prog: 0 },
        { key: 'translateY', val: shakeY, prog: 0.15 },
        { key: 'translateY', val: -shakeY * 0.8, prog: 0.3 },
        { key: 'translateY', val: shakeY * 0.8, prog: 0.45 },
        { key: 'translateY', val: -shakeY * 0.6, prog: 0.6 },
        { key: 'translateY', val: shakeY * 0.4, prog: 0.75 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    },
  };

  // Shake registration marks
  const shakeRegMarks = {
    id: 'brutal-concrete-shake-reg-marks',
    componentId: 'generic',
    data: {
      type: 'spring',
      start: slamInDuration,
      duration: shakeDuration,
      mode: 'provider',
      targetIds: [regMarkTLId, regMarkTRId, regMarkBLId, regMarkBRId],
      springConfig: {
        mass: 1,
        damping: 5,
        stiffness: 100,
        overshootClamping: 0,
      },
      ranges: [
        { key: 'translateX', val: regShakeX, prog: 0 },
        { key: 'translateX', val: -regShakeX, prog: 0.25 },
        { key: 'translateX', val: regShakeX * 0.75, prog: 0.5 },
        { key: 'translateX', val: -regShakeX * 0.5, prog: 0.75 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: -regShakeY, prog: 0 },
        { key: 'translateY', val: regShakeY, prog: 0.33 },
        { key: 'translateY', val: -regShakeY * 0.67, prog: 0.66 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    },
  };

  // Shake crop marks
  const shakeCropMarks = {
    id: 'brutal-concrete-shake-crop-marks',
    componentId: 'generic',
    data: {
      type: 'spring',
      start: slamInDuration,
      duration: shakeDuration,
      mode: 'provider',
      targetIds: [cropMarkTLId, cropMarkTRId, cropMarkBLId, cropMarkBRId],
      springConfig: {
        mass: 1,
        damping: 5,
        stiffness: 100,
        overshootClamping: 0,
      },
      ranges: [
        { key: 'translateX', val: cropShakeX, prog: 0 },
        { key: 'translateX', val: -cropShakeX, prog: 0.3 },
        { key: 'translateX', val: cropShakeX * 0.67, prog: 0.6 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: -cropShakeY, prog: 0 },
        { key: 'translateY', val: cropShakeY, prog: 0.4 },
        { key: 'translateY', val: -cropShakeY * 0.5, prog: 0.7 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    },
  };

  // --- ROOT CONTAINER ---
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-visible',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [slamInEffect, heavyShakeText, shakeRegMarks, shakeCropMarks],
    childrenData: [
      noiseOverlay,
      cropMarkTL,
      cropMarkTR,
      cropMarkBL,
      cropMarkBR,
      regMarkTL,
      regMarkTR,
      regMarkBL,
      regMarkBR,
      tapeArtifact1,
      tapeArtifact2,
      tapeArtifact3,
      textContainer,
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

// --- PRESET METADATA ---
const presetMetadata: PresetMetadata = {
  id: 'brutal-concrete-poetry',
  title: 'Brutal Concrete Poetry Text Effect',
  description:
    'A brutalist text effect inspired by 1960s graphic design with degraded photostat aesthetics, heavy industrial shake, extreme contrast, registration marks, crop marks, torn paper edges, scotch tape artifacts, and aggressive slam-in animation. Pure black and white with no mid-tones, creating abstract shapes from blown-out text edges.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'brutalist',
    'concrete',
    'poetry',
    '1960s',
    'photostat',
    'degraded',
    'industrial',
    'shake',
    'registration-marks',
    'crop-marks',
    'zine',
    'DIY',
    'slam-in',
    'typography',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'CONCRETE',
    duration: 5,
    textColor: '#000000',
    backgroundColor: '#FFFFFF',
    fontSize: 7,
    fontWeight: 'black',
    shakeIntensity: 1,
    slamInDuration: 0.4,
    shakeDuration: 5,
  },
};

// --- EXPORT ---
export const brutalConcretePoetryPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
