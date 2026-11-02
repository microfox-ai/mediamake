/**
 * deliver: copy what the user approved into the channel's folder in Downloads, in one layout:
 *
 *   <deliverRoot>/<channel folder>/<slug>/
 *     <Title>.mp4   shorts/<Title> - s01 (9x16).mp4   youtube/   poster/   master/   release/
 *     previous/v<N>/   an earlier delivery a newer one replaced (never deleted)
 *     delivery.json    what came from where, its hash, when, final or uploaded
 *
 * Only on the user's approval: test renders and review rounds stay in out/ and the Revisions
 * screens. Copies are APFS clones (no extra space), each checked by hash. release/ must hold exactly
 * one audio file: Browse Hack's DistroKid filler makes one track per audio name.
 */
import fs from 'node:fs';
import path from 'node:path';
import { mediaTypeOf } from './classify.ts';
import { n } from './db.ts';
import type { Lib } from './lib.ts';
import { readProduction, saveProduction } from './production.ts';
import { clone, move, now, readJson, sha256File, writeJson } from './sys.ts';

export const WHATS = ['video', 'shorts', 'youtube', 'poster', 'master', 'release'] as const;
export type What = (typeof WHATS)[number];
type Piece = { what: What; from: string; to: string };
type DeliveryItem = { what: What; path: string; from: string; sha256: string; at: string; status: 'final' | 'uploaded' };
type Delivery = { schema: string; production: string; channel?: string; title?: string; items: DeliveryItem[] };

const filesIn = (dir: string, base = dir): string[] =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
        const abs = path.join(dir, e.name);
        if (e.name.startsWith('.') || e.name.endsWith('.revisions')) return [];
        return e.isDirectory() ? filesIn(abs, base) : [abs];
      })
    : [];

const safe = (s: string) => s.replace(/[/:\\]+/g, ' - ').replace(/\s+/g, ' ').trim();

const piecesFor = (lib: Lib, slug: string, title: string, what: What, from?: string): Piece[] => {
  const fromAll = (dir: string, under: string) => filesIn(dir).map(f => ({ what, from: f, to: path.join(under, path.relative(dir, f)) }));
  switch (what) {
    case 'video': {
      const f = from ?? path.join(lib.out, slug, `${slug}.mp4`);
      return fs.existsSync(f) ? [{ what, from: f, to: `${safe(title)}${path.extname(f)}` }] : [];
    }
    case 'shorts': {
      const dir = from ?? path.join(lib.out, slug, 'shorts');
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir).flatMap(id => {
        const sub = path.join(dir, id);
        if (!fs.statSync(sub).isDirectory()) return [];
        return fs
          .readdirSync(sub)
          .map(f => f.match(new RegExp(`^${slug}-${id}-(.+)\\.mp4$`)))
          .filter((m): m is RegExpMatchArray => !!m)
          .map(m => ({ what, from: path.join(sub, m[0]), to: path.join('shorts', `${safe(title)} - ${id} (${m[1]}).mp4`) }));
      });
    }
    case 'youtube':
      return fromAll(from ?? path.join(lib.out, 'youtube', slug), 'youtube');
    case 'poster': {
      const dir = from ?? [path.join(lib.out, 'posters', `${slug}-cover`, 'final'), path.join(lib.out, 'posters', slug, 'final')].find(d => fs.existsSync(d));
      return dir ? fromAll(dir, 'poster') : [];
    }
    case 'master':
      if (!from) throw new Error('--what=master needs --from=<the final master file>');
      return [{ what, from, to: path.join('master', path.basename(from)) }];
    case 'release': {
      if (!from) throw new Error('--what=release needs --from=<the release folder>');
      const pieces = fromAll(from, 'release');
      const audio = pieces.filter(p => mediaTypeOf(p.from) === 'audio');
      if (audio.length !== 1) throw new Error(`A release folder needs exactly one audio file (DistroKid makes a track of each); ${from} has ${audio.length}`);
      return pieces;
    }
  }
};

export type DeliverOptions = { from?: string; channel?: string; yes?: boolean };
export type Step = Piece & { target: string; action: 'new' | 'same' | 'replace' };

export const deliver = async (lib: Lib, slug: string, whats: What[], o: DeliverOptions = {}) => {
  let prod = readProduction(lib, slug);
  if (o.channel && o.channel !== prod.channel) prod = { ...prod, ...saveProduction(lib, slug, { channel: o.channel }) };
  if (!prod.deliverFolder && !prod.channel) throw new Error(`${slug} has no channel yet: media production new ${slug} --channel=<${Object.keys(lib.cfg.channels).join('|')}>`);
  const folder = prod.deliverFolder ?? path.join(lib.cfg.channels[prod.channel!] ?? prod.channel!, slug);
  const root = path.join(lib.cfg.deliverRoot, folder);
  const title = prod.title ?? slug;

  const steps: Step[] = [];
  for (const what of whats) {
    const pieces = piecesFor(lib, slug, title, what, whats.length === 1 ? o.from : undefined);
    if (!pieces.length) throw new Error(`Nothing to deliver for ${what} (looked for ${slug}'s ${what} in ${path.relative(lib.cfg.deliverRoot, lib.out) || lib.out})`);
    for (const p of pieces) {
      const target = path.join(root, p.to);
      const action = !fs.existsSync(target) ? 'new' : (await sha256File(target)) === (await sha256File(p.from)) ? 'same' : 'replace';
      steps.push({ ...p, target, action });
    }
  }
  if (!o.yes) return { root, steps, done: false };

  const prevDir = path.join(root, 'previous');
  const version = 1 + Math.max(0, ...(fs.existsSync(prevDir) ? fs.readdirSync(prevDir).map(d => Number(d.match(/^v(\d+)$/)?.[1] ?? 0)) : [0]));
  const file = path.join(root, 'delivery.json');
  const record = readJson<Delivery>(file) ?? { schema: 'mediamake.delivery/v1', production: slug, items: [] };
  for (const s of steps) {
    if (s.action === 'same') continue;
    if (s.action === 'replace') await move(s.target, path.join(prevDir, `v${version}`, s.to));
    clone(s.from, s.target);
    const sha = await sha256File(s.target);
    if (sha !== (await sha256File(s.from))) throw new Error(`The copy of ${s.from} didn't check out`);
    record.items = [...record.items.filter(i => i.path !== s.to), { what: s.what, path: s.to, from: s.from, sha256: sha, at: now(), status: 'final' }];
    lib.db
      .prepare('INSERT OR IGNORE INTO deliveries (production, what, path, sha256, from_path, at, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(slug, s.what, path.join(folder, s.to), sha, n(s.from), now(), 'final');
  }
  writeJson(file, { ...record, channel: prod.channel, title });
  if ((prod.status ?? 'active') === 'active') saveProduction(lib, slug, { status: 'delivered' });
  return { root, steps, done: true };
};

/** The user published it: its delivery says so, and cleanup-out may then move its finals off the Mac. */
export const markUploaded = (lib: Lib, slug: string) => {
  const prod = readProduction(lib, slug);
  const folder = prod.deliverFolder ?? (prod.channel ? path.join(lib.cfg.channels[prod.channel] ?? prod.channel, slug) : undefined);
  const file = folder && path.join(lib.cfg.deliverRoot, folder, 'delivery.json');
  const record = file ? readJson<Delivery>(file) : null;
  if (file && record) writeJson(file, { ...record, items: record.items.map(i => ({ ...i, status: 'uploaded' })) });
  lib.db.prepare("UPDATE deliveries SET status = 'uploaded' WHERE production = ?").run(slug);
  return saveProduction(lib, slug, { status: 'uploaded' });
};
