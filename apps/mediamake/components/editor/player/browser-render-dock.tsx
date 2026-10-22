'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  isBrowserRenderActive,
  type BrowserRenderController,
  type BrowserRenderState,
} from './use-browser-render';
import { BrowserRenderDockCard } from './browser-render-progress';

/**
 * Mirrors render progress into the tab title and warns before leaving the
 * page mid-render (a reload would throw the render away).
 */
function useRenderPageSignals(state: BrowserRenderState) {
  const baseTitleRef = useRef<string | null>(null);
  const active = isBrowserRenderActive(state.phase);

  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Legacy browsers need a returnValue to show the prompt.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);

  const percent = Math.round(state.progress * 100);
  const label = !active
    ? null
    : state.paused
      ? `⏸ Paused ${percent}%`
      : state.phase === 'rendering'
        ? `${percent}% Rendering`
        : state.phase === 'uploading'
          ? 'Uploading…'
          : state.phase === 'preparing'
            ? 'Preparing render…'
            : 'Finishing render…';

  useEffect(() => {
    if (label) {
      if (baseTitleRef.current === null) baseTitleRef.current = document.title;
      document.title = `${label} · ${baseTitleRef.current}`;
      return;
    }
    if (baseTitleRef.current !== null) {
      document.title = baseTitleRef.current;
      baseTitleRef.current = null;
    }
  }, [label]);

  useEffect(
    () => () => {
      if (baseTitleRef.current !== null) document.title = baseTitleRef.current;
    },
    [],
  );
}

/**
 * Corner card for the browser render while the render modal is closed.
 * Mounted by RenderProvider, so every editor that can render gets it.
 */
export function BrowserRenderDock({
  controller,
  modalOpen,
  onExpand,
}: {
  controller: BrowserRenderController;
  modalOpen: boolean;
  onExpand: () => void;
}) {
  const { state, reset } = controller;
  useRenderPageSignals(state);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Finished renders linger so the result is seen, then tidy themselves away.
  const finished = state.phase === 'done' || state.phase === 'cancelled';
  useEffect(() => {
    if (!finished || modalOpen) return;
    const id = window.setTimeout(reset, state.phase === 'cancelled' ? 4000 : 15000);
    return () => window.clearTimeout(id);
  }, [finished, modalOpen, reset, state.phase]);

  if (!mounted || modalOpen || state.phase === 'idle') return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2">
      <div className="pointer-events-auto">
        <BrowserRenderDockCard controller={controller} onExpand={onExpand} onDismiss={reset} />
      </div>
    </div>,
    document.body,
  );
}
