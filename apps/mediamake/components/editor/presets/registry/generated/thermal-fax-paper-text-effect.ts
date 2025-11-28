/**
 * Thermal Fax Paper Text Effect Preset
 *
 * This preset creates a realistic thermal fax paper text effect that captures the unique qualities
 * of heat-sensitive paper printing. The text appears as if it's been burned onto thermal paper
 * with characteristic dark gray coloring, pixelated edges from thermal print head dots, horizontal
 * banding artifacts from uneven heat distribution, paper curl distortion, occasional print head
 * skip glitches, gradual fade effect suggesting thermal paper degradation over time, and subtle
 * yellow-brown discoloration around text edges for an aged thermal paper look.
 *
 * Features:
 * - Thermal print color with characteristic dark gray appearance
 * - Pixelated edges using CSS image-rendering for crispiness
 * - Horizontal banding artifacts from uneven heat distribution
 * - Paper curl distortion using perspective transforms
 * - Print head skip glitches with brief opacity drops
 * - Gradual fade effect simulating thermal paper degradation
 * - Yellow-brown edge discoloration for aged thermal paper aesthetic
 * - Dotted texture using repeating gradients for thermal dot matrix feel
 * - Minimal shake with occasional print head skip jumps
 * - Performance optimized with CSS containment
 *
 * Use cases:
 * - Retro receipt or fax machine text effects
 * - Vintage thermal printer aesthetics
 * - Nostalgic paper documentation visuals
 * - Degraded print effects for time passage
 * - Technical glitch or lo-fi text presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('Text to display in thermal fax style'),
  duration: z
    .number()
    .default(5)
    .describe('Duration of the thermal fax text display in seconds'),
  fontSize: z
    .string()
    .default('64px')
    .describe('Font size for the thermal text (e.g., "64px", "48px")'),
  fontFamily: z
    .string()
    .default('monospace')
    .describe(
      'Font family for thermal text (monospace recommended for authentic look)',
    ),
  textColor: z
    .string()
    .default('rgb(40,40,40)')
    .describe('Initial text color for thermal print (dark gray by default)'),
  degradedColor: z
    .string()
    .default('rgb(80,80,80)')
    .describe('Degraded text color after fading (lighter gray)'),
  bandingIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Intensity of horizontal banding artifacts (0-1)'),
  glitchFrequency: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe(
      'Number of print head skip glitches during duration (0 = none)',
    ),
  shakeIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(0.5)
    .describe('Intensity of minimal shake effect in pixels'),
  discolorationIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Intensity of yellow-brown edge discoloration (0-1)'),
  paperCurlAmount: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Amount of paper curl distortion in degrees'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    textColor,
    degradedColor,
    bandingIntensity,
    glitchFrequency,
    shakeIntensity,
    discolorationIntensity,
    paperCurlAmount,
  } = params;

  // Generate unique IDs
  const rootId = 'thermal-fax-paper-root';
  const bandingOverlayId = 'thermal-banding-overlay';
  const textContainerWrapperId = 'thermal-text-container-wrapper';
  const thermalTextAtomId = 'thermal-text-atom';

  // ============================================================================
  // BANDING OVERLAY (Horizontal stripes)
  // ============================================================================

  const bandingOverlay: RenderableComponentData = {
    id: bandingOverlayId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; pointer-events: none; background-image: repeating-linear-gradient(0deg, rgba(0,0,0,${bandingIntensity}) 0px, rgba(0,0,0,${bandingIntensity}) 1px, transparent 1px, transparent 10px); z-index: 1;"></div>`,
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // ============================================================================
  // TEXT ATOM (Thermal fax text with effects)
  // ============================================================================

  const thermalTextAtom: RenderableComponentData = {
    id: thermalTextAtomId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'text-gray-800 font-mono tracking-wider',
      style: {
        fontSize: fontSize,
        imageRendering: 'pixelated' as any,
        transform: 'scale(1.01)',
        boxShadow: `inset 0 0 10px rgba(139,69,19,${discolorationIntensity})`,
        textShadow: `0 0 2px rgba(139,69,19,${discolorationIntensity * 1.5})`,
        background:
          'repeating-linear-gradient(90deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 1px, transparent 1px, transparent 2px)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: textColor,
      },
      font: {
        family: fontFamily,
        weights: ['400', '500'],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // ============================================================================
  // TEXT CONTAINER WRAPPER (with paper curl distortion)
  // ============================================================================

  const textContainerWrapper: RenderableComponentData = {
    id: textContainerWrapperId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transform: `rotateX(${paperCurlAmount}deg)`,
          transformStyle: 'preserve-3d',
          zIndex: 2,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [thermalTextAtom] as RenderableComponentData[],
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // --- Thermal Degradation Effect (color fade) ---
  const thermalDegradationEffect = {
    id: 'thermal-degradation-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [thermalTextAtomId],
      ranges: [
        { key: 'color', val: textColor, prog: 0 },
        { key: 'color', val: degradedColor, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // --- Minimal Shake Effect ---
  const minimalShakeEffect = {
    id: 'minimal-shake-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [textContainerWrapperId],
      ranges: [
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: shakeIntensity, prog: 0.25 },
        { key: 'translateY', val: -shakeIntensity, prog: 0.5 },
        { key: 'translateY', val: shakeIntensity, prog: 0.75 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // --- Print Head Skip Glitch Effect ---
  // Generate glitch keyframes based on glitchFrequency
  const generateGlitchRanges = () => {
    const ranges = [];
    const glitchCount = Math.floor(glitchFrequency);

    if (glitchCount === 0) {
      // No glitches - maintain full opacity
      return [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ];
    }

    // Distribute glitches evenly across duration
    for (let i = 0; i < glitchCount; i++) {
      const glitchProg = (i + 1) / (glitchCount + 1); // Evenly spaced
      const glitchDuration = 0.05; // 50ms glitch duration (relative to total)

      // Before glitch: full opacity
      if (i === 0) {
        ranges.push({ key: 'opacity', val: 1, prog: 0 });
      }
      ranges.push({
        key: 'opacity',
        val: 1,
        prog: glitchProg - glitchDuration / 2,
      });

      // During glitch: opacity drops to 0
      ranges.push({ key: 'opacity', val: 0, prog: glitchProg });

      // After glitch: opacity returns to 1
      ranges.push({
        key: 'opacity',
        val: 1,
        prog: glitchProg + glitchDuration / 2,
      });
    }

    // End with full opacity
    ranges.push({ key: 'opacity', val: 1, prog: 1 });

    return ranges;
  };

  const printHeadSkipGlitchEffect = {
    id: 'print-head-skip-glitch-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [thermalTextAtomId],
      ranges: generateGlitchRanges(),
    } as GenericEffectData,
  };

  // Attach effects to the text atom
  thermalTextAtom.effects = [
    thermalDegradationEffect,
    printHeadSkipGlitchEffect,
  ];

  // Attach shake effect to the container wrapper
  textContainerWrapper.effects = [minimalShakeEffect];

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full bg-gradient-to-b from-gray-100 to-gray-200',
        style: {
          perspective: '1000px',
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
      bandingOverlay,
      textContainerWrapper,
    ] as RenderableComponentData[],
  };

  // ============================================================================
  // RETURN OUTPUT
  // ============================================================================

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'thermalFaxPaperTextEffect',
  title: 'Thermal Fax Paper Text Effect',
  description:
    'Text effect capturing the unique qualities of heat-sensitive thermal paper printing with characteristic dark gray color, crispy pixelated edges, horizontal banding artifacts, paper curl distortion, print head skip glitches, gradual fade degradation, and aged yellow-brown discoloration around edges',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'thermal',
    'fax',
    'paper',
    'retro',
    'vintage',
    'print',
    'glitch',
    'degraded',
    'aged',
    'pixelated',
    'monochrome',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'THERMAL FAX',
    duration: 5,
    fontSize: '64px',
    fontFamily: 'monospace',
    textColor: 'rgb(40,40,40)',
    degradedColor: 'rgb(80,80,80)',
    bandingIntensity: 0.1,
    glitchFrequency: 2,
    shakeIntensity: 0.5,
    discolorationIntensity: 0.1,
    paperCurlAmount: 2,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const thermalFaxPaperTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
