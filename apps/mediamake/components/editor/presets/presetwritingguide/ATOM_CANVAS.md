# CanvasAtom Documentation

## Overview

`CanvasAtom` provides a raw HTML canvas element for custom drawing operations and advanced visual effects. It's primarily used by canvas-based effect components for glitch effects, particle effects, wipe reveals, and other custom visual manipulations.

## When to Use

- Creating custom canvas-based effects
- Implementing advanced visual effects (glitch, particles, etc.)
- Building custom drawing operations
- Creating procedural graphics
- Implementing image manipulation effects

**Note:** `CanvasAtom` is typically used indirectly through effect components rather than directly in presets. The canvas experimental presets (`glitch-effect`, `particle-effect`, `wipe-reveal`, `content-aware-reveal`) use canvas-based effects that internally use `CanvasAtom`.

## Parameters

### `className` (optional)

- **Type:** `string`
- **Description:** CSS class names applied to the canvas element
- **Example:** `"w-full h-full"`

### `style` (optional)

- **Type:** `Record<string, any>` (CSS styles object)
- **Description:** Inline CSS styles applied to the canvas element
- **Common Properties:**
  - `width`: Canvas width
  - `height`: Canvas height
  - `position`: Positioning (e.g., `'absolute'`, `'relative'`)
- **Example:**
  ```typescript
  style: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  }
  ```

## Usage Examples

### Basic Canvas

```typescript
{
  id: 'canvas-1',
  componentId: 'CanvasAtom',
  type: 'atom' as const,
  data: {
    className: 'w-full h-full',
    style: {
      position: 'absolute',
    },
  },
}
```

## Real-World Examples from Presets

### Canvas Experimental Presets

The canvas experimental presets use canvas-based effects that internally utilize `CanvasAtom`:

#### From `glitch-effect.ts`

Creates a glitch effect component:

```typescript
{
  id: trackId,
  componentId: 'effect-CanvasGlitchEffect',
  type: 'layout' as const,
  data: {
    imageUrl,
    fit,
    backgroundColor,
    glitchType,
    intensity,
    frequency,
    continuous,
    glitchStartFrame: Math.round(glitchStartTime * fps),
    glitchEndFrame: glitchEndTime === -1 ? -1 : Math.round(glitchEndTime * fps),
    durationInFrames: Math.round(duration * fps),
  },
}
```

#### From `particle-effect.ts`

Creates a particle effect component:

```typescript
{
  id: trackId,
  componentId: 'effect-CanvasParticleEffect',
  type: 'layout' as const,
  data: {
    imageUrl,
    fit,
    backgroundColor,
    particleCount,
    particleSize,
    particleEffect,
    assembleFrom,
    speed,
    rotation,
    revealDurationInFrames: Math.round(revealDuration * fps),
  },
}
```

#### From `wipe-reveal.ts`

Creates a wipe reveal effect component:

```typescript
{
  id: trackId,
  componentId: 'effect-CanvasWipeReveal',
  type: 'layout' as const,
  data: {
    imageUrl,
    fit,
    backgroundColor,
    revealType,
    edgeStyle,
    angle: wipeAngle,
    revealDurationInFrames: Math.round(revealDuration * fps),
    ...(edgeWaviness !== undefined && { edgeWaviness }),
    ...(edgeFrequency !== undefined && { edgeFrequency }),
    ...(burnGlow !== undefined && { burnGlow }),
    ...(burnGlowColor !== undefined && { burnGlowColor }),
    ...(burnGlowIntensity !== undefined && { burnGlowIntensity }),
  },
}
```

## Best Practices

1. **Use through effect components** - `CanvasAtom` is typically used indirectly through canvas-based effect components
2. **Set canvas dimensions** - Always specify width and height in style
3. **Use absolute positioning** - For overlays and effects, use `position: 'absolute'`
4. **Handle canvas context** - Effect components handle the canvas 2D context internally
5. **Optimize performance** - Canvas operations can be performance-intensive, use with care

## Canvas Effect Components

The following effect components use `CanvasAtom` internally:

### `effect-CanvasGlitchEffect`

- **Purpose:** Apply glitch effects to images
- **Types:** RGB shift, slice, corrupt, static, scan
- **Parameters:**
  - `glitchType`: Type of glitch effect
  - `intensity`: Glitch intensity
  - `frequency`: Glitch frequency (0-1)
  - `continuous`: Continuous vs periodic glitch
  - `glitchStartFrame`, `glitchEndFrame`: Frame range for glitch

### `effect-CanvasParticleEffect`

- **Purpose:** Particle-based image animations
- **Types:** Assemble, disassemble, explode, pixelate
- **Parameters:**
  - `particleCount`: Number of particles
  - `particleSize`: Size of particles
  - `particleEffect`: Type of particle effect
  - `assembleFrom`: Assembly direction (center, edges, random, bottom)
  - `speed`: Speed multiplier
  - `rotation`: Add particle rotation

### `effect-CanvasWipeReveal`

- **Purpose:** Wipe or radial reveal effects
- **Types:** Wipe, radial
- **Edge Styles:** Straight, organic, burn
- **Parameters:**
  - `revealType`: Type of reveal (wipe, radial)
  - `edgeStyle`: Edge style (straight, organic, burn)
  - `angle`: Wipe angle (0 = left-to-right)
  - `edgeWaviness`: Edge waviness (for organic style)
  - `edgeFrequency`: Edge frequency (for organic style)
  - `burnGlow`, `burnGlowColor`, `burnGlowIntensity`: Burn effect options

### `effect-CanvasContentAwareReveal`

- **Purpose:** Content-aware reveal effects
- **Parameters:** Similar to wipe reveal with content-aware algorithms

## Direct Canvas Usage

If you need to use `CanvasAtom` directly (not recommended for most use cases):

```typescript
{
  id: 'custom-canvas',
  componentId: 'CanvasAtom',
  type: 'atom' as const,
  data: {
    className: 'w-full h-full',
    style: {
      position: 'absolute',
      width: '100%',
      height: '100%',
    },
  },
}
```

**Note:** Direct usage requires manual canvas context manipulation, which is complex and typically handled by effect components.

## Integration with Presets

Canvas effects are typically integrated like this:

```typescript
{
  id: trackId,
  componentId: 'BaseLayout',
  type: 'layout' as const,
  data: {
    containerProps: { className: 'absolute inset-0' },
  },
  childrenData: [
    {
      id: trackId,
      componentId: 'effect-CanvasGlitchEffect',  // Canvas-based effect
      type: 'layout' as const,
      data: {
        // Effect-specific parameters
      },
    },
  ],
}
```

## Performance Considerations

1. **Canvas operations are CPU-intensive** - Use sparingly
2. **Optimize particle counts** - Lower particle counts improve performance
3. **Use appropriate frame rates** - Canvas effects may require lower FPS
4. **Cache canvas operations** - Effect components handle caching internally
5. **Limit concurrent canvas effects** - Multiple canvas effects can impact performance

## Common Use Cases

1. **Glitch Effects:** Apply digital glitch effects to images
2. **Particle Animations:** Create particle-based reveal effects
3. **Wipe Transitions:** Implement wipe and radial reveal transitions
4. **Content-Aware Effects:** Apply content-aware image manipulations
5. **Custom Drawing:** Create custom procedural graphics

## When NOT to Use CanvasAtom Directly

- **Simple image display:** Use `ImageAtom` instead
- **Video playback:** Use `VideoAtom` instead
- **Text rendering:** Use `TextAtom` instead
- **Basic animations:** Use effects on other atoms instead

Use `CanvasAtom` (through effect components) only when you need:

- Custom image manipulation
- Procedural graphics
- Advanced visual effects
- Canvas-specific operations
