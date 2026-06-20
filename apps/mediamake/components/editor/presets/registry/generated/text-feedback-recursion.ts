/**
 * Video Feedback Recursion Glitch Preset
 *
 * Creates a text preset that emulates video feedback loops where signal feeds back into itself
 * creating infinite recursion glitches. Text appears to fall into itself with nested copies that
 * distort and merge, mimicking pointing a camera at its own monitor - the infinite tunnel effect
 * but with digital corruption.
 *
 * Features:
 * - 8-10 recursion levels creating infinite tunnel depth effect
 * - Each level has different distortion: scaling, rotation, color shift, transparency
 * - 3D perspective with transform-style: preserve-3d for true depth
 * - Spiral effect with alternating rotation per level
 * - Color shift via hue-rotate increasing per level
 * - Explosive scatter effect every 3-4 seconds where feedback loop "breaks"
 * - Datamosh-style compression artifacts (contrast/brightness degradation) per level
 * - Continuous slow rotation for endless motion
 * - Uses cubic-bezier easing for explosive scatter dynamics
 *
 * Use cases:
 * - Glitch art title sequences
 * - Digital corruption aesthetics
 * - Tech/cyberpunk visual effects
 * - Experimental typography
 * - Music video titles
 * - Avant-garde social media content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  RenderableComponentData,
  GenericEffectData,
} from '@microfox/remotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z.string().describe('Text to display in feedback recursion effect'),
  duration: z
    .number()
    .default(10)
    .describe('Duration of the preset in seconds'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(64)
    .describe('Base font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe(
      'Font family (e.g., "Inter", "Roboto:700", "BebasNeue:900:italic")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (hex or rgba)'),
  recursionLevels: z
    .number()
    .min(5)
    .max(15)
    .default(10)
    .describe('Number of recursion depth levels (5-15)'),
  rotationSpeed: z
    .number()
    .min(5)
    .max(30)
    .default(10)
    .describe('Continuous rotation duration in seconds (slower = higher value)'),
  explosionInterval: z
    .number()
    .min(2)
    .max(10)
    .default(3.5)
    .describe('Interval between explosion effects in seconds'),
  explosionDuration: z
    .number()
    .min(0.2)
    .max(1)
    .default(0.4)
    .describe('Duration of explosion scatter effect in seconds'),
  zoomIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Scale multiplier for explosion effect'),
  hueShiftPerLevel: z
    .number()
    .min(0)
    .max(90)
    .default(30)
    .describe('Hue rotation degrees increment per recursion level'),
  blurIncrement: z
    .number()
    .min(0)
    .max(3)
    .default(1)
    .describe('Blur increment per level in pixels'),
  rotationAngle: z
    .number()
    .min(1)
    .max(15)
    .default(5)
    .describe('Rotation angle per level in degrees (alternating +/-)'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.fontFamily);

  const recursionLevels = params.recursionLevels;
  const rotationSpeed = params.rotationSpeed;
  const explosionInterval = params.explosionInterval;
  const explosionDuration = params.explosionDuration;

  // Build recursion layers
  const recursionLayers: RenderableComponentData[] = [];

  for (let i = 0; i < recursionLevels; i++) {
    const layerId = `recursion-layer-${i}`;
    const textId = `text-node-${i}`;

    // Calculate depth values
    const translateZ = -i * 100;
    const scale = 1 - i * 0.1;
    const opacity = 1 - i * 0.1;
    const rotateY = i % 2 === 0 ? params.rotationAngle : -params.rotationAngle;
    const hueRotate = i * params.hueShiftPerLevel;
    const blur = i * params.blurIncrement;
    const contrast = 1 - i * 0.05;
    const brightness = 1 - i * 0.05;

    // Create text atom
    const textAtom: RenderableComponentData = {
      id: textId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: params.text,
        style: {
          fontSize: `${params.fontSize}px`,
          fontWeight: fontStyle.fontWeight || 700,
          fontStyle: fontStyle.fontStyle || 'normal',
          color: params.textColor,
          textAlign: 'center',
          textShadow: '0 0 20px rgba(255,255,255,0.5)',
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight
            ? [fontStyle.fontWeight.toString()]
            : ['700'],
          subsets: ['latin'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
    };

    // Create layer container with static transforms
    const layerContainer: RenderableComponentData = {
      id: layerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: [textAtom],
      effects: [],
    };

    // Add continuous rotation effect
    const rotationEffect: any = {
      id: `rotation-effect-${i}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: rotationSpeed,
        mode: 'provider',
        targetIds: [layerId],
        loop: true,
        ranges: [
          { key: 'rotateZ', val: 0, prog: 0 },
          { key: 'rotateZ', val: 360, prog: 1 },
          { key: 'rotateY', val: rotateY, prog: 0 },
        ],
      } as GenericEffectData,
    };

    // Add static transform effect (translateZ, scale, opacity)
    const staticTransformEffect: any = {
      id: `static-transform-${i}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: 0.001,
        mode: 'provider',
        targetIds: [layerId],
        ranges: [
          { key: 'translateZ', val: translateZ, prog: 0 },
          { key: 'scale', val: scale, prog: 0 },
          { key: 'opacity', val: opacity, prog: 0 },
        ],
      } as GenericEffectData,
    };

    layerContainer.effects!.push(rotationEffect, staticTransformEffect);

    // Add filter effect to text (hue-rotate, blur, contrast, brightness)
    if (i > 0) {
      const filterEffect: any = {
        id: `filter-effect-${i}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.001,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'hueRotate', val: hueRotate, prog: 0 },
            { key: 'blur', val: blur, prog: 0 },
            { key: 'contrast', val: contrast, prog: 0 },
            { key: 'brightness', val: brightness, prog: 0 },
          ],
        } as GenericEffectData,
      };

      textAtom.effects = [filterEffect];
    }

    recursionLayers.push(layerContainer);
  }

  // Create explosion effects at intervals
  const explosionEffects: any[] = [];
  const numExplosions = Math.floor(params.duration / explosionInterval);

  for (let i = 0; i < numExplosions; i++) {
    const explosionStart = (i + 1) * explosionInterval;

    if (explosionStart + explosionDuration <= params.duration) {
      const explosionEffect: any = {
        id: `explosion-effect-${i}`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          start: explosionStart,
          duration: explosionDuration,
          mode: 'provider',
          targetIds: recursionLayers.map((layer) => layer.id),
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: params.zoomIntensity * 2, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'translateZ', val: 0, prog: 0 },
            { key: 'translateZ', val: 500, prog: 0.5 },
            { key: 'translateZ', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      };

      explosionEffects.push(explosionEffect);
    }
  }

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'feedback-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d',
          overflow: 'hidden',
          backgroundColor: 'rgba(0, 0, 0, 1)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: recursionLayers,
    effects: explosionEffects,
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
  id: 'textFeedbackRecursion',
  title: 'Text Feedback Recursion Glitch',
  description:
    'A text preset that emulates video feedback loops where signal feeds back into itself creating infinite recursion glitches. Text appears to fall into itself with nested copies that distort and merge, mimicking pointing a camera at its own monitor. Features 8-10 recursion levels with varying distortion (scaling, rotation, color shift, transparency), explosive scatter effects, and datamosh-style compression artifacts that increase with each recursion level.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'glitch',
    'feedback',
    'recursion',
    'infinite',
    'tunnel',
    '3d',
    'perspective',
    'distortion',
    'explosion',
    'datamosh',
    'compression',
    'cyberpunk',
    'experimental',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'FEEDBACK',
    duration: 10,
    fontSize: 64,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    recursionLevels: 10,
    rotationSpeed: 10,
    explosionInterval: 3.5,
    explosionDuration: 0.4,
    zoomIntensity: 1.5,
    hueShiftPerLevel: 30,
    blurIncrement: 1,
    rotationAngle: 5,
  },
};

// --- Export Preset ---
export const textFeedbackRecursionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
