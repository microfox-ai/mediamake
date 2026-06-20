/**
 * Paper Burn Effect Preset
 *
 * A dramatic paper burn effect where text appears to burn away from edges inward.
 * Features irregular shrinking, charring to black, edge curling via scaleY distortion,
 * and orange/red glow at burn edges. Perfect for dramatic endings or transitions in
 * storytelling content.
 *
 * Technical approach:
 * - Multi-phase timing: color shift → glow → burn edges → collapse
 * - Irregular burn pattern via clip-path with non-linear keyframes
 * - ScaleY distortion for curl effect
 * - SVG turbulence filter for organic edge movement
 * - Complex filter transitions (brightness, sepia, blur)
 * - Text-shadow glow with orange/red for burn edge effect
 *
 * Use cases:
 * - Dramatic scene endings
 * - Transition effects
 * - Title reveals (in reverse)
 * - Storytelling emphasis
 * - Horror/thriller content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('Text content to display and burn away'),
  
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")'),
  
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .optional()
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Initial text color before burn effect (e.g., "#FFFFFF", "rgba(255,255,255,0.9)")'),
  
  duration: z
    .number()
    .min(2)
    .max(10)
    .default(4)
    .optional()
    .describe('Total duration of burn effect in seconds'),
  
  burnIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity multiplier for burn effects (higher = more aggressive)'),
  
  glowColor: z
    .string()
    .default('#FF6B00')
    .optional()
    .describe('Color of the burn edge glow (e.g., "#FF6B00" for orange, "#FF0000" for red)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// EXECUTION FUNCTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    font = 'Inter:700',
    fontSize = 72,
    textColor = '#FFFFFF',
    duration = 4,
    burnIntensity = 1,
    glowColor = '#FF6B00',
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // IDs
  const textId = 'burn-text-target';
  const turbulenceFilterId = 'turbulence-burn-filter';

  // Timing phases (relative to container start)
  // Phase 1: 0 - 0.3 → Color shift to dark brown
  // Phase 2: 0.3 - 0.6 → Orange glow appears
  // Phase 3: 0.6 - 0.85 → Burn edges + curl
  // Phase 4: 0.85 - 1.0 → Final collapse

  const phase1End = duration * 0.3;
  const phase2End = duration * 0.6;
  const phase3End = duration * 0.85;
  const phase4End = duration;

  // Build complex effect with multiple keyframes
  const burnEffect = {
    id: 'burn-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: duration,
      mode: 'provider' as const,
      targetIds: [textId],
      ranges: [
        // Phase 1: Color shift to dark brown (0 - 0.3)
        {
          key: 'filter',
          val: 'brightness(1) sepia(0) blur(0px)',
          prog: 0,
        },
        {
          key: 'filter',
          val: `brightness(0.3) sepia(1) blur(0px)`,
          prog: phase1End / duration,
        },
        
        // Phase 2: Orange glow appears (0.3 - 0.6)
        {
          key: 'textShadow',
          val: '0 0 0px rgba(255, 107, 0, 0)',
          prog: phase1End / duration,
        },
        {
          key: 'textShadow',
          val: `0 0 ${20 * burnIntensity}px ${glowColor}, 0 0 ${40 * burnIntensity}px ${glowColor}`,
          prog: phase2End / duration,
        },
        
        // Phase 3: Burn edges via clip-path (0.6 - 0.85)
        // Irregular polygon burn pattern
        {
          key: 'clipPath',
          val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          prog: phase2End / duration,
        },
        {
          key: 'clipPath',
          val: 'polygon(10% 5%, 90% 8%, 88% 92%, 12% 95%)',
          prog: (phase2End + (phase3End - phase2End) * 0.3) / duration,
        },
        {
          key: 'clipPath',
          val: 'polygon(20% 15%, 80% 18%, 78% 82%, 22% 85%)',
          prog: (phase2End + (phase3End - phase2End) * 0.6) / duration,
        },
        {
          key: 'clipPath',
          val: 'polygon(35% 30%, 65% 32%, 63% 68%, 37% 70%)',
          prog: phase3End / duration,
        },
        
        // ScaleY curl effect (0.6 - 0.85)
        {
          key: 'scaleY',
          val: 1,
          prog: phase2End / duration,
        },
        {
          key: 'scaleY',
          val: 0.8,
          prog: (phase2End + (phase3End - phase2End) * 0.5) / duration,
        },
        {
          key: 'scaleY',
          val: 0.6,
          prog: phase3End / duration,
        },
        
        // Transition to black (0.6 - 0.85)
        {
          key: 'filter',
          val: `brightness(0.3) sepia(1) blur(0px)`,
          prog: phase2End / duration,
        },
        {
          key: 'filter',
          val: `brightness(0.1) sepia(0.5) blur(${2 * burnIntensity}px)`,
          prog: phase3End / duration,
        },
        
        // Glow fade out (0.6 - 0.85)
        {
          key: 'textShadow',
          val: `0 0 ${20 * burnIntensity}px ${glowColor}, 0 0 ${40 * burnIntensity}px ${glowColor}`,
          prog: phase2End / duration,
        },
        {
          key: 'textShadow',
          val: `0 0 ${5 * burnIntensity}px rgba(0, 0, 0, 0.8)`,
          prog: phase3End / duration,
        },
        
        // Phase 4: Final collapse (0.85 - 1.0)
        {
          key: 'scale',
          val: 1,
          prog: phase3End / duration,
        },
        {
          key: 'scale',
          val: 0.3,
          prog: (phase3End + (phase4End - phase3End) * 0.7) / duration,
        },
        {
          key: 'scale',
          val: 0,
          prog: 1,
        },
        
        {
          key: 'opacity',
          val: 1,
          prog: phase3End / duration,
        },
        {
          key: 'opacity',
          val: 0.5,
          prog: (phase3End + (phase4End - phase3End) * 0.5) / duration,
        },
        {
          key: 'opacity',
          val: 0,
          prog: 1,
        },
        
        {
          key: 'filter',
          val: `brightness(0.1) sepia(0.5) blur(${2 * burnIntensity}px)`,
          prog: phase3End / duration,
        },
        {
          key: 'filter',
          val: `brightness(0) sepia(0) blur(${5 * burnIntensity}px)`,
          prog: 1,
        },
        
        {
          key: 'clipPath',
          val: 'polygon(35% 30%, 65% 32%, 63% 68%, 37% 70%)',
          prog: phase3End / duration,
        },
        {
          key: 'clipPath',
          val: 'polygon(48% 48%, 52% 48%, 52% 52%, 48% 52%)',
          prog: 1,
        },
        
        {
          key: 'scaleY',
          val: 0.6,
          prog: phase3End / duration,
        },
        {
          key: 'scaleY',
          val: 0.3,
          prog: (phase3End + (phase4End - phase3End) * 0.5) / duration,
        },
        {
          key: 'scaleY',
          val: 0,
          prog: 1,
        },
      ],
    },
  };

  // Text atom
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: fontSize,
        color: textColor,
        fontWeight: fontStyle.fontWeight || 700,
        fontStyle: fontStyle.fontStyle || 'normal',
        textAlign: 'center',
        contain: 'layout style paint',
        filter: 'url(#turbulence-burn)',
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [burnEffect],
  };

  // SVG turbulence filter for organic edge movement
  const turbulenceFilter: RenderableComponentData = {
    id: turbulenceFilterId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<svg width="0" height="0" style="position: absolute; width: 0; height: 0; pointer-events: none;">
        <filter id="turbulence-burn">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="turbulence"/>
          <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="5" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </svg>`,
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
        duration: duration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'paper-burn-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [turbulenceFilter, textAtom] as RenderableComponentData[],
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'paper-burn-effect',
  title: 'Paper Burn Effect',
  description:
    'Dramatic paper burn effect where text appears to burn away from edges inward. Features irregular shrinking, charring to black, edge curling via scaleY distortion, and orange/red glow at burn edges. Perfect for dramatic endings or transitions in storytelling content. Uses complex clip-path animation with multi-phase timing for organic burn patterns.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'burn',
    'fire',
    'dramatic',
    'effect',
    'transition',
    'cinematic',
    'paper',
    'char',
    'glow',
    'destruction',
    'storytelling',
  ],
  defaultInputParams: {
    text: 'Burn Away',
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#FFFFFF',
    duration: 4,
    burnIntensity: 1,
    glowColor: '#FF6B00',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const paperBurnEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
