import { atomCategory } from '../../atom-category';
import { registerComponent } from '../../core/registry';
import { ImageBeat } from './ImageBeat';
import { ImageBeatInput } from './input-schemas';

export { ImageBeat } from './ImageBeat';
export type { ImageBeatProps, ImageBeatDataProps } from './ImageBeat';
export { ImageBeatInput } from './input-schemas';
export {
  cameraAt,
  cubicBezier,
  detectBeats,
  easeIn,
  easeInOut,
  easeOut,
  eccentricZoomAt,
  findLastBeatIndex,
  originForBeat,
} from './image-beat-math';
export type {
  BeatAudioProperty,
  DetectBeatsOptions,
  EccentricZoom,
  EccentricZoomOptions,
} from './image-beat-math';
export {
  applyImageLook,
  colorTintFilter,
  filterCss,
  isImageBlendMode,
  isImageFilter,
  isImageFit,
  readImageLook,
  splitImageBeatStyle,
  IMAGE_BLEND_MODES,
  IMAGE_FILTERS,
  IMAGE_FITS,
  IMAGE_LOOK_KEYS,
  IMAGE_LOOK_VARS,
} from './image-style';

registerComponent('ImageBeat', ImageBeat, 'atom', {
  displayName: 'ImageBeat',
  type: 'atom',
  inputSchema: ImageBeatInput,
  category: atomCategory('beatmade'),
});
