'use client';

import { useMemo } from 'react';
import { LayersIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { player, useEditor } from './store';

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`;
};

function Row({
  active,
  selected,
  edited,
  title,
  detail,
  dim,
  onClick,
}: {
  active?: boolean;
  selected: boolean;
  edited: boolean;
  title: string;
  detail?: string;
  dim?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted',
        selected && 'bg-primary/15 hover:bg-primary/20',
        dim && 'text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          active ? 'bg-emerald-500' : 'bg-transparent',
        )}
      />
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {detail && <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">{detail}</span>}
      {edited && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
    </button>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

/** Layers of the project, what is on screen now, and everything edited. */
export function ElementsPanel() {
  const compiled = useEditor(s => s.compiled);
  const manifest = useEditor(s => s.manifest);
  const layerKeys = useEditor(s => s.layerKeys);
  const edits = useEditor(s => s.edits);
  const onScreen = useEditor(s => s.onScreen);
  const selectedId = useEditor(s => s.selectedId);
  const select = useEditor(s => s.select);
  // quarter seconds are enough to light up active layers, without a render per frame
  const time = useEditor(s => Math.floor((s.frame / (s.compiled?.project.fps ?? 30)) * 4) / 4);

  const layers = useMemo(() => {
    if (!compiled || !manifest) return [];
    return compiled.project.layers.map((l, i) => {
      let range = { from: 0, to: manifest.audio.duration };
      try {
        range = compiled.kit.resolveAt(l.at, manifest, l.name);
      } catch {
        // an unknown section label: the render shows that error
      }
      const scene = l.scene.displayName ?? l.scene.name ?? 'Scene';
      return { key: layerKeys[i], scene, ...range };
    });
  }, [compiled, manifest, layerKeys]);

  const seek = (seconds: number) => {
    const fps = compiled?.project.fps ?? 30;
    player.current?.pause();
    player.current?.seekTo(Math.max(0, Math.round(seconds * fps)));
  };

  if (!compiled) {
    return <div className="p-3 text-xs text-muted-foreground">No project open.</div>;
  }

  const edited = Object.entries(edits.elements);
  const propEdits = Object.entries(edits.props).flatMap(([layer, patch]) =>
    Object.entries(patch).map(([path, value]) => ({ layer, path, value })),
  );

  return (
    <div className="h-full overflow-y-auto pb-4">
      <Heading>On screen now</Heading>
      <div className="px-1">
        {onScreen.length ? (
          onScreen.map(o => (
            <Row
              key={o.id}
              title={o.label}
              detail={o.layer ?? undefined}
              selected={selectedId === o.id}
              edited={!!edits.elements[o.id]}
              onClick={() => select(o.id)}
            />
          ))
        ) : (
          <p className="px-2 text-xs text-muted-foreground">
            Nothing selectable at this frame. Scenes mark elements with editable().
          </p>
        )}
      </div>

      <Heading>
        <span className="inline-flex items-center gap-1">
          <LayersIcon className="size-3" /> Layers
        </span>
      </Heading>
      <div className="px-1">
        {layers.map(l => {
          const id = `layer:${l.key}`;
          const active = time >= l.from && time < l.to;
          return (
            <Row
              key={l.key}
              title={l.key}
              detail={l.scene}
              active={active}
              dim={!active}
              selected={selectedId === id}
              edited={!!edits.elements[id] || !!edits.props[l.key]}
              onClick={() => {
                select(id);
                if (!active) seek(l.from);
              }}
            />
          );
        })}
      </div>

      {(edited.length > 0 || propEdits.length > 0) && (
        <>
          <Heading>Edited</Heading>
          <div className="px-1">
            {edited.map(([id, e]) => (
              <Row
                key={id}
                title={e.label ?? id}
                detail={e.at !== undefined ? fmt(e.at) : undefined}
                selected={selectedId === id}
                edited
                onClick={() => {
                  select(id);
                  if (e.at !== undefined) seek(e.at);
                }}
              />
            ))}
            {propEdits.map(p => (
              <div
                key={`${p.layer}:${p.path}`}
                className="truncate px-2 py-1 font-mono text-[10px] text-muted-foreground"
                title={`${p.layer} · ${p.path} = ${JSON.stringify(p.value)}`}
              >
                {p.layer} · {p.path} = {JSON.stringify(p.value)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
