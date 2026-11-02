'use client';

import { useMemo, useRef } from 'react';
import { RotateCcwIcon, UploadIcon } from 'lucide-react';
import { Hint } from '@/components/revisions/keyboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { setPropEdit } from '@/lib/remotion-editor/edits';
import type { Knob, Knobs } from '@/lib/remotion-editor/types';
import { useEditor } from './store';

/*
 * A layer's knobs in the inspector: what its scene declares with the kit's withKnobs() (ranges,
 * labels, pickers), or else the layer's own simple props. A change is a props edit in edits.json,
 * so renders pick it up; it re-renders the scene, as any props edit does.
 */

const HEX = /^#[0-9a-f]{3,8}$/i;

/** Knobs for a scene that declares none: the layer's top-level numbers, switches, colours and short texts. */
function inferKnobs(props: Record<string, unknown>): Knobs {
  const out: Knobs = {};
  for (const [key, v] of Object.entries(props)) {
    if (typeof v === 'number') out[key] = { type: 'number' };
    else if (typeof v === 'boolean') out[key] = { type: 'toggle' };
    else if (typeof v === 'string' && HEX.test(v)) out[key] = { type: 'color' };
    else if (typeof v === 'string' && v.length <= 120) out[key] = { type: 'text', multiline: v.length > 40 };
  }
  return out;
}

function KnobRow({
  layerKey,
  path,
  knob,
  original,
}: {
  layerKey: string;
  path: string;
  knob: Knob;
  /** what the layer's code sets (undefined: the scene's default) */
  original: unknown;
}) {
  const patch = useEditor(s => s.edits.props[layerKey]);
  const change = useEditor(s => s.change);
  const media = useEditor(s => s.media);
  const source = useEditor(s => s.source);
  const addSwapFile = useEditor(s => s.addSwapFile);
  const swapping = useEditor(s => s.swapping);
  const fileRef = useRef<HTMLInputElement>(null);
  const edited = !!patch && path in patch;
  const base = original ?? knob.default;
  const value = edited ? patch[path] : base;

  const commit = (next: unknown) =>
    change(e => setPropEdit(e, layerKey, path, next === base ? undefined : next), {
      coalesce: `${layerKey}:${path}`,
    });

  let control: React.ReactNode;
  switch (knob.type) {
    case 'number': {
      const n = typeof value === 'number' ? value : undefined;
      const step = knob.step ?? (n !== undefined && Math.abs(n) < 2 && n % 1 !== 0 ? 0.01 : 1);
      control = (
        <div className="flex items-center gap-2">
          {knob.min !== undefined && knob.max !== undefined && (
            <Slider
              min={knob.min}
              max={knob.max}
              step={step}
              value={[n ?? knob.min]}
              onValueChange={([v]) => commit(v)}
              className="flex-1"
            />
          )}
          <Input
            type="number"
            step={step}
            min={knob.min}
            max={knob.max}
            value={n === undefined ? '' : String(n)}
            placeholder="scene default"
            onChange={e => {
              const v = e.target.value;
              if (v === '') commit(undefined);
              else if (Number.isFinite(Number(v))) commit(Number(v));
            }}
            className={`h-7 px-2 text-xs tabular-nums ${knob.min !== undefined && knob.max !== undefined ? 'w-20' : ''}`}
          />
          {knob.unit && <span className="text-[11px] text-muted-foreground">{knob.unit}</span>}
        </div>
      );
      break;
    }
    case 'color':
      control = (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={HEX.test(String(value)) ? String(value).slice(0, 7) : '#ffffff'}
            onChange={e => commit(e.target.value)}
            className="h-7 w-9 cursor-pointer rounded border bg-transparent"
          />
          <Input
            value={value === undefined ? '' : String(value)}
            placeholder="scene default"
            onChange={e => commit(e.target.value || undefined)}
            className="h-7 px-2 font-mono text-xs"
          />
        </div>
      );
      break;
    case 'select':
      control = (
        <Select value={value === undefined ? '' : String(value)} onValueChange={commit}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="scene default" />
          </SelectTrigger>
          <SelectContent>
            {knob.options.map(o => (
              <SelectItem key={o} value={o} className="text-xs">
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
      break;
    case 'toggle':
      control = <Switch checked={!!value} onCheckedChange={v => commit(v)} />;
      break;
    case 'text':
      control = knob.multiline ? (
        <Textarea
          rows={2}
          value={value === undefined ? '' : String(value)}
          placeholder="scene default"
          onChange={e => commit(e.target.value === '' ? undefined : e.target.value)}
          className="min-h-7 resize-y px-2 py-1 text-xs"
        />
      ) : (
        <Input
          value={value === undefined ? '' : String(value)}
          placeholder="scene default"
          onChange={e => commit(e.target.value === '' ? undefined : e.target.value)}
          className="h-7 px-2 text-xs"
        />
      );
      break;
    case 'asset': {
      const files = media.filter(m => m.kind === knob.accept);
      const current = typeof value === 'string' ? value : '';
      const options = current && !files.some(f => f.path === current) ? [current, ...files.map(f => f.path)] : files.map(f => f.path);
      control = (
        <div className="space-y-1.5">
          {current && source && knob.accept === 'image' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={source.assetUrl(current)} alt="" className="max-h-24 rounded border bg-muted object-contain" />
          )}
          <Select value={current} onValueChange={commit}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="scene default" />
            </SelectTrigger>
            <SelectContent>
              {options.slice(0, 300).map(p => (
                <SelectItem key={p} value={p} className="text-xs">
                  {p.slice(p.indexOf('/') + 1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={fileRef}
            type="file"
            accept={`${knob.accept}/*`}
            className="hidden"
            onChange={async e => {
              const file = e.target.files?.[0];
              e.target.value = '';
              const path = file ? await addSwapFile(file) : null;
              if (path) commit(path);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={!source?.writeSwap || !!swapping}
            onClick={() => fileRef.current?.click()}
          >
            <UploadIcon className="size-3.5" />
            {swapping ? `Saving ${swapping}…` : 'Use a new file…'}
          </Button>
        </div>
      );
      break;
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs text-muted-foreground" title={knob.hint ?? path}>
          {knob.label ?? path}
          {edited && <span className="ml-1 text-primary">•</span>}
        </span>
        {edited && (
          <Hint label="Back to the scene's value">
            <Button variant="ghost" size="sm" className="h-5 px-1" onClick={() => commit(undefined)}>
              <RotateCcwIcon className="size-3" />
            </Button>
          </Hint>
        )}
      </div>
      {control}
      {knob.hint && <p className="text-[10px] leading-snug text-muted-foreground">{knob.hint}</p>}
    </div>
  );
}

/** The knobs of the layer `layerKey`, as a section of the inspector. */
export function KnobsSection({ layerKey }: { layerKey: string }) {
  const compiled = useEditor(s => s.compiled);
  const layerKeys = useEditor(s => s.layerKeys);
  const layer = compiled?.project.layers[layerKeys.indexOf(layerKey)];
  const declared = useMemo(
    () => (layer ? (compiled?.kit.knobsOf?.(layer.scene) ?? null) : null),
    [compiled, layer],
  );
  const props = (layer?.props ?? {}) as Record<string, unknown>;
  const knobs = useMemo(() => declared ?? inferKnobs(props), [declared, props]);
  const entries = Object.entries(knobs);
  if (!layer || !compiled || !entries.length) return null;
  return (
    <section className="space-y-3 border-b px-3 py-3">
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {declared ? 'Knobs' : 'Layer props'} · {layerKey}
        </h3>
        {!declared && (
          <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
            The scene declares no knobs, so these are the layer&apos;s own simple props. Scenes
            declare knobs (ranges, labels, file pickers) with the kit&apos;s withKnobs().
          </p>
        )}
      </div>
      {entries.map(([path, knob]) => (
        <KnobRow
          key={path}
          layerKey={layerKey}
          path={path}
          knob={knob}
          original={compiled.kit.getPath(props, path)}
        />
      ))}
    </section>
  );
}
