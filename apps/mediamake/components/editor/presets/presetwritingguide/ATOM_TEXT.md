# TextAtom Documentation

## Overview

`TextAtom` is used to display text with advanced typography features including dynamic Google Font loading, gradient text effects, loading states, and comprehensive styling options.

## When to Use

- Displaying titles, captions, and subtitles
- Creating animated text overlays
- Building dynamic typography effects
- Adding text with custom fonts
- Creating gradient text effects

## Parameters

### `text` (required)

- **Type:** `string`
- **Description:** The text content to display
- **Example:** `"Hello World"` or `"Welcome to the Show"`

### `style` (optional)

- **Type:** `React.CSSProperties`
- **Description:** Inline CSS styles applied to the text element
- **Common Properties:**
  - `fontSize`: Text size (e.g., `'48px'`, `250`)
  - `color`: Text color (e.g., `'#FFFFFF'`, `'rgba(255,255,255,0.9)'`)
  - `fontWeight`: Font weight (e.g., `'400'`, `'700'`, `'bold'`)
  - `letterSpacing`: Letter spacing (e.g., `'10px'`, `60`)
  - `textTransform`: Text transformation (e.g., `'uppercase'`, `'lowercase'`, `'capitalize'`)
  - `textAlign`: Text alignment (e.g., `'center'`, `'left'`, `'right'`)
  - `lineHeight`: Line height (e.g., `'1.5'`, `'120%'`)
  - `textShadow`: Text shadow (e.g., `'2px 2px 4px rgba(0,0,0,0.8)'`)
  - `marginBottom`, `marginTop`, etc.: Spacing
- **Example:**
  ```typescript
  style: {
    fontSize: 48,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 10,
    textTransform: 'uppercase',
  }
  ```

### `className` (optional)

- **Type:** `string`
- **Description:** CSS class names applied to the text container
- **Common Classes:**
  - `"rounded-xl"`: Rounded corners
  - `"px-12 py-4"`: Padding
  - `"bg-black/30"`: Background with opacity
  - `"backdrop-blur-sm"`: Backdrop blur effect
- **Example:** `"bg-black/30 px-12 py-4 rounded-xl backdrop-blur-sm"`

### `gradient` (optional)

- **Type:** `string`
- **Description:** CSS gradient string for gradient text effect. When provided, the text color becomes transparent and the gradient is applied as the background.
- **Format:** Valid CSS gradient string
- **Examples:**
  - `"linear-gradient(90deg, #FF0000, #0000FF)"`
  - `"linear-gradient(to right, red, blue)"`
  - `"radial-gradient(circle, #FF0000, #0000FF)"`
- **Note:** When using gradient, the `color` property in `style` is ignored (text becomes transparent)

### `font` (optional)

- **Type:** `FontConfig` object
- **Description:** Google Font configuration for dynamic font loading
- **Properties:**
  - `family` (required): Font family name (e.g., `'Inter'`, `'Roboto'`, `'ProtestRevolution'`)
  - `weights` (optional): Array of font weights to load (e.g., `['400', '700']`)
  - `subsets` (optional): Font subsets (default: `['latin']`)
  - `display` (optional): Font display strategy (default: `'swap'`)
    - Options: `'auto'`, `'block'`, `'swap'`, `'fallback'`, `'optional'`
  - `preload` (optional): Whether to preload the font (default: `true`)
- **Example:**
  ```typescript
  font: {
    family: 'Inter',
    weights: ['100', '400', '700'],
    subsets: ['latin'],
    display: 'swap',
    preload: true,
  }
  ```

### `fallbackFonts` (optional)

- **Type:** `string[]`
- **Description:** Array of fallback font families to use if the primary font fails to load
- **Example:** `['Arial', 'sans-serif']`
- **Note:** This is typically handled automatically by the font loading system

### `loadingState` (optional)

- **Type:** `LoadingState` object
- **Description:** Configuration for loading state display while font is loading
- **Properties:**
  - `showLoadingIndicator` (optional): Whether to show loading indicator (default: `false`)
  - `loadingText` (optional): Text to show while loading (default: `'Loading...'`)
  - `loadingStyle` (optional): Styles for loading text
- **Example:**
  ```typescript
  loadingState: {
    showLoadingIndicator: true,
    loadingText: 'Loading font...',
    loadingStyle: { opacity: 0.5 },
  }
  ```

### `errorState` (optional)

- **Type:** `ErrorState` object
- **Description:** Configuration for error state display if font fails to load
- **Properties:**
  - `showErrorIndicator` (optional): Whether to show error indicator (default: `false`)
  - `errorText` (optional): Text to show on error (default: uses `text` prop)
  - `errorStyle` (optional): Styles for error text
- **Example:**
  ```typescript
  errorState: {
    showErrorIndicator: true,
    errorText: 'Font failed to load',
    errorStyle: { color: 'red' },
  }
  ```

## Usage Examples

### Basic Text

```typescript
{
  id: 'text-1',
  componentId: 'TextAtom',
  type: 'atom' as const,
  data: {
    text: 'Hello World',
    style: {
      fontSize: 48,
      color: '#FFFFFF',
      fontWeight: 'bold',
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

### Text with Google Font

```typescript
{
  id: 'text-font',
  componentId: 'TextAtom',
  type: 'atom' as const,
  data: {
    text: 'Styled Text',
    style: {
      fontSize: 64,
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    font: {
      family: 'Inter',
      weights: ['400', '700'],
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

### Gradient Text

```typescript
{
  id: 'text-gradient',
  componentId: 'TextAtom',
  type: 'atom' as const,
  data: {
    text: 'Gradient Text',
    style: {
      fontSize: 72,
      fontWeight: 'bold',
    },
    gradient: 'linear-gradient(90deg, #FF0000, #0000FF)',
  },
  context: {
    timing: {
      start: 0,
      duration: 5,
    },
  },
}
```

### Styled Text with Background

```typescript
{
  id: 'text-boxed',
  componentId: 'TextAtom',
  type: 'atom' as const,
  data: {
    text: 'Boxed Text',
    className: 'bg-black/30 px-12 py-4 rounded-xl backdrop-blur-sm',
    style: {
      fontSize: 20,
      color: '#FFF',
      textTransform: 'uppercase',
      letterSpacing: 10,
      fontWeight: 700,
      borderRadius: 40,
      marginBottom: 50,
    },
    font: {
      family: 'Inter',
      weights: ['100', '400', '700'],
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

### Text with Loading State

```typescript
{
  id: 'text-loading',
  componentId: 'TextAtom',
  type: 'atom' as const,
  data: {
    text: 'Loading Font',
    style: {
      fontSize: 48,
      color: '#FFFFFF',
    },
    font: {
      family: 'CustomFont',
      weights: ['400'],
    },
    loadingState: {
      showLoadingIndicator: true,
      loadingText: 'Loading...',
      loadingStyle: { opacity: 0.5 },
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

### From `waveform-full.ts`

Shows title text with custom font:

```typescript
{
  id: 'text-xyz',
  componentId: 'TextAtom',
  type: 'atom',
  data: {
    text: params.titleText.text,
    className: 'rounded-xl',
    style: {
      fontSize: params.titleText.fontSize ?? 250,
      color: params.textColor ?? '#FFF',
      borderRadius: 40,
      letterSpacing: 10,
      fontWeight: 100,
      marginBottom: params.titleText.marginBottom ?? 130,
    },
    font: {
      family: params.titleText.fontChoice ?? 'ProtestRevolution',
    },
  } as TextAtomData,
}
```

### From `text-overlay.ts`

Shows comprehensive text styling:

```typescript
{
  id: textAtomId,
  componentId: 'TextAtom',
  type: 'atom' as const,
  effects,
  data: {
    text: params.text,
    className: style?.className,
    style: {
      fontSize: style?.fontSize ?? 48,
      color: style?.color ?? '#FFFFFF',
      fontWeight: style?.fontWeight ?? 'normal',
      letterSpacing: style?.letterSpacing,
      textTransform: style?.textTransform,
      textAlign: style?.textAlign ?? 'center',
      lineHeight: style?.lineHeight,
      textShadow: style?.textShadow,
      ...style?.otherProps,
    },
    font: params.font
      ? {
          family: params.font.family,
          weights: params.font.weights,
          subsets: params.font.subsets,
          display: params.font.display,
        }
      : undefined,
    gradient: style?.gradient,
  },
}
```

### From `textbase.ts`

Shows word-by-word text with effects:

```typescript
{
  id: wordId,
  type: 'atom',
  componentId: 'TextAtom',
  data: {
    text: word,
    style: {
      fontSize: `${params.fontSize}px`,
      fontWeight: isPrimary ? 'bold' : 'normal',
      color: params.textColor,
      marginRight: '0.3em',
    },
    font: {
      family: fontFamily,
      weights: isPrimary ? ['700'] : ['400'],
    },
  },
  context: {
    timing: {
      start: 0,
      duration: params.totalDuration,
    },
  },
  effects: wordEffect ? [wordEffect] : [],
}
```

### From `sub-vertical-float.ts` (caption presets)

Shows caption text with styling:

```typescript
{
  id: wordId,
  componentId: 'TextAtom',
  type: 'atom' as const,
  data: {
    text: word,
    style: {
      fontSize: wordStyle.fontSize,
      color: wordStyle.color,
      fontWeight: wordStyle.fontWeight,
      letterSpacing: wordStyle.letterSpacing,
    },
    font: {
      family: selectedFontChoice.family,
      weights: selectedFontChoice.weights,
    },
  },
}
```

## Best Practices

1. **Always specify font weights** when loading Google Fonts to ensure proper rendering
2. **Use gradient for eye-catching text** - remember it makes text color transparent
3. **Combine `className` and `style`** for flexible styling (Tailwind classes + inline styles)
4. **Preload fonts** for better performance (default: `true`)
5. **Use `fallbackFonts`** for graceful degradation
6. **Set `display: 'swap'`** for better font loading performance
7. **Use `letterSpacing`** for better readability, especially with uppercase text
8. **Combine `textShadow` with colors** for better text visibility over backgrounds
9. **Use `textTransform: 'uppercase'`** with increased `letterSpacing` for modern typography
10. **Test font loading** - use `loadingState` and `errorState` during development

## Font Loading

The `TextAtom` uses a custom font loading hook that:

1. **Dynamically loads Google Fonts** based on the `font` configuration
2. **Shows loading state** if `loadingState.showLoadingIndicator` is true
3. **Falls back gracefully** if font loading fails
4. **Uses `delayRender`** to ensure fonts are loaded before rendering
5. **Supports multiple weights and subsets** for comprehensive font support

## Common Font Families

Popular Google Fonts used in presets:

- `'Inter'`: Modern sans-serif
- `'ProtestRevolution'`: Bold display font
- `'Roboto'`: Versatile sans-serif
- `'Montserrat'`: Geometric sans-serif
- `'Playfair Display'`: Elegant serif
- `'Oswald'`: Condensed sans-serif

## Gradient Examples

Useful gradient patterns:

```typescript
// Horizontal gradient
gradient: 'linear-gradient(90deg, #FF0000, #0000FF)';

// Vertical gradient
gradient: 'linear-gradient(180deg, #FF0000, #0000FF)';

// Diagonal gradient
gradient: 'linear-gradient(45deg, #FF0000, #0000FF)';

// Radial gradient
gradient: 'radial-gradient(circle, #FF0000, #0000FF)';

// Multi-color gradient
gradient: 'linear-gradient(90deg, #FF0000, #00FF00, #0000FF)';
```
