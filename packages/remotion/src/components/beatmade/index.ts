import { atomCategory } from '../../atom-category';
import { registerComponent } from '../../core/registry';
import { BeatMontage } from './BeatMontage';
import { ImageBeat } from './ImageBeat';
import { BeatMontageInput, ImageBeatInput } from './input-schemas';

export { BeatMontage } from './BeatMontage';
export type { BeatMontageDataProps, BeatMontageItem, BeatMontageProps } from './BeatMontage';
export { ImageBeat } from './ImageBeat';
export type { ImageBeatProps, ImageBeatDataProps } from './ImageBeat';
export { BeatMontageInput, ImageBeatInput } from './input-schemas';
export * from './beatmap';
export {
  MONTAGE_ORDERS,
  MONTAGE_ROTATIONS,
  MONTAGE_TRANSITIONS,
  beatPulseAt,
  mediaForShot,
  montageFrame,
  planShots,
  rotationFor,
  shotCamera,
  shotIndexAt,
} from './beat-montage-math';
export type {
  MontageFrame,
  MontageLayer,
  MontageMotion,
  MontageOrder,
  MontageRotation,
  MontageTransition,
  PlanShotsOptions,
  Shot,
} from './beat-montage-math';
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
  ZoomBeat,
} from './image-beat-math';
export {
  adjustmentsToCss,
  applyImageLook,
  colorTintFilter,
  filterCss,
  isImageBlendMode,
  isImageFilter,
  isImageFit,
  readFilterAdjust,
  readImageLook,
  splitImageBeatStyle,
  FILTER_ADJUST_VARS,
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

registerComponent('BeatMontage', BeatMontage, 'atom', {
  displayName: 'BeatMontage',
  type: 'atom',
  inputSchema: BeatMontageInput,
  category: atomCategory('beatmade'),
});
