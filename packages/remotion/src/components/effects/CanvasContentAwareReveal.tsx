import React, { useEffect, useRef, useState } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { Atom as CanvasAtom } from '../atoms/CanvasAtom';

const CanvasContentAwareRevealProps = z.object({
  imageUrl: z.string().url(),
  revealDurationInFrames: z.number().min(1),
  fit: z.enum(['cover', 'contain']).default('cover'),
  backgroundColor: z.string().default('rgba(0,0,0,0)'),
  burnColorOrder: z.enum(['vibgyor', 'luminance', 'random']).default('vibgyor'),
  zigzagReveal: z.boolean().default(false),
  zigzagDirection: z
    .enum(['horizontal', 'vertical', 'diagonal-down', 'diagonal-up'])
    .default('horizontal'),
  zigzagLayers: z.number().default(10),
  combineWithZigzag: z
    .boolean()
    .default(false)
    .describe('Combine color order with zigzag pattern'),
});

type CanvasContentAwareRevealProps = z.infer<
  typeof CanvasContentAwareRevealProps
>;

export const CanvasContentAwareReveal: React.FC<{
  data: CanvasContentAwareRevealProps;
  id: string;
}> = ({ data, id }) => {
  const {
    imageUrl,
    revealDurationInFrames,
    fit,
    backgroundColor,
    burnColorOrder,
    zigzagReveal,
    zigzagDirection,
    zigzagLayers,
    combineWithZigzag,
  } = data;

  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [pixelBurnMap, setPixelBurnMap] = useState<Float32Array | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const burnMapGeneratedRef = useRef(false);

  const rgbToHsv = (
    r: number,
    g: number,
    b: number
  ): [number, number, number] => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      delta = max - min;
    let h = 0;
    if (delta !== 0) {
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return [h, max === 0 ? 0 : delta / max, max];
  };

  const getLuminance = (r: number, g: number, b: number) =>
    0.299 * r + 0.587 * g + 0.114 * b;

  const hueToVibgyorOrder = (hue: number): number => {
    if (hue >= 260 && hue <= 290) return 0.0;
    if (hue >= 240 && hue < 260) return 0.15;
    if (hue >= 200 && hue < 240) return 0.3;
    if (hue >= 120 && hue < 200) return 0.5;
    if (hue >= 50 && hue < 120) return 0.65;
    if (hue >= 20 && hue < 50) return 0.8;
    if (hue >= 290 || hue < 20) return 1.0;
    return hue / 360;
  };

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    img.onload = () => {
      setImage(img);
      burnMapGeneratedRef.current = false;
    };
  }, [imageUrl]);

  useEffect(() => {
    if (!image || isProcessing || burnMapGeneratedRef.current) return;

    setIsProcessing(true);

    setTimeout(() => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);

        const imageData = ctx.getImageData(0, 0, image.width, image.height);
        const pixels = imageData.data;
        const burnMap = new Float32Array(image.width * image.height);
        const rawValues: number[] = [];

        // Calculate burn values
        for (let i = 0; i < pixels.length; i += 4) {
          const pixelIndex = i / 4;
          const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
          let burnValue = 0;

          if (burnColorOrder === 'vibgyor') {
            const [h, s] = rgbToHsv(r, g, b);
            burnValue = hueToVibgyorOrder(h) * s + 0.5 * (1 - s);
          } else if (burnColorOrder === 'luminance') {
            burnValue = getLuminance(r, g, b) / 255;
          } else {
            burnValue = ((pixelIndex * 2654435761) % 2147483648) / 2147483648;
          }
          rawValues.push(burnValue);
        }

        // Histogram equalization
        const numBuckets = 200;
        const buckets = new Array(numBuckets).fill(0);
        rawValues.forEach((val) => {
          buckets[Math.min(Math.floor(val * numBuckets), numBuckets - 1)]++;
        });

        const cumulative = new Array(numBuckets);
        cumulative[0] = buckets[0];
        for (let i = 1; i < numBuckets; i++) {
          cumulative[i] = cumulative[i - 1] + buckets[i];
        }

        rawValues.forEach((val, idx) => {
          const bucket = Math.min(Math.floor(val * numBuckets), numBuckets - 1);
          burnMap[idx] = cumulative[bucket] / (image.width * image.height);
        });

        // Apply zigzag pattern
        if (zigzagReveal) {
          for (let idx = 0; idx < image.width * image.height; idx++) {
            const x = idx % image.width;
            const y = Math.floor(idx / image.width);
            let zigzagValue = 0;

            if (zigzagDirection === 'horizontal') {
              const layer = Math.floor(y / (image.height / zigzagLayers));
              const isReverse = layer % 2 === 1;
              const xNorm = isReverse
                ? (image.width - x) / image.width
                : x / image.width;
              zigzagValue = layer / zigzagLayers + xNorm / zigzagLayers;
            } else if (zigzagDirection === 'vertical') {
              const layer = Math.floor(x / (image.width / zigzagLayers));
              const isReverse = layer % 2 === 1;
              const yNorm = isReverse
                ? (image.height - y) / image.height
                : y / image.height;
              zigzagValue = layer / zigzagLayers + yNorm / zigzagLayers;
            } else if (zigzagDirection === 'diagonal-down') {
              zigzagValue = (x + y) / (image.width + image.height);
            } else {
              zigzagValue =
                (x + (image.height - y)) / (image.width + image.height);
            }

            burnMap[idx] = combineWithZigzag
              ? burnMap[idx] * 0.6 + zigzagValue * 0.4
              : zigzagValue;
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
      } finally {
        setIsProcessing(false);
      }
    }, 0);
  }, [
    image,
    burnColorOrder,
    zigzagReveal,
    zigzagDirection,
    zigzagLayers,
    combineWithZigzag,
  ]);

  useEffect(() => {
    if (!canvasRef.current || !image || !pixelBurnMap) return;
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    context.canvas.width = width;
    context.canvas.height = height;
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);

    const progress = Math.min(frame / revealDurationInFrames, 1);

    // If animation is complete, just draw the full image
    if (progress >= 1) {
      let sx = 0,
        sy = 0,
        sWidth = image.width,
        sHeight = image.height;
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
      context.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, width, height);
      return;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = image.width;
    tempCanvas.height = image.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(image, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, image.width, image.height);
    const pixels = imageData.data;

    const transitionWidth = Math.max(
      0.02,
      Math.min(0.15, 3 / (revealDurationInFrames / 100))
    );

    for (let i = 0; i < pixels.length; i += 4) {
      const pixelIndex = i / 4;
      const burnProgress =
        (progress - pixelBurnMap[pixelIndex]) / transitionWidth;
      pixels[i + 3] = Math.floor(
        pixels[i + 3] * Math.max(0, Math.min(1, burnProgress))
      );
    }

    tempCtx.putImageData(imageData, 0, 0);

    let sx = 0,
      sy = 0,
      sWidth = image.width,
      sHeight = image.height;
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
    context.drawImage(tempCanvas, sx, sy, sWidth, sHeight, 0, 0, width, height);
  }, [
    frame,
    image,
    width,
    height,
    pixelBurnMap,
    revealDurationInFrames,
    fit,
    backgroundColor,
  ]);

  return (
    <CanvasAtom ref={canvasRef} data={{ className: 'w-full h-full' }} id={id} />
  );
};
