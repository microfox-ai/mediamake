# Effects System Documentation

This guide covers how to create and use different types of effects in the preset system. Effects are reusable animation modules that can be applied to components to create dynamic visual experiences.

## Table of Contents

1. [Effect Types Overview](#effect-types-overview)
2. [Base Effect Data Types](#base-effect-data-types)
3. [Creating Internal Effect Presets](#creating-internal-effect-presets)
4. [Creating Waveform Effects](#creating-waveform-effects)
5. [Creating Generic Effects](#creating-generic-effects)
6. [Using Effects in Presets](#using-effects-in-presets)
7. [Best Practices](#best-practices)

---

## Effect Types Overview

The system supports three main categories of effects:

### 1. **Internal Effect Presets** (`registry/internalEffects/`)

- Reusable effect modules that can be called programmatically by other presets
- Examples: `generic-opacity-effect.ts`, `beat-zoom-effect.ts`
- Not used directly via `insertPresetToComposition`
- Return effects that can be extracted and applied to target components

### 2. **Waveform Effects** (`components/effects/WaveformEffect.tsx`)

- Audio-reactive effects that synchronize with audio beats
- Uses `useWaveformData` hook to analyze audio in real-time
- Supports multiple effect types: zoom, shake, exposure, blur, scale, rotate, translate
- Reacts to audio properties: bass, mid, treble, waveform, frequency

### 3. **Generic Effects** (`components/effects/UniversalEffect.tsx`)

- Flexible effects using keyframe-based animations
- Supports any CSS property animation
- Uses `AnimationRange[]` for defining keyframes
- Supports multiple easing types: linear, ease-in, ease-out, ease-in-out, spring

---

## Base Effect Data Types

All effects extend from `UniversalEffectData`, which provides core timing and targeting capabilities:

```typescript
export interface UniversalEffectData {
  start?: number; // Start time in seconds
  duration?: number; // Duration in seconds
  type?: 'spring' | 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  ranges?: AnimationRange[]; // Animation keyframes (for generic effects)
  targetIds?: string[]; // IDs of child components to target (for provider mode)
  mode?: 'wrapper' | 'provider'; // How the effect is applied
  props?: any; // Additional properties for the effect
  [key: string]: any; // Effect-specific properties
}

export interface AnimationRange {
  key: string; // CSS property key (e.g., 'transform', 'opacity', 'scale')
  val: any; // Value for this keyframe
  prog: number; // Progress (0-1) when this keyframe should be active
}
```

### Effect Modes

**Wrapper Mode** (`mode: 'wrapper'`):

- Effect wraps the component and applies styles directly
- Used when you want the effect to affect the component itself

**Provider Mode** (`mode: 'provider'`):

- Effect provides styles to child components via context
- Used when you want to target specific child components by ID
- Requires `targetIds` array to specify which components to affect

---

## Creating Internal Effect Presets

Internal effect presets are reusable modules that generate effects programmatically. They're used by other presets to create dynamic effects.

### Structure

```typescript
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

/**
 * Your Effect Name
 *
 * SINGLE EFFECT:
 * Brief description of what the effect does.
 *
 * ARRAY OF EFFECTS (if applicable):
 * Some effects return arrays for complex animations.
 */

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to target'),
  effectStart: z.number().describe('Start time of the effect (relative)'),
  effectDuration: z.number().describe('Duration of the effect'),
  // Add your custom parameters here
  customParam: z.number().default(1).optional().describe('Custom parameter'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: any,
): PresetOutput => {
  // Calculate effect parameters
  const customParam = params.customParam ?? 1;

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'ease-out', // or 'ease-in', 'ease-in-out', 'linear', 'spring'
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.5 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // Create single effect
  const effect = {
    id: params.effectId || `effect-${params.targetId}`,
    componentId: 'generic', // Use 'generic' for UniversalEffect
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'yourEffectId',
  title: 'Your Effect Title',
  description: 'Description of what the effect does',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'your-tag', 'internal'], // Must include 'internal'
  dependencies: {},
  // REQUIRED: Mark as internal preset
  _internalPreset: true,
  _internalPresetOutput: 'effects', // 'effects' | 'children' | 'data'
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 2,
    customParam: 1,
  },
};

export const yourEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
```

### Key Requirements

1. **Metadata Requirements**:
   - `_internalPreset: true` - Marks as internal preset
   - `_internalPresetOutput: 'effects'` - Specifies output type to extract
   - `presetType: 'effects'` - Indicates this is an effect preset
   - `tags` - Must include `'internal'` and `'generic'` (or effect type)

2. **Output Structure**:
   - Return effects in a container structure
   - System automatically extracts `effects` from the first child when `_internalPresetOutput: 'effects'` is set

3. **Documentation**:
   - Document at the top: SINGLE EFFECT or ARRAY OF EFFECTS
   - Explain parameters and usage

### Example: Generic Opacity Effect

```typescript
// See: registry/internalEffects/generic-opacity-effect.ts

const effectData: GenericEffectData = {
  type: 'ease-out',
  start: params.effectStart,
  duration: params.effectDuration,
  mode: 'provider',
  targetIds: [params.targetId],
  ranges: [
    { key: 'opacity', val: 0, prog: 0 },
    { key: 'opacity', val: 1, prog: fadeInProgress },
    { key: 'opacity', val: 1, prog: 1 },
  ],
};
```

---

## Creating Waveform Effects

Waveform effects are audio-reactive effects that synchronize visual animations with audio beats. They use the `WaveformEffect` component and `useWaveformData` hook.

### WaveformEffectData Interface

```typescript
export interface WaveformEffectData extends UniversalEffectData {
  // Audio source configuration
  audioSrc: string; // Audio URL or ref:componentId
  numberOfSamples?: number; // Must be power of 2 (default: 128)
  windowInSeconds?: number; // Time window for analysis (default: 1/fps)
  dataOffsetInSeconds?: number; // Audio offset
  normalize?: boolean; // Normalize wave data
  useFrequencyData?: boolean; // Enable frequency analysis

  // Audio property to react to
  audioProperty?: 'bass' | 'mid' | 'treble' | 'waveform' | 'frequency';
  sensitivity?: number; // Sensitivity multiplier (default: 1)
  threshold?: number; // Minimum value to trigger effect (default: 0)
  smoothing?: number; // Smoothing factor (0-1, default: 0.5)
  smoothNormalisation?: number; // Frame-based smoothing (0 = no smoothing, 1 = default, >1 = more)

  // Effect type configuration
  effectType?:
    | 'zoom'
    | 'shake'
    | 'exposure'
    | 'blur'
    | 'scale'
    | 'rotate'
    | 'translateX'
    | 'translateY';

  // Effect-specific parameters
  intensity?: number; // Effect intensity multiplier (default: 1)
  minValue?: number; // Minimum effect value
  maxValue?: number; // Maximum effect value

  // For shake effect
  shakeAxis?: 'x' | 'y' | 'both';

  // For zoom/scale effect
  baseScale?: number; // Base scale value (default: 1)

  // For exposure effect
  baseBrightness?: number; // Base brightness value (default: 1)

  // For rotation effect
  rotationRange?: number; // Maximum rotation in degrees (default: 15)
}
```

### Creating a Waveform Internal Effect

```typescript
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to target'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId'),
  effectStart: z.number().describe('Start time of the effect (relative)'),
  effectDuration: z.number().describe('Duration of the effect'),

  // Effect-specific parameters
  zoomIntensity: z.number().min(0.1).max(2).default(0.3).optional(),
  baseScale: z.number().min(0.5).max(1.5).default(1).optional(),
  sensitivity: z.number().min(0.1).max(5).default(1.5).optional(),
  threshold: z.number().min(0).max(1).default(0.2).optional(),
  audioProperty: z
    .enum(['bass', 'mid', 'treble', 'waveform'])
    .default('bass')
    .optional(),
  smoothNormalisation: z.number().min(0).max(5).default(1).optional(),

  effectId: z.string().optional().describe('Optional custom effect ID'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: any,
): PresetOutput => {
  const effectData: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: params.audioProperty ?? 'bass',
    effectType: 'zoom',
    intensity: params.zoomIntensity ?? 0.3,
    baseScale: params.baseScale ?? 1,
    sensitivity: params.sensitivity ?? 1.5,
    threshold: params.threshold ?? 0.2,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [params.targetId],
    start: params.effectStart,
    duration: params.effectDuration,
    smoothNormalisation: params.smoothNormalisation ?? 1,
  };

  const effect = {
    id: params.effectId || `beat-zoom-${params.targetId}`,
    componentId: 'waveform', // Use 'waveform' for WaveformEffect
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'waveform-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ... metadata similar to generic effect
```

### Waveform Effect Types

**Zoom Effect**:

```typescript
{
  effectType: 'zoom',
  intensity: 0.3,        // Zoom intensity multiplier
  baseScale: 1,          // Base scale (1 = normal size)
  audioProperty: 'bass', // React to bass frequencies
}
```

**Shake Effect**:

```typescript
{
  effectType: 'shake',
  intensity: 20,         // Shake intensity in pixels
  shakeAxis: 'both',     // 'x', 'y', or 'both'
  audioProperty: 'mid', // React to mid frequencies
}
```

**Exposure Effect**:

```typescript
{
  effectType: 'exposure',
  intensity: 0.5,        // Brightness intensity multiplier
  baseBrightness: 1,     // Base brightness (1 = normal)
  audioProperty: 'treble', // React to treble frequencies
}
```

### Smoothing Control

The `smoothNormalisation` parameter controls frame-based smoothing:

- `0` = No smoothing (original behavior, raw audio data)
- `1` = Default smoothing (current behavior)
- `>1` = More smoothing (averages more frames)

When `smoothNormalisation` is 0, the effect uses:

- Original window size (`1/fps`)
- Single-frame audio data (no averaging)
- Raw intensity values (no additional smoothing)

---

## Creating Generic Effects

Generic effects use the `UniversalEffect` component (registered as `'generic'`) with keyframe-based animations defined by `AnimationRange[]`.

### AnimationRange Structure

```typescript
interface AnimationRange {
  key: string; // CSS property name
  val: any; // Property value (number or string)
  prog: number; // Progress (0-1) when this keyframe is active
}
```

### Supported CSS Properties

**Transform Properties**:

```typescript
{ key: 'translateX', val: 100, prog: 0 }      // Horizontal movement (px)
{ key: 'translateY', val: -50, prog: 0 }     // Vertical movement (px)
{ key: 'scale', val: 1.5, prog: 1 }           // Uniform scale
{ key: 'scaleX', val: 2, prog: 1 }            // Horizontal scale
{ key: 'scaleY', val: 0.5, prog: 1 }         // Vertical scale
{ key: 'rotate', val: 45, prog: 1 }          // Rotation (degrees)
```

**Visual Properties**:

```typescript
{ key: 'opacity', val: 0.5, prog: 0 }        // Transparency (0-1)
{ key: 'blur', val: '5px', prog: 0 }          // Blur filter
{ key: 'brightness', val: 1.2, prog: 1 }      // Brightness filter
```

**Color Properties**:

```typescript
{ key: 'color', val: 'rgb(255,107,107)', prog: 1 }
{ key: 'backgroundColor', val: '#FFEB3B', prog: 0.5 }
```

**Text Properties**:

```typescript
{ key: 'letterSpacing', val: '0.2em', prog: 1 }
{ key: 'fontSize', val: '24px', prog: 1 }
{ key: 'textShadow', val: '2px 2px 4px rgba(0,0,0,0.5)', prog: 1 }
```

**Filter Effects**:

```typescript
// Single filter
{ key: 'filter', val: 'blur(5px)', prog: 0 }

// Multiple filters
{ key: 'filter', val: 'blur(4px) drop-shadow(0 0 10px #ff0000) contrast(1.5)', prog: 1 }
```

### Generic Effect Example

```typescript
const effectData: GenericEffectData = {
  type: 'ease-in-out',
  start: 0,
  duration: 2,
  mode: 'provider',
  targetIds: ['word-1'],
  ranges: [
    // Fade in
    { key: 'opacity', val: 0, prog: 0 },
    { key: 'opacity', val: 1, prog: 0.5 },
    // Scale up
    { key: 'scale', val: 0.8, prog: 0 },
    { key: 'scale', val: 1, prog: 0.5 },
    // Slide in from left
    { key: 'translateX', val: -50, prog: 0 },
    { key: 'translateX', val: 0, prog: 0.5 },
  ],
};
```

### Easing Types

- `'linear'` - Constant speed
- `'ease-in'` - Slow start, fast end
- `'ease-out'` - Fast start, slow end
- `'ease-in-out'` - Slow start and end, fast middle
- `'spring'` - Spring physics animation

### Using Generic Effect Presets

The system includes pre-built animation presets in `GenericPresets.ts`:

```typescript
import { GenericEffectPresets } from '@microfox/remotion';

const effectData: GenericEffectData = {
  type: 'ease-out',
  start: 0,
  duration: 1,
  mode: 'provider',
  targetIds: ['component-1'],
  ranges: GenericEffectPresets.fadeInPreset, // Use preset
};
```

Available presets:

- `fadeInPreset`, `fadeOutPreset`
- `scaleInPreset`, `scaleOutPreset`
- `slideInLeftPreset`, `slideInRightPreset`, `slideInTopPreset`, `slideInBottomPreset`
- `bouncePreset`, `pulsePreset`
- `rotateInPreset`, `blurInPreset`
- And more...

---

## Using Effects in Presets

### Using Internal Effects

1. **Declare Dependencies**:

```typescript
const presetMetadata: PresetMetadata = {
  dependencies: {
    presets: ['genericOpacityEffect', 'beatZoomEffect'], // REQUIRED
  },
};
```

2. **Call Internal Preset**:

```typescript
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: any,
): Promise<PresetOutput> => {
  const { presets } = props;

  // Validate dependency
  if (!presets || !presets.genericOpacityEffect) {
    throw new Error('Preset dependency "genericOpacityEffect" not found');
  }

  // Prepare effect parameters
  const effectParams = {
    targetId: 'word-1',
    effectStart: 0,
    effectDuration: 2,
    impact: 1.0,
  };

  // Call internal preset
  const effectResult = await presets.genericOpacityEffect(effectParams, props);

  // Extract effect
  const wordEffect =
    effectResult?.output?._extractedEffects?.[0] ||
    effectResult?.output?.childrenData?.[0]?.effects?.[0];

  // Apply to component
  const wordComponent = {
    id: 'word-1',
    type: 'atom',
    componentId: 'TextAtom',
    data: { text: 'Hello' },
    effects: wordEffect ? [wordEffect] : [],
  };
};
```

### Direct Effect Construction

You can also construct effects directly without using internal presets:

```typescript
const effect: BaseEffect = {
  id: 'my-effect',
  componentId: 'generic', // or 'waveform', 'shake', 'zoom', etc.
  data: {
    type: 'ease-out',
    start: 0,
    duration: 2,
    mode: 'provider',
    targetIds: ['target-1'],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  } as GenericEffectData,
};

const component = {
  id: 'my-component',
  componentId: 'ImageAtom',
  data: { src: 'image.jpg' },
  effects: [effect],
};
```

### Available Effect Components

- `'generic'` - UniversalEffect (keyframe animations)
- `'waveform'` - WaveformEffect (audio-reactive)
- `'shake'` - ShakeEffect (shake animation)
- `'zoom'` - ZoomEffect (zoom animation)
- `'pan'` - PanEffect (pan animation)
- `'blur'` - BlurEffect (blur filter)

---

## Best Practices

### 1. Effect Naming

- Use descriptive names: `beatZoomEffect`, `fadeInEffect`
- Follow naming convention: `{type}{Effect}Preset`

### 2. Parameter Validation

- Always use Zod schemas for parameter validation
- Provide sensible defaults
- Include helpful descriptions

### 3. Error Handling

- Validate preset dependencies before calling
- Provide clear error messages
- Handle missing parameters gracefully

### 4. Documentation

- Document effect behavior at the top of the file
- Explain parameters and their ranges
- Include usage examples

### 5. Performance

- Use `useMemo` for expensive calculations in effect components
- Avoid unnecessary re-renders
- Consider smoothing for audio-reactive effects

### 6. Reusability

- Create internal effects for reusable animations
- Keep effects focused (one effect per preset)
- Use composition for complex effects

### 7. Testing

- Test with different parameter values
- Verify timing and duration
- Check provider vs wrapper modes

---

## Examples

### Example 1: Simple Fade-In Effect

```typescript
// Internal effect preset
const fadeInEffect: GenericEffectData = {
  type: 'ease-out',
  start: 0,
  duration: 1,
  mode: 'provider',
  targetIds: ['text-1'],
  ranges: [
    { key: 'opacity', val: 0, prog: 0 },
    { key: 'opacity', val: 1, prog: 1 },
  ],
};
```

### Example 2: Beat-Synchronized Zoom

```typescript
// Waveform effect
const beatZoom: WaveformEffectData = {
  audioSrc: 'https://example.com/audio.mp3',
  effectType: 'zoom',
  intensity: 0.3,
  baseScale: 1,
  audioProperty: 'bass',
  sensitivity: 1.5,
  threshold: 0.2,
  mode: 'provider',
  targetIds: ['image-1'],
  start: 0,
  duration: 10,
  smoothNormalisation: 1,
};
```

### Example 3: Complex Multi-Property Animation

```typescript
// Generic effect with multiple properties
const complexAnimation: GenericEffectData = {
  type: 'ease-in-out',
  start: 0,
  duration: 2,
  mode: 'provider',
  targetIds: ['card-1'],
  ranges: [
    // Fade in
    { key: 'opacity', val: 0, prog: 0 },
    { key: 'opacity', val: 1, prog: 0.3 },
    // Scale up
    { key: 'scale', val: 0.8, prog: 0 },
    { key: 'scale', val: 1.1, prog: 0.5 },
    { key: 'scale', val: 1, prog: 1 },
    // Rotate
    { key: 'rotate', val: -10, prog: 0 },
    { key: 'rotate', val: 0, prog: 0.5 },
    // Add shadow
    { key: 'filter', val: 'drop-shadow(0 0 0px rgba(0,0,0,0))', prog: 0 },
    { key: 'filter', val: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))', prog: 1 },
  ],
};
```

---

## Reference

### Effect Data Types

- `UniversalEffectData` - Base interface for all effects
- `GenericEffectData` - Alias for `UniversalEffectData` (for generic effects)
- `WaveformEffectData` - Extends `UniversalEffectData` with audio properties
- `ShakeEffectData` - Extends `UniversalEffectData` with shake properties
- `PanEffectData` - Pan effect specific data
- `ZoomEffectData` - Zoom effect specific data

### Key Files

- `packages/remotion/src/components/effects/UniversalEffect.tsx` - Base effect component
- `packages/remotion/src/components/effects/WaveformEffect.tsx` - Audio-reactive effects
- `packages/remotion/src/components/effects/GenericPresets.ts` - Pre-built animations
- `apps/mediamake/components/editor/presets/registry/internalEffects/` - Internal effect presets

### Related Documentation

- See `TYPOGRAPHY.md` for using effects in typography presets
- See `PRESET_GUIDE.md` for general preset creation
- See `ADVANCED_PRESET_GUIDE.md` for advanced patterns
