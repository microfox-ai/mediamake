# GPU Acceleration in MediaMake

## Overview

GPU acceleration significantly speeds up rendering for certain types of content by using your graphics card instead of CPU-only rendering.

## What is Accelerated by GPU?

✅ **These elements benefit from GPU acceleration:**
- WebGL content (Three.JS, Skia, P5.js, Mapbox, etc.)
- `box-shadow` and `text-shadow`
- CSS gradients (`linear-gradient()`, `radial-gradient()`)
- CSS filters (`blur()`, `drop-shadow()`)
- CSS `transform` properties
- Many 2D Canvas operations

❌ **These elements are NOT accelerated by GPU:**
- `<OffthreadVideo>` and `<Html5Video>` components
- Video encoding (the final video compression step)
- Canvas pixel manipulation operations
- Image decoding

## How to Enable GPU Acceleration

### 1. Navigate to Render Modal
- Open the player page
- Click the "Render" button
- Switch to the **"Local Render"** tab (AWS Lambda doesn't support GPU)

### 2. Select GPU Backend
Choose the appropriate OpenGL backend based on your system:

| Backend | Platform | Description |
|---------|----------|-------------|
| **angle** (Default) | Windows | Recommended for Windows systems with GPU |
| **egl** | Linux | Recommended for Linux systems with GPU |
| **swangle** | Any | Software renderer (slow, no GPU needed) |
| **swiftshader** | Any | Alternative software renderer (slow) |

### 3. Start Render
Click "Start Render" and monitor the console logs

## How to Verify GPU Usage

### Method 1: Check Console Logs
When you start a render, you should see:
```
Starting local render with GPU acceleration...
🎮 GPU Backend (gl): angle
🎬 Video Render Progress: 25.0% | ETA: 2.5 minutes | GPU: angle
```

### Method 2: Monitor GPU Usage (Windows)
1. Open **Task Manager** (Ctrl + Shift + Esc)
2. Go to the **Performance** tab
3. Select your **GPU**
4. Look for:
   - **3D** graph showing activity
   - **Video Encode/Decode** activity
5. During rendering, you should see GPU activity spikes

### Method 3: Monitor GPU Usage (Linux)
```bash
# Using nvidia-smi (for NVIDIA GPUs)
watch -n 1 nvidia-smi

# Using intel_gpu_top (for Intel GPUs)
sudo intel_gpu_top

# Using radeontop (for AMD GPUs)
sudo radeontop
```

### Method 4: Monitor GPU Usage (macOS)
1. Open **Activity Monitor**
2. Go to **Window** → **GPU History**
3. Look for increased GPU usage during rendering

## Performance Comparison

### Example: 30-second video with WebGL effects

| GPU Mode | Render Time | Notes |
|----------|-------------|-------|
| **angle** (GPU) | ~45 seconds | Fast, uses hardware acceleration |
| **egl** (GPU) | ~50 seconds | Fast, Linux GPU acceleration |
| **swangle** (Software) | ~3 minutes | Slow, CPU-only rendering |
| **CPU only** (no flag) | ~4+ minutes | Very slow, no acceleration |

## Troubleshooting

### GPU Not Being Used?

**1. Check Your Content**
If your video only contains `<OffthreadVideo>` elements and no WebGL/CSS effects, GPU acceleration won't help much. The GPU accelerates **rendering effects**, not video decoding.

**2. Verify GPU Drivers**
- Update your graphics card drivers
- On Windows: Use Device Manager
- On Linux: Check with `lspci -k | grep -A 3 -i "VGA"`

**3. Try Different Backends**
If `angle` doesn't work, try:
- `egl` (especially on Linux)
- Check if you're on a headless server (no GPU available)

**4. Check System Requirements**
- **Windows**: DirectX 11+ compatible GPU
- **Linux**: OpenGL 3.3+ compatible GPU
- **Headless servers**: Most cloud servers don't have GPUs (use software renderer)

### Memory Leaks with ANGLE

⚠️ **Known Issue**: Using `angle` may cause memory leaks during very long renders (60+ minutes).

**Solution**: For very long videos:
1. Split into multiple shorter compositions
2. Render each part separately
3. Stitch them together in post-production
4. Or use `swangle` (slower but more stable)

## When to Use GPU Acceleration

### ✅ Use GPU When:
- Rendering complex motion graphics
- Using WebGL libraries (Three.js, etc.)
- Heavy use of CSS filters and shadows
- Gradients and transforms
- Interactive animations

### ❌ Skip GPU When:
- Simple video editing (cutting/trimming)
- Static images with minimal effects
- Audio-only rendering
- Rendering on headless cloud servers without GPU

## Additional Resources

- [Remotion GPU Documentation](https://www.remotion.dev/docs/gpu)
- [OpenGL Options Documentation](https://www.remotion.dev/docs/gl-options)
- [Performance Optimization Guide](https://www.remotion.dev/docs/performance)

---

**Note**: AWS Lambda does **not** support GPU acceleration as Lambda instances have no GPU. GPU options are only available for **local rendering**.




