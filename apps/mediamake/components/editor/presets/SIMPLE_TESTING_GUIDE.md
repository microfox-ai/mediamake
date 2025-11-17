# Simple Testing Guide - Dependency Injection System

## ✨ New Preset: Enhanced Subtitle Demo

This is a **simple, focused preset** that clearly demonstrates:
- ✅ Using helpers from stdlib (`preprocessCaptions`, `createOpacityEffect`)
- ✅ Calling another preset (`simple-opacity-effect`) and USING its result
- ✅ Combining both approaches in a realistic way

**No complex merging, no unnecessary complications - just clean dependency injection!**

---

## 🧪 Quick Test (2 Minutes)

### **Step 1: Select the Preset**
Look for: **"Enhanced Subtitle Demo"**

### **Step 2: Use This Input**
```json
{
  "inputCaptions": [
    {
      "id": "caption-1",
      "text": "Hello World Test",
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
          "duration": 1,
          "absoluteStart": 0,
          "absoluteEnd": 1
        },
        {
          "id": "word-2",
          "text": "World",
          "start": 1,
          "duration": 1,
          "absoluteStart": 1,
          "absoluteEnd": 2
        },
        {
          "id": "word-3",
          "text": "Test",
          "start": 2,
          "duration": 1,
          "absoluteStart": 2,
          "absoluteEnd": 3
        }
      ]
    }
  ],
  "applyExtraOpacityLayer": true
}
```

### **Step 3: Generate & Check Console**

You should see these logs:
```
🎬 Enhanced Subtitle Demo starting...
📝 Input captions: 1 captions
🔧 Using helper: preprocessCaptions
✅ Created 3 word components using helpers
🎨 Calling simple-opacity-effect preset to add extra layer...
✅ simple-opacity-effect returned: {...}
✅ Extracted X extra effects from preset
🎉 Enhanced Subtitle Demo complete!
   - Used helpers: preprocessCaptions, createOpacityEffect
   - Called presets: simple-opacity-effect
   - Total word components: 3
   - Extra effects applied: X
```

### **Step 4: Visual Result**

You should see:
- ✅ White text: "Hello World Test"
- ✅ Black semi-transparent background on each word
- ✅ Fade-in effect
- ✅ Words appear one by one

---

## 🎯 What This Tests

### ✅ Helper Injection
```typescript
helpers.preprocessCaptions(...)  // From stdlib
helpers.createOpacityEffect(...)  // From stdlib
```

### ✅ Preset Calling
```typescript
const result = await presets['simple-opacity-effect']({...});
// ↑ Calls another preset and gets its output
```

### ✅ Using Preset Results
```typescript
// Extracts effects from the called preset
extraEffects = result.output.childrenData[0].effects;

// Uses them in the final output
effects: extraEffects,  // ← Actually applied!
```

---

## 🔄 Test With/Without Preset Calling

### **Test 1: With Extra Layer (Default)**
```json
{
  "inputCaptions": "data:[captions]",
  "applyExtraOpacityLayer": true
}
```
**Result:** Uses helpers + calls `simple-opacity-effect` preset

**Console shows:**
- ✅ "Calling simple-opacity-effect preset..."
- ✅ "Extracted X extra effects from preset"

---

### **Test 2: Without Extra Layer**
```json
{
  "inputCaptions": "data:[captions]",
  "applyExtraOpacityLayer": false
}
```
**Result:** Only uses helpers, doesn't call other preset

**Console shows:**
- ✅ "Used helpers: preprocessCaptions, createOpacityEffect"
- ✅ "Called presets: none"

---

## 📊 Comparison: This vs Complex Composite

### Enhanced Subtitle Demo (This One)
```
User adds: enhanced-subtitle-demo
    ↓
Preset uses:
  - helpers.preprocessCaptions()
  - helpers.createOpacityEffect()
  - presets['simple-opacity-effect']()  ← If enabled
    ↓
Creates: Subtitle components with effects
```
**Simple, focused, realistic!** ✨

### Composite Subtitle Showcase (The Complex One)
```
User adds: composite-subtitle-showcase
    ↓
Preset calls:
  - presets['base-scene']()
  - presets['advanced-word-effects']()
    ↓
Manually merges outputs
    ↓
Creates: Complete scene + subtitles
```
**Complex, shows all features but overkill for normal use!** 🤯

---

## 💡 Why This is Better for Testing

### ✅ Clear Purpose
- Creates subtitles (one thing)
- Optionally adds extra effects via preset call
- Easy to understand what's happening

### ✅ Observable Results
- Clear console logs at each step
- Can toggle preset calling on/off
- Easy to see what came from where

### ✅ Realistic Use Case
- This is how you'd actually build presets
- Uses helpers for basic stuff
- Calls presets for complex stuff
- Combines both naturally

---

## 🚀 Real-World Usage

After testing, use it in production by just adding it to your configuration:

```typescript
appliedPresets = [
  {
    preset: enhancedSubtitleDemoPreset,
    inputData: {
      inputCaptions: "data:[captions]",
      applyExtraOpacityLayer: true
    }
  }
]
```

**That's it!** The system handles:
- ✅ Injecting helpers from stdlib
- ✅ Injecting `simple-opacity-effect` preset
- ✅ Executing everything in the right order
- ✅ Returning the final result

---

## 🎓 Key Takeaways

1. **Helpers are for simple utilities** - Use them for basic effects, transformations
2. **Presets are for complex components** - Call them when you need complete structures
3. **Sequential configuration is normal** - Most presets run one after another
4. **Preset calling is for special cases** - When you need dynamic behavior
5. **The system handles everything** - You just declare dependencies!

---

## ✅ Success Criteria

You'll know the system works when:

### Console Shows:
- 🎬 Starting message
- 🔧 Helper usage
- 🎨 Preset calling (if enabled)
- ✅ Success messages
- 🎉 Completion summary

### Visual Shows:
- Words displaying with styling
- Fade-in effects working
- No errors in output

### No Errors:
- No console errors
- No missing dependency warnings
- All effects applied correctly

**If you see all of this, the dependency injection system is working perfectly!** 🎉





