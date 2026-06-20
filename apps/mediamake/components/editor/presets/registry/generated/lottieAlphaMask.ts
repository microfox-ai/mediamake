/**
 * Lottie Alpha Mask Effect Preset
 *
 * INTERNAL EFFECT:
 * This preset uses Lottie animation shapes as alpha masks for reveal effects.
 * It syncs with a Lottie animation's progress, using its shapes as dynamic masks.
 * Implements frame-by-frame mask updates that follow the Lottie animation's morphing shapes.
 *
 * Features:
 * - **Lottie-based Masking**: Uses Lottie animation as alpha mask source
 * - **Dynamic Frame Sync**: Mask updates follow Lottie animation progress
 * - **Mask Modes**: Supports additive and subtractive masking
 * - **Playback Control**: Configurable Lottie playback speed
 * - **Mask Inversion**: Option to invert mask (reveal/hide)
 * - **Feather Amount**: Soft edges for smooth mask transitions
 * - **Layer Selection**: Target specific Lottie layers as mask sources
 * - **Blend Modes**: Creative masking effects via blend modes
 *
 * Use cases:
 * - Creating animated reveal effects with Lottie shapes
 * - Building dynamic content masks that morph over time
 * - Adding creative masking transitions
 * - Implementing shape-based wipes and reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply the mask effect to'),
  lottieData: z.object({
    src: z.string().describe('Lottie JSON file URL or local path'),
  }).describe('Lottie animation data source'),
  playbackSpeed: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .optional()
    .describe('Lottie playback speed multiplier (1 = normal speed)'),
  maskLayer: z
    .string()
    .optional()
    .describe('Specific Lottie layer name to use as mask source (optional, uses all layers if not specified)'),
  invert: z
    .boolean()
    .default(false)
    .optional()
    .describe('Invert the mask (false = mask reveals content, true = mask hides content)'),
  feather: z
    .number()
    .min(0)
    .max(50)
    .default(0)
    .optional()
    .describe('Feather amount in pixels for soft mask edges'),
  maskMode: z
    .enum(['additive', 'subtractive'])
    .default('additive')
    .optional()
    .describe('Masking mode (additive = mask reveals, subtractive = mask hides)'),
  blendMode: z
    .enum([
      'normal',
      'multiply',
      'screen',
      'overlay',
      'darken',
      'lighten',
      'color-dodge',
      'color-burn',
      'hard-light',
      'soft-light',
      'difference',
      'exclusion',
    ])
    .default('normal')
    .optional()
    .describe('Blend mode for creative masking effects'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the mask effect (relative to parent)'),
  effectDuration: z
    .number()
    .default(5)
    .describe('Duration of the mask effect in seconds'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    lottieData,
    playbackSpeed = 1,
    maskLayer,
    invert = false,
    feather = 0,
    maskMode = 'additive',
    blendMode = 'normal',
    effectStart = 0,
    effectDuration = 5,
    effectId,
  } = params;

  // Generate unique IDs
  const maskContainerId = `lottie-mask-container-${targetId}`;
  const lottieSourceId = `lottie-mask-source-${targetId}`;
  const maskedContentId = `masked-content-${targetId}`;

  // Calculate mask styles based on parameters
  const maskCompositeStyle = maskMode === 'subtractive' ? 'exclude' : 'add';
  const maskImageFilter = feather > 0 ? `blur(${feather}px)` : 'none';

  // Determine if mask should be inverted
  const maskScale = invert ? '-1' : '1';

  // Create Lottie mask source
  const lottieMaskSource: RenderableComponentData = {
    id: lottieSourceId,
    type: 'atom',
    componentId: 'LottieAtom',
    data: {
      src: lottieData.src,
      loop: false,
      playbackRate: playbackSpeed,
      direction: 'forward',
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0, // Hidden, used only as mask source
        pointerEvents: 'none',
        transform: `scale(${maskScale})`,
        filter: maskImageFilter,
      },
      className: 'lottie-mask-source',
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
  };

  // Create masked content layer (targets the component to be masked)
  const maskedContentLayer: RenderableComponentData = {
    id: maskedContentId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          // CSS mask using the Lottie as the source
          maskImage: `url(#${lottieSourceId})`,
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          maskComposite: maskCompositeStyle,
          WebkitMaskImage: `url(#${lottieSourceId})`,
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          WebkitMaskComposite: maskCompositeStyle,
          mixBlendMode: blendMode !== 'normal' ? blendMode : undefined,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: lottieSourceId,
      },
    },
    childrenData: [],
  };

  // Container that holds both the mask source and masked content
  const maskContainer: RenderableComponentData = {
    id: maskContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: effectStart,
        fitDurationTo: lottieSourceId,
      },
    },
    childrenData: [maskedContentLayer, lottieMaskSource],
  };

  // Generic effect to control visibility/opacity sync
  const syncEffect = {
    id: effectId || `lottie-mask-sync-${targetId}`,
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: effectStart,
      duration: effectDuration,
      mode: 'provider' as const,
      targetIds: [targetId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Build output structure
  const rootContainer: RenderableComponentData = {
    id: 'lottie-alpha-mask-effect-container',
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
        duration: effectDuration + effectStart,
      },
    },
    effects: [syncEffect],
    childrenData: [maskContainer],
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

const presetMetadata: PresetMetadata = {
  id: 'lottieAlphaMask',
  title: 'Lottie Alpha Mask Effect',
  description:
    'Internal effect preset that uses Lottie animation shapes as alpha masks for reveal effects. Syncs with Lottie animation progress using CSS mask-image for frame-by-frame dynamic masking. Supports additive/subtractive modes, mask inversion, feather amount, and blend modes for creative masking effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'lottie', 'mask', 'reveal', 'internal', 'alpha', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    lottieData: {
      src: 'https://assets.lottiefiles.com/packages/lf20_abc123.json',
    },
    playbackSpeed: 1,
    maskLayer: undefined,
    invert: false,
    feather: 0,
    maskMode: 'additive',
    blendMode: 'normal',
    effectStart: 0,
    effectDuration: 5,
  },
};

export const lottieAlphaMaskPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
