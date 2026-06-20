/**
 * Combat Sports Typokinetics Preset
 *
 * A dynamic combat-sports inspired typokinetics preset where text takes damage like a fighter in the ring.
 * Features progressive damage accumulation through jabs, hooks, uppercuts, combos, wobble recovery, daze effects, and knockout sequences.
 *
 * Features:
 * - **Jab Impact**: Small quick shakes (±10px translateX) with rapid bounce-back (0.15s duration)
 * - **Hook Impact**: Curved motion with rotation (±8deg) and lateral movement (0.3s duration)
 * - **Uppercut Impact**: Vertical displacement (-20px) with gravity-like return (0.4s duration)
 * - **Combo System**: Multiple rapid hits within 0.5s window causing exponentially worse shaking (1.5x multiplier)
 * - **Wobble Recovery**: Decreasing amplitude oscillation on all axes (1s duration) - fighter struggles to stabilize
 * - **Swelling Effects**: Localized scale expansion on impact points (scaleX/Y to 1.2)
 * - **Cut Effects**: Progressive red text-shadow appearing ('2px 2px 0 #ff0000')
 * - **Daze Effect**: Continuous small random movements with blur(1px) filter simulating concussion
 * - **Knockout Sequence**: Dramatic rotation to 90deg while translateY to bottom with opacity fade
 * - **Damage Accumulation**: Permanent slight rotation/position offsets after each hit
 *
 * Use cases:
 * - Creating combat/fighting text animations for sports content
 * - Building intense action sequences with progressive damage
 * - Adding impact-driven typography for gaming content
 * - Creating dramatic text effects with escalating intensity
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z.string().default('FIGHT LIKE WARRIOR').describe('Text to display as fighting words (space-separated)'),
  
  // Visual styling
  fontSize: z.number().default(112).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter:900').describe('Font family with weight (e.g., "Inter:900", "Impact:700")'),
  textColor: z.string().default('#DC2626').describe('Text color (red default for combat theme)'),
  textShadow: z.string().default('4px 4px 0 #000').describe('Text shadow for bold impact look'),
  
  // Timing configuration
  totalDuration: z.number().default(13).describe('Total duration of the combat sequence in seconds'),
  jabInterval: z.number().default(0.3).describe('Time between jab hits in seconds'),
  powerShotInterval: z.number().default(1.5).describe('Time between power shots (hooks, uppercuts) in seconds'),
  comboWindow: z.number().default(0.5).describe('Time window for combo hits in seconds'),
  
  // Impact intensity
  jabIntensity: z.number().min(0.1).max(2).default(1).describe('Jab impact multiplier (affects shake amplitude)'),
  powerShotIntensity: z.number().min(0.1).max(3).default(1.2).describe('Power shot intensity multiplier'),
  comboMultiplier: z.number().min(1).max(3).default(1.5).describe('Combo hit intensity multiplier (exponential)'),
  
  // Effects configuration
  showSwelling: z.boolean().default(true).describe('Enable swelling effects on impact'),
  showCuts: z.boolean().default(true).describe('Enable cut effects (red text-shadow)'),
  enableDaze: z.boolean().default(true).describe('Enable daze effect before knockout'),
  
  // Knockout configuration
  hitsUntilKO: z.number().min(5).max(20).default(12).describe('Number of hits before knockout'),
  koRotation: z.number().min(60).max(120).default(90).describe('Rotation angle for knockout (degrees)'),
  koFallDistance: z.number().min(100).max(400).default(200).describe('Distance to fall during knockout (pixels)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight")
  const fontString = params.fontFamily;
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  const fontWeight = fontString.includes(':') ? parseInt(fontString.split(':')[1], 10) : 900;

  // Split text into words
  const words = params.text.trim().split(/\s+/).filter(w => w.length > 0);
  
  // Calculate timing for progressive damage
  const totalDuration = params.totalDuration;
  const hitCount = params.hitsUntilKO;
  
  // Helper: Create jab effect
  const createJabEffect = (
    targetId: string,
    startTime: number,
    direction: number, // -1 for left, 1 for right
    intensity: number,
    effectId: string,
  ): any => {
    const amplitude = 10 * intensity * params.jabIntensity;
    
    return {
      id: effectId,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: startTime,
        duration: 0.15,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'translateX', val: amplitude * direction, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Helper: Create hook effect
  const createHookEffect = (
    targetId: string,
    startTime: number,
    direction: number,
    intensity: number,
    effectId: string,
  ): any => {
    const amplitude = 20 * intensity * params.powerShotIntensity;
    const rotation = 8 * intensity * params.powerShotIntensity;
    const residualOffset = 3 * direction;
    const residualRotation = 1 * direction;
    
    return {
      id: effectId,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: startTime,
        duration: 0.3,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: amplitude * direction, prog: 0.5 },
          { key: 'translateX', val: residualOffset, prog: 1 },
          { key: 'rotation', val: 0, prog: 0 },
          { key: 'rotation', val: rotation * direction, prog: 0.5 },
          { key: 'rotation', val: residualRotation, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Helper: Create uppercut effect
  const createUppercutEffect = (
    targetId: string,
    startTime: number,
    intensity: number,
    effectId: string,
  ): any => {
    const liftHeight = 25 * intensity * params.powerShotIntensity;
    const fallHeight = 10 * intensity * params.powerShotIntensity;
    const residualOffset = 2;
    
    return {
      id: effectId,
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: startTime,
        duration: 0.4,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'translateY', val: -liftHeight, prog: 0 },
          { key: 'translateY', val: fallHeight, prog: 0.6 },
          { key: 'translateY', val: -residualOffset, prog: 1 },
          { key: 'rotation', val: 5, prog: 0.3 },
          { key: 'rotation', val: -2, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Helper: Create combo effect
  const createComboEffect = (
    targetId: string,
    startTime: number,
    hitIndex: number,
    comboIntensity: number,
    effectId: string,
  ): any => {
    const multiplier = Math.pow(params.comboMultiplier, hitIndex);
    const baseAmplitude = 15 * comboIntensity;
    const amplitude = baseAmplitude * multiplier;
    
    // Alternate directions for combo hits
    const directions = [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
    ];
    const dir = directions[hitIndex % directions.length];
    
    const ranges: any[] = [];
    
    if (dir.x !== 0) {
      ranges.push(
        { key: 'translateX', val: amplitude * dir.x, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },
      );
    }
    
    if (dir.y !== 0) {
      ranges.push(
        { key: 'translateY', val: amplitude * dir.y, prog: 0 },
        { key: 'translateY', val: amplitude * dir.y * 0.2, prog: 1 },
      );
    }
    
    ranges.push(
      { key: 'rotation', val: 6 * (hitIndex % 2 === 0 ? 1 : -1) * multiplier * 0.5, prog: 0 },
      { key: 'rotation', val: -2 * (hitIndex % 2 === 0 ? 1 : -1), prog: 1 },
    );
    
    return {
      id: effectId,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: startTime,
        duration: 0.12,
        mode: 'provider',
        targetIds: [targetId],
        ranges,
      } as GenericEffectData,
    };
  };

  // Helper: Create wobble recovery effect
  const createWobbleEffect = (
    targetId: string,
    startTime: number,
    initialRotation: number,
    effectId: string,
  ): any => {
    return {
      id: effectId,
      componentId: 'generic',
      data: {
        type: 'spring',
        start: startTime,
        duration: 1,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'rotation', val: initialRotation, prog: 0 },
          { key: 'rotation', val: -initialRotation * 0.7, prog: 0.2 },
          { key: 'rotation', val: initialRotation * 0.5, prog: 0.4 },
          { key: 'rotation', val: -initialRotation * 0.3, prog: 0.6 },
          { key: 'rotation', val: initialRotation * 0.1, prog: 0.8 },
          { key: 'rotation', val: initialRotation * 0.3, prog: 1 },
          { key: 'translateX', val: -5, prog: 0 },
          { key: 'translateX', val: 3, prog: 0.3 },
          { key: 'translateX', val: -2, prog: 0.6 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Helper: Create daze effect
  const createDazeEffect = (
    targetId: string,
    startTime: number,
    effectId: string,
  ): any => {
    return {
      id: effectId,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: startTime,
        duration: 2,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'translateX', val: -2, prog: 0 },
          { key: 'translateX', val: 2, prog: 0.25 },
          { key: 'translateX', val: -1, prog: 0.5 },
          { key: 'translateX', val: 1, prog: 0.75 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: 1, prog: 0 },
          { key: 'translateY', val: -1, prog: 0.33 },
          { key: 'translateY', val: 0.5, prog: 0.66 },
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'blur', val: 1, prog: 0 },
          { key: 'blur', val: 0.5, prog: 0.5 },
          { key: 'blur', val: 1, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Helper: Create knockout effect
  const createKnockoutEffect = (
    targetId: string,
    startTime: number,
    initialRotation: number,
    effectId: string,
  ): any => {
    const koRotation = params.koRotation * (initialRotation < 0 ? -1 : 1);
    const koFall = params.koFallDistance;
    
    return {
      id: effectId,
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: startTime,
        duration: 2.5,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'rotation', val: initialRotation, prog: 0 },
          { key: 'rotation', val: koRotation, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: koFall, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.7 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Build word components with combat effects
  const wordComponents: RenderableComponentData[] = words.map((word, wordIndex) => {
    const wordId = `combat-word-${wordIndex}`;
    const effects: any[] = [];
    
    // Stagger timing for each word
    const wordOffset = wordIndex * 0.3;
    
    // Progressive damage timing
    let currentTime = wordOffset;
    const hitTiming: number[] = [];
    
    // Generate hit sequence
    let hitNumber = 0;
    while (hitNumber < hitCount && currentTime < totalDuration - 3) {
      hitTiming.push(currentTime);
      
      if (hitNumber < 4) {
        // Early jabs
        currentTime += params.jabInterval;
      } else if (hitNumber < 8) {
        // Mix of jabs and power shots
        currentTime += hitNumber % 2 === 0 ? params.jabInterval : params.powerShotInterval;
      } else {
        // Final combo and power shots
        currentTime += params.comboWindow;
      }
      
      hitNumber++;
    }
    
    // Add jabs (early phase)
    hitTiming.slice(0, 3).forEach((time, index) => {
      effects.push(
        createJabEffect(
          wordId,
          time,
          index % 2 === 0 ? -1 : 1,
          1 + index * 0.1,
          `jab-${wordIndex}-${index}`,
        ),
      );
    });
    
    // Add hooks (mid phase)
    if (hitTiming.length > 3) {
      effects.push(
        createHookEffect(
          wordId,
          hitTiming[3],
          -1,
          1.2,
          `hook-${wordIndex}-1`,
        ),
      );
    }
    
    if (hitTiming.length > 5) {
      effects.push(
        createHookEffect(
          wordId,
          hitTiming[5],
          1,
          1.3,
          `hook-${wordIndex}-2`,
        ),
      );
    }
    
    // Add uppercut
    if (hitTiming.length > 4) {
      effects.push(
        createUppercutEffect(
          wordId,
          hitTiming[4],
          1.5,
          `uppercut-${wordIndex}`,
        ),
      );
    }
    
    // Add combo sequence
    const comboStartIndex = Math.max(6, Math.floor(hitTiming.length * 0.6));
    const comboHits = Math.min(3, hitTiming.length - comboStartIndex - 2);
    
    for (let i = 0; i < comboHits; i++) {
      const comboTime = hitTiming[comboStartIndex + i];
      effects.push(
        createComboEffect(
          wordId,
          comboTime,
          i,
          1.5,
          `combo-${wordIndex}-${i}`,
        ),
      );
    }
    
    // Add wobble recovery
    const wobbleTime = hitTiming[Math.min(comboStartIndex + comboHits, hitTiming.length - 1)] + 0.5;
    const wobbleRotation = wordIndex % 2 === 0 ? -8 : 9;
    effects.push(
      createWobbleEffect(
        wordId,
        wobbleTime,
        wobbleRotation,
        `wobble-${wordIndex}`,
      ),
    );
    
    // Add daze effect
    if (params.enableDaze) {
      const dazeTime = wobbleTime + 1;
      effects.push(
        createDazeEffect(
          wordId,
          dazeTime,
          `daze-${wordIndex}`,
        ),
      );
    }
    
    // Add knockout
    const koTime = totalDuration - 2.5 + wordIndex * 0.2;
    effects.push(
      createKnockoutEffect(
        wordId,
        koTime,
        wobbleRotation * 0.3,
        `knockout-${wordIndex}`,
      ),
    );
    
    // Swelling effect (on specific impacts)
    if (params.showSwelling && hitTiming.length > 3) {
      effects.push({
        id: `swell-${wordIndex}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: hitTiming[3],
          duration: 0.2,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.15, prog: 0.4 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      });
    }
    
    // Cut effect (progressive red shadow)
    if (params.showCuts && hitTiming.length > 5) {
      effects.push({
        id: `cut-${wordIndex}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: hitTiming[5],
          duration: 0.3,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'textShadow', val: params.textShadow, prog: 0 },
            { key: 'textShadow', val: `${params.textShadow}, 2px 2px 0 #ff0000`, prog: 1 },
          ],
        } as GenericEffectData,
      });
    }
    
    return {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          fontWeight: fontWeight,
          textShadow: params.textShadow,
          textTransform: 'uppercase',
          transformOrigin: 'center center',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight.toString()],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects,
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'combat-sports-ring-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-wrap gap-4 p-8 items-center justify-center',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordComponents,
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

const presetMetadata: PresetMetadata = {
  id: 'combatSportsTypokinetics',
  title: 'Combat Sports Typokinetics',
  description: 'Combat-sports inspired typography where text takes damage like a fighter - featuring jabs, hooks, uppercuts, combos, wobble recovery, daze effects, and knockout sequences with progressive damage accumulation',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'combat',
    'sports',
    'typokinetics',
    'damage',
    'fighter',
    'impact',
    'shake',
    'knockout',
    'action',
    'intense',
    'dynamic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'FIGHT LIKE WARRIOR',
    fontSize: 112,
    fontFamily: 'Inter:900',
    textColor: '#DC2626',
    textShadow: '4px 4px 0 #000',
    totalDuration: 13,
    jabInterval: 0.3,
    powerShotInterval: 1.5,
    comboWindow: 0.5,
    jabIntensity: 1,
    powerShotIntensity: 1.2,
    comboMultiplier: 1.5,
    showSwelling: true,
    showCuts: true,
    enableDaze: true,
    hitsUntilKO: 12,
    koRotation: 90,
    koFallDistance: 200,
  },
};

export const combatSportsTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
