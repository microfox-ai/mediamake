/**
 * Glitch Bounce Typokinetics Preset
 *
 * This preset creates a dynamic typography animation that combines digital glitch aesthetics
 * with soft, bouncy motion. Letters appear through a series of rapid glitch frames - flashing
 * in wrong positions 2-3 times with RGB color splitting before settling into place with a
 * satisfying elastic bounce. The contrast between harsh digital distortion and organic spring
 * movement creates unique visual interest.
 *
 * Features:
 * - **Glitch Sequence**: 3 rapid position changes with RGB split effect over 0.2s
 * - **RGB Color Layers**: Three duplicate layers per letter (red, green, blue) with screen blend mode
 * - **Bouncy Entrance**: After glitch, letters bounce into position with spring easing (0.8s)
 * - **Digital Artifacts**: Chromatic aberration, scanline effects, and subtle pixel displacement
 * - **Staggered Animation**: Each letter triggers with index * 0.1s delay
 * - **Performance Optimized**: GPU-accelerated properties only, limited to 3 glitch frames
 *
 * Use cases:
 * - Tech product launches and software demos
 * - Gaming content and esports titles
 * - Music videos with electronic/digital aesthetic
 * - Social media content requiring attention-grabbing intros
 * - Cyberpunk or futuristic themed videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  text: z
    .string()
    .describe('The text to display with glitch-bounce animation'),
  
  // Timing parameters
  glitchDuration: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .optional()
    .describe('Duration of glitch phase per letter (seconds)'),
  
  bounceDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .optional()
    .describe('Duration of bounce phase per letter (seconds)'),
  
  staggerDelay: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.1)
    .optional()
    .describe('Delay between each letter animation start (seconds)'),
  
  // Visual parameters
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .optional()
    .describe('Font size in pixels'),
  
  font: z
    .string()
    .default('Inter:700')
    .optional()
    .describe('Font family with weight (e.g., "Inter:700", "Roboto:900")'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Main text color'),
  
  glitchIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Glitch effect intensity multiplier'),
  
  bounceScale: z
    .number()
    .min(1.05)
    .max(1.5)
    .default(1.2)
    .optional()
    .describe('Peak scale during bounce (1.2 = 20% larger)'),
  
  // RGB split effect
  rgbSplitIntensity: z
    .number()
    .min(0.3)
    .max(3)
    .default(1)
    .optional()
    .describe('RGB color split intensity multiplier'),
  
  // Position
  position: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .optional()
    .describe('Vertical position of text'),
  
  alignment: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .optional()
    .describe('Horizontal alignment of text'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }
  
  // Helper function: Generate random glitch positions
  const generateGlitchPositions = (intensity: number) => {
    const baseOffset = 20 * intensity;
    return [
      {
        x: (Math.random() - 0.5) * 2 * baseOffset,
        y: (Math.random() - 0.5) * 2 * baseOffset,
      },
      {
        x: (Math.random() - 0.5) * 2 * baseOffset,
        y: (Math.random() - 0.5) * 2 * baseOffset,
      },
      {
        x: (Math.random() - 0.5) * 2 * baseOffset,
        y: (Math.random() - 0.5) * 2 * baseOffset,
      },
    ];
  };
  
  // Calculate timing
  const glitchDuration = params.glitchDuration ?? 0.2;
  const bounceDuration = params.bounceDuration ?? 0.8;
  const staggerDelay = params.staggerDelay ?? 0.1;
  const totalPhase = glitchDuration + bounceDuration;
  
  const letters = params.text.split('');
  const totalDuration = totalPhase + (letters.length - 1) * staggerDelay;
  
  // RGB split colors
  const rgbColors = ['#ff0000', '#00ff00', '#0000ff'];
  const rgbOpacity = 0.8;
  const rgbSplitIntensity = params.rgbSplitIntensity ?? 1;
  
  // Position classes
  const getPositionClass = () => {
    const vertical =
      params.position === 'top'
        ? 'items-start pt-20'
        : params.position === 'bottom'
        ? 'items-end pb-20'
        : 'items-center';
    
    const horizontal =
      params.alignment === 'left'
        ? 'justify-start pl-20'
        : params.alignment === 'right'
        ? 'justify-end pr-20'
        : 'justify-center';
    
    return `${vertical} ${horizontal}`;
  };
  
  // Create letter components
  const letterWrappers: RenderableComponentData[] = letters.map((letter, index) => {
    const letterId = `letter-${index}`;
    const glitchPositions = generateGlitchPositions(params.glitchIntensity ?? 1);
    const letterStart = index * staggerDelay;
    
    // RGB layer effects (glitch phase)
    const rgbLayerEffects = rgbColors.map((color, colorIndex) => {
      const rgbLayerId = `${letterId}-rgb-${colorIndex}`;
      
      return {
        id: `${rgbLayerId}-glitch`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: letterStart,
          duration: glitchDuration,
          mode: 'provider' as const,
          targetIds: [rgbLayerId],
          ranges: [
            // Opacity pulse during glitch
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: rgbOpacity, prog: 0.1 },
            { key: 'opacity', val: rgbOpacity, prog: 0.9 },
            { key: 'opacity', val: 0, prog: 1 },
            // Position jumps (3 steps)
            { key: 'translateX', val: `${glitchPositions[0].x * rgbSplitIntensity}px`, prog: 0 },
            { key: 'translateX', val: `${glitchPositions[1].x * rgbSplitIntensity}px`, prog: 0.33 },
            { key: 'translateX', val: `${glitchPositions[2].x * rgbSplitIntensity}px`, prog: 0.66 },
            { key: 'translateX', val: '0px', prog: 1 },
            { key: 'translateY', val: `${glitchPositions[0].y * rgbSplitIntensity}px`, prog: 0 },
            { key: 'translateY', val: `${glitchPositions[1].y * rgbSplitIntensity}px`, prog: 0.33 },
            { key: 'translateY', val: `${glitchPositions[2].y * rgbSplitIntensity}px`, prog: 0.66 },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        },
      };
    });
    
    // Main letter effects
    const mainLetterEffects = [
      // Glitch phase - rapid position changes
      {
        id: `${letterId}-glitch`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: letterStart,
          duration: glitchDuration,
          mode: 'provider' as const,
          targetIds: [letterId],
          ranges: [
            // Opacity
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.1 },
            // Position glitch (3 steps)
            { key: 'translateX', val: `${glitchPositions[0].x}px`, prog: 0 },
            { key: 'translateX', val: `${glitchPositions[1].x}px`, prog: 0.33 },
            { key: 'translateX', val: `${glitchPositions[2].x}px`, prog: 0.66 },
            { key: 'translateX', val: '0px', prog: 1 },
            { key: 'translateY', val: `${glitchPositions[0].y}px`, prog: 0 },
            { key: 'translateY', val: `${glitchPositions[1].y}px`, prog: 0.33 },
            { key: 'translateY', val: `${glitchPositions[2].y}px`, prog: 0.66 },
            { key: 'translateY', val: '0px', prog: 1 },
            // Chromatic aberration simulation via blur
            { key: 'filter', val: 'blur(2px)', prog: 0 },
            { key: 'filter', val: 'blur(1px)', prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      // Bounce phase - spring easing with scale
      {
        id: `${letterId}-bounce`,
        componentId: 'generic',
        data: {
          type: 'spring' as const,
          start: letterStart + glitchDuration,
          duration: bounceDuration,
          mode: 'provider' as const,
          targetIds: [letterId],
          ranges: [
            // Scale bounce: 1.2 -> 0.9 -> 1
            { key: 'scale', val: params.bounceScale ?? 1.2, prog: 0 },
            { key: 'scale', val: 0.9, prog: 0.6 },
            { key: 'scale', val: 1, prog: 1 },
            // Subtle Y movement for spring feel
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: '5px', prog: 0.4 },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        },
      },
    ];
    
    // RGB layer components
    const rgbLayers: RenderableComponentData[] = rgbColors.map((color, colorIndex) => ({
      id: `${letterId}-rgb-${colorIndex}`,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: letter === ' ' ? '\u00A0' : letter,
        style: {
          fontSize: params.fontSize ?? 64,
          color: color,
          ...fontStyle,
          position: 'absolute',
          top: 0,
          left: 0,
          mixBlendMode: 'screen' as any,
          opacity: 0,
        },
        font: {
          family: fontFamily,
          weights: [fontStyle.fontWeight?.toString() || '700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [rgbLayerEffects[colorIndex]],
    }));
    
    // Main letter component
    const mainLetter: RenderableComponentData = {
      id: letterId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: letter === ' ' ? '\u00A0' : letter,
        style: {
          fontSize: params.fontSize ?? 64,
          color: params.textColor ?? '#ffffff',
          ...fontStyle,
          position: 'relative',
        },
        font: {
          family: fontFamily,
          weights: [fontStyle.fontWeight?.toString() || '700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: mainLetterEffects,
    };
    
    // Letter wrapper with RGB layers + main letter
    return {
      id: `${letterId}-wrapper`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative inline-block',
          style: {
            marginRight: letter === ' ' ? '0.5em' : '0.05em',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: [...rgbLayers, mainLetter] as RenderableComponentData[],
    } as RenderableComponentData;
  });
  
  // Scanline overlay (animated vertical gradient)
  const scanlineOverlay: RenderableComponentData = {
    id: 'scanline-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 10,
          background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: 'scanline-animation',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: 3,
          mode: 'provider' as const,
          targetIds: ['scanline-overlay'],
          ranges: [
            { key: 'translateY', val: '-100%', prog: 0 },
            { key: 'translateY', val: '100%', prog: 1 },
          ],
        },
      },
    ],
  };
  
  // Letters container
  const lettersContainer: RenderableComponentData = {
    id: 'letters-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `flex flex-row flex-wrap ${getPositionClass()}`,
        style: {
          position: 'relative',
          gap: '0px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: letterWrappers,
  };
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'glitch-bounce-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          position: 'relative',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [scanlineOverlay, lettersContainer],
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
  id: 'glitch-bounce-typokinetics',
  title: 'Glitch Bounce Typokinetics',
  description:
    'A dynamic typography preset combining digital glitch aesthetics with soft bouncy motion. Letters appear through rapid glitch frames with RGB color splitting, position displacement, and digital noise before settling with satisfying elastic bounce. Features chromatic aberration, scanline effects, and the contrast between harsh digital distortion and organic spring-based movement.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'glitch',
    'bounce',
    'rgb-split',
    'digital',
    'tech',
    'modern',
    'chromatic-aberration',
    'scanline',
    'spring',
  ],
  defaultInputParams: {
    text: 'GLITCH',
    glitchDuration: 0.2,
    bounceDuration: 0.8,
    staggerDelay: 0.1,
    fontSize: 64,
    font: 'Inter:700',
    textColor: '#ffffff',
    glitchIntensity: 1,
    bounceScale: 1.2,
    rgbSplitIntensity: 1,
    position: 'center',
    alignment: 'center',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const glitchBounceTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
