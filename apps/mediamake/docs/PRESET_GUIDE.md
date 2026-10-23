# MediaMake Preset System - Complete Guide

A comprehensive guide to understanding and creating presets in MediaMake.

> **📚 See Also**: [Advanced Preset Creation Guide](./ADVANCED_PRESET_GUIDE.md) - Learn how to create sophisticated presets with special effects, conditional positioning, layered components, and custom animations without writing custom components.

## Table of Contents

1. [Overview](#overview)
2. [How to Create New Presets](#how-to-create-new-presets)
3. [How Preset Inputs Work](#how-preset-inputs-work)
4. [How Multiple Presets Combine](#how-multiple-presets-combine)
5. [Advanced Topics](#advanced-topics)
6. [Component & Property Reference](#component--property-reference)
7. [Examples](#examples)

---

## Overview

The MediaMake preset system allows you to create reusable composition templates with customizable parameters. Think of presets as building blocks that can be combined to create complex video compositions.

### Key Capabilities

- ✅ **Dynamic Inputs** - Each preset defines its own customizable parameters
- ✅ **Auto-generated Forms** - UI is automatically created from your parameter schema
- ✅ **Composable** - Combine multiple presets to build complex videos
- ✅ **API Calls** - Fetch external data (e.g., audio analysis, AI processing, database queries)
- ✅ **Type-Safe** - Full TypeScript support with Zod schemas
- ✅ **Reusable** - Save and share preset configurations

### Preset Types

There are **two types of presets**:

1. **Predefined Presets** - Built-in presets defined in code (what you'll create)
2. **Database Presets** - User-created presets stored in MongoDB

---

## How to Create New Presets

### Step-by-Step Guide

#### 1. Create a New Preset File

Create a new file in `apps/mediamake/components/editor/presets/registry/` (e.g., `my-custom-preset.ts`):

```typescript
import { InputCompositionProps, TextAtomData } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../types';

// Step 1: Define your parameter schema using Zod
const presetParams = z.object({
  // Your customizable parameters
  text: z.string().describe('Main text to display'),
  fontSize: z.number().optional().describe('Font size in pixels'),
  color: z.string().optional().describe('Text color'),
  backgroundColor: z.string(),
  // Add more parameters as needed
});

// Step 2: Create the preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
): PresetOutput => {
  // Your composition logic here
  return {
    output: {
      childrenData: [
        {
          id: 'MyScene',
          componentId: 'BaseLayout',
          type: 'layout',
          data: {
            containerProps: {
              className: 'flex items-center justify-center',
              style: {
                backgroundColor: params.backgroundColor,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: 20,
            },
          },
          childrenData: [
            {
              id: 'MyText',
              componentId: 'TextAtom',
              type: 'atom',
              data: {
                text: params.text,
                style: {
                  fontSize: params.fontSize ?? 48,
                  color: params.color ?? '#FFFFFF',
                },
                font: {
                  family: 'Inter',
                },
              } as TextAtomData,
            },
          ],
        },
      ],
      config: {
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 20,
      },
    },
  };
};

// Step 3: Define preset metadata
const presetMetadata: PresetMetadata = {
  id: 'my-custom-preset',
  title: 'My Custom Preset',
  description: 'A custom preset with text and background',
  type: 'predefined',
  presetType: 'full', // 'full' | 'children' | 'data' | 'context' | 'effects'
  tags: ['custom', 'text'],
  defaultInputParams: {
    text: 'Hello World',
    fontSize: 48,
    color: '#FFFFFF',
    backgroundColor: '#000000',
  },
};

// Step 4: Create the preset object
const presetFunction = presetExecution.toString();
const presetParamsSchema = z.toJSONSchema(presetParams);

const myCustomPreset = {
  metadata: presetMetadata,
  presetFunction: presetFunction,
  presetParams: presetParamsSchema,
};

// Step 5: Export the preset
export { myCustomPreset };
```

#### 2. Register Your Preset

Add your preset to the registry at `apps/mediamake/components/editor/presets/registry/presets-registry.ts`:

```typescript
import { myCustomPreset } from './my-custom-preset';

export const predefinedPresets: Preset[] = [
  baseScenePreset,
  mediaTrackPreset,
  // ... other presets
  myCustomPreset, // Add your preset here
];
```

### Preset Types Explained

The `presetType` determines how the preset is applied:

1. **`'full'`** - Replaces the entire composition
   - Use for complete scenes/compositions
   - Example: `waveform-full.tsx`, `base-scene.ts`

2. **`'children'`** - Inserts into a specific component's children
   - Use for adding elements to existing compositions
   - Example: `text-overlay.ts` (deprecated; kept so saved overlays render)

3. **`'data'`** - Updates specific component's data
4. **`'context'`** - Updates specific component's context
5. **`'effects'`** - Updates specific component's effects

### Available Components

The preset system supports various Remotion components:

- **`BaseLayout`** - Container/layout component
- **`TextAtom`** - Text rendering
- **`AudioAtom`** - Audio playback
- **`ImageAtom`** - Image display
- **`VideoAtom`** - Video playback
- **`WaveformHistogram`** - Audio visualization
- **Effects**: `pan`, `zoom`, `generic`, `shake`

### Best Practices

1. **Pure Functions**: Preset functions must be pure (no side effects)
2. **No External Dependencies**: Don't use closures or external variables
3. **Serializable**: Must be convertible to string (`.toString()`)
4. **Descriptive Parameters**: Use Zod `.describe()` for parameter documentation
5. **Default Values**: Always provide `defaultInputParams` in metadata
6. **Unique IDs**: Use unique IDs for all components

### Simple Example

Here's a complete minimal example:

```typescript
import { TextAtomData } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../types';

const presetParams = z.object({
  message: z.string(),
  color: z.string(),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
): PresetOutput => {
  return {
    output: {
      childrenData: [
        {
          id: 'SimpleTextScene',
          componentId: 'BaseLayout',
          type: 'layout',
          data: {
            containerProps: {
              className:
                'flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500',
            },
          },
          context: {
            timing: { start: 0, duration: 10 },
          },
          childrenData: [
            {
              id: 'Text',
              componentId: 'TextAtom',
              type: 'atom',
              data: {
                text: params.message,
                style: { fontSize: 64, color: params.color },
                font: { family: 'Inter' },
              } as TextAtomData,
            },
          ],
        },
      ],
      config: { width: 1920, height: 1080, fps: 30, duration: 10 },
    },
  };
};

const simpleTextPreset = {
  metadata: {
    id: 'simple-text',
    title: 'Simple Text',
    description: 'A simple text scene',
    type: 'predefined' as const,
    presetType: 'full' as const,
    tags: ['text', 'simple'],
    defaultInputParams: { message: 'Hello!', color: '#FFFFFF' },
  },
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};

export { simpleTextPreset };
```

---

## How Preset Inputs Work

Each preset takes different inputs based on what **you define** in the preset's parameter schema. The system automatically generates a user interface for these inputs.

### The Input Flow

#### 1. Define the Input Schema (using Zod)

When creating a preset, you define what inputs it needs using Zod:

```typescript
const presetParams = z.object({
  text: z.string(),
  fontSize: z.number().optional(),
  color: z.string(),
  audio: z.object({
    src: z.string(),
    volume: z.number().optional(),
  }),
});
```

#### 2. Schema Gets Converted to JSON Schema

The Zod schema is automatically converted to JSON Schema:

```typescript
const presetParamsSchema = z.toJSONSchema(presetParams);
// This creates a JSON Schema that describes the structure
```

#### 3. Dynamic Form is Generated

The `SchemaForm` component reads the JSON Schema and **automatically generates a form** with appropriate input fields:

- **String fields** → Text inputs
- **Number fields** → Number inputs
- **Boolean fields** → Dropdowns (True/False)
- **Enum fields** → Dropdown selects
- **Object fields** → Collapsible nested forms
- **Array fields** → Add/remove item managers
- **URL/src fields** → Text input + Media Picker button
- **Font fields** → Font dropdown with search

#### 4. User Fills In the Form

The user can input values in two ways:

- **Form mode** - Nice UI with fields, dropdowns, buttons
- **JSON mode** - Direct JSON editing

#### 5. Input Data is Passed to Your Preset Function

When the user clicks "Generate", the input data is passed to your preset execution function:

```typescript
const presetExecution = (
  params: z.infer<typeof presetParams>,
): PresetOutput => {
  // params contains all the user's input values
  // For example:
  // params.text = "Hello World"
  // params.fontSize = 48
  // params.color = "#FFFFFF"
  // params.audio.src = "https://..."
  // params.audio.volume = 1.5

  return {
    output: {
      childrenData: [
        // Use the params to build your composition
        {
          id: 'Text',
          componentId: 'TextAtom',
          type: 'atom',
          data: {
            text: params.text, // ← User's input
            style: {
              fontSize: params.fontSize ?? 48, // ← User's input with fallback
              color: params.color, // ← User's input
            },
          },
        },
      ],
    },
  };
};
```

### Different Presets, Different Inputs

#### Example 1: Simple Text Preset

```typescript
// Input Schema
const params = z.object({
  message: z.string(),
  color: z.string(),
});

// Generated Form will have:
// - Text input for "message"
// - Text input for "color"
```

#### Example 2: Audio Waveform Preset

```typescript
// Input Schema
const params = z.object({
  audio: z.object({
    src: z.string(),
    volume: z.number().optional(),
  }),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  waveformType: z.enum(['fixed', 'waves']),
});

// Generated Form will have:
// - Collapsible "audio" section with:
//   - Text input + Media Picker for "src"
//   - Number input for "volume"
// - Text input for "primaryColor"
// - Text input for "secondaryColor"
// - Dropdown for "waveformType" (fixed or waves)
```

#### Example 3: Video Overlay Preset

```typescript
// Input Schema
const params = z.object({
  videos: z.array(z.string()),
  transition: z.enum(['fade', 'slide', 'zoom']),
  duration: z.number(),
});

// Generated Form will have:
// - Collapsible "videos" array manager with:
//   - Add/Remove buttons
//   - Text input + Media Picker for each video
// - Dropdown for "transition"
// - Number input for "duration"
```

### Key Points

1. **Each preset is independent** - They define their own inputs via Zod schema
2. **Form is auto-generated** - You don't write UI code, just the schema
3. **Type-safe** - TypeScript knows the exact structure via `z.infer<typeof presetParams>`
4. **User-friendly** - The form system handles complex types (objects, arrays, enums)
5. **Flexible input** - Users can use Form UI or edit raw JSON

---

## How Multiple Presets Combine

Think of it like **building layers in Photoshop** or **composing tracks in a DAW** - you start with a base and add/modify layers on top.

### The Generation Flow

#### 1. Start with a Base Composition

```typescript
let baseComposition = {
  childrenData: [], // Empty canvas
  config: {
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 20,
  },
  style: {},
};
```

#### 2. Apply Presets in Sequence

The system loops through your presets **in order** and applies each one:

```typescript
for (const appliedPreset of appliedPresets.presets) {
  // 1. Run the preset function with user inputs
  const presetOutput = await runPreset(
    appliedPreset.inputData, // User's custom inputs
    appliedPreset.preset.presetFunction,
    { config, style, clip, fetcher },
  );

  // 2. Insert/merge the preset output into the base composition
  baseComposition = insertPresetToComposition(baseComposition, {
    presetOutput: presetOutput,
    presetType: appliedPreset.preset.metadata.presetType, // 'full' | 'children' | etc
  });
}
```

### Preset Types & Combination Strategies

#### 1. `'full'` - Replace Everything (First Layer)

```typescript
// Use case: Base scene or complete composition
// Example: "Base Scene" preset

if (presetType === 'full') {
  // REPLACES the entire composition
  baseComposition.childrenData = presetOutput.childrenData;
  baseComposition.config = {
    ...baseComposition.config,
    ...presetOutput.config,
  };
  baseComposition.style = { ...baseComposition.style, ...presetOutput.style };
}
```

**Result**: Sets up the foundation (background, dimensions, duration)

#### 2. `'children'` - Add Elements (Overlays)

```typescript
// Use case: Add overlays, text, effects on top
// Example: "Text Overlay" preset

if (presetType === 'children') {
  // ADDS children to a specific component (default: 'BaseScene')
  const targetComponent = findComponent(baseComposition, 'BaseScene');
  targetComponent.childrenData = [
    ...targetComponent.childrenData, // Existing children
    ...presetOutput.childrenData, // New children from preset
  ];
}
```

**Result**: Layers new elements on top of existing composition

#### 3. `'data'` - Modify Properties

```typescript
// Use case: Update specific component properties
// Example: Change colors, sizes, positions

if (presetType === 'data') {
  // MERGES data into matching component
  const targetComponent = findComponent(baseComposition, componentId);
  targetComponent.data = {
    ...targetComponent.data, // Existing data
    ...presetOutput.data, // New data from preset
  };
}
```

#### 4. `'context'` - Modify Timing/Animation Context

```typescript
if (presetType === 'context') {
  // MERGES context (timing, animations)
  targetComponent.context = {
    ...targetComponent.context,
    ...presetOutput.context,
  };
}
```

#### 5. `'effects'` - Add Effects

```typescript
if (presetType === 'effects') {
  // ADDS effects to component
  targetComponent.effects = presetOutput.effects;
}
```

### Real-World Example: Building a Music Video

Let's say you want to create a music video. Here's how you'd combine presets:

#### Preset 1: Base Scene (`'full'`)

```typescript
// Creates the foundation
Output: {
  childrenData: [{
    id: 'BaseScene',
    componentId: 'BaseLayout',
    data: { backgroundColor: 'black' },
    childrenData: []  // Empty, ready for overlays
  }],
  config: { width: 1920, height: 1080, duration: 20 }
}
```

**After Preset 1**:

- ✅ Black background scene
- ✅ 1920x1080 dimensions
- ✅ 20 second duration

#### Preset 2: Audio Waveform (`'children'`)

```typescript
// Adds waveform as child of BaseScene
Output: {
  childrenData: [
    {
      id: 'Waveform',
      componentId: 'WaveformHistogram',
      data: { audioSrc: 'song.mp3', color: '#FF00FF' },
    },
  ];
}
```

**After Preset 2** (merged):

```typescript
{
  childrenData: [{
    id: 'BaseScene',
    childrenData: [
      { id: 'Waveform', ... }  // ← Added here!
    ]
  }]
}
```

#### Preset 3: Text Overlay (`'children'`)

```typescript
// Adds text as another child of BaseScene
Output: {
  childrenData: [
    {
      id: 'TitleText',
      componentId: 'TextAtom',
      data: { text: 'My Song', fontSize: 64 },
    },
  ];
}
```

**After Preset 3** (merged):

```typescript
{
  childrenData: [{
    id: 'BaseScene',
    childrenData: [
      { id: 'Waveform', ... },
      { id: 'TitleText', ... }  // ← Added here!
    ]
  }]
}
```

#### Preset 4: Background Image (`'children'`)

```typescript
// Adds background image
Output: {
  childrenData: [
    {
      id: 'BackgroundImage',
      componentId: 'ImageAtom',
      data: { src: 'background.jpg' },
    },
  ];
}
```

**After Preset 4** (merged):

```typescript
{
  childrenData: [{
    id: 'BaseScene',
    childrenData: [
      { id: 'Waveform', ... },
      { id: 'TitleText', ... },
      { id: 'BackgroundImage', ... }  // ← Added here!
    ]
  }]
}
```

### Visual Representation

```
Initial State:
┌─────────────────────┐
│   Empty Canvas      │
└─────────────────────┘

After Preset 1 ('full' - Base Scene):
┌─────────────────────┐
│  ┌───────────────┐  │
│  │  BaseScene    │  │
│  │  (black bg)   │  │
│  └───────────────┘  │
└─────────────────────┘

After Preset 2 ('children' - Waveform):
┌─────────────────────┐
│  ┌───────────────┐  │
│  │  BaseScene    │  │
│  │  ├─Waveform   │  │
│  └───────────────┘  │
└─────────────────────┘

After Preset 3 ('children' - Text):
┌─────────────────────┐
│  ┌───────────────┐  │
│  │  BaseScene    │  │
│  │  ├─Waveform   │  │
│  │  ├─TitleText  │  │
│  └───────────────┘  │
└─────────────────────┘

After Preset 4 ('children' - Image):
┌─────────────────────┐
│  ┌───────────────┐  │
│  │  BaseScene    │  │
│  │  ├─Background │  │
│  │  ├─Waveform   │  │
│  │  ├─TitleText  │  │
│  └───────────────┘  │
└─────────────────────┘

Final Video! 🎬
```

### Key Insights

1. **Order Matters**: Presets are applied sequentially, so order affects the final result

2. **First Preset Should Be 'full'**: Usually starts with a base scene that sets up dimensions and background

3. **Subsequent Presets Add Layers**: Use `'children'` type to add elements on top

4. **Each Preset is Independent**: They don't know about each other, but they combine through the merge logic

5. **The System Handles Merging**: You just define what each preset outputs, the system combines them automatically

6. **You Can Reorder**: The UI lets you reorder presets to change how they combine

7. **You Can Disable**: Toggle presets on/off to see their individual effects

### Think of It Like...

- **Video Editing**: Each preset is a track/layer that combines into the final timeline
- **Photoshop**: Each preset is a layer that stacks on top of others
- **Cooking**: Each preset is an ingredient/step that builds the final dish
- **LEGO**: Each preset is a piece that snaps onto the existing structure

---

## Advanced Topics

### Custom Attachment Points

For `'children'` type presets, you can specify where to attach the children:

```typescript
return {
  output: {
    childrenData: [
      /* your children */
    ],
  },
  options: {
    attachedToId: 'CustomComponentId', // Attach to specific component
  },
};
```

### Configuration Overwrites

For `'full'` type presets, you can define configuration overwrites in metadata:

```typescript
const presetMetadata: PresetMetadata = {
  // ... other metadata
  presetType: 'full',
  configOverWrites: {
    duration: 10,
    fps: 60,
  },
  styleOverWrites: {
    backgroundColor: '#000000',
    width: 1920,
    height: 1080,
  },
};
```

### Using Props in Preset Functions

Preset functions receive a second `props` parameter with useful data:

```typescript
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Available props:
  // - props.config: Current composition config
  // - props.style: Current composition style
  // - props.clip: Clip information
  // - props.fetcher: Function to fetch external data

  return {
    /* ... */
  };
};
```

### Accessing External Data (API Calls)

**YES, you CAN call APIs from presets!** Use the `fetcher` prop to make API calls.

The `fetcher` is automatically provided by the system and supports POST requests with JSON data.

#### Basic Example

```typescript
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  // Fetch external data from your API
  const data = await props.fetcher('/api/some-endpoint', {
    param: 'value',
    otherData: params.someInput,
  });

  return {
    output: {
      // Use fetched data in composition
      childrenData: [
        {
          id: 'DataDrivenComponent',
          componentId: 'TextAtom',
          type: 'atom',
          data: {
            text: data.result, // Use API response
          },
        },
      ],
    },
  };
};
```

#### Real-World Example: Audio Analysis

Here's a real example from the `beatstitch.ts` preset that analyzes audio:

```typescript
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: {
    config: InputCompositionProps['config'];
    fetcher: (url: string, data: any) => Promise<any>;
  },
): Promise<PresetOutput> => {
  const { audio, clips } = params;
  const { fetcher } = props;

  // Call the audio analysis API
  const { analysis, durationInSeconds, summary } = await fetcher(
    '/api/analyze-audio',
    {
      audioSrc: audio.src,
    },
  );

  // Handle API errors
  if (!analysis || analysis.length === 0) {
    return {
      output: {
        childrenData: [],
      },
    };
  }

  // Use the analysis data to create beat-synced video
  const beatTimings = analysis.map(beat => beat.timestamp);
  const children = clips.map((clip, index) => ({
    id: `clip-${index}`,
    componentId: 'VideoAtom',
    type: 'atom' as const,
    data: { src: clip.src },
    context: {
      timing: {
        start: beatTimings[index],
        duration: beatTimings[index + 1] - beatTimings[index],
      },
    },
  }));

  return {
    output: {
      childrenData: [
        {
          id: 'BeatStitchedVideo',
          componentId: 'BaseLayout',
          type: 'layout',
          childrenData: children,
        },
      ],
      config: {
        duration: durationInSeconds,
      },
    },
  };
};
```

#### Important Notes

1. **Always use `async` functions** when making API calls
2. **Return type must be `Promise<PresetOutput>`** instead of just `PresetOutput`
3. **Handle errors gracefully** - return empty output or default data if API fails
4. **The fetcher is cached** - Multiple calls to the same endpoint with same data won't re-fetch
5. **POST requests only** - The fetcher uses POST with JSON body

---

## Component & Property Reference

This section provides a complete reference of all properties you can manipulate in presets.

### Component Structure

Every component in your preset has this structure:

```typescript
{
  id: string,              // Unique identifier
  componentId: string,     // Component type ('TextAtom', 'ImageAtom', etc.)
  type: ComponentType,     // 'atom' | 'layout' | 'frame' | 'scene' | 'transition'
  data?: RenderableData,   // Component-specific data (see below)
  context?: {              // Positioning, timing, hierarchy
    boundaries?: {...},
    timing?: {...},
    overrideStyle?: CSSProperties
  },
  childrenData?: [...],    // Nested child components
  effects?: [...]          // Visual effects/animations
}
```

### Context Properties

#### `context.timing` - Control WHEN components appear

```typescript
timing: {
  start?: number,              // Start time in seconds
  duration?: number,           // Duration in seconds
  startInFrames?: number,      // Alternative: start in frames
  durationInFrames?: number,   // Alternative: duration in frames
  fitDurationTo?: string | string[]  // Match duration to another component by ID
}
```

**Example:**

```typescript
context: {
  timing: {
    start: 5,        // Appears at 5 seconds
    duration: 10,    // Lasts 10 seconds
  }
}
```

**Example with fitDurationTo:**

```typescript
context: {
  timing: {
    start: 0,
    fitDurationTo: 'AudioTrack',  // Duration matches the AudioTrack component
  }
}
```

#### `context.boundaries` - Control WHERE and SIZE

```typescript
boundaries: {
  left?: number | string,    // X position (px or '%')
  top?: number | string,     // Y position (px or '%')
  right?: number | string,
  bottom?: number | string,
  width?: number | string,   // Width (px or '%')
  height?: number | string,  // Height (px or '%')
  zIndex?: number,          // Layering order (higher = on top)
  reset?: boolean           // Reset to default boundaries
}
```

**Example:**

```typescript
context: {
  boundaries: {
    left: 100,      // 100px from left
    top: '20%',     // 20% from top
    width: '50%',   // Half screen width
    height: 300,    // 300px tall
    zIndex: 10      // On top of other elements
  }
}
```

#### `context.overrideStyle` - Direct CSS styling

```typescript
overrideStyle: {
  backgroundColor: '#FF0000',
  transform: 'rotate(45deg)',
  opacity: 0.5,
  // ... any valid CSS properties
}
```

### Data Properties by Component Type

#### TextAtom - Text Rendering

```typescript
data: {
  text: string,                 // The text content (REQUIRED)
  style?: React.CSSProperties,  // Text styling
  className?: string,           // Tailwind/CSS classes
  font?: {
    family: string,             // Font family name (e.g., 'Inter', 'Montserrat')
    weights?: string[],         // Font weights (e.g., ['400', '700'])
    subsets?: string[],         // Font subsets (e.g., ['latin', 'cyrillic'])
    display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional',
    preload?: boolean           // Preload font for performance
  },
  fallbackFonts?: string[],     // Fallback fonts if main font fails
  loadingState?: {
    showLoadingIndicator?: boolean,
    loadingText?: string,
    loadingStyle?: React.CSSProperties
  },
  errorState?: {
    showErrorIndicator?: boolean,
    errorText?: string,
    errorStyle?: React.CSSProperties
  }
}
```

**Example:**

```typescript
{
  id: 'Title',
  componentId: 'TextAtom',
  type: 'atom',
  data: {
    text: 'Hello World',
    className: 'text-6xl font-bold',
    font: {
      family: 'Montserrat',
      weights: ['700'],
      display: 'swap'
    },
    style: {
      color: '#FFFFFF',
      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
      fontSize: 64
    }
  }
}
```

#### ImageAtom - Image Display

```typescript
data: {
  src: string,                  // Image URL (REQUIRED)
  style?: React.CSSProperties,  // Image styling
  className?: string,           // Tailwind/CSS classes
  proxySrc?: string            // Custom CORS proxy endpoint
}
```

**Example:**

```typescript
{
  id: 'Logo',
  componentId: 'ImageAtom',
  type: 'atom',
  data: {
    src: 'https://example.com/logo.png',
    className: 'w-32 h-32 object-contain rounded-full',
    style: {
      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
    }
  }
}
```

#### VideoAtom - Video Playback

```typescript
data: {
  src: string,                  // Video URL (REQUIRED)
  srcDuration?: number,         // Video duration in seconds
  style?: React.CSSProperties,  // Video styling
  containerClassName?: string,  // Container CSS classes
  className?: string,           // Video element CSS classes
  startFrom?: number,           // Start playback from this time (seconds)
  endAt?: number,               // End playback at this time (seconds)
  playbackRate?: number,        // Speed multiplier (0.5 = half, 2 = double)
  volume?: number,              // Volume level (0-1)
  muted?: boolean,              // Mute video audio
  loop?: boolean,               // Loop the video
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'  // Object fit
}
```

**Example:**

```typescript
{
  id: 'BackgroundVideo',
  componentId: 'VideoAtom',
  type: 'atom',
  data: {
    src: 'https://example.com/video.mp4',
    volume: 0.3,
    playbackRate: 0.8,
    fit: 'cover',
    loop: true,
    startFrom: 5,    // Start from 5 seconds
    endAt: 30        // End at 30 seconds
  }
}
```

#### AudioAtom - Audio Playback

```typescript
data: {
  src: string,                  // Audio URL (REQUIRED)
  startFrom?: number,           // Start playback from (seconds)
  endAt?: number,               // End playback at (seconds)
  volume?: number,              // Volume (0-1)
  playbackRate?: number,        // Speed multiplier
  muted?: {                     // Mute configuration
    type: 'full',
    value: boolean
  } | {
    type: 'range',
    values: [{ start: number, end: number }]
  }
}
```

**Example:**

```typescript
{
  id: 'BackgroundMusic',
  componentId: 'AudioAtom',
  type: 'atom',
  data: {
    src: 'https://example.com/audio.mp3',
    volume: 0.5,
    startFrom: 10,
    endAt: 60,
    muted: {
      type: 'range',
      values: [
        { start: 20, end: 25 },  // Mute from 20-25 seconds
        { start: 40, end: 45 }   // Mute from 40-45 seconds
      ]
    }
  }
}
```

#### BaseLayout - Container/Layout

```typescript
data: {
  containerProps?: {
    className?: string,         // Tailwind/CSS classes
    style?: React.CSSProperties // Direct styling
  }
}
```

**Example:**

```typescript
{
  id: 'MainContainer',
  componentId: 'BaseLayout',
  type: 'layout',
  data: {
    containerProps: {
      className: 'flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600',
      style: {
        padding: '20px'
      }
    }
  },
  childrenData: [/* child components */]
}
```

### Effects Reference

Effects are animations and visual modifications applied to components.

#### Generic Effect - Universal Animation System

The most powerful effect - can animate any CSS property with keyframes.

```typescript
{
  id: string,
  componentId: 'generic',
  data: {
    start?: number,             // When to start (seconds)
    duration?: number,          // How long (seconds)
    type?: 'spring' | 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out',
    mode?: 'wrapper' | 'provider',
    targetIds?: string[],       // IDs to apply effect to (provider mode)
    ranges?: [                  // Keyframe animations
      {
        key: string,      // CSS property to animate
        val: any,         // Value at this keyframe
        prog: number      // Progress point (0-1)
      }
    ]
  }
}
```

**Example - Fade In:**

```typescript
effects: [
  {
    id: 'fade-in',
    componentId: 'generic',
    data: {
      start: 0,
      duration: 2,
      type: 'ease-in-out',
      ranges: [
        { key: 'opacity', val: 0, prog: 0 }, // At 0%: opacity 0
        { key: 'opacity', val: 1, prog: 1 }, // At 100%: opacity 1
      ],
    },
  },
];
```

**Example - Complex Animation:**

```typescript
effects: [
  {
    id: 'entrance',
    componentId: 'generic',
    data: {
      start: 0,
      duration: 3,
      type: 'ease-out',
      ranges: [
        // Slide from bottom
        { key: 'translateY', val: '100px', prog: 0 },
        { key: 'translateY', val: '0px', prog: 1 },
        // Fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.5 },
        // Scale up
        { key: 'scale', val: 0.8, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
        // Rotate
        { key: 'rotate', val: '-10deg', prog: 0 },
        { key: 'rotate', val: '0deg', prog: 1 },
      ],
    },
  },
];
```

#### Other Built-in Effects

```typescript
// Pan Effect - Move camera view
{
  id: 'pan-effect',
  componentId: 'pan',
  data: {
    direction: 'left' | 'right' | 'up' | 'down',
    speed?: number
  }
}

// Zoom Effect - Scale in/out
{
  id: 'zoom-effect',
  componentId: 'zoom',
  data: {
    scale: number,      // Target scale (1.5 = 150%)
    duration?: number
  }
}

// Shake Effect - Shake animation
{
  id: 'shake-effect',
  componentId: 'shake',
  data: {
    intensity: number,  // Shake intensity
    duration?: number
  }
}

// Blur Effect - Blur filter
{
  id: 'blur-effect',
  componentId: 'blur',
  data: {
    amount: number,     // Blur amount in pixels
    duration?: number
  }
}

// Loop Effect - Loop animation
{
  id: 'loop-effect',
  componentId: 'loop',
  data: {
    iterations: number  // Number of loops
  }
}

// Stretch Effect - Stretch along axis
{
  id: 'stretch-effect',
  componentId: 'stretch',
  data: {
    axis: 'x' | 'y',
    amount: number
  }
}
```

### Animatable CSS Properties

You can animate any of these CSS properties using the `generic` effect:

#### Transform Properties

- `translateX`, `translateY`, `translateZ`
- `rotate`, `rotateX`, `rotateY`, `rotateZ`
- `scale`, `scaleX`, `scaleY`
- `skewX`, `skewY`

#### Opacity & Visibility

- `opacity`
- `visibility`

#### Size & Spacing

- `width`, `height`
- `padding`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`
- `margin`, `marginTop`, `marginRight`, `marginBottom`, `marginLeft`

#### Colors

- `backgroundColor`
- `color`
- `borderColor`

#### Typography

- `fontSize`
- `letterSpacing`
- `lineHeight`
- `wordSpacing`

#### Visual Effects

- `blur`, `brightness`, `contrast`, `saturate`
- `boxShadow`
- `textShadow`
- `borderRadius`
- `borderWidth`

**Example - Multi-property Animation:**

```typescript
effects: [
  {
    id: 'text-reveal',
    componentId: 'generic',
    data: {
      start: 0,
      duration: 2,
      type: 'ease-in-out',
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        { key: 'letterSpacing', val: '10px', prog: 0 },
        { key: 'letterSpacing', val: '0px', prog: 1 },
        { key: 'textShadow', val: '0px 0px 0px rgba(0,0,0,0)', prog: 0 },
        { key: 'textShadow', val: '2px 2px 4px rgba(0,0,0,0.5)', prog: 1 },
        { key: 'fontSize', val: '32px', prog: 0 },
        { key: 'fontSize', val: '64px', prog: 1 },
      ],
    },
  },
];
```

### Composition Config

Video-level configuration:

```typescript
config: {
  width: number,              // Video width in pixels (e.g., 1920)
  height: number,             // Video height in pixels (e.g., 1080)
  fps: number,                // Frames per second (e.g., 30, 60)
  duration: number,           // Total duration in seconds
  fitDurationTo?: string      // Match duration to component ID
}
```

**Common Presets:**

- **1080p (16:9)**: `width: 1920, height: 1080`
- **720p (16:9)**: `width: 1280, height: 720`
- **4K (16:9)**: `width: 3840, height: 2160`
- **Square (1:1)**: `width: 1080, height: 1080`
- **Vertical (9:16)**: `width: 1080, height: 1920`

### Complete Example Using All Properties

```typescript
const presetExecution = (params): PresetOutput => {
  return {
    output: {
      childrenData: [
        {
          id: 'MainScene',
          componentId: 'BaseLayout',
          type: 'layout',
          data: {
            containerProps: {
              className: 'flex items-center justify-center',
              style: { backgroundColor: '#000' },
            },
          },
          context: {
            timing: { start: 0, duration: 20 },
            boundaries: { width: '100%', height: '100%' },
          },
          childrenData: [
            // Background video
            {
              id: 'BgVideo',
              componentId: 'VideoAtom',
              type: 'atom',
              data: {
                src: params.videoUrl,
                volume: 0.5,
                playbackRate: 0.8,
                fit: 'cover',
                loop: true,
              },
              context: {
                timing: { start: 0, duration: 20 },
                boundaries: { zIndex: 1 },
              },
            },
            // Animated text
            {
              id: 'Title',
              componentId: 'TextAtom',
              type: 'atom',
              data: {
                text: params.title,
                className: 'text-6xl font-bold',
                font: {
                  family: 'Montserrat',
                  weights: ['700'],
                },
                style: {
                  color: '#fff',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                },
              },
              context: {
                timing: { start: 2, duration: 5 },
                boundaries: { zIndex: 10 },
              },
              effects: [
                {
                  id: 'title-entrance',
                  componentId: 'generic',
                  data: {
                    start: 0,
                    duration: 1.5,
                    type: 'ease-out',
                    ranges: [
                      { key: 'translateY', val: '-100px', prog: 0 },
                      { key: 'translateY', val: '0px', prog: 1 },
                      { key: 'opacity', val: 0, prog: 0 },
                      { key: 'opacity', val: 1, prog: 1 },
                    ],
                  },
                },
              ],
            },
            // Logo image
            {
              id: 'Logo',
              componentId: 'ImageAtom',
              type: 'atom',
              data: {
                src: params.logoUrl,
                className: 'w-32 h-32 object-contain',
              },
              context: {
                timing: { start: 1, duration: 18 },
                boundaries: {
                  top: 50,
                  left: 50,
                  zIndex: 20,
                },
              },
              effects: [
                {
                  id: 'logo-pulse',
                  componentId: 'generic',
                  data: {
                    start: 0,
                    duration: 2,
                    type: 'ease-in-out',
                    ranges: [
                      { key: 'scale', val: 1, prog: 0 },
                      { key: 'scale', val: 1.1, prog: 0.5 },
                      { key: 'scale', val: 1, prog: 1 },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
      config: {
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 20,
      },
    },
  };
};
```

---

## Examples

### Example Presets to Study

Check these existing presets for reference:

1. **Simple**: `base-scene.ts` - Basic scene with background
2. **Complex**: `waveform-full.tsx` - Full audio visualization
3. **Overlay**: `text-overlay.ts` - Text overlay with animations (deprecated; new text uses `atom:TextAtom`)
4. **Media**: `media-track.ts` - Video and audio track

All examples are in: `apps/mediamake/components/editor/presets/registry/`

### Testing Your Preset

1. Add your preset to the registry
2. Navigate to `/presets` page in the app
3. Select your preset from the sidebar
4. Customize parameters in the form
5. Click "Generate" to see the preview
6. Use the "Preview" tab to see it rendered

### Common Patterns

#### Pattern 1: Audio Transcription with API Call

**Perfect example: Take audio input, call transcription API, generate subtitles**

```typescript
import { AudioAtomDataProps, TextAtomData } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../types';

// Define input parameters
const presetParams = z.object({
  audio: z.object({
    src: z.string().describe('Audio file URL'),
    volume: z.number().optional().describe('Volume (0-1)'),
  }),
  fontSize: z.number().optional().describe('Caption font size'),
  textColor: z.string().optional().describe('Caption text color'),
  backgroundColor: z.string().optional().describe('Background color'),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  // Call transcription API with audio URL
  const transcriptionData = await props.fetcher('/api/transcribe/assembly', {
    audioUrl: params.audio.src,
    language: 'en',
  });

  // Handle API errors
  if (!transcriptionData || !transcriptionData.captions) {
    return {
      output: {
        childrenData: [
          {
            id: 'ErrorMessage',
            componentId: 'TextAtom',
            type: 'atom',
            data: {
              text: 'Transcription failed or no captions available',
              style: { color: 'red', fontSize: 24 },
            },
          },
        ],
      },
    };
  }

  // Create caption components from transcription data
  const captionComponents = transcriptionData.captions.map(
    (caption: any, index: number) => ({
      id: `caption-${index}`,
      componentId: 'TextAtom',
      type: 'atom' as const,
      data: {
        text: caption.text,
        className: 'px-4 py-2 rounded-lg',
        style: {
          fontSize: params.fontSize ?? 32,
          color: params.textColor ?? '#FFFFFF',
          backgroundColor: params.backgroundColor ?? 'rgba(0, 0, 0, 0.7)',
          textAlign: 'center',
        },
        font: {
          family: 'Inter',
          weights: ['700'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: caption.start,
          duration: caption.end - caption.start,
        },
      },
    }),
  );

  return {
    output: {
      childrenData: [
        {
          id: 'TranscriptionScene',
          componentId: 'BaseLayout',
          type: 'layout',
          data: {
            containerProps: {
              className: 'flex items-end justify-center pb-20',
            },
          },
          context: {
            timing: {
              start: 0,
              fitDurationTo: 'AudioTrack',
            },
          },
          childrenData: [
            // Audio track
            {
              id: 'AudioTrack',
              componentId: 'AudioAtom',
              type: 'atom',
              data: {
                src: params.audio.src,
                volume: params.audio.volume ?? 1,
              } as AudioAtomDataProps,
            },
            // All caption components
            ...captionComponents,
          ],
        },
      ],
      config: {
        fitDurationTo: 'AudioTrack',
      },
    },
  };
};

// Preset metadata
const transcriptionPresetMetadata: PresetMetadata = {
  id: 'audio-transcription',
  title: 'Audio Transcription',
  description:
    'Automatically transcribe audio and generate synchronized subtitles',
  type: 'predefined',
  presetType: 'full',
  tags: ['audio', 'transcription', 'subtitles', 'captions', 'ai'],
  defaultInputParams: {
    audio: {
      src: '',
      volume: 1,
    },
    fontSize: 32,
    textColor: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
};

// Export the preset
const transcriptionPreset = {
  metadata: transcriptionPresetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};

export { transcriptionPreset };
```

**How it works:**

1. ✅ User provides audio URL as input
2. ✅ Preset calls `/api/transcribe/assembly` to generate transcription
3. ✅ API returns captions with timestamps: `[{ text: "Hello", start: 0, end: 1.5 }, ...]`
4. ✅ Preset creates TextAtom components for each caption
5. ✅ Each caption is timed to appear exactly when spoken
6. ✅ Final video has synchronized subtitles!

#### Pattern 2: Image Processing with API Call

```typescript
const presetParams = z.object({
  imageUrl: z.string(),
  style: z.enum(['cartoon', 'realistic', 'abstract']),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  // Call an AI image processing API
  const processedImage = await props.fetcher('/api/process-image', {
    imageUrl: params.imageUrl,
    style: params.style,
  });

  return {
    output: {
      childrenData: [
        {
          id: 'ProcessedImage',
          componentId: 'ImageAtom',
          type: 'atom',
          data: {
            src: processedImage.url,
            className: 'w-full h-full object-cover',
          },
        },
      ],
    },
  };
};
```

#### Pattern 2: Base Scene with Dynamic Aspect Ratio

```typescript
const presetParams = z.object({
  backgroundColor: z.string(),
  aspectRatio: z.string().optional(),
  duration: z.number().optional(),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
): PresetOutput => {
  const [widthRatio, heightRatio] = params.aspectRatio
    ?.split(':')
    .map(Number) ?? [16, 9];
  const aspectRatio = widthRatio / heightRatio;
  const baseWidth = aspectRatio > 1 ? 1920 : 1080;
  const baseHeight = Math.round(baseWidth / aspectRatio);

  return {
    output: {
      childrenData: [
        /* ... */
      ],
      config: {
        width: baseWidth,
        height: baseHeight,
        fps: 30,
        duration: params.duration ?? 20,
      },
    },
  };
};
```

#### Pattern 2: Text with Animations

```typescript
const presetParams = z.object({
  text: z.string(),
  fadeInDuration: z.number().optional(),
  fadeOutDuration: z.number().optional(),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
): PresetOutput => {
  const effects = [
    {
      id: 'fade-in',
      componentId: 'generic',
      data: {
        start: 0,
        duration: params.fadeInDuration ?? 1,
        mode: 'provider',
        targetIds: ['text-atom'],
        type: 'ease-in-out',
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    },
  ];

  return {
    output: {
      childrenData: [
        {
          id: 'text-atom',
          componentId: 'TextAtom',
          type: 'atom',
          effects,
          data: { text: params.text },
        },
      ],
    },
  };
};
```

#### Pattern 3: Array of Media Items

```typescript
const presetParams = z.object({
  images: z.array(z.string()),
  transitionDuration: z.number().optional(),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
): PresetOutput => {
  const imageDuration = 3;
  const transition = params.transitionDuration ?? 0.5;

  const children = params.images.map((src, index) => ({
    id: `image-${index}`,
    componentId: 'ImageAtom',
    type: 'atom' as const,
    data: { src },
    context: {
      timing: {
        start: index * (imageDuration - transition),
        duration: imageDuration,
      },
    },
  }));

  return {
    output: {
      childrenData: [
        {
          id: 'ImageSlideshow',
          componentId: 'BaseLayout',
          type: 'layout',
          childrenData: children,
        },
      ],
    },
  };
};
```

---

## Summary

The MediaMake preset system is powerful and flexible:

1. **Create independent presets** that focus on one task
2. **Define custom inputs** using Zod schemas
3. **Combine presets** to build complex compositions
4. **The system handles the merging** automatically based on preset types

Each preset is like a LEGO piece - simple on its own, but powerful when combined!

---

## Additional Resources

- [Preset Types Documentation](./types.ts)
- [Helper Functions](./preset-helpers.ts)
- [Schema Form Component](./schema-form.tsx)
- [Registry](./registry/presets-registry.ts)

For questions or contributions, please refer to the main repository documentation.
