/** One thumbnail: a resolved variant's layers, bottom to top, on the 1280×720 canvas. */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { useFonts } from './fonts.ts';
import { Fill, Fx, Logo, Shape } from './layers/Graphics.tsx';
import { Photo } from './layers/Photo.tsx';
import { Text } from './layers/Text.tsx';
import { CANVAS, type CustomLayer, type FontSpec, type Layer, type ResolvedVariant, TIMESTAMP_ZONE } from './spec.ts';

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

export type ThumbnailProps = { job: string; variant: ResolvedVariant; fonts: FontSpec[]; guides?: boolean };

export const Thumbnail: React.FC<ThumbnailProps> = ({ job, variant, fonts, guides }) => {
  const ready = useFonts(job, fonts);
  return (
    <AbsoluteFill style={{ width: CANVAS.w, height: CANVAS.h, background: '#000', overflow: 'hidden' }}>
      {variant.layers.map((layer, i) => (
        <LayerView key={layer.id ?? i} job={job} layer={layer} layers={variant.layers} ready={ready} />
      ))}
      {guides && <Guides />}
    </AbsoluteFill>
  );
};
