import React, { useEffect, useMemo, useState } from 'react';
import {
  continueRender,
  delayRender,
  Img,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useRemotionEnvironment,
  useVideoConfig,
} from 'remotion';
import { BaseRenderableData } from '../../core/types/renderable.types';
import { getClientSideMediaTags } from '../../core/clientMediaTags';
import { useAnimatedStyles } from '../effects';
import { AncestorTransform } from '../effects/layout-transform';
import { mergeCSSStyles } from '../effects/mergeCSSStyles';
import { mergeSpecialEffects } from '../atoms/special-effects-style';
import { atomCategory } from '../../atom-category';
import { WaveformAudioSource } from '../waveforms/audio-source';
import { BeatMontageInput } from './input-schemas';
import { applyImageLook, splitImageBeatStyle } from './image-style';
import { selectCues, type BeatCueSource } from './beatmap/cues';
import { useBeatmap } from './beatmap/useBeatmap';
import {
  beatPulseAt,
  montageFrame,
  planShots,
  rotationFor,
  type MontageLayer,
  type MontageOrder,
  type MontageRotation,
  type MontageTransition,
} from './beat-montage-math';

export { BeatMontageInput } from './input-schemas';

export interface BeatMontageItem {
  src: string;
  type?: 'image' | 'video';
  startFrom?: number;
  rotate?: MontageRotation;
  objectPosition?: string;
  width?: number;
  height?: number;
  [key: string]: unknown;
}

export interface BeatMontageDataProps {
  media: BeatMontageItem[];
  audio: WaveformAudioSource;
  beatmap?: unknown;
  className?: string;
  style?: React.CSSProperties;
  cueOn?: BeatCueSource;
  threshold?: number;
  minShotSec?: number;
  maxShotSec?: number;
  every?: number;
  leadSec?: number;
  startOnFirstCue?: boolean;
  order?: MontageOrder;
  seed?: number;
  rotate?: MontageRotation;
  transition?: MontageTransition;
  transitionSec?: number;
  transitionStrength?: number;
  flashColor?: string;
  baseScale?: number;
  driftScale?: number;
  driftPan?: number;
  beatPulse?: number;
  vignette?: number;
  backgroundColor?: string;
}

export interface BeatMontageProps extends BaseRenderableData {
  data: BeatMontageDataProps;
}

const VIDEO_EXT = /\.(mp4|webm|mov|mkv|m4v)(\?|#|$)/i;

const itemSrc = (item: BeatMontageItem | string | undefined): string => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return String(item.src || (item as any).url || (item as any).filePath || '');
};

const isVideo = (item: BeatMontageItem) =>
  item.type === 'video' || (item.type !== 'image' && VIDEO_EXT.test(itemSrc(item)));

const resolveSrc = (src: string) =>
  /^(https?:|blob:|data:)/i.test(src) ? src : staticFile(src.replace(/^\/+/, ''));

/** Width / height of each media file, for auto rotation. */
const aspects = new Map<string, Promise<number | undefined>>();

const measure = (src: string, video: boolean): Promise<number | undefined> => {
  let pending = aspects.get(src);
  if (!pending) {
    pending = new Promise((resolve) => {
      if (typeof document === 'undefined') return resolve(undefined);
      if (video) {
        const el = document.createElement('video');
        el.preload = 'metadata';
        el.muted = true;
        el.onloadedmetadata = () => resolve(el.videoHeight ? el.videoWidth / el.videoHeight : undefined);
        el.onerror = () => resolve(undefined);
        el.src = src;
        return;
      }
      const img = new Image();
      img.onload = () => resolve(img.naturalHeight ? img.naturalWidth / img.naturalHeight : undefined);
      img.onerror = () => resolve(undefined);
      img.src = src;
    });
    aspects.set(src, pending);
  }
  return pending;
};

const useMediaAspects = (items: BeatMontageItem[], needed: boolean) => {
  const [known, setKnown] = useState<Record<string, number | undefined>>({});
  const key = items.map(itemSrc).join('|');
  useEffect(() => {
    if (!needed) return;
    const todo = items.filter((item) => !(item.width && item.height) && itemSrc(item));
    if (todo.length === 0) return;
    let done = false;
    const handle = delayRender('Measuring montage media', { timeoutInMilliseconds: 60000 });
    const finish = () => {
      if (done) return;
      done = true;
      continueRender(handle);
    };
    Promise.all(
      todo.map(async (item) => [itemSrc(item), await measure(resolveSrc(itemSrc(item)), isVideo(item))] as const),
    )
      .then((pairs) => setKnown(Object.fromEntries(pairs)))
      .finally(finish);
    return finish;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, needed]);
  return (item: BeatMontageItem) =>
    item.width && item.height ? Number(item.width) / Number(item.height) : known[itemSrc(item)];
};

export const BeatMontage: React.FC<BeatMontageProps> = ({ data, id, context }) => {
  const {
    media = [],
    audio,
    beatmap: storedBeatmap,
    className = '',
    style,
    cueOn = 'accent',
    threshold = 0.45,
    minShotSec = 0.35,
    maxShotSec = 0,
    every = 1,
    leadSec = 0.04,
    startOnFirstCue = false,
    order = 'sequence',
    seed = 1,
    rotate = 'none',
    transition = 'cut',
    transitionSec = 0.2,
    transitionStrength = 0.6,
    flashColor = '#ffffff',
    baseScale = 1.04,
    driftScale = 0.06,
    driftPan = 0.03,
    beatPulse = 0,
    vignette = 0,
    backgroundColor = '#000000',
  } = data ?? ({ media: [], audio: { src: '' } } as BeatMontageDataProps);

  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames: compositionFrames } = useVideoConfig();
  const durationInFrames = context?.timing?.durationInFrames ?? compositionFrames;
  const environment = useRemotionEnvironment();
  const overrideStyles = useAnimatedStyles(id);
  const items = useMemo(
    () => (Array.isArray(media) ? media : []).filter((m) => itemSrc(m)) as BeatMontageItem[],
    [media],
  );
  const { beatmap, offsetSec } = useBeatmap(audio, storedBeatmap);
  const needsAspect = rotate === 'auto' || items.some((m) => m.rotate === 'auto');
  const aspectOf = useMediaAspects(items, needsAspect);

  const durationSec = durationInFrames / fps;
  const shots = useMemo(() => {
    const cues = selectCues(beatmap, {
      on: cueOn,
      threshold,
      minGapSec: minShotSec,
      maxGapSec: maxShotSec,
      every,
      leadSec,
      from: offsetSec,
      to: offsetSec + durationSec,
    });
    return planShots(cues, { offsetSec, durationSec, mediaCount: items.length, order, seed, startOnFirstCue });
  }, [beatmap, cueOn, threshold, minShotSec, maxShotSec, every, leadSec, offsetSec, durationSec, items.length, order, seed, startOnFirstCue]);

  const pulseBeats = useMemo(
    () => (beatPulse > 0 ? selectCues(beatmap, { on: 'beats', threshold: 0, minGapSec: 0, leadSec }) : []),
    [beatmap, beatPulse, leadSec],
  );

  const t = frame / fps;
  const montage = montageFrame(shots, t, {
    baseScale,
    driftScale,
    driftPan,
    transition,
    transitionSec,
    transitionStrength,
    seed,
  });
  const pulse = beatPulseAt(pulseBeats, t + offsetSec, beatPulse);

  // Warm the cache for the next few images so cuts never wait on a download.
  const current = montage.layers[montage.layers.length - 1]?.shot.index ?? 0;
  useEffect(() => {
    if (environment.isRendering || typeof Image === 'undefined') return;
    for (const shot of shots.slice(current + 1, current + 4)) {
      const item = items[shot.media];
      if (item && !isVideo(item)) new Image().src = resolveSrc(itemSrc(item));
    }
  }, [current, shots, items, environment.isRendering]);

  const { block, image } = useMemo(() => splitImageBeatStyle(style), [style]);
  const imageLook = useMemo(() => applyImageLook(image), [image]);
  const blockStyle = useMemo(
    () =>
      mergeCSSStyles(
        mergeSpecialEffects({
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          backgroundColor,
          ...block,
        }),
        overrideStyles ?? {},
      ),
    [block, overrideStyles, backgroundColor],
  );

  const clientTags = getClientSideMediaTags();
  const VideoTag: any = environment.isClientSideRendering && clientTags ? clientTags.Video : OffthreadVideo;

  const renderLayer = (layer: MontageLayer) => {
    const item = items[layer.shot.media];
    if (!item) return null;
    const src = resolveSrc(itemSrc(item));
    const quarter = rotationFor(item.rotate ?? rotate, aspectOf(item), width / height);
    const box: React.CSSProperties = quarter
      ? {
          position: 'absolute',
          width: `${(height / width) * 100}%`,
          height: `${(width / height) * 100}%`,
          left: `${((1 - height / width) / 2) * 100}%`,
          top: `${((1 - width / height) / 2) * 100}%`,
          transform: `rotate(${quarter}deg)`,
        }
      : { position: 'absolute', inset: 0 };
    const mediaStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      display: 'block',
      objectFit: 'cover',
      ...image,
      ...imageLook,
      ...(item.objectPosition ? { objectPosition: item.objectPosition } : {}),
    };
    if (layer.blur > 0.05) {
      mediaStyle.filter = [mediaStyle.filter, `blur(${(layer.blur * width) / 1080}px)`].filter(Boolean).join(' ');
    }
    // Whip and dissolve show a shot up to half a transition before its cut.
    const preroll = transition === 'cut' ? 0 : transitionSec;
    const from = Math.max(0, Math.round((layer.shot.start - preroll) * fps));
    return (
      <Sequence
        key={layer.shot.index}
        from={from}
        durationInFrames={Math.max(1, durationInFrames - from)}
        layout="none"
        name={`Shot ${layer.shot.index + 1}`}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: layer.opacity,
            transform: `translate(${layer.tx}%, ${layer.ty}%) scale(${layer.scale * pulse})`,
            transformOrigin: 'center center',
          }}
        >
          <div style={box}>
            {isVideo(item) ? (
              <VideoTag
                src={src}
                muted
                style={mediaStyle}
                trimBefore={item.startFrom ? Math.round(item.startFrom * fps) : undefined}
              />
            ) : (
              <Img src={src} style={mediaStyle} maxRetries={4} />
            )}
          </div>
          {layer.dim > 0 ? (
            <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: layer.dim }} />
          ) : null}
        </div>
      </Sequence>
    );
  };

  if (items.length === 0) return null;

  return (
    <AncestorTransform style={blockStyle}>
      {(hostStyle) => (
        <div className={className} style={hostStyle}>
          {montage.layers.map(renderLayer)}
          {montage.flash > 0.001 ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: flashColor,
                opacity: Math.min(1, montage.flash),
                mixBlendMode: 'screen',
              }}
            />
          ) : null}
          {vignette > 0 ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${Math.min(1, vignette)}) 100%)`,
              }}
            />
          ) : null}
        </div>
      )}
    </AncestorTransform>
  );
};

export const config = {
  displayName: 'BeatMontage',
  type: 'atom' as const,
  isInnerSequence: false,
  inputSchema: BeatMontageInput,
  category: atomCategory('beatmade'),
};
