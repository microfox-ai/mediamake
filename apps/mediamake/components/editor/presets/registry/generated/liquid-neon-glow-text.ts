/**
 * Liquid Neon Glow Text Effect Preset
 *
 * Creates an organic, liquid neon effect where glow flows around text outlines like luminescent 
 * liquid mercury. The text appears submerged in a glowing, viscous fluid that constantly shifts 
 * and morphs around the letterforms. Features metaball-like blob merging using CSS goo effect 
 * (blur + contrast), undulating glow animations with sine-wave easing, and refractive distortion 
 * overlay for a water-like appearance.
 *
 * Technical Implementation:
 * - Goo effect container: Uses CSS filter: blur(8px) contrast(15) to create metaball merging
 * - Multiple animated blob shapes with circular motion paths
 * - Blurred text layer behind main text for liquid glow effect
 * - Refractive distortion overlay with backdrop-filter
 * - Different animation durations (2.8s, 3.3s, 4.1s, 3.7s) for organic, non-synchronized movement
 * - Main text layer with crisp edges on top
 *
 * Use cases:
 * - Futuristic title cards with liquid glow effects
 * - Sci-fi themed text overlays
 * - Product reveals with neon aesthetic
 * - Music visualizers with flowing energy
 * - Tech product demonstrations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  text: z.string().describe('Text content to display with liquid neon effect'),
  
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Duration in seconds for the effect'),
  
  primaryColor: z
    .string()
    .default('#00d4ff')
    .describe('Primary neon glow color (e.g., "#00d4ff" for cyan)'),
  
  secondaryColor: z
    .string()
    .default('#0088ff')
    .describe('Secondary blob color for variation'),
  
  accentColor: z
    .string()
    .default('#00ffcc')
    .describe('Accent color for additional visual interest'),
  
  purpleAccent: z
    .string()
    .default('#6600ff')
    .describe('Purple accent color for contrasting blobs'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Main text color (crisp layer on top)'),
  
  fontSize: z
    .string()
    .default('6xl')
    .describe('Tailwind font size class (e.g., "6xl", "5xl", "4xl")'),
  
  glowIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for glow effects (0.5-3)'),
  
  blobCount: z
    .number()
    .min(2)
    .max(8)
    .default(4)
    .describe('Number of animated blob shapes (2-8)'),
  
  animationSpeed: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Animation speed multiplier (0.5 = slower, 2 = faster)'),
  
  refractionOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity of refraction overlay (0-1)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters
  const {
    text,
    duration,
    primaryColor,
    secondaryColor,
    accentColor,
    purpleAccent,
    textColor,
    fontSize,
    glowIntensity,
    blobCount,
    animationSpeed,
    refractionOpacity,
  } = params;

  // Helper: Generate blob configurations
  const generateBlobConfigs = (count: number) => {
    const colors = [primaryColor, secondaryColor, accentColor, purpleAccent];
    const sizes = [80, 64, 96, 56]; // w-20=80px, w-16=64px, w-24=96px, w-14=56px
    const positions = [
      { top: '40%', left: '20%' },
      { top: '45%', left: '60%' },
      { top: '50%', left: '40%' },
      { top: '35%', left: '75%' },
      { top: '55%', left: '15%' },
      { top: '38%', left: '85%' },
      { top: '42%', left: '30%' },
      { top: '48%', left: '70%' },
    ];
    
    return Array.from({ length: Math.min(count, 8) }, (_, index) => ({
      id: `blob-${index + 1}`,
      size: sizes[index % sizes.length],
      color: colors[index % colors.length],
      position: positions[index % positions.length],
    }));
  };

  // Helper: Calculate animation durations for organic movement
  const calculateAnimationDurations = (baseSpeed: number) => {
    const baseDurations = [2.8, 3.3, 4.1, 3.7, 3.0, 3.5, 2.9, 3.8];
    return baseDurations.map(d => d / baseSpeed);
  };

  const blobConfigs = generateBlobConfigs(blobCount);
  const animationDurations = calculateAnimationDurations(animationSpeed);

  // Create blob components
  const blobComponents: RenderableComponentData[] = blobConfigs.map((blob, index) => {
    const animDuration = animationDurations[index % animationDurations.length];
    
    return {
      id: blob.id,
      componentId: 'HTMLBlockAtom',
      type: 'atom' as const,
      data: {
        html: `<div style="width: ${blob.size}px; height: ${blob.size}px; border-radius: 50%; background-color: ${blob.color};"></div>`,
        className: 'absolute mix-blend-screen',
        style: {
          top: blob.position.top,
          left: blob.position.left,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: `blob-motion-${blob.id}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: animDuration,
            mode: 'provider',
            targetIds: [blob.id],
            ranges: [
              // Circular motion using sine/cosine-like patterns
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 30, prog: 0.25 },
              { key: 'translateX', val: 0, prog: 0.5 },
              { key: 'translateX', val: -30, prog: 0.75 },
              { key: 'translateX', val: 0, prog: 1 },
              
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -25, prog: 0.125 },
              { key: 'translateY', val: -30, prog: 0.375 },
              { key: 'translateY', val: -25, prog: 0.625 },
              { key: 'translateY', val: 0, prog: 0.875 },
              { key: 'translateY', val: 0, prog: 1 },
              
              // Subtle scale pulsing
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.1, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Create glowing text layer (blurred background)
  const glowTextLayer: RenderableComponentData = {
    id: 'glow-text-layer',
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text,
      className: `text-${fontSize} font-bold absolute`,
      style: {
        color: primaryColor,
        textShadow: `0 0 ${20 * glowIntensity}px ${primaryColor}, 0 0 ${40 * glowIntensity}px ${primaryColor}, 0 0 ${60 * glowIntensity}px ${secondaryColor}`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'glow-blur-animation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 3 / animationSpeed,
          mode: 'provider',
          targetIds: ['glow-text-layer'],
          ranges: [
            { key: 'filter', val: `blur(${3 * glowIntensity}px)`, prog: 0 },
            { key: 'filter', val: `blur(${8 * glowIntensity}px)`, prog: 0.5 },
            { key: 'filter', val: `blur(${3 * glowIntensity}px)`, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create goo effect container
  const gooEffectContainer: RenderableComponentData = {
    id: 'goo-effect-container',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0 z-0 flex items-center justify-center',
        style: {
          filter: 'blur(8px) contrast(15)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [glowTextLayer, ...blobComponents],
  };

  // Create main text layer (crisp, on top)
  const mainTextLayer: RenderableComponentData = {
    id: 'main-text-layer',
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text,
      className: `text-${fontSize} font-bold relative z-10`,
      style: {
        color: textColor,
        textShadow: `0 0 10px rgba(0, 212, 255, ${0.8 * glowIntensity}), 0 0 20px rgba(0, 212, 255, ${0.6 * glowIntensity})`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Create refraction overlay
  const refractionOverlay: RenderableComponentData = {
    id: 'refraction-overlay',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0 z-20 pointer-events-none',
        style: {
          backdropFilter: 'blur(2px)',
          opacity: refractionOpacity,
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

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-neon-root',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-gradient-to-br from-gray-900 to-black flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [gooEffectContainer, mainTextLayer, refractionOverlay],
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
  id: 'liquid-neon-glow-text',
  title: 'Liquid Neon Glow Text Effect',
  description:
    'An organic, liquid neon effect where glow flows around text outlines like luminescent liquid mercury. Features metaball-like blob merging using CSS goo effect (blur + contrast), undulating glow animations with sine-wave easing, and refractive distortion overlay. Creates a viscous, alive feeling with blobs pulsing at different rates.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'effects',
    'neon',
    'liquid',
    'glow',
    'metaball',
    'organic',
    'sci-fi',
    'futuristic',
    'animated',
    'viscous',
    'mercury',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'LIQUID NEON',
    duration: 10,
    primaryColor: '#00d4ff',
    secondaryColor: '#0088ff',
    accentColor: '#00ffcc',
    purpleAccent: '#6600ff',
    textColor: '#ffffff',
    fontSize: '6xl',
    glowIntensity: 1,
    blobCount: 4,
    animationSpeed: 1,
    refractionOpacity: 0.3,
  },
};

// --- Export ---

export const liquidNeonGlowTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
