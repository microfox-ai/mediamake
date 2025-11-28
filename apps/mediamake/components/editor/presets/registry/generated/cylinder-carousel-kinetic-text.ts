/**
 * 3D Cylinder Carousel Kinetic Text Preset
 *
 * This preset creates a stunning carousel-style kinetic text animation where text lines
 * rotate around an invisible cylinder in 3D space, creating a revolving door effect.
 *
 * Features:
 * - **Cylindrical 3D Rotation**: Text panels positioned at equal angles around a cylinder
 * - **Continuous Smooth Rotation**: Perfectly balanced rotating sculpture effect with linear easing
 * - **Perspective Changes**: Text grows larger (scale 1.2) as it approaches viewer, shrinks (0.8) as it recedes
 * - **Depth of Field Simulation**: Distant text becomes blurred (0-3px) and less opaque (1.0-0.3)
 * - **Lighting Effects**: Text brightens (1.2x) when facing forward, dims (0.6x) when rotating away
 * - **Hardware Accelerated**: Uses transform-gpu for smooth performance
 * - **Configurable Panels**: Support for 5 text panels by default, evenly distributed around cylinder
 *
 * Use cases:
 * - Creating dynamic 3D text carousels for titles and credits
 * - Building eye-catching rotating text displays for social media
 * - Adding depth and motion to kinetic typography
 * - Creating immersive 3D text experiences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  lines: z
    .array(z.string())
    .length(5)
    .describe(
      'Array of exactly 5 text lines to display on the carousel panels',
    ),
  duration: z
    .number()
    .min(5)
    .max(60)
    .default(20)
    .describe('Duration of the full rotation cycle in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .describe('Font size for the text in pixels'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the text (CSS color value)'),
  cylinderRadius: z
    .number()
    .min(100)
    .max(500)
    .default(200)
    .describe('Radius of the invisible cylinder (translateZ distance in pixels)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { lines, duration, fontSize, font, textColor, cylinderRadius } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
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

  // Calculate panel angles (5 panels = 360/5 = 72 degrees apart)
  const numberOfPanels = 5;
  const angleStep = 360 / numberOfPanels;

  // Helper function to create scale/opacity curves based on rotation angle
  const createDepthCurves = (startAngle: number) => {
    // Calculate progress points where panel faces front (0deg relative) and back (180deg relative)
    const normalizedStart = (startAngle % 360) / 360;
    
    // Scale curve: 1.2 at front (0deg), 0.8 at back (180deg)
    // Opacity curve: 1.0 at front, 0.3 at back
    // Blur curve: 0px at front, 3px at back
    // Brightness curve: 1.2 at front, 0.6 at back
    
    const scaleRanges = [];
    const opacityRanges = [];
    const blurRanges = [];
    const brightnessRanges = [];

    // Create smooth curves through rotation
    // Front position is at startAngle, back is at startAngle + 180
    const frontProg = 0; // Start of animation
    const backProg = 0.5; // Halfway through
    const endProg = 1.0; // End (back to front)

    scaleRanges.push(
      { key: 'scale', val: getScaleAtAngle(startAngle), prog: frontProg },
      { key: 'scale', val: 0.8, prog: backProg },
      { key: 'scale', val: getScaleAtAngle(startAngle), prog: endProg },
    );

    opacityRanges.push(
      { key: 'opacity', val: getOpacityAtAngle(startAngle), prog: frontProg },
      { key: 'opacity', val: 0.3, prog: backProg },
      { key: 'opacity', val: getOpacityAtAngle(startAngle), prog: endProg },
    );

    blurRanges.push(
      { key: 'filter:blur', val: getBlurAtAngle(startAngle), prog: frontProg },
      { key: 'filter:blur', val: 3, prog: backProg },
      { key: 'filter:blur', val: getBlurAtAngle(startAngle), prog: endProg },
    );

    brightnessRanges.push(
      { key: 'filter:brightness', val: getBrightnessAtAngle(startAngle), prog: frontProg },
      { key: 'filter:brightness', val: 0.6, prog: backProg },
      { key: 'filter:brightness', val: getBrightnessAtAngle(startAngle), prog: endProg },
    );

    return { scaleRanges, opacityRanges, blurRanges, brightnessRanges };
  };

  // Helper functions to calculate values based on angle
  const getScaleAtAngle = (angle: number): number => {
    // 0deg = 1.2, 180deg = 0.8
    const normalized = ((angle % 360) + 360) % 360;
    const radians = (normalized * Math.PI) / 180;
    return 1.0 + 0.2 * Math.cos(radians);
  };

  const getOpacityAtAngle = (angle: number): number => {
    // 0deg = 1.0, 180deg = 0.3
    const normalized = ((angle % 360) + 360) % 360;
    const radians = (normalized * Math.PI) / 180;
    return 0.65 + 0.35 * Math.cos(radians);
  };

  const getBlurAtAngle = (angle: number): number => {
    // 0deg = 0px, 180deg = 3px
    const normalized = ((angle % 360) + 360) % 360;
    const radians = (normalized * Math.PI) / 180;
    return 1.5 - 1.5 * Math.cos(radians);
  };

  const getBrightnessAtAngle = (angle: number): number => {
    // 0deg = 1.2, 180deg = 0.6
    const normalized = ((angle % 360) + 360) % 360;
    const radians = (normalized * Math.PI) / 180;
    return 0.9 + 0.3 * Math.cos(radians);
  };

  // Create panel components with effects
  const panelComponents: RenderableComponentData[] = [];

  for (let i = 0; i < numberOfPanels; i++) {
    const startAngle = i * angleStep;
    const endAngle = startAngle + 360;
    const panelId = `panel-${i}`;
    const textId = `text-${i}`;

    // Get depth curves for this panel
    const { scaleRanges, opacityRanges, blurRanges, brightnessRanges } = createDepthCurves(startAngle);

    // Rotation effect (continuous 360 degree rotation)
    const rotationEffect = {
      id: `effect-rotation-${panelId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [panelId],
        ranges: [
          { key: 'rotateY', val: startAngle, prog: 0 },
          { key: 'rotateY', val: endAngle, prog: 1 },
          { key: 'translateZ', val: cylinderRadius, prog: 0 },
          { key: 'translateZ', val: cylinderRadius, prog: 1 },
        ],
      } as GenericEffectData,
    };

    // Scale and opacity effect
    const scaleOpacityEffect = {
      id: `effect-scale-opacity-${panelId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [panelId],
        ranges: [...scaleRanges, ...opacityRanges],
      } as GenericEffectData,
    };

    // Blur and brightness effect
    const blurBrightnessEffect = {
      id: `effect-blur-brightness-${panelId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [panelId],
        ranges: [...blurRanges, ...brightnessRanges],
      } as GenericEffectData,
    };

    // Text atom
    const textAtom: RenderableComponentData = {
      id: textId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: lines[i],
        style: {
          fontSize: `${fontSize}px`,
          color: textColor,
          textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : { weights: ['700'] }),
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    };

    // Panel container
    const panel: RenderableComponentData = {
      id: panelId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center transform-gpu',
          style: {
            backfaceVisibility: 'hidden',
            transformOrigin: 'center center',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [rotationEffect, scaleOpacityEffect, blurBrightnessEffect],
      childrenData: [textAtom],
    };

    panelComponents.push(panel);
  }

  // Cylinder container (holds all panels)
  const cylinderContainer: RenderableComponentData = {
    id: 'carousel-cylinder',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative transform-gpu',
        style: {
          transformStyle: 'preserve-3d',
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: panelComponents,
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'carousel-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [cylinderContainer],
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
  id: 'cylinderCarouselKineticText',
  title: '3D Cylinder Carousel Kinetic Text',
  description:
    'A carousel-style kinetic text preset featuring text lines rotating around an invisible cylinder in 3D space. Creates a revolving door effect with 5 text panels positioned at 72-degree intervals. Includes depth simulation through dynamic scale (1.2x front to 0.8x back), opacity fading (100% to 30%), depth-of-field blur (0px to 3px), and lighting simulation via brightness (brighter facing forward, dimmer facing away). Continuous smooth rotation with linear easing creates a balanced, sculpture-like motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'kinetic',
    'carousel',
    '3d',
    'cylinder',
    'rotation',
    'perspective',
    'depth',
    'animated',
    'modern',
  ],
  defaultInputParams: {
    lines: [
      'PANEL ONE',
      'PANEL TWO',
      'PANEL THREE',
      'PANEL FOUR',
      'PANEL FIVE',
    ],
    duration: 20,
    fontSize: 48,
    font: 'Inter:700',
    textColor: '#ffffff',
    cylinderRadius: 200,
  },
  dependencies: {},
};

// Export preset
export const cylinderCarouselKineticTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
