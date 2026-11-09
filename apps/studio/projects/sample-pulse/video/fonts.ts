import { loadFont as loadAnton } from '@remotion/google-fonts/Anton';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';

export const display = loadAnton('normal', {
  weights: ['400'],
  subsets: ['latin'],
}).fontFamily;
export const body = loadInter('normal', {
  weights: ['400', '700'],
  subsets: ['latin'],
}).fontFamily;
