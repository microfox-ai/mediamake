import React from 'react';
import { defineProject, layer, type SceneProps } from '@mediamake/engine';
import { Grain } from './parts';
import { Alive } from './scenes/Alive';
import { Cold } from './scenes/Cold';
import { Draw } from './scenes/Draw';
import { End } from './scenes/End';
import { JustStart } from './scenes/JustStart';
import { Look } from './scenes/Look';
import { Opener } from './scenes/Opener';
import { Pantry } from './scenes/Pantry';
import { Ritual } from './scenes/Ritual';
import { Skills } from './scenes/Skills';
import { Sound } from './scenes/Sound';
import { There } from './scenes/There';

const FilmGrain: React.FC<SceneProps> = () => <Grain opacity={0.08} />;

// Cook with Claude, ep. 01: /pack-brand-kit — story v4 (screenplay-v4.md) with revision 1's changes. bed.wav is silence; the
// voice, the theme and the sounds are placed by the scenes and the Sound layer. No watermark.
export default defineProject({
  id: 'cookwithclaude-pack-brand-kit',
  fps: 30,
  width: 1920,
  height: 1080,
  audio: false,
  layers: [
    layer({ scene: Cold, at: 'cold' }),
    layer({ scene: Opener, at: 'opener' }),
    layer({ scene: Skills, at: 'skills' }),
    layer({ scene: Ritual, at: 'ritual' }),
    layer({ scene: Look, at: 'look' }),
    layer({ scene: Draw, at: 'draw' }),
    layer({ scene: There, at: 'there' }),
    layer({ scene: Alive, at: 'alive' }),
    layer({ scene: Pantry, at: 'pantry' }),
    layer({ scene: JustStart, at: 'just' }),
    layer({ scene: End, at: 'end' }),
    layer({ scene: FilmGrain, at: 'all', name: 'grain' }),
    layer({ scene: Sound, at: 'all', name: 'sound' }),
  ],
});
