import React, { useEffect, useMemo, useState } from 'react';
import { continueRender, delayRender, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { BaseRenderableData } from '../../core/types/renderable.types';
import { useAnimatedStyles } from '../effects';
import { AncestorTransform, useLayoutTransform } from '../effects/layout-transform';
import { joinCssTransform, mergeCSSStyles } from '../effects/mergeCSSStyles';
import { WaveformAudioSource } from '../waveforms/audio-source';
import { atomCategory } from '../../atom-category';
import { ImageBeatInput } from './input-schemas';
import { eccentricZoomAt, type BeatAudioProperty } from './image-beat-math';
import { selectCues, type BeatCueSource } from './beatmap/cues';
import { useBeatmap } from './beatmap/useBeatmap';
import { applyImageLook, splitImageBeatStyle } from './image-style';
import { mergeSpecialEffects } from '../atoms/special-effects-style';

export { ImageBeatInput } from './input-schemas';

export interface ImageBeatDataProps {
  src: string;
  audio: WaveformAudioSource;
  /** Written by the Analyze Beats action. Without it the atom analyzes the audio itself. */
  beatmap?: unknown;
  proxySrc?: string;
  className?: string;
  style?: React.CSSProperties;
  zoomIntensity?: number;
  baseScale?: number;
  sensitivity?: number;
  threshold?: number;
  audioProperty?: BeatAudioProperty;
  originSpread?: number;
  punchSec?: number;
  settleSec?: number;
  cueOn?: BeatCueSource;
  minGapSec?: number;
  leadSec?: number;
  dynamics?: number;
  downbeatBoost?: number;
  tilt?: number;
  flash?: number;
}

export interface ImageBeatProps extends BaseRenderableData {
  data: ImageBeatDataProps;
}

const BAND_CUES: Record<BeatAudioProperty, BeatCueSource> = {
  bass: 'kick',
  mid: 'snare',
  treble: 'hat',
  waveform: 'accent',
};

const CORS_PROXIES = [
  'https://thingproxy.freeboard.io/fetch/',
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

const getCorsProxyUrl = (url: string): string =>
  `${CORS_PROXIES[0]}${encodeURIComponent(url)}`;

const useImageSource = (src: string, proxySrc?: string) => {
  const [imageSource, setImageSource] = useState<string>(src);
  const [handle] = useState(() => delayRender('Loading image'));

  useEffect(() => {
    if (!src || !src.startsWith('http')) {
      setImageSource(src);
      continueRender(handle);
      return;
    }

    const testImage = new Image();
    testImage.crossOrigin = 'anonymous';

    const handleSuccess = () => {
      setImageSource(src);
      continueRender(handle);
    };

    const handleError = () => {
      setImageSource(
        proxySrc
          ? `${proxySrc}?url=${encodeURIComponent(src)}`
          : getCorsProxyUrl(src),
      );
      continueRender(handle);
    };

    testImage.onload = handleSuccess;
    testImage.onerror = handleError;
    testImage.src = src;

    return () => {
      testImage.onload = null;
      testImage.onerror = null;
    };
  }, [src, proxySrc, handle]);

  return imageSource;
};

export const ImageBeat: React.FC<ImageBeatProps> = ({ data, id }) => {
  const {
    src,
    audio,
    beatmap: storedBeatmap,
    proxySrc,
    className = '',
    style,
    zoomIntensity = 0.32,
    baseScale = 1.08,
    sensitivity = 1.6,
    threshold = 0.18,
    audioProperty = 'bass',
    originSpread = 0.7,
    punchSec = 0.18,
    settleSec = 0.5,
    cueOn,
    minGapSec = 0.18,
    leadSec = 0,
    dynamics = 0.6,
    downbeatBoost = 0.3,
    tilt = 0,
    flash = 0,
  } = data ?? { src: '', audio: { src: '' } };

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const overrideStyles = useAnimatedStyles(id);
  const imageSource = useImageSource(src ?? '', proxySrc);
  const { beatmap, offsetSec } = useBeatmap(audio, storedBeatmap);

  const cues = useMemo(
    () =>
      selectCues(beatmap, {
        on: cueOn ?? BAND_CUES[audioProperty] ?? 'kick',
        threshold: Math.min(1, (threshold * 1.6) / Math.max(0.1, sensitivity)),
        minGapSec,
        leadSec,
      }),
    [beatmap, cueOn, audioProperty, threshold, sensitivity, minGapSec, leadSec],
  );

  const zoom = useMemo(
    () =>
      eccentricZoomAt(frame / fps + offsetSec, cues, {
        zoomIntensity,
        baseScale,
        punchSec,
        settleSec,
        originSpread,
        dynamics,
        downbeatBoost,
        tilt,
      }),
    [frame, fps, offsetSec, cues, zoomIntensity, baseScale, punchSec, settleSec, originSpread, dynamics, downbeatBoost, tilt],
  );

  const source = useMemo(() => {
    if (!src) return '';
    if (src.startsWith('http')) return imageSource;
    return staticFile(src);
  }, [src, imageSource]);

  const { block, image } = useMemo(() => splitImageBeatStyle(style), [style]);
  const imageLook = useMemo(() => applyImageLook(image), [image]);

  const blockStyle = useMemo(
    () =>
      mergeCSSStyles(
        mergeSpecialEffects({
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          ...block,
        }),
        overrideStyles ?? {},
      ),
    [block, overrideStyles],
  );

  const imgStyle = useMemo((): React.CSSProperties => {
    const rotate = zoom.rotate ? ` rotate(${zoom.rotate}deg)` : '';
    const zoomTransform = `translate(${zoom.tx}%, ${zoom.ty}%) scale(${zoom.scale})${rotate}`;
    const authored = typeof image.transform === 'string' ? image.transform : undefined;
    const exposure = flash > 0 && zoom.punch > 0 ? `brightness(${1 + flash * zoom.punch})` : '';
    const filter = [imageLook.filter, exposure].filter(Boolean).join(' ') || undefined;
    return {
      width: '100%',
      height: '100%',
      display: 'block',
      ...image,
      ...imageLook,
      filter,
      transform: joinCssTransform(authored, zoomTransform),
      transformOrigin: 'center center',
    };
  }, [image, imageLook, zoom.scale, zoom.tx, zoom.ty, zoom.rotate, zoom.punch, flash]);

  const layout = useLayoutTransform();
  if (!src) return null;

  const blend = imageLook.mixBlendMode;
  const liftBlend = Boolean(layout?.transform && blend);
  const hostStyle: React.CSSProperties = liftBlend
    ? { ...blockStyle, mixBlendMode: blend }
    : blockStyle;
  const painted: React.CSSProperties = liftBlend
    ? { ...imgStyle, mixBlendMode: undefined }
    : imgStyle;

  return (
    <AncestorTransform style={hostStyle}>
      {(style) => (
        <div className={className} style={style}>
          <Img
            src={source}
            style={painted}
            crossOrigin={src.startsWith('http') ? 'anonymous' : undefined}
            maxRetries={4}
            onError={() => {
              console.warn(`Failed to load image: ${src}`);
            }}
          />
        </div>
      )}
    </AncestorTransform>
  );
};

export const config = {
  displayName: 'ImageBeat',
  type: 'atom' as const,
  isInnerSequence: false,
  inputSchema: ImageBeatInput,
  category: atomCategory('beatmade'),
};
