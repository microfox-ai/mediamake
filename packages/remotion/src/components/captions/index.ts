import { atomCategory } from '../../atom-category';
import { registerComponent } from '../../core/registry';
import { CaptionSmear } from './CaptionSmear';
import { CaptionSmearInput } from './input-schemas';

export { CaptionSmear } from './CaptionSmear';
export type { CaptionSmearProps, CaptionSmearDataProps } from './CaptionSmear';
export { CaptionSmearInput } from './input-schemas';
export {
  buildCaptionBeats,
  findActiveBeat,
  beatEnvelope,
  applyLetterSpacingSettle,
  letterSpacingSettle,
} from './caption-smear-math';
export type {
  CaptionBeat,
  CaptionBeatOptions,
  BeatEnvelope,
  BeatEnvelopeOptions,
  LetterSpacingSettle,
  LetterSpacingSettleOptions,
} from './caption-smear-math';

registerComponent('CaptionSmear', CaptionSmear, 'atom', {
  displayName: 'CaptionSmear',
  type: 'atom',
  inputSchema: CaptionSmearInput,
  category: atomCategory('captions'),
});
