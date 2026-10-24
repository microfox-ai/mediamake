'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcwIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FontPicker } from '@/components/editor/presets/form/inputs/font-picker';
import {
  countEdits,
  fieldPath,
  resetElement,
  resetPropFields,
  setElementEdit,
  setPropEdit,
} from '@/lib/remotion-editor/edits';
import { emptyEdits, type ElementEdit } from '@/lib/remotion-editor/types';
import { Hint } from '@/components/revisions/keyboard';
import { useEditor, type SelectedInfo } from './store';

/**
 * Values of `key` anywhere in the given props (the layer's, then other layers of the same scene):
 * what type the field holds, and which strings it takes.
 */
function inferField(props: unknown[], key: string) {
  const values: unknown[] = [];
  const seen = new Set<object>();
  const walk = (v: unknown) => {
    if (values.length > 2000 || !v || typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) return v.forEach(walk);
    for (const [k, x] of Object.entries(v)) {
      if (k === key && x !== undefined && typeof x !== 'function') values.push(x);
      walk(x);
    }
  };
  walk(props);
  const kinds = new Set(values.map(v => typeof v));
  const kind = kinds.size === 1 ? [...kinds][0] : kinds.size ? 'mixed' : 'unknown';
  const options = kind === 'string' ? [...new Set(values as string[])].sort() : [];
  return { kind, options: options.length <= 40 ? options : [] };
}

const TEXT_FIELDS = new Set(['text', 'title', 'subtitle', 'caption', 'label']);
const isColorField = (field: string) => /colou?r|accent|fill|stroke|tint/i.test(field);

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-b px-3 py-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** A number box that keeps what is typed until it parses, and commits every valid value. */
function NumberField({
  label,
  value,
  suffix,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  step?: number;
  onChange: (n: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="w-12 shrink-0">{label}</span>
      <Input
        type="number"
        step={step}
        value={text}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          setText(String(value));
        }}
        onChange={e => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value !== '' && Number.isFinite(n)) onChange(n);
        }}
        className="h-7 px-2 text-xs tabular-nums"
      />
      {suffix && <span className="w-4 shrink-0">{suffix}</span>}
    </label>
  );
}

const roundTo = (n: number, places = 1) => Math.round(n * 10 ** places) / 10 ** places;

function TransformSection({ id, info }: { id: string; info: SelectedInfo | null }) {
  const edit: ElementEdit = useEditor(s => s.edits.elements[id]) ?? {};
  const change = useEditor(s => s.change);
  const frame = useEditor(s => s.frame);
  const fps = useEditor(s => s.compiled?.project.fps ?? 30);
  const meta = { label: info?.label, at: frame / fps };
  const set = (patch: Partial<ElementEdit>, key: string) =>
    change(e => setElementEdit(e, id, patch, meta), { coalesce: `${id}:${key}` });
  const moved = edit.x || edit.y || (edit.scale ?? 1) !== 1 || edit.rotate;

  return (
    <>
      <Section
        title="Position"
        action={
          moved ? (
            <Hint label="Reset position, scale and rotation">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5"
                onClick={() =>
                  change(e => setElementEdit(e, id, { x: 0, y: 0, scale: 1, rotate: 0 }))
                }
              >
                <RotateCcwIcon className="size-3.5" />
              </Button>
            </Hint>
          ) : null
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X" suffix="px" value={roundTo(edit.x ?? 0)} onChange={x => set({ x }, 'x')} />
          <NumberField label="Y" suffix="px" value={roundTo(edit.y ?? 0)} onChange={y => set({ y }, 'y')} />
          <NumberField
            label="Scale"
            suffix="%"
            value={roundTo((edit.scale ?? 1) * 100)}
            onChange={p => set({ scale: Math.max(0.05, p / 100) }, 'scale')}
          />
          <NumberField
            label="Rotate"
            suffix="°"
            value={roundTo(edit.rotate ?? 0)}
            onChange={rotate => set({ rotate }, 'rotate')}
          />
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Offsets from where the scene puts it. Drag in the video, corners scale, the top dot rotates
          (⇧ snaps to 15°).
        </p>
      </Section>
      <Section
        title="Font"
        action={
          edit.font ? (
            <Hint label="Back to the scene's font">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5"
                onClick={() => change(e => setElementEdit(e, id, { font: undefined }))}
              >
                <XIcon className="size-3.5" />
              </Button>
            </Hint>
          ) : null
        }
      >
        <FontPicker
          value={edit.font}
          valueFormat="fontFamily"
          placeholder="Scene's font"
          onChange={font => change(e => setElementEdit(e, id, { font }, meta))}
        />
      </Section>
    </>
  );
}

function FieldRow({
  layerKey,
  layerProps,
  sceneProps,
  propsPath,
  field,
  shownText,
}: {
  layerKey: string;
  layerProps: unknown;
  /** props of every layer that uses the same scene, to learn a field's type when this one leaves it unset */
  sceneProps: unknown[];
  propsPath: string;
  field: string;
  shownText: string;
}) {
  const kit = useEditor(s => s.compiled?.kit);
  const patch = useEditor(s => s.edits.props[layerKey]);
  const change = useEditor(s => s.change);
  const path = fieldPath(propsPath, field);
  const original = kit?.getPath(layerProps, path);
  const edited = !!patch && path in patch;
  const value = edited ? patch[path] : original;
  const info = useMemo(() => {
    const own = inferField([layerProps], field);
    return own.kind === 'unknown' ? inferField(sceneProps, field) : own;
  }, [layerProps, sceneProps, field]);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!TEXT_FIELDS.has(field)) return;
    const focus = () => textRef.current?.focus();
    window.addEventListener('remotion-editor:edit-text', focus);
    return () => window.removeEventListener('remotion-editor:edit-text', focus);
  }, [field]);

  const commit = (next: unknown) =>
    change(e => setPropEdit(e, layerKey, path, next === original ? undefined : next), {
      coalesce: `${layerKey}:${path}`,
    });

  const kind = value !== undefined ? typeof value : info.kind;
  let control: React.ReactNode;
  if (typeof value === 'function' || (value !== null && typeof value === 'object')) {
    control = (
      <p className="rounded bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
        {typeof value === 'function' ? 'computed in code' : JSON.stringify(value).slice(0, 80)}
      </p>
    );
  } else if (kind === 'number') {
    const n = typeof value === 'number' ? value : 0;
    control = (
      <Input
        type="number"
        step={Math.abs(n) < 2 && n % 1 !== 0 ? 0.01 : 1}
        value={value === undefined ? '' : String(value)}
        placeholder="scene default"
        onChange={e => {
          const v = e.target.value;
          if (v === '') commit(undefined);
          else if (Number.isFinite(Number(v))) commit(Number(v));
        }}
        className="h-7 px-2 text-xs tabular-nums"
      />
    );
  } else if (kind === 'boolean') {
    control = (
      <Select value={String(value ?? false)} onValueChange={v => commit(v === 'true')}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Yes</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    );
  } else if (!TEXT_FIELDS.has(field) && info.options.length > 1 && !isColorField(field)) {
    const options = value && !info.options.includes(String(value)) ? [String(value), ...info.options] : info.options;
    control = (
      <Select value={value === undefined ? '' : String(value)} onValueChange={commit}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue placeholder="scene default" />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  } else if (isColorField(field) && (value === undefined || /^#[0-9a-f]{3,8}$/i.test(String(value)))) {
    control = (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={String(value ?? '#ffffff').slice(0, 7)}
          onChange={e => commit(e.target.value)}
          className="h-7 w-9 cursor-pointer rounded border bg-transparent"
        />
        <Input
          value={String(value ?? '')}
          placeholder="scene default"
          onChange={e => commit(e.target.value || undefined)}
          className="h-7 px-2 font-mono text-xs"
        />
      </div>
    );
  } else {
    // a field nothing sets yet: a number typed here is kept as a number
    const parse = (v: string) =>
      kind === 'unknown' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : v;
    control = (
      <Textarea
        ref={textRef}
        rows={TEXT_FIELDS.has(field) ? 2 : 1}
        value={value === undefined ? '' : String(value)}
        placeholder={TEXT_FIELDS.has(field) ? shownText : 'scene default'}
        onChange={e => commit(e.target.value === '' ? undefined : parse(e.target.value))}
        className="min-h-7 resize-y px-2 py-1 text-xs"
      />
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {field}
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
    </div>
  );
}

function FieldsSection({ info }: { info: SelectedInfo }) {
  const compiled = useEditor(s => s.compiled);
  const layerKeys = useEditor(s => s.layerKeys);
  const layer = compiled && info.layer ? compiled.project.layers[layerKeys.indexOf(info.layer)] : undefined;
  const sceneProps = useMemo(
    () =>
      compiled && layer
        ? compiled.project.layers.filter(l => l.scene === layer.scene).map(l => l.props ?? {})
        : [],
    [compiled, layer],
  );
  if (!layer || info.propsPath === null || !info.fields.length) return null;
  return (
    <Section title="Content">
      {info.fields.map(f => (
        <FieldRow
          key={f}
          layerKey={info.layer!}
          layerProps={layer.props ?? {}}
          sceneProps={sceneProps}
          propsPath={info.propsPath!}
          field={f}
          shownText={info.text || info.label}
        />
      ))}
      {info.propsPath === '' && (
        <p className="text-[11px] leading-snug text-muted-foreground">
          These belong to the whole layer ({info.layer}).
        </p>
      )}
    </Section>
  );
}

function ProjectSummary() {
  const manifest = useEditor(s => s.manifest);
  const slug = useEditor(s => s.slug);
  const edits = useEditor(s => s.edits);
  const change = useEditor(s => s.change);
  const n = countEdits(edits);
  return (
    <div>
      <Section title="Project">
        <p className="text-sm font-medium">{manifest?.title ?? slug}</p>
        {manifest?.artist && <p className="text-xs text-muted-foreground">{manifest.artist}</p>}
        <p className="text-xs text-muted-foreground">
          {n ? `${n} edit${n === 1 ? '' : 's'}` : 'No edits yet'}, saved to{' '}
          <code className="text-[11px]">projects/{slug}/video/edits.json</code>. Renders pick them up.
        </p>
        {n > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              if (window.confirm(`Remove all ${n} edits? You can undo this.`)) change(() => emptyEdits());
            }}
          >
            Reset all edits
          </Button>
        )}
      </Section>
      <Section title="How to edit">
        <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
          <li>Click something in the video to select it; drag to move it.</li>
          <li>Alt-click picks the next thing under the pointer.</li>
          <li>Whole layers are in the list on the left.</li>
          <li>Double-click text to change what it says.</li>
          <li>Arrows nudge 1 px (⇧ 10 px). Delete resets the selection.</li>
          <li>Scenes choose what can be picked with the kit&apos;s editable().</li>
        </ul>
      </Section>
    </div>
  );
}

export function Inspector() {
  const selectedId = useEditor(s => s.selectedId);
  const info = useEditor(s => s.selected);
  const onScreen = useEditor(s => s.selectedOnScreen);
  const stored = useEditor(s => (s.selectedId ? s.edits.elements[s.selectedId] : undefined));
  const change = useEditor(s => s.change);
  const select = useEditor(s => s.select);

  if (!selectedId) {
    return (
      <div className="h-full overflow-y-auto">
        <ProjectSummary />
      </div>
    );
  }

  const label = info?.label ?? stored?.label ?? selectedId;
  const stale = stored?.label && info?.label && stored.label !== info.label;
  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-1 border-b px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 break-words text-sm font-medium">{label}</p>
          <Hint label="Deselect" keys="Esc">
            <Button variant="ghost" size="sm" className="h-6 shrink-0 px-1.5" onClick={() => select(null)}>
              <XIcon className="size-3.5" />
            </Button>
          </Hint>
        </div>
        <p className="break-all font-mono text-[10px] text-muted-foreground">{selectedId}</p>
        {info?.layer && (
          <p className="text-[11px] text-muted-foreground">
            Layer <span className="text-foreground">{info.layer}</span>
          </p>
        )}
        {!onScreen && (
          <p className="text-[11px] text-amber-500">Not on screen at this frame.</p>
        )}
        {stale && (
          <p className="text-[11px] text-amber-500">
            When it was edited this showed “{stored?.label}”. The cues may have changed.
          </p>
        )}
      </div>
      <TransformSection id={selectedId} info={info} />
      {info && <FieldsSection info={info} />}
      <div className="px-3 py-3">
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-full text-xs"
          onClick={() =>
            change(e => {
              const next = resetElement(e, selectedId);
              return info?.layer && info.propsPath !== null
                ? resetPropFields(next, info.layer, info.propsPath, info.fields)
                : next;
            })
          }
        >
          Reset this element
        </Button>
      </div>
    </div>
  );
}
