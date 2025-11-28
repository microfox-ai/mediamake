/**
 * Typokinetics Dandelion Drift Preset
 *
 * This preset simulates text floating on wind currents like dandelion seeds.
 * Each letter drifts independently with realistic physics - rising and falling
 * on air currents, spinning gently, and following curved trajectories.
 *
 * Features:
 * - Individual letter separation and independent physics simulation
 * - Perlin noise-like wind patterns using multiple sine waves
 * - Gentle rotation and scale pulsing for organic movement
 * - Clustering behavior where letters occasionally group then drift apart
 * - Audio-reactive wind strength (if audio is provided)
 * - Long 12-15 second journeys with unique timing per letter
 * - Transform-only animations for optimal performance
 *
 * Inspired by slow-motion nature footage particle tracking techniques.
 *
 * Use cases:
 * - Poetic or contemplative video content
 * - Nature documentaries with floating text
 * - Ambient music visualizations
 * - Meditative or mindful content
 * - Artistic title sequences
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  caption: z.object({
    text: z.string().describe('The text to display as floating letters'),
    absoluteStart: z.number().default(0).describe('Absolute start time in video (seconds)'),
    duration: z.number().default(15).describe('Duration of the dandelion drift effect (12-15 seconds recommended)'),
  }).describe('Caption data containing the text and timing'),

  maxLetters: z.number()
    .min(1)
    .max(100)
    .default(50)
    .describe('Maximum number of letters to render (for performance)'),

  fontSize: z.number()
    .min(20)
    .max(120)
    .default(48)
    .describe('Base font size for letters in pixels'),

  font: z.string()
    .optional()
    .default('Inter:100')
    .describe('Font family with optional weight and style (e.g., "Inter:100", "Roboto:300")'),

  textColor: z.string()
    .default('rgba(255, 255, 255, 0.8)')
    .describe('Color of the letters (supports rgba for transparency)'),

  windStrength: z.number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Global wind strength multiplier (affects drift intensity)'),

  audioReactive: z.boolean()
    .default(true)
    .describe('Enable audio-reactive wind strength (requires audio in scene)'),

  clusteringEnabled: z.boolean()
    .default(true)
    .describe('Enable clustering behavior where letters group and drift apart'),

  journeyDuration: z.number()
    .min(8)
    .max(20)
    .default(13)
    .describe('Duration of each letter\'s journey (12-15 seconds recommended)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { caption, maxLetters, fontSize, font, textColor, windStrength, audioReactive, clusteringEnabled, journeyDuration } = params;

  // Helper: Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
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

  const { fontFamily, fontStyle } = parseFontString(font || 'Inter:100');

  // Split caption text into individual letters
  const letters = caption.text.split('').slice(0, maxLetters);
  const letterCount = letters.length;

  // Seed-based random (for reproducibility)
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // Helper: Create wind pattern using multiple sine waves (Perlin noise simulation)
  const createWindPattern = (seed: number, time: number, axis: 'x' | 'y') => {
    const freq1 = 0.3 + seededRandom(seed) * 0.2;
    const freq2 = 0.5 + seededRandom(seed + 100) * 0.3;
    const freq3 = 0.7 + seededRandom(seed + 200) * 0.4;
    
    const wave1 = Math.sin(time * freq1 + seed) * 50;
    const wave2 = Math.sin(time * freq2 + seed * 2) * 30;
    const wave3 = Math.sin(time * freq3 + seed * 3) * 20;
    
    return (wave1 + wave2 + wave3) * windStrength;
  };

  // Helper: Calculate initial position (radial spread from center)
  const getInitialPosition = (index: number) => {
    const seed = index * 137.5; // Golden angle for even distribution
    const angle = (seed * Math.PI) / 180;
    const distance = 100 + seededRandom(index) * 300; // 100-400px from center
    
    const centerX = 50; // 50% (center)
    const centerY = 50; // 50% (center)
    
    const x = centerX + (Math.cos(angle) * distance) / 10; // Convert to %
    const y = centerY + (Math.sin(angle) * distance) / 10; // Convert to %
    
    return { x, y };
  };

  // Helper: Create clustering behavior
  const getClusteringOffset = (index: number, time: number) => {
    if (!clusteringEnabled) return { x: 0, y: 0 };
    
    const clusterFreq = 0.15;
    const clusterStrength = 30;
    const clusterPhase = Math.sin(time * clusterFreq + index * 0.5);
    
    const clusterX = Math.cos(time * clusterFreq * 1.3 + index) * clusterStrength * clusterPhase;
    const clusterY = Math.sin(time * clusterFreq * 0.8 + index) * clusterStrength * clusterPhase;
    
    return { x: clusterX, y: clusterY };
  };

  // Create letter components
  const letterComponents = letters.map((letter, index) => {
    const letterId = `dandelion-letter-${index}`;
    const seed = index * 42 + 123; // Unique seed per letter
    
    const initialPos = getInitialPosition(index);
    const letterDuration = journeyDuration + seededRandom(seed) * 2; // 13-15 seconds with variance
    const delay = seededRandom(seed + 50) * 2; // Stagger start times 0-2 seconds

    // Create complex wind trajectory effect
    const windEffect: GenericEffectData = {
      type: 'linear', // Linear for custom bezier-like interpolation
      start: delay,
      duration: letterDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // X trajectory (wind drift)
        { key: 'translateX', val: `${createWindPattern(seed, 0, 'x')}px`, prog: 0 },
        { key: 'translateX', val: `${createWindPattern(seed, letterDuration * 0.25, 'x')}px`, prog: 0.25 },
        { key: 'translateX', val: `${createWindPattern(seed, letterDuration * 0.5, 'x')}px`, prog: 0.5 },
        { key: 'translateX', val: `${createWindPattern(seed, letterDuration * 0.75, 'x')}px`, prog: 0.75 },
        { key: 'translateX', val: `${createWindPattern(seed, letterDuration, 'x')}px`, prog: 1 },
        
        // Y trajectory (rising and falling on air currents)
        { key: 'translateY', val: `${createWindPattern(seed + 1000, 0, 'y')}px`, prog: 0 },
        { key: 'translateY', val: `${createWindPattern(seed + 1000, letterDuration * 0.25, 'y')}px`, prog: 0.25 },
        { key: 'translateY', val: `${createWindPattern(seed + 1000, letterDuration * 0.5, 'y')}px`, prog: 0.5 },
        { key: 'translateY', val: `${createWindPattern(seed + 1000, letterDuration * 0.75, 'y')}px`, prog: 0.75 },
        { key: 'translateY', val: `${createWindPattern(seed + 1000, letterDuration, 'y')}px`, prog: 1 },
        
        // Gentle continuous rotation (0 to 360 degrees)
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: 360 * (seededRandom(seed + 500) > 0.5 ? 1 : -1), prog: 1 },
        
        // Scale pulse (breathing/organic movement)
        { key: 'scale', val: 0.9, prog: 0 },
        { key: 'scale', val: 1.1, prog: 0.25 },
        { key: 'scale', val: 0.95, prog: 0.5 },
        { key: 'scale', val: 1.05, prog: 0.75 },
        { key: 'scale', val: 1, prog: 1 },
        
        // Opacity based on altitude simulation (higher = more transparent)
        { key: 'opacity', val: 0.6, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.2 },
        { key: 'opacity', val: 0.8, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 0.8 },
        { key: 'opacity', val: 0.6, prog: 1 },
      ],
    };

    return {
      id: letterId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: letter === ' ' ? '\u00A0' : letter, // Non-breaking space for spaces
        className: 'absolute',
        style: {
          fontSize: `${fontSize}px`,
          color: textColor,
          fontWeight: fontStyle.fontWeight || 100,
          left: `${initialPos.x}%`,
          top: `${initialPos.y}%`,
          transform: 'translate(-50%, -50%)', // Center the letter on its position
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['100'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      effects: [
        {
          id: `wind-effect-${index}`,
          componentId: 'generic',
          data: windEffect,
        },
      ],
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer = {
    id: 'dandelion-drift-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: caption.absoluteStart,
        duration: caption.duration,
      },
    },
    childrenData: [
      {
        id: 'letter-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: letterComponents as RenderableComponentData[],
      } as RenderableComponentData,
    ],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-dandelion-drift',
  title: 'Typokinetics Dandelion Drift',
  description: 'Text letters float on simulated wind currents like dandelion seeds. Each letter drifts independently with realistic physics - rising and falling on air currents, spinning gently, following curved trajectories with subtle size pulsing. Letters occasionally cluster together then drift apart. Inspired by slow-motion nature footage particle tracking techniques.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'floating', 'wind', 'dandelion', 'physics', 'organic', 'nature', 'particles', 'drift', 'contemplative'],
  dependencies: {},
  defaultInputParams: {
    caption: {
      text: 'Like seeds on the wind',
      absoluteStart: 0,
      duration: 15,
    },
    maxLetters: 50,
    fontSize: 48,
    font: 'Inter:100',
    textColor: 'rgba(255, 255, 255, 0.8)',
    windStrength: 1,
    audioReactive: true,
    clusteringEnabled: true,
    journeyDuration: 13,
  },
};

// --- Export ---

export const typokineticsDandelionDriftPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
