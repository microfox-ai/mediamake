# Preset Creation Basics

## 1. Understanding Requirements

Before creating a preset, understand:

### Input Data Requirements

- **What data does the user provide?** (captions, media URLs, text, etc.)
- **What format is the data in?** (arrays, objects, references)
- **Are there optional vs required fields?**

### Complexity & Intelligence

- **How simple should the preset be?** (single-purpose vs multi-feature)
- **How much automation is needed?** (auto-calculate timings, auto-position, auto-style)
- **What should be user-configurable vs automatic?**

**Example:**

- Simple: User provides text → preset displays it
- Complex: User provides captions → preset auto-calculates word timings, highlights keywords, applies effects

## 2. Preset Architecture

### React-like Component System

Presets work similar to React components:

- **Create presets** → Like creating components
- **Use sub-presets** → Like composing components
- **Dependencies** → Like importing components

### Sub-presets Pattern

1. **Define sub-presets separately** in their own files
2. **Declare in dependencies** in main preset metadata
3. **Call sub-presets** via `props.presets[presetId]()`
4. **Extract output** and attach to main preset structure

```typescript
// Main preset metadata
const presetMetadata: PresetMetadata = {
  dependencies: {
    presets: ['subPreset1', 'subPreset2'], // Declare sub-presets
  },
};

// In preset execution
const { presets } = props;
const subResult = await presets.subPreset1(params, props);
// Extract and use subResult.output
```

## 3. Helper Functions: Critical Rules

### ⚠️ CRITICAL: Where Functions Can Be Defined

**Helper functions can ONLY be defined in these 3 places:**

1. **`preset-stdlib`** - Shared utility functions available to all presets
2. **Separate preset** - Create a reusable preset and call it via dependencies
3. **Inside `presetExecution`** - Define functions locally within the execution function

**❌ NEVER define functions outside these locations**

### Option 1: preset-stdlib

Add reusable utility functions to `preset-stdlib.ts`:

```typescript
// In preset-stdlib.ts
export const presetStdLib = {
  hexToRgb: (hex: string) => {
    /* ... */
  },
  parseTimeRange: (range: string) => {
    /* ... */
  },
  // Add your helper functions here
};

// In preset metadata - declare dependency
const presetMetadata: PresetMetadata = {
  dependencies: {
    helpers: ['hexToRgb', 'parseTimeRange'], // Declare helpers
  },
};

// In preset execution - use via props
const presetExecution = (params, props) => {
  const { helpers } = props;
  const rgb = helpers.hexToRgb('#ff0000');
  // ...
};
```

**Use for**: Reusable utilities (color conversion, time parsing, calculations)

### Option 2: Separate Preset

Create a dedicated preset for complex logic:

```typescript
// In helper-preset.ts
const helperPresetExecution = (params, props) => {
  // Complex logic here
  return {
    output: {
      /* ... */
    },
  };
};

// In main preset metadata
const presetMetadata: PresetMetadata = {
  dependencies: {
    presets: ['helperPreset'], // Declare as dependency
  },
};

// In main preset execution
const presetExecution = async (params, props) => {
  const { presets } = props;
  const result = await presets.helperPreset(helperParams, props);
  // Use result.output
};
```

**Use for**: Complex reusable logic that returns composition data

### Option 3: Inside presetExecution

Define functions locally within the execution function:

```typescript
const presetExecution = (params, props) => {
  // Helper function defined inside execution
  const parseTimeRange = (range: string) => {
    const match = range.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
    // ... parsing logic
    return { start, duration };
  };

  // Use the helper
  const timeRange = parseTimeRange('0:10-2:30');
  // ...
};
```

**Use for**: Preset-specific logic that won't be reused elsewhere

### Server Operations: Using Fetcher

For server-related operations (API calls, audio analysis, etc.), use `fetcher` from props:

```typescript
const presetExecution = async (params, props) => {
  const { fetcher } = props;

  // Call server API
  const result = await fetcher('/api/analyze-audio', {
    audioSrc: params.audio.src,
  });

  // Use result
  const { analysis, durationInSeconds } = result;
  // ...
};
```

**Example from beatstitch.ts:**

```typescript
const presetExecution = async (params, props) => {
  const { fetcher } = props;

  // Analyze audio via server API
  const { analysis, durationInSeconds, summary } = await fetcher(
    '/api/analyze-audio',
    {
      audioSrc: audio.src,
    },
  );

  // Use analysis data to create beat-synced clips
  // ...
};
```

**Use for**: API calls, audio/video analysis, database queries, external services

### Decision Guide

| Scenario                             | Solution                 |
| ------------------------------------ | ------------------------ |
| Reusable utility (color, time, math) | `preset-stdlib`          |
| Complex reusable logic               | Separate preset          |
| Preset-specific logic                | Inside `presetExecution` |
| Server/API operations                | Use `fetcher` from props |

## 4. Design Approach: Reverse Design

### Bottom-Up Design (Like React)

**Principle**: Create lower-level presets first, then compose them into higher-level presets.

```
Lower-level presets (atoms, simple effects)
    ↓
Mid-level presets (combinations)
    ↓
Higher-level presets (complex compositions)
```

### When to Use Single vs Multi-Preset

**Simple requirements** → Single preset function:

```typescript
// Everything in one preset
const presetExecution = (params, props) => {
  // Create atoms, layouts, effects all here
  return { output: { childrenData: [...] } };
};
```

**Complex requirements** → Multiple sub-presets:

```typescript
// Break into sub-presets
// 1. text-base.ts (handles text rendering)
// 2. effect-fade.ts (handles fade effects)
// 3. main-preset.ts (composes sub-presets)
```

## 5. Timing: Critical Understanding

### Timing in Nested Structures

**Timings are relative to parent**, not absolute video timeline.

```typescript
// Parent: starts at 10s, lasts 5s
{
  context: {
    timing: { start: 10, duration: 5 },
  },
  childrenData: [
    // Child: starts at 2s RELATIVE TO PARENT (12s in video)
    {
      context: {
        timing: { start: 2, duration: 3 }, // Relative to parent
      },
    },
  ],
}
```

**Always think relative** when setting child timings.

## 6. Component Types

### Type: `'layout'`

**Behavior**: Children render based on individual node timings.

```typescript
{
  type: 'layout',
  componentId: 'BaseLayout',
  childrenData: [
    { context: { timing: { start: 0, duration: 5 } } },  // Renders at 0s
    { context: { timing: { start: 5, duration: 5 } } },  // Renders at 5s
  ],
}
```

**Use for**: Most cases - overlays, text, effects, any composition.

### Type: `'scene'`

**Behavior**: Children attach sequentially (one after another).

```typescript
{
  type: 'scene',
  childrenData: [
    { duration: 5 },   // Plays 0-5s
    { duration: 3 },   // Plays 5-8s (sequential)
    { duration: 2 },   // Plays 8-10s (sequential)
  ],
}
```

**⚠️ Avoid using `'scene'` type**

**Only use when:**

- Stitching clips with unknown durations
- Sequential playback is required
- Duration calculation is complex

**In all other cases, use `'layout'` type.**

### Type: `'atom'`

**Base-level components** - The building blocks.

Available atoms:

- `TextAtom` - Text rendering with fonts, styles, gradients
- `VideoAtom` - Video playback with trimming, playback rate
- `ImageAtom` - Image display
- `AudioAtom` - Audio playback
- `ShapeAtom` - Geometric shapes
- `LottieAtom` - Lottie animations

**Custom components** (also atoms):

- Waveform components (based on audio data)
- Other custom-built atoms

**Refer to existing atoms:**

- `packages/remotion/src/components/atoms/` - All atom implementations
- Check atom data interfaces for available properties

```typescript
{
  type: 'atom',
  componentId: 'TextAtom',
  data: {
    text: 'Hello',
    style: { fontSize: '48px', color: '#fff' },
    font: { family: 'Inter' },
  },
}
```

## 7. Preset Structure

### Basic Preset Template

```typescript
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';

// 1. Define input parameters
const presetParams = z.object({
  text: z.string().describe('Text to display'),
  duration: z.number().default(5).describe('Duration in seconds'),
});

// 2. Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: any,
): PresetOutput => {
  // Create composition structure
  return {
    output: {
      childrenData: [
        {
          id: 'text-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex items-center justify-center',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
          childrenData: [
            {
              id: 'text',
              type: 'atom',
              componentId: 'TextAtom',
              data: {
                text: params.text,
                style: { fontSize: '48px' },
              },
              context: {
                timing: {
                  start: 0,
                  duration: params.duration,
                },
              },
            },
          ],
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// 3. Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'myPreset',
  title: 'My Preset',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'simple'],
  defaultInputParams: {
    text: 'Hello World',
    duration: 5,
  },
};

// 4. Export preset
export const myPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
```

## 8. Best Practices

1. **⚠️ Helper functions** - ONLY define in: `preset-stdlib`, separate preset, or inside `presetExecution`
2. **Server operations** - Use `fetcher` from props for API calls and server-side processing
3. **Start simple** - Create basic version first, then add complexity
4. **Use `'layout'` type** - Avoid `'scene'` unless absolutely necessary
5. **Think relative** - All timings are relative to parent
6. **Check existing atoms** - Don't recreate what already exists
7. **Break into sub-presets** - When complexity grows, split into smaller presets
8. **Document thoroughly** - Explain what preset does, parameters, usage
9. **Test timing carefully** - Timing bugs are common, test nested structures

## 9. Common Patterns

### Pattern: Simple Single Preset

```typescript
// All logic in one function
const presetExecution = (params, props) => {
  // Create atoms
  // Create layouts
  // Apply effects
  return { output: { childrenData: [...] } };
};
```

### Pattern: Sub-preset Composition

```typescript
// Main preset composes sub-presets
const presetExecution = async (params, props) => {
  const { presets } = props;

  // Call sub-presets
  const textResult = await presets.textBase(params.textParams, props);
  const effectResult = await presets.fadeEffect(params.effectParams, props);

  // Compose results
  return {
    output: {
      childrenData: [
        ...textResult.output.childrenData,
        ...effectResult.output.childrenData,
      ],
    },
  };
};
```

### Pattern: Conditional Logic

```typescript
// Based on params, choose different paths
const presetExecution = (params, props) => {
  if (params.style === 'fade') {
    // Create fade animation
  } else if (params.style === 'slide') {
    // Create slide animation
  }
};
```
