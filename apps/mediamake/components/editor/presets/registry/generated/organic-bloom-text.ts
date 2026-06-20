/**
 * Organic Bloom Text Effect Preset
 * 
 * A nature-inspired text animation where text outlines appear like dried branches
 * that suddenly bloom with color spreading through them like sap or life force.
 * The fill grows from multiple seed points within each letter, spreading organically
 * with varying speeds, creating a living, breathing text effect.
 * 
 * Features:
 * - Dried branch-like text outline appearance
 * - Multiple radial-gradient growth points (organic bloom)
 * - SVG filters for natural texture (feTurbulence, feDisplacementMap)
 * - Organic motion with spring easing
 * - Subtle sway animation (rotateZ)
 * - Floating particle effects (leaves/petals)
 * - Staggered growth timing for natural bloom sequence
 * - Gentle pulse at completion
 * 
 * Perfect for: Environmental, wellness, organic brand content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import {
  TextAtomData,
  GenericEffectData,
  BaseEffect,
} from '@microfox/remotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z
    .string()
    .default('BLOOM')
    .describe('Text content to display with organic bloom effect'),
  fontSize: z
    .number()
    .default(120)
    .describe('Font size in pixels for the text'),
  fontFamily: z
    .string()
    .default('Merriweather')
    .describe(
      'Font family (serif fonts work best for organic look, e.g., "Merriweather", "Playfair Display")',
    ),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "900")'),
  outlineColor: z
    .string()
    .default('#8B7355')
    .describe('Color for the dried branch-like outline (brown/earth tones work best)'),
  outlineWidth: z
    .number()
    .default(2)
    .describe('Width of the text stroke outline in pixels'),
  fillGradient: z
    .object({
      start: z
        .string()
        .default('#2D5016')
        .describe('Starting color of the fill gradient (darker green)'),
      mid: z
        .string()
        .default('#4A7C2B')
        .describe('Middle color of the fill gradient (medium green)'),
      end: z
        .string()
        .default('#6B9E3E')
        .describe('End color of the fill gradient (lighter green)'),
    })
    .default({})
    .describe('Gradient colors for the organic fill (sap/life force colors)'),
  growthPoints: z
    .array(
      z.object({
        x: z
          .number()
          .min(0)
          .max(100)
          .describe('X position as percentage (0-100)'),
        y: z
          .number()
          .min(0)
          .max(100)
          .describe('Y position as percentage (0-100)'),
        delay: z.number().describe('Start delay in seconds relative to bloom phase'),
        speed: z.number().describe('Growth speed multiplier (0.5-2.0)'),
      }),
    )
    .default([
      { x: 30, y: 50, delay: 0, speed: 1.0 },
      { x: 65, y: 40, delay: 0.4, speed: 1.2 },
      { x: 50, y: 70, delay: 0.8, speed: 0.8 },
    ])
    .describe(
      'Array of growth seed points with positions (x,y as %), timing delay, and speed multipliers',
    ),
  particleCount: z
    .number()
    .default(5)
    .describe('Number of floating particles (leaves/petals) to generate'),
  duration: z
    .number()
    .default(5)
    .describe('Total duration of the animation in seconds'),
  outlineFadeInDuration: z
    .number()
    .default(1)
    .describe('Duration for outline fade-in (0-20% of timeline)'),
  growthStartTime: z
    .number()
    .default(1)
    .describe('When growth phase begins (20% of timeline by default)'),
  growthDuration: z
    .number()
    .default(3)
    .describe('Duration of the growth phase (20-80% of timeline)'),
  completionPulseStart: z
    .number()
    .default(4)
    .describe('When completion pulse begins (80% of timeline)'),
  completionPulseDuration: z
    .number()
    .default(1)
    .describe('Duration of the completion pulse'),
  swayIntensity: z
    .number()
    .default(2)
    .describe('Intensity of the subtle sway motion in degrees'),
  textureIntensity: z
    .number()
    .default(8)
    .describe('Intensity of organic texture displacement (higher = more distortion)'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    fontWeight,
    outlineColor,
    outlineWidth,
    fillGradient,
    growthPoints,
    particleCount,
    duration,
    outlineFadeInDuration,
    growthStartTime,
    growthDuration,
    completionPulseStart,
    completionPulseDuration,
    swayIntensity,
    textureIntensity,
  } = params;

  // --- Helper: Create SVG Filter for Organic Texture ---
  const svgFilterHtml = `
    <svg width="0" height="0" style="position: absolute; pointer-events: none;">
      <defs>
        <filter id="organic-texture-filter">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="0.02" 
            numOctaves="3" 
            seed="2" 
          />
          <feDisplacementMap 
            in="SourceGraphic" 
            scale="${textureIntensity}" 
          />
        </filter>
      </defs>
    </svg>
  `;

  // --- Helper: Create Particle (Leaf/Petal) ---
  const createParticle = (index: number): RenderableComponentData => {
    const particleId = `particle-${index}`;
    const size = 10 + Math.random() * 4; // 10-14px
    const rotation = Math.random() * 360;
    const topPosition = 25 + Math.random() * 50; // 25-75%
    const leftPosition = 20 + Math.random() * 60; // 20-80%
    const floatDelay = Math.random() * 2;
    const floatDuration = 3 + Math.random() * 2; // 3-5s

    const particleHtml = `
      <div style="
        width: ${size}px; 
        height: ${size}px; 
        background: radial-gradient(circle, ${fillGradient.end} 0%, ${fillGradient.mid} 100%); 
        border-radius: 50% 40%; 
        transform: rotate(${rotation}deg);
      "></div>
    `;

    // Particle float effect
    const floatEffect: BaseEffect = {
      id: `particle-float-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: floatDelay,
        duration: floatDuration,
        mode: 'provider',
        targetIds: [particleId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.7, prog: 0.1 },
          { key: 'opacity', val: 0.7, prog: 0.9 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -50, prog: 1 },
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: (Math.random() - 0.5) * 30, prog: 1 },
          { key: 'rotate', val: rotation, prog: 0 },
          { key: 'rotate', val: rotation + 180, prog: 1 },
        ],
      } as GenericEffectData,
    };

    return {
      id: particleId,
      componentId: 'HTMLBlockAtom',
      type: 'atom' as const,
      data: {
        html: particleHtml,
        className: 'absolute',
        style: {
          top: `${topPosition}%`,
          left: `${leftPosition}%`,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [floatEffect],
    } as RenderableComponentData;
  };

  // --- SVG Filter Container ---
  const svgFilterContainer: RenderableComponentData = {
    id: 'svg-filter-container',
    componentId: 'HTMLBlockAtom',
    type: 'atom' as const,
    data: {
      html: svgFilterHtml,
      style: {
        position: 'absolute',
        width: 0,
        height: 0,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  } as RenderableComponentData;

  // --- Text Outline Layer (Dried Branches) ---
  const textOutlineId = 'text-outline-layer';
  const outlineFadeEffect: BaseEffect = {
    id: 'outline-fade-in',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: outlineFadeInDuration,
      mode: 'provider',
      targetIds: [textOutlineId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const textOutlineLayer: RenderableComponentData = {
    id: textOutlineId,
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text,
      className: `font-serif text-[${fontSize}px] font-bold`,
      style: {
        color: 'transparent',
        WebkitTextStroke: `${outlineWidth}px ${outlineColor}`,
        textStroke: `${outlineWidth}px ${outlineColor}`,
        filter: `url(#organic-texture-filter) drop-shadow(0 2px 4px rgba(0,0,0,0.1))`,
        fontWeight: fontWeight,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        display: 'swap',
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [outlineFadeEffect],
  } as RenderableComponentData;

  // --- Text Fill Layers (Growth Points) ---
  const textFillLayers: RenderableComponentData[] = growthPoints.map(
    (point, index) => {
      const fillLayerId = `text-fill-layer-${index}`;
      const growthEffectStart = growthStartTime + point.delay;
      const effectDuration = (growthDuration - point.delay) * (1 / point.speed);

      // Mask growth effect
      const maskGrowthEffect: BaseEffect = {
        id: `mask-growth-${index}`,
        componentId: 'generic',
        data: {
          type: 'spring',
          start: growthEffectStart,
          duration: effectDuration,
          mode: 'provider',
          targetIds: [fillLayerId],
          ranges: [
            {
              key: 'WebkitMaskImage',
              val: `radial-gradient(circle at ${point.x}% ${point.y}%, black 0%, transparent 0%)`,
              prog: 0,
            },
            {
              key: 'WebkitMaskImage',
              val: `radial-gradient(circle at ${point.x}% ${point.y}%, black 100%, transparent 100%)`,
              prog: 1,
            },
          ],
        } as GenericEffectData,
      };

      return {
        id: fillLayerId,
        componentId: 'TextAtom',
        type: 'atom' as const,
        data: {
          text,
          className: `font-serif text-[${fontSize}px] font-bold absolute`,
          style: {
            background: `linear-gradient(135deg, ${fillGradient.start} 0%, ${fillGradient.mid} 50%, ${fillGradient.end} 100%)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mixBlendMode: 'multiply',
            WebkitMaskImage: `radial-gradient(circle at ${point.x}% ${point.y}%, black 0%, transparent 0%)`,
            maskImage: `radial-gradient(circle at ${point.x}% ${point.y}%, black 0%, transparent 0%)`,
            filter: 'url(#organic-texture-filter)',
            fontWeight: fontWeight,
          },
          font: {
            family: fontFamily,
            weights: [fontWeight],
            display: 'swap',
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [maskGrowthEffect],
      } as RenderableComponentData;
    },
  );

  // --- Sway Animation (Applied to All Text Elements) ---
  const allTextIds = [
    textOutlineId,
    ...textFillLayers.map((layer) => layer.id),
  ];

  const swayEffect: BaseEffect = {
    id: 'sway-animation',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration,
      mode: 'provider',
      targetIds: allTextIds,
      ranges: [
        { key: 'rotate', val: -swayIntensity, prog: 0 },
        { key: 'rotate', val: swayIntensity, prog: 0.5 },
        { key: 'rotate', val: -swayIntensity, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // --- Completion Pulse (Applied to All Text) ---
  const completionPulseEffect: BaseEffect = {
    id: 'completion-pulse',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: completionPulseStart,
      duration: completionPulseDuration,
      mode: 'provider',
      targetIds: allTextIds,
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1.05, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Apply sway and pulse to outline layer
  textOutlineLayer.effects = [
    ...(textOutlineLayer.effects || []),
    swayEffect,
    completionPulseEffect,
  ];

  // Apply sway and pulse to fill layers
  textFillLayers.forEach((layer) => {
    layer.effects = [...(layer.effects || []), swayEffect, completionPulseEffect];
  });

  // --- Particles ---
  const particles: RenderableComponentData[] = Array.from(
    { length: particleCount },
    (_, i) => createParticle(i),
  );

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: 'organic-bloom-container',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className:
          'relative w-full h-full flex items-center justify-center bg-gradient-to-b from-green-50 to-green-100',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      svgFilterContainer,
      textOutlineLayer,
      ...textFillLayers,
      ...particles,
    ] as RenderableComponentData[],
  } as RenderableComponentData;

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
  id: 'organic-bloom-text',
  title: 'Organic Bloom Text Effect',
  description:
    'Nature-inspired text effect where outlines appear like dried branches that bloom with color spreading from multiple seed points. Features organic growth patterns, subtle sway motion, floating particle effects, and natural texture overlays. Perfect for environmental, wellness, or organic brand content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'organic',
    'nature',
    'bloom',
    'growth',
    'gradient',
    'particles',
    'environmental',
    'wellness',
    'spring',
    'texture',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'BLOOM',
    fontSize: 120,
    fontFamily: 'Merriweather',
    fontWeight: '700',
    outlineColor: '#8B7355',
    outlineWidth: 2,
    fillGradient: {
      start: '#2D5016',
      mid: '#4A7C2B',
      end: '#6B9E3E',
    },
    growthPoints: [
      { x: 30, y: 50, delay: 0, speed: 1.0 },
      { x: 65, y: 40, delay: 0.4, speed: 1.2 },
      { x: 50, y: 70, delay: 0.8, speed: 0.8 },
    ],
    particleCount: 5,
    duration: 5,
    outlineFadeInDuration: 1,
    growthStartTime: 1,
    growthDuration: 3,
    completionPulseStart: 4,
    completionPulseDuration: 1,
    swayIntensity: 2,
    textureIntensity: 8,
  },
};

// --- Export ---
export const organicBloomTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
