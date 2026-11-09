/**
 * Job fonts, loaded from thumbnails/jobs/<job>/fonts/ (never the network, so renders don't stall),
 * under their real family names. Text layers measure themselves, so they wait for this.
 */
import { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import { type FontSpec, fontFile } from './spec.ts';

const loading = new Map<string, Promise<void>>();

const load = (job: string, fonts: FontSpec[]) => {
  if (!loading.has(job))
    loading.set(
      job,
      Promise.all(
        fonts.map(f =>
          new FontFace(f.family, `url(${staticFile(`${job}/fonts/${fontFile(f)}`)})`, { weight: String(f.weight ?? 400), style: f.italic ? 'italic' : 'normal' })
            .load()
            .then(face => void document.fonts.add(face))
            .catch(err => console.error(`Font ${f.family} (${fontFile(f)}) failed to load`, err)),
        ),
      ).then(() => undefined),
    );
  return loading.get(job)!;
};

export const useFonts = (job: string, fonts: FontSpec[]) => {
  const [handle] = useState(() => delayRender(`Fonts for ${job}`));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    load(job, fonts).then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [job, fonts, handle]);
  return ready;
};

/** A job-relative path (input/hero.jpg) as a served URL; full URLs pass through. */
export const src = (job: string, path: string) => (/^(https?:|data:)/.test(path) ? path : staticFile(`${job}/${path}`));
