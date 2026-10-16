import React, { useEffect, useMemo, useState } from 'react';
import { continueRender, delayRender, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { BaseRenderableData } from '../../core/types/renderable.types';
import { useAnimatedStyles } from '../effects';
import { mergeCSSStyles } from '../effects/mergeCSSStyles';
import { useWaveformData } from '../waveforms/hooks/useWaveformData';
import { WaveformAudioSource } from '../waveforms/audio-source';
import { atomCategory } from '../../atom-category';
import { ImageBeatInput } from './input-schemas';
import { detectBeats, eccentricZoomAt, type BeatAudioProperty } from './image-beat-math';
import { applyImageLook, splitImageBeatStyle } from './image-style';
import { mergeSpecialEffects } from '../atoms/special-effects-style';

export { ImageBeatInput } from './input-schemas';

export interface ImageBeatDataProps {
  src: string;
  audio: WaveformAudioSource;
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
}

export interface ImageBeatProps extends BaseRenderableData {
  data: ImageBeatDataProps;
}

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
  } = data ?? { src: '', audio: { src: '' } };

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const overrideStyles = useAnimatedStyles(id);
  const imageSource = useImageSource(src ?? '', proxySrc);

  const { audioData, audioFrame } = useWaveformData({
    audioSrc: audio?.src ?? '',
    numberOfSamples: 32,
    windowInSeconds: 1 / fps,
    dataOffsetInSeconds: audio?.start ?? 0,
    frame,
    fps,
    includeFrequencyData: false,
    smoothNormalisation: 0,
  });

  const beats = useMemo(() => {
    if (!audioData?.channelWaveforms?.length) return [];
    return detectBeats(audioData.channelWaveforms, audioData.sampleRate, {
      threshold,
      sensitivity,
      audioProperty,
    });
  }, [
    audioData?.channelWaveforms,
    audioData?.sampleRate,
    audioData?.resultId,
    threshold,
    sensitivity,
    audioProperty,
  ]);

  const zoom = useMemo(
    () =>
      eccentricZoomAt(Math.max(0, audioFrame) / fps, beats, {
        zoomIntensity,
        baseScale,
        punchSec,
        settleSec,
        originSpread,
      }),
    [audioFrame, fps, beats, zoomIntensity, baseScale, punchSec, settleSec, originSpread],
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

  const imgStyle = useMemo(
    (): React.CSSProperties => ({
      width: '100%',
      height: '100%',
      display: 'block',
      ...image,
      ...imageLook,
      transform: `translate(${zoom.tx}%, ${zoom.ty}%) scale(${zoom.scale})`,
      transformOrigin: 'center center',
    }),
    [image, imageLook, zoom.scale, zoom.tx, zoom.ty],
  );

  if (!src) return null;

  return (
    <div className={className} style={blockStyle}>
      <Img
        src={source}
        style={imgStyle}
        crossOrigin={src.startsWith('http') ? 'anonymous' : undefined}
        maxRetries={4}
        onError={() => {
          console.warn(`Failed to load image: ${src}`);
        }}
      />
    </div>
  );
};

export const config = {
  displayName: 'ImageBeat',
  type: 'atom' as const,
  isInnerSequence: false,
  inputSchema: ImageBeatInput,
  category: atomCategory('beatmade'),
};
