import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import {Atom as CanvasAtom} from '../atoms/CanvasAtom';

// Simple seeded pseudo-random number generator
const mulberry32 = (seed: number) => {
  return () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

const CanvasRevealProps = z.object({
  imageUrl: z.string().url(),
  revealDurationInFrames: z.number().min(1),
  revealType: z.enum(['wipe', 'radial']).default('wipe'),
  angle: z.number().default(0),
  fit: z.enum(['cover', 'contain']).default('cover'),
  edgeStyle: z.enum(['straight', 'organic', 'burn']).default('straight'),
  edgeWaviness: z.number().default(30).describe('Amplitude of the organic wave.'),
  edgeFrequency: z.number().default(4).describe('Number of waves/bulges in the organic edge.'),
  backgroundColor: z.string().default('rgba(0,0,0,0)'),
  burnGlow: z.boolean().default(true).describe('Add glowing sparkle effects to burn edges.'),
  burnGlowColor: z.string().default('#ff6600').describe('Color of the burn glow effect.'),
  burnGlowIntensity: z.number().default(1).describe('Intensity of the burn glow (0-2).'),
  organicRandomAmplitude: z.boolean().default(true).describe('Use random amplitudes for organic bulges.'),
  organicRandomWavelength: z.boolean().default(false).describe('Use random wavelengths for organic bulges.'),
  contentAwareBurn: z.boolean().default(false).describe('Burn similar colors together based on image content.'),
  burnColorOrder: z.enum(['vibgyor', 'luminance', 'random']).default('vibgyor').describe('Order to burn colors.'),
  contentAwareOnly: z.boolean().default(false).describe('Use only content-aware burn without edge effects.'),
  zigzagReveal: z.boolean().default(false).describe('Use zig-zag pattern for reveal.'),
  zigzagDirection: z.enum(['horizontal', 'vertical', 'diagonal-down', 'diagonal-up']).default('horizontal').describe('Direction of zig-zag lines.'),
  zigzagLayers: z.number().default(10).describe('Number of zig-zag layers.'),
  drawingReveal: z.boolean().default(false).describe('Simulate drawing the image with color-aware strokes.'),
});

type CanvasRevealProps = z.infer<typeof CanvasRevealProps>;

export const CanvasReveal: React.FC<{ data: CanvasRevealProps, id: string }> = ({ data, id }) => {
  const {
    imageUrl,
    revealDurationInFrames,
    revealType,
    angle,
    fit,
    edgeStyle,
    edgeWaviness,
    edgeFrequency,
    backgroundColor,
    burnGlow,
    burnGlowColor,
    burnGlowIntensity,
    organicRandomAmplitude,
    organicRandomWavelength,
    contentAwareBurn,
    burnColorOrder,
    contentAwareOnly,
    zigzagReveal,
    zigzagDirection,
    zigzagLayers,
    drawingReveal,
  } = data;
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [pixelBurnMap, setPixelBurnMap] = useState<Float32Array | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const burnMapGeneratedRef = useRef(false);

  // Helper: Convert RGB to HSV for color-based ordering
  const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    let h = 0;
    if (delta !== 0) {
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    
    const s = max === 0 ? 0 : delta / max;
    const v = max;
    
    return [h, s, v];
  };

  // Helper: Calculate luminance
  const getLuminance = (r: number, g: number, b: number): number => {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };
  
  // Helper: Map hue to VIBGYOR order (0=burns first, 1=burns last)
  const hueToVibgyorOrder = (hue: number): number => {
    // VIBGYOR: Violet(380-450nm/270-290°), Indigo(450-475nm/260-270°), 
    // Blue(475-495nm/210-260°), Green(495-570nm/120-210°), 
    // Yellow(570-590nm/60-120°), Orange(590-620nm/30-60°), Red(620-750nm/0-30°,330-360°)
    
    // Normalize hue and map to burn order
    if (hue >= 260 && hue <= 290) return 0.0; // Violet burns first
    if (hue >= 240 && hue < 260) return 0.15; // Indigo
    if (hue >= 200 && hue < 240) return 0.3; // Blue
    if (hue >= 120 && hue < 200) return 0.5; // Green
    if (hue >= 50 && hue < 120) return 0.65; // Yellow
    if (hue >= 20 && hue < 50) return 0.8; // Orange
    // Red is split (0-20 and 290-360)
    if (hue >= 290 || hue < 20) return 1.0; // Red burns last
    
    // Fallback for any gaps
    return hue / 360;
  };

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    img.onload = () => {
      setImage(img);
      burnMapGeneratedRef.current = false; // Reset flag when new image loads
    };
  }, [imageUrl]);

  // Generate burn map separately with proper dependency tracking
  useEffect(() => {
    if (!image || isProcessing || burnMapGeneratedRef.current) return;
    if (!contentAwareBurn && !zigzagReveal) {
      setPixelBurnMap(null);
      return;
    }

    setIsProcessing(true);
    
    // Use setTimeout to avoid blocking the main thread
    setTimeout(() => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessing(false);
          return;
        }
        
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, image.width, image.height);
        const pixels = imageData.data;
        const burnMap = new Float32Array(image.width * image.height);
        const rawValues: number[] = [];
        
        // Calculate raw burn values for each pixel (only if content-aware)
        if (contentAwareBurn) {
          for (let i = 0; i < pixels.length; i += 4) {
            const pixelIndex = i / 4;
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            
            let burnValue = 0;
            
            if (burnColorOrder === 'vibgyor') {
              const [h, s, v] = rgbToHsv(r, g, b);
              burnValue = hueToVibgyorOrder(h);
              burnValue = burnValue * s + 0.5 * (1 - s);
            } else if (burnColorOrder === 'luminance') {
              const lum = getLuminance(r, g, b);
              burnValue = lum / 255;
            } else if (burnColorOrder === 'random') {
              const pixelHash = (pixelIndex * 2654435761) % 2147483648;
              burnValue = pixelHash / 2147483648;
            }
            
            rawValues.push(burnValue);
          }
          
          // Histogram equalization for smooth burning
          const numBuckets = 200;
          const buckets = new Array(numBuckets).fill(0);
          rawValues.forEach(val => {
            const bucket = Math.min(Math.floor(val * numBuckets), numBuckets - 1);
            buckets[bucket]++;
          });
          
          const cumulative = new Array(numBuckets);
          cumulative[0] = buckets[0];
          for (let i = 1; i < numBuckets; i++) {
            cumulative[i] = cumulative[i - 1] + buckets[i];
          }
          const totalPixels = image.width * image.height;
          
          rawValues.forEach((val, idx) => {
            const bucket = Math.min(Math.floor(val * numBuckets), numBuckets - 1);
            const normalizedValue = cumulative[bucket] / totalPixels;
            burnMap[idx] = normalizedValue;
          });
        }
        
        // Add zig-zag pattern if enabled
        if (zigzagReveal) {
          for (let idx = 0; idx < image.width * image.height; idx++) {
            const x = idx % image.width;
            const y = Math.floor(idx / image.width);
            let zigzagValue = 0;
            
            if (zigzagDirection === 'horizontal') {
              const layer = Math.floor(y / (image.height / zigzagLayers));
              const isReverse = layer % 2 === 1;
              const xNorm = isReverse ? (image.width - x) / image.width : x / image.width;
              zigzagValue = (layer / zigzagLayers) + (xNorm / zigzagLayers);
            } else if (zigzagDirection === 'vertical') {
              const layer = Math.floor(x / (image.width / zigzagLayers));
              const isReverse = layer % 2 === 1;
              const yNorm = isReverse ? (image.height - y) / image.height : y / image.height;
              zigzagValue = (layer / zigzagLayers) + (yNorm / zigzagLayers);
            } else if (zigzagDirection === 'diagonal-down') {
              const diag = x + y;
              const maxDiag = image.width + image.height;
              zigzagValue = diag / maxDiag;
            } else {
              const diag = x + (image.height - y);
              const maxDiag = image.width + image.height;
              zigzagValue = diag / maxDiag;
            }
            
            if (contentAwareBurn) {
              burnMap[idx] = (burnMap[idx] * 0.6) + (zigzagValue * 0.4);
            } else {
              burnMap[idx] = zigzagValue;
            }
          }
          
          // Re-normalize
          const minVal = Math.min(...Array.from(burnMap));
          const maxVal = Math.max(...Array.from(burnMap));
          for (let i = 0; i < burnMap.length; i++) {
            burnMap[i] = (burnMap[i] - minVal) / (maxVal - minVal);
          }
        }
        
        setPixelBurnMap(burnMap);
        burnMapGeneratedRef.current = true;
      } catch (error) {
        console.error('Error generating burn map:', error);
      } finally {
        setIsProcessing(false);
      }
    }, 0);
  }, [image, contentAwareBurn, burnColorOrder, zigzagReveal, zigzagDirection, zigzagLayers]);

  useEffect(() => {
    if (!canvasRef.current || !image) return;
    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    
    context.canvas.width = width;
    context.canvas.height = height;

    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);

    const progress = Math.min(frame / revealDurationInFrames, 1);
    if (progress === 0 && backgroundColor === 'rgba(0,0,0,0)') return;

    // Generate seed from id
    const seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // If content-aware only mode, skip edge generation
    if (!contentAwareOnly && !zigzagReveal) {
      context.save();
      context.beginPath();

    if (revealType === 'radial') {
      const baseRadius = (Math.sqrt(width * width + height * height) / 2) * progress;
      
      if (edgeStyle === 'organic') {
        const points = 120;
        const random = mulberry32(seed);
        
        // Pre-generate random amplitude multipliers and wavelengths
        const amplitudes: number[] = [];
        const wavelengths: number[] = [];
        for (let i = 0; i <= points; i++) {
          amplitudes.push(organicRandomAmplitude ? 0.5 + random() : 1);
          wavelengths.push(organicRandomWavelength ? 0.5 + random() * 1.5 : 1);
        }
        
        for (let i = 0; i <= points; i++) {
          const p = i / points;
          const angle = p * Math.PI * 2;
          const localFreq = edgeFrequency * wavelengths[i];
          const wave = Math.sin(p * Math.PI * localFreq + frame * 0.1) * edgeWaviness * progress * amplitudes[i];
          const radius = baseRadius + wave;
          const x = width / 2 + Math.cos(angle) * radius;
          const y = height / 2 + Math.sin(angle) * radius;
          if (i === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
      } else if (edgeStyle === 'burn') {
        const points = 120;
        const random = mulberry32(seed);
        
        // Pre-generate random values
        const randomValues: number[] = [];
        const phaseOffsets: number[] = [];
        const sparklePoints: Array<{x: number, y: number, intensity: number}> = [];
        
        for (let i = 0; i <= points; i++) {
          randomValues.push(random());
          phaseOffsets.push(random() * Math.PI * 2);
        }
        
        for (let i = 0; i <= points; i++) {
          const p = i / points;
          const angle = p * Math.PI * 2;
          const randomFactor = randomValues[i] * 2 - 1;
          const flicker = Math.sin(frame * 0.3 + phaseOffsets[i]);
          const burnOffset = randomFactor * flicker * edgeWaviness * progress;
          const radius = baseRadius + burnOffset;
          const x = width / 2 + Math.cos(angle) * radius;
          const y = height / 2 + Math.sin(angle) * radius;
          
          // Collect sparkle points (every 5th point when flickering positively)
          if (burnGlow && i % 5 === 0 && flicker > 0.3) {
            sparklePoints.push({x, y, intensity: flicker});
          }
          
          if (i === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
        
        // Draw burn glow effects before clipping
        if (burnGlow && sparklePoints.length > 0) {
          context.save();
          sparklePoints.forEach(point => {
            const glowSize = 3 + point.intensity * 5 * burnGlowIntensity;
            const gradient = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, glowSize);
            gradient.addColorStop(0, burnGlowColor);
            gradient.addColorStop(0.5, burnGlowColor + '80');
            gradient.addColorStop(1, burnGlowColor + '00');
            context.fillStyle = gradient;
            context.fillRect(point.x - glowSize, point.y - glowSize, glowSize * 2, glowSize * 2);
          });
          context.restore();
        }
      } else {
        // Straight radial
        context.arc(width / 2, height / 2, baseRadius, 0, Math.PI * 2);
      }
    } else { // 'wipe'
      const angleInRadians = (angle * Math.PI) / 180;
      const diagonal = Math.sqrt(width * width + height * height);
      
      context.translate(width / 2, height / 2);
      context.rotate(angleInRadians);
      
      const wipeEdgePosition = progress * diagonal - (diagonal / 2);

      if (edgeStyle === 'burn') {
        const points = 100;
        const random = mulberry32(seed);
        
        // Pre-generate random values
        const randomValues: number[] = [];
        const phaseOffsets: number[] = [];
        const edgePoints: Array<{x: number, y: number}> = [];
        
        for (let i = 0; i <= points; i++) {
          randomValues.push(random());
          phaseOffsets.push(random() * Math.PI * 2);
        }

        context.moveTo(wipeEdgePosition, -diagonal / 2);
        for (let i = 0; i <= points; i++) {
          const p = i / points;
          const y = (p - 0.5) * diagonal;
          const randomFactor = randomValues[i] * 2 - 1;
          const flicker = Math.sin(frame * 0.3 + phaseOffsets[i]);
          const x = wipeEdgePosition + (randomFactor * flicker * edgeWaviness);
          context.lineTo(x, y);
          edgePoints.push({x, y});
        }
        context.lineTo(wipeEdgePosition, diagonal / 2);
        context.lineTo(-diagonal / 2, diagonal / 2);
        context.lineTo(-diagonal / 2, -diagonal / 2);
        context.closePath();
        
        // Draw burn glow effects along the edge
        if (burnGlow && progress > 0.01) {
          context.save();
          const random2 = mulberry32(seed + frame);
          
          for (let i = 0; i < edgePoints.length; i += 3) {
            const point = edgePoints[i];
            const randomFactor = randomValues[i] * 2 - 1;
            const flicker = Math.sin(frame * 0.3 + phaseOffsets[i]);
            
            if (flicker > 0.2) {
              const sparkleIntensity = flicker * burnGlowIntensity;
              const glowSize = 4 + random2() * 6 * sparkleIntensity;
              
              // Main glow
              const gradient = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, glowSize);
              gradient.addColorStop(0, burnGlowColor);
              gradient.addColorStop(0.4, burnGlowColor + 'CC');
              gradient.addColorStop(1, burnGlowColor + '00');
              context.fillStyle = gradient;
              context.fillRect(point.x - glowSize, point.y - glowSize, glowSize * 2, glowSize * 2);
              
              // Occasional bright sparkles
              if (random2() > 0.85) {
                const sparkleSize = 2 + random2() * 3;
                context.fillStyle = '#ffffff';
                context.fillRect(point.x - sparkleSize/2, point.y - sparkleSize/2, sparkleSize, sparkleSize);
              }
            }
          }
          context.restore();
        }
      } else if (edgeStyle === 'organic') {
        const points = 100;
        const random = mulberry32(seed);
        
        // Pre-generate random amplitude multipliers and wavelengths
        const amplitudes: number[] = [];
        const wavelengths: number[] = [];
        for (let i = 0; i <= points; i++) {
          amplitudes.push(organicRandomAmplitude ? 0.5 + random() : 1);
          wavelengths.push(organicRandomWavelength ? 0.5 + random() * 1.5 : 1);
        }
        
        context.moveTo(wipeEdgePosition, -diagonal / 2);
        for (let i = 0; i <= points; i++) {
          const p = i / points;
          const y = (p - 0.5) * diagonal;
          const localFreq = edgeFrequency * wavelengths[i];
          const wave = Math.sin(p * localFreq * Math.PI + frame * 0.1) * edgeWaviness * amplitudes[i];
          const x = wipeEdgePosition + wave;
          context.lineTo(x, y);
        }
        context.lineTo(wipeEdgePosition, diagonal / 2);
        context.lineTo(-diagonal / 2, diagonal / 2);
        context.lineTo(-diagonal / 2, -diagonal / 2);
        context.closePath();
      } else { // 'straight'
        context.rect(-diagonal / 2, -diagonal / 2, wipeEdgePosition + (diagonal / 2), diagonal);
      }
      
      context.rotate(-angleInRadians);
      context.translate(-width / 2, -height / 2);
    }
    
    context.clip();
    } else {
      // Content-aware only: no clipping, just draw full image
      context.save();
    }
    
    // Draw the image inside the clipping region
    let sx = 0, sy = 0, sWidth = image.width, sHeight = image.height;
    if (fit === 'cover') {
      const imgAspect = image.width / image.height;
      const canvasAspect = width / height;
      if (imgAspect > canvasAspect) {
        sWidth = image.height * canvasAspect;
        sx = (image.width - sWidth) / 2;
      } else {
        sHeight = image.width / canvasAspect;
        sy = (image.height - sHeight) / 2;
      }
    }
    
    // Content-aware burning: draw with pixel-level masks
    if ((contentAwareBurn || zigzagReveal) && pixelBurnMap && (edgeStyle === 'burn' || contentAwareOnly || zigzagReveal)) {
      // Create a temporary canvas for the masked image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = image.width;
      tempCanvas.height = image.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      
      tempCtx.drawImage(image, 0, 0);
      const imageData = tempCtx.getImageData(0, 0, image.width, image.height);
      const pixels = imageData.data;
      
      // Calculate smooth transition width based on duration and pixel count
      // Goal: uniform reveal with smooth edges
      const totalPixels = image.width * image.height;
      const framesPerPixelGroup = revealDurationInFrames / 100; // 100 groups
      const transitionWidth = Math.max(0.02, Math.min(0.15, 3 / framesPerPixelGroup));
      
      // Apply content-aware alpha based on burn progress
      for (let i = 0; i < pixels.length; i += 4) {
        const pixelIndex = i / 4;
        const burnThreshold = pixelBurnMap[pixelIndex];
        
        // Pixel becomes visible when progress exceeds its burn threshold
        const burnProgress = (progress - burnThreshold) / transitionWidth;
        const alpha = Math.max(0, Math.min(1, burnProgress));
        
        pixels[i + 3] = Math.floor(pixels[i + 3] * alpha);
      }
      
      tempCtx.putImageData(imageData, 0, 0);
      context.drawImage(tempCanvas, sx, sy, sWidth, sHeight, 0, 0, width, height);
    } else {
      // Standard drawing
      context.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, width, height);
    }
    
    context.restore();

  }, [
    frame, image, width, height, revealDurationInFrames, fit, imageUrl,
    revealType, angle, edgeStyle, edgeWaviness, edgeFrequency, id, backgroundColor,
    burnGlow, burnGlowColor, burnGlowIntensity, organicRandomAmplitude, organicRandomWavelength,
    contentAwareBurn, burnColorOrder, pixelBurnMap, contentAwareOnly,
    zigzagReveal, zigzagDirection, zigzagLayers, drawingReveal
  ]);

  return <CanvasAtom ref={canvasRef} data={{ className: "w-full h-full" }} id={id} />;
};