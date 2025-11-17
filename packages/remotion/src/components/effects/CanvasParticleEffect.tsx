import React, { useEffect, useRef, useState } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { Atom as CanvasAtom } from '../atoms/CanvasAtom';

const CanvasParticleEffectProps = z.object({
  imageUrl: z.string().url(),
  revealDurationInFrames: z.number().min(1),
  fit: z.enum(['cover', 'contain']).default('cover'),
  backgroundColor: z.string().default('rgba(0,0,0,0)'),
  particleCount: z.number().default(2000).describe('Number of particles'),
  particleSize: z.number().default(3).describe('Size of each particle'),
  particleEffect: z
    .enum(['assemble', 'disassemble', 'explode', 'pixelate'])
    .default('assemble'),
  assembleFrom: z
    .enum(['center', 'edges', 'random', 'bottom'])
    .default('random'),
  speed: z.number().default(1).describe('Animation speed multiplier'),
  rotation: z.boolean().default(false).describe('Add rotation to particles'),
});

type CanvasParticleEffectProps = z.infer<typeof CanvasParticleEffectProps>;

export const CanvasParticleEffect: React.FC<{
  data: CanvasParticleEffectProps;
  id: string;
}> = ({ data, id }) => {
  const {
    imageUrl,
    revealDurationInFrames,
    fit,
    backgroundColor,
    particleCount,
    particleSize,
    particleEffect,
    assembleFrom,
    speed,
    rotation,
  } = data;

  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [particles, setParticles] = useState<Array<{
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    color: string;
    startX: number;
    startY: number;
    angle: number;
  }> | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    img.onload = () => setImage(img);
  }, [imageUrl]);

  useEffect(() => {
    if (!image) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const pixels = imageData.data;

    const particleArray: typeof particles = [];
    const step = Math.floor(
      Math.sqrt((image.width * image.height) / particleCount)
    );

    for (let y = 0; y < image.height; y += step) {
      for (let x = 0; x < image.width; x += step) {
        const i = (y * image.width + x) * 4;
        const [r, g, b, a] = [
          pixels[i],
          pixels[i + 1],
          pixels[i + 2],
          pixels[i + 3],
        ];

        if (a > 128) {
          const targetX = x;
          const targetY = y;
          let startX = targetX,
            startY = targetY;

          if (particleEffect === 'assemble') {
            if (assembleFrom === 'center') {
              startX = image.width / 2;
              startY = image.height / 2;
            } else if (assembleFrom === 'edges') {
              const edge = Math.floor(Math.random() * 4);
              if (edge === 0) {
                startX = 0;
                startY = Math.random() * image.height;
              } else if (edge === 1) {
                startX = image.width;
                startY = Math.random() * image.height;
              } else if (edge === 2) {
                startX = Math.random() * image.width;
                startY = 0;
              } else {
                startX = Math.random() * image.width;
                startY = image.height;
              }
            } else if (assembleFrom === 'bottom') {
              startX = targetX;
              startY = image.height + Math.random() * 200;
            } else {
              startX = Math.random() * image.width;
              startY = Math.random() * image.height;
            }
          }

          particleArray.push({
            x: startX,
            y: startY,
            targetX,
            targetY,
            color: `rgba(${r},${g},${b},${a / 255})`,
            startX,
            startY,
            angle: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    setParticles(particleArray);
  }, [image, particleCount, particleEffect, assembleFrom]);

  useEffect(() => {
    if (!canvasRef.current || !image || !particles) return;
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    context.canvas.width = width;
    context.canvas.height = height;
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);

    const progress = Math.min((frame / revealDurationInFrames) * speed, 1);

    // If animation is complete, just draw the full image
    if (progress >= 1 && particleEffect === 'assemble') {
      const scaleX = width / image.width;
      const scaleY = height / image.height;
      let scale = scaleX;
      let offsetX = 0,
        offsetY = 0;

      if (fit === 'cover') {
        scale = Math.max(scaleX, scaleY);
        offsetX = (width - image.width * scale) / 2;
        offsetY = (height - image.height * scale) / 2;
      } else {
        scale = Math.min(scaleX, scaleY);
        offsetX = (width - image.width * scale) / 2;
        offsetY = (height - image.height * scale) / 2;
      }

      context.save();
      context.translate(offsetX, offsetY);
      context.scale(scale, scale);
      context.drawImage(image, 0, 0);
      context.restore();
      return;
    }

    const easeProgress =
      particleEffect === 'explode'
        ? progress * progress * (3 - 2 * progress) // Smooth ease
        : 1 - Math.pow(1 - progress, 3); // Ease out cubic

    const scaleX = width / image.width;
    const scaleY = height / image.height;
    let scale = scaleX;
    let offsetX = 0,
      offsetY = 0;

    if (fit === 'cover') {
      scale = Math.max(scaleX, scaleY);
      offsetX = (width - image.width * scale) / 2;
      offsetY = (height - image.height * scale) / 2;
    } else {
      scale = Math.min(scaleX, scaleY);
      offsetX = (width - image.width * scale) / 2;
      offsetY = (height - image.height * scale) / 2;
    }

    particles.forEach((particle) => {
      let x, y;

      if (particleEffect === 'assemble') {
        x =
          particle.startX + (particle.targetX - particle.startX) * easeProgress;
        y =
          particle.startY + (particle.targetY - particle.startY) * easeProgress;
      } else if (particleEffect === 'disassemble') {
        const reverseProgress = 1 - easeProgress;
        x =
          particle.targetX +
          (particle.startX - particle.targetX) * (1 - reverseProgress);
        y =
          particle.targetY +
          (particle.startY - particle.targetY) * (1 - reverseProgress);
      } else if (particleEffect === 'explode') {
        const dx = particle.targetX - image.width / 2;
        const dy = particle.targetY - image.height / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const explosionDist = dist * easeProgress * 3;
        x = particle.targetX + (dx / dist) * explosionDist;
        y = particle.targetY + (dy / dist) * explosionDist;
      } else {
        // pixelate
        x = particle.targetX;
        y = particle.targetY;
      }

      const finalX = x * scale + offsetX;
      const finalY = y * scale + offsetY;

      context.save();
      context.translate(finalX, finalY);

      if (rotation && particleEffect !== 'pixelate') {
        context.rotate(particle.angle * easeProgress);
      }

      const size =
        particleEffect === 'pixelate'
          ? particleSize * (1 + (1 - easeProgress) * 3)
          : particleSize;

      context.fillStyle = particle.color;
      context.fillRect(-size / 2, -size / 2, size, size);
      context.restore();
    });
  }, [
    frame,
    image,
    width,
    height,
    particles,
    revealDurationInFrames,
    fit,
    backgroundColor,
    particleSize,
    particleEffect,
    speed,
    rotation,
  ]);

  return (
    <CanvasAtom ref={canvasRef} data={{ className: 'w-full h-full' }} id={id} />
  );
};
