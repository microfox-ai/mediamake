/**
 * ingest: file media into the library. Inbox files (what tools downloaded into _INBOX/<tool>/) are
 * moved; any other file (one the user dropped somewhere, a project's input) is cloned and stays
 * where it is. Each file is hashed first: bytes the library already holds are not filed twice (an
 * inbox repeat goes to _INBOX/_duplicates/), and a better copy of a known source takes its place.
 */
import fs from 'node:fs';
import path from 'node:path';
import { classify, destOf, mediaTypeOf, type Classification, type Hint, type Source } from './classify.ts';
import { channelOfFolder } from './config.ts';
import { getItem, reindex, tx } from './db.ts';
import { addLocation, addSource, addTags, relOf, upsertItem, type Lib } from './lib.ts';
import { probe, thumbnail } from './probe.ts';
import { pinterestSession, putEntry, sourceOf } from './sidecar.ts';
import { clone, freePath, move, now, sha256File } from './sys.ts';

export type Filed = { file: string; action: 'filed' | 'duplicate' | 'skipped' | 'known'; dest?: string; reason?: string; id?: string; c?: Classification };

/** Being written (a download in progress) or written a moment ago: its sidecar may not be there yet. */
const PARTIAL = /\.(crdownload|part|download|tmp)$|^\.|\.source\.json$|^_session\.json$/i;
const SETTLE_MS = 8_000;

/** Every file under a folder, depth first (the inbox, or a folder given on the command line). */
const filesUnder = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const abs = path.join(dir, e.name);
    if (e.name.startsWith('.') || e.name === '_duplicates') return [];
    return e.isDirectory() ? filesUnder(abs) : e.isFile() ? [abs] : [];
  });

/** What the folders around a file say about it: the inbox's tool and set, a channel folder in Downloads. */
const placeOf = (lib: Lib, abs: string) => {
  const rel = (dir: string) => path.relative(dir, path.dirname(abs)).split(path.sep).filter(Boolean);
  if (abs.startsWith(lib.cfg.inbox + path.sep)) {
    const [tool, set, ...more] = rel(lib.cfg.inbox);
    return { inbox: true, tool, set: set ? [set, ...more].join(' ') : undefined, context: [tool, set, ...more].filter(Boolean).join(' ') };
  }
  if (abs.startsWith(lib.cfg.deliverRoot + path.sep)) {
    const segs = rel(lib.cfg.deliverRoot);
    return { inbox: false, channel: segs[0] ? channelOfFolder(lib.cfg, segs[0]) : undefined, context: segs.join(' ') };
  }
  return { inbox: false, context: path.dirname(abs).split(path.sep).slice(-3).join(' ') };
};

export type IngestOptions = { hint?: Hint; dryRun?: boolean; now?: boolean };

export const ingestFile = async (lib: Lib, abs: string, opts: IngestOptions = {}, sessions = new Map<string, Map<string, Source>>()): Promise<Filed> => {
  const name = path.basename(abs);
  if (PARTIAL.test(name)) return { file: abs, action: 'skipped', reason: 'not a finished file' };
  const type = mediaTypeOf(name);
  if (!type) return { file: abs, action: 'skipped', reason: 'not media' };
  const st = fs.statSync(abs);
  if (!opts.now && Date.now() - st.mtimeMs < SETTLE_MS) return { file: abs, action: 'skipped', reason: 'still arriving' };

  const place = placeOf(lib, abs);
  const dir = path.dirname(abs);
  if (!sessions.has(dir)) sessions.set(dir, pinterestSession(dir));
  const source = sourceOf(abs) ?? sessions.get(dir)!.get(name) ?? null;
  const id = await sha256File(abs);
  const known = getItem(lib.db, id);

  if (known) {
    if (opts.dryRun) return { file: abs, action: 'duplicate', dest: known.path, id };
    tx(lib.db, () => {
      if (source) addSource(lib, id, source);
      if (!place.inbox) addLocation(lib, id, abs);
      reindex(lib.db, id);
    });
    if (place.inbox) {
      const dup = freePath(path.join(lib.cfg.inbox, '_duplicates', now().slice(0, 10), name));
      await move(abs, dup);
      fs.rmSync(`${abs}.source.json`, { force: true });
      return { file: abs, action: 'duplicate', dest: known.path, reason: `already in the library; moved to ${path.relative(lib.cfg.inbox, dup)}`, id };
    }
    return { file: abs, action: 'known', dest: known.path, id };
  }

  const p = type === 'video' || type === 'audio' || type === 'image' ? probe(abs, type === 'image') : null;
  const hint = { ...opts.hint, channel: opts.hint?.channel ?? place.channel };
  const c = classify({ file: abs, probe: p, source: source ?? (place.tool ? { tool: place.tool } : null), set: place.set, hint, context: place.context });
  if (!c.kind) return { file: abs, action: 'skipped', reason: c.reason, c };
  const dest = freePath(path.join(lib.root, destOf(c, place.set)));
  if (opts.dryRun) return { file: abs, action: 'filed', dest: relOf(lib, dest), id, c };

  if (place.inbox) await move(abs, dest);
  else clone(abs, dest);
  if (type !== 'font' && type !== '3d' && type !== 'archive') thumbnail(dest, type, p?.duration, path.join(lib.thumbs, `${id}.jpg`));

  const sources = source ? [source] : c.tool ? [{ tool: c.tool, ref: c.ref, prompt: c.prompt, title: c.title }] : [];
  // an unsorted item still says what it most likely is, so `find --kind` sees it
  const tags = c.guess ? [...c.tags, `kind:${c.guess}`] : c.tags;
  putEntry(path.dirname(dest), path.basename(dest), {
    sha256: id,
    kind: c.kind,
    subject: c.subject,
    title: c.title,
    tags,
    sources,
    original: name !== path.basename(dest) ? name : undefined,
    addedAt: now(),
    confidence: c.confidence,
  });
  tx(lib.db, () => {
    upsertItem(lib, {
      id,
      path: relOf(lib, dest),
      kind: c.kind!,
      subject: c.subject,
      title: c.title,
      ext: path.extname(dest).toLowerCase(),
      bytes: st.size,
      width: p?.width ?? null,
      height: p?.height ?? null,
      duration: p?.duration ?? null,
      fps: p?.fps ?? null,
      has_audio: p ? Number(p.hasAudio) : null,
      codec: p?.codec ?? null,
      role: 'library',
      confidence: c.confidence,
    });
    addLocation(lib, id, dest);
    if (!place.inbox) addLocation(lib, id, abs);
    for (const s of sources) addSource(lib, id, s);
    addTags(lib, id, tags);
    reindex(lib.db, id);
  });
  if (place.inbox) fs.rmSync(`${abs}.source.json`, { force: true });
  return { file: abs, action: 'filed', dest: relOf(lib, dest), id, c };
};

/** Empty folders left in the inbox once their files are filed (the tool folders stay). */
const tidyInbox = (lib: Lib) => {
  const walk = (dir: string, depth: number) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory() && e.name !== '_duplicates') walk(path.join(dir, e.name), depth + 1);
    const left = fs.readdirSync(dir).filter(f => f !== '.DS_Store' && f !== '_session.json');
    if (depth >= 2 && !left.length) fs.rmSync(dir, { recursive: true, force: true });
  };
  if (fs.existsSync(lib.cfg.inbox)) walk(lib.cfg.inbox, 0);
};

export const ingest = async (lib: Lib, targets: string[], opts: IngestOptions = {}) => {
  const files = targets.flatMap(t => (fs.statSync(t).isDirectory() ? filesUnder(t) : [t]));
  const sessions = new Map<string, Map<string, Source>>();
  const done: Filed[] = [];
  for (const f of files) {
    try {
      done.push(await ingestFile(lib, f, opts, sessions));
    } catch (err) {
      done.push({ file: f, action: 'skipped', reason: err instanceof Error ? err.message : String(err) });
    }
  }
  if (!opts.dryRun && targets.includes(lib.cfg.inbox)) tidyInbox(lib);
  return done;
};
