/**
 * Magical Sparkle Script Animation Preset
 * 
 * This preset creates an ethereal handwritten text animation where golden particles
 * spiral through the air and coalesce into elegant script letters. Features include:
 * - Swirling stardust particles that converge into text
 * - Multi-stage particle system with circular paths and spiral convergence
 * - Prismatic color shifts and aurora-like glow effects
 * - Trailing sparkles that linger after letter formation
 * - Smooth particle animations with twinkling patterns
 * 
 * Use cases:
 * - Magical fairy tale intros
 * - Dreamy title sequences
 * - Fantasy-themed content
 * - Wedding or special event videos
 * - Enchanting brand reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().default('Magical Dreams').describe('The text to materialize from sparkles'),
  font: z
    .string()
    .default('Great Vibes:400:normal')
    .describe('Font family with optional weight and style (e.g., "Great Vibes:400:normal", "Tangerine:700:normal")'),
  duration: z.number().default(8).describe('Total duration of the animation in seconds'),
  particleCount: z.number().min(20).max(100).default(50).describe('Number of sparkle particles'),
  particleConvergenceDuration: z.number().default(2).describe('Time for particles to converge per letter in seconds'),
  textRevealDelay: z.number().default(0.8).describe('Text reveals at this ratio through particle convergence (0-1)'),
  trailingDuration: z.number().default(1).describe('Duration trailing particles linger after formation in seconds'),
  baseColor: z.string().default('#FFD700').describe('Base color for particles and text (golden)'),
  glowColor: z.string().default('rgba(255, 215, 0, 0.8)').describe('Aurora glow color'),
  textSize: z.number().default(80).describe('Font size in pixels'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    font,
    duration,
    particleCount,
    particleConvergenceDuration,
    textRevealDelay,
    trailingDuration,
    baseColor,
    glowColor,
    textSize,
  } = params;

  // Parse font string
  const fontString = font || 'Great Vibes';
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

  // Helper: Generate particle initial positions (circular orbit pattern)
  const generateParticlePositions = (count: number) => {
    const particles = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 30 + Math.random() * 20; // 30-50% from center
      const x = 50 + Math.cos(angle) * radius;
      const y = 50 + Math.sin(angle) * radius;
      
      particles.push({
        id: `particle-${i}`,
        x,
        y,
        rotation: Math.random() * 360,
        delay: Math.random() * 0.5,
        hueShift: Math.random() * 60 - 30, // -30 to +30 deg
      });
    }
    return particles;
  };

  const particles = generateParticlePositions(particleCount);

  // Create particle elements
  const particleElements: RenderableComponentData[] = particles.map((particle) => {
    const particleId = particle.id;
    const particleSize = 2 + Math.random() * 2; // 2-4px
    
    // Particle HTML
    const particleHtml = `
      <div 
        class="absolute rounded-full"
        style="
          width: ${particleSize}px;
          height: ${particleSize}px;
          background: ${baseColor};
          box-shadow: 0 0 ${particleSize * 5}px ${glowColor};
          filter: hue-rotate(${particle.hueShift}deg);
        "
      ></div>
    `;

    // Multi-stage animation:
    // 1. Initial spiral orbit (0 - convergenceDuration)
    // 2. Converge to center (convergenceDuration - textRevealTime)
    // 3. Trailing fade (textRevealTime - end)
    
    const convergenceStart = particle.delay;
    const convergenceDuration = particleConvergenceDuration;
    const textRevealTime = convergenceStart + convergenceDuration * textRevealDelay;
    const fadeoutStart = textRevealTime;
    const fadeoutDuration = trailingDuration;

    // Initial orbit effect (circular path using translateX/Y)
    const orbitEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: convergenceStart + convergenceDuration,
      mode: 'provider',
      targetIds: [particleId],
      ranges: [
        // Circular motion with sin/cos
        { key: 'translateX', val: `${(particle.x - 50) * 2}%`, prog: 0 },
        { key: 'translateX', val: `${Math.cos(Math.PI * 2 * 2) * (particle.x - 50) * 2}%`, prog: 0.5 },
        { key: 'translateX', val: '0%', prog: 1 },
        
        { key: 'translateY', val: `${(particle.y - 50) * 2}%`, prog: 0 },
        { key: 'translateY', val: `${Math.sin(Math.PI * 2 * 2) * (particle.y - 50) * 2}%`, prog: 0.5 },
        { key: 'translateY', val: '0%', prog: 1 },
        
        // Rotation sparkle
        { key: 'rotate', val: particle.rotation, prog: 0 },
        { key: 'rotate', val: particle.rotation + 720, prog: 1 },
        
        // Scale twinkle pattern
        { key: 'scale', val: 0.5, prog: 0 },
        { key: 'scale', val: 1.5, prog: 0.3 },
        { key: 'scale', val: 1, prog: 0.6 },
        { key: 'scale', val: 1.5, prog: 0.8 },
        { key: 'scale', val: 1, prog: 1 },
        
        // Opacity twinkle
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.1 },
        { key: 'opacity', val: 0.6, prog: 0.4 },
        { key: 'opacity', val: 1, prog: 0.7 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    // Trailing fadeout with drift
    const fadeoutEffect: GenericEffectData = {
      type: 'ease-out',
      start: fadeoutStart,
      duration: fadeoutDuration,
      mode: 'provider',
      targetIds: [particleId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
        
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 0, prog: 1 },
        
        // Slight upward drift
        { key: 'translateY', val: '0%', prog: 0 },
        { key: 'translateY', val: '-10%', prog: 1 },
      ],
    };

    return {
      id: particleId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: particleHtml,
        className: 'pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `${particleId}-orbit`,
          componentId: 'generic',
          data: orbitEffect,
        },
        {
          id: `${particleId}-fadeout`,
          componentId: 'generic',
          data: fadeoutEffect,
        },
      ],
    } as RenderableComponentData;
  });

  // Aurora glow layer (animated radial gradient with hue-rotate)
  const auroraHtml = `
    <div 
      class="absolute inset-0 opacity-40 pointer-events-none"
      style="
        background: radial-gradient(circle at 50% 50%, ${glowColor.replace('0.8', '0.6')}, transparent 70%);
      "
    ></div>
  `;

  const auroraElement: RenderableComponentData = {
    id: 'aurora-glow',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: auroraHtml,
      className: 'pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'aurora-hue-rotate',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['aurora-glow'],
          ranges: [
            { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
            { key: 'filter', val: 'hue-rotate(60deg)', prog: 0.5 },
            { key: 'filter', val: 'hue-rotate(0deg)', prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  } as RenderableComponentData;

  // Text layer - reveals as particles arrive
  const textRevealStart = particleConvergenceDuration * textRevealDelay;
  const textRevealDuration = 1.5;

  const textElement: RenderableComponentData = {
    id: 'magical-text',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
        display: 'swap',
      },
      style: {
        fontSize: `${textSize}px`,
        color: baseColor,
        textShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor.replace('0.8', '0.5')}`,
        letterSpacing: '0.05em',
        textAlign: 'center',
        ...fontStyle,
      },
      className: 'text-center',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'text-reveal',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: textRevealStart,
          duration: textRevealDuration,
          mode: 'provider',
          targetIds: ['magical-text'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1.1, prog: 0.7 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      },
      {
        id: 'text-glow-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: textRevealStart + textRevealDuration,
          duration: duration - (textRevealStart + textRevealDuration),
          mode: 'provider',
          targetIds: ['magical-text'],
          ranges: [
            { key: 'filter', val: 'brightness(1)', prog: 0 },
            { key: 'filter', val: 'brightness(1.2)', prog: 0.5 },
            { key: 'filter', val: 'brightness(1)', prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  } as RenderableComponentData;

  // Particle container layer
  const particleLayer: RenderableComponentData = {
    id: 'particle-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: particleElements,
  } as RenderableComponentData;

  // Text layer
  const textLayer: RenderableComponentData = {
    id: 'text-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative z-10 flex items-center justify-center w-full h-full mix-blend-screen',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textElement],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'magical-sparkle-script-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gradient-to-b from-indigo-900 to-purple-900',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [auroraElement, particleLayer, textLayer] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'magical-sparkle-script',
  title: 'Magical Sparkle Script Animation',
  description:
    'Ethereal handwritten text animation where golden particles spiral through the air and coalesce into elegant script letters. Features swirling stardust, prismatic color shifts, aurora-like glow, and trailing sparkles for a dreamlike fairy tale effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'magical',
    'sparkle',
    'particles',
    'fairy-tale',
    'ethereal',
    'script',
    'handwritten',
    'stardust',
    'aurora',
    'glow',
    'golden',
    'dreamy',
    'enchanting',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Magical Dreams',
    font: 'Great Vibes:400:normal',
    duration: 8,
    particleCount: 50,
    particleConvergenceDuration: 2,
    textRevealDelay: 0.8,
    trailingDuration: 1,
    baseColor: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 0.8)',
    textSize: 80,
  },
};

// Export preset
export const magicalSparkleScriptPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
