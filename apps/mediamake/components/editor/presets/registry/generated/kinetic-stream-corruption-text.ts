/**
 * Kinetic Stream Corruption Text Effect Preset
 *
 * This preset creates a real-time video stream corruption effect for kinetic typography.
 * It mimics live broadcast streaming issues including:
 * - Buffering stutters and resolution drops
 * - Bitrate fluctuations with quality degradation/recovery cycles
 * - Frame duplication glitches (text freezes and stacks)
 * - Compression artifacts (color banding, macroblock distortion)
 * - Neon error state colors (warning yellows, error reds, system blues)
 *
 * Features:
 * - Adaptive streaming quality simulation (high → mid → low → high)
 * - Dynamic resolution changes via font-size and blur
 * - Frame stacking with duplicate text layers and slight offsets
 * - Compression artifacts using contrast, posterize, and color reduction
 * - Rapid color flashes during corruption peaks
 * - Stepped quality transitions for digital glitch aesthetic
 *
 * Use cases:
 * - Tech content with digital glitch aesthetic
 * - Live streaming error simulation
 * - Cyberpunk/tech-noir title sequences
 * - Error state visualization
 * - Digital corruption effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().default('LIVE STREAM').describe('Text content to display with corruption effect'),
  font: z.string().optional().describe('Font family with optional weight and style (e.g., "Inter:900", "BebasNeue")'),
  fontSize: z.number().min(24).max(300).default(72).describe('Base font size in pixels'),
  textColor: z.string().default('#ffffff').describe('Base text color'),
  corruptionIntensity: z.number().min(0.1).max(3).default(1).describe('Overall corruption intensity multiplier (0.1-3)'),
  qualityFluctuationSpeed: z.enum(['slow', 'medium', 'fast']).default('medium').describe('Speed of quality degradation cycles'),
  frameDuplicationIntensity: z.number().min(0).max(1).default(0.7).describe('Intensity of frame duplication glitches (0-1)'),
  colorFlashIntensity: z.number().min(0).max(1).default(0.8).describe('Intensity of neon error color flashes (0-1)'),
  duration: z.number().min(1).default(10).describe('Total duration of the effect in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:900';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10) || 900;
    }
  } else {
    fontStyle.fontWeight = 900;
  }

  // Calculate timing parameters based on quality fluctuation speed
  const speedMultipliers = {
    slow: 1.5,
    medium: 1.0,
    fast: 0.6,
  };
  const speedMult = speedMultipliers[params.qualityFluctuationSpeed];
  
  // Quality fluctuation cycle times (500-1500ms range)
  const qualityCycleDuration = 1.0 * speedMult; // Base cycle: 1 second
  const frameFreezeInterval = 0.3 * speedMult; // Frame freeze: 300ms
  const colorFlashDuration = 0.1; // 100ms flashes

  // Apply corruption intensity to all timings
  const intensity = params.corruptionIntensity;

  // Component IDs
  const rootId = 'stream-corruption-root';
  const textPrimaryId = 'text-primary';
  const textDup1Id = 'text-duplicate-1';
  const textDup2Id = 'text-duplicate-2';
  const flashYellowId = 'flash-overlay-yellow';
  const flashRedId = 'flash-overlay-red';
  const flashBlueId = 'flash-overlay-blue';

  // --- PRIMARY TEXT EFFECTS: Quality Degradation Cycle ---
  // Cycles through: high-res → mid-res → low-res → high-res
  const qualityEffects: GenericEffectData[] = [];
  
  // Number of quality cycles in duration
  const numCycles = Math.floor(params.duration / qualityCycleDuration);
  
  for (let i = 0; i < numCycles; i++) {
    const cycleStart = i * qualityCycleDuration;
    
    // Quality degradation: high → low → high
    // Phase 1: High quality (0-25%)
    qualityEffects.push({
      type: 'linear',
      start: cycleStart,
      duration: qualityCycleDuration * 0.25,
      mode: 'provider',
      targetIds: [textPrimaryId],
      ranges: [
        { key: 'fontSize', val: params.fontSize, prog: 0 },
        { key: 'fontSize', val: params.fontSize * 0.9, prog: 1 },
        { key: 'filter', val: 'blur(0px) contrast(1)', prog: 0 },
        { key: 'filter', val: 'blur(1px) contrast(1.1)', prog: 1 },
      ],
    } as GenericEffectData);
    
    // Phase 2: Mid quality (25-50%)
    qualityEffects.push({
      type: 'linear',
      start: cycleStart + qualityCycleDuration * 0.25,
      duration: qualityCycleDuration * 0.25,
      mode: 'provider',
      targetIds: [textPrimaryId],
      ranges: [
        { key: 'fontSize', val: params.fontSize * 0.9, prog: 0 },
        { key: 'fontSize', val: params.fontSize * 0.75, prog: 1 },
        { key: 'filter', val: 'blur(1px) contrast(1.1)', prog: 0 },
        { key: 'filter', val: `blur(${3 * intensity}px) contrast(${1.3 * intensity})`, prog: 1 },
      ],
    } as GenericEffectData);
    
    // Phase 3: Low quality (50-75%)
    qualityEffects.push({
      type: 'linear',
      start: cycleStart + qualityCycleDuration * 0.5,
      duration: qualityCycleDuration * 0.25,
      mode: 'provider',
      targetIds: [textPrimaryId],
      ranges: [
        { key: 'fontSize', val: params.fontSize * 0.75, prog: 0 },
        { key: 'fontSize', val: params.fontSize * 0.7, prog: 1 },
        { key: 'filter', val: `blur(${3 * intensity}px) contrast(${1.3 * intensity})`, prog: 0 },
        { key: 'filter', val: `blur(${5 * intensity}px) contrast(${1.5 * intensity}) saturate(0.8)`, prog: 1 },
      ],
    } as GenericEffectData);
    
    // Phase 4: Recovery to high (75-100%)
    qualityEffects.push({
      type: 'linear',
      start: cycleStart + qualityCycleDuration * 0.75,
      duration: qualityCycleDuration * 0.25,
      mode: 'provider',
      targetIds: [textPrimaryId],
      ranges: [
        { key: 'fontSize', val: params.fontSize * 0.7, prog: 0 },
        { key: 'fontSize', val: params.fontSize, prog: 1 },
        { key: 'filter', val: `blur(${5 * intensity}px) contrast(${1.5 * intensity}) saturate(0.8)`, prog: 0 },
        { key: 'filter', val: 'blur(0px) contrast(1) saturate(1)', prog: 1 },
      ],
    } as GenericEffectData);
  }

  // --- FRAME DUPLICATION GLITCH EFFECTS ---
  const frameDuplicationEffects: GenericEffectData[] = [];
  
  // Create frame freeze/stack events at intervals
  const numFreezes = Math.floor(params.duration / frameFreezeInterval);
  
  for (let i = 0; i < numFreezes; i++) {
    const freezeStart = i * frameFreezeInterval + Math.random() * 0.2; // Add randomness
    const freezeDuration = 0.2 + Math.random() * 0.2; // 200-400ms
    
    if (freezeStart + freezeDuration > params.duration) continue;
    
    // Show duplicate 1 with offset
    frameDuplicationEffects.push({
      type: 'linear',
      start: freezeStart,
      duration: freezeDuration,
      mode: 'provider',
      targetIds: [textDup1Id],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: params.frameDuplicationIntensity * 0.6, prog: 0.1 },
        { key: 'opacity', val: params.frameDuplicationIntensity * 0.6, prog: 0.9 },
        { key: 'opacity', val: 0, prog: 1 },
        { key: 'translateX', val: -3, prog: 0 },
        { key: 'translateX', val: -3, prog: 1 },
        { key: 'translateY', val: 2, prog: 0 },
        { key: 'translateY', val: 2, prog: 1 },
      ],
    } as GenericEffectData);
    
    // Show duplicate 2 with different offset
    frameDuplicationEffects.push({
      type: 'linear',
      start: freezeStart,
      duration: freezeDuration,
      mode: 'provider',
      targetIds: [textDup2Id],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: params.frameDuplicationIntensity * 0.4, prog: 0.1 },
        { key: 'opacity', val: params.frameDuplicationIntensity * 0.4, prog: 0.9 },
        { key: 'opacity', val: 0, prog: 1 },
        { key: 'translateX', val: 4, prog: 0 },
        { key: 'translateX', val: 4, prog: 1 },
        { key: 'translateY', val: -3, prog: 0 },
        { key: 'translateY', val: -3, prog: 1 },
      ],
    } as GenericEffectData);
  }

  // --- COLOR FLASH EFFECTS (Neon Error States) ---
  const colorFlashEffects: GenericEffectData[] = [];
  
  // Create color flashes during corruption peaks (at mid-low quality phases)
  for (let i = 0; i < numCycles; i++) {
    const cycleStart = i * qualityCycleDuration;
    const flashStart = cycleStart + qualityCycleDuration * 0.5; // Flash during low quality phase
    
    if (flashStart > params.duration) break;
    
    // Yellow warning flash
    colorFlashEffects.push({
      type: 'linear',
      start: flashStart,
      duration: colorFlashDuration,
      mode: 'provider',
      targetIds: [flashYellowId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: params.colorFlashIntensity * 0.3, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    } as GenericEffectData);
    
    // Red error flash (slightly offset)
    colorFlashEffects.push({
      type: 'linear',
      start: flashStart + colorFlashDuration * 1.5,
      duration: colorFlashDuration,
      mode: 'provider',
      targetIds: [flashRedId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: params.colorFlashIntensity * 0.25, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    } as GenericEffectData);
    
    // Blue system flash (slightly offset)
    colorFlashEffects.push({
      type: 'linear',
      start: flashStart + colorFlashDuration * 0.7,
      duration: colorFlashDuration,
      mode: 'provider',
      targetIds: [flashBlueId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: params.colorFlashIntensity * 0.2, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    } as GenericEffectData);
  }

  // --- BUILD COMPONENT TREE ---
  
  // Primary text component
  const textPrimary: RenderableComponentData = {
    id: textPrimaryId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: fontStyle.fontWeight,
        color: params.textColor,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        textShadow: '0 0 20px rgba(0, 255, 255, 0.8), 0 0 40px rgba(255, 0, 255, 0.6)',
        imageRendering: 'pixelated', // For blocky/pixelated effect during corruption
      },
      font: {
        family: fontFamily,
        weights: [fontStyle.fontWeight?.toString() || '900'],
        subsets: ['latin'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: qualityEffects.map((effect, idx) => ({
      id: `quality-effect-${idx}`,
      componentId: 'generic',
      data: effect,
    })),
  };

  // Duplicate text 1 (for frame stacking)
  const textDup1: RenderableComponentData = {
    id: textDup1Id,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'absolute',
      style: {
        fontSize: params.fontSize,
        fontWeight: fontStyle.fontWeight,
        color: params.textColor,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        textShadow: '0 0 20px rgba(0, 255, 255, 0.8)',
        opacity: 0,
      },
      font: {
        family: fontFamily,
        weights: [fontStyle.fontWeight?.toString() || '900'],
        subsets: ['latin'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: frameDuplicationEffects.filter((_, idx) => idx % 2 === 0).map((effect, idx) => ({
      id: `dup1-effect-${idx}`,
      componentId: 'generic',
      data: effect,
    })),
  };

  // Duplicate text 2 (for frame stacking)
  const textDup2: RenderableComponentData = {
    id: textDup2Id,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'absolute',
      style: {
        fontSize: params.fontSize,
        fontWeight: fontStyle.fontWeight,
        color: params.textColor,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        textShadow: '0 0 20px rgba(255, 0, 255, 0.6)',
        opacity: 0,
      },
      font: {
        family: fontFamily,
        weights: [fontStyle.fontWeight?.toString() || '900'],
        subsets: ['latin'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: frameDuplicationEffects.filter((_, idx) => idx % 2 === 1).map((effect, idx) => ({
      id: `dup2-effect-${idx}`,
      componentId: 'generic',
      data: effect,
    })),
  };

  // Flash overlays (neon error colors)
  const flashYellow: RenderableComponentData = {
    id: flashYellowId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; pointer-events: none;"></div>',
      className: 'absolute inset-0',
      style: {
        backgroundColor: '#ffff00',
        mixBlendMode: 'difference',
        opacity: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: colorFlashEffects.filter((effect) => effect.targetIds?.[0] === flashYellowId).map((effect, idx) => ({
      id: `flash-yellow-${idx}`,
      componentId: 'generic',
      data: effect,
    })),
  };

  const flashRed: RenderableComponentData = {
    id: flashRedId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; pointer-events: none;"></div>',
      className: 'absolute inset-0',
      style: {
        backgroundColor: '#ff0000',
        mixBlendMode: 'difference',
        opacity: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: colorFlashEffects.filter((effect) => effect.targetIds?.[0] === flashRedId).map((effect, idx) => ({
      id: `flash-red-${idx}`,
      componentId: 'generic',
      data: effect,
    })),
  };

  const flashBlue: RenderableComponentData = {
    id: flashBlueId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; pointer-events: none;"></div>',
      className: 'absolute inset-0',
      style: {
        backgroundColor: '#0088ff',
        mixBlendMode: 'difference',
        opacity: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: colorFlashEffects.filter((effect) => effect.targetIds?.[0] === flashBlueId).map((effect, idx) => ({
      id: `flash-blue-${idx}`,
      componentId: 'generic',
      data: effect,
    })),
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      textPrimary,
      textDup1,
      textDup2,
      flashYellow,
      flashRed,
      flashBlue,
    ],
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
  id: 'kineticStreamCorruptionText',
  title: 'Kinetic Stream Corruption Text Effect',
  description: 'Real-time video stream corruption effect for kinetic typography. Features adaptive streaming quality degradation with buffering stutters, resolution drops, bitrate fluctuations, frame duplication glitches, compression artifacts (color banding, macroblock distortion), and neon error state colors (warning yellows, error reds, system blues) that flash during corruption peaks. Text dynamically shifts between high, medium, and low quality states with pixelation, blur, and contrast effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'kinetic',
    'text',
    'corruption',
    'glitch',
    'stream',
    'live',
    'buffering',
    'degradation',
    'compression',
    'artifacts',
    'neon',
    'error',
    'digital',
    'tech',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'LIVE STREAM',
    font: 'Inter:900',
    fontSize: 72,
    textColor: '#ffffff',
    corruptionIntensity: 1,
    qualityFluctuationSpeed: 'medium',
    frameDuplicationIntensity: 0.7,
    colorFlashIntensity: 0.8,
    duration: 10,
  },
};

// Export preset
export const kineticStreamCorruptionTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};