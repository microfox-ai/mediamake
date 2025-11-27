# HTMLBlockAtom Documentation

## Overview

`HTMLBlockAtom` is used to render raw HTML content using `dangerouslySetInnerHTML`. It allows you to inject custom HTML, CSS, and JavaScript into compositions, making it useful for SVG definitions, clip paths, custom styled overlays, and third-party HTML widgets.

## When to Use

- Injecting custom HTML/CSS/JS into compositions
- Adding SVG definitions and clip paths
- Creating custom styled HTML overlays
- Embedding third-party HTML widgets
- Adding HTML-based visual elements

## Parameters

### `html` (required)

- **Type:** `string`
- **Description:** Raw HTML string to render
- **Examples:**
  - Simple HTML: `"<div>Hello World</div>"`
  - SVG: `"<svg>...</svg>"`
  - Complex HTML: `"<div class='custom'><span>Content</span></div>"`
- **Security Note:** This uses `dangerouslySetInnerHTML`, so ensure HTML is sanitized if from user input

### `className` (optional)

- **Type:** `string`
- **Description:** CSS class names applied to the HTML container div
- **Common Classes:**
  - `"w-full h-full"`: Full width and height
  - `"absolute inset-0"`: Absolute positioning
  - `"flex items-center justify-center"`: Flexbox centering
- **Example:** `"w-full h-full flex items-center justify-center"`

### `style` (optional)

- **Type:** `React.CSSProperties`
- **Description:** Inline CSS styles applied to the HTML container div
- **Common Properties:**
  - `position`: Positioning (e.g., `'absolute'`, `'relative'`)
  - `top`, `left`, `right`, `bottom`: Position values
  - `width`, `height`: Dimensions
  - `backgroundColor`: Background color
  - `opacity`: Opacity from `0` to `1`
  - `zIndex`: Z-index for layering
- **Example:**
  ```typescript
  style: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  }
  ```

## Usage Examples

### Basic HTML Block

```typescript
{
  id: 'html-1',
  componentId: 'HTMLBlockAtom',
  type: 'atom' as const,
  data: {
    html: '<div>Hello World</div>',
    className: 'w-full h-full flex items-center justify-center',
  },
  context: {
    timing: {
      start: 0,
      duration: 5,
    },
  },
}
```

### SVG Definitions

```typescript
{
  id: 'svg-defs',
  componentId: 'HTMLBlockAtom',
  type: 'atom' as const,
  data: {
    html: `
      <svg style="position: absolute; width: 0; height: 0;">
        <defs>
          <clipPath id="custom-clip">
            <circle cx="50%" cy="50%" r="40%"/>
          </clipPath>
        </defs>
      </svg>
    `,
    className: 'absolute inset-0',
    style: {
      pointerEvents: 'none',
    },
  },
  context: {
    timing: {
      start: 0,
      duration: 30,  // Available for entire composition
    },
  },
}
```

### Styled HTML Overlay

```typescript
{
  id: 'html-overlay',
  componentId: 'HTMLBlockAtom',
  type: 'atom' as const,
  data: {
    html: `
      <div style="
        background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%);
        width: 100%;
        height: 100%;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 40px;
      ">
        <h1 style="color: white; font-size: 48px; text-align: center;">
          Custom Overlay
        </h1>
      </div>
    `,
    className: 'absolute inset-0',
  },
  context: {
    timing: {
      start: 5,
      duration: 10,
    },
  },
}
```

### HTML with Inline Styles

```typescript
{
  id: 'html-styled',
  componentId: 'HTMLBlockAtom',
  type: 'atom' as const,
  data: {
    html: `
      <div class="custom-block">
        <span style="color: #FF0000; font-size: 24px;">Red Text</span>
        <span style="color: #0000FF; font-size: 24px;">Blue Text</span>
      </div>
    `,
    className: 'w-full h-full flex items-center justify-center',
    style: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      padding: '20px',
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

## Real-World Examples from Presets

### From `htmlBlockAtom.ts` Preset

The preset creates HTML blocks at specific time ranges:

```typescript
{
  id: `${trackName}-html-block-${index}`,
  componentId: 'BaseLayout',  // Note: Uses BaseLayout, not HTMLBlockAtom directly
  type: 'layout' as const,
  data: {
    containerProps: {
      className: `${className ? className : 'w-full h-full flex items-center justify-center'}`,
      style: style || {},
    },
  },
  context: {
    timing: {
      start: start,
      duration: duration,
    },
  },
}
```

**Note:** The `htmlBlockAtom` preset uses `BaseLayout` with container props, but you can use `HTMLBlockAtom` directly for raw HTML injection.

## Best Practices

1. **Sanitize HTML** - If HTML comes from user input, sanitize it to prevent XSS attacks
2. **Use for specific needs** - Only use when you need raw HTML (SVG defs, custom HTML, etc.)
3. **Combine with styling** - Use `className` and `style` for container styling
4. **Position carefully** - Use absolute positioning for overlays
5. **Set z-index** - Use `style.zIndex` for proper layering
6. **Use for SVG definitions** - Perfect for SVG `<defs>` that need to be available globally
7. **Avoid complex JavaScript** - Keep HTML simple; use effects for animations
8. **Test rendering** - HTML rendering can vary, test thoroughly

## Common Use Cases

### 1. SVG Definitions and Clip Paths

```typescript
{
  id: 'svg-defs',
  componentId: 'HTMLBlockAtom',
  type: 'atom' as const,
  data: {
    html: `
      <svg style="position: absolute; width: 0; height: 0;">
        <defs>
          <clipPath id="circle-clip">
            <circle cx="50%" cy="50%" r="45%"/>
          </clipPath>
          <linearGradient id="custom-gradient">
            <stop offset="0%" stop-color="#FF0000"/>
            <stop offset="100%" stop-color="#0000FF"/>
          </linearGradient>
        </defs>
      </svg>
    `,
    className: 'absolute inset-0',
    style: { pointerEvents: 'none' },
  },
}
```

### 2. Custom HTML Overlays

```typescript
{
  id: 'custom-overlay',
  componentId: 'HTMLBlockAtom',
  type: 'atom' as const,
  data: {
    html: `
      <div class="overlay-content">
        <h1>Custom Title</h1>
        <p>Custom description</p>
      </div>
    `,
    className: 'absolute inset-0 flex items-center justify-center',
    style: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 10,
    },
  },
}
```

### 3. Third-Party Widgets

```typescript
{
  id: 'widget',
  componentId: 'HTMLBlockAtom',
  type: 'atom' as const,
  data: {
    html: `
      <div id="third-party-widget">
        <!-- Third-party widget HTML -->
      </div>
    `,
    className: 'absolute inset-0',
  },
}
```

## Security Considerations

⚠️ **Important:** `HTMLBlockAtom` uses `dangerouslySetInnerHTML`, which can be a security risk if HTML comes from untrusted sources.

**Best Practices:**

1. **Sanitize user input** - Use a library like DOMPurify
2. **Validate HTML** - Ensure HTML is valid and safe
3. **Avoid user-generated HTML** - Prefer predefined HTML templates
4. **Test thoroughly** - Verify HTML doesn't break the composition

## Integration with Effects

HTML blocks can be animated with effects:

```typescript
{
  id: 'html-animated',
  componentId: 'HTMLBlockAtom',
  type: 'atom' as const,
  data: {
    html: '<div>Animated Content</div>',
    className: 'w-full h-full',
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

## Limitations

1. **No React components** - HTML is rendered as raw HTML, not React components
2. **Limited interactivity** - JavaScript in HTML may not work as expected
3. **Styling conflicts** - Inline styles in HTML may conflict with container styles
4. **Performance** - Complex HTML can impact performance

## When NOT to Use HTMLBlockAtom

- **Simple text:** Use `TextAtom` instead
- **Images:** Use `ImageAtom` instead
- **Videos:** Use `VideoAtom` instead
- **React components:** Use proper React components instead

Use `HTMLBlockAtom` only when you need:

- Raw HTML injection
- SVG definitions
- Custom HTML overlays
- Third-party HTML widgets
