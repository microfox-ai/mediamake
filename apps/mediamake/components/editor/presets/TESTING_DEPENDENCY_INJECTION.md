# Testing the Dependency Injection System

## ✅ New Preset: Composite Subtitle Showcase

This preset demonstrates **REAL preset composition** by:
1. Calling `base-scene` preset to create a scene container
2. Calling `advanced-word-effects` preset to create animated subtitles
3. Merging both outputs into a complete composition

---

## 🧪 How to Test

### **Test 1: Basic Composition Test**

#### Step 1: Add the Preset
Select **"Composite Subtitle Showcase"** from the preset list

#### Step 2: Configure Input
```json
{
  "inputCaptions": [
    {
      "id": "caption-1",
      "text": "Hello World",
      "absoluteStart": 0,
      "absoluteEnd": 3,
      "start": 0,
      "end": 3,
      "duration": 3,
      "words": [
        {
          "id": "word-1",
          "text": "Hello",
          "start": 0,
          "duration": 1.5,
          "absoluteStart": 0,
          "absoluteEnd": 1.5
        },
        {
          "id": "word-2",
          "text": "World",
          "start": 1.5,
          "duration": 1.5,
          "absoluteStart": 1.5,
          "absoluteEnd": 3
        }
      ]
    }
  ],
  "backgroundColor": "#1a1a2e",
  "effectsConfig": {
    "useOpacity": true,
    "useScale": true,
    "useWave": true,
    "impact": 1.5
  }
}
```

#### Step 3: Generate & Check Console
You should see:
```
🎬 Starting Composite Subtitle Showcase...
📦 Calling base-scene preset...
✅ base-scene preset completed: {...}
🎨 Calling advanced-word-effects preset...
✅ advanced-word-effects preset completed: {...}
🔗 Merging preset outputs...
✅ Merged! Base scene now has 1 children
```

#### Step 4: Verify Output
You should see:
- ✅ Dark blue/purple background (`#1a1a2e`)
- ✅ White text displaying "Hello World"
- ✅ Opacity fade-in effect
- ✅ Scale/bounce effect
- ✅ Wave floating effect

---

### **Test 2: Using Data References**

#### Configure with References:
```json
{
  "inputCaptions": "data:[captions]",
  "backgroundColor": "#0f0f23",
  "effectsConfig": {
    "useOpacity": true,
    "useScale": true,
    "useWave": false,
    "impact": 1.0
  }
}
```

This pulls captions from your base data automatically!

---

### **Test 3: Different Configurations**

#### Minimal Effects (Subtle):
```json
{
  "inputCaptions": "data:[captions]",
  "backgroundColor": "#ffffff",
  "effectsConfig": {
    "useOpacity": true,
    "useScale": false,
    "useWave": false,
    "impact": 0.5
  }
}
```

#### Maximum Effects (Dramatic):
```json
{
  "inputCaptions": "data:[captions]",
  "backgroundColor": "#000000",
  "effectsConfig": {
    "useOpacity": true,
    "useScale": true,
    "useWave": true,
    "impact": 2.5
  }
}
```

---

## 🔍 What This Tests

### ✅ Dependency Resolution
- Preset declares: `dependencies: { presets: ['base-scene', 'advanced-word-effects'] }`
- System automatically fetches both from registry
- Both are injected into `props.presets`

### ✅ Preset Calling
- `await presets['base-scene']({...})` - calls first preset
- `await presets['advanced-word-effects']({...})` - calls second preset
- Both return `PresetOutput` objects

### ✅ Result Merging
- Takes output from `base-scene`
- Takes output from `advanced-word-effects`
- Merges them together
- Returns combined composition

### ✅ Nested Dependencies
- `composite-subtitle-showcase` depends on:
  - `base-scene` (no dependencies)
  - `advanced-word-effects` which depends on:
    - `helpers` from stdlib
    - `simple-opacity-effect` preset
- Entire chain resolves automatically!

---

## 🐛 Troubleshooting

### Console Shows Errors

#### "Presets not injected"
- ❌ Problem: Metadata not passed to `runPreset`
- ✅ Fix: Check that all callers pass 4th parameter

#### "base-scene preset not available"
- ❌ Problem: Preset not in registry
- ✅ Fix: Check `presets-registry.ts` includes `baseScenePreset`

#### "advanced-word-effects preset failed"
- ❌ Problem: Dependency preset failed
- ✅ Fix: Check console for inner error, likely missing helpers

### Nothing Displays

#### Check 1: Base Data
- Verify `inputCaptions` has correct structure
- Check that words have timing data

#### Check 2: Console Logs
- Look for the emoji logs (🎬, 📦, 🎨, etc.)
- Check if all presets completed successfully

#### Check 3: Generated Output
- Inspect the final composition structure
- Verify `childrenData` has both scene and subtitles

---

## 📊 Success Criteria

For the dependency injection system to be working correctly, you should see:

### ✅ Console Output
```
🎬 Starting Composite Subtitle Showcase...
📦 Calling base-scene preset...
✅ base-scene preset completed
🎨 Calling advanced-word-effects preset...
✅ advanced-word-effects preset completed
🔗 Merging preset outputs...
✅ Merged! Base scene now has 1 children
```

### ✅ Visual Output
- Background with configured color
- Animated text displaying captions
- Smooth transitions and effects

### ✅ No Errors
- No console errors
- No warnings about missing dependencies
- All presets execute successfully

---

## 🎯 What This Proves

If this preset works, it proves:

1. **✅ Dependency injection works** - Presets are injected automatically
2. **✅ Preset composition works** - Presets can call other presets
3. **✅ Nested dependencies work** - Multi-level dependency chains resolve
4. **✅ Result merging works** - Multiple preset outputs can be combined
5. **✅ The entire system is functional!** 🎉

---

## 🚀 Next Steps

Once this works, you can:
- Create more complex composite presets
- Build preset "workflows" that chain multiple presets
- Create reusable preset components
- Build a library of specialized effects that combine existing presets

The dependency injection system is your foundation for building powerful, composable video templates!





