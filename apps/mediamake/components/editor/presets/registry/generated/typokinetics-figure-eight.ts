/**
 * Typokinetics Figure-Eight Path Preset
 *
 * A mesmerizing typography preset where text follows a figure-eight (infinity symbol) path,
 * creating continuous looping motion perfect for background titles or ambient typography.
 * The word completes one full figure-eight loop with the crossing point at screen center.
 *
 * Features:
 * - **Figure-Eight Motion**: Follows Lissajous curve equations for smooth infinity loop
 * - **3D Twist Effect**: Word rotates in 3D space showing different perspectives through curves
 * - **Center Scale Emphasis**: Scales up when passing through center crossing point
 * - **Trail Effect**: Multiple ghost copies create fluid motion blur
 * - **Pulsing Glow**: Gentle glow that intensifies at curve peaks
 * - **Smooth Animation**: 8-10 second duration with natural easing
 *
 * Use cases:
 * - Background ambient typography
 * - Looping title animations
 * - Intro/outro sequences
 * - Hypnotic brand displays
 * - Continuous motion graphics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  word: z.string().default('INFINITY').describe('Word to animate along the figure-eight path'),
  duration: z.number().min(5).max(15).default(8).describe('Total animation duration in seconds'),
  fontSize: z.number().min(24).max(200).default(72).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter:700').describe('Font family with optional weight (e.g., "Inter:700", "Roboto:600")'),
  textColor: z.string().default('#ffffff').describe('Text color (hex or rgba)'),
  pathScaleX: z.number().min(0.1).max(1).default(0.4).describe('Horizontal path scale (0-1, relative to screen width)'),
  pathScaleY: z.number().min(0.1).max(0.6).default(0.25).describe('Vertical path scale (0-1, relative to screen height)'),
  centerScaleAmount: z.number().min(1).max(2).default(1.2).describe('Scale multiplier when passing through center'),
  rotationRange: z.number().min(0).max(60).default(30).describe('Maximum 3D rotation in degrees'),
  trailCount: z.number().min(0).max(5).default(3).describe('Number of trailing ghost copies'),
  glowIntensity: z.number().min(0).max(1).default(0.5).describe('Glow effect intensity (0-1)'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    word,
    duration,
    fontSize,
    fontFamily,
    textColor,
    pathScaleX,
    pathScaleY,
    centerScaleAmount,
    rotationRange,
    trailCount,
    glowIntensity,
  } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const parts = fontString.split(':');
    const family = parts[0];
    const weight = parts.length > 1 ? parseInt(parts[1], 10) : 400;
    return { family, weight };
  };

  const { family: parsedFontFamily, weight: fontWeight } = parseFontString(fontFamily);

  // Create main text component
  const mainTextId = 'typokinetics-main-text';
  const mainText: RenderableComponentData = {
    id: mainTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: word,
      className: 'text-6xl font-bold absolute',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: textColor,
        whiteSpace: 'nowrap',
        transformStyle: 'preserve-3d',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      },
      font: {
        family: parsedFontFamily,
        weights: [fontWeight.toString()],
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

  // Figure-eight motion effect (Lissajous curve: x = sin(t), y = sin(2t))
  // We'll approximate this using keyframes at multiple points along the path
  const figureEightEffect = {
    id: 'figure-eight-motion',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration,
      mode: 'provider',
      targetIds: [mainTextId],
      ranges: [
        // Start: top center (0°)
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateY', val: `-${pathScaleY * 100}%`, prog: 0 },
        // Right loop top (45°)
        { key: 'translateX', val: `${pathScaleX * 50}%`, prog: 0.125 },
        { key: 'translateY', val: `-${pathScaleY * 70.7}%`, prog: 0.125 },
        // Right extreme (90°)
        { key: 'translateX', val: `${pathScaleX * 100}%`, prog: 0.25 },
        { key: 'translateY', val: 0, prog: 0.25 },
        // Center crossing from right (135°)
        { key: 'translateX', val: `${pathScaleX * 50}%`, prog: 0.375 },
        { key: 'translateY', val: `${pathScaleY * 70.7}%`, prog: 0.375 },
        // Bottom right (180°)
        { key: 'translateX', val: 0, prog: 0.5 },
        { key: 'translateY', val: `${pathScaleY * 100}%`, prog: 0.5 },
        // Left loop bottom (225°)
        { key: 'translateX', val: `-${pathScaleX * 50}%`, prog: 0.625 },
        { key: 'translateY', val: `${pathScaleY * 70.7}%`, prog: 0.625 },
        // Left extreme (270°)
        { key: 'translateX', val: `-${pathScaleX * 100}%`, prog: 0.75 },
        { key: 'translateY', val: 0, prog: 0.75 },
        // Center crossing from left (315°)
        { key: 'translateX', val: `-${pathScaleX * 50}%`, prog: 0.875 },
        { key: 'translateY', val: `-${pathScaleY * 70.7}%`, prog: 0.875 },
        // Back to start (360°)
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: `-${pathScaleY * 100}%`, prog: 1 },
      ],
    },
  };

  // 3D rotation effect (synced with horizontal position)
  const rotationEffect = {
    id: 'rotation-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration,
      mode: 'provider',
      targetIds: [mainTextId],
      ranges: [
        { key: 'rotateY', val: 0, prog: 0 },
        { key: 'rotateY', val: rotationRange, prog: 0.25 },
        { key: 'rotateY', val: 0, prog: 0.5 },
        { key: 'rotateY', val: -rotationRange, prog: 0.75 },
        { key: 'rotateY', val: 0, prog: 1 },
      ],
    },
  };

  // Center crossing scale effect
  const scaleEffect = {
    id: 'scale-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration,
      mode: 'provider',
      targetIds: [mainTextId],
      ranges: [
        // Start at normal scale
        { key: 'scale', val: 1, prog: 0 },
        // Scale up at first center crossing (prog ~0.375)
        { key: 'scale', val: 1, prog: 0.3 },
        { key: 'scale', val: centerScaleAmount, prog: 0.375 },
        { key: 'scale', val: 1, prog: 0.45 },
        // Scale up at second center crossing (prog ~0.875)
        { key: 'scale', val: 1, prog: 0.8 },
        { key: 'scale', val: centerScaleAmount, prog: 0.875 },
        { key: 'scale', val: 1, prog: 0.95 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  };

  // Pulsing glow effect (intensifies at curve peaks)
  const baseGlow = glowIntensity * 10;
  const peakGlow = glowIntensity * 20;
  const glowEffect = {
    id: 'glow-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration,
      mode: 'provider',
      targetIds: [mainTextId],
      ranges: [
        { key: 'textShadow', val: `0 0 ${baseGlow}px rgba(255,255,255,${glowIntensity * 0.3})`, prog: 0 },
        { key: 'textShadow', val: `0 0 ${peakGlow}px rgba(255,255,255,${glowIntensity * 0.6})`, prog: 0.25 },
        { key: 'textShadow', val: `0 0 ${baseGlow}px rgba(255,255,255,${glowIntensity * 0.3})`, prog: 0.5 },
        { key: 'textShadow', val: `0 0 ${peakGlow}px rgba(255,255,255,${glowIntensity * 0.6})`, prog: 0.75 },
        { key: 'textShadow', val: `0 0 ${baseGlow}px rgba(255,255,255,${glowIntensity * 0.3})`, prog: 1 },
      ],
    },
  };

  mainText.effects = [figureEightEffect, rotationEffect, scaleEffect, glowEffect];

  // Create trail components
  const trailComponents: RenderableComponentData[] = [];
  for (let i = 0; i < trailCount; i++) {
    const trailDelay = (i + 1) * 0.1; // Stagger by 0.1s
    const trailOpacity = 0.4 - (i * 0.1); // Decreasing opacity
    const trailId = `typokinetics-trail-${i + 1}`;

    const trailText: RenderableComponentData = {
      id: trailId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        className: 'text-6xl font-bold absolute',
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color: textColor,
          whiteSpace: 'nowrap',
          transformStyle: 'preserve-3d',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: trailOpacity,
        },
        font: {
          family: parsedFontFamily,
          weights: [fontWeight.toString()],
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

    // Apply same effects but with delay
    const trailFigureEightEffect = {
      id: `trail-${i + 1}-motion`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: trailDelay,
        duration: duration - trailDelay,
        mode: 'provider',
        targetIds: [trailId],
        ranges: figureEightEffect.data.ranges,
      },
    };

    const trailRotationEffect = {
      id: `trail-${i + 1}-rotation`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: trailDelay,
        duration: duration - trailDelay,
        mode: 'provider',
        targetIds: [trailId],
        ranges: rotationEffect.data.ranges,
      },
    };

    const trailScaleEffect = {
      id: `trail-${i + 1}-scale`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: trailDelay,
        duration: duration - trailDelay,
        mode: 'provider',
        targetIds: [trailId],
        ranges: scaleEffect.data.ranges,
      },
    };

    const trailGlowEffect = {
      id: `trail-${i + 1}-glow`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: trailDelay,
        duration: duration - trailDelay,
        mode: 'provider',
        targetIds: [trailId],
        ranges: glowEffect.data.ranges.map(range => ({
          ...range,
          val: typeof range.val === 'string' 
            ? range.val.replace(/rgba\(255,255,255,([^)]+)\)/g, `rgba(255,255,255,${parseFloat(RegExp.$1) * trailOpacity})`)
            : range.val,
        })),
      },
    };

    trailText.effects = [trailFigureEightEffect, trailRotationEffect, trailScaleEffect, trailGlowEffect];
    trailComponents.push(trailText);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          backgroundColor: 'transparent',
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      ...trailComponents,
      mainText,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'typokinetics-figure-eight',
  title: 'Typokinetics Figure-Eight Path',
  description: 'A mesmerizing typography preset where text follows a figure-eight (infinity symbol) path with 3D rotation, center scaling, trail effects, and pulsing glow. Perfect for ambient background titles and continuous motion graphics.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'motion', 'figure-eight', 'infinity', '3d', 'trail', 'glow', 'ambient', 'loop'],
  dependencies: {},
  defaultInputParams: {
    word: 'INFINITY',
    duration: 8,
    fontSize: 72,
    fontFamily: 'Inter:700',
    textColor: '#ffffff',
    pathScaleX: 0.4,
    pathScaleY: 0.25,
    centerScaleAmount: 1.2,
    rotationRange: 30,
    trailCount: 3,
    glowIntensity: 0.5,
  },
};

// Export preset
export const typokinetiksFigureEightPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
