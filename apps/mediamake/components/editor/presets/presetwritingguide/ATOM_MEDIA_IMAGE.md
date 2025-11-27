# ImageAtom Documentation

## Overview

`ImageAtom` is used to display static images with support for local and remote sources. It includes automatic CORS proxy fallback for external images and supports custom styling, filters, and blend modes.

## When to Use

- Displaying static images in compositions
- Creating image slideshows or galleries
- Adding image overlays with blend modes
- Implementing image backgrounds
- Creating image-based transitions

## Parameters

### `src` (required)

- **Type:** `string`
- **Description:** Image source URL or local file path
- **Examples:**
  - Local file: `"image.jpg"`
  - Remote URL: `"https://example.com/image.jpg"`
- **Usage:**
  - Local files are automatically handled using `staticFile()`
  - Remote URLs are tested first, then fallback to CORS proxy if needed
- **Supported Formats:** JPG, PNG, GIF, WebP, SVG

### `style` (optional)

- **Type:** `React.CSSProperties`
- **Description:** Inline CSS styles applied to the image element
- **Common Properties:**
  - `opacity`: `0` to `1` for transparency
  - `mixBlendMode`: Blend modes like `'multiply'`, `'screen'`, `'overlay'`, `'soft-light'`
  - `filter`: CSS filters like `'blur(10px)'`, `'grayscale(100%)'`, `'brightness(1.2)'`
  - `transform`: Transforms like `'scale(1.2)'`, `'rotate(45deg)'`
  - `objectPosition`: Position of image within container
- **Example:**
  ```typescript
  style: {
    opacity: 0.8,
    mixBlendMode: 'overlay',
    filter: 'grayscale(50%)',
    transform: 'scale(1.1)',
  }
  ```

### `className` (optional)

- **Type:** `string`
- **Description:** CSS class names applied to the image element
- **Common Classes:**
  - `"w-full h-full"`: Full width and height
  - `"object-cover"`: Cover the container (maintains aspect ratio, may crop)
  - `"object-contain"`: Contain within container (maintains aspect ratio, no crop)
  - `"object-fill"`: Stretch to fill (ignores aspect ratio)
- **Example:** `"w-full h-full object-cover"`

### `proxySrc` (optional)

- **Type:** `string`
- **Description:** Custom CORS proxy endpoint URL. If provided, this proxy will be used when the original image fails to load due to CORS restrictions.
- **Format:** Should be a proxy endpoint that accepts a `url` query parameter
- **Example:** `"https://my-proxy.com/api/cors?url="`
- **Default Behavior:** If not provided, the atom uses built-in CORS proxy fallbacks:
  - `https://thingproxy.freeboard.io/fetch/`
  - `https://api.allorigins.win/raw?url=`
  - `https://corsproxy.io/?`

## Usage Examples

### Basic Image Display

```typescript
{
  id: 'image-1',
  componentId: 'ImageAtom',
  type: 'atom' as const,
  data: {
    src: 'background.jpg',
    className: 'w-full h-full object-cover',
  },
  context: {
    timing: {
      start: 0,
      duration: 5,
    },
  },
}
```

### Image with Filters and Blend Mode

```typescript
{
  id: 'image-filtered',
  componentId: 'ImageAtom',
  type: 'atom' as const,
  data: {
    src: 'photo.jpg',
    className: 'w-full h-full object-cover',
    style: {
      opacity: 0.7,
      mixBlendMode: 'soft-light',
      filter: 'blur(5px) brightness(1.2)',
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

### Remote Image with Custom Proxy

```typescript
{
  id: 'remote-image',
  componentId: 'ImageAtom',
  type: 'atom' as const,
  data: {
    src: 'https://example.com/image.jpg',
    proxySrc: 'https://my-proxy.com/api/cors?url=',
    className: 'w-full h-auto object-contain',
  },
  context: {
    timing: {
      start: 0,
      duration: 5,
    },
  },
}
```

### Image Overlay with Transform

```typescript
{
  id: 'image-overlay',
  componentId: 'ImageAtom',
  type: 'atom' as const,
  data: {
    src: 'overlay.png',
    className: 'w-full h-full object-cover',
    style: {
      opacity: 0.5,
      mixBlendMode: 'multiply',
      transform: 'scale(1.2)',
      objectPosition: 'center top',
    },
  },
  context: {
    timing: {
      start: 2,
      duration: 8,
    },
  },
}
```

## Real-World Examples from Presets

### From `imageloop.ts`

Shows image with pan effect and filters:

```typescript
{
  id: `${params.trackName ?? 'imageloop'}-image-${imageIndex}`,
  componentId: 'ImageAtom',
  type: 'atom' as const,
  data: {
    src: image.src,
    className: isPanEffect
      ? isVertical
        ? 'w-full h-auto object-cover'
        : 'w-full object-cover'
      : 'w-full h-full object-cover',
    fit: image.fit || 'cover',
    style: {
      ...(isPanEffect
        ? {
            height: (props.config?.height ?? 1080) +
                    ((_panEffectData?.panDistance as number) ?? 0),
          }
        : {}),
      ...(image.filter && image.filter !== 'none'
        ? { filter: generateFilterStyle(image.filter) }
        : {}),
      ...(image.blendMode && image.blendMode !== 'normal'
        ? { mixBlendMode: image.blendMode }
        : {}),
      ...(image.opacity !== undefined ? { opacity: image.opacity } : {}),
    },
  },
}
```

### From `media-track.ts`

Shows basic image with opacity:

```typescript
{
  id: sceneId,
  componentId: 'ImageAtom',
  type: 'atom' as const,
  data: {
    src: mediaItem.src,
    className: 'w-full h-auto object-cover',
    fit: mediaItem.fit ?? 'cover',
    style: {
      ...(mediaItem.opacity !== undefined
        ? { opacity: mediaItem.opacity }
        : {}),
    },
  },
}
```

### From `broll.ts`

Shows image with transform and blend mode:

```typescript
{
  id: `${trackName}-broll-image-${captionIndex}`,
  componentId: 'ImageAtom',
  type: 'atom' as const,
  data: {
    src: selectedImage.src,
    className: 'w-full h-full object-cover',
    fit: imageFit,
    style: {
      opacity: imageOpacity,
      transform: `scale(${imageScale})`,
      objectPosition: imagePosition,
      ...(imageBlendMode && imageBlendMode !== 'normal'
        ? { mixBlendMode: imageBlendMode }
        : {}),
    },
  },
  context: {
    timing: {
      start: absoluteStart,
      duration: duration,
    },
  },
}
```

### From `waveform-full.ts`

Shows image with effects:

```typescript
{
  id: 'Image-xyz',
  componentId: 'ImageAtom',
  type: 'atom',
  effects: [imageEffect],
  data: {
    className: 'w-full h-auto object-contain',
    src: params.image.src,
  },
}
```

## Best Practices

1. **Always specify sizing classes** (`w-full h-full`, `object-cover`, etc.) for predictable image display
2. **Use `object-cover`** for background images that should fill the container
3. **Use `object-contain`** when you need to show the entire image without cropping
4. **Combine filters and blend modes** for creative effects
5. **Handle CORS issues** by using `proxySrc` for external images that fail to load
6. **Use `opacity` with `mixBlendMode`** for overlay effects
7. **Apply transforms carefully** - remember transforms affect the image's bounding box
8. **Test remote images** - the atom automatically tries CORS proxies, but custom proxies may be needed for some domains

## CORS Handling

The `ImageAtom` automatically handles CORS issues:

1. **First attempt:** Loads the image directly from the source URL
2. **On failure:** Falls back to built-in CORS proxies
3. **Custom proxy:** If `proxySrc` is provided, it's used as the fallback

The atom uses `crossOrigin="anonymous"` for remote images to enable CORS when possible.

## Common Filter Styles

Here are some useful filter combinations:

```typescript
// Grayscale
filter: 'grayscale(100%)';

// Blur
filter: 'blur(10px)';

// Brightness
filter: 'brightness(1.5)';

// Contrast
filter: 'contrast(1.2)';

// Sepia
filter: 'sepia(100%)';

// Multiple filters
filter: 'blur(5px) grayscale(50%) brightness(1.2)';
```

## Common Blend Modes

Useful blend modes for overlays:

- `'multiply'`: Darkens the image
- `'screen'`: Lightens the image
- `'overlay'`: Combines multiply and screen
- `'soft-light'`: Softer version of overlay
- `'hard-light'`: Stronger version of overlay
- `'color-dodge'`: Brightens with color
- `'color-burn'`: Darkens with color
