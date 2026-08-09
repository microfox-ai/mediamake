# Atoms Overview

Atoms are the fundamental building blocks of Remotion compositions. Each atom represents a single media element or content type.

## Available Atoms

### 🎥 VideoAtom

**When to use:** Display video content with playback controls

```typescript
{
  src: string;                    // Video source URL or local path
  srcDuration?: number;           // Duration of each loop iteration (seconds)
  style?: Record<string, any>;    // CSS styles object
  containerClassName?: string;    // CSS class for wrapper container
  className?: string;             // CSS class for video element
  startFrom?: number;            // Start playback from this time (seconds)
  endAt?: number;                // End playback at this time (seconds)
  playbackRate?: number;         // Playback speed multiplier (1 = normal)
  volume?: number;                // Volume level (0-1)
  muted?: boolean;               // Mute video audio
  loop?: boolean;                 // Whether to loop the video
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'; // Object fit style
}
```

---

### 🖼️ ImageAtom

**When to use:** Display static images

```typescript
{
  src: string;                    // Image source URL or local path
  style?: React.CSSProperties;     // CSS styles object
  className?: string;              // CSS class names
  proxySrc?: string;               // Custom CORS proxy endpoint
}
```

---

### 📝 TextAtom

**When to use:** Display text with custom typography

```typescript
{
  text: string;                   // Text content to display
  style?: React.CSSProperties;     // CSS styles object
  className?: string;              // CSS class names
  gradient?: string;               // CSS gradient string for gradient text
  font?: {
    family: string;                // Font family name (e.g., 'Inter')
    weights?: string[];            // Font weights to load (e.g., ['400', '700'])
    subsets?: string[];           // Font subsets (default: ['latin'])
    display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional'; // Font display strategy
    preload?: boolean;             // Whether to preload font
  };
  fallbackFonts?: string[];        // Fallback font families
}
```

---

### 🔊 AudioAtom

**When to use:** Play audio tracks

```typescript
{
  src: string;                    // Audio source URL or local path
  startFrom?: number;             // Start playback from this time (seconds)
  endAt?: number;                 // End playback at this time (seconds)
  volume?: number;                // Volume level (0-2, default: 1)
  playbackRate?: number;         // Playback speed multiplier (1 = normal)
  muted?: {
    type: 'full',
    value: boolean;                // true = muted, false = unmuted
  } | {
    type: 'range',                 // mute only specific parts
    values: Array<{
      start: number;               // Start time in seconds
      end: number;                 // End time in seconds
    }>;
  };
}
```

---

### 🎨 LottieAtom

**When to use:** Display Lottie animations

```typescript
{
  src: string;                    // Lottie JSON source URL or local path
  style?: Record<string, any>;    // CSS styles object
  className?: string;              // CSS class names
  loop?: boolean;                 // Whether to loop the animation
  playbackRate?: number;           // Playback speed multiplier (default: 1)
  direction?: 'forward' | 'reverse'; // Animation direction
}
```

---

### 🎨 CanvasPipeline

**When to use:** Particle systems, reveals with custom geometry (organic/burn
edges), glitch treatments, procedural graphics — anything not expressible with
CSS on an image/video. See `ATOM_CANVAS_PIPELINE.md` for the op catalogue.

```typescript
{
  sources?: Record<string, { type: 'image'; src: string }>; // named inputs
  pipeline: CanvasOpNode[];        // ordered draw operations
  background?: string;             // fill colour; transparent when omitted
  seed?: number | string;          // deterministic randomness
  renderScale?: number;            // backing-resolution cap
}
```

Related: `effect-CanvasFx` applies the same pipelines to wrapped children as a
mask / overlay / underlay.

---

### 📄 HTMLBlockAtom

**When to use:** Render raw HTML content

```typescript
{
  html: string;                   // Raw HTML string to render
  className?: string;              // CSS class names
  style?: React.CSSProperties;     // CSS styles object
}
```

---

### ⬜ ShapeAtom

**When to use:** Display simple geometric shapes

```typescript
{
  shape: 'circle' | 'rectangle' | 'star' | 'triangle'; // Shape type
  color: string;                  // Color of the shape (CSS color value)
  rotation?: {
    duration: number;              // Rotation duration in frames
  };
  style?: React.CSSProperties;     // Additional CSS styles
}
```

---

## Quick Reference

| Atom          | Primary Use Case  | Key Features                          |
| ------------- | ----------------- | ------------------------------------- |
| VideoAtom     | Video playback    | Trimming, playback rate, looping      |
| ImageAtom     | Static images     | CORS handling, filters, blend modes   |
| TextAtom      | Typography        | Font loading, gradients, styling      |
| AudioAtom     | Audio playback    | Trimming, muting ranges, volume       |
| LottieAtom    | Animated graphics | JSON animations, playback control     |
| CanvasPipeline | Custom effects   | Particles, reveals, glitch, procedural graphics |
| HTMLBlockAtom | Raw HTML          | Custom HTML injection                 |
| ShapeAtom     | Simple shapes     | Basic geometric shapes                |

---

## Usage Pattern

All atoms follow a consistent structure:

```typescript
{
  id: 'unique-id',
  componentId: 'AtomName', // e.g., 'VideoAtom', 'ImageAtom'
  type: 'atom' as const,
  data: {
    // Atom-specific properties (see above)
  },
  context: {
    timing: {
      start: 0,        // Start time in seconds
      duration: 5,     // Duration in seconds
    }
  },
  effects: [], // Optional animation effects
}
```
