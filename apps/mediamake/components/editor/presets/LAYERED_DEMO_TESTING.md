# Layered Effects Demo - Testing Guide

## Overview
This guide demonstrates testing the **Layered Effects Demo** preset, which showcases the new dependency injection system by composing two children presets together.

## Architecture

```
┌─────────────────────────────────────┐
│   Layered Effects Demo (children)   │
│  Composes two presets together:     │
├─────────────────────────────────────┤
│  1. basic-text-layer                │
│     └─ Creates text components      │
│                                      │
│  2. glow-pulse-effects               │
│     └─ Adds visual effects          │
└─────────────────────────────────────┘
```

### Individual Presets

#### 1. **Basic Text Layer** (`basic-text-layer`)
- **Type**: `children` preset
- **Purpose**: Creates foundational text components from captions
- **Dependencies**: Uses `preprocessCaptions` helper from stdlib
- **Output**: Text components with configurable styling

#### 2. **Glow & Pulse Effects** (`glow-pulse-effects`)
- **Type**: `children` preset
- **Purpose**: Adds glow and pulse animation effects
- **Dependencies**: Uses `preprocessCaptions`, `createGradientGlowEffect`, `createPulseEffect` helpers
- **Output**: Effect containers that apply to text components

#### 3. **Layered Effects Demo** (`layered-effects-demo`)
- **Type**: `children` preset
- **Purpose**: Demonstrates preset composition
- **Dependencies**: Calls `basic-text-layer` and `glow-pulse-effects` presets
- **Output**: Merged output from both presets

## Testing Steps

### Step 1: Add Base Scene
Since all three presets are `children` type, you need a base scene first:

1. Click **"Add items to final configuration"**
2. Select **"Base Scene"**
3. Keep default settings
4. Click **"Add to Configuration"**

### Step 2: Test Individual Presets (Optional)

#### Test Basic Text Layer
1. Select **"Basic Text Layer"** preset
2. Add your captions as input
3. Configure:
   - Font size: `56`
   - Text color: `#ffffff`
   - Position: `center`
4. Click **"Add to Configuration"**
5. **Expected**: White text appears in the center

#### Test Glow Pulse Effects
1. First ensure you have text components (from Basic Text Layer)
2. Select **"Glow & Pulse Effects"** preset
3. Use the same captions
4. Configure:
   - Glow color: `#00ffff` (cyan)
   - Pulse intensity: `1.2`
   - Enable both glow and pulse
5. Click **"Add to Configuration"**
6. **Expected**: Text now has cyan glow and pulses

### Step 3: Test the Composite Preset

Now test the main preset that calls both:

1. **Start fresh or keep existing**:
   - Option A: Keep Base Scene + previous presets
   - Option B: Start with just Base Scene

2. Select **"Layered Effects Demo"** preset

3. **Input your captions**:
   ```json
   [
     {
       "id": "caption-1",
       "text": "Hello composition",
       "start": 0,
       "end": 2,
       "words": [
         { "id": "w1", "text": "Hello", "start": 0, "end": 1 },
         { "id": "w2", "text": "composition", "start": 1.1, "end": 2 }
       ]
     },
     {
       "id": "caption-2",
       "text": "Presets calling presets",
       "start": 2.5,
       "end": 5,
       "words": [
         { "id": "w3", "text": "Presets", "start": 2.5, "end": 3.2 },
         { "id": "w4", "text": "calling", "start": 3.3, "end": 4 },
         { "id": "w5", "text": "presets", "start": 4.1, "end": 5 }
       ]
     }
   ]
   ```

4. **Configure Layer 1** (basic-text-layer):
   - Font size: `56`
   - Text color: `#ffff00` (yellow)
   - Position: `center`

5. **Configure Layer 2** (glow-pulse-effects):
   - Glow color: `#ff00ff` (magenta)
   - Pulse intensity: `1.5`
   - Apply glow: ✅
   - Apply pulse: ✅

6. Click **"Add to Configuration"**

### Expected Results

1. **Console Output**:
   ```
   🎨 LAYERED EFFECTS DEMO starting...
      - Input captions: 2
      - Layer 1 (basic-text-layer): fontSize 56 position center
      - Layer 2 (glow-pulse-effects): glow true pulse true
      📝 Calling Layer 1: basic-text-layer...
      ✅ Layer 1 complete: 1 components
      ✨ Calling Layer 2: glow-pulse-effects...
      ✅ Layer 2 complete: 1 components
   🎉 LAYERED EFFECTS DEMO complete!
      - Total components: 2
      - Layer 1 components: 1
      - Layer 2 components: 1
   ```

2. **Visual Output**:
   - Yellow text in the center
   - Magenta glow around the text
   - Smooth pulsing animation
   - Words appear based on their timing

3. **Component Tree**:
   ```
   BaseScene
   ├── basic-text-container (from Layer 1)
   │   ├── text-caption-0
   │   │   ├── text-word-0-0
   │   │   └── text-word-0-1
   │   └── text-caption-1
   │       ├── text-word-1-0
   │       ├── text-word-1-1
   │       └── text-word-1-2
   └── glow-pulse-effects-container (from Layer 2)
       └── [effects applied to all words]
   ```

## Key Features Demonstrated

### ✅ Dependency Injection
- **Helpers**: Both presets use helpers from `preset-stdlib.ts`
- **Presets**: Layered Demo calls other presets via `props.presets`

### ✅ Preset Composition
- Layer 1 creates components
- Layer 2 adds effects
- Parent preset merges both outputs

### ✅ Type Safety
- All presets properly typed
- Metadata declares dependencies
- Runtime injection works seamlessly

### ✅ Works for Both Types
- ✅ Children presets (demonstrated here)
- ✅ Full presets (see `composite-subtitle-showcase`)

## Troubleshooting

### No Text Appears
- **Check**: Did you add Base Scene first?
- **Fix**: Children presets need `attachedToId: 'BaseScene'`

### Console Shows Dependency Errors
- **Check**: Are both child presets registered in `presets-registry.ts`?
- **Fix**: Ensure imports and array entries are correct

### Effects Not Visible
- **Check**: Are word IDs matching between layers?
- **Fix**: Both layers use same ID format: `text-word-${captionIndex}-${wordIndex}`

### Type Errors
- **Check**: Are `dependencies` in `PresetMetadata`?
- **Check**: Are `helpers` and `presets` in `PresetPassedProps`?
- **Fix**: See `types.ts` for proper interface definitions

## Next Steps

Now that you've seen preset composition:

1. **Create your own composite presets** using these as templates
2. **Mix and match** any combination of children presets
3. **Build complex effects** by layering simple presets
4. **Share helpers** across all presets via stdlib

The system is flexible and extensible! 🚀




