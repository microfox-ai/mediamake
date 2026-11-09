/**
 * Web fonts for text that isn't drawn from glyph paths (taglines, guides), loaded from the brand's
 * graphics/public/fonts/ instead of the network, so renders never wait on Google Fonts. The same
 * files ship in the brand kit's fonts/.
 */
import { continueRender, delayRender, staticFile } from 'remotion';

export type FontFile = { family: string; file: string; weight?: string; style?: string };

/**
 * `timeoutInMilliseconds`: how long a render waits for the files (Remotion's default, 30 s, unless
 * set). On a busy machine Remotion can replace a crashed tab late in a long render, and the new
 * tab's font load then sometimes misses 30 s.
 */
export const loadFonts = (brand: string, faces: FontFile[], { timeoutInMilliseconds }: { timeoutInMilliseconds?: number } = {}) => {
  if (typeof document === 'undefined') return;
  for (const { family, file, weight = '400', style = 'normal' } of faces) {
    const handle = delayRender(`Loading ${family} ${file}`, timeoutInMilliseconds ? { timeoutInMilliseconds } : undefined);
    new FontFace(family, `url(${staticFile(`${brand}/fonts/${file}`)})`, { weight, style })
      .load()
      .then(face => {
        document.fonts.add(face);
        continueRender(handle);
      })
      .catch(err => {
        console.error(err);
        continueRender(handle);
      });
  }
};
