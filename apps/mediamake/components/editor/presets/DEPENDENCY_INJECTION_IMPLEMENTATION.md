# Preset Dependency Injection System - Implementation Guide

## Overview

We've successfully implemented a dependency injection system for presets that allows:
- ✅ **Reusability** - Shared logic in standard library, not duplicated
- ✅ **Composability** - Presets can use other presets
- ✅ **Small, focused presets** - Each preset does one thing well
- ✅ **Still serializable** - Functions remain as strings, dependencies declared in metadata
- ✅ **Type-safe** - Proper TypeScript types for helpers and preset functions

---

## What Changed

### 1. **Type Definitions** (`types.ts`)

#### Added `dependencies` field to `PresetMetadata`:
```typescript
dependencies?: {
  presets?: string[];  // IDs of other presets to inject
  helpers?: string[];  // Names of helper functions from stdlib to inject
}
```

#### Added injected props to `PresetPassedProps`:
```typescript
helpers?: Record<string, Function>;
presets?: Record<string, (params: any, props?: Partial<PresetPassedProps>) => Promise<PresetOutput>>;
```

### 2. **Standard Library** (`preset-stdlib.ts`)

Created a new standard library with reusable helper functions:
- `findMatchingComponents` - Component tree searching
- `findMatchingComponentsByQuery` - Query-based component finding
- `hexToRgb` - Color conversion utility
- `preprocessCaptions` - Caption preprocessing (split combined words)
- `splitSentenceIntoParts` - Sentence splitting logic
- `createOpacityEffect` - Opacity animation effect
- `createScaleEffect` - Scale animation effect
- `createGradientGlowEffect` - Gradient glow effect
- `createWaveFloatEffect` - Wave floating effect
- `createPulseEffect` - Pulse animation effect
- `applyNoGapsExtension` - Gap reduction between captions

All helpers are exported in the `presetStdLib` object.

### 3. **Runtime Injection** (`preset-helpers.ts`)

Updated `runPreset` function to:
1. Accept an optional `metadata` parameter
2. Read `metadata.dependencies` to determine what to inject
3. Inject helpers from `presetStdLib`
4. Inject other presets as callable functions
5. Execute the preset with injected dependencies

### 4. **Updated All Callers**

Updated all locations that call `runPreset` to pass the metadata parameter:
- `preset-editor-with-provider.tsx`
- `app/api/remotion/render/preset/route.ts`
- `components/agents/preset-ui.tsx`

### 5. **Example Presets**

Created two example presets demonstrating the new system:

#### Simple Example (`simple-opacity-effect.ts`)
- Uses one helper from stdlib
- Shows basic dependency declaration
- Small and focused

#### Advanced Example (`advanced-word-effects.ts`)
- Uses multiple helpers from stdlib
- Calls another preset
- Shows composition capabilities

Both are added to the `predefinedPresets` registry.

---

## How to Use

### Creating a New Preset with Dependencies

```typescript
// 1. Define your parameters
const presetParams = z.object({
  inputCaptions: z.array(z.any()),
  impact: z.number().default(1.0),
});

// 2. Write your preset function
// Note: You can now use props.helpers and props.presets!
const presetExecution = async (params, props) => {
  const { helpers, presets } = props;
  
  // Use helper functions
  const processed = helpers.preprocessCaptions(params.inputCaptions);
  
  // Create effects using helpers
  const effects = processed[0].words.map((word, idx) => ({
    id: `effect-${idx}`,
    componentId: 'generic',
    data: helpers.createOpacityEffect(`word-${idx}`, word, null)
  }));
  
  // Call other presets if needed
  if (presets['simple-opacity-effect']) {
    const result = await presets['simple-opacity-effect']({
      targetWords: [...],
      fadeInDuration: 0.8
    }, props);
    // Use the result...
  }
  
  return {
    output: {
      childrenData: [/* ... */]
    }
  };
};

// 3. Declare dependencies in metadata
const presetMetadata = {
  id: 'my-new-preset',
  title: 'My New Preset',
  presetType: 'effects',
  type: 'predefined',
  // IMPORTANT: Declare what you need!
  dependencies: {
    helpers: ['preprocessCaptions', 'createOpacityEffect'],
    presets: ['simple-opacity-effect']
  },
  defaultInputParams: { /* ... */ }
};

// 4. Export as usual
export const myNewPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
```

### Available Helpers

From `presetStdLib`:
- `findMatchingComponents(childrenData, targetIds)`
- `findMatchingComponentsByQuery(childrenData, query)`
- `hexToRgb(hex)`
- `preprocessCaptions(captions)`
- `splitSentenceIntoParts(words, maxLines?, splitParts?)`
- `createOpacityEffect(wordId, word, caption?)`
- `createScaleEffect(wordId, word, impact)`
- `createGradientGlowEffect(wordId, word, accentColor, impact)`
- `createWaveFloatEffect(wordId, word, impact)`
- `createPulseEffect(wordId, word, impact)`
- `applyNoGapsExtension(captions, noGapsConfig)`

### Calling Other Presets

Any preset in the registry can be called by ID:

```typescript
// In your preset function
const presetExecution = async (params, props) => {
  const { presets } = props;
  
  // Check if preset is available
  if (presets['some-preset-id']) {
    const result = await presets['some-preset-id'](
      { /* input params */ },
      props // Pass along the props (optional)
    );
    // Use result...
  }
};

// Declare the dependency
const presetMetadata = {
  // ...
  dependencies: {
    presets: ['some-preset-id']
  }
};
```

---

## Benefits

### Before (Old System)
```typescript
// 1400+ line preset with everything inline
const presetExecution = (params) => {
  // Define hexToRgb helper (duplicated in every preset)
  const hexToRgb = (hex) => { /* ... */ };
  
  // Define preprocessCaptions helper (duplicated)
  const preprocessCaptions = (captions) => { /* ... */ };
  
  // Define createOpacityEffect (duplicated)
  const createOpacityEffect = (wordId, word) => { /* ... */ };
  
  // ... 50+ more helper functions ...
  
  // Actual preset logic buried deep inside
};
```

### After (New System)
```typescript
// Small, focused preset
const presetExecution = (params, props) => {
  const { helpers } = props;
  
  // Use shared helpers
  const processed = helpers.preprocessCaptions(params.captions);
  const rgb = helpers.hexToRgb('#FF0000');
  const effect = helpers.createOpacityEffect(wordId, word);
  
  // Actual preset logic is clear and concise
};

// Dependencies declared in metadata
dependencies: {
  helpers: ['preprocessCaptions', 'hexToRgb', 'createOpacityEffect']
}
```

---

## Migration Path for Existing Presets

To refactor an existing preset:

1. **Identify reusable helpers** - Look for functions that could be shared
2. **Check if they exist in stdlib** - If yes, use them; if no, add them
3. **Update preset function** - Replace inline helpers with `props.helpers.*`
4. **Add dependencies to metadata** - Declare what helpers/presets you need
5. **Test thoroughly** - Ensure everything works as before

### Example Migration

**Before:**
```typescript
const presetExecution = (params) => {
  const hexToRgb = (hex) => { /* ... */ };
  const rgb = hexToRgb('#FF0000');
  // ...
};
```

**After:**
```typescript
const presetExecution = (params, props) => {
  const { helpers } = props;
  const rgb = helpers.hexToRgb('#FF0000');
  // ...
};

metadata: {
  // ...
  dependencies: {
    helpers: ['hexToRgb']
  }
}
```

---

## Testing

To test the new system:

1. **Load the example presets** - `simple-opacity-effect` and `advanced-word-effects`
2. **Apply them in the editor** - Check that they execute correctly
3. **Check console** - Look for any warnings about missing dependencies
4. **Create a new preset** - Try using helpers and calling other presets

---

## Future Enhancements

Possible improvements:
- Add more helpers to stdlib as common patterns emerge
- Create preset "packages" - groups of related presets
- Add validation to ensure declared dependencies exist
- Create a preset debugger to inspect injected dependencies
- Add support for custom user-defined helpers

---

## Troubleshooting

### "Helper function X not found in presetStdLib"
- Check spelling of helper name in `dependencies.helpers`
- Verify helper exists in `preset-stdlib.ts`
- Ensure helper is exported in `presetStdLib` object

### "Preset dependency X not found in registry"
- Check spelling of preset ID in `dependencies.presets`
- Verify preset is imported and added to `predefinedPresets` array
- Check preset metadata has correct `id` field

### Preset executes but helpers are undefined
- Ensure you're passing `metadata` to `runPreset()`
- Check that `metadata.dependencies` is properly defined
- Verify `props.helpers` exists before using it

---

## Summary

The dependency injection system transforms presets from monolithic, duplicated code into small, composable, reusable pieces. You can now:

✅ Write small presets that do one thing well
✅ Reuse common logic via stdlib
✅ Compose complex behaviors by calling other presets
✅ Maintain serializability for database storage
✅ Keep type safety and IDE support

Happy preset building! 🎉





