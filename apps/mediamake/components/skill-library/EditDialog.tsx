'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Production, Skill, SkillManifest, VariantKind } from '@/lib/skill-library/types';
import { VARIANT_KINDS } from '@/lib/skill-library/types';
import { KIND_LABEL } from './Cards';
import { Thumb } from './Thumb';
import { useSkillLibraryStore } from './store';

const tagsOf = (s: string) => s.split(',').map(t => t.trim()).filter(Boolean);

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between text-xs font-medium">
        {label}
        {hint && <span className="font-normal text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const selectClass = 'h-9 w-full rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Toggle chips with thumbnails, for picking productions or skills. */
function Picker<T extends { id: string; title: string; image: Skill['thumbnail']; seed: string }>({ items, chosen, onToggle }: { items: T[]; chosen: string[]; onToggle: (id: string) => void }) {
  const [q, setQ] = useState('');
  const shown = items.filter(i => !q || `${i.id} ${i.title}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-2">
      {items.length > 8 && <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter…" className="h-8 text-xs" />}
      <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
        {shown.map(i => {
          const on = chosen.includes(i.id);
          return (
            <button
              key={i.id}
              type="button"
              onClick={() => onToggle(i.id)}
              className={cn('flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs transition', on ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted')}
            >
              <Thumb image={i.image} seed={i.seed} title={i.title} compact className="size-5 rounded-full" />
              {i.title}
            </button>
          );
        })}
        {!items.length && <span className="text-xs text-muted-foreground">Nothing to pick yet.</span>}
      </div>
    </div>
  );
}

function SkillForm({ skill, onDone }: { skill: Skill; onDone: () => void }) {
  const productions = useSkillLibraryStore(s => s.library.productions);
  const skills = useSkillLibraryStore(s => s.library.skills);
  const save = useSkillLibraryStore(s => s.saveSkill);
  const m = skill.manifest ?? {};
  const [title, setTitle] = useState(m.title ?? '');
  const [summary, setSummary] = useState(m.summary ?? '');
  const [tags, setTags] = useState((m.tags ?? []).join(', '));
  const [owner, setOwner] = useState(m.owner ?? '');
  const [linked, setLinked] = useState<string[]>(m.productions ?? skill.productions);
  const [isVariant, setIsVariant] = useState(!!skill.variant);
  const [of, setOf] = useState(skill.variant?.of ?? '');
  const [kind, setKind] = useState<VariantKind>(skill.variant?.kind ?? 'style');
  const [ref, setRef] = useState(skill.variant?.ref ?? '');
  const [label, setLabel] = useState(m.variant?.label ?? '');
  const [origin, setOrigin] = useState(skill.variant?.production ?? '');
  const [busy, setBusy] = useState(false);

  const productionItems = useMemo(() => Object.values(productions).map(p => ({ id: p.slug, title: p.title, image: p.thumbnail, seed: p.slug })), [productions]);
  const bases = Object.values(skills).filter(s => s.name !== skill.name);

  const submit = async () => {
    setBusy(true);
    const patch: Partial<SkillManifest> = {
      title: title.trim() || undefined,
      summary: summary.trim() || undefined,
      tags: tagsOf(tags),
      owner: owner.trim() || undefined,
      productions: linked,
      variant: isVariant && of ? { ...(m.variant ?? {}), of, kind, ref: ref.trim() || undefined, label: label.trim() || undefined, production: origin || undefined } : undefined,
    };
    if (!isVariant) patch.variant = undefined;
    const ok = await save(skill.name, patch);
    setBusy(false);
    if (ok) onDone();
  };

  return (
    <>
      <div className="grid max-h-[65vh] gap-4 overflow-y-auto px-1 py-1">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title" hint={`default: ${skill.variant ? skill.variant.label : skill.title}`}>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </Field>
          <Field label="Owner" hint="whose it is">
            <Input value={owner} onChange={e => setOwner(e.target.value)} placeholder="you, a client, a channel" />
          </Field>
        </div>
        <Field label="One line for the card" hint="default: the description's first sentence">
          <Textarea value={summary} onChange={e => setSummary(e.target.value)} rows={2} className="text-sm" />
        </Field>
        <Field label="Tags" hint="comma separated">
          <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="music, anime, shorts" />
        </Field>
        <Field label="Used in productions">
          <Picker items={productionItems} chosen={linked} onToggle={id => setLinked(l => (l.includes(id) ? l.filter(x => x !== id) : [...l, id]))} />
        </Field>

        <div className="space-y-3 rounded-xl border p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={isVariant} onChange={e => setIsVariant(e.target.checked)} className="size-4 accent-foreground" />
            This is a variant of another skill
          </label>
          {isVariant && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Base skill">
                  <select value={of} onChange={e => setOf(e.target.value)} className={selectClass}>
                    <option value="">Pick one…</option>
                    {skill.variant && !skills[skill.variant.of] && <option value={skill.variant.of}>{skill.variant.of}</option>}
                    {bases.map(b => (
                      <option key={b.name} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Kind">
                  <select value={kind} onChange={e => setKind(e.target.value as VariantKind)} className={selectClass}>
                    {VARIANT_KINDS.map(k => (
                      <option key={k} value={k}>
                        {KIND_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={kind === 'version' ? 'Version' : kind === 'production' ? 'Production ref' : 'Style'}>
                  <Input value={ref} onChange={e => setRef(e.target.value)} placeholder={kind === 'version' ? 'v2' : 'f1xhitit'} />
                </Field>
                <Field label="Label on the card">
                  <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="F1 × Hit It" />
                </Field>
              </div>
              {kind === 'production' && (
                <Field label="Made from production">
                  <select value={origin} onChange={e => setOrigin(e.target.value)} className={selectClass}>
                    <option value="">None of these</option>
                    {Object.values(productions).map(p => (
                      <option key={p.slug} value={p.slug}>
                        {p.title} ({p.slug})
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={() => void submit()} disabled={busy}>
          Save skill.json
        </Button>
      </DialogFooter>
    </>
  );
}

function ProductionForm({ production, onDone }: { production: Production; onDone: () => void }) {
  const skills = useSkillLibraryStore(s => s.library.skills);
  const save = useSkillLibraryStore(s => s.saveProduction);
  const m = production.manifest ?? {};
  const [title, setTitle] = useState(m.title ?? production.title);
  const [artist, setArtist] = useState(m.artist ?? production.artist ?? '');
  const [summary, setSummary] = useState(m.summary ?? '');
  const [project, setProject] = useState(m.project ?? '');
  const [owner, setOwner] = useState(m.owner ?? '');
  const [tags, setTags] = useState((m.tags ?? []).join(', '));
  const [used, setUsed] = useState<string[]>(m.skills ?? production.skills);
  const [busy, setBusy] = useState(false);
  const items = useMemo(() => Object.values(skills).map(s => ({ id: s.name, title: s.variant ? `${s.variant.label} (${s.variant.of})` : s.title, image: s.thumbnail, seed: s.family })), [skills]);

  const submit = async () => {
    setBusy(true);
    const ok = await save(production.slug, {
      slug: production.slug,
      title: title.trim() || undefined,
      artist: artist.trim() || undefined,
      project: project.trim() || undefined,
      summary: summary.trim() || undefined,
      owner: owner.trim() || undefined,
      tags: tagsOf(tags),
      skills: used,
    });
    setBusy(false);
    if (ok) onDone();
  };

  return (
    <>
      <div className="grid max-h-[65vh] gap-4 overflow-y-auto px-1 py-1">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title">
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </Field>
          <Field label="Artist">
            <Input value={artist} onChange={e => setArtist(e.target.value)} />
          </Field>
        </div>
        <Field label="Project" hint="the mediamake project (channel or brand) it belongs to">
          <Input value={project} onChange={e => setProject(e.target.value)} placeholder="subhodayam" />
        </Field>
        <Field label="Summary">
          <Textarea value={summary} onChange={e => setSummary(e.target.value)} rows={2} className="text-sm" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Owner">
            <Input value={owner} onChange={e => setOwner(e.target.value)} />
          </Field>
          <Field label="Tags" hint="comma separated">
            <Input value={tags} onChange={e => setTags(e.target.value)} />
          </Field>
        </div>
        <Field label="Skills used here">
          <Picker items={items} chosen={used} onToggle={id => setUsed(l => (l.includes(id) ? l.filter(x => x !== id) : [...l, id]))} />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={() => void submit()} disabled={busy}>
          Save mediamake.json
        </Button>
      </DialogFooter>
    </>
  );
}

export function EditDialog() {
  const editing = useSkillLibraryStore(s => s.editing);
  const setEditing = useSkillLibraryStore(s => s.setEditing);
  const library = useSkillLibraryStore(s => s.library);
  const skill = editing?.kind === 'skill' ? library.skills[editing.id] : null;
  const production = editing?.kind === 'production' ? library.productions[editing.id] : null;
  const close = () => setEditing(null);
  return (
    <Dialog open={!!(skill || production)} onOpenChange={open => !open && close()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{skill ? `Edit ${skill.name}` : production ? `Edit ${production.title}` : ''}</DialogTitle>
          <DialogDescription>
            {skill
              ? 'Saved to skill.json next to SKILL.md. SKILL.md itself is not changed.'
              : 'Saved to mediamake.json in the production folder. Nothing else in the production is changed.'}
          </DialogDescription>
        </DialogHeader>
        {skill && <SkillForm key={skill.name} skill={skill} onDone={close} />}
        {production && <ProductionForm key={production.slug} production={production} onDone={close} />}
      </DialogContent>
    </Dialog>
  );
}
