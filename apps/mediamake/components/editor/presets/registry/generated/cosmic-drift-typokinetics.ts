/**
 * Cosmic Drift Typokinetics Preset
 * 
 * A serene space-themed typography preset where text lines float like celestial bodies 
 * through zero gravity. Features parallax depth with three layers (background, midground, 
 * foreground), each moving at different speeds. Text elements drift on curved trajectories 
 * with subtle rotation and scale pulsing for a twinkling star-like effect. The motion 
 * evokes weightlessness and cosmic serenity with text entering from various angles and 
 * floating across the viewport.
 * 
 * Features:
 * - **Parallax Depth Layers**: Three layers (background, midground, foreground) with speed-based depth perception
 * - **Cosmic Drift Motion**: Non-linear curved trajectories using cubic-bezier easing
 * - **Weightless Rotation**: Slow 360-degree rotation over 20-30 seconds per layer
 * - **Twinkling Effect**: Subtle scale pulsing (0.95-1.05) for star-like shimmer
 * - **Gravitational Curves**: Bezier-based paths simulating gravitational influence
 * - **Star Glow**: Drop-shadow effects with screen blend mode for ethereal quality
 * - **Varied Starting Positions**: Random entry angles and positions for organic feel
 * 
 * Use cases:
 * - Space-themed title sequences
 * - Cosmic meditation or ambient content
 * - Sci-fi intros and outros
 * - Abstract typography animations
 * - Serene floating text effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  duration: z.number().min(5).max(60).default(20).describe('Total duration of the cosmic drift animation in seconds'),
  
  // Text content for each layer (3 texts per layer)
  backgroundText1: z.string().default('STELLAR').describe('First background layer text'),
  backgroundText2: z.string().default('NEBULA').describe('Second background layer text'),
  backgroundText3: z.string().default('COSMOS').describe('Third background layer text'),
  
  midgroundText1: z.string().default('GALAXY').describe('First midground layer text'),
  midgroundText2: z.string().default('ORBIT').describe('Second midground layer text'),
  midgroundText3: z.string().default('VOID').describe('Third midground layer text'),
  
  foregroundText1: z.string().default('DRIFT').describe('First foreground layer text'),
  foregroundText2: z.string().default('FLOAT').describe('Second foreground layer text'),
  foregroundText3: z.string().default('SPACE').describe('Third foreground layer text'),
  
  // Font configuration
  font: z.string().optional().default('Inter:300').describe('Font family with optional weight (e.g., "Inter:300", "Roboto:400")'),
  
  // Motion intensity
  driftIntensity: z.number().min(0.5).max(2).default(1).describe('Multiplier for drift motion intensity (affects distance traveled)'),
  rotationSpeed: z.number().min(0.5).max(2).default(1).describe('Multiplier for rotation speed (1 = normal, 2 = twice as fast)'),
  twinkleIntensity: z.number().min(0).max(1).default(0.5).describe('Intensity of scale pulsing twinkling effect (0 = none, 1 = maximum)'),
  
  // Visual styling
  glowIntensity: z.number().min(0).max(1).default(0.5).describe('Intensity of star-like glow effect (0 = none, 1 = maximum)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { duration, font, driftIntensity, rotationSpeed, twinkleIntensity, glowIntensity } = params;
  
  // Parse font string
  const fontString = font || 'Inter:300';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }
  
  // Helper: Create drift effect with curved trajectory
  const createDriftEffect = (
    targetId: string,
    layerSpeed: number, // 10s = fast (foreground), 30s = slow (background)
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    effectId: string
  ): any => {
    const adjustedDuration = layerSpeed * (1 / driftIntensity);
    
    return {
      id: effectId,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: adjustedDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          // Curved X trajectory (cubic-bezier simulation)
          { key: 'translateX', val: startX, prog: 0 },
          { key: 'translateX', val: startX + (endX - startX) * 0.3, prog: 0.25 },
          { key: 'translateX', val: startX + (endX - startX) * 0.7, prog: 0.75 },
          { key: 'translateX', val: endX, prog: 1 },
          
          // Curved Y trajectory (gravitational curve)
          { key: 'translateY', val: startY, prog: 0 },
          { key: 'translateY', val: startY + (endY - startY) * 0.2, prog: 0.25 },
          { key: 'translateY', val: startY + (endY - startY) * 0.8, prog: 0.75 },
          { key: 'translateY', val: endY, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };
  
  // Helper: Create rotation effect
  const createRotationEffect = (
    targetId: string,
    duration: number,
    effectId: string
  ): any => {
    const adjustedDuration = duration / rotationSpeed;
    
    return {
      id: effectId,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: adjustedDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: 360, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };
  
  // Helper: Create twinkling scale pulse effect
  const createTwinkleEffect = (
    targetId: string,
    pulseDuration: number,
    effectId: string
  ): any => {
    if (twinkleIntensity === 0) return null;
    
    const scaleRange = 0.05 * twinkleIntensity; // 0.05 at max intensity
    
    return {
      id: effectId,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: pulseDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'scale', val: 1 - scaleRange, prog: 0 },
          { key: 'scale', val: 1 + scaleRange, prog: 0.5 },
          { key: 'scale', val: 1 - scaleRange, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };
  
  // Calculate glow values
  const glowBlur = 2 + (glowIntensity * 3); // 2-5px
  const glowOpacity = 0.3 + (glowIntensity * 0.2); // 0.3-0.5
  
  // Background layer (slowest, smallest, dimmest)
  const bgTextComponents = [
    {
      text: params.backgroundText1,
      startX: -200,
      startY: -100,
      endX: 1200,
      endY: 800,
    },
    {
      text: params.backgroundText2,
      startX: 1200,
      startY: 200,
      endX: -300,
      endY: 700,
    },
    {
      text: params.backgroundText3,
      startX: 500,
      startY: -150,
      endX: 600,
      endY: 900,
    },
  ];
  
  const backgroundChildren = bgTextComponents.map((item, index) => {
    const textId = `bg-text-${index + 1}`;
    const driftEffectId = `bg-drift-${index + 1}`;
    const rotateEffectId = `bg-rotate-${index + 1}`;
    const twinkleEffectId = `bg-twinkle-${index + 1}`;
    
    const driftEffect = createDriftEffect(textId, 30, item.startX, item.startY, item.endX, item.endY, driftEffectId);
    const rotateEffect = createRotationEffect(textId, 25, rotateEffectId);
    const twinkleEffect = createTwinkleEffect(textId, 4, twinkleEffectId);
    
    const effects = [driftEffect, rotateEffect];
    if (twinkleEffect) effects.push(twinkleEffect);
    
    return {
      id: textId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: item.text,
        style: {
          ...fontStyle,
          fontSize: '14px',
          color: '#9CA3AF',
          filter: `drop-shadow(0 0 ${glowBlur}px rgba(255,255,255,${glowOpacity}))`,
          mixBlendMode: 'screen',
          opacity: 0.4,
        },
        font: {
          family: fontFamily,
          weights: [fontStyle.fontWeight ? fontStyle.fontWeight.toString() : '300'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: effects,
    };
  });
  
  // Midground layer (medium speed, medium size, medium brightness)
  const midTextComponents = [
    {
      text: params.midgroundText1,
      startX: 800,
      startY: -50,
      endX: -200,
      endY: 600,
    },
    {
      text: params.midgroundText2,
      startX: -150,
      startY: 400,
      endX: 1100,
      endY: -100,
    },
    {
      text: params.midgroundText3,
      startX: 600,
      startY: 700,
      endX: 300,
      endY: -150,
    },
  ];
  
  const midgroundChildren = midTextComponents.map((item, index) => {
    const textId = `mid-text-${index + 1}`;
    const driftEffectId = `mid-drift-${index + 1}`;
    const rotateEffectId = `mid-rotate-${index + 1}`;
    const twinkleEffectId = `mid-twinkle-${index + 1}`;
    
    const driftEffect = createDriftEffect(textId, 20, item.startX, item.startY, item.endX, item.endY, driftEffectId);
    const rotateEffect = createRotationEffect(textId, 22, rotateEffectId);
    const twinkleEffect = createTwinkleEffect(textId, 3.5, twinkleEffectId);
    
    const effects = [driftEffect, rotateEffect];
    if (twinkleEffect) effects.push(twinkleEffect);
    
    return {
      id: textId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: item.text,
        style: {
          ...fontStyle,
          fontSize: '18px',
          color: '#D1D5DB',
          filter: `drop-shadow(0 0 ${glowBlur + 1}px rgba(255,255,255,${glowOpacity + 0.1}))`,
          mixBlendMode: 'screen',
          opacity: 0.7,
        },
        font: {
          family: fontFamily,
          weights: [fontStyle.fontWeight ? fontStyle.fontWeight.toString() : '400'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: effects,
    };
  });
  
  // Foreground layer (fastest, largest, brightest)
  const fgTextComponents = [
    {
      text: params.foregroundText1,
      startX: -300,
      startY: 300,
      endX: 1300,
      endY: 400,
    },
    {
      text: params.foregroundText2,
      startX: 1100,
      startY: -100,
      endX: -200,
      endY: 500,
    },
    {
      text: params.foregroundText3,
      startX: 400,
      startY: 800,
      endX: 700,
      endY: -200,
    },
  ];
  
  const foregroundChildren = fgTextComponents.map((item, index) => {
    const textId = `fg-text-${index + 1}`;
    const driftEffectId = `fg-drift-${index + 1}`;
    const rotateEffectId = `fg-rotate-${index + 1}`;
    const twinkleEffectId = `fg-twinkle-${index + 1}`;
    
    const driftEffect = createDriftEffect(textId, 10, item.startX, item.startY, item.endX, item.endY, driftEffectId);
    const rotateEffect = createRotationEffect(textId, 20, rotateEffectId);
    const twinkleEffect = createTwinkleEffect(textId, 3, twinkleEffectId);
    
    const effects = [driftEffect, rotateEffect];
    if (twinkleEffect) effects.push(twinkleEffect);
    
    return {
      id: textId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: item.text,
        style: {
          ...fontStyle,
          fontSize: '24px',
          color: '#FFFFFF',
          filter: `drop-shadow(0 0 ${glowBlur + 2}px rgba(255,255,255,${glowOpacity + 0.2}))`,
          mixBlendMode: 'screen',
          opacity: 1,
        },
        font: {
          family: fontFamily,
          weights: [fontStyle.fontWeight ? fontStyle.fontWeight.toString() : '500'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: effects,
    };
  });
  
  // Build layer containers
  const backgroundLayer = {
    id: 'background-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: backgroundChildren as RenderableComponentData[],
  };
  
  const midgroundLayer = {
    id: 'midground-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 5,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: midgroundChildren as RenderableComponentData[],
  };
  
  const foregroundLayer = {
    id: 'foreground-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: foregroundChildren as RenderableComponentData[],
  };
  
  // Root container
  const rootContainer = {
    id: 'cosmic-drift-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      backgroundLayer,
      midgroundLayer,
      foregroundLayer,
    ] as RenderableComponentData[],
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

const presetMetadata: PresetMetadata = {
  id: 'cosmic-drift-typokinetics',
  title: 'Cosmic Drift Typokinetics',
  description: 'A serene space-themed typography preset where text lines float like celestial bodies through zero gravity. Features parallax depth with three layers (background, midground, foreground), each moving at different speeds. Text elements drift on curved trajectories with subtle rotation and scale pulsing for a twinkling star-like effect. The motion evokes weightlessness and cosmic serenity with text entering from various angles and floating across the viewport.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'space', 'cosmic', 'parallax', 'drift', 'float', 'rotation', 'twinkling', 'serene', 'ambient', 'sci-fi', 'weightless', 'celestial'],
  dependencies: {},
  defaultInputParams: {
    duration: 20,
    backgroundText1: 'STELLAR',
    backgroundText2: 'NEBULA',
    backgroundText3: 'COSMOS',
    midgroundText1: 'GALAXY',
    midgroundText2: 'ORBIT',
    midgroundText3: 'VOID',
    foregroundText1: 'DRIFT',
    foregroundText2: 'FLOAT',
    foregroundText3: 'SPACE',
    font: 'Inter:300',
    driftIntensity: 1,
    rotationSpeed: 1,
    twinkleIntensity: 0.5,
    glowIntensity: 0.5,
  },
};

export const cosmicDriftTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};