# MediaMake Documentation

Complete documentation for the MediaMake video composition system.

## 📖 Table of Contents

### Getting Started

1. **[Preset System Guide](./PRESET_GUIDE.md)** - Complete guide to understanding and creating presets
   - Overview of preset system
   - How to create new presets
   - Preset inputs and parameters
   - Combining multiple presets
   - Component reference

2. **[Advanced Preset Creation Guide](./ADVANCED_PRESET_GUIDE.md)** ⭐ **NEW**
   - Advanced techniques for custom presets
   - Special effects (highlights, circles, glows, counters)
   - Conditional positioning and pattern matching
   - Layered components and complex animations
   - Complete working examples
   - No custom atoms needed!

3. **[Quick Reference](./QUICK_REFERENCE.md)** 🚀 **CHEAT SHEET**
   - Fast lookup for common patterns
   - Code snippets ready to copy
   - Component templates
   - Effect recipes
   - Helper functions

### Theme & Background Systems

4. **[Custom Theme Background Guide](./CUSTOM_THEME_BACKGROUND_GUIDE.md)**
   - Creating themed backgrounds
   - Color palettes and gradients
   - Pattern overlays
   - Media backgrounds (image/video)
   - Animation effects

### Testing & Implementation

5. **[Testing Guide](./TESTING_GUIDE.md)**
   - How to test presets
   - Testing patterns
   - Best practices

6. **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)**
   - System architecture overview
   - Key implementation details

### Rendering

7. **[Local Rendering API](./local-rendering-api.md)**
   - Using the local rendering API
   - Render modes and options

8. **[Render Provider System](./render-provider-system.md)**
   - Understanding render providers
   - Cloud vs local rendering

9. **[Example API Usage](./example-api.md)**
   - API examples and patterns

---

## 🚀 Quick Start

### ⚠️ CRITICAL: Start with Pattern 10!

**Before creating any preset, read [Pattern 10: Future-Proof Preset Design](./ADVANCED_PRESET_GUIDE.md#pattern-10-future-proof-preset-design-combined-approach-)!**

This ensures your preset:

- ✅ Works today with user input (pattern rules)
- ✅ Works tomorrow with AI (metadata)
- ✅ Never needs refactoring when adding AI
- ✅ Supports hybrid mode (both at once)

### Creating Your First Advanced Preset

1. Read the [Preset System Guide](./PRESET_GUIDE.md) to understand basics
2. **Study [Pattern 10](./ADVANCED_PRESET_GUIDE.md#pattern-10-future-proof-preset-design-combined-approach-) first** (CRITICAL!)
3. Study the [Advanced Preset Creation Guide](./ADVANCED_PRESET_GUIDE.md) for techniques
4. Copy the Pattern 10 complete example
5. Modify for your use case
6. Test with both pattern rules and mock metadata
7. Refine and optimize

### Common Use Cases

**⭐⭐⭐ Want to create a future-proof preset that works today AND with AI tomorrow?**
→ See [Advanced Preset Guide - Pattern 10: Future-Proof Design](./ADVANCED_PRESET_GUIDE.md#pattern-10-future-proof-preset-design-combined-approach-) **START HERE!**

**Want to add special effects to specific words?**
→ See [Advanced Preset Guide - Pattern 2: Word-Level Effect Rules](./ADVANCED_PRESET_GUIDE.md#pattern-2-word-level-effect-rules)

**Want to position sentences conditionally?**
→ See [Advanced Preset Guide - Pattern 1: Conditional Sentence Positioning](./ADVANCED_PRESET_GUIDE.md#pattern-1-conditional-sentence-positioning)

**Want to create highlights or circles around words?**
→ See [Advanced Preset Guide - Pattern 3-4: Visual Effects](./ADVANCED_PRESET_GUIDE.md#pattern-3-yellow-highlight-effect)

**Want to animate numbers counting up?**
→ See [Advanced Preset Guide - Pattern 6: Simulated Counter Animation](./ADVANCED_PRESET_GUIDE.md#pattern-6-simulated-counter-animation)

**Want to create custom backgrounds?**
→ See [Custom Theme Background Guide](./CUSTOM_THEME_BACKGROUND_GUIDE.md)

**Want to use AI/metadata for intelligent highlighting?**
→ See [Advanced Preset Guide - Pattern 9: Using Metadata](./ADVANCED_PRESET_GUIDE.md#pattern-9-using-caption-and-word-metadata)

**Want to build reusable effect libraries instead of repeating code?**
→ See [Advanced Preset Guide - Pattern 11: Plug & Play Libraries](./ADVANCED_PRESET_GUIDE.md#pattern-11-plug--play-effect-libraries-reusable-helpers-) 🔌

---

## 🎯 Key Concepts

### Building Blocks

The system provides these core components:

- **`TextAtom`** - Render text with fonts
- **`ShapeAtom`** - Render shapes (circles, rectangles)
- **`ImageAtom`** - Render images
- **`VideoAtom`** - Render videos
- **`AudioAtom`** - Render audio
- **`BaseLayout`** - Compose and layer components

### Effect System

Animate any property using `GenericEffectData`:

```typescript
{
  type: 'ease-in-out',
  start: 0,
  duration: 1,
  ranges: [
    { key: 'opacity', val: 0, prog: 0 },
    { key: 'opacity', val: 1, prog: 1 },
  ]
}
```

**Animatable Properties:**

- Transform: `translateX`, `translateY`, `scale`, `rotate`
- Visual: `opacity`, `letterSpacing`
- Filters: `filter` (blur, drop-shadow, contrast, brightness)
- Colors: `color`, `backgroundColor`

### Pattern Matching

Use regex to target specific content:

```typescript
positionRules: [{ pattern: 'important.*message', position: 'center' }];

wordEffects: [{ pattern: '\\$[0-9,]+', effectType: 'circle' }];
```

### Metadata-Driven Behavior

Use AI/API pre-processed data for intelligent effects:

```typescript
// Caption metadata
caption.metadata = {
  keyword: 'important', // Word to emphasize
  splitParts: 2, // Multi-line split
  sentiment: 'positive', // AI analysis
};

// Word metadata
word.metadata = {
  isHighlight: true, // Auto-highlight
  importance: 0.9, // AI confidence score
};
```

**Two Approaches:**

1. **Metadata** - AI-driven, automatic, content-aware
2. **Pattern Rules** - User-defined, regex-based, explicit

**Best Practice:** Support both! Check metadata first, fall back to pattern rules.

→ See [Advanced Preset Guide - Pattern 9: Using Metadata](./ADVANCED_PRESET_GUIDE.md#pattern-9-using-caption-and-word-metadata) for complete examples.

---

## 💡 Best Practices

1. **⭐⭐⭐ ALWAYS Use Combined Approach (Pattern 10)** - Support BOTH metadata AND pattern rules from day one
2. **🔌 Build Reusable Libraries (Pattern 11)** - Create shared effect helpers instead of duplicating code
3. **Start Simple** - Build complexity gradually
4. **Use Helpers** - Create reusable helper functions
5. **Test Incrementally** - Test each feature as you add it
6. **Stack Effects** - Combine multiple effects for rich animations
7. **Use Provider Mode** - Target specific components with `targetIds`
8. **Layer with BaseLayout** - Use `childrenProps` for precise positioning

**CRITICAL:** Always implement the priority system in your presets:

1. Check `word.metadata?.isHighlight` (AI Priority 1)
2. Check `caption.metadata?.keyword` (AI Priority 2)
3. Check pattern rules (User Priority 3)
4. Default behavior (Priority 4)

This ensures your preset works today AND tomorrow without any code changes!

---

## 📚 Learning Path

### Beginner

1. Read [Preset System Guide](./PRESET_GUIDE.md) sections 1-2
2. Try the basic examples in section 7
3. Create a simple text preset

### Intermediate

1. Complete [Preset System Guide](./PRESET_GUIDE.md)
2. Read [Advanced Preset Guide](./ADVANCED_PRESET_GUIDE.md) introduction and core architecture
3. Implement conditional positioning
4. Add word-level effects

### Advanced

1. Study existing presets:
   - `sub-vertical-float.ts` - Complex stacked effects
   - `sub-fast-rap-static.ts` - Sentence transitions
   - `testing-kinetics.ts` - Smart word selection
2. Review [Advanced Preset Guide](./ADVANCED_PRESET_GUIDE.md) complete examples
3. Create custom preset with:
   - Multiple effect types
   - Conditional logic
   - Layered components
   - Custom animations

---

## 🔍 Reference

### File Locations

- **Preset Registry**: `apps/mediamake/components/editor/presets/registry/`
- **Preset Types**: `apps/mediamake/components/editor/presets/types.ts`
- **Component Library**: `packages/remotion/src/components/`

### Important Types

```typescript
// Preset structure
type Preset = {
  metadata: PresetMetadata;
  presetFunction: string;
  presetParams: object;
};

// Component data
type RenderableComponentData = {
  id: string;
  type: 'atom' | 'layout';
  componentId: string;
  data: any;
  context?: {
    timing?: { start: number; duration: number };
    boundaries?: any;
  };
  effects?: EffectDefinition[];
  childrenData?: RenderableComponentData[];
};

// Effect data
type GenericEffectData = {
  type: 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' | 'spring';
  start: number;
  duration: number;
  mode?: 'provider' | 'wrapper';
  targetIds?: string[];
  ranges: Array<{ key: string; val: any; prog: number }>;
};
```

---

## 🤝 Contributing

When creating new presets or documentation:

1. Follow the patterns in existing presets
2. Add TypeScript types for safety
3. Include usage examples
4. Document parameters clearly
5. Test thoroughly

---

## 📞 Support

For questions or issues:

1. Check the relevant guide first
2. Study similar existing presets
3. Test incrementally to isolate issues
4. Review TypeScript errors carefully

---

## 🎬 Happy Creating!

You now have everything you need to create sophisticated video presets. Remember:

- **You don't need custom atoms** - Use the existing building blocks
- **Effects can be stacked** - Combine multiple animations
- **Patterns enable flexibility** - Use regex for conditional behavior
- **Start simple, build up** - Complexity comes from combining simple parts

Good luck and have fun building! 🚀
