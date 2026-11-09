/**
 * A Look (look.ts) as a project: picture, overlays, wave, title, lyrics, texts. A project made with
 * the make-waveform-lyric-video skill is `export default storyboardVideo('<slug>', storyboard)`.
 */
import { defineProject, layer, type Layer, type ProjectDefinition } from '../kit/contract';
import { CaptionLayer } from './CaptionLayer';
import { CoverBackdrop } from './CoverBackdrop';
import { captionParams, storyboardLook, type Look, type Storyboard } from './look';
import { OverlayText } from './OverlayText';
import { OverlayVideo } from './OverlayVideo';
import { TrackTitle } from './TrackTitle';
import { Subject } from './Subject';
import { VISUALIZER_KINDS } from './Visualizers';
import { WaveformLayer, type WaveformLayerProps } from './WaveformLayer';

/** The look's layers, bottom to top. Without a `cover`, the picture is the project's first image. */
export const lookLayers = (look: Look, extra: Layer[] = []): Layer[] => {
  const waves = look.wave ? (Array.isArray(look.wave) ? look.wave : [look.wave]) : [];
  const { title, subject } = look;
  const isVisualizer = (w: WaveformLayerProps) => VISUALIZER_KINDS.includes(w.kind as never);
  const waveLayer = (props: WaveformLayerProps) =>
    layer({
      scene: WaveformLayer,
      at: 'all',
      // effects locked to a point of the picture follow the cover's motion
      props: isVisualizer(props) ? { ...props, cover: look.cover } : props,
      name: waves.indexOf(props) ? `wave ${waves.indexOf(props) + 1}` : 'wave',
    });
  // with a cutout subject, the visualizers go behind her and the strips in front (unless `behind` says)
  const behind = subject ? waves.filter(w => w.behind ?? isVisualizer(w)) : waves;
  const front = subject ? waves.filter(w => !(w.behind ?? isVisualizer(w))) : [];
  // overlays keep their names (overlay N, by place in the list) wherever they sit
  const overlays = (look.overlays ?? []).map((props, i) => ({
    props,
    layer: layer({ scene: OverlayVideo, at: 'all', props: { ...props, cover: look.cover }, name: `overlay ${i + 1}` }),
  }));
  return [
    layer({ scene: CoverBackdrop, at: 'all', props: look.cover ?? {}, name: 'cover' }),
    ...overlays.filter(o => !(subject && o.props.front)).map(o => o.layer),
    ...behind.map(waveLayer),
    ...(subject ? [layer({ scene: Subject, at: 'all', props: { ...subject, cover: look.cover }, name: 'subject' })] : []),
    // overlays marked `front` go over the subject (with no subject, they stay in order)
    ...overlays.filter(o => subject && o.props.front).map(o => o.layer),
    ...front.map(waveLayer),
    ...(title
      ? [
          layer({
            scene: TrackTitle,
            at: { from: 0, to: title.seconds ?? 6 },
            props: {
              font: look.fonts.title?.font ?? look.fonts.highlight.font,
              subFont: look.fonts.title?.subFont ?? look.fonts.sub.font,
              ...title,
            },
            name: 'title',
          }),
        ]
      : []),
    ...(look.captions
      ? [
          layer({
            scene: CaptionLayer,
            at: 'all',
            props: {
              preset: look.captions.preset,
              params: captionParams(look.captions, look.fonts),
              containerProps: look.captions.containerProps,
            },
            name: 'lyrics',
          }),
        ]
      : []),
    ...(look.texts ?? []).map(({ from, to, ...props }) =>
      layer({ scene: OverlayText, at: { from, to }, props, name: `text: ${props.text}` }),
    ),
    ...extra,
  ];
};

export const lookVideo = (id: string, look: Look, extra?: Layer[]): ProjectDefinition =>
  defineProject({
    id,
    fps: look.fps ?? 30,
    width: look.width ?? 1920,
    height: look.height ?? 1080,
    layers: lookLayers(look, extra),
  });

/** The project a storyboard's picks make. */
export const storyboardVideo = (id: string, storyboard: Storyboard, extra?: Layer[]): ProjectDefinition =>
  lookVideo(id, storyboardLook(storyboard), extra);
