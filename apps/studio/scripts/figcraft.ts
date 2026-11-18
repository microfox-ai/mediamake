/**
 * Figcraft (github.com/storytold/figcraft, MIT or Apache-2.0): an open-source design editor whose
 * CLI, `figcraft-cli`, builds and exports documents without a window and serves them over MCP.
 * `mm thumbs figcraft` rebuilds a finished thumbnail or poster there as layers the user can edit
 * (pictures, devices and textures as images, every headline line as live text in the job's fonts)
 * and exports the edited one back.
 *
 * This file is the part with no rendering: finding the CLI, reading CSS colours, deciding how each
 * layer travels, and writing the command script (`figcraft-cli run`) from a variant, its laid-out
 * text and its baked layers. scripts/thumbs.ts renders the layers and runs the script.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Box, Layer, ResolvedVariant, TextLayer } from '../thumbnails/spec.ts';
import type { TextLayout } from '../thumbnails/layers/Text.tsx';

/** One step of a `figcraft-cli run` script; `as` names it for `{ "$ref": name }` in later steps. */
export type Step = { command: string; params: Record<string, unknown>; as?: string };

/** A text layer's lines as laid out in the render (the `[figcraft-text]` console lines). */
export type Probe = TextLayout & { index: number };

/** How one layer goes to Figcraft. */
export type Plan = {
  /** `<index>` in variant.layers, or `over-<n>` for a treatment's texture layer */
  key: string;
  layer: Layer;
  name: string;
  how: 'image' | 'rect' | 'text';
  /** a text layer Figcraft can't draw as it is: its render goes in visible, the live text under it hidden */
  bake?: string;
  /** device scale of the baked PNG: pictures at 2× so they stay sharp when made bigger */
  scale: number;
  blend?: string;
  locked?: boolean;
};

/** A layer rendered alone and trimmed: the PNG and where it sits, in canvas px. */
export type Baked = { file: string; box: Box };

/** Effects that blend by themselves (layers/Graphics.tsx), unless the layer sets `blend`. */
export const FX_BLEND: Record<string, string | undefined> = {
  light: 'screen',
  tint: 'soft-light',
  halftone: 'multiply',
  leak: 'screen',
  paper: 'multiply',
  dust: 'screen',
  grain: 'overlay',
};

/** The installed figcraft-cli: $FIGCRAFT_CLI, then the PATH, then ~/.local/bin. */
export const figcraftCli = (env: NodeJS.ProcessEnv = process.env): string | undefined => {
  if (env.FIGCRAFT_CLI && fs.existsSync(env.FIGCRAFT_CLI)) return env.FIGCRAFT_CLI;
  const which = spawnSync('which', ['figcraft-cli'], { encoding: 'utf8' });
  if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();
  const local = path.join(os.homedir(), '.local', 'bin', 'figcraft-cli');
  return fs.existsSync(local) ? local : undefined;
};

export const INSTALL_HINT =
  'figcraft-cli is not installed. Download figcraft-cli-<version>-macos-universal.zip from https://github.com/storytold/figcraft/releases/latest, put figcraft-cli in ~/.local/bin, and add the MCP: claude mcp add --scope user figcraft -- ~/.local/bin/figcraft-cli mcp (the use-figcraft skill, or mcp/figcraft in MediaMake)';

const NAMED: Record<string, string> = { white: '#FFFFFF', black: '#000000', red: '#FF0000', transparent: '#00000000' };
const hex2 = (n: number) =>
  Math.round(Math.max(0, Math.min(255, n)))
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();

/** A CSS colour as Figcraft's `#RRGGBB` / `#RRGGBBAA`; undefined for what isn't a plain colour (gradients, var()). */
export const hexColor = (css?: string): string | undefined => {
  if (!css) return undefined;
  const c = css.trim().toLowerCase();
  if (NAMED[c]) return NAMED[c];
  let m = c.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    const h = m[1];
    if (h.length === 3 || h.length === 4) return `#${[...h].map(x => x + x).join('')}`.toUpperCase().replace(/^(#[0-9A-F]{6})FF$/, '$1');
    if (h.length === 6 || h.length === 8) return `#${h}`.toUpperCase().replace(/^(#[0-9A-F]{6})FF$/, '$1');
    return undefined;
  }
  m = c.match(/^rgba?\(([^)]+)\)$/);
  if (!m) return undefined;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return undefined;
  const ch = (p: string) => (p.endsWith('%') ? (parseFloat(p) * 255) / 100 : parseFloat(p));
  const [r, g, b] = parts.slice(0, 3).map(ch);
  if ([r, g, b].some(Number.isNaN)) return undefined;
  const a = parts[3] === undefined ? 1 : parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
  return `#${hex2(r)}${hex2(g)}${hex2(b)}${a < 1 ? hex2(a * 255) : ''}`;
};

/** Style names a font file may use for a weight, most likely first. */
const WEIGHT_NAMES: Record<number, string[]> = {
  100: ['Thin', 'Hairline'],
  200: ['ExtraLight', 'Extra Light', 'UltraLight'],
  300: ['Light'],
  400: ['Regular', 'Normal', 'Book', 'Roman'],
  500: ['Medium'],
  600: ['SemiBold', 'Semi Bold', 'DemiBold'],
  700: ['Bold'],
  800: ['ExtraBold', 'Extra Bold', 'UltraBold', 'Heavy'],
  900: ['Black', 'Heavy', 'Ultra'],
};
const squash = (s: string) => s.toLowerCase().replace(/[\s_-]/g, '');

/** Figcraft's `fontStyle` for a weight: the face the font really has (`styles`, from text.fonts) when known. */
export const fontStyle = (weight = 400, italic = false, styles?: string[]): string | undefined => {
  const w = Math.min(900, Math.max(100, Math.round(weight / 100) * 100));
  const names = WEIGHT_NAMES[w].map(n => (italic ? (w === 400 ? 'Italic' : `${n} Italic`) : n));
  if (!styles?.length) return names[0];
  const found = names.map(n => styles.find(s => squash(s) === squash(n))).find(Boolean);
  if (found) return found;
  // a family with one face (a brand font, a display face): that one
  return styles.length === 1 ? styles[0] : undefined;
};

/** A simple CSS linear-gradient (an angle or `to <side>`, then plain colours) as a Figcraft paint. */
export const gradientPaint = (css?: string): Record<string, unknown> | undefined => {
  const m = css?.trim().match(/^linear-gradient\((.*)\)$/i);
  if (!m) return undefined;
  const parts = m[1].split(/,(?![^(]*\))/).map(s => s.trim());
  let deg = 180;
  const first = parts[0];
  const sides: Record<string, number> = { 'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270 };
  if (/deg$/.test(first)) deg = parseFloat(first), parts.shift();
  else if (first in sides) deg = sides[first], parts.shift();
  else if (/^to /.test(first)) return undefined;
  // colours with an optional position each; Figcraft takes even stops, so a position other than the even one is a no
  const stops = parts.map(p => {
    const pm = p.match(/^(.*?)(?:\s+([\d.]+)%)?$/);
    return { color: hexColor(pm?.[1]), at: pm?.[2] === undefined ? undefined : parseFloat(pm[2]) / 100 };
  });
  if (stops.length < 2 || stops.some(s => !s.color)) return undefined;
  if (stops.some((s, i) => s.at !== undefined && Math.abs(s.at - i / (stops.length - 1)) > 0.02)) return undefined;
  const a = (deg * Math.PI) / 180;
  const dx = Math.sin(a) / 2;
  const dy = -Math.cos(a) / 2;
  const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
  return { type: 'linearGradient', stops: stops.map(s => s.color), from: [r4(0.5 - dx), r4(0.5 - dy)], to: [r4(0.5 + dx), r4(0.5 + dy)] };
};

const lineFill = (layer: TextLayer, fill?: string) => fill ?? layer.fill;

/** Why a text layer can't go to Figcraft as live text exactly, or undefined when it can. */
export const textBakeReason = (layer: TextLayer): string | undefined => {
  if (layer.plate?.knockout) return 'words cut out of a plate';
  if (layer.skew || layer.plate?.skew) return 'slanted';
  const fills = [layer.fill, ...(Array.isArray(layer.lines) ? layer.lines.map(l => (typeof l === 'string' ? undefined : l.fill)) : [])].filter(Boolean) as string[];
  if (fills.some(f => !gradientPaint(f))) return 'a picture or gradient inside the letters';
  const colours = [layer.color, layer.accent, layer.stroke?.color, layer.shadow?.color, layer.glow?.color, layer.extrude?.color, layer.plate?.color, ...(Array.isArray(layer.lines) ? layer.lines.map(l => (typeof l === 'string' ? undefined : l.color)) : [])];
  if (colours.some(c => c !== undefined && !hexColor(c))) return 'a colour Figcraft cannot read';
  if (layer.plate?.background && !hexColor(layer.plate.background) && !gradientPaint(layer.plate.background)) return 'a plate with a CSS background';
  return undefined;
};

const layerName = (layer: Layer, key: string) => {
  const what =
    layer.type === 'text'
      ? (typeof layer.lines === 'string' ? layer.lines : layer.lines.map(l => (typeof l === 'string' ? l : l.t)).join(' ')).replace(/\*/g, '').replace(/\n/g, ' ')
      : layer.type === 'fx'
        ? layer.kind
        : 'src' in layer && layer.src
          ? path.basename(layer.src)
          : layer.type === 'shape'
            ? layer.kind
            : layer.type === 'custom'
              ? layer.component
              : '';
  const id = layer.id ?? (key.startsWith('over-') ? `treatment ${key.slice(5)}` : layer.type);
  return what && what !== id ? `${id} · ${what.slice(0, 40)}` : id;
};

/** A fill layer's one plain colour (`color`, or a `background` that is only a colour), else undefined. */
export const fillColor = (layer: Extract<Layer, { type: 'fill' }>): string | undefined => {
  if (layer.background && layer.color) return undefined;
  return hexColor(layer.background ?? layer.color);
};

/** How every layer of a variant goes over: text as live text, a plain fill as a rectangle, the rest as images. */
export const planLayers = (variant: ResolvedVariant, scale: number): Plan[] => {
  const all: [string, Layer][] = [...variant.layers.map((l, i) => [String(i), l] as [string, Layer]), ...(variant.post?.over ?? []).map((l, i) => [`over-${i}`, l] as [string, Layer])];
  return all.map(([key, layer]) => {
    const name = layerName(layer, key);
    const blend = layer.type === 'fx' ? (layer.blend ?? FX_BLEND[layer.kind]) : layer.blend;
    if (layer.type === 'text') return { key, layer, name, how: 'text', bake: textBakeReason(layer), scale: Math.max(2, scale), blend };
    if (layer.type === 'fill' && fillColor(layer) && !layer.rays && !layer.rotate) return { key, layer, name, how: 'rect', scale, blend, locked: true };
    const flat = layer.type === 'fill' || layer.type === 'fx';
    return { key, layer, name, how: 'image', scale: flat ? scale : Math.max(2, scale), blend, locked: flat };
  });
};

/** The layer props shared by every kind: opacity and blend go on the Figcraft layer, rotation by kind. */
const blendProps = (plan: Plan, withOpacity: boolean) => ({
  ...(withOpacity && plan.layer.opacity !== undefined && plan.layer.opacity !== 1 ? { opacity: plan.layer.opacity } : {}),
  ...(plan.blend && plan.blend !== 'normal' ? { blend: plan.blend } : {}),
});

/** A point turned `deg` (CSS: clockwise on screen) about a centre. */
const turnPoint = ([x, y]: [number, number], [cx, cy]: [number, number], deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
};

/** A dropShadow effect, CSS-style (Figcraft's radius is the CSS blur radius). */
const shadow = (color: string | undefined, x: number, y: number, blur: number) => ({ type: 'dropShadow', color: hexColor(color) ?? '#00000099', offset: [x, y], radius: blur });

/** The live-text steps of one text layer: per line a plate (when it has one) and a text layer, grouped. */
export const textSteps = (plan: Plan, probe: Probe, frame: string, n: number, styles: Record<string, string[]>, hidden: boolean): Step[] => {
  const layer = plan.layer as TextLayer;
  const align = layer.align ?? 'center';
  const steps: Step[] = [];
  const ids: { $ref: string }[] = [];
  const rotate = layer.rotate ?? 0;
  const centre: [number, number] = [probe.boxes[0].x + probe.boxes[0].w / 2, (probe.inkTop + probe.inkBottom) / 2];
  // x and y for a box turned with the layer about its centre. Figcraft counts degrees the other way
  // from CSS and turns a layer about its own centre once it has its size, so the turn is a node.set
  // after the layer is made (in node.create's props, auto-sized text turns before it is measured)
  const place = (x: number, y: number, w: number, h: number) => {
    if (!rotate) return { x: round(x), y: round(y) };
    const [nx, ny] = turnPoint([x + w / 2, y + h / 2], centre, rotate);
    return { x: round(nx - w / 2), y: round(ny - h / 2) };
  };
  const turn = (as: string) => rotate && steps.push({ command: 'node.set', params: { ids: [{ $ref: as }], props: { rotation: -rotate } } });
  probe.items.forEach((item, i) => {
    const b = probe.boxes[i];
    const left = align === 'left' ? b.x : align === 'right' ? b.x + b.w - b.textW : b.x + (b.w - b.textW) / 2;
    const plate = layer.plate;
    if (plate && !plate.knockout) {
      const padX = plate.padX ?? 20;
      const padY = plate.padY ?? 6;
      const w = b.textW + padX * 2;
      const h = b.inkBottom - b.inkTop + padY * 2;
      const fill = gradientPaint(plate.background) ?? hexColor(plate.background) ?? hexColor(plate.color) ?? '#000000';
      const as = `t${n}p${i}`;
      steps.push({
        command: 'node.create',
        as,
        params: { type: 'rectangle', parent: { $ref: frame }, name: `plate ${i + 1}`, ...place(left - padX, b.inkTop - padY, w, h), width: round(w), height: round(h), props: { fills: [fill], ...(plate.radius ? { cornerRadius: plate.radius } : {}) } },
      });
      turn(as);
      ids.push({ $ref: as });
    }
    const fill = lineFill(layer, item.fill);
    const paint = fill ? gradientPaint(fill) : undefined;
    const effects = [
      ...(layer.extrude ? extrudeShadows(layer.extrude, b.size) : []),
      ...(layer.shadow ? [shadow(layer.shadow.color ?? 'rgba(0,0,0,0.6)', layer.shadow.x ?? 0, layer.shadow.y ?? 6, layer.shadow.blur ?? 16)] : []),
    ];
    const style = fontStyle(item.weight, item.italic, styles[item.font]);
    const as = `t${n}l${i}`;
    steps.push({
      command: 'node.create',
      as,
      params: {
        type: 'text',
        parent: { $ref: frame },
        name: item.text,
        text: item.text,
        ...place(left, b.y, b.textW, b.h),
        props: {
          fontFamily: item.font,
          ...(style ? { fontStyle: style } : {}),
          fontSize: round(b.size),
          lineHeight: round(b.h),
          letterSpacing: round(b.spacing),
          textAlign: align,
          textAutoResize: 'widthAndHeight',
          fills: [paint ?? hexColor(item.color ?? layer.color ?? '#fff') ?? '#FFFFFF'],
          ...(layer.stroke ? { stroke: hexColor(layer.stroke.color) ?? '#000000', strokeWeight: layer.stroke.width, strokeAlign: 'outside' } : {}),
          ...(effects.length ? { effects } : {}),
        },
      },
    });
    turn(as);
    ids.push({ $ref: as });
    // *accent* words: their own fill over their characters
    let at = 0;
    for (const seg of item.segs) {
      const len = [...seg.t].length;
      if (seg.accent) steps.push({ command: 'text.style', params: { id: { $ref: as }, start: at, end: at + len, textFills: [hexColor(layer.accent ?? '#ff2a2a') ?? '#FF2A2A'] } });
      at += len;
    }
  });
  const glow = layer.glow ? [shadow(layer.glow.color, 0, 0, layer.glow.size ?? 24), shadow(layer.glow.color, 0, 0, (layer.glow.size ?? 24) * 2)] : [];
  const shared = { ...blendProps(plan, true), ...(hidden ? { visible: false } : {}) };
  if (ids.length === 1) {
    // one line and no plate: the text layer alone, no group to click through
    const node = steps.find(s => s.as === ids[0].$ref)!;
    const props = node.params.props as Record<string, unknown>;
    if (glow.length) props.effects = [...((props.effects as unknown[] | undefined) ?? []), ...glow];
    Object.assign(props, shared);
    if (hidden) node.params.name = `${node.params.name} (editable)`;
    return steps;
  }
  const group = `t${n}`;
  steps.push({ command: 'object.group', as: group, params: { ids, name: hidden ? `${plan.name} (editable)` : plan.name } });
  const props = { ...shared, ...(glow.length ? { effects: glow } : {}) };
  if (Object.keys(props).length) steps.push({ command: 'node.set', params: { ids: [{ $ref: group }], props } });
  return steps;
};

const round = (n: number) => Math.round(n * 100) / 100;

/** The stacked depth behind extruded letters (Text.tsx), as at most 16 hard shadows. */
const extrudeShadows = (e: NonNullable<TextLayer['extrude']>, size: number) => {
  const a = ((e.angle ?? 45) * Math.PI) / 180;
  const depth = (e.depth * size) / 200;
  const steps = Math.min(16, Math.max(1, Math.ceil(depth)));
  return Array.from({ length: steps }, (_, i) => shadow(e.color, round((Math.cos(a) * (i + 1) * depth) / steps), round((Math.sin(a) * (i + 1) * depth) / steps), 0));
};

export type ScriptInput = {
  name: string;
  size: [number, number];
  /** the job's font files, loaded for this run so text measures in them */
  fonts: string[];
  /** each family's faces as Figcraft knows them (text.fonts) */
  styles: Record<string, string[]>;
  plans: Plan[];
  probes: Map<number, Probe>;
  baked: Map<string, Baked>;
};

/**
 * The whole rebuild as one `figcraft-cli run` script: a frame the size of the canvas (clipping, so
 * the export is the thumbnail), then every layer bottom to top. Returns the steps and what it noted
 * (a layer left out, a text layer kept as its render).
 */
export const buildScript = (o: ScriptInput): { steps: Step[]; notes: string[] } => {
  const notes: string[] = [];
  const steps: Step[] = [{ command: 'frame.create', as: 'frame', params: { x: 0, y: 0, width: o.size[0], height: o.size[1], name: o.name, props: { fill: '#000000', clip: true } } }];
  for (const f of o.fonts) steps.push({ command: 'text.loadFont', params: { path: f } });
  o.plans.forEach((plan, n) => {
    const image = (name: string) => {
      const baked = o.baked.get(plan.key);
      if (!baked) return notes.push(`${plan.name}: drew nothing, left out`), undefined;
      const as = `l${n}`;
      const [x, y, w, h] = baked.box;
      steps.push({ command: 'image.place', as, params: { path: baked.file, x, y, width: w, height: h, parent: { $ref: 'frame' }, name } });
      const props = { ...blendProps(plan, false), ...(plan.locked ? { locked: true } : {}) };
      if (Object.keys(props).length) steps.push({ command: 'node.set', params: { ids: [{ $ref: as }], props } });
      return as;
    };
    if (plan.how === 'rect') {
      const l = plan.layer as Extract<Layer, { type: 'fill' }>;
      const [x, y, w, h] = l.box ?? [0, 0, o.size[0], o.size[1]];
      steps.push({ command: 'node.create', params: { type: 'rectangle', parent: { $ref: 'frame' }, name: plan.name, x, y, width: w, height: h, props: { fills: [fillColor(l)], ...blendProps(plan, true), locked: true } } });
      return;
    }
    if (plan.how === 'image') return void image(plan.name);
    const probe = o.probes.get(Number(plan.key));
    if (plan.bake) {
      image(`${plan.name} (as rendered: ${plan.bake})`);
      notes.push(`${plan.name}: ${plan.bake}, so its render is the visible layer and the live text sits under it, hidden ("(editable)")`);
    }
    if (!probe) return void notes.push(`${plan.name}: no laid-out lines came back from the render, so it is not live text`);
    steps.push(...textSteps(plan, probe, 'frame', n, o.styles, !!plan.bake));
  });
  return { steps, notes };
};

/** `figcraft-cli run` result lines (one JSON object per step). */
export const runResults = (stdout: string) =>
  stdout
    .split('\n')
    .filter(l => l.startsWith('{'))
    .map(l => JSON.parse(l) as { command: string; ok: boolean; result?: Record<string, unknown> & { id?: number }; error?: string; step: number });
