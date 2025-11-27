# Preset Generation: Timing Rules

## 🚨 CRITICAL: Timing Context is ALWAYS Relative 🚨

**This is the #1 most important rule for preset generation. Violating this rule will cause timing bugs.**

### The Golden Rule

```
*** CONTEXT TIMINGS ARE RELATIVE TO PARENT COMPONENT, NOT ABSOLUTE TO VIDEO START ***
*** CONTEXT TIMINGS ARE RELATIVE TO PARENT COMPONENT, NOT ABSOLUTE TO VIDEO START ***
*** CONTEXT TIMINGS ARE RELATIVE TO PARENT COMPONENT, NOT ABSOLUTE TO VIDEO START ***
```

When you set `context.timing.start = 5` on a child component, this means the child starts **5 seconds AFTER its parent starts**, NOT 5 seconds into the video.

### Why This Matters

**In nested component hierarchies, each component's timing is calculated relative to its immediate parent's timeline, not the video's absolute timeline.**

This design:
- ✅ Allows components to be reusable at any point in the video
- ✅ Makes timing calculations composable and modular
- ✅ Enables components to be moved without recalculating all child timings
- ✅ Mirrors how React components work (isolated and composable)

### Understanding Relative vs Absolute

#### Absolute Timing (Video Timeline)
```
VIDEO: 0s ═════════════════════════════════════════════► 30s
       │                                                 │
       │         Component appears at 10s in video      │
       └─────────────────────►                          │
                           10s                           │
```

#### Relative Timing (Parent-Child)
```
PARENT: starts at 10s, duration 20s
        │
        │ PARENT TIMELINE: 0s ════════════════════► 20s
        │                    │                      │
        │                    │  Child: start: 5    │
        │                    └──────►               │
        │                         5s                │
        │
        └─► Child appears at 15s in VIDEO (10 + 5)
```

## Examples

### Example 1: Simple Parent-Child

```typescript
{
  id: 'parent-container',
  context: {
    timing: {
      start: 0,      // Parent starts at video time 0s
      duration: 10,  // Parent lasts 10 seconds (0-10s in video)
    }
  },
  childrenData: [{
    id: 'child-text',
    context: {
      timing: {
        start: 3,      // ✅ Child starts 3s AFTER parent starts
        duration: 4,   // → Child appears at 3s-7s in video
      }
    }
  }]
}
```

**Result:** Child appears from 3s to 7s in the video timeline.

### Example 2: Nested Hierarchy

```typescript
{
  id: 'grandparent',
  context: {
    timing: {
      start: 5,      // Grandparent at 5s in video
      duration: 20,  // Lasts until 25s
    }
  },
  childrenData: [{
    id: 'parent',
    context: {
      timing: {
        start: 2,      // Parent starts 2s after grandparent
        duration: 10,  // → Parent at 7s-17s in video (5+2)
      }
    },
    childrenData: [{
      id: 'child',
      context: {
        timing: {
          start: 3,      // Child starts 3s after parent
          duration: 3,   // → Child at 10s-13s in video (7+3)
        }
      }
    }]
  }]
}
```

**Timeline:**
- Grandparent: 5s - 25s (video)
- Parent: 7s - 17s (video) = 5s + 2s relative start
- Child: 10s - 13s (video) = 7s + 3s relative start

### Example 3: Caption with Words

```typescript
const caption = {
  text: 'Hello world',
  start: 0,              // Relative to caption
  duration: 2.5,
  absoluteStart: 15,     // Absolute position in video (reference only)
  words: [{
    text: 'Hello',
    start: 0,            // Relative to caption
    duration: 1.0,
    absoluteStart: 15,   // Absolute position (reference only)
  }, {
    text: 'world',
    start: 1.0,          // Relative to caption
    duration: 1.5,
    absoluteStart: 16,   // Absolute position (reference only)
  }]
}

// ✅ CORRECT - Use relative timing for context
{
  id: 'caption-container',
  context: {
    timing: {
      start: caption.absoluteStart,  // ✅ Use absoluteStart for ROOT parent
      duration: caption.duration,
    }
  },
  childrenData: caption.words.map(word => ({
    id: `word-${word.text}`,
    context: {
      timing: {
        start: word.start,           // ✅ Use relative start for children
        duration: word.duration,
      }
    }
  }))
}

// ❌ WRONG - Using absoluteStart for child timing
{
  id: 'word-hello',
  context: {
    timing: {
      start: word.absoluteStart,     // ❌ WRONG! This is absolute, not relative
      duration: word.duration,
    }
  }
}
```

**Key Point:** `absoluteStart` is for **reference only** when determining where to place the parent container. Child components must use `start` (relative value).

## Common Mistakes

### ❌ Mistake 1: Using Absolute Video Timestamps

```typescript
// ❌ WRONG - Thinking in absolute video time
{
  id: 'text-1',
  context: {
    timing: {
      start: 10,  // User thinks: "appears at 10s in video"
    }
  }
}
```

**Problem:** If this component is nested inside a parent that starts at 5s, the text will actually appear at 15s (5+10), not 10s.

### ❌ Mistake 2: Using absoluteStart for Child Timing

```typescript
// ❌ WRONG - Using absoluteStart from caption data
caption.words.forEach(word => {
  childrenData.push({
    context: {
      timing: {
        start: word.absoluteStart,  // ❌ WRONG!
      }
    }
  });
});

// ✅ CORRECT - Using relative start
caption.words.forEach(word => {
  childrenData.push({
    context: {
      timing: {
        start: word.start,          // ✅ CORRECT!
      }
    }
  });
});
```

### ❌ Mistake 3: Mixing Relative and Absolute

```typescript
// ❌ WRONG - Inconsistent timing approach
{
  id: 'parent',
  context: {
    timing: { start: 0, duration: 20 }
  },
  childrenData: [
    {
      id: 'child-1',
      context: {
        timing: { start: 2 }  // Relative (correct)
      }
    },
    {
      id: 'child-2',
      context: {
        timing: { start: 15 }  // User thinks this is absolute (wrong mindset)
      }
    }
  ]
}
```

**Problem:** Both are relative, but user intended child-2 to appear at absolute 15s. It will actually appear at 15s relative to parent.

## Effect Timing (Also Relative!)

**Effects also use relative timing:**

```typescript
{
  id: 'text-component',
  context: {
    timing: {
      start: 5,      // Component appears at 5s relative to parent
      duration: 10,
    }
  },
  effects: [{
    id: 'fade-in',
    data: {
      start: 0,      // ✅ Effect starts 0s after component starts
      duration: 2,   // Effect lasts 2 seconds
      // Effect plays from 5s-7s in parent's timeline
    }
  }]
}
```

**NOT:**
```typescript
effects: [{
  data: {
    start: 5,      // ❌ WRONG if you mean "start with component"
  }
}]
```

## Decision Tree

### Question: Should I use `absoluteStart` or `start`?

**For parent container `context.timing`:**
- ✅ Use `absoluteStart` from caption/audio data
- ✅ This anchors the container to the correct video position

**For child component `context.timing`:**
- ✅ ALWAYS use `start` (relative to parent)
- ❌ NEVER use `absoluteStart` (this is for reference only)

**For effect `data.start`:**
- ✅ ALWAYS use relative timing
- ✅ 0 = starts with component
- ✅ N = starts N seconds after component starts

## Architectural Planning

### timingStrategy in Architect Output

When the Architect agent creates a plan, the `timingStrategy` field MUST explain **relative timing**:

✅ **CORRECT timingStrategy:**
```json
{
  "timingStrategy": "All child components use timing relative to their parent containers. Parent caption container positioned at absoluteStart, child words use relative start values."
}
```

❌ **WRONG timingStrategy:**
```json
{
  "timingStrategy": "Components positioned at specific video timestamps (10s, 15s, 20s)."
}
```

### Tech Lead Validation

The Tech Lead agent MUST REJECT plans that suggest absolute timing:

- ✅ APPROVE: "timing relative to parent"
- ✅ APPROVE: "child start times are relative to container"
- ❌ REJECT: "positioned at video timestamps"
- ❌ REJECT: "absolute timing"
- ❌ REJECT: "starts at 10s in video"

## Formula for Debugging

If you need to calculate where a component appears in the video:

```
Component Absolute Start (video) = 
  Grandparent Start + Parent Relative Start + Component Relative Start

Component Absolute End (video) = 
  Component Absolute Start + Component Duration
```

**Example:**
```
Grandparent: start: 5
Parent: start: 2 (relative)
Child: start: 3 (relative)

Child Absolute Start = 5 + 2 + 3 = 10s
Child with duration: 4 = 10s-14s in video
```

## Best Practices

1. **Think in Layers:** Each component has its own timeline starting at 0
2. **Parent Anchoring:** Only the topmost parent uses absolute positioning
3. **Child Relativity:** All children are relative to their immediate parent
4. **Document Intent:** Use comments to clarify timing calculations
5. **Test Nesting:** Verify deeply nested components appear at correct video times

## Summary

**FOR GENERATOR AGENTS:**

1. ⚠️ **ALWAYS** use relative timing for child components
2. ⚠️ **NEVER** use absolute video timestamps for nested children
3. ⚠️ **ONLY** use `absoluteStart` to position the root parent container
4. ⚠️ **ALWAYS** use `start` (relative) for children and effects
5. ⚠️ **REJECT** plans that suggest absolute timing for nested structures

**When you see timing values in caption/audio data:**
- `absoluteStart` = Use for **parent container** position
- `start` = Use for **child component** position (already relative)

**This rule is non-negotiable. All timing calculations must be relative to the parent component.**

