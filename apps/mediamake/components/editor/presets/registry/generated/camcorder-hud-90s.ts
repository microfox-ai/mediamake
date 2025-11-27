/**
 * 90s Camcorder HUD Typography Preset
 *
 * This preset recreates the authentic on-screen display (OSD) elements from vintage 90s home video
 * camcorders in "PLAY" mode. It features classic HUD elements like REC indicator, battery status,
 * date stamp, and recording timecode counter with characteristic CRT phosphor glow effects.
 *
 * Features:
 * - **Authentic HUD Elements**: REC indicator with blinking red dot, battery percentage display,
 *   PLAY mode indicator, date stamp, and counting timecode
 * - **CRT Phosphor Effects**: Green/amber glow with textShadow for that characteristic monitor look
 * - **Phosphor Flicker**: Rapid opacity fluctuations simulating CRT phosphor activation (0.7-1.0)
 * - **Tracking Adjustment**: Periodic horizontal shift effects that snap back, mimicking VHS tracking
 * - **Bitmap Font**: Press Start 2P font for authentic digital display aesthetics
 * - **Scanline Overlay**: Repeating gradient overlay for complete CRT immersion
 * - **Viewfinder Frame**: Border gradients simulating looking through a camcorder viewfinder
 *
 * Use cases:
 * - Creating nostalgic 90s home video aesthetics
 * - Retro camcorder overlays for modern content
 * - VHS-style video effects and transitions
 * - Vintage technology tributes and throwback content
 * - Music videos with retro aesthetic
 */

import { z } from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---
const presetParams = z.object({
  recBlinkInterval: z
    .number()
    .optional()
    .default(1000)
    .describe('Blink interval for REC indicator in milliseconds (default: 1000ms)'),
  batteryPercentage: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .default(87)
    .describe('Battery percentage to display (0-100, default: 87)'),
  dateStamp: z
    .string()
    .optional()
    .default('JAN 15 1995 10:34 AM')
    .describe('Date stamp text to display (default: JAN 15 1995 10:34 AM)'),
  glowColor: z
    .enum(['green', 'amber', 'white'])
    .optional()
    .default('green')
    .describe('Primary glow color for HUD elements (green, amber, or white)'),
  phosphorFlickerRate: z
    .number()
    .optional()
    .default(60)
    .describe('Phosphor flicker animation speed in milliseconds (default: 60ms)'),
  trackingShiftFrequency: z
    .number()
    .optional()
    .default(5000)
    .describe('How often tracking shift occurs in milliseconds (default: 5000ms)'),
  trackingShiftAmount: z
    .number()
    .optional()
    .default(10)
    .describe('Maximum horizontal shift distance in pixels during tracking adjustment (default: 10px)'),
  scanlineOpacity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.3)
    .describe('Opacity of scanline overlay (0-1, default: 0.3)'),
  showPlayIndicator: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to show the PLAY mode indicator at top center (default: true)'),
  timecodeStartFrom: z
    .number()
    .optional()
    .default(0)
    .describe('Starting timecode in seconds (default: 0)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution Function ---
const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  // Destructure parameters with defaults
  const {
    recBlinkInterval,
    batteryPercentage,
    dateStamp,
    glowColor,
    phosphorFlickerRate,
    trackingShiftFrequency,
    trackingShiftAmount,
    scanlineOpacity,
    showPlayIndicator,
    timecodeStartFrom,
  } = params;

  // Helper function to get glow color values
  const getGlowColors = (color: 'green' | 'amber' | 'white') => {
    switch (color) {
      case 'green':
        return {
          rgb: '#00FF00',
          tailwind: 'text-green-400',
          shadow: '0 0 15px #00FF00, 0 0 30px #00FF00',
        };
      case 'amber':
        return {
          rgb: '#FFA500',
          tailwind: 'text-orange-400',
          shadow: '0 0 15px #FFA500, 0 0 30px #FFA500',
        };
      case 'white':
        return {
          rgb: '#FFFFFF',
          tailwind: 'text-white',
          shadow: '0 0 15px #FFFFFF, 0 0 30px #FFFFFF',
        };
      default:
        return {
          rgb: '#00FF00',
          tailwind: 'text-green-400',
          shadow: '0 0 15px #00FF00, 0 0 30px #00FF00',
        };
    }
  };

  const glowColors = getGlowColors(glowColor);

  // Helper function to create phosphor flicker effect
  const createPhosphorFlickerEffect = (targetId: string) => ({
    id: `phosphor-flicker-${targetId}`,
    componentId: targetId,
    data: {
      type: 'keyframes',
      start: 0,
      duration: props.config?.duration || 30,
      mode: 'provider' as const,
      targetIds: [targetId],
      keyframes: [
        { time: 0, values: { opacity: 0.85 } },
        { time: phosphorFlickerRate / 1000, values: { opacity: 1.0 } },
        { time: (phosphorFlickerRate * 2) / 1000, values: { opacity: 0.75 } },
        { time: (phosphorFlickerRate * 3) / 1000, values: { opacity: 0.95 } },
        { time: (phosphorFlickerRate * 4) / 1000, values: { opacity: 0.8 } },
      ],
      loop: true,
    },
  });

  // Helper function to create tracking shift effect
  const createTrackingShiftEffect = (targetId: string) => ({
    id: `tracking-shift-${targetId}`,
    componentId: targetId,
    data: {
      type: 'keyframes',
      start: 0,
      duration: props.config?.duration || 30,
      mode: 'provider' as const,
      targetIds: [targetId],
      keyframes: [
        { time: 0, values: { translateX: 0 } },
        { time: trackingShiftFrequency / 1000, values: { translateX: 0 } },
        {
          time: trackingShiftFrequency / 1000 + 0.05,
          values: { translateX: trackingShiftAmount },
        },
        {
          time: trackingShiftFrequency / 1000 + 0.15,
          values: { translateX: 0 },
        },
        {
          time: (trackingShiftFrequency * 2) / 1000,
          values: { translateX: 0 },
        },
      ],
      loop: true,
    },
  });

  // Helper function to create blink effect
  const createBlinkEffect = (targetId: string) => ({
    id: `blink-${targetId}`,
    componentId: targetId,
    data: {
      type: 'keyframes',
      start: 0,
      duration: props.config?.duration || 30,
      mode: 'provider' as const,
      targetIds: [targetId],
      keyframes: [
        { time: 0, values: { opacity: 1.0 } },
        { time: recBlinkInterval / 2000, values: { opacity: 0.0 } },
        { time: recBlinkInterval / 1000, values: { opacity: 1.0 } },
      ],
      loop: true,
    },
  });

  // Helper function to format timecode
  const formatTimecode = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Component IDs
  const scanlineOverlayId = 'camcorder-hud-scanline-overlay';
  const viewfinderFrameId = 'camcorder-hud-viewfinder-frame';
  const recDotId = 'camcorder-hud-rec-dot';
  const recTextId = 'camcorder-hud-rec-text';
  const batteryBodyId = 'camcorder-hud-battery-body';
  const batteryTipId = 'camcorder-hud-battery-tip';
  const batteryLevelId = 'camcorder-hud-battery-level';
  const playModeId = 'camcorder-hud-play-mode';
  const dateStampId = 'camcorder-hud-date-stamp';
  const timecodeLabelId = 'camcorder-hud-timecode-label';
  const timecodeValueId = 'camcorder-hud-timecode-value';

  // Build component tree
  const childrenData: RenderableComponentData[] = [];

  // 1. Scanline Overlay
  childrenData.push({
    id: scanlineOverlayId,
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shapeProps: {
        className: 'absolute inset-0 pointer-events-none z-50',
        style: {
          opacity: scanlineOpacity,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.3) 2px, rgba(0, 0, 0, 0.3) 4px)',
          mixBlendMode: 'overlay',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: props.config?.duration || 30,
      },
    },
  } as RenderableComponentData);

  // 2. Viewfinder Frame
  childrenData.push({
    id: viewfinderFrameId,
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shapeProps: {
        className: 'absolute inset-0 pointer-events-none z-40',
        style: {
          border: '8px solid transparent',
          borderImage:
            'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.1) 100%) 1',
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: props.config?.duration || 30,
      },
    },
  } as RenderableComponentData);

  // 3. REC Indicator (container)
  const recDotComponent = {
    id: recDotId,
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shapeProps: {
        className: 'w-3 h-3 rounded-full bg-red-600',
        style: {
          boxShadow: '0 0 10px #FF0000, 0 0 20px #FF0000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: props.config?.duration || 30,
      },
    },
    effects: [createBlinkEffect(recDotId)],
  } as RenderableComponentData;

  const recTextComponent = {
    id: recTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: 'REC',
      style: {
        fontSize: '12px',
        color: '#FF0000',
        textShadow: '0 0 10px #FF0000, 0 0 20px #FF0000',
        letterSpacing: '2px',
        fontWeight: 400,
      },
      font: {
        family: 'Press Start 2P',
        weights: ['400'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: props.config?.duration || 30,
      },
    },
    effects: [createBlinkEffect(recTextId)],
  } as RenderableComponentData;

  const recIndicatorContainer = {
    id: 'camcorder-hud-rec-indicator',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-4 left-4 flex items-center gap-2 z-30',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: props.config?.duration || 30,
      },
    },
    childrenData: [recDotComponent, recTextComponent],
  } as RenderableComponentData;

  childrenData.push(recIndicatorContainer);

  // 4. Battery Indicator
  const batteryBodyComponent = {
    id: batteryBodyId,
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shapeProps: {
        className: 'rounded-sm',
        style: {
          width: '24px',
          height: '12px',
          border: `2px solid ${glowColors.rgb}`,
          boxShadow: `0 0 10px ${glowColors.rgb}`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: props.config?.duration || 30,
      },
    },
  } as RenderableComponentData;

  const batteryTipComponent = {
    id: batteryTipId,
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shapeProps: {
        style: {
          width: '3px',
          height: '6px',
          marginLeft: '-1px',
          backgroundColor: glowColors.rgb,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: props.config?.duration || 30,
      },
    },
  } as RenderableComponentData;

  const batteryLevelComponent = {
    id: batteryLevelId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: `${batteryPercentage}%`,
      style: {
        fontSize: '12px',
        color: glowColors.rgb,
        textShadow: glowColors.shadow,
        marginLeft: '4px',
        fontWeight: 400,
      },
      font: {
        family: 'Press Start 2P',
        weights: ['400'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: props.config?.duration || 30,
      },
    },
  } as RenderableComponentData;

  const batteryIndicatorContainer = {
    id: 'camcorder-hud-battery-indicator',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-4 right-4 flex items-center gap-1 z-30',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: props.config?.duration || 30,
      },
    },
    childrenData: [batteryBodyComponent, batteryTipComponent, batteryLevelComponent],
  } as RenderableComponentData;

  childrenData.push(batteryIndicatorContainer);

  // 5. PLAY Mode Indicator (optional)
  if (showPlayIndicator) {
    const playModeComponent = {
      id: playModeId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: '▶ PLAY',
        style: {
          fontSize: '12px',
          color: glowColors.rgb,
          textShadow: glowColors.shadow,
          letterSpacing: '3px',
          fontWeight: 400,
        },
        font: {
          family: 'Press Start 2P',
          weights: ['400'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: props.config?.duration || 30,
        },
      },
      effects: [createPhosphorFlickerEffect(playModeId)],
    } as RenderableComponentData;

    const playModeContainer = {
      id: 'camcorder-hud-play-mode-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute top-4 left-1/2 -translate-x-1/2 z-30',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: props.config?.duration || 30,
        },
      },
      childrenData: [playModeComponent],
    } as RenderableComponentData;

    childrenData.push(playModeContainer);
  }

  // 6. Date Stamp
  const dateStampComponent = {
    id: dateStampId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: dateStamp,
      style: {
        fontSize: '12px',
        color: glowColor === 'amber' ? '#FFA500' : glowColors.rgb,
        textShadow:
          glowColor === 'amber'
            ? '0 0 10px #FFA500, 0 0 20px #FFA500'
            : glowColors.shadow,
        letterSpacing: '1px',
        fontWeight: 400,
      },
      font: {
        family: 'Press Start 2P',
        weights: ['400'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: props.config?.duration || 30,
      },
    },
    effects: [
      createPhosphorFlickerEffect(dateStampId),
      createTrackingShiftEffect(dateStampId),
    ],
  } as RenderableComponentData;

  const dateStampContainer = {
    id: 'camcorder-hud-date-stamp-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute bottom-4 right-4 z-30',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: props.config?.duration || 30,
      },
    },
    childrenData: [dateStampComponent],
  } as RenderableComponentData;

  childrenData.push(dateStampContainer);

  // 7. Timecode Counter
  const timecodeLabelComponent = {
    id: timecodeLabelId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: 'COUNTER',
      style: {
        fontSize: '8px',
        color: glowColors.rgb,
        textShadow: `0 0 10px ${glowColors.rgb}`,
        letterSpacing: '1px',
        marginBottom: '4px',
        fontWeight: 400,
      },
      font: {
        family: 'Press Start 2P',
        weights: ['400'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: props.config?.duration || 30,
      },
    },
  } as RenderableComponentData;

  const timecodeValueComponent = {
    id: timecodeValueId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: formatTimecode(timecodeStartFrom),
      style: {
        fontSize: '14px',
        color: glowColors.rgb,
        textShadow: glowColors.shadow,
        letterSpacing: '2px',
        fontWeight: 400,
      },
      font: {
        family: 'Press Start 2P',
        weights: ['400'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: props.config?.duration || 30,
      },
    },
    effects: [createPhosphorFlickerEffect(timecodeValueId)],
  } as RenderableComponentData;

  const timecodeContainer = {
    id: 'camcorder-hud-timecode-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute bottom-4 left-4 z-30 flex flex-col',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: props.config?.duration || 30,
      },
    },
    childrenData: [timecodeLabelComponent, timecodeValueComponent],
  } as RenderableComponentData;

  childrenData.push(timecodeContainer);

  // Root container
  const rootContainer = {
    id: 'camcorder-hud-90s-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-transparent pointer-events-none',
        style: {
          fontFamily: "'Press Start 2P', monospace",
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: props.config?.duration || 30,
      },
    },
    childrenData,
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
  };
};

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'camcorder-hud-90s',
  title: '90s Camcorder HUD Typography',
  description:
    'Authentic 90s home video "PLAY" mode HUD typography preset featuring on-screen display elements from vintage camcorders. Includes blinking REC indicator, battery display, date stamp, and counting timecode. Features CRT phosphor glow effects in green/amber, characteristic flicker animations, and periodic tracking adjustment shifts. Uses bitmap pixel font for authentic digital display aesthetics with scanline overlay for complete viewfinder immersion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'hud',
    'camcorder',
    '90s',
    'retro',
    'vhs',
    'crt',
    'phosphor',
    'glow',
    'viewfinder',
    'timecode',
    'rec',
    'battery',
    'bitmap-font',
    'scanline',
  ],
  defaultInputParams: {
    recBlinkInterval: 1000,
    batteryPercentage: 87,
    dateStamp: 'JAN 15 1995 10:34 AM',
    glowColor: 'green',
    phosphorFlickerRate: 60,
    trackingShiftFrequency: 5000,
    trackingShiftAmount: 10,
    scanlineOpacity: 0.3,
    showPlayIndicator: true,
    timecodeStartFrom: 0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---
export const camcorderHud90sPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: {
    type: 'object',
    properties: {
      recBlinkInterval: {
        type: 'number',
        default: 1000,
        description:
          'Blink interval for REC indicator in milliseconds (default: 1000ms)',
      },
      batteryPercentage: {
        type: 'number',
        minimum: 0,
        maximum: 100,
        default: 87,
        description: 'Battery percentage to display (0-100, default: 87)',
      },
      dateStamp: {
        type: 'string',
        default: 'JAN 15 1995 10:34 AM',
        description: 'Date stamp text to display (default: JAN 15 1995 10:34 AM)',
      },
      glowColor: {
        type: 'string',
        enum: ['green', 'amber', 'white'],
        default: 'green',
        description:
          'Primary glow color for HUD elements (green, amber, or white)',
      },
      phosphorFlickerRate: {
        type: 'number',
        default: 60,
        description:
          'Phosphor flicker animation speed in milliseconds (default: 60ms)',
      },
      trackingShiftFrequency: {
        type: 'number',
        default: 5000,
        description:
          'How often tracking shift occurs in milliseconds (default: 5000ms)',
      },
      trackingShiftAmount: {
        type: 'number',
        default: 10,
        description:
          'Maximum horizontal shift distance in pixels during tracking adjustment (default: 10px)',
      },
      scanlineOpacity: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        default: 0.3,
        description: 'Opacity of scanline overlay (0-1, default: 0.3)',
      },
      showPlayIndicator: {
        type: 'boolean',
        default: true,
        description:
          'Whether to show the PLAY mode indicator at top center (default: true)',
      },
      timecodeStartFrom: {
        type: 'number',
        default: 0,
        description: 'Starting timecode in seconds (default: 0)',
      },
    },
    required: [],
  },
};
