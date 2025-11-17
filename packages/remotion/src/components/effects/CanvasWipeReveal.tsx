import React, { useEffect, useRef, useState } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { Atom as CanvasAtom } from '../atoms/CanvasAtom';

const mulberry32 = (seed: number) => {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const CanvasWipeRevealProps = z.object({
  imageUrl: z.string().url(),
  revealDurationInFrames: z.number().min(1),
  revealType: z.enum(['wipe', 'radial']).default('wipe'),
  angle: z.number().default(0),
  fit: z.enum(['cover', 'contain']).default('cover'),
  edgeStyle: z.enum(['straight', 'organic', 'burn']).default('straight'),
  edgeWaviness: z.number().default(30),
  edgeFrequency: z.number().default(4),
  backgroundColor: z.string().default('rgba(0,0,0,0)'),
  burnGlow: z.boolean().default(true),
  burnGlowColor: z.string().default('#ff6600'),
  burnGlowIntensity: z.number().default(1),
  organicRandomAmplitude: z.boolean().default(true),
  organicRandomWavelength: z.boolean().default(false),
});

type CanvasWipeRevealProps = z.infer<typeof CanvasWipeRevealProps>;

export const CanvasWipeReveal: React.FC<{
  data: CanvasWipeRevealProps;
  id: string;
}> = ({ data, id }) => {
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

    const progress = Math.min(frame / revealDurationInFrames, 1);
    if (progress === 0 && backgroundColor === 'rgba(0,0,0,0)') return;

    const seed = id
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    context.save();
    context.beginPath();

    if (revealType === 'radial') {
      const baseRadius =
        (Math.sqrt(width * width + height * height) / 2) * progress;

      if (edgeStyle === 'organic') {
        const points = 120;
        const random = mulberry32(seed);
        const amplitudes = Array.from({ length: points + 1 }, () =>
          organicRandomAmplitude ? 0.5 + random() : 1
        );
        const wavelengths = Array.from({ length: points + 1 }, () =>
          organicRandomWavelength ? 0.5 + random() * 1.5 : 1
        );

        for (let i = 0; i <= points; i++) {
          const p = i / points;
          const angle = p * Math.PI * 2;
          const wave =
            Math.sin(
              p * Math.PI * edgeFrequency * wavelengths[i] + frame * 0.1
            ) *
            edgeWaviness *
            progress *
            amplitudes[i];
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
        const randomValues = Array.from({ length: points + 1 }, () => random());
        const phaseOffsets = Array.from(
          { length: points + 1 },
          () => random() * Math.PI * 2
        );
        const sparklePoints: Array<{
          x: number;
          y: number;
          intensity: number;
        }> = [];

        for (let i = 0; i <= points; i++) {
          const p = i / points;
          const angle = p * Math.PI * 2;
          const flicker = Math.sin(frame * 0.3 + phaseOffsets[i]);
          const burnOffset =
            (randomValues[i] * 2 - 1) * flicker * edgeWaviness * progress;
          const radius = baseRadius + burnOffset;
          const x = width / 2 + Math.cos(angle) * radius;
          const y = height / 2 + Math.sin(angle) * radius;

          if (burnGlow && i % 5 === 0 && flicker > 0.3) {
            sparklePoints.push({ x, y, intensity: flicker });
          }

          if (i === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();

        if (burnGlow && sparklePoints.length > 0) {
          sparklePoints.forEach((point) => {
            const glowSize = 3 + point.intensity * 5 * burnGlowIntensity;
            // Check for valid coordinates before creating gradient
            if (
              isFinite(point.x) &&
              isFinite(point.y) &&
              isFinite(glowSize) &&
              glowSize > 0
            ) {
              const gradient = context.createRadialGradient(
                point.x,
                point.y,
                0,
                point.x,
                point.y,
                glowSize
              );
              gradient.addColorStop(0, burnGlowColor);
              gradient.addColorStop(0.5, burnGlowColor + '80');
              gradient.addColorStop(1, burnGlowColor + '00');
              context.fillStyle = gradient;
              context.fillRect(
                point.x - glowSize,
                point.y - glowSize,
                glowSize * 2,
                glowSize * 2
              );
            }
          });
        }
      } else {
        context.arc(width / 2, height / 2, baseRadius, 0, Math.PI * 2);
      }
    } else {
      const angleInRadians = (angle * Math.PI) / 180;
      const diagonal = Math.sqrt(width * width + height * height);

      context.translate(width / 2, height / 2);
      context.rotate(angleInRadians);

      const wipeEdgePosition = progress * diagonal - diagonal / 2;

      if (edgeStyle === 'burn') {
        const points = 100;
        const random = mulberry32(seed);
        const randomValues = Array.from({ length: points + 1 }, () => random());
        const phaseOffsets = Array.from(
          { length: points + 1 },
          () => random() * Math.PI * 2
        );
        const edgePoints: Array<{ x: number; y: number }> = [];

        context.moveTo(wipeEdgePosition, -diagonal / 2);
        for (let i = 0; i <= points; i++) {
          const p = i / points;
          const y = (p - 0.5) * diagonal;
          const flicker = Math.sin(frame * 0.3 + phaseOffsets[i]);
          const x =
            wipeEdgePosition +
            (randomValues[i] * 2 - 1) * flicker * edgeWaviness;
          context.lineTo(x, y);
          edgePoints.push({ x, y });
        }
        context.lineTo(wipeEdgePosition, diagonal / 2);
        context.lineTo(-diagonal / 2, diagonal / 2);
        context.lineTo(-diagonal / 2, -diagonal / 2);
        context.closePath();

        if (burnGlow && progress > 0.01) {
          const random2 = mulberry32(seed + frame);
          for (let i = 0; i < edgePoints.length; i += 3) {
            const point = edgePoints[i];
            const flicker = Math.sin(frame * 0.3 + phaseOffsets[i]);

            if (flicker > 0.2) {
              const glowSize = 4 + random2() * 6 * flicker * burnGlowIntensity;

              // Check for valid coordinates
              if (
                isFinite(point.x) &&
                isFinite(point.y) &&
                isFinite(glowSize) &&
                glowSize > 0
              ) {
                const gradient = context.createRadialGradient(
                  point.x,
                  point.y,
                  0,
                  point.x,
                  point.y,
                  glowSize
                );
                gradient.addColorStop(0, burnGlowColor);
                gradient.addColorStop(0.4, burnGlowColor + 'CC');
                gradient.addColorStop(1, burnGlowColor + '00');
                context.fillStyle = gradient;
                context.fillRect(
                  point.x - glowSize,
                  point.y - glowSize,
                  glowSize * 2,
                  glowSize * 2
                );

                if (random2() > 0.85) {
                  const sparkleSize = 2 + random2() * 3;
                  context.fillStyle = '#ffffff';
                  context.fillRect(
                    point.x - sparkleSize / 2,
                    point.y - sparkleSize / 2,
                    sparkleSize,
                    sparkleSize
                  );
                }
              }
            }
          }
        }
      } else if (edgeStyle === 'organic') {
        const points = 100;
        const random = mulberry32(seed);
        const amplitudes = Array.from({ length: points + 1 }, () =>
          organicRandomAmplitude ? 0.5 + random() : 1
        );
        const wavelengths = Array.from({ length: points + 1 }, () =>
          organicRandomWavelength ? 0.5 + random() * 1.5 : 1
        );

        context.moveTo(wipeEdgePosition, -diagonal / 2);
        for (let i = 0; i <= points; i++) {
          const p = i / points;
          const y = (p - 0.5) * diagonal;
          const wave =
            Math.sin(
              p * edgeFrequency * wavelengths[i] * Math.PI + frame * 0.1
            ) *
            edgeWaviness *
            amplitudes[i];
          context.lineTo(wipeEdgePosition + wave, y);
        }
        context.lineTo(wipeEdgePosition, diagonal / 2);
        context.lineTo(-diagonal / 2, diagonal / 2);
        context.lineTo(-diagonal / 2, -diagonal / 2);
        context.closePath();
      } else {
        context.rect(
          -diagonal / 2,
          -diagonal / 2,
          wipeEdgePosition + diagonal / 2,
          diagonal
        );
      }

      context.rotate(-angleInRadians);
      context.translate(-width / 2, -height / 2);
    }

    context.clip();

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
    context.restore();
  }, [
    frame,
    image,
    width,
    height,
    revealDurationInFrames,
    fit,
    revealType,
    angle,
    edgeStyle,
    edgeWaviness,
    edgeFrequency,
    id,
    backgroundColor,
    burnGlow,
    burnGlowColor,
    burnGlowIntensity,
    organicRandomAmplitude,
    organicRandomWavelength,
  ]);

  return (
    <CanvasAtom ref={canvasRef} data={{ className: 'w-full h-full' }} id={id} />
  );
};
