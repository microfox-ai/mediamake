/**
 * Canvas text measurement for fitting words to the window. Valid only once the fonts are loaded:
 * useFontsReady(promise) holds the render until they are and re-renders.
 */
import { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';

let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, number>();

export const measure = (text: string, family: string, size: number, letterSpacingEm = 0): number => {
  const key = `${family}|${size}|${letterSpacingEm}|${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  if (!ctx) ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return text.length * size * 0.5;
  ctx.font = `${size}px "${family}"`;
  const w = ctx.measureText(text).width + letterSpacingEm * size * Math.max(0, [...text].length - 1);
  cache.set(key, w);
  return w;
};

const done = new WeakSet<Promise<unknown>>();

export const useFontsReady = (ready: Promise<unknown>) => {
  const [ok, setOk] = useState(done.has(ready));
  useEffect(() => {
    if (ok) return;
    const handle = delayRender('remix fonts');
    ready.then(() => {
      done.add(ready);
      cache.clear();
      setOk(true);
      continueRender(handle);
    });
  }, [ok, ready]);
  return ok;
};
