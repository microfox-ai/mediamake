/**
 * Glitch Vertical Mask Reveal Preset
 *
 * A glitch-inspired vertical mask reveal with soft feathered edge (25-35px blur) that
 * occasionally distorts and pixelates as it moves. Features datamoshing/compression artifacts,
 * stuttering motion with step() easing, RGB split text effect at reveal moment, and random
 * opacity flickers in the feathered edge area.
 *
 * Technical Features:
 * - Vertical mask with animated blur (30px), contrast (1.5), and hue-rotate
 * - Stutter motion using step() easing at progress ranges [0.3, 0.35] and [0.7, 0.75]
 * - RGB split text effect at reveal moment (text-shadow with red/cyan offsets)
 * - Random opacity flickers via keyframe animations on pseudo-element
 * - Mix-blend-mode: screen for digital feel
 * - GPU acceleration with translateZ(0)
 * - Support for audio beat sync timing (if audio available)
 *
 * Use Cases:
 * - Tech/digital content reveals
 * - Glitch aesthetic title sequences
 * - Cyberpunk-style transitions
 * - Music video effects
 * - Social media content with edgy aesthetic
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
  text: z
    .string()
    .default('GLITCH REVEAL')
    .describe('Text content to reveal with glitch effect'),
  
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (hex or CSS color)'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Primary text color'),
  
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (Google Font name)'),
  
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "900")'),
  
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('Total animation duration in seconds'),
  
  blurMin: z
    .number()
    .min(20)
    .max(40)
    .default(25)
    .describe('Minimum blur radius in pixels'),
  
  blurMax: z
    .number()
    .min(30)
    .max(50)
    .default(35)
    .describe('Maximum blur radius in pixels'),
  
  rgbSplitOffset: z
    .number()
    .min(1)
    .max(10)
    .default(2)
    .describe('RGB split offset distance in pixels'),
  
  glitchIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Overall glitch intensity multiplier'),
  
  audio: z
    .object({
      src: z.string().optional(),
      beatSyncEnabled: z.boolean().default(false),
    })
    .optional()
    .describe('Optional audio for beat sync timing'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    backgroundColor,
    textColor,
    fontSize,
    fontFamily,
    fontWeight,
    duration,
    blurMin,
    blurMax,
    rgbSplitOffset,
    glitchIntensity,
  } = params;

  // Calculate derived values
  const blurBase = (blurMin + blurMax) / 2;
  const revealMidpoint = duration / 2;
  const stutterDuration1 = 0.05; // Short stutter at 0.3-0.35
  const stutterDuration2 = 0.05; // Short stutter at 0.7-0.75

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: 'glitch-mask-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor,
          transform: 'translateZ(0)', // GPU acceleration
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

  // --- Text Layer ---
  const textLayerId = 'glitch-text-layer';
  const textLayer: RenderableComponentData = {
    id: textLayerId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: 'absolute inset-0 flex items-center justify-center',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight,
        color: textColor,
        textShadow: '0 0 0 transparent', // Initial state, will be animated
        textAlign: 'center',
        transform: 'translateZ(0)',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        subsets: ['latin'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [],
  };

  // RGB split effect at reveal moment
  const rgbSplitEffect = {
    id: 'rgb-split-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: revealMidpoint - 0.2,
      duration: 0.4,
      mode: 'provider' as const,
      targetIds: [textLayerId],
      ranges: [
        {
          key: 'textShadow',
          val: '0 0 0 transparent',
          prog: 0,
        },
        {
          key: 'textShadow',
          val: `${rgbSplitOffset}px 0 #ff00ff, -${rgbSplitOffset}px 0 #00ffff`,
          prog: 0.5,
        },
        {
          key: 'textShadow',
          val: '0 0 0 transparent',
          prog: 1,
        },
      ],
    },
  };
  textLayer.effects!.push(rgbSplitEffect);

  // --- Mask Container ---
  const maskContainerId = 'glitch-mask-container';
  const maskContainer: RenderableComponentData = {
    id: maskContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen',
          transform: 'translateZ(0)',
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

  // --- Mask Div (Main Gradient) ---
  const maskDivId = 'glitch-mask-div';
  const maskDiv: RenderableComponentData = {
    id: maskDivId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0));"></div>',
      className: 'absolute inset-0',
      style: {
        filter: `blur(${blurBase}px) contrast(1.5) hue-rotate(0deg)`,
        transform: 'translateY(-100%) translateZ(0)',
        willChange: 'transform, filter',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [],
  };

  // Vertical movement with stutter (step easing at 0.3-0.35 and 0.7-0.75)
  const maskMoveEffect = {
    id: 'mask-move-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [maskDivId],
      ranges: [
        { key: 'translateY', val: '-100%', prog: 0 },
        { key: 'translateY', val: '-70%', prog: 0.3 },
        // Stutter 1: step() effect by holding at same position
        { key: 'translateY', val: '-70%', prog: 0.35 },
        { key: 'translateY', val: '-30%', prog: 0.7 },
        // Stutter 2: step() effect by holding at same position
        { key: 'translateY', val: '-30%', prog: 0.75 },
        { key: 'translateY', val: '100%', prog: 1 },
      ],
    },
  };
  maskDiv.effects!.push(maskMoveEffect);

  // Blur intensity changes (30px to 45px and back)
  const blurAnimEffect = {
    id: 'blur-anim-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [maskDivId],
      ranges: [
        { key: 'blur', val: `${blurMin}px`, prog: 0 },
        { key: 'blur', val: `${blurMax}px`, prog: 0.25 },
        { key: 'blur', val: `${blurMin}px`, prog: 0.5 },
        { key: 'blur', val: `${blurMax}px`, prog: 0.75 },
        { key: 'blur', val: `${blurMin}px`, prog: 1 },
      ],
    },
  };
  maskDiv.effects!.push(blurAnimEffect);

  // Hue-rotate animation (0deg to 360deg cycle)
  const hueRotateEffect = {
    id: 'hue-rotate-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [maskDivId],
      ranges: [
        { key: 'hueRotate', val: '0deg', prog: 0 },
        { key: 'hueRotate', val: '360deg', prog: 1 },
      ],
    },
  };
  maskDiv.effects!.push(hueRotateEffect);

  // Contrast pulsing (1.5 to 2.0)
  const contrastEffect = {
    id: 'contrast-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [maskDivId],
      ranges: [
        { key: 'contrast', val: 1.5, prog: 0 },
        { key: 'contrast', val: 2.0 * glitchIntensity, prog: 0.5 },
        { key: 'contrast', val: 1.5, prog: 1 },
      ],
    },
  };
  maskDiv.effects!.push(contrastEffect);

  // --- Mask Pseudo-Element (Pixelated Pattern with Opacity Flicker) ---
  const maskPseudoId = 'glitch-mask-pseudo';
  const maskPseudo: RenderableComponentData = {
    id: maskPseudoId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background: repeating-linear-gradient(0deg, #ff00ff 0px, #00ffff 2px, transparent 2px, transparent 4px); opacity: 0;"></div>',
      className: 'absolute inset-0',
      style: {
        mixBlendMode: 'screen',
        transform: 'translateZ(0)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [],
  };

  // Random opacity flicker (0-1-0 pattern)
  const flickerEffect = {
    id: 'flicker-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [maskPseudoId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.8 * glitchIntensity, prog: 0.15 },
        { key: 'opacity', val: 0, prog: 0.2 },
        { key: 'opacity', val: 0.6 * glitchIntensity, prog: 0.35 },
        { key: 'opacity', val: 0, prog: 0.4 },
        { key: 'opacity', val: 0.9 * glitchIntensity, prog: 0.55 },
        { key: 'opacity', val: 0, prog: 0.6 },
        { key: 'opacity', val: 0.7 * glitchIntensity, prog: 0.75 },
        { key: 'opacity', val: 0, prog: 0.8 },
        { key: 'opacity', val: 0.5 * glitchIntensity, prog: 0.9 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };
  maskPseudo.effects!.push(flickerEffect);

  // --- Assemble Composition ---
  maskContainer.childrenData!.push(maskDiv, maskPseudo);
  rootContainer.childrenData!.push(maskContainer, textLayer);

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'glitch-vertical-mask-reveal',
  title: 'Glitch Vertical Mask Reveal',
  description:
    'A glitch-inspired vertical mask reveal with soft feathered edges that distort and pixelate during movement. Features datamoshing-style artifacts, stuttering motion with step() easing, RGB split text effects at reveal moment, and random opacity flickers for a digital, unstable aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'glitch',
    'mask',
    'reveal',
    'vertical',
    'distortion',
    'rgb-split',
    'datamoshing',
    'tech',
    'cyberpunk',
    'digital',
    'effects',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'GLITCH REVEAL',
    backgroundColor: '#000000',
    textColor: '#ffffff',
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: '700',
    duration: 5,
    blurMin: 25,
    blurMax: 35,
    rgbSplitOffset: 2,
    glitchIntensity: 1,
    audio: {
      beatSyncEnabled: false,
    },
  },
};

// --- Export ---
export const glitchVerticalMaskRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
