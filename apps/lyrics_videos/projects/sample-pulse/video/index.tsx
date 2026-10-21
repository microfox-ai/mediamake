import { defineProject, layer } from '../../../src/kit';
import { Backdrop } from './scenes/Backdrop';
import { ChorusWave } from './scenes/ChorusWave';
import { KineticLyrics } from './scenes/KineticLyrics';
import { TitleCard } from './scenes/TitleCard';

const verse = { accent: '#7cccff' };
const chorus = { accent: '#ff4fd8', fontSize: 150 };

export default defineProject({
  id: 'sample-pulse',
  fps: 30,
  width: 1920,
  height: 1080,
  layers: [
    layer({ scene: Backdrop, at: 'all' }),
    layer({ scene: TitleCard, at: 'intro' }),
    layer({ scene: KineticLyrics, at: 'verse-1', props: verse }),
    layer({
      scene: ChorusWave,
      at: 'chorus-1',
      props: { color: chorus.accent },
    }),
    layer({ scene: KineticLyrics, at: 'chorus-1', props: chorus }),
    layer({
      scene: ChorusWave,
      at: 'chorus-2',
      props: { color: chorus.accent },
    }),
    layer({ scene: KineticLyrics, at: 'chorus-2', props: chorus }),
    layer({
      scene: TitleCard,
      at: 'outro',
      props: { subtitle: 'thanks for listening' },
    }),
  ],
});
