# What NOT to Do in MediaMake Presets

This document outlines critical anti-patterns and forbidden practices when creating presets in MediaMake. **Violating these rules will cause your presets to fail or behave incorrectly.**

## ❌ NEVER Use CSS Keyframes

**DO NOT** use CSS `@keyframes` animations in your presets. MediaMake uses an effects-based animation system, not CSS keyframes.

### ❌ WRONG - Using CSS Keyframes:

```typescript
// NEVER DO THIS
containerProps: {
  dangerouslySetInnerHTML: {
    __html: `
      <style>
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      </style>
    `,
  },
  style: {
    animation: 'fadeIn 2s ease-in-out',
  },
}
```

### ✅ CORRECT - Using Effects:

```typescript
// Use the generic effect system instead
effects: [
  {
    id: 'fade-in-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: 2,
      mode: 'provider',
      targetIds: ['my-component'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  },
];
```

## ❌ NEVER Use dangerouslySetInnerHTML on BaseLayout

**DO NOT** use `dangerouslySetInnerHTML` on `BaseLayout` components. This is a security risk and breaks the component system.

### ❌ WRONG - Using dangerouslySetInnerHTML:

```typescript
{
  id: 'style-container',
  type: 'layout',
  componentId: 'BaseLayout',
  data: {
    containerProps: {
      dangerouslySetInnerHTML: {
        __html: '<style>...</style>',
      },
    },
  },
}
```

### ✅ CORRECT - Use Effects Instead:

All animations and styling should be done through the effects system. If you need to style components, use inline styles in the `style` property of component data, or apply effects.

```typescript
{
  id: 'my-component',
  type: 'atom',
  componentId: 'TextAtom',
  data: {
    text: 'Hello',
    style: {
      color: '#ffffff',
      fontSize: '24px',
    },
  },
  effects: [
    {
      id: 'fade-effect',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: 1,
        mode: 'provider',
        targetIds: ['my-component'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    },
  ],
}
```

## ❌ NEVER Use CSS Animation Property

**DO NOT** use the CSS `animation` property in inline styles. This bypasses the effects system.

### ❌ WRONG:

```typescript
style: {
  animation: 'slideIn 2s ease-out',
}
```

### ✅ CORRECT - Use Effects:

```typescript
effects: [
  {
    id: 'slide-in-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: 2,
      mode: 'provider',
      targetIds: ['my-component'],
      ranges: [
        { key: 'translateX', val: -100, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    },
  },
];
```

## ❌ NEVER Use 'wrapper' Mode for Effects

**DO NOT** use `mode: 'wrapper'` for effects. This creates a new wrapper div that breaks your layout structure and interferes with your intended component hierarchy.

### ❌ WRONG - Using wrapper mode:

```typescript
// NEVER DO THIS - wrapper mode creates extra divs
effects: [
  {
    id: 'fade-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: 1,
      mode: 'wrapper', // ❌ WRONG - creates wrapper div
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  },
],
```

### ✅ CORRECT - Always use provider mode with targetIds:

```typescript
// ALWAYS use provider mode with targetIds
effects: [
  {
    id: 'fade-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: 1,
      mode: 'provider', // ✅ CORRECT
      targetIds: ['my-component-id'], // ✅ REQUIRED - target the component directly
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  },
],
```

### Why Provider Mode?

- **No wrapper divs**: Effects are applied directly to the target component
- **Preserves layout structure**: Your component hierarchy remains intact
- **Better performance**: No unnecessary DOM elements
- **Cleaner code**: Direct targeting is more explicit and maintainable

### When to Use targetIds:

- **Target the component itself**: Use the component's `id` when applying effects to it
- **Target parent containers**: Use the parent's `id` when applying effects to a layout container
- **Target child components**: Use child component `id`s when applying effects from a parent

### Example - Effect on Component:

```typescript
{
  id: 'my-text',
  type: 'atom',
  componentId: 'TextAtom',
  data: { text: 'Hello' },
  effects: [
    {
      id: 'fade-in',
      componentId: 'generic',
      data: {
        mode: 'provider',
        targetIds: ['my-text'], // Target this component
        // ...
      },
    },
  ],
}
```

### Example - Effect on Parent Container:

```typescript
{
  id: 'container',
  type: 'layout',
  componentId: 'BaseLayout',
  effects: [
    {
      id: 'fade-container',
      componentId: 'generic',
      data: {
        mode: 'provider',
        targetIds: ['container'], // Target this container
        // ...
      },
    },
  ],
  childrenData: [/* children */],
}
```

## ✅ ALWAYS Use Effects for Animations

**ALWAYS** use the effects system for all animations and transitions. MediaMake provides a powerful effects system that handles all animation needs.

### Available Effect Types:

1. **Generic Effects** (`componentId: 'generic'`)
   - Keyframe-based animations using `ranges`
   - Supports any CSS property
   - Easing types: `linear`, `ease-in`, `ease-out`, `ease-in-out`, `spring`

2. **Built-in Effects**
   - `pan` - Camera panning
   - `zoom` - Scale animations
   - `shake` - Shake effects
   - `blur` - Blur filters
   - `waveform` - Audio-reactive effects

3. **Internal Effect Presets**
   - Reusable effect modules from `registry/internalEffects/`
   - Call via `props.presets[effectPresetId]()`

### Effect Structure:

```typescript
{
  id: 'effect-id',
  componentId: 'generic', // or 'pan', 'zoom', 'waveform', etc.
  data: {
    type: 'ease-out',
    start: 0,
    duration: 2,
    mode: 'provider', // ALWAYS use provider mode
    targetIds: ['component-id'], // REQUIRED - target the component directly
    ranges: [ // For generic effects
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  },
}
```

## Summary

- ✅ **DO**: Use effects for all animations
- ✅ **DO**: Use `mode: 'provider'` with `targetIds` for all effects
- ✅ **DO**: Use inline styles for static styling
- ✅ **DO**: Use the generic effect system for custom animations
- ❌ **DON'T**: Use CSS `@keyframes`
- ❌ **DON'T**: Use `dangerouslySetInnerHTML` on BaseLayout
- ❌ **DON'T**: Use CSS `animation` property
- ❌ **DON'T**: Inject `<style>` tags
- ❌ **DON'T**: Use `mode: 'wrapper'` for effects (creates unwanted wrapper divs)

Remember: **Effects with provider mode and targetIds** for all animations in MediaMake presets. This preserves your layout structure and prevents unwanted wrapper divs.
