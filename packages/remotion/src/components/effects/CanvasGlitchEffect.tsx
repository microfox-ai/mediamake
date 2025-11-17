import React, { useEffect, useRef, useState } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { Atom as CanvasAtom } from '../atoms/CanvasAtom';

const CanvasGlitchEffectProps = z.object({
  imageUrl: z.string().url(),
  durationInFrames: z.number().min(1),
  fit: z.enum(['cover', 'contain']).default('cover'),
  backgroundColor: z.string().default('rgba(0,0,0,0)'),
  glitchType: z
    .enum(['rgb-shift', 'slice', 'corrupt', 'static', 'scan'])
    .default('rgb-shift'),
  intensity: z.number().default(10).describe('Intensity of glitch effect'),
  frequency: z.number().default(0.3).describe('How often glitches occur (0-1)'),
  continuous: z
    .boolean()
    .default(false)
    .describe('Continuous glitch vs periodic'),
  glitchStartFrame: z.number().default(0).describe('Frame to start glitching'),
  glitchEndFrame: z
    .number()
    .default(-1)
    .describe('Frame to end glitching (-1 = duration)'),
});

type CanvasGlitchEffectProps = z.infer<typeof CanvasGlitchEffectProps>;

export const CanvasGlitchEffect: React.FC<{
  data: CanvasGlitchEffectProps;
  id: string;
}> = ({ data, id }) => {
  const {
    imageUrl,
    durationInFrames,
    fit,
    backgroundColor,
    glitchType,
    intensity,
    frequency,
    continuous,
    glitchStartFrame,
    glitchEndFrame,
  } = data;

  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    img.onload = () => setImage(img);
  }, [imageUrl]);

  useEffect(() => {
    if (!canvasRef.current || !image) return;
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    context.canvas.width = width;
    context.canvas.height = height;
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);

    // Check if we're in the glitch time range
    const endFrame = glitchEndFrame === -1 ? durationInFrames : glitchEndFrame;
    const isInGlitchRange = frame >= glitchStartFrame && frame <= endFrame;

    // Calculate if glitch should be active
    const seed = Math.floor(frame / 3);
    const random = ((seed * 9301 + 49297) % 233280) / 233280;
    const isGlitching = isInGlitchRange && (continuous || random < frequency);

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

    if (!isGlitching) {
      context.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, width, height);
      return;
    }

    if (glitchType === 'rgb-shift') {
      // RGB channel separation
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = image.width;
      tempCanvas.height = image.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCtx.drawImage(image, 0, 0);
      const imageData = tempCtx.getImageData(0, 0, image.width, image.height);
      const pixels = imageData.data;

      const shift = intensity * (random * 2 - 1);
      const redData = tempCtx.createImageData(image.width, image.height);
      const greenData = tempCtx.createImageData(image.width, image.height);
      const blueData = tempCtx.createImageData(image.width, image.height);

      for (let i = 0; i < pixels.length; i += 4) {
        redData.data[i] = pixels[i];
        redData.data[i + 3] = pixels[i + 3];
        greenData.data[i + 1] = pixels[i + 1];
        greenData.data[i + 3] = pixels[i + 3];
        blueData.data[i + 2] = pixels[i + 2];
        blueData.data[i + 3] = pixels[i + 3];
      }

      context.save();
      context.globalCompositeOperation = 'screen';

      tempCtx.putImageData(redData, 0, 0);
      context.drawImage(
        tempCanvas,
        sx + shift,
        sy,
        sWidth,
        sHeight,
        shift,
        0,
        width,
        height
      );

      tempCtx.putImageData(greenData, 0, 0);
      context.drawImage(
        tempCanvas,
        sx,
        sy,
        sWidth,
        sHeight,
        0,
        0,
        width,
        height
      );

      tempCtx.putImageData(blueData, 0, 0);
      context.drawImage(
        tempCanvas,
        sx - shift,
        sy,
        sWidth,
        sHeight,
        -shift,
        0,
        width,
        height
      );

      context.restore();
    } else if (glitchType === 'slice') {
      // Horizontal slicing
      const sliceCount = 20;
      const sliceHeight = height / sliceCount;

      for (let i = 0; i < sliceCount; i++) {
        const offset = (random * 2 - 1) * intensity * (i % 2 === 0 ? 1 : -1);
        const sy_slice = sy + (sHeight / sliceCount) * i;
        const dy = sliceHeight * i;

        context.drawImage(
          image,
          sx,
          sy_slice,
          sWidth,
          sHeight / sliceCount,
          offset,
          dy,
          width,
          sliceHeight
        );
      }
    } else if (glitchType === 'corrupt') {
      // Random block corruption
      context.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, width, height);

      const blockCount = Math.floor(intensity / 2);
      for (let i = 0; i < blockCount; i++) {
        const blockW = Math.random() * width * 0.3;
        const blockH = Math.random() * height * 0.2;
        const blockX = Math.random() * (width - blockW);
        const blockY = Math.random() * (height - blockH);

        const sourceX = Math.random() * (width - blockW);
        const sourceY = Math.random() * (height - blockH);

        try {
          const imgData = context.getImageData(
            sourceX,
            sourceY,
            blockW,
            blockH
          );
          context.putImageData(imgData, blockX, blockY);
        } catch (e) {
          // Skip if out of bounds
        }
      }
    } else if (glitchType === 'static') {
      // TV static overlay
      context.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, width, height);

      const imageData = context.getImageData(0, 0, width, height);
      const pixels = imageData.data;

      for (let i = 0; i < pixels.length; i += 4) {
        if (Math.random() < intensity / 100) {
          const noise = Math.random() * 255;
          pixels[i] = noise;
          pixels[i + 1] = noise;
          pixels[i + 2] = noise;
        }
      }

      context.putImageData(imageData, 0, 0);
    } else if (glitchType === 'scan') {
      // Scanline effect
      context.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, width, height);

      const scanY = (frame * 5) % height;
      context.fillStyle = `rgba(255, 255, 255, ${intensity / 100})`;
      context.fillRect(0, scanY, width, 3);

      // Add horizontal distortion at scan line
      const distortY = Math.max(0, scanY - 10);
      const distortHeight = Math.min(20, height - distortY);

      if (distortHeight > 0) {
        try {
          const imgData = context.getImageData(
            0,
            distortY,
            width,
            distortHeight
          );
          const shiftAmount = intensity * (random * 2 - 1);
          context.putImageData(imgData, shiftAmount, distortY);
        } catch (e) {
          // Skip if out of bounds
        }
      }
    }
  }, [
    frame,
    image,
    width,
    height,
    durationInFrames,
    fit,
    backgroundColor,
    glitchType,
    intensity,
    frequency,
    continuous,
    glitchStartFrame,
    glitchEndFrame,
  ]);

  return (
    <CanvasAtom ref={canvasRef} data={{ className: 'w-full h-full' }} id={id} />
  );
};
