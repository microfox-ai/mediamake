/**
 * Retro Chrome 80s Kinetic Typography Preset
 *
 * A retro-futuristic elastic preset inspired by 80s motion graphics featuring:
 * - Z-space entry with exaggerated perspective zoom (translateZ 1000px→0, scale 0.1→1)
 * - Elastic bounce on landing (translateY oscillations)
 * - Chrome-like reflections using gradient backgrounds with text-fill-transparent
 * - Scanning-line effects (CRT monitor distortions) animated on Y-axis
 * - Holographic metallic gradients (silver→gold→platinum with rainbow diffractions)
 * - Elastic tracking adjustments (letter-spacing expands/contracts rhythmically)
 * - RGB channel split glitch moments where text briefly separates and snaps back
 * - Subtle 3D rotateY oscillation for depth
 *
 * Technical features:
 * - Perspective container (2000px perspective)
 * - Chrome text via gradient + background-clip-text + multiple text-shadows
 * - Z-space animation using translateZ and scale with custom cubic-bezier
 * - Scan lines overlay with repeating linear gradient animated vertically
 * - Letter-spacing animation for tracking effect
 * - RGB split using filter with color channel offsets at random intervals
 * - Continuous holographic shimmer (gradient angle rotation)
 * - 3D presence via rotateY oscillation
 *
 * Use cases:
 * - Retro-futuristic title sequences
 * - 80s-inspired motion graphics
 * - Sci-fi tech intros
 * - Synthwave aesthetics
 * - Cyberpunk typography
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().default('RETRO CHROME').describe('Text content to display'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(10)
    .describe('Total duration in seconds'),
  fontSize: z
    .number()
    .min(32)
    .max(400)
    .default(112)
    .describe('Font size in pixels (text-7xl ≈ 72px base, scaled to 112px)'),
  fontFamily: z
    .string()
    .default('Orbitron')
    .describe('Font family (recommended: Orbitron, Audiowide, Rajdhani)'),
  fontWeight: z
    .string()
    .default('900')
    .describe('Font weight (e.g., "400", "700", "900")'),
  entryDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(0.8)
    .describe('Duration of z-space entry animation in seconds'),
  bounceDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.6)
    .describe('Duration of elastic bounce animation in seconds'),
  glitchIntervals: z
    .array(z.number())
    .default([3, 6, 9])
    .describe('Array of timestamps (seconds) when RGB glitch effects trigger'),
  glitchDuration: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.1)
    .describe('Duration of each RGB glitch effect in seconds'),
  trackingLoopDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Duration of letter-spacing tracking loop in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    entryDuration,
    bounceDuration,
    glitchIntervals,
    glitchDuration,
    trackingLoopDuration,
  } = params;

  // IDs
  const rootId = 'retro-chrome-root';
  const scanLinesId = 'scan-lines-overlay';
  const chromeTextContainerId = 'chrome-text-container';
  const chromeTextId = 'chrome-text-atom';

  // --- Chrome Text Atom ---
  const chromeTextAtom: RenderableComponentData = {
    id: chromeTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: 'font-mono uppercase font-black',
      style: {
        fontSize: `${fontSize}px`,
        background:
          'linear-gradient(135deg, #C0C0C0 0%, #FFD700 25%, #E5E4E2 50%, #FFD700 75%, #C0C0C0 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        textShadow:
          '0 0 10px rgba(192,192,192,0.8), 0 0 20px rgba(255,215,0,0.6), 0 0 30px rgba(229,228,226,0.4)',
        filter: 'drop-shadow(0 0 15px rgba(255,215,0,0.5))',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // --- Effects for Chrome Text ---
  const effects: any[] = [];

  // 1. Z-space entry: translateZ [1000px→0] + scale [0.1→1]
  const zSpaceEntryEffect: GenericEffectData = {
    type: 'spring', // Using cubic-bezier equivalent via spring
    start: 0,
    duration: entryDuration,
    mode: 'provider',
    targetIds: [chromeTextId],
    ranges: [
      { key: 'translateZ', val: 1000, prog: 0 },
      { key: 'translateZ', val: 0, prog: 1 },
      { key: 'scale', val: 0.1, prog: 0 },
      { key: 'scale', val: 1, prog: 1 },
      { key: 'opacity', val: 0.3, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.5 },
    ],
  };
  effects.push({
    id: 'z-space-entry',
    componentId: 'generic',
    data: zSpaceEntryEffect,
  });

  // 2. Elastic bounce: translateY [0→-30px→10px→-5px→0]
  const bounceEffect: GenericEffectData = {
    type: 'ease-out',
    start: entryDuration,
    duration: bounceDuration,
    mode: 'provider',
    targetIds: [chromeTextId],
    ranges: [
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: -30, prog: 0.25 },
      { key: 'translateY', val: 10, prog: 0.5 },
      { key: 'translateY', val: -5, prog: 0.75 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };
  effects.push({
    id: 'elastic-bounce',
    componentId: 'generic',
    data: bounceEffect,
  });

  // 3. Holographic shimmer: gradient angle rotation [0deg→360deg] continuously
  // Implemented via background rotation using filter hue-rotate as approximation
  const shimmerEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: [chromeTextId],
    ranges: [
      { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
      { key: 'filter', val: 'hue-rotate(360deg)', prog: 1 },
    ],
  };
  effects.push({
    id: 'holographic-shimmer',
    componentId: 'generic',
    data: shimmerEffect,
  });

  // 4. Letter-spacing tracking: [0.5em→-0.1em→0.2em→0] loop
  const trackingStartTime = entryDuration + bounceDuration;
  const trackingLoops = Math.floor(
    (duration - trackingStartTime) / trackingLoopDuration,
  );
  for (let i = 0; i < trackingLoops; i++) {
    const loopStart = trackingStartTime + i * trackingLoopDuration;
    const trackingEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: loopStart,
      duration: trackingLoopDuration,
      mode: 'provider',
      targetIds: [chromeTextId],
      ranges: [
        { key: 'letterSpacing', val: '0.5em', prog: 0 },
        { key: 'letterSpacing', val: '-0.1em', prog: 0.33 },
        { key: 'letterSpacing', val: '0.2em', prog: 0.66 },
        { key: 'letterSpacing', val: '0em', prog: 1 },
      ],
    };
    effects.push({
      id: `tracking-loop-${i}`,
      componentId: 'generic',
      data: trackingEffect,
    });
  }

  // 5. RGB split glitch: filter with color channel offsets at random intervals
  glitchIntervals.forEach((timestamp, index) => {
    if (timestamp >= duration) return;
    const glitchEffect: GenericEffectData = {
      type: 'linear',
      start: timestamp,
      duration: glitchDuration,
      mode: 'provider',
      targetIds: [chromeTextId],
      ranges: [
        {
          key: 'filter',
          val: 'drop-shadow(3px 0px 0px rgba(255,0,0,0.8)) drop-shadow(-3px 0px 0px rgba(0,255,255,0.8))',
          prog: 0.5,
        },
        { key: 'filter', val: 'none', prog: 0 },
        { key: 'filter', val: 'none', prog: 1 },
      ],
    };
    effects.push({
      id: `rgb-glitch-${index}`,
      componentId: 'generic',
      data: glitchEffect,
    });
  });

  // 6. 3D presence: rotateY [-5°→5°] oscillation
  const rotateYEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: [chromeTextId],
    ranges: [
      { key: 'rotateY', val: -5, prog: 0 },
      { key: 'rotateY', val: 5, prog: 0.5 },
      { key: 'rotateY', val: -5, prog: 1 },
    ],
  };
  effects.push({
    id: 'rotate-y-oscillation',
    componentId: 'generic',
    data: rotateYEffect,
  });

  // Attach effects to chrome text atom
  chromeTextAtom.effects = effects;

  // --- Chrome Text Container ---
  const chromeTextContainer: RenderableComponentData = {
    id: chromeTextContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center tracking-wider',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [chromeTextAtom],
  };

  // --- Scan Lines Overlay ---
  const scanLinesOverlay: RenderableComponentData = {
    id: scanLinesId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="scan-lines"></div>',
      style: {
        position: 'absolute',
        inset: '0',
        pointerEvents: 'none',
        backgroundImage:
          'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px)',
        zIndex: '10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Animate scan lines on Y-axis
  const scanLinesEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: [scanLinesId],
    ranges: [
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: '100px', prog: 1 },
    ],
  };
  scanLinesOverlay.effects = [
    {
      id: 'scan-lines-animation',
      componentId: 'generic',
      data: scanLinesEffect,
    },
  ];

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black flex items-center justify-center',
        style: {
          perspective: '2000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [scanLinesOverlay, chromeTextContainer],
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
  id: 'retro-chrome-80s-kinetic',
  title: 'Retro Chrome 80s Kinetic Typography',
  description:
    'A retro-futuristic elastic preset inspired by 80s motion graphics featuring chrome-like text with exaggerated perspective zoom from z-space, elastic bouncing with scanning-line CRT effects, holographic metallic gradients (silver to gold to platinum with rainbow diffractions), rhythmic letter-spacing tracking adjustments, and RGB channel glitch moments where text splits and snaps back together.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'retro',
    '80s',
    'chrome',
    'kinetic',
    'z-space',
    'elastic',
    'glitch',
    'rgb-split',
    'holographic',
    'scan-lines',
    'crt',
    'synthwave',
    'cyberpunk',
    'futuristic',
  ],
  defaultInputParams: {
    text: 'RETRO CHROME',
    duration: 10,
    fontSize: 112,
    fontFamily: 'Orbitron',
    fontWeight: '900',
    entryDuration: 0.8,
    bounceDuration: 0.6,
    glitchIntervals: [3, 6, 9],
    glitchDuration: 0.1,
    trackingLoopDuration: 2,
  },
  dependencies: {},
};

export const retroChrome80sKineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
