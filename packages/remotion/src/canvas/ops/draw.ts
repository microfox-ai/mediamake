import { z } from 'zod';
import { registerCanvasOp } from '../registry';
import { computeFitRect } from '../runtime/geometry';

/**
 * Source ops: put pixels on the canvas. Every other op family (clip, mask,
 * pixel, post) operates on what these produce, so any combination of
 * "content × treatment" is expressible without writing new components.
 */

// --- draw:image -------------------------------------------------------------

const DrawImageSchema = z.object({
  source: z.string().describe('Name of an entry in the pipeline sources map'),
  fit: z.enum(['cover', 'contain', 'fill']).default('cover'),
  opacity: z.number().min(0).max(1).default(1),
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().optional().describe('Defaults to canvas width'),
  height: z.number().optional().describe('Defaults to canvas height'),
});

registerCanvasOp<z.infer<typeof DrawImageSchema>, void>({
  name: 'draw:image',
  displayName: 'Draw Image',
  description: 'Draw a named image source with cover/contain/fill fitting',
  schema: DrawImageSchema,
  apply: ({ g, params, frame, assets }) => {
    const img = assets.image(params.source);
    if (!img) return;
    const w = params.width ?? frame.width;
    const h = params.height ?? frame.height;
    const r = computeFitRect(img.width, img.height, w, h, params.fit);
    g.globalAlpha *= params.opacity;
    g.drawImage(
      img,
      r.sx,
      r.sy,
      r.sWidth,
      r.sHeight,
      params.x + r.dx,
      params.y + r.dy,
      r.dWidth,
      r.dHeight
    );
  },
});

// --- draw:text --------------------------------------------------------------

const DrawTextSchema = z.object({
  text: z.string(),
  fontFamily: z.string().default('sans-serif'),
  fontSize: z.number().default(80),
  fontWeight: z.union([z.string(), z.number()]).default('bold'),
  color: z.string().default('#ffffff'),
  x: z.number().optional().describe('Defaults to canvas center'),
  y: z.number().optional().describe('Defaults to canvas center'),
  align: z.enum(['left', 'center', 'right']).default('center'),
  baseline: z
    .enum(['top', 'middle', 'bottom', 'alphabetic'])
    .default('middle'),
  maxWidth: z.number().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
});

registerCanvasOp<z.infer<typeof DrawTextSchema>, void>({
  name: 'draw:text',
  displayName: 'Draw Text',
  description: 'Draw a line of text',
  schema: DrawTextSchema,
  apply: ({ g, params, frame }) => {
    g.globalAlpha *= params.opacity;
    g.font = `${params.fontWeight} ${params.fontSize}px ${params.fontFamily}`;
    g.textAlign = params.align;
    g.textBaseline = params.baseline;
    const x = params.x ?? frame.width / 2;
    const y = params.y ?? frame.height / 2;
    if (params.strokeColor && params.strokeWidth > 0) {
      g.strokeStyle = params.strokeColor;
      g.lineWidth = params.strokeWidth;
      g.strokeText(params.text, x, y, params.maxWidth);
    }
    g.fillStyle = params.color;
    g.fillText(params.text, x, y, params.maxWidth);
  },
});

// --- draw:shape -------------------------------------------------------------

const DrawShapeSchema = z.object({
  kind: z.enum(['rect', 'circle', 'polygon', 'star', 'line']).default('rect'),
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().optional(),
  height: z.number().optional(),
  radius: z.number().optional(),
  sides: z.number().min(3).default(5).describe('polygon/star points'),
  innerRadius: z.number().optional().describe('star inner radius'),
  rotation: z.number().default(0).describe('degrees'),
  fill: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().default(0),
  cornerRadius: z.number().default(0),
  x2: z.number().optional().describe('line end x'),
  y2: z.number().optional().describe('line end y'),
  opacity: z.number().min(0).max(1).default(1),
});

registerCanvasOp<z.infer<typeof DrawShapeSchema>, void>({
  name: 'draw:shape',
  displayName: 'Draw Shape',
  description: 'Rect, circle, polygon, star or line',
  schema: DrawShapeSchema,
  apply: ({ g, params, frame }) => {
    const w = params.width ?? frame.width;
    const h = params.height ?? frame.height;
    const cx = params.x + w / 2;
    const cy = params.y + h / 2;
    const radius = params.radius ?? Math.min(w, h) / 2;

    g.globalAlpha *= params.opacity;
    if (params.rotation !== 0) {
      g.translate(cx, cy);
      g.rotate((params.rotation * Math.PI) / 180);
      g.translate(-cx, -cy);
    }

    g.beginPath();
    switch (params.kind) {
      case 'rect':
        if (params.cornerRadius > 0 && 'roundRect' in g) {
          (g as any).roundRect(params.x, params.y, w, h, params.cornerRadius);
        } else {
          g.rect(params.x, params.y, w, h);
        }
        break;
      case 'circle':
        g.arc(cx, cy, radius, 0, Math.PI * 2);
        break;
      case 'polygon': {
        for (let i = 0; i < params.sides; i++) {
          const a = (i / params.sides) * Math.PI * 2 - Math.PI / 2;
          const px = cx + Math.cos(a) * radius;
          const py = cy + Math.sin(a) * radius;
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
        break;
      }
      case 'star': {
        const inner = params.innerRadius ?? radius * 0.5;
        for (let i = 0; i < params.sides * 2; i++) {
          const r = i % 2 === 0 ? radius : inner;
          const a = (i / (params.sides * 2)) * Math.PI * 2 - Math.PI / 2;
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r;
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
        break;
      }
      case 'line':
        g.moveTo(params.x, params.y);
        g.lineTo(params.x2 ?? frame.width, params.y2 ?? frame.height);
        break;
    }

    if (params.fill && params.kind !== 'line') {
      g.fillStyle = params.fill;
      g.fill();
    }
    if (params.strokeColor && params.strokeWidth > 0) {
      g.strokeStyle = params.strokeColor;
      g.lineWidth = params.strokeWidth;
      g.stroke();
    }
  },
});

// --- draw:gradient ----------------------------------------------------------

const GradientStopSchema = z.object({
  offset: z.number().min(0).max(1),
  color: z.string(),
});

const DrawGradientSchema = z.object({
  kind: z.enum(['linear', 'radial']).default('linear'),
  stops: z
    .array(GradientStopSchema)
    .default([
      { offset: 0, color: '#000000' },
      { offset: 1, color: 'rgba(0,0,0,0)' },
    ]),
  angle: z.number().default(90).describe('linear gradient angle in degrees'),
  cx: z.number().optional().describe('radial center x, defaults to center'),
  cy: z.number().optional().describe('radial center y, defaults to center'),
  radius: z.number().optional(),
  opacity: z.number().min(0).max(1).default(1),
});

registerCanvasOp<z.infer<typeof DrawGradientSchema>, void>({
  name: 'draw:gradient',
  displayName: 'Draw Gradient',
  description: 'Fill the canvas with a linear or radial gradient',
  schema: DrawGradientSchema,
  apply: ({ g, params, frame }) => {
    const { width, height } = frame;
    let gradient: CanvasGradient;
    if (params.kind === 'radial') {
      const cx = params.cx ?? width / 2;
      const cy = params.cy ?? height / 2;
      const r = params.radius ?? Math.sqrt(width * width + height * height) / 2;
      gradient = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    } else {
      const rad = ((params.angle - 90) * Math.PI) / 180;
      const cx = width / 2;
      const cy = height / 2;
      const len = (Math.abs(Math.cos(rad)) * width + Math.abs(Math.sin(rad)) * height) / 2;
      gradient = g.createLinearGradient(
        cx - Math.cos(rad) * len,
        cy - Math.sin(rad) * len,
        cx + Math.cos(rad) * len,
        cy + Math.sin(rad) * len
      );
    }
    for (const stop of params.stops) {
      gradient.addColorStop(stop.offset, stop.color);
    }
    g.globalAlpha *= params.opacity;
    g.fillStyle = gradient;
    g.fillRect(0, 0, width, height);
  },
});

// --- group (transform container) ---------------------------------------------

const GroupSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  scale: z.number().default(1),
  rotation: z.number().default(0).describe('degrees, around canvas center'),
  opacity: z.number().min(0).max(1).default(1),
  blend: z.string().default('source-over').describe('globalCompositeOperation'),
});

registerCanvasOp<z.infer<typeof GroupSchema>, void>({
  name: 'group',
  displayName: 'Group',
  description: 'Transform/opacity/blend container for child ops',
  schema: GroupSchema,
  apply: ({ g, params, frame, renderChildren }) => {
    const cx = frame.width / 2;
    const cy = frame.height / 2;
    g.globalAlpha *= params.opacity;
    g.globalCompositeOperation =
      params.blend as GlobalCompositeOperation;
    g.translate(params.x + cx, params.y + cy);
    g.rotate((params.rotation * Math.PI) / 180);
    g.scale(params.scale, params.scale);
    g.translate(-cx, -cy);
    renderChildren();
  },
});
