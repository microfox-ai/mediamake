import { loadFont as loadJakarta } from '@remotion/google-fonts/PlusJakartaSans';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
import { loadFont as loadLilita } from '@remotion/google-fonts/LilitaOne';
import { loadFont as loadBrush } from '@remotion/google-fonts/CaveatBrush';
import { Easing, staticFile } from 'remotion';

export const SLUG = 'cookwithclaude-pack-brand-kit';
export const FPS = 30;
export const W = 1920;
export const H = 1080;

/** A file in this project's input/ folder. */
export const src = (path: string) => staticFile(`${SLUG}/input/${path}`);

export const sans = loadJakarta('normal', { weights: ['800'], subsets: ['latin'] }).fontFamily;
export const mono = loadMono('normal', { weights: ['400', '700', '800'], subsets: ['latin'] }).fontFamily;
export const lilita = loadLilita('normal', { weights: ['400'], subsets: ['latin'] }).fontFamily;
export const brush = loadBrush('normal', { weights: ['400'], subsets: ['latin'] }).fontFamily;

/** Claude's palette, as in the Cook with Claude brand guide. */
export const C = {
  ivory: '#F0EEE6',
  ivoryLight: '#FAF9F5',
  oat: '#E3DACC',
  slate: '#141413',
  slateMid: '#3D3D3A',
  slateLift: '#1E1E1C',
  cloud: '#87867F',
  clay: '#D97757',
  clayDeep: '#C6613F',
};

export const ease = Easing.bezier(0.22, 1, 0.36, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.bezier(0.55, 0, 1, 0.45);

/** Seconds → frames. */
export const f = (s: number) => Math.round(s * FPS);

/** The copied install prompt, exactly as MediaMake's button copies it today (live catalog, 2 Nov 2026). */
export const INSTALL_PROMPT =
  'Set up skill/pack-brand-kit from MediaMake (https://mediamake-mediamake.vercel.app) by following https://github.com/microfox-ai/mediamake/blob/main/install.md';
export const ASK_PROMPT = '/pack-brand-kit make a brand kit for Cook with Claude';
/** The install plan's steps (GET /api/catalog/install?item=skill/pack-brand-kit). */
export const INSTALL_STEPS = ['microfox-ai/mediamake', 'skill · revise-image', 'skill · pack-brand-kit', 'connector · ElevenLabs', 'connector · fal'];

/** Your notes between the logo rounds, word for word (brand storyboard). */
export const NOTES = [
  'hard to get that those are the words',
  'make it readable and make it symmetrical',
  'actually i drop c09 as inspo and try a05 and a06',
  'but put the claude logo at the center of fire',
];
