/**
 * Primal Typokinetics Stone Carving Preset
 * 
 * A savage, archaeological typokinetics preset where text violently erupts from stone
 * through explosive fragmentation. Features chisel strike reveals, crack propagation,
 * flying debris particles, dust clouds, and harsh impact vibrations.
 * 
 * Technical Implementation:
 * - Multiple layered effects: base text, crack overlays (SVG), dust particles, fragment debris
 * - Chisel strike animation: Progressive clip-path reveal in 3-4 harsh steps (0.2s each)
 * - Each strike triggers: translateY jump, scale pulse, brightness flash
 * - Crack propagation: Animated SVG stroke-dasharray from 0 to full length
 * - Fragment particles: 10-15 small divs with random trajectories (translateX/Y ±100px, rotate ±180deg)
 * - Dust clouds: Large semi-transparent divs with scale expansion (0.5 to 2.0), opacity fade (0.8 to 0)
 * - Container vibration: Harsh stepping motion with translateX/Y ±8px using steps(3) easing
 * - Geological texture: CSS filters (contrast, brightness, blur) for rough stone edges
 * - GPU-accelerated transforms for performance
 * 
 * Use Cases:
 * - Archaeological/historical content reveals
 * - Primal/savage typography effects
 * - Destructive text animations
 * - Rock/stone-themed content
 * - Epic title reveals with violent energy
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string()
    .default('PRIMAL')
    .describe('Text to display with stone carving effect'),
  
  duration: z.number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total duration of the animation in seconds'),
  
  fontSize: z.number()
    .min(48)
    .max(200)
    .default(96)
    .describe('Font size in pixels for the text'),
  
  textColor: z.string()
    .default('#e7e5e4')
    .describe('Stone text color (stone-200 default)'),
  
  backgroundColor: z.string()
    .default('#1c1917')
    .describe('Background stone color (stone-900 default)'),
  
  chiselStrikeDuration: z.number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .describe('Duration of each chisel strike in seconds'),
  
  chiselStrikes: z.number()
    .min(2)
    .max(6)
    .default(4)
    .describe('Number of chisel strikes to reveal text'),
  
  impactIntensity: z.number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for impact effects (shake, flash, particles)'),
  
  particleCount: z.number()
    .min(5)
    .max(30)
    .default(15)
    .describe('Number of rock fragment particles'),
  
  dustIntensity: z.number()
    .min(0.3)
    .max(1)
    .default(0.8)
    .describe('Opacity intensity of dust clouds'),
  
  crackVisibility: z.number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Maximum opacity of crack overlay'),
  
  font: z.string()
    .optional()
    .default('Inter:900')
    .describe('Font family with optional weight (e.g., "Inter:900", "BebasNeue:700")'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:900';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 900; // Default to black weight
  }

  // Calculate timing
  const strikeDuration = params.chiselStrikeDuration;
  const totalStrikeDuration = strikeDuration * params.chiselStrikes;
  const shakeDuration = totalStrikeDuration;
  const particleDuration = 1.2;
  const dustDuration = Math.max(1.2, params.duration * 0.6);

  // IDs
  const containerId = 'primal-typo-container';
  const textId = 'primal-text';
  const crackOverlayId = 'primal-crack-overlay';
  const dustBackId = 'primal-dust-back';
  const dustFrontId = 'primal-dust-front';
  const fragmentContainerId = 'primal-fragments';

  // Helper: Generate random trajectory
  const randomTrajectory = (index: number) => {
    const seed = index * 137.5; // Golden angle for distribution
    const angle = (seed % 360) * (Math.PI / 180);
    const distance = 80 + (seed % 60);
    const translateX = Math.cos(angle) * distance;
    const translateY = Math.sin(angle) * distance;
    const rotation = ((seed * 3.7) % 360) - 180;
    return { translateX, translateY, rotation };
  };

  // Helper: Generate fragment particles
  const generateFragments = (): RenderableComponentData[] => {
    const fragments: RenderableComponentData[] = [];
    const colors = ['#78716c', '#57534e', '#a8a29e']; // stone-500, stone-600, stone-400

    for (let i = 0; i < params.particleCount; i++) {
      const fragmentId = `fragment-${i}`;
      const trajectory = randomTrajectory(i);
      const size = 8 + (i % 6);
      const color = colors[i % colors.length];
      const startDelay = (i / params.particleCount) * 0.7;

      // Fragment particle
      const fragmentHtml = `<div style='width:${size}px;height:${size}px;background:${color};transform:rotate(${(i * 25) % 90}deg);opacity:1'></div>`;

      // Fragment effect (flying out)
      const fragmentEffect: GenericEffectData = {
        type: 'ease-out',
        start: startDelay,
        duration: particleDuration,
        mode: 'provider',
        targetIds: [fragmentId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: trajectory.translateX, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: trajectory.translateY, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.8 },
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: trajectory.rotation, prog: 1 },
        ],
      };

      fragments.push({
        id: fragmentId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: fragmentHtml,
          className: 'absolute top-1/2 left-1/2',
          style: {
            transform: 'translate(-50%, -50%)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: particleDuration + startDelay,
          },
        },
        effects: [
          {
            id: `fragment-effect-${i}`,
            componentId: 'generic',
            data: fragmentEffect,
          },
        ],
      } as RenderableComponentData);
    }

    return fragments;
  };

  // Helper: Generate chisel strike effects
  const generateChiselEffects = (): any[] => {
    const effects = [];
    const strikes = params.chiselStrikes;

    for (let i = 0; i < strikes; i++) {
      const start = i * strikeDuration;
      const progressStart = (i / strikes) * 100;
      const progressEnd = ((i + 1) / strikes) * 100;

      effects.push({
        id: `chisel-strike-${i}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: start,
          duration: strikeDuration,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            // Clip-path reveal
            { key: 'clipPath', val: `inset(${100 - progressStart}% 0% 0% 0%)`, prog: 0 },
            { key: 'clipPath', val: `inset(${100 - progressEnd}% 0% 0% 0%)`, prog: 1 },
            // Impact jump
            { key: 'translateY', val: -5 * params.impactIntensity, prog: 0.3 },
            { key: 'translateY', val: 0, prog: 1 },
            // Scale pulse
            { key: 'scale', val: 1.1, prog: 0.3 },
            { key: 'scale', val: 1, prog: 1 },
            // Brightness flash
            { key: 'brightness', val: 1.5, prog: 0.2 },
            { key: 'brightness', val: 0.9, prog: 1 },
          ],
        } as GenericEffectData,
      });
    }

    return effects;
  };

  // Helper: Generate container shake effect
  const generateShakeEffect = (): any => {
    const intensity = 8 * params.impactIntensity;
    const steps = 16; // Number of shake keyframes
    const ranges = [];

    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      const decay = 1 - (prog * 0.8); // Decay shake over time
      const offsetX = (Math.sin(i * 2.7) * intensity * decay);
      const offsetY = (Math.cos(i * 3.1) * intensity * decay);
      
      ranges.push({ key: 'translateX', val: offsetX, prog: prog });
      ranges.push({ key: 'translateY', val: offsetY, prog: prog });
    }

    return {
      id: 'container-shake',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: shakeDuration,
        mode: 'provider',
        targetIds: [containerId],
        ranges: ranges,
      } as GenericEffectData,
    };
  };

  // Helper: Crack reveal effect
  const crackEffect = {
    id: 'crack-reveal',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: totalStrikeDuration * 0.7,
      mode: 'provider',
      targetIds: [crackOverlayId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: params.crackVisibility, prog: 0.5 },
        { key: 'opacity', val: params.crackVisibility * 0.8, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Helper: Dust cloud effects
  const dustBackEffect = {
    id: 'dust-back-expand',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: dustDuration,
      mode: 'provider',
      targetIds: [dustBackId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: params.dustIntensity, prog: 0.15 },
        { key: 'opacity', val: 0, prog: 1 },
        { key: 'scale', val: 0.5, prog: 0 },
        { key: 'scale', val: 2, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const dustFrontEffect = {
    id: 'dust-front-expand',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0.2,
      duration: dustDuration * 1.2,
      mode: 'provider',
      targetIds: [dustFrontId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: params.dustIntensity * 0.7, prog: 0.2 },
        { key: 'opacity', val: 0, prog: 1 },
        { key: 'scale', val: 0.5, prog: 0 },
        { key: 'scale', val: 2.5, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // ============================================================================
  // BUILD COMPOSITION
  // ============================================================================

  // SVG crack overlay
  const crackSvg = `
    <svg width='100%' height='100%' viewBox='0 0 800 200' style='position:absolute;top:0;left:0;pointer-events:none;opacity:0'>
      <path 
        d='M400,100 L450,80 L480,120 M400,100 L350,90 L320,110 M400,100 L420,150 M400,100 L380,50 M400,100 L460,140 M400,100 L340,120' 
        stroke='#57534e' 
        stroke-width='2' 
        fill='none' 
        stroke-dasharray='300' 
        stroke-dashoffset='300'
      />
    </svg>
  `;

  const dustBackHtml = `<div style='width:600px;height:600px;background:radial-gradient(circle,rgba(120,113,108,${params.dustIntensity}) 0%,transparent 70%);border-radius:50%;filter:blur(60px);opacity:0;transform:scale(0.5)'></div>`;
  const dustFrontHtml = `<div style='width:500px;height:500px;background:radial-gradient(circle,rgba(168,162,158,${params.dustIntensity * 0.6}) 0%,transparent 60%);border-radius:50%;filter:blur(50px);opacity:0;transform:scale(0.5)'></div>`;

  // Base text layer
  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'font-black uppercase tracking-tighter',
      style: {
        fontSize: params.fontSize,
        color: params.textColor,
        filter: 'contrast(1.3) brightness(0.9) blur(0.3px)',
        textShadow: '0 0 40px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.8)',
        clipPath: 'inset(100% 0% 0% 0%)',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['900'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: generateChiselEffects(),
  } as RenderableComponentData;

  // Crack overlay
  const crackComponent: RenderableComponentData = {
    id: crackOverlayId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: crackSvg,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [crackEffect],
  } as RenderableComponentData;

  // Dust clouds
  const dustBackComponent: RenderableComponentData = {
    id: dustBackId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: dustBackHtml,
      className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [dustBackEffect],
  } as RenderableComponentData;

  const dustFrontComponent: RenderableComponentData = {
    id: dustFrontId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: dustFrontHtml,
      className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [dustFrontEffect],
  } as RenderableComponentData;

  // Fragment particles container
  const fragmentsContainer: RenderableComponentData = {
    id: fragmentContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: generateFragments(),
  } as RenderableComponentData;

  // Word group container
  const wordGroupContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [generateShakeEffect()],
    childrenData: [
      textComponent,
      crackComponent,
      dustBackComponent,
      fragmentsContainer,
      dustFrontComponent,
    ],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'primal-typo-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [wordGroupContainer],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'primal-typokinetics-stone-carving',
  title: 'Primal Typokinetics Stone Carving',
  description: 'A savage, archaeological typokinetics preset where text violently erupts from stone through explosive fragmentation. Features chisel strike reveals, crack propagation, flying debris particles, dust clouds, and harsh impact vibrations. Text appears through brutal excavation with geological textures and destructive energy - like an angry god carving ancient inscriptions into rock.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'text',
    'stone',
    'carving',
    'archaeological',
    'primal',
    'savage',
    'destructive',
    'chisel',
    'crack',
    'fragment',
    'dust',
    'impact',
    'geological',
    'violent',
    'explosive',
    'excavation',
    'ancient',
    'rock',
  ],
  defaultInputParams: {
    text: 'PRIMAL',
    duration: 3,
    fontSize: 96,
    textColor: '#e7e5e4',
    backgroundColor: '#1c1917',
    chiselStrikeDuration: 0.2,
    chiselStrikes: 4,
    impactIntensity: 1,
    particleCount: 15,
    dustIntensity: 0.8,
    crackVisibility: 0.8,
    font: 'Inter:900',
  },
  dependencies: {},
};

// ============================================================================
// EXPORT
// ============================================================================

export const primalTypokineticsStoneCarving = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};