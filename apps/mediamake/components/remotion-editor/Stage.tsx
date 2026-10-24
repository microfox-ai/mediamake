'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { LoaderIcon, TriangleAlertIcon } from 'lucide-react';
import { setElementEdit } from '@/lib/remotion-editor/edits';
import {
  elementsById,
  hitTest,
  infoFor,
  parentScale,
  scanOnScreen,
  unionBox,
  type Box,
} from './dom';
import { ConnectPanel } from './ConnectPanel';
import { player, useEditor } from './store';

const BLUE = '#0B84F3';
const HANDLE = 9;

const place = (el: HTMLElement | null, box: Box | null) => {
  if (!el) return;
  if (!box) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  el.style.transform = `translate(${box.left}px, ${box.top}px)`;
  el.style.width = `${box.width}px`;
  el.style.height = `${box.height}px`;
};

type Gesture = 'move' | 'scale' | 'rotate';

/**
 * Selection, drag, scale and rotate over the Player. Boxes follow the elements every animation
 * frame and are positioned directly (no React render per frame).
 */
function Overlay({ scale, fps }: { scale: number; fps: number }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const selRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLSpanElement>(null);
  const hoverId = useRef<string | null>(null);
  const selectedId = useEditor(s => s.selectedId);

  useEffect(() => {
    let raf = 0;
    let lastScan = 0;
    let scanKey = '';
    let infoKey = '';
    const tick = (time: number) => {
      raf = requestAnimationFrame(tick);
      const root = player.current?.getContainerNode();
      const overlay = overlayRef.current;
      if (!root || !overlay) return;
      const origin = overlay.getBoundingClientRect();
      const state = useEditor.getState();
      const id = state.selectedId;
      const selEls = id ? elementsById(root, id) : [];
      place(selRef.current, unionBox(selEls, origin));
      const hover = hoverId.current && hoverId.current !== id ? hoverId.current : null;
      place(hoverRef.current, hover ? unionBox(elementsById(root, hover), origin) : null);

      if (id) {
        const info = selEls[0] ? infoFor(selEls[0]) : null;
        const key = info ? JSON.stringify(info) : `gone:${id}`;
        if (key !== infoKey) {
          infoKey = key;
          state.setSelected(info);
        }
        if (tagRef.current && info) tagRef.current.textContent = info.label;
      } else {
        infoKey = '';
      }
      if (time - lastScan > 250) {
        lastScan = time;
        const list = scanOnScreen(root);
        const key = list.map(i => `${i.id}\u0000${i.label}`).join('|');
        if (key !== scanKey) {
          scanKey = key;
          state.setOnScreen(list);
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const startGesture = useCallback(
    (kind: Gesture, id: string, e: React.PointerEvent) => {
      const root = player.current?.getContainerNode();
      const els = root ? elementsById(root, id) : [];
      if (!els.length) return;
      const store = useEditor.getState();
      const start = store.edits.elements[id] ?? {};
      const box = unionBox(els)!;
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const k = parentScale(els[0], scale);
      const meta = { label: infoFor(els[0]).label, at: store.frame / fps };
      const a0 = Math.atan2(e.clientY - cy, e.clientX - cx);
      const d0 = Math.max(4, Math.hypot(e.clientX - cx, e.clientY - cy));
      player.current?.pause();
      store.beginGesture();
      let moved = false;

      const onMove = (ev: PointerEvent) => {
        if (!moved && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 3) return;
        moved = true;
        let patch;
        if (kind === 'move') {
          let dx = (ev.clientX - e.clientX) / k;
          let dy = (ev.clientY - e.clientY) / k;
          if (ev.shiftKey) {
            if (Math.abs(dx) > Math.abs(dy)) dy = 0;
            else dx = 0;
          }
          patch = { x: (start.x ?? 0) + dx, y: (start.y ?? 0) + dy };
        } else if (kind === 'scale') {
          const d = Math.hypot(ev.clientX - cx, ev.clientY - cy);
          patch = { scale: Math.min(20, Math.max(0.05, (start.scale ?? 1) * (d / d0))) };
        } else {
          let deg =
            (start.rotate ?? 0) +
            ((Math.atan2(ev.clientY - cy, ev.clientX - cx) - a0) * 180) / Math.PI;
          if (ev.shiftKey) deg = Math.round(deg / 15) * 15;
          patch = { rotate: ((deg + 540) % 360) - 180 };
        }
        useEditor.getState().change(ed => setElementEdit(ed, id, patch, meta), { live: true });
      };
      const onUp = (ev: PointerEvent) => {
        // the release point counts too: not every pointer sends a move where it lets go
        onMove(ev);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        useEditor.getState().endGesture(moved);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [scale, fps],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const root = player.current?.getContainerNode();
    if (!root) return;
    e.preventDefault();
    const store = useEditor.getState();
    const hits = hitTest(root, e.clientX, e.clientY);
    let id = store.selectedId;
    // pressing on the selection, or on something inside it (a word of a selected lockup), drags
    // the selection; anything else selects the most specific thing under the pointer
    const inside =
      !!id &&
      !!hits[0] &&
      elementsById(root, id).some(el => el === hits[0].el || el.contains(hits[0].el));
    if (e.altKey && hits.length) {
      // walk outwards through what is under the pointer
      const i = hits.findIndex(h => h.id === id);
      id = hits[(i + 1) % hits.length].id;
    } else if (!inside) {
      id = hits[0]?.id ?? null;
    }
    store.select(id);
    if (id) startGesture('move', id, e);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (useEditor.getState().dragging) return;
    const root = player.current?.getContainerNode();
    const hit = root ? (hitTest(root, e.clientX, e.clientY)[0]?.id ?? null) : null;
    hoverId.current = hit;
    if (overlayRef.current) overlayRef.current.style.cursor = hit ? 'move' : 'default';
  };

  // double-click goes into a group (the word inside a lockup) and opens its text for editing
  const onDoubleClick = (e: React.MouseEvent) => {
    const root = player.current?.getContainerNode();
    const deepest = root ? hitTest(root, e.clientX, e.clientY)[0] : undefined;
    if (deepest) useEditor.getState().select(deepest.id);
    requestAnimationFrame(() => window.dispatchEvent(new Event('remotion-editor:edit-text')));
  };

  const handle = (kind: Gesture, style: React.CSSProperties, cursor: string) => (
    <div
      onPointerDown={e => {
        if (e.button !== 0 || !selectedId) return;
        e.stopPropagation();
        e.preventDefault();
        startGesture(kind, selectedId, e);
      }}
      style={{
        position: 'absolute',
        width: HANDLE,
        height: HANDLE,
        background: 'white',
        border: `1.5px solid ${BLUE}`,
        borderRadius: kind === 'rotate' ? '50%' : 2,
        pointerEvents: 'auto',
        cursor,
        ...style,
      }}
    />
  );

  const half = -HANDLE / 2;
  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-10 select-none"
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        hoverId.current = null;
      }}
      onDoubleClick={onDoubleClick}
    >
      <div
        ref={hoverRef}
        className="pointer-events-none absolute left-0 top-0"
        style={{ display: 'none', outline: `1px dashed ${BLUE}`, outlineOffset: 1 }}
      />
      <div
        ref={selRef}
        className="pointer-events-none absolute left-0 top-0"
        style={{ display: 'none', outline: `1.5px solid ${BLUE}` }}
      >
        <span
          ref={tagRef}
          className="absolute -top-6 left-0 max-w-64 truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
          style={{ background: BLUE }}
        />
        {handle('scale', { left: half, top: half }, 'nwse-resize')}
        {handle('scale', { right: half, top: half }, 'nesw-resize')}
        {handle('scale', { left: half, bottom: half }, 'nesw-resize')}
        {handle('scale', { right: half, bottom: half }, 'nwse-resize')}
        {handle('rotate', { left: `calc(50% + ${half}px)`, top: -26 }, 'grab')}
      </div>
    </div>
  );
}

/** The Player sized to fit the stage, with the edit overlay on top. */
export function Stage() {
  const Video = useEditor(s => s.Video);
  const manifest = useEditor(s => s.manifest);
  const edits = useEditor(s => s.edits);
  const compiled = useEditor(s => s.compiled);
  const durationInFrames = useEditor(s => s.durationInFrames);
  const phase = useEditor(s => s.phase);
  const error = useEditor(s => s.error);
  const slug = useEditor(s => s.slug);
  const progress = useEditor(s => s.progress);
  const hasSource = useEditor(s => !!s.source);
  const projectsLoaded = useEditor(s => s.projectsLoaded);
  const noProjects = useEditor(s => s.projects.length === 0);
  const projectsError = useEditor(s => s.projectsError);
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setBox({ w: entry.contentRect.width, h: entry.contentRect.height }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const project = compiled?.project;
  const fit = useMemo(() => {
    if (!project || !box.w || !box.h) return null;
    const pad = 32;
    const s = Math.min((box.w - pad) / project.width, (box.h - pad) / project.height);
    return { w: project.width * s, h: project.height * s, scale: s };
  }, [project, box]);

  const inputProps = useMemo(() => ({ manifest, edits }), [manifest, edits]);

  const setPlayer = useCallback((p: PlayerRef | null) => {
    player.current = p;
    if (!p) return;
    const { setFrame, setPlaying } = useEditor.getState();
    p.addEventListener('frameupdate', e => setFrame(e.detail.frame));
    p.addEventListener('seeked', e => setFrame(e.detail.frame));
    p.addEventListener('play', () => setPlaying(true));
    p.addEventListener('pause', () => setPlaying(false));
    p.addEventListener('ended', () => setPlaying(false));
  }, []);

  let body: React.ReactNode = null;
  if (!hasSource || projectsError || (projectsLoaded && noProjects)) {
    body = <ConnectPanel />;
  } else if (!projectsLoaded || (phase === 'compiling' && !Video)) {
    body = (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderIcon className="size-4 animate-spin" />
        {projectsLoaded ? (progress ?? `Compiling ${slug}…`) : 'Listing projects…'}
      </div>
    );
  } else if (phase === 'error' && !Video) {
    body = <Notice tone="error" title={`${slug} didn't compile`} text={error ?? ''} />;
  } else if (Video && manifest && project && fit) {
    body = (
      <div className="relative shadow-2xl" style={{ width: fit.w, height: fit.h }}>
        <Player
          ref={setPlayer}
          component={Video}
          inputProps={inputProps}
          durationInFrames={durationInFrames}
          fps={project.fps}
          compositionWidth={project.width}
          compositionHeight={project.height}
          style={{ width: '100%', height: '100%' }}
          acknowledgeRemotionLicense
          clickToPlay={false}
          doubleClickToFullscreen={false}
          spaceKeyToPlayOrPause={false}
          errorFallback={({ error: e }) => (
            <div className="flex h-full items-center justify-center bg-black p-6 text-center text-sm text-red-300">
              {e.message}
            </div>
          )}
        />
        <Overlay scale={fit.scale} fps={project.fps} />
      </div>
    );
  }

  return (
    <div
      ref={boxRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-neutral-950"
    >
      {body}
      {error && Video && (
        <div className="absolute inset-x-3 top-3 z-20 flex items-start gap-2 rounded-md bg-red-950/90 px-3 py-2 text-xs text-red-100 shadow">
          <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
          <span className="min-w-0 whitespace-pre-wrap break-words">
            Showing the last version that compiled. {error}
          </span>
        </div>
      )}
    </div>
  );
}

function Notice({ tone, title, text }: { tone: 'error'; title: string; text: string }) {
  return (
    <div className="max-w-xl space-y-2 px-6 text-center">
      <TriangleAlertIcon
        className={`mx-auto size-8 ${tone === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}
      />
      <p className="text-sm font-medium">{title}</p>
      <p className="whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground">
        {text}
      </p>
    </div>
  );
}
