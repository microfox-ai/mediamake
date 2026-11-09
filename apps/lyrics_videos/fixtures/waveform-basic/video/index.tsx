import { lyricVideo } from '../../../src/mediamake';

// Golden-stills fixture (scripts/golden.ts): the mediamake template path, so a change to the
// caption presets, the waveform layer or the cover backdrop shows up in `npm run golden`.
export default lyricVideo({
  id: 'waveform-basic',
  cover: { image: 'cover.png', motion: 'zoom-loop', dim: 0.2 },
  lyrics: 'default',
  wave: 'default',
  texts: [
    { text: 'Golden fixture', font: 'Inter:600', size: 28, color: '#FFFFFF', box: { top: 48, left: 64 }, align: 'top', from: 0.5, to: 11.5 },
  ],
});
