# LottieAtom Documentation

## Overview

`LottieAtom` is used to display Lottie animations (JSON-based animations) with support for local and remote Lottie JSON files. It includes playback rate control, direction control, loop functionality, and custom styling.

## When to Use

- Displaying animated icons and graphics
- Creating animated UI elements
- Adding animated decorations
- Building animated showcases
- Implementing animated transitions

## Parameters

### `src` (required)

- **Type:** `string`
- **Description:** Lottie JSON source URL or local file path
- **Examples:**
  - Local file: `"animation.json"`
  - Remote URL: `"https://assets.lottiefiles.com/animation.json"`
- **Usage:**
  - Local files are automatically handled using `staticFile()`
  - Remote URLs are fetched with CORS support
- **Format:** Must be a valid Lottie JSON file

### `style` (optional)

- **Type:** `Record<string, any>` (CSS styles object)
- **Description:** Inline CSS styles applied to the Lottie animation container
- **Common Properties:**
  - `width`: Animation width (e.g., `'200px'`, `200`)
  - `height`: Animation height (e.g., `'200px'`, `200`)
  - `position`: Positioning (e.g., `'absolute'`, `'relative'`)
  - `top`, `left`, `right`, `bottom`: Position values
  - `opacity`: Opacity from `0` to `1`
  - `transform`: Transforms like `'scale(1.2)'`, `'rotate(45deg)'`
- **Example:**
  ```typescript
  style: {
    width: 200,
    height: 200,
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  }
  ```

### `className` (optional)

- **Type:** `string`
- **Description:** CSS class names applied to the Lottie animation container
- **Common Classes:**
  - `"w-full h-full"`: Full width and height
  - `"absolute inset-0"`: Absolute positioning
- **Example:** `"w-full h-full"`

### `loop` (optional)

- **Type:** `boolean`
- **Description:** Whether to loop the animation. Note: Loop behavior is primarily controlled by Remotion's timeline, not the Lottie file's loop setting.
- **Default:** `false`
- **Best Practice:** Use Remotion's timing context to control loop duration

### `playbackRate` (optional)

- **Type:** `number`
- **Description:** Playback speed multiplier
  - `1` = normal speed
  - `2` = 2x speed (faster)
  - `0.5` = half speed (slower)
- **Default:** `1`
- **Example:** `1.5` (1.5x speed)

### `direction` (optional)

- **Type:** `'forward' | 'reverse'`
- **Description:** Animation playback direction
  - `'forward'`: Play animation forward (default)
  - `'reverse'`: Play animation in reverse
- **Default:** `'forward'`
- **Example:** `'reverse'` for reverse playback

## Usage Examples

### Basic Lottie Animation

```typescript
{
  id: 'lottie-1',
  componentId: 'LottieAtom',
  type: 'atom' as const,
  data: {
    src: 'animation.json',
    style: {
      width: 200,
      height: 200,
    },
  },
  context: {
    timing: {
      start: 0,
      duration: 5,
    },
  },
}
```

### Remote Lottie Animation

```typescript
{
  id: 'lottie-remote',
  componentId: 'LottieAtom',
  type: 'atom' as const,
  data: {
    src: 'https://assets.lottiefiles.com/packages/lf20_abc123.json',
    style: {
      width: 300,
      height: 300,
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    },
  },
  context: {
    timing: {
      start: 0,
      duration: 10,
    },
  },
}
```

### Lottie with Playback Control

```typescript
{
  id: 'lottie-controlled',
  componentId: 'LottieAtom',
  type: 'atom' as const,
  data: {
    src: 'animation.json',
    playbackRate: 1.5,  // 1.5x speed
    direction: 'forward',
    style: {
      width: 200,
      height: 200,
    },
  },
  context: {
    timing: {
      start: 0,
      duration: 5,
    },
  },
}
```

### Reverse Lottie Animation

```typescript
{
  id: 'lottie-reverse',
  componentId: 'LottieAtom',
  type: 'atom' as const,
  data: {
    src: 'animation.json',
    direction: 'reverse',
    playbackRate: 1,
    style: {
      width: 200,
      height: 200,
    },
  },
  context: {
    timing: {
      start: 0,
      duration: 5,
    },
  },
}
```

### Lottie with Positioning

```typescript
{
  id: 'lottie-positioned',
  componentId: 'LottieAtom',
  type: 'atom' as const,
  data: {
    src: 'icon.json',
    className: 'absolute inset-0',
    style: {
      width: 180,
      height: 180,
      position: 'absolute',
      top: '20%',
      left: '50%',
      transform: 'translateX(-50%)',
      opacity: 0.9,
    },
  },
  context: {
    timing: {
      start: 0,
      duration: 4,
    },
  },
}
```

## Real-World Examples from Presets

### From `lottie-showcase.ts`

Shows Lottie in a showcase with effects:

```typescript
{
  type: 'atom',
  id: `lottie-${index}`,
  componentId: 'LottieAtom',
  context: {
    timing: { start: startTime, duration },
  },
  effects,
  data: {
    src: item.src,
    playbackRate: item.playbackRate || 1,
    style: {
      position: 'absolute',
      ...positionStyle,
      width: size,
      height: size,
    },
  } as LottieAtomDataProps,
}
```

This example shows:

- Dynamic positioning based on layout (grid, horizontal, vertical, circular)
- Custom size per item
- Playback rate control
- Entry animations via effects
- Staggered timing

## Best Practices

1. **Always specify dimensions** in `style` (width and height) for predictable sizing
2. **Use remote Lottie files** from reliable CDNs (LottieFiles, etc.)
3. **Test animation loading** - remote files may have CORS issues
4. **Use `playbackRate`** to speed up or slow down animations
5. **Use `direction: 'reverse'`** for reverse playback effects
6. **Position with `style`** - use absolute positioning for precise placement
7. **Combine with effects** - add fade, scale, or other effects for entry/exit animations
8. **Use appropriate duration** - match animation duration to Lottie file's natural duration
9. **Optimize file size** - large Lottie files can impact performance
10. **Handle loading states** - the atom shows a loading state while fetching remote files

## Loading Behavior

The `LottieAtom` handles loading as follows:

1. **Local files:** Loaded immediately via `staticFile()`
2. **Remote files:**
   - Fetched with CORS support
   - Shows loading state while fetching
   - Displays error state if fetch fails
   - Validates JSON structure

## Error Handling

If a Lottie file fails to load:

- The atom displays an error indicator
- Console warning is logged
- Animation container shows error styling (red border, dashed)

## Common Lottie Sources

Popular sources for Lottie animations:

- **LottieFiles:** `https://assets.lottiefiles.com/`
- **LottieFiles Packages:** `https://assets.lottiefiles.com/packages/`
- **Custom CDN:** Your own hosted Lottie files

## Playback Rate Guidelines

- **Normal speed:** `1.0`
- **Slightly faster:** `1.1` - `1.5` (subtle speedup)
- **Fast:** `1.5` - `2.0` (noticeable speedup)
- **Slow motion:** `0.5` - `0.75` (slower playback)
- **Very slow:** `0.25` - `0.5` (dramatic slowdown)

## Direction Use Cases

### Forward (default)

- Normal animation playback
- Entry animations
- Standard effects

### Reverse

- Exit animations
- Undo effects
- Rewind animations
- Symmetrical transitions

## Helper Functions

The `LottieAtom` exports `LottieDataHelper` with utility functions:

- `isValidSource(src)`: Validate Lottie source URL format

  ```typescript
  LottieDataHelper.isValidSource('animation.json'); // true
  LottieDataHelper.isValidSource('https://example.com/animation.json'); // true
  ```

- `getEffectivePlaybackRate(data)`: Calculate effective playback rate considering direction
  ```typescript
  LottieDataHelper.getEffectivePlaybackRate({
    playbackRate: 1.5,
    direction: 'reverse',
  }); // Returns -1.5
  ```

## Integration with Effects

Lottie animations work well with effects:

```typescript
{
  id: 'lottie-with-effects',
  componentId: 'LottieAtom',
  type: 'atom' as const,
  data: {
    src: 'animation.json',
    style: { width: 200, height: 200 },
  },
  effects: [
    {
      id: 'fade-in',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: 1,
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    },
  ],
  context: {
    timing: {
      start: 0,
      duration: 5,
    },
  },
}
```
