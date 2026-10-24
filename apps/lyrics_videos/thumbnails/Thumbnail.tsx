/**
 * One still (a thumbnail or a poster): a resolved variant's layers, bottom to top, on the job's
 * canvas, then its treatment over everything (grade + picture filters, texture layers on top).
 */
import React, { useId } from 'react';
import { AbsoluteFill } from 'remotion';
import { useFonts } from './fonts.ts';
import { Fill, Fx, Logo, Shape } from './layers/Graphics.tsx';
import { Photo } from './layers/Photo.tsx';
import { Text } from './layers/Text.tsx';
import { CanvasContext } from './canvas.tsx';
import { Defs, gradeFilter, safeId } from './layers/filters.tsx';
import { CANVAS, type CustomLayer, type FontSpec, type Layer, type ResolvedVariant, TIMESTAMP_ZONE } from './spec.ts';
import type { Post } from './treatments.ts';

// a job's own components: thumbnails/jobs/<job>/custom/<Name>.tsx (default export)
const customContext = require.context('./jobs', true, /^\.\/[^_./][^/]*\/custom\/[^/]+\.tsx$/);

const Custom: React.FC<{ job: string; layer: CustomLayer }> = ({ job, layer }) => {
  const key = `./${job}/custom/${layer.component}.tsx`;
  if (!customContext.keys().includes(key)) throw new Error(`No ${key.slice(2)} for the custom layer "${layer.id ?? layer.component}"`);
  const C = customContext<{ default: React.FC<Record<string, unknown> & { box?: number[] }> }>(key).default;
  return <C box={layer.box} {...layer.props} />;
};

const LayerView: React.FC<{ job: string; layer: Layer; layers: Layer[]; ready: boolean }> = ({ job, layer, layers, ready }) => {
  switch (layer.type) {
    case 'photo':
    case 'cutout':
    case 'image':
      return <Photo job={job} layer={layer} />;
    case 'fill':
      return <Fill layer={layer} />;
    case 'shape':
      return <Shape layer={layer} />;
    case 'text':
      return <Text layer={layer} layers={layers} ready={ready} />;
    case 'logo':
      return <Logo job={job} layer={layer} />;
    case 'fx':
      return <Fx layer={layer} />;
    case 'custom':
      return <Custom job={job} layer={layer} />;
  }
};

/** Where YouTube puts the video length, and a title-safe margin: previews only. */
const Guides: React.FC = () => {
  const [x, y, w, h] = TIMESTAMP_ZONE;
  return (
    <>
      <div style={{ position: 'absolute', inset: 40, border: '2px dashed rgba(0,200,255,0.6)' }} />
      <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: 'rgba(0,0,0,0.55)', border: '2px dashed rgba(255,220,0,0.9)', color: '#fff', font: '600 26px Helvetica', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        12:34
      </div>
    </>
  );
};

const hex = (c: string) => {
  const h = c.replace('#', '');
  const n = parseInt(h.length === 3 ? [...h].map(x => x + x).join('') : h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => (v / 255).toFixed(3));
};

/** The treatment's picture filters as one SVG filter chain: posterize → duotone → chromatic split → bloom. */
const PostFilter: React.FC<{ id: string; post: Post }> = ({ id, post }) => {
  const steps: React.ReactNode[] = [];
  let last = 'SourceGraphic';
  if (post.posterize) {
    const n = Math.max(2, Math.round(post.posterize));
    const table = Array.from({ length: n }, (_, i) => (i / (n - 1)).toFixed(3)).join(' ');
    steps.push(
      <feComponentTransfer key="poster" in={last} result="poster">
        <feFuncR type="discrete" tableValues={table} />
        <feFuncG type="discrete" tableValues={table} />
        <feFuncB type="discrete" tableValues={table} />
      </feComponentTransfer>,
    );
    last = 'poster';
  }
  if (post.duotone) {
    const [a, b] = post.duotone.map(hex);
    steps.push(
      <feColorMatrix key="lum" in={last} type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" result="lum" />,
      <feComponentTransfer key="duo" in="lum" result="duo">
        <feFuncR type="table" tableValues={`${a[0]} ${b[0]}`} />
        <feFuncG type="table" tableValues={`${a[1]} ${b[1]}`} />
        <feFuncB type="table" tableValues={`${a[2]} ${b[2]}`} />
      </feComponentTransfer>,
    );
    last = 'duo';
  }
  if (post.chroma) {
    const only = (r: number, g: number, b: number) => `${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`;
    steps.push(
      <feColorMatrix key="r" in={last} type="matrix" values={only(1, 0, 0)} result="r0" />,
      <feOffset key="ro" in="r0" dx={post.chroma} result="r" />,
      <feColorMatrix key="g" in={last} type="matrix" values={only(0, 1, 0)} result="g" />,
      <feColorMatrix key="b" in={last} type="matrix" values={only(0, 0, 1)} result="b0" />,
      <feOffset key="bo" in="b0" dx={-post.chroma} result="b" />,
      <feBlend key="rg" in="r" in2="g" mode="screen" result="rg" />,
      <feBlend key="rgb" in="rg" in2="b" mode="screen" result="chroma" />,
    );
    last = 'chroma';
  }
  if (post.bloom) {
    steps.push(
      <feGaussianBlur key="blur" in={last} stdDeviation={14} result="blur" />,
      <feComponentTransfer key="hi" in="blur" result="hi">
        <feFuncR type="linear" slope={1 + post.bloom} intercept={-0.35} />
        <feFuncG type="linear" slope={1 + post.bloom} intercept={-0.35} />
        <feFuncB type="linear" slope={1 + post.bloom} intercept={-0.35} />
      </feComponentTransfer>,
      <feBlend key="bloom" in={last} in2="hi" mode="screen" result="bloom" />,
    );
    last = 'bloom';
  }
  if (!steps.length) return null;
  return (
    <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      {steps}
    </filter>
  );
};

export type ThumbnailProps = { job: string; variant: ResolvedVariant; fonts: FontSpec[]; guides?: boolean; size?: [number, number] };

export const Thumbnail: React.FC<ThumbnailProps> = ({ job, variant, fonts, guides, size }) => {
  const ready = useFonts(job, fonts);
  const id = safeId(useId());
  const [w, h] = size ?? [CANVAS.w, CANVAS.h];
  const post = variant.post;
  const svg = post && (post.posterize || post.duotone || post.chroma || post.bloom);
  const filter = post ? [gradeFilter(post.grade), svg && `url(#${id}-post)`].filter(Boolean).join(' ') : '';
  return (
    <CanvasContext.Provider value={{ w, h }}>
      <AbsoluteFill style={{ width: w, height: h, background: '#000', overflow: 'hidden' }}>
        {post && svg && (
          <Defs>
            <PostFilter id={`${id}-post`} post={post} />
          </Defs>
        )}
        <div style={{ position: 'absolute', inset: 0, filter: filter || undefined }}>
          {variant.layers.map((layer, i) => (
            <LayerView key={layer.id ?? i} job={job} layer={layer} layers={variant.layers} ready={ready} />
          ))}
        </div>
        {post?.over.map((layer, i) => (
          <LayerView key={layer.id ?? `post-${i}`} job={job} layer={layer} layers={variant.layers} ready={ready} />
        ))}
        {guides && <Guides />}
      </AbsoluteFill>
    </CanvasContext.Provider>
  );
};
