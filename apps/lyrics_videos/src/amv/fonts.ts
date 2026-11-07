/** The AMV type system: one face per job, loaded from Google Fonts. */
import { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { loadFont as loadAudiowide } from '@remotion/google-fonts/Audiowide';
import { loadFont as loadBebas } from '@remotion/google-fonts/BebasNeue';
import { loadFont as loadMichroma } from '@remotion/google-fonts/Michroma';
import { loadFont as loadOrbitron } from '@remotion/google-fonts/Orbitron';
import { loadFont as loadRacing } from '@remotion/google-fonts/RacingSansOne';
import { loadFont as loadDela } from '@remotion/google-fonts/DelaGothicOne';
import { loadFont as loadKnewave } from '@remotion/google-fonts/Knewave';
import { loadFont as loadExo2 } from '@remotion/google-fonts/Exo2';
import { loadFont as loadAnton } from '@remotion/google-fonts/Anton';
import { loadFont as loadCinzel } from '@remotion/google-fonts/Cinzel';
import { loadFont as loadCormorant } from '@remotion/google-fonts/CormorantGaramond';
import { loadFont as loadMincho } from '@remotion/google-fonts/ShipporiMinchoB1';
import { loadFont as loadMontserrat } from '@remotion/google-fonts/Montserrat';

const exo = loadExo2('italic', { weights: ['800', '900'], subsets: ['latin'] });
const anton = loadAnton('normal', { weights: ['400'], subsets: ['latin'] });
const cinzel = loadCinzel('normal', { weights: ['600', '900'], subsets: ['latin'] });
const cormorant = loadCormorant('normal', { weights: ['500', '600'], subsets: ['latin'] });
const cormorantI = loadCormorant('italic', { weights: ['500'], subsets: ['latin'] });
// the japanese subset comes as ~120 unicode-range files; all are needed for arbitrary kanji
const mincho = loadMincho('normal', { weights: ['800'], subsets: ['japanese', 'latin'], ignoreTooManyRequestsWarning: true });
const montserrat = loadMontserrat('normal', { weights: ['300', '700', '800'], subsets: ['latin'] });
const knewave = loadKnewave('normal', { weights: ['400'], subsets: ['latin'] });
const dela = loadDela('normal', { weights: ['400'], subsets: ['japanese', 'latin'], ignoreTooManyRequestsWarning: true });
// the stacked caption faces the user picks from (make-anime-music-video, after the summerstyle shorts)
const bebas = loadBebas('normal', { weights: ['400'], subsets: ['latin'] });
const racing = loadRacing('normal', { weights: ['400'], subsets: ['latin'] });
const michroma = loadMichroma('normal', { weights: ['400'], subsets: ['latin'] });
const audiowide = loadAudiowide('normal', { weights: ['400'], subsets: ['latin'] });
const orbitron = loadOrbitron('normal', { weights: ['900'], subsets: ['latin'] });

/** the stacked caption faces: family, weight, line height (of the font size) and tracking (em) */
export const STACK_FONTS = {
  bebas: { family: bebas.fontFamily, weight: 400, lh: 0.86, track: 0.01, label: 'Bebas Neue' },
  racing: { family: racing.fontFamily, weight: 400, lh: 0.92, track: 0, label: 'Racing Sans One' },
  michroma: { family: michroma.fontFamily, weight: 400, lh: 0.95, track: 0.02, label: 'Michroma' },
  audiowide: { family: audiowide.fontFamily, weight: 400, lh: 0.95, track: 0.01, label: 'Audiowide' },
  orbitron: { family: orbitron.fontFamily, weight: 900, lh: 0.92, track: 0.02, label: 'Orbitron Black' },
  anton: { family: anton.fontFamily, weight: 400, lh: 0.9, track: 0.01, label: 'Anton' },
} as const;
export type StackFont = keyof typeof STACK_FONTS;

export const FONTS = {
  /** UnClonable's brush words ("AM / THE / PAIN") */
  brush: knewave.fontFamily,
  /** heavy gothic kanji slams */
  gothic: dela.fontFamily,
  /** R02's kinetic lines: heavy italic, read as motion */
  kinetic: exo.fontFamily,
  /** the huge extruded words */
  hero: anton.fontFamily,
  /** regal titles: THE HONOURED ONE */
  regal: cinzel.fontFamily,
  /** R12's quiet serif lines: 'Honored One.' */
  serif: cormorant.fontFamily,
  serifItalic: cormorantI.fontFamily,
  /** kanji */
  jp: mincho.fontFamily,
  /** subtitles and small labels */
  label: montserrat.fontFamily,
};

export const fontsReady = Promise.all([
  exo.waitUntilDone(),
  anton.waitUntilDone(),
  cinzel.waitUntilDone(),
  cormorant.waitUntilDone(),
  cormorantI.waitUntilDone(),
  mincho.waitUntilDone(),
  montserrat.waitUntilDone(),
  knewave.waitUntilDone(),
  dela.waitUntilDone(),
  bebas.waitUntilDone(),
  racing.waitUntilDone(),
  michroma.waitUntilDone(),
  audiowide.waitUntilDone(),
  orbitron.waitUntilDone(),
]);

let loaded = false;
void fontsReady.then(() => {
  loaded = true;
});

/**
 * True once every face has loaded. Words measured with a canvas (fitted sizes, burning and knockout
 * letters) wait for it: the frame is held (delayRender) and redrawn with the real metrics.
 */
export const useFontsReady = () => {
  const [ok, setOk] = useState(loaded);
  useEffect(() => {
    if (ok) return;
    const h = delayRender('amv fonts');
    void fontsReady.then(() => {
      setOk(true);
      continueRender(h);
    });
  }, [ok]);
  return ok;
};
