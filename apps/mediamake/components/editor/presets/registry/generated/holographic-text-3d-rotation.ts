/**
 * Holographic 3D Text Rotation Preset
 *
 * Creates a sci-fi holographic text effect with 3D perspective rotation, volumetric layering through 
 * multiple semi-transparent text copies at different Z-depths, chromatic aberration, animated scan lines, 
 * and glowing effects. The text appears as a 3D hologram rotating in space with depth and retro-futuristic aesthetics.
 *
 * Features:
 * - **3D Perspective Rotation**: Continuous Y-axis rotation with subtle X-axis oscillation creating dynamic perspective shifts
 * - **Volumetric Layering**: 3-4 semi-transparent text layers positioned at different Z-depths (-20px, -10px, 0px, 10px)
 * - **Chromatic Aberration**: Red/cyan text-shadow offsets creating RGB split effect
 * - **Animated Scan Lines**: Vertical scanning effect using repeating linear gradient
 * - **Holographic Glow**: Multiple text layers with cyan glow and screen blend mode
 * - **Color Shifting**: Per-layer hue-rotation filters for depth perception
 * - **Smooth Animations**: Linear rotation for continuous spin, ease-in-out for oscillation
 *
 * Technical Implementation:
 * - Uses transform: preserve-3d on rotation container for true 3D layering
 * - perspective: 600px on root for pronounced depth effect
 * - Each text layer at different translateZ position with varying opacity
 * - Generic effects for rotateY (0-360deg continuous) and rotateX oscillation (-10deg to 10deg)
 * - Scan line overlay with animated translateY for vertical movement
 * - mix-blend-mode: screen for holographic appearance
 *
 * Use Cases:
 * - Futuristic title sequences
 * - Sci-fi video intros
 * - Tech product reveals
 * - Cyberpunk aesthetics
 * - Digital/virtual reality content
 * - Gaming overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z.string().describe('Text to display as holographic effect'),
  duration: z.number().default(5).describe('Duration of the effect in seconds'),
  fontSize: z.string().default('72px').describe('Font size (e.g., "72px", "96px")'),
  fontFamily: z.string().default('Orbitron').describe('Font family for the text'),
  color: z.string().default('#00ffff').describe('Base color for the hologram (cyan default)'),
  rotationSpeed: z.number().default(5).describe('Rotation duration in seconds (lower = faster)'),
  oscillationSpeed: z.number().default(3).describe('X-axis oscillation duration in seconds'),
  glowIntensity: z.number().min(0).max(2).default(1).describe('Glow intensity multiplier (0-2)'),
  scanlineSpeed: z.number().default(2).describe('Scan line animation speed in seconds'),
  perspective: z.number().default(600).describe('Perspective distance in pixels (smaller = more dramatic)'),
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
    color,
    rotationSpeed,
    oscillationSpeed,
    glowIntensity,
    scanlineSpeed,
    perspective,
  } = params;

  // Component IDs
  const rootId = 'holographic-root';
  const rotationContainerId = 'rotation-container';
  const textLayerBackId = 'text-layer-back';
  const textLayerMidBackId = 'text-layer-mid-back';
  const textLayerCenterId = 'text-layer-center';
  const textLayerMidFrontId = 'text-layer-mid-front';
  const scanlinesOverlayId = 'scanlines-overlay';

  // Calculate glow values
  const baseGlow = 20 * glowIntensity;
  const secondaryGlow = 40 * glowIntensity;
  const tertiaryGlow = 60 * glowIntensity;

  // Text layers with different Z-depths, opacity, and styling
  const textLayers: RenderableComponentData[] = [
    // Back layer (-20px Z)
    {
      id: textLayerBackId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: text,
        style: {
          fontSize: fontSize,
          fontWeight: 'bold',
          color: color,
          textShadow: `0 0 ${baseGlow}px cyan, 0 0 ${secondaryGlow}px cyan`,
          filter: 'hue-rotate(180deg)',
          opacity: 0.3,
          transform: 'translateZ(-20px)',
          pointerEvents: 'none',
        },
        font: {
          family: fontFamily,
          weights: ['700', '900'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    },
    // Mid-back layer (-10px Z)
    {
      id: textLayerMidBackId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: text,
        style: {
          fontSize: fontSize,
          fontWeight: 'bold',
          color: color,
          textShadow: `2px 0 0 #ff0000, -2px 0 0 #00ffff`,
          filter: 'hue-rotate(90deg)',
          opacity: 0.6,
          transform: 'translateZ(-10px)',
          pointerEvents: 'none',
        },
        font: {
          family: fontFamily,
          weights: ['700', '900'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    },
    // Center layer (0px Z) - main visible layer
    {
      id: textLayerCenterId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: text,
        style: {
          fontSize: fontSize,
          fontWeight: '900',
          color: color,
          textShadow: `3px 0 0 #ff0000, -3px 0 0 #00ffff, 0 0 ${baseGlow * 1.5}px cyan, 0 0 ${tertiaryGlow}px cyan`,
          opacity: 0.9,
          transform: 'translateZ(0px)',
          pointerEvents: 'none',
        },
        font: {
          family: fontFamily,
          weights: ['700', '900'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    },
    // Mid-front layer (10px Z)
    {
      id: textLayerMidFrontId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: text,
        style: {
          fontSize: fontSize,
          fontWeight: 'bold',
          color: color,
          textShadow: `1px 0 0 #ff0000, -1px 0 0 #00ffff`,
          filter: 'hue-rotate(-90deg)',
          opacity: 0.6,
          transform: 'translateZ(10px)',
          pointerEvents: 'none',
        },
        font: {
          family: fontFamily,
          weights: ['700', '900'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    },
  ];

  // Rotation container with 3D transform-style
  const rotationContainer: RenderableComponentData = {
    id: rotationContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          transformStyle: 'preserve-3d',
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: textLayers,
    effects: [
      // Continuous Y-axis rotation (0 to 360 degrees)
      {
        id: 'rotate-y-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: rotationSpeed,
          mode: 'provider',
          targetIds: [rotationContainerId],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: 360, prog: 1 },
          ],
        } as GenericEffectData,
      },
      // X-axis oscillation (-10 to 10 degrees)
      {
        id: 'rotate-x-oscillation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: oscillationSpeed,
          mode: 'provider',
          targetIds: [rotationContainerId],
          ranges: [
            { key: 'rotateX', val: -10, prog: 0 },
            { key: 'rotateX', val: 10, prog: 0.5 },
            { key: 'rotateX', val: -10, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Scanlines overlay
  const scanlinesOverlay: RenderableComponentData = {
    id: scanlinesOverlayId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="scanlines"></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0, 255, 255, 0.03) 2px, rgba(0, 255, 255, 0.03) 4px)',
        mixBlendMode: 'overlay',
        opacity: 0.5,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // Animate scanlines vertically
      {
        id: 'scanline-animation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: scanlineSpeed,
          mode: 'provider',
          targetIds: [scanlinesOverlayId],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -4, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: `${perspective}px`,
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [rotationContainer, scanlinesOverlay],
  };

  return {
    output: {
      childrenData: [rootContainer as RenderableComponentData],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'holographic-text-3d-rotation',
  title: 'Holographic 3D Text Rotation',
  description: 'A sci-fi holographic text effect with 3D perspective rotation, volumetric layering through multiple semi-transparent text copies at different Z-depths, chromatic aberration, animated scan lines, and glowing effects. Creates the illusion of a rotating hologram with depth and retro-futuristic aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'hologram', '3d', 'rotation', 'sci-fi', 'futuristic', 'chromatic-aberration', 'scanlines', 'glow', 'perspective', 'layered', 'volumetric'],
  dependencies: {},
  defaultInputParams: {
    text: 'HOLOGRAM',
    duration: 5,
    fontSize: '72px',
    fontFamily: 'Orbitron',
    color: '#00ffff',
    rotationSpeed: 5,
    oscillationSpeed: 3,
    glowIntensity: 1,
    scanlineSpeed: 2,
    perspective: 600,
  },
};

export const holographicText3dRotationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
