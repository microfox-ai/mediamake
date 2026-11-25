/**
 * A painted cartoon as a Remotion scene: the project's scene files (video/painted.json) run in the
 * kit's page (page.ts) inside an iframe, which draws each frame on request; the frame is copied onto
 * this scene's canvas. The kit's frames are pure functions of time, so Remotion may render them in
 * any order, in several tabs at once.
 *
 * Its length and beat come from the manifest: the song, or the silent track `mm painted new` writes.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { SceneProps } from '../kit/contract';
import p5Src from '@mediamake/painted-lib/p5.min.js?raw';
import brushSrc from '@mediamake/painted-lib/p5.brush.js?raw';
import coreSrc from './kit/core.js?raw';
import clawdSrc from './kit/clawd.js?raw';
import timelineSrc from './kit/timeline.js?raw';
import sheetsSrc from './kit/sheets.js?raw';
import { HEIGHT, WIDTH, paintedPage, parseConfig, settingsFor, type PageSources } from './page';

const SOURCES: PageSources = {
  p5: p5Src,
  brush: brushSrc,
  kit: { core: coreSrc, clawd: clawdSrc, timeline: timelineSrc, sheets: sheetsSrc },
};

type KitWindow = Window & {
  ready?: boolean;
  paintedError?: string | null;
  renderFrame: (t: number) => Promise<void>;
};

export type PaintedCartoonProps = {
  /** A standalone loop (the model sheets 'emotions' and 'views', or one of the project's) instead of the video. */
  loop?: string;
};

const fetchText = async (file: string) => {
  const res = await fetch(staticFile(file), { cache: 'no-store' });
  if (!res.ok) throw new Error(`${file}: ${res.status} (mm painted new makes a project's files)`);
  return res.text();
};

/** The page's HTML for a project: its painted.json, its scene files and the manifest's timing. */
const buildPage = async (manifest: SceneProps['manifest'], loop?: string) => {
  const video = `${manifest.slug}/video`;
  const config = parseConfig(await fetchText(`${video}/painted.json`), `${video}/painted.json`);
  const scenes = await Promise.all(config.scenes.map(async name => ({ name, src: await fetchText(`${video}/${name}`) })));
  return paintedPage({ sources: SOURCES, settings: settingsFor(config, manifest), scenes, loop });
};

/** Waits for the kit's setup (fonts, paper, brushes): window.ready, or the error that stopped it. */
const whenReady = async (win: KitWindow) => {
  for (let i = 0; i < 1200; i++) {
    if (win.paintedError) throw new Error(`painted cartoon: ${win.paintedError}`);
    if (win.ready === true) return;
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error('painted cartoon: the kit was not ready after 60 s');
};

export const PaintedCartoon: React.FC<SceneProps<PaintedCartoonProps>> = ({ manifest, loop }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [win, setWin] = useState<KitWindow | null>(null);
  // one frame at a time: the kit draws into one canvas
  const queue = useRef<Promise<void>>(Promise.resolve());

  // the page: the project's files, read once (a reload picks up edits to them)
  const [loading] = useState(() => delayRender('Loading the painted cartoon', { timeoutInMilliseconds: 120000 }));
  useEffect(() => {
    buildPage(manifest, loop).then(setHtml, e => cancelRender(e));
  }, [manifest, loop]);

  const onLoad = () => {
    const w = frameRef.current?.contentWindow as KitWindow | null;
    if (!w) return;
    whenReady(w).then(
      () => {
        setWin(w);
        continueRender(loading);
      },
      e => cancelRender(e),
    );
  };

  useEffect(() => {
    if (!win) return;
    const handle = delayRender(`Painting frame ${frame}`, { timeoutInMilliseconds: 120000 });
    let current = true;
    queue.current = queue.current
      .then(async () => {
        if (!current) return; // a newer frame was asked for (scrubbing in Studio)
        await win.renderFrame(frame / fps);
        if (win.paintedError) throw new Error(`painted cartoon, frame ${frame}: ${win.paintedError}`);
        const out = win.document.getElementById('out') as HTMLCanvasElement | null;
        const ctx = canvasRef.current?.getContext('2d');
        if (out && ctx) ctx.drawImage(out, 0, 0, WIDTH, HEIGHT);
      })
      .then(
        () => continueRender(handle),
        e => cancelRender(e),
      );
    return () => {
      current = false;
    };
  }, [win, frame, fps]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#F3EBDC' }}>
      {html ? (
        // behind the canvas, at full size: Chrome keeps painting a frame it can see
        <iframe
          ref={frameRef}
          srcDoc={html}
          onLoad={onLoad}
          title="painted cartoon"
          style={{ position: 'absolute', inset: 0, width: WIDTH, height: HEIGHT, border: 0, pointerEvents: 'none' }}
        />
      ) : null}
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </AbsoluteFill>
  );
};
