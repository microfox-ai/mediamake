/**
 * Paranoid Conspiracy Document Effect Preset
 *
 * Creates a heavily redacted, photocopied document effect with handwritten annotations,
 * coffee stains, erratic shake, and glitching redaction bars. Features classified document
 * aesthetic with black marker redactions, paper artifacts (staples, folds), and flickering
 * text visibility states.
 *
 * Features:
 * - Redacted document aesthetic with black censorship bars
 * - Handwritten margin notes with cursive font
 * - Coffee stains with realistic gradients
 * - Paper artifacts: staples, fold marks, paper clip shadows
 * - Erratic nervous shake effect
 * - Glitching redaction bars that briefly reveal text
 * - Text flicker between visible and permanently censored states
 * - Photocopy texture with grain overlay
 * - Highlighter marks with transparency
 *
 * Use Cases:
 * - Conspiracy theory content
 * - Mystery/thriller visuals
 * - Documentary evidence presentation
 * - Government document parodies
 * - Whistleblower aesthetics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  documentText: z
    .string()
    .default(
      'CLASSIFIED DOCUMENT - TOP SECRET\n\nThis information has been deemed [REDACTED] by the office of [REDACTED]. All personnel involved in Operation [REDACTED] are required to maintain absolute secrecy regarding the events of [REDACTED]. Any disclosure will result in immediate [REDACTED].\n\nThe following individuals have been identified: [REDACTED], [REDACTED], and [REDACTED]. Their involvement in the incident at [REDACTED] facility remains under investigation.\n\nFurther details available in Appendix [REDACTED].',
    )
    .describe('Main document text content with [REDACTED] placeholders'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Total duration of the effect in seconds'),
  shakeIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Intensity of the erratic shake effect (0-20 pixels)'),
  redactionFlickerSpeed: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.8)
    .describe('Speed multiplier for redaction bar flickering'),
  textFlickerIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of text flicker effect (0-1)'),
  showHandwrittenNotes: z
    .boolean()
    .default(true)
    .describe('Whether to show handwritten margin annotations'),
  showCoffeeStains: z
    .boolean()
    .default(true)
    .describe('Whether to show coffee stain overlays'),
  showPaperArtifacts: z
    .boolean()
    .default(true)
    .describe('Whether to show staples, folds, and paper clips'),
  handwrittenNotes: z
    .array(
      z.object({
        text: z.string().describe('Handwritten note text'),
        position: z
          .object({
            top: z.string().optional(),
            bottom: z.string().optional(),
            left: z.string().optional(),
            right: z.string().optional(),
          })
          .describe('CSS position properties'),
        rotation: z.number().default(-5).describe('Rotation angle in degrees'),
      }),
    )
    .default([
      { text: 'CHECK THIS!', position: { top: '120px', right: '80px' }, rotation: -7 },
      { text: 'Who authorized?', position: { bottom: '200px', left: '70px' }, rotation: 5 },
      { text: 'VERIFY ASAP →', position: { top: '280px', right: '100px' }, rotation: -3 },
    ])
    .describe('Array of handwritten note configurations'),
  redactionBars: z
    .array(
      z.object({
        top: z.string().describe('Top position (CSS)'),
        left: z.string().describe('Left position (CSS)'),
        width: z.string().describe('Width (CSS)'),
        height: z.string().default('24px').describe('Height (CSS)'),
      }),
    )
    .default([
      { top: '140px', left: '180px', width: '180px', height: '24px' },
      { top: '190px', left: '320px', width: '220px', height: '24px' },
      { top: '240px', left: '160px', width: '200px', height: '24px' },
      { top: '290px', left: '240px', width: '160px', height: '24px' },
      { top: '340px', left: '200px', width: '190px', height: '24px' },
    ])
    .describe('Array of redaction bar configurations'),
  highlighters: z
    .array(
      z.object({
        top: z.string().describe('Top position (CSS)'),
        left: z.string().describe('Left position (CSS)'),
        width: z.string().describe('Width (CSS)'),
        height: z.string().default('28px').describe('Height (CSS)'),
        color: z.string().default('rgba(255, 255, 0, 0.4)').describe('Highlighter color'),
      }),
    )
    .default([
      {
        top: '240px',
        left: '160px',
        width: '280px',
        height: '28px',
        color: 'rgba(255, 255, 0, 0.4)',
      },
      {
        top: '340px',
        left: '200px',
        width: '200px',
        height: '28px',
        color: 'rgba(255, 182, 193, 0.45)',
      },
    ])
    .describe('Array of highlighter mark configurations'),
  backgroundColor: z
    .string()
    .default('linear-gradient(to bottom, rgb(243 244 246), rgb(209 213 219))')
    .describe('Background gradient for document'),
  textColor: z.string().default('rgba(0, 0, 0, 0.7)').describe('Main text color'),
  fontFamily: z.string().default('Georgia, serif').describe('Font family for main text'),
  handwritingFont: z
    .string()
    .default('cursive')
    .describe('Font family for handwritten notes'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const containerId = 'paranoid-conspiracy-container';
  const textId = 'conspiracy-text-main';

  // Helper: Create erratic shake effect
  const createErraticShakeEffect = (
    targetId: string,
    intensity: number,
    duration: number,
  ): GenericEffectData => {
    // Create multiple random shake keyframes for nervous, erratic movement
    const ranges = [];
    const numKeyframes = 20; // More keyframes = more erratic

    for (let i = 0; i <= numKeyframes; i++) {
      const prog = i / numKeyframes;
      const randomX = (Math.random() - 0.5) * 2 * intensity;
      const randomY = (Math.random() - 0.5) * 2 * intensity;

      ranges.push({ key: 'translateX', val: randomX, prog });
      ranges.push({ key: 'translateY', val: randomY, prog });
    }

    return {
      type: 'linear',
      start: 0,
      duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // Helper: Create text flicker effect
  const createTextFlickerEffect = (
    targetId: string,
    intensity: number,
    duration: number,
  ): GenericEffectData => {
    const ranges = [];
    const numFlickers = 15;

    for (let i = 0; i <= numFlickers; i++) {
      const prog = i / numFlickers;
      const randomOpacity = 0.7 + (Math.random() - 0.5) * intensity;
      ranges.push({ key: 'opacity', val: Math.max(0.3, Math.min(1, randomOpacity)), prog });
    }

    return {
      type: 'linear',
      start: 0,
      duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // Helper: Create redaction bar flicker effect
  const createRedactionFlickerEffect = (
    targetId: string,
    speed: number,
    duration: number,
  ): GenericEffectData => {
    const flickerDuration = 0.3 / speed;
    const ranges = [];
    const numFlickers = Math.floor(duration / flickerDuration);

    for (let i = 0; i < numFlickers; i++) {
      const startProg = (i * flickerDuration) / duration;
      const endProg = Math.min(((i + 1) * flickerDuration) / duration, 1);

      // Random flicker pattern
      if (Math.random() > 0.7) {
        // 30% chance of brief reveal
        ranges.push({ key: 'opacity', val: 1, prog: startProg });
        ranges.push({ key: 'opacity', val: 0.3, prog: startProg + 0.001 });
        ranges.push({ key: 'opacity', val: 0.8, prog: startProg + 0.002 });
        ranges.push({ key: 'opacity', val: 1, prog: endProg });
      } else {
        ranges.push({ key: 'opacity', val: 1, prog: startProg });
        ranges.push({ key: 'opacity', val: 0.8, prog: (startProg + endProg) / 2 });
        ranges.push({ key: 'opacity', val: 1, prog: endProg });
      }
    }

    return {
      type: 'linear',
      start: 0,
      duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // Create effects
  const erraticShakeEffect = {
    id: 'erratic-shake',
    componentId: 'generic',
    data: createErraticShakeEffect(containerId, params.shakeIntensity, params.duration),
  };

  const textFlickerEffect = {
    id: 'text-flicker',
    componentId: 'generic',
    data: createTextFlickerEffect(textId, params.textFlickerIntensity, params.duration),
  };

  // Build child components
  const childrenData: RenderableComponentData[] = [];

  // Paper texture overlay (SVG noise pattern)
  childrenData.push({
    id: 'paper-texture-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4='); opacity: 0.6; pointer-events: none; z-index: 1;"></div>`,
      className: 'absolute inset-0',
      style: {},
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  } as RenderableComponentData);

  // Document content wrapper
  const documentContentChildren: RenderableComponentData[] = [];

  // Main text
  documentContentChildren.push({
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.documentText,
      style: {
        color: params.textColor,
        fontSize: '16px',
        lineHeight: '1.8',
        fontFamily: params.fontFamily,
        whiteSpace: 'pre-wrap',
      },
      className: 'relative z-10',
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [textFlickerEffect],
  } as RenderableComponentData);

  // Redaction bars with flicker effects
  params.redactionBars.forEach((bar, index) => {
    const barId = `redaction-bar-${index}`;
    const redactionFlicker = {
      id: `redaction-flicker-${index}`,
      componentId: 'generic',
      data: createRedactionFlickerEffect(barId, params.redactionFlickerSpeed, params.duration),
    };

    documentContentChildren.push({
      id: barId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${bar.width}; height: ${bar.height}; background-color: #000000;"></div>`,
        className: 'absolute',
        style: {
          top: bar.top,
          left: bar.left,
          zIndex: 20,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [redactionFlicker],
    } as RenderableComponentData);
  });

  // Highlighter marks (behind text)
  params.highlighters.forEach((highlighter, index) => {
    documentContentChildren.push({
      id: `highlighter-mark-${index}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${highlighter.width}; height: ${highlighter.height}; background-color: ${highlighter.color}; mix-blend-mode: multiply; border-radius: 2px;"></div>`,
        className: 'absolute',
        style: {
          top: highlighter.top,
          left: highlighter.left,
          zIndex: 5,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
    } as RenderableComponentData);
  });

  // Handwritten notes
  if (params.showHandwrittenNotes) {
    params.handwrittenNotes.forEach((note, index) => {
      documentContentChildren.push({
        id: `handwritten-note-${index}`,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: note.text,
          style: {
            color: '#1e40af',
            fontSize: '14px',
            fontFamily: params.handwritingFont,
            transform: `rotate(${note.rotation}deg)`,
            ...note.position,
            zIndex: 30,
          },
          className: 'absolute',
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      } as RenderableComponentData);
    });
  }

  // Document content wrapper
  childrenData.push({
    id: 'document-content-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-4/5 max-w-4xl p-12 flex flex-col gap-6',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: documentContentChildren,
  } as RenderableComponentData);

  // Coffee stains
  if (params.showCoffeeStains) {
    childrenData.push({
      id: 'coffee-stain-1',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 96px; height: 96px; background: radial-gradient(circle, rgba(139, 69, 19, 0.2) 0%, rgba(139, 69, 19, 0.1) 50%, transparent 70%); border-radius: 50%; filter: blur(4px);"></div>`,
        className: 'absolute',
        style: {
          top: '80px',
          right: '120px',
          zIndex: 3,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
    } as RenderableComponentData);

    childrenData.push({
      id: 'coffee-stain-2',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 110px; height: 110px; background: radial-gradient(circle, rgba(139, 69, 19, 0.18) 0%, rgba(139, 69, 19, 0.08) 50%, transparent 70%); border-radius: 50%; filter: blur(5px);"></div>`,
        className: 'absolute',
        style: {
          bottom: '140px',
          left: '100px',
          zIndex: 3,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
    } as RenderableComponentData);
  }

  // Paper artifacts
  if (params.showPaperArtifacts) {
    // Fold mark
    childrenData.push({
      id: 'fold-mark-vertical',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 1px; height: 100%; background-color: rgba(0, 0, 0, 0.15);"></div>`,
        className: 'absolute',
        style: {
          left: '50%',
          top: '0',
          zIndex: 2,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
    } as RenderableComponentData);

    // Staple holes
    childrenData.push({
      id: 'staple-hole-tl',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 8px; height: 8px; background-color: #9ca3af; border-radius: 50%; box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);"></div>`,
        className: 'absolute',
        style: {
          top: '40px',
          left: '60px',
          zIndex: 25,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
    } as RenderableComponentData);

    childrenData.push({
      id: 'staple-hole-tr',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 8px; height: 8px; background-color: #9ca3af; border-radius: 50%; box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);"></div>`,
        className: 'absolute',
        style: {
          top: '40px',
          right: '60px',
          zIndex: 25,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
    } as RenderableComponentData);

    // Paper clip shadow
    childrenData.push({
      id: 'paper-clip-shadow',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 40px; height: 80px; border: 3px solid rgba(100, 100, 100, 0.4); border-radius: 20px; box-shadow: 2px 2px 8px rgba(0,0,0,0.2);"></div>`,
        className: 'absolute',
        style: {
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%) rotate(15deg)',
          zIndex: 25,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center overflow-hidden',
        style: {
          background: params.backgroundColor,
          boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData,
    effects: [erraticShakeEffect],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'paranoid-conspiracy-redacted-doc',
  title: 'Paranoid Conspiracy Document Effect',
  description:
    'Heavily redacted, photocopied document effect with handwritten annotations, coffee stains, erratic shake, and glitching redaction bars. Features classified document aesthetic with black marker redactions, paper artifacts (staples, folds), and flickering text visibility states.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'effect',
    'document',
    'conspiracy',
    'redacted',
    'classified',
    'paranoid',
    'glitch',
    'photocopy',
    'handwritten',
    'annotations',
  ],
  dependencies: {},
  defaultInputParams: {
    documentText:
      'CLASSIFIED DOCUMENT - TOP SECRET\n\nThis information has been deemed [REDACTED] by the office of [REDACTED]. All personnel involved in Operation [REDACTED] are required to maintain absolute secrecy regarding the events of [REDACTED]. Any disclosure will result in immediate [REDACTED].\n\nThe following individuals have been identified: [REDACTED], [REDACTED], and [REDACTED]. Their involvement in the incident at [REDACTED] facility remains under investigation.\n\nFurther details available in Appendix [REDACTED].',
    duration: 10,
    shakeIntensity: 5,
    redactionFlickerSpeed: 0.8,
    textFlickerIntensity: 0.3,
    showHandwrittenNotes: true,
    showCoffeeStains: true,
    showPaperArtifacts: true,
    handwrittenNotes: [
      { text: 'CHECK THIS!', position: { top: '120px', right: '80px' }, rotation: -7 },
      { text: 'Who authorized?', position: { bottom: '200px', left: '70px' }, rotation: 5 },
      { text: 'VERIFY ASAP →', position: { top: '280px', right: '100px' }, rotation: -3 },
    ],
    redactionBars: [
      { top: '140px', left: '180px', width: '180px', height: '24px' },
      { top: '190px', left: '320px', width: '220px', height: '24px' },
      { top: '240px', left: '160px', width: '200px', height: '24px' },
      { top: '290px', left: '240px', width: '160px', height: '24px' },
      { top: '340px', left: '200px', width: '190px', height: '24px' },
    ],
    highlighters: [
      {
        top: '240px',
        left: '160px',
        width: '280px',
        height: '28px',
        color: 'rgba(255, 255, 0, 0.4)',
      },
      {
        top: '340px',
        left: '200px',
        width: '200px',
        height: '28px',
        color: 'rgba(255, 182, 193, 0.45)',
      },
    ],
    backgroundColor: 'linear-gradient(to bottom, rgb(243 244 246), rgb(209 213 219))',
    textColor: 'rgba(0, 0, 0, 0.7)',
    fontFamily: 'Georgia, serif',
    handwritingFont: 'cursive',
  },
};

export const paranoidConspiracyRedactedDocPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
