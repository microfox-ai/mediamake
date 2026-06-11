/**
 * Holographic Projection Typography Preset
 *
 * A vintage hologram-style text display preset featuring:
 * - Iridescent pink/cyan shimmer gradients that shift based on viewing angle simulation
 * - Hologram flicker with interference patterns and doubling effects
 * - Subtle Z-axis rotation suggesting 3D space
 * - Animated scan lines that move vertically through text, temporarily brightening letters
 * - Chromatic dispersion at character edges (light splitting through holographic medium)
 *
 * Use cases:
 * - Retro-futuristic title sequences
 * - Sci-fi themed video overlays
 * - Cyberpunk aesthetic text displays
 * - Tech product demonstrations
 * - Music videos with electronic/synthwave themes
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, BaseEffect } from '@microfox/remotion';

// ============================================================================
// Parameter Schema
// ============================================================================

const presetParams = z.object({
  text: z.string().default('HOLOGRAM').describe('Text to display in holographic style'),
  
  fontSize: z.number().default(120).describe('Font size in pixels'),
  
  font: z
    .string()
    .optional()
    .default('Orbitron:700')
    .describe('Font family with optional weight and style (e.g., "Orbitron:700", "Inter:600")'),
  
  duration: z.number().default(10).describe('Duration of the holographic display in seconds'),
  
  position: z
    .object({
      x: z.string().default('center').describe('Horizontal position: left, center, right, or custom value'),
      y: z.string().default('center').describe('Vertical position: top, center, bottom, or custom value'),
    })
    .optional()
    .default({ x: 'center', y: 'center' })
    .describe('Position of the holographic text'),
  
  intensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Overall effect intensity multiplier (0.5 = subtle, 2 = extreme)'),
  
  flickerSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Speed multiplier for flicker effects (0.5 = slow, 3 = rapid)'),
  
  scanlineSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Speed multiplier for scan line animation (0.5 = slow, 3 = fast)'),
});

// ============================================================================
// Preset Execution
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Orbitron:700';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Position mapping
  const getPositionStyles = (x: string, y: string): React.CSSProperties => {
    const styles: React.CSSProperties = {};
    
    // Horizontal positioning
    if (x === 'left') {
      styles.justifyContent = 'flex-start';
    } else if (x === 'right') {
      styles.justifyContent = 'flex-end';
    } else if (x === 'center') {
      styles.justifyContent = 'center';
    }
    
    // Vertical positioning
    if (y === 'top') {
      styles.alignItems = 'flex-start';
    } else if (y === 'bottom') {
      styles.alignItems = 'flex-end';
    } else if (y === 'center') {
      styles.alignItems = 'center';
    }
    
    return styles;
  };

  const positionStyles = getPositionStyles(
    params.position?.x || 'center',
    params.position?.y || 'center',
  );

  // Component IDs
  const rootId = 'holographic-projection-root';
  const containerId = 'hologram-3d-container';
  const mainTextId = 'main-hologram-text';
  const interference1Id = 'interference-text-1';
  const interference2Id = 'interference-text-2';
  const scanlineContainerId = 'scanline-container';
  const scanlineBarId = 'scanline-bar';

  // ============================================================================
  // Effects: 3D Rotation
  // ============================================================================

  const rotation3DEffect: BaseEffect = {
    id: '3d-rotation-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: 6 / params.intensity,
      mode: 'provider',
      targetIds: [mainTextId],
      ranges: [
        { key: 'rotateY', val: -15, prog: 0 },
        { key: 'rotateY', val: 15, prog: 0.5 },
        { key: 'rotateY', val: -15, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // ============================================================================
  // Effects: Shimmer Gradient
  // ============================================================================

  const shimmerGradientEffect: BaseEffect = {
    id: 'shimmer-gradient-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: 4 / params.intensity,
      mode: 'provider',
      targetIds: [mainTextId],
      ranges: [
        { key: 'backgroundPositionX', val: '0%', prog: 0 },
        { key: 'backgroundPositionX', val: '100%', prog: 0.5 },
        { key: 'backgroundPositionX', val: '0%', prog: 1 },
      ],
    } as GenericEffectData,
  };

  // ============================================================================
  // Effects: Hue Cycle
  // ============================================================================

  const hueCycleEffect: BaseEffect = {
    id: 'hue-cycle-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: 8 / params.intensity,
      mode: 'provider',
      targetIds: [mainTextId],
      ranges: [
        { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
        { key: 'filter', val: 'hue-rotate(30deg)', prog: 0.5 },
        { key: 'filter', val: 'hue-rotate(0deg)', prog: 1 },
      ],
    } as GenericEffectData,
  };

  // ============================================================================
  // Effects: Interference Flicker 1
  // ============================================================================

  const interferenceFlicker1Effect: BaseEffect = {
    id: 'interference-flicker-1',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: 3 / params.flickerSpeed,
      mode: 'provider',
      targetIds: [interference1Id],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.4, prog: 0.1 },
        { key: 'opacity', val: 0, prog: 0.15 },
        { key: 'opacity', val: 0.6, prog: 0.5 },
        { key: 'opacity', val: 0.2, prog: 0.55 },
        { key: 'opacity', val: 0.5, prog: 0.7 },
        { key: 'opacity', val: 0, prog: 0.75 },
        { key: 'opacity', val: 0.3, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const interferenceOffset1Effect: BaseEffect = {
    id: 'interference-offset-1',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: 2 / params.flickerSpeed,
      mode: 'provider',
      targetIds: [interference1Id],
      ranges: [
        { key: 'translateX', val: -2, prog: 0 },
        { key: 'translateX', val: 3, prog: 0.3 },
        { key: 'translateX', val: -1, prog: 0.6 },
        { key: 'translateX', val: 2, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // ============================================================================
  // Effects: Interference Flicker 2
  // ============================================================================

  const interferenceFlicker2Effect: BaseEffect = {
    id: 'interference-flicker-2',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: 2.5 / params.flickerSpeed,
      mode: 'provider',
      targetIds: [interference2Id],
      ranges: [
        { key: 'opacity', val: 0.3, prog: 0 },
        { key: 'opacity', val: 0, prog: 0.2 },
        { key: 'opacity', val: 0.5, prog: 0.35 },
        { key: 'opacity', val: 0.1, prog: 0.5 },
        { key: 'opacity', val: 0.4, prog: 0.65 },
        { key: 'opacity', val: 0, prog: 0.8 },
        { key: 'opacity', val: 0.3, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const interferenceOffset2Effect: BaseEffect = {
    id: 'interference-offset-2',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: 2.2 / params.flickerSpeed,
      mode: 'provider',
      targetIds: [interference2Id],
      ranges: [
        { key: 'translateX', val: 2, prog: 0 },
        { key: 'translateX', val: -3, prog: 0.4 },
        { key: 'translateX', val: 1, prog: 0.7 },
        { key: 'translateX', val: -2, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // ============================================================================
  // Effects: Scan Line Movement
  // ============================================================================

  const scanlineMovementEffect: BaseEffect = {
    id: 'scanline-movement',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: 3 / params.scanlineSpeed,
      mode: 'provider',
      targetIds: [scanlineBarId],
      ranges: [
        { key: 'translateY', val: -20, prog: 0 },
        { key: 'translateY', val: 1100, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const scanlineOpacityEffect: BaseEffect = {
    id: 'scanline-opacity-pulse',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: 0.5,
      mode: 'provider',
      targetIds: [scanlineBarId],
      ranges: [
        { key: 'opacity', val: 0.6, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.5 },
        { key: 'opacity', val: 0.6, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // ============================================================================
  // Component Tree Construction
  // ============================================================================

  // Main hologram text
  const mainHologramText: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: fontStyle.fontWeight || 700,
        background: 'linear-gradient(var(--hologram-angle, 45deg), #ff69b4, #00ffff, #ff69b4, #00ffff)',
        backgroundSize: '300% 300%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        textShadow: '-2px 0 #ff0066, 2px 0 #00ffff, 0 0 20px rgba(0, 255, 255, 0.5), 0 0 40px rgba(255, 105, 180, 0.3)',
      },
      font: {
        family: fontFamily,
        weights: [fontStyle.fontWeight?.toString() || '700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [rotation3DEffect, shimmerGradientEffect, hueCycleEffect],
  };

  // Interference text 1
  const interferenceText1: RenderableComponentData = {
    id: interference1Id,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        position: 'absolute',
        fontSize: params.fontSize,
        fontWeight: fontStyle.fontWeight || 700,
        color: 'rgba(255, 105, 180, 0.3)',
        mixBlendMode: 'screen',
        transform: 'scale(1.02) rotate(0.5deg)',
      },
      font: {
        family: fontFamily,
        weights: [fontStyle.fontWeight?.toString() || '700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [interferenceFlicker1Effect, interferenceOffset1Effect],
  };

  // Interference text 2
  const interferenceText2: RenderableComponentData = {
    id: interference2Id,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        position: 'absolute',
        fontSize: params.fontSize,
        fontWeight: fontStyle.fontWeight || 700,
        color: 'rgba(0, 255, 255, 0.3)',
        mixBlendMode: 'screen',
        transform: 'scale(0.98) rotate(-0.5deg)',
      },
      font: {
        family: fontFamily,
        weights: [fontStyle.fontWeight?.toString() || '700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [interferenceFlicker2Effect, interferenceOffset2Effect],
  };

  // 3D container for hologram texts
  const hologram3DContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
          ...positionStyles,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [mainHologramText, interferenceText1, interferenceText2] as RenderableComponentData[],
  };

  // Scan line bar
  const scanlineBar: RenderableComponentData = {
    id: scanlineBarId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute left-0 right-0',
        style: {
          height: '4px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(0, 255, 255, 0.8) 50%, transparent 100%)',
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.6), 0 0 40px rgba(255, 105, 180, 0.4)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [],
    effects: [scanlineMovementEffect, scanlineOpacityEffect],
  };

  // Scan line container
  const scanlineContainer: RenderableComponentData = {
    id: scanlineContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
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
    childrenData: [scanlineBar] as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black/90',
        style: {
          transformStyle: 'preserve-3d',
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [hologram3DContainer, scanlineContainer] as RenderableComponentData[],
  };

  // ============================================================================
  // Return Output
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
// Preset Metadata
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'holographic-projection-typography',
  title: 'Holographic Projection Typography',
  description:
    'A vintage hologram-style text display preset featuring iridescent pink/cyan shimmer gradients, 3D rotation effects, hologram flicker with interference patterns and doubling effects, animated scan lines, and chromatic dispersion at character edges. Simulates retro-futuristic holographic projection technology.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'hologram',
    'retro',
    'futuristic',
    'sci-fi',
    'cyberpunk',
    '3d',
    'glitch',
    'iridescent',
    'chromatic',
    'scanline',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'HOLOGRAM',
    fontSize: 120,
    font: 'Orbitron:700',
    duration: 10,
    position: { x: 'center', y: 'center' },
    intensity: 1,
    flickerSpeed: 1,
    scanlineSpeed: 1,
  },
};

// ============================================================================
// Export
// ============================================================================

export const holographicProjectionTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
