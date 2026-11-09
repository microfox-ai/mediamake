/**
 * sync: a channel's team works from the same brand kit, skill variants, productions and media,
 * through the channel's MediaMake cloud project (`media channel link`). For one channel:
 *
 *   brand        brands/<channel>/ ↔ the project's brand kit (assets by path and SHA-256, and its fields)
 *   skills       the skill variants its productions use, and uncommitted ones made for them (text files
 *                only, with skills.mjs's checks) ↔ your own skills, <workspace>/skills/<name>/ (linked
 *                from ~/.claude/skills), or the repo's .claude/skills/<name> for committed ones
 *   productions  projects/<slug>/mediamake.json with its deliveries ↔ the same file, no media
 *   media        its footage, images, art, overlays and references: details always, files only once the
 *                user shared them (share.ts) and under the channel's limit. A teammate's items are
 *                remote items here (`find` lists them); `pull --ids=` fetches their files through
 *                _INBOX/mediamake-sync/<channel>/ and files them
 *   music        keeper Suno takes on MediaMake (GET /api/generations) → _INBOX/suno/<channel>/, filed
 *
 * Everything is a dry run until --yes. Nothing on this Mac is deleted or overwritten: a pull that
 * would change a file writes <file>.theirs beside it (then .theirs.2…) and lists it. A push waits
 * while that .theirs is there, or when a teammate changed the thing since this Mac last saw it (the
 * `synced` table keeps what it saw). Items are content-addressed: what is here already is skipped.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cleanPath, mimeOf, normalizeColors, normalizeFonts, planKitUpload, textRoleOf, type BrandKit } from '../../../mediamake/lib/brand-kit/index.ts';
import {
  MAX_ITEMS_PER_PUSH,
  MAX_SKILL_BYTES,
  SHA256,
  SHARED_KINDS,
  changesDetails,
  cleanDetails,
  stableStringify,
  type ChannelSyncStatus,
  type MediaDetails,
  type PushResult,
  type SyncItem,
} from '../../../mediamake/lib/channel-sync/index.ts';
import { TEXT_FILE, checks, skillAt } from '../../../../tools/skills.mjs';
import type { Source } from './classify.ts';
import { CloudError, type Cloud } from './cloud.ts';
import { KINDS, getItem, n, reindex, tagsOf, tx, type Item } from './db.ts';
import { ingest } from './ingest.ts';
import { absOf, addSource, addTags, knownHash, sourcesOf, type Lib } from './lib.ts';
import { indexProduction, listProductions } from './production.ts';
import { channelClause, isProjectId, projectOf, sharesOf } from './share.ts';
import { lock, now, readJson, sha256File, sha256Text, size, writeJson } from './sys.ts';

export const PARTS = ['brand', 'skills', 'productions', 'media', 'music'] as const;
export type Part = (typeof PARTS)[number];
export type Direction = 'push' | 'pull';
export type Action = 'push' | 'pull' | 'same' | 'conflict' | 'skip' | 'pending' | 'done' | 'failed';

/** One thing a sync would do (a dry run) or did. `bulk` ones are counted, not listed. */
export type Step = { part: Part; dir: Direction; action: Action; key: string; detail?: string; bytes?: number; bulk?: boolean };
type Plan = { steps: Step[]; notes: string[]; apply?: () => Promise<void> };
type Ctx = { lib: Lib; cloud: Cloud; channel: string; projectId: string; status: ChannelSyncStatus; yes: boolean };

const hashOf = (data: unknown) => sha256Text(stableStringify(data));
const message = (err: unknown) => (err instanceof Error ? err.message : String(err));
const step = (part: Part, dir: Direction, action: Action, key: string, extra: Partial<Step> = {}): Step => ({ part, dir, action, key, ...extra });

/** What this Mac last saw of something on the cloud (its hash), for telling its own changes from a teammate's. */
const baseOf = (ctx: Ctx, what: string, key: string) =>
  (ctx.lib.db.prepare('SELECT hash FROM synced WHERE channel = ? AND what = ? AND key = ?').get(ctx.channel, what, key) as { hash: string } | undefined)?.hash;
const markSynced = (ctx: Ctx, what: string, key: string, hash: string) =>
  ctx.lib.db
    .prepare('INSERT INTO synced (channel, what, key, hash, at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(channel, what, key) DO UPDATE SET hash = excluded.hash, at = excluded.at')
    .run(ctx.channel, what, key, hash, now());

// ---------- landing their version without overwriting anything ----------

/** <file>.theirs, .theirs.2…: their versions waiting beside a file for the user to merge. */
export const theirsCopies = (abs: string) => {
  const out: string[] = [];
  for (let i = 1; ; i++) {
    const p = i === 1 ? `${abs}.theirs` : `${abs}.theirs.${i}`;
    if (!fs.existsSync(p)) return out;
    out.push(p);
  }
};
/** Where their version goes: the file itself when this Mac has none, else the next free .theirs. */
const landing = (abs: string) => (fs.existsSync(abs) ? (theirsCopies(abs).length ? `${abs}.theirs.${theirsCopies(abs).length + 1}` : `${abs}.theirs`) : abs);
const THEIRS = /\.theirs(\.\d+)?$/;

/** A file's SHA-256, from the catalog when it has seen this very file (scan indexes brands/). */
const hashFile = async (lib: Lib, abs: string) => knownHash(lib, abs, fs.statSync(abs)) ?? (await sha256File(abs));

const mapLimit = async <T>(items: T[], limit: number, fn: (item: T) => Promise<void>) => {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await fn(items[next++]);
  }));
};

const chunks = <T>(items: T[], max: number, weight: (item: T) => number = () => 1) => {
  const out: T[][] = [];
  let cur: T[] = [];
  let w = 0;
  for (const it of items) {
    if (cur.length && (cur.length >= MAX_ITEMS_PER_PUSH || w + weight(it) > max)) {
      out.push(cur);
      cur = [];
      w = 0;
    }
    cur.push(it);
    w += weight(it);
  }
  if (cur.length) out.push(cur);
  return out;
};

const viewerOnly = (ctx: Ctx, part: Part): Plan | null =>
  ctx.status.project.role === 'viewer' ? { steps: [step(part, 'push', 'skip', part, { detail: `you're a viewer on ${ctx.status.project.name}: viewers pull` })], notes: [] } : null;

// ---------- brand kit ----------

type KitFile = { path: string; abs: string; size: number };
/** A kit folder's files as pack-brand-kit exports it: hidden files, graphics/ (the source) and dependencies left out. */
const kitFiles = (dir: string, base = dir, out: KitFile[] = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'graphics' || THEIRS.test(e.name)) continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) kitFiles(abs, base, out);
    else if (e.isFile()) out.push({ path: path.relative(base, abs).split(path.sep).join('/'), abs, size: fs.statSync(abs).size });
  }
  return out;
};

/** The kit's fields and the file each is kept in (where the kit has one, else where pack-brand-kit puts it). */
const FIELD_FILES = { guide: 'brandguide.md', channelDescription: 'youtube/channel-description.md', thumbnailProfile: 'brand/thumbnail.json', colors: 'colors.json', manifest: 'brand.json' } as const;
type FieldRole = keyof typeof FIELD_FILES;

/** A field's text as it would be written to its file. */
const fieldText = (role: FieldRole, kit: BrandKit) => {
  if (role === 'guide') return kit.guide;
  if (role === 'channelDescription') return kit.channelDescription;
  if (role === 'thumbnailProfile') return kit.thumbnailProfile ? `${JSON.stringify(kit.thumbnailProfile, null, 2)}\n` : undefined;
  if (role === 'colors') return kit.colors.length ? `${JSON.stringify(kit.colors, null, 2)}\n` : undefined;
  return kit.name || kit.fonts.length || kit.logo
    ? `${JSON.stringify({ ...(kit.name ? { name: kit.name } : {}), ...(kit.fonts.length ? { fonts: kit.fonts } : {}), ...(kit.logo ? { logo: kit.logo } : {}) }, null, 2)}\n`
    : undefined;
};

/** Whether a local field file says what the kit says (read the way the upload reads it). */
const sameField = (role: FieldRole, text: string, kit: BrandKit) => {
  try {
    if (role === 'guide') return text === kit.guide;
    if (role === 'channelDescription') return text === kit.channelDescription;
    const parsed = JSON.parse(text);
    if (role === 'thumbnailProfile') return stableStringify(parsed) === stableStringify(kit.thumbnailProfile);
    if (role === 'colors') return stableStringify(normalizeColors(parsed)) === stableStringify(kit.colors);
    return (
      (parsed.name ?? undefined) === kit.name &&
      (!Array.isArray(parsed.fonts) || stableStringify(normalizeFonts(parsed.fonts)) === stableStringify(kit.fonts)) &&
      (typeof parsed.logo !== 'string' || cleanPath(parsed.logo) === kit.logo)
    );
  } catch {
    return false;
  }
};

const readKit = async (ctx: Ctx) => ((await ctx.cloud.get<{ brandKit: BrandKit | null }>('/api/project/brand-kit', { projectId: ctx.projectId })).brandKit ?? null);

const brandPush = async (ctx: Ctx): Promise<Plan> => {
  const viewer = viewerOnly(ctx, 'brand');
  if (viewer) return viewer;
  const dir = path.join(ctx.lib.brands, ctx.channel);
  const files = kitFiles(dir);
  if (!files.length) return { steps: [], notes: [`brand: no kit in ${path.relative(process.cwd(), dir) || dir} (pack-brand-kit makes one)`] };
  const plan = await planKitUpload(files.map(f => ({ path: f.path, size: f.size, readText: () => fs.promises.readFile(f.abs, 'utf8') })));
  const kit = await readKit(ctx);
  const byPath = new Map((kit?.assets ?? []).map(a => [a.path, a]));
  const abs = new Map(files.map(f => [f.path, f]));
  const steps: Step[] = [];
  const uploads: (KitFile & { sha256: string; step: Step })[] = [];
  for (const f of plan.upload) {
    const file = abs.get(f.path)!;
    const sha256 = await hashFile(ctx.lib, file.abs);
    if (byPath.get(f.path)?.sha256 === sha256) steps.push(step('brand', 'push', 'same', f.path, { bulk: true }));
    else if (theirsCopies(file.abs).length) steps.push(step('brand', 'push', 'conflict', f.path, { detail: `merge ${f.path}.theirs first, then delete it` }));
    else {
      const s = step('brand', 'push', 'push', f.path, { bytes: f.size });
      steps.push(s);
      uploads.push({ ...file, sha256, step: s });
    }
  }
  // the kit's fields (guide, colours, fonts…) go up when they say something else than the cloud's
  const patch: Record<string, unknown> = {};
  const eq = (a: unknown, b: unknown) => stableStringify(a) === stableStringify(b);
  for (const [k, v] of Object.entries(plan.patch)) {
    const same = !kit ? false : k === 'colors' ? eq(normalizeColors(v), kit.colors) : k === 'fonts' ? eq(normalizeFonts(v), kit.fonts) : eq(v, (kit as unknown as Record<string, unknown>)[k]);
    if (!same) patch[k] = v;
  }
  const fieldStep = Object.keys(patch).length ? step('brand', 'push', 'push', 'fields', { detail: Object.keys(patch).join(', ') }) : null;
  if (fieldStep) steps.push(fieldStep);
  return {
    steps,
    notes: plan.skipped.length ? [`brand: ${plan.skipped.length} files aren't kit assets and stay here (${plan.skipped.slice(0, 3).map(s => s.path).join(', ')}${plan.skipped.length > 3 ? ', …' : ''})`] : [],
    apply: async () => {
      if (!uploads.length && !fieldStep) return;
      const targets = new Map<string, { path: string; kind: string; contentType: string; uploadUrl: string; url: string }>();
      for (const batch of chunks(uploads, 100)) {
        const { uploads: signed } = await ctx.cloud.post<{ uploads: { path: string; kind: string; contentType: string; uploadUrl: string; url: string }[] }>('/api/project/brand-kit/upload', {
          projectId: ctx.projectId,
          files: batch.map(f => ({ path: f.path, contentType: mimeOf(f.path) })),
        });
        for (const t of signed) targets.set(t.path, t);
      }
      const assets: Record<string, unknown>[] = [];
      await mapLimit(uploads, 4, async f => {
        const t = targets.get(f.path);
        if (!t) return void Object.assign(f.step, { action: 'failed', detail: 'the server gave no upload URL' });
        try {
          await ctx.cloud.upload(t.uploadUrl, f.abs, t.contentType);
          assets.push({ path: f.path, kind: t.kind, url: t.url, mimeType: t.contentType, size: f.size, sha256: f.sha256 });
          f.step.action = 'done';
        } catch (err) {
          Object.assign(f.step, { action: 'failed', detail: message(err) });
        }
      });
      // a main logo whose file didn't arrive would get the whole save refused
      if (uploads.some(f => f.path === patch.logo && f.step.action === 'failed')) delete patch.logo;
      await ctx.cloud.put('/api/project/brand-kit', { projectId: ctx.projectId, ...patch, assets });
      if (fieldStep) fieldStep.action = 'done';
    },
  };
};

const brandPull = async (ctx: Ctx): Promise<Plan> => {
  const kit = await readKit(ctx);
  if (!kit) return { steps: [], notes: ['brand: the project has no brand kit yet'] };
  const dir = path.join(ctx.lib.brands, ctx.channel);
  const steps: Step[] = [];
  const todo: { step: Step; run: () => Promise<void> }[] = [];
  for (const a of kit.assets) {
    const rel = a.path.split('/').filter(p => p && p !== '..' && !p.startsWith('.'));
    if (!rel.length) continue;
    const abs = path.join(dir, ...rel);
    let same = false;
    if (fs.existsSync(abs)) {
      if (a.sha256) same = (await hashFile(ctx.lib, abs)) === a.sha256 || (await Promise.all(theirsCopies(abs).map(sha256File))).includes(a.sha256);
      // a kit uploaded before hashes were kept: told apart by size
      else same = fs.statSync(abs).size === a.size;
    }
    if (same) {
      steps.push(step('brand', 'pull', 'same', a.path, { bulk: true }));
      continue;
    }
    const conflict = fs.existsSync(abs);
    const s = step('brand', 'pull', conflict ? 'conflict' : 'pull', a.path, { bytes: a.size, detail: conflict ? `theirs → ${path.basename(landing(abs))}` : undefined });
    steps.push(s);
    todo.push({
      step: s,
      run: async () => {
        const dest = landing(abs);
        await ctx.cloud.download(a.url, dest);
        if (a.sha256 && (await sha256File(dest)) !== a.sha256) {
          fs.rmSync(dest, { force: true });
          throw new Error("the download didn't match its SHA-256");
        }
        s.detail = path.relative(ctx.lib.brands, dest);
      },
    });
  }
  // the fields, into the files they came from
  const local = kitFiles(dir);
  for (const role of Object.keys(FIELD_FILES) as FieldRole[]) {
    const text = fieldText(role, kit);
    if (!text) continue;
    const found = local.find(f => textRoleOf(f.path) === role);
    const abs = found?.abs ?? path.join(dir, ...FIELD_FILES[role].split('/'));
    const mine = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
    if (mine !== null && (sameField(role, mine, kit) || theirsCopies(abs).some(p => fs.readFileSync(p, 'utf8') === text))) {
      steps.push(step('brand', 'pull', 'same', path.relative(dir, abs), { bulk: true }));
      continue;
    }
    const s = step('brand', 'pull', mine === null ? 'pull' : 'conflict', path.relative(dir, abs), { detail: mine === null ? role : `theirs → ${path.basename(landing(abs))}` });
    steps.push(s);
    todo.push({
      step: s,
      run: async () => {
        const dest = landing(abs);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, text);
        s.detail = path.relative(ctx.lib.brands, dest);
      },
    });
  }
  return { steps, notes: [], apply: () => runAll(todo) };
};

/** Run each step's job; a failure marks that step and the rest go on. */
const runAll = async (todo: { step: Step; run: () => Promise<void> }[]) => {
  await mapLimit(todo, 4, async t => {
    try {
      await t.run();
      if (t.step.action !== 'conflict') t.step.action = 'done';
    } catch (err) {
      Object.assign(t.step, { action: 'failed', detail: message(err) });
    }
  });
};

// ---------- skill variants ----------

type LocalSkill = ReturnType<typeof skillAt> & { committed: boolean };

/**
 * The skills here, read as skills.mjs reads them: the repo's .claude/skills (a link into .agents/skills
 * is committed, a real folder isn't yet), then your own in the workspace (never committed).
 */
const localSkills = (lib: Lib): LocalSkill[] => {
  const seen = new Set<string>();
  return [lib.repoSkills, lib.skills].flatMap(root =>
    (fs.existsSync(root) ? fs.readdirSync(root) : []).flatMap(name => {
      if (seen.has(name)) return [];
      const at = path.join(root, name);
      try {
        const committed = root === lib.repoSkills && fs.lstatSync(at).isSymbolicLink();
        const dir = fs.realpathSync(at);
        if (!fs.existsSync(path.join(dir, 'SKILL.md'))) return [];
        seen.add(name);
        return [{ ...skillAt(name, dir), committed }];
      } catch {
        return [];
      }
    }),
  );
};

/** A skill's text files (never binaries, never .env), as the team shares them. */
const skillFiles = (dir: string, base = dir): { path: string; text: string }[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (e.name.startsWith('.') || e.name === 'node_modules') return [];
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) return skillFiles(abs, base);
    if (!e.isFile() || !TEXT_FILE.test(e.name) || e.name.endsWith('.env')) return [];
    return [{ path: path.relative(base, abs).split(path.sep).join('/'), text: fs.readFileSync(abs, 'utf8') }];
  });

const SKILL_NAME = /^[a-z0-9][a-z0-9-]{0,119}$/;

/** skills.mjs's checks over files that aren't in a skill folder yet (what a pull would install). */
const checkFiles = (name: string, files: { path: string; text: string }[]) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'media-skill-'));
  try {
    for (const f of files) {
      const abs = path.join(tmp, ...f.path.split('/'));
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, f.text);
    }
    if (!files.some(f => f.path === 'SKILL.md')) return ['no SKILL.md'];
    return checks(skillAt(name, tmp)).problems.map(p => p.replace(/^.*?media-skill-[^/]+\//, ''));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
};

/** The variants a channel shares: those its productions use, and uncommitted ones modelled on one of them. */
const channelSkills = (lib: Lib, channel: string) => {
  const prods = listProductions(lib);
  const mine = prods.filter(p => p.channel === channel);
  const used = new Set(mine.flatMap(p => p.skills ?? []));
  const slugs = new Set(mine.map(p => p.slug));
  const elsewhere = new Set(prods.filter(p => p.channel && p.channel !== channel).flatMap(p => [...(p.skills ?? []), p.slug]));
  const all = localSkills(lib).filter(s => s.variantOf);
  const shared = all.filter(s => used.has(s.name) || (!s.committed && !!s.variantRef && slugs.has(s.variantRef)));
  const loose = all.filter(s => !s.committed && !shared.includes(s) && !elsewhere.has(s.name) && !(s.variantRef && elsewhere.has(s.variantRef)));
  return { shared, loose };
};

const remoteItems = async <T>(ctx: Ctx, what: 'skill' | 'production' | 'media') =>
  new Map(((await ctx.cloud.get<{ items: SyncItem<T>[] }>('/api/channel-sync/items', { projectId: ctx.projectId, what })).items ?? []).map(i => [i.key, i]));

/** Push the planned items in requests that stay under the hosted function's body size. */
const pushItems = async (ctx: Ctx, what: 'skill' | 'production' | 'media', items: { key: string; hash: string; baseHash?: string; data: unknown; step: Step }[]) => {
  for (const batch of chunks(items, 3_000_000, i => JSON.stringify(i.data).length)) {
    const r = await ctx.cloud.put<PushResult>('/api/channel-sync/items', { projectId: ctx.projectId, what, items: batch.map(({ step: _s, ...i }) => i) });
    for (const i of batch) {
      const conflict = r.conflicts.find(c => c.key === i.key);
      if (conflict) Object.assign(i.step, { action: 'conflict', detail: 'a teammate pushed first: pull, merge, then push' });
      else if (r.saved.includes(i.key) || r.same.includes(i.key)) {
        i.step.action = 'done';
        if (what !== 'media') markSynced(ctx, what, i.key, i.hash);
      } else Object.assign(i.step, { action: 'failed', detail: 'refused by the server' });
    }
  }
};

/** Push or wait: a teammate's change this Mac hasn't seen, or a .theirs still to merge, holds it back. */
const versionStep = (ctx: Ctx, part: Part, what: 'skill' | 'production', key: string, hash: string, remote: SyncItem | undefined, waiting: string[]) => {
  if (remote?.hash === hash) {
    markSynced(ctx, what, key, hash);
    return step(part, 'push', 'same', key, { bulk: true });
  }
  if (waiting.length) return step(part, 'push', 'conflict', key, { detail: `merge ${waiting.map(w => path.basename(w)).join(', ')} first, then delete it` });
  if (remote && baseOf(ctx, what, key) !== remote.hash) return step(part, 'push', 'conflict', key, { detail: 'a teammate changed it: media sync pull, merge, then push' });
  return step(part, 'push', 'push', key);
};

const skillsPush = async (ctx: Ctx): Promise<Plan> => {
  const viewer = viewerOnly(ctx, 'skills');
  if (viewer) return viewer;
  const { shared, loose } = channelSkills(ctx.lib, ctx.channel);
  const remote = await remoteItems(ctx, 'skill');
  const steps: Step[] = [];
  const items: { key: string; hash: string; baseHash?: string; data: unknown; step: Step }[] = [];
  for (const s of shared) {
    const files = skillFiles(s.dir).sort((a, b) => a.path.localeCompare(b.path));
    const bytes = files.reduce((t, f) => t + f.text.length, 0);
    const problems = checks(s).problems;
    if (problems.length) {
      steps.push(step('skills', 'push', 'skip', s.name, { detail: `${problems[0]}${problems.length > 1 ? ` (+${problems.length - 1} more)` : ''}: fix it first (node tools/skills.mjs check)` }));
      continue;
    }
    if (bytes > MAX_SKILL_BYTES) {
      steps.push(step('skills', 'push', 'skip', s.name, { detail: `${size(bytes)} of text is more than a skill shares` }));
      continue;
    }
    const data = { files };
    const hash = hashOf(data);
    const waiting = files.flatMap(f => theirsCopies(path.join(s.dir, ...f.path.split('/'))));
    const st = versionStep(ctx, 'skills', 'skill', s.name, hash, remote.get(s.name), waiting);
    steps.push(st);
    if (st.action === 'push') items.push({ key: s.name, hash, baseHash: baseOf(ctx, 'skill', s.name), data, step: st });
  }
  const notes = loose.length ? [`skills: ${loose.map(s => s.name).join(', ')} ${loose.length === 1 ? "isn't" : "aren't"} tied to a channel yet (media production touch <slug> --skill=<name> ties one)`] : [];
  return { steps, notes, apply: async () => void (items.length && (await pushItems(ctx, 'skill', items))) };
};

/** ~/.claude/skills/<name> → your copy, so every session loads it (skills.mjs's linkOwn, for lib's folders). */
const linkSkill = (lib: Lib, name: string) => {
  if (!lib.userSkills) return;
  const link = path.join(lib.userSkills, name);
  if (fs.lstatSync(link, { throwIfNoEntry: false })) return;
  fs.mkdirSync(lib.userSkills, { recursive: true });
  fs.symlinkSync(path.join(lib.skills, name), link, 'dir');
};

const skillsPull = async (ctx: Ctx): Promise<Plan> => {
  const remote = await remoteItems<{ files: { path: string; text: string }[] }>(ctx, 'skill');
  const steps: Step[] = [];
  const todo: { step: Step; run: () => Promise<void> }[] = [];
  let fresh = 0;
  for (const r of remote.values()) {
    const files = (r.data?.files ?? []).filter(f => f.path.split('/').every(p => p && p !== '..' && !p.startsWith('.')));
    if (!SKILL_NAME.test(r.key) || !files.length) continue;
    const problems = checkFiles(r.key, files);
    if (problems.length) {
      steps.push(step('skills', 'pull', 'skip', r.key, { detail: `not installed: ${problems[0]}` }));
      continue;
    }
    // an update goes where the skill is (the repo's, or yours); a new one becomes yours
    const repoAt = path.join(ctx.lib.repoSkills, r.key);
    const at = fs.existsSync(repoAt) ? repoAt : path.join(ctx.lib.skills, r.key);
    const dir = fs.existsSync(at) ? fs.realpathSync(at) : at;
    const writes = files.filter(f => {
      const abs = path.join(dir, ...f.path.split('/'));
      return !(fs.existsSync(abs) && fs.readFileSync(abs, 'utf8') === f.text) && !theirsCopies(abs).some(p => fs.readFileSync(p, 'utf8') === f.text);
    });
    if (!writes.length) {
      markSynced(ctx, 'skill', r.key, r.hash);
      steps.push(step('skills', 'pull', 'same', r.key, { bulk: true }));
      continue;
    }
    const clashes = writes.filter(f => fs.existsSync(path.join(dir, ...f.path.split('/'))));
    const s = step('skills', 'pull', clashes.length ? 'conflict' : 'pull', r.key, {
      detail: clashes.length ? `theirs beside ${clashes.map(f => f.path).join(', ')} (.theirs)` : fs.existsSync(at) ? `${writes.length} new files` : 'install as yours (the workspace)',
    });
    const isNew = !fs.existsSync(at);
    if (isNew) fresh++;
    steps.push(s);
    todo.push({
      step: s,
      run: async () => {
        for (const f of writes) {
          const dest = landing(path.join(dir, ...f.path.split('/')));
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, f.text);
        }
        if (isNew) linkSkill(ctx.lib, r.key);
        markSynced(ctx, 'skill', r.key, r.hash);
      },
    });
  }
  return { steps, notes: fresh ? [`skills: new ones are yours, in ${ctx.lib.skills}, and load in new sessions; node tools/skills.mjs publish <name> makes one public`] : [], apply: () => runAll(todo) };
};

// ---------- productions ----------

type DeliveryRow = { what: string; path: string; sha256: string; at: string; status: string };
const prodFile = (lib: Lib, slug: string) => path.join(lib.projects, slug, 'mediamake.json');

/** A production as its team shares it: its mediamake.json, with what was delivered (paths under deliverRoot). */
export const productionDoc = (lib: Lib, slug: string) => {
  const file = readJson<Record<string, unknown>>(prodFile(lib, slug));
  if (!file) return null;
  const rows = (lib.db.prepare('SELECT what, path, sha256, at, status FROM deliveries WHERE production = ? ORDER BY at').all(slug) as DeliveryRow[]).map(d => ({ ...d }));
  const had = Array.isArray(file.deliveries) ? (file.deliveries as DeliveryRow[]) : [];
  const deliveries = [...new Map([...had, ...rows].map(d => [`${d.path}|${d.sha256}`, d])).values()];
  return { ...file, ...(deliveries.length ? { deliveries } : {}) };
};

const productionsPush = async (ctx: Ctx): Promise<Plan> => {
  const viewer = viewerOnly(ctx, 'productions');
  if (viewer) return viewer;
  const remote = await remoteItems(ctx, 'production');
  const steps: Step[] = [];
  const items: { key: string; hash: string; baseHash?: string; data: unknown; step: Step }[] = [];
  for (const p of listProductions(ctx.lib).filter(p => p.channel === ctx.channel && p.registered)) {
    const data = productionDoc(ctx.lib, p.slug)!;
    const hash = hashOf(data);
    const st = versionStep(ctx, 'productions', 'production', p.slug, hash, remote.get(p.slug), theirsCopies(prodFile(ctx.lib, p.slug)));
    steps.push(st);
    if (st.action === 'push') items.push({ key: p.slug, hash, baseHash: baseOf(ctx, 'production', p.slug), data, step: st });
  }
  return { steps, notes: [], apply: async () => void (items.length && (await pushItems(ctx, 'production', items))) };
};

const productionsPull = async (ctx: Ctx): Promise<Plan> => {
  const remote = await remoteItems<Record<string, unknown>>(ctx, 'production');
  const steps: Step[] = [];
  const todo: { step: Step; run: () => Promise<void> }[] = [];
  for (const r of remote.values()) {
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(r.key) || !r.data || typeof r.data !== 'object') continue;
    const file = prodFile(ctx.lib, r.key);
    const mine = fs.existsSync(file) ? productionDoc(ctx.lib, r.key) : null;
    const theirs = `${JSON.stringify(r.data, null, 2)}\n`;
    if ((mine && hashOf(mine) === r.hash) || theirsCopies(file).some(p => fs.readFileSync(p, 'utf8') === theirs)) {
      markSynced(ctx, 'production', r.key, r.hash);
      steps.push(step('productions', 'pull', 'same', r.key, { bulk: true }));
      continue;
    }
    const s = step('productions', 'pull', mine ? 'conflict' : 'pull', r.key, { detail: mine ? `theirs → projects/${r.key}/${path.basename(landing(file))}` : `projects/${r.key}/mediamake.json` });
    steps.push(s);
    todo.push({
      step: s,
      run: async () => {
        const dest = landing(file);
        writeJson(dest, r.data);
        if (dest === file) indexProduction(ctx.lib, r.key);
        markSynced(ctx, 'production', r.key, r.hash);
      },
    });
  }
  return { steps, notes: [], apply: () => runAll(todo) };
};

// ---------- media ----------

/** An item as its channel's team sees it (share.ts says which items those are). */
export const detailsOf = (lib: Lib, it: Item): MediaDetails => ({
  sha256: it.id,
  kind: it.kind,
  subject: it.subject,
  title: it.title,
  path: path.isAbsolute(it.path) || it.path.startsWith('remote:') ? undefined : it.path,
  tags: tagsOf(lib.db, it.id).filter(t => !/^(kind|replaced-by):/.test(t)),
  sources: sourcesOf(lib, it.id),
  rating: it.rating,
  notes: (lib.db.prepare('SELECT at, text, production FROM notes WHERE item_id = ? ORDER BY at').all(it.id) as { at: string; text: string; production: string | null }[]).map(r => ({
    at: r.at,
    text: r.text,
    ...(r.production ? { production: r.production } : {}),
  })),
  bytes: it.bytes,
  width: it.width,
  height: it.height,
  duration: it.duration,
  fps: it.fps,
  hasAudio: it.has_audio === null ? null : !!it.has_audio,
  lyrics: it.lyrics ?? null,
});

/** The channel's items on this Mac: its share.ts items, and any the user shared with it. */
const channelItems = (lib: Lib, channel: string) => {
  const c = channelClause(lib, channel);
  return lib.db
    .prepare(
      `SELECT * FROM items i WHERE i.status IN ('online', 'cold') AND i.kind IN (${SHARED_KINDS.map(() => '?').join(', ')})
       AND (${c.sql} OR i.id IN (SELECT item_id FROM shares WHERE channel = ?)) ORDER BY i.path`,
    )
    .all(...SHARED_KINDS, ...c.args, channel) as Item[];
};

type FileJob = { it: Item; step: Step };

/** Upload the files the user shared, under the limit the server counts; confirmed ones are marked uploaded. */
const uploadFiles = async (ctx: Ctx, jobs: FileJob[]) => {
  for (const batch of chunks(jobs, MAX_ITEMS_PER_PUSH)) {
    const res = await ctx.cloud.post<{ uploads: { sha256: string; uploadUrl: string; contentType: string }[]; already: string[]; refused: { sha256: string; reason: string }[] }>(
      '/api/channel-sync/files',
      { projectId: ctx.projectId, files: batch.map(j => ({ sha256: j.it.id, size: j.it.bytes, fileName: path.basename(j.it.path), contentType: mimeOf(j.it.path) })) },
    );
    const byId = new Map(batch.map(j => [j.it.id, j]));
    const uploaded = new Set<string>(res.already);
    for (const r of res.refused) Object.assign(byId.get(r.sha256)?.step ?? {}, { action: 'skip', detail: r.reason });
    await mapLimit(res.uploads, 3, async u => {
      const job = byId.get(u.sha256)!;
      try {
        await ctx.cloud.upload(u.uploadUrl, absOf(ctx.lib, job.it.path), u.contentType);
        uploaded.add(u.sha256);
      } catch (err) {
        Object.assign(job.step, { action: 'failed', detail: message(err) });
      }
    });
    const fresh = res.uploads.map(u => u.sha256).filter(id => uploaded.has(id));
    const confirmed = fresh.length ? await ctx.cloud.put<{ shared: string[]; failed: { sha256: string; reason: string }[] }>('/api/channel-sync/files', { projectId: ctx.projectId, sha256: fresh }) : { shared: [], failed: [] };
    for (const f of confirmed.failed) Object.assign(byId.get(f.sha256)?.step ?? {}, { action: 'failed', detail: f.reason });
    for (const id of [...res.already, ...confirmed.shared]) {
      ctx.lib.db.prepare('UPDATE shares SET uploaded_at = ? WHERE item_id = ? AND channel = ?').run(now(), id, ctx.channel);
      const job = byId.get(id);
      if (job) job.step.action = res.already.includes(id) ? 'same' : 'done';
    }
  }
};

/** Shared files to upload, in the order approved, kept under the limit as the cloud last counted it. */
const fileJobs = (ctx: Ctx, remote: Map<string, SyncItem<MediaDetails>>, only?: Set<string>) => {
  const steps: Step[] = [];
  const jobs: FileJob[] = [];
  let used = ctx.status.usedBytes;
  for (const sh of sharesOf(ctx.lib, ctx.channel)) {
    if (only && !only.has(sh.item_id)) continue;
    const it = getItem(ctx.lib.db, sh.item_id);
    const key = `${sh.item_id.slice(0, 10)} ${it ? path.basename(it.path) : ''}`.trim();
    if (!it) continue;
    if (remote.get(it.id)?.file) {
      if (!sh.uploaded_at) ctx.lib.db.prepare('UPDATE shares SET uploaded_at = ? WHERE item_id = ? AND channel = ?').run(now(), it.id, ctx.channel);
      steps.push(step('media', 'push', 'same', key, { bulk: true }));
      continue;
    }
    if (it.status !== 'online' || !fs.existsSync(absOf(ctx.lib, it.path))) {
      steps.push(step('media', 'push', 'skip', key, { detail: 'its file is not on this Mac right now' }));
      continue;
    }
    if (used + it.bytes > ctx.status.limitBytes) {
      steps.push(step('media', 'push', 'skip', key, { bytes: it.bytes, detail: `over the channel's limit (${size(used)} of ${size(ctx.status.limitBytes)} used): media channel limit ${ctx.channel} <MB> raises it` }));
      continue;
    }
    used += it.bytes;
    const s = step('media', 'push', 'push', key, { bytes: it.bytes, detail: 'file' });
    steps.push(s);
    jobs.push({ it, step: s });
  }
  return { steps, jobs };
};

const mediaPush = async (ctx: Ctx, only?: Set<string>): Promise<Plan> => {
  const viewer = viewerOnly(ctx, 'media');
  if (viewer) return viewer;
  const remote = await remoteItems<MediaDetails>(ctx, 'media');
  const steps: Step[] = [];
  const items: { key: string; hash: string; data: unknown; step: Step }[] = [];
  for (const it of channelItems(ctx.lib, ctx.channel)) {
    if (only && !only.has(it.id)) continue;
    const d = cleanDetails(detailsOf(ctx.lib, it));
    if (!d) continue;
    if (!changesDetails(remote.get(it.id)?.data, d)) steps.push(step('media', 'push', 'same', it.id, { bulk: true }));
    else {
      const s = step('media', 'push', 'push', it.id, { bulk: true, detail: 'details' });
      steps.push(s);
      items.push({ key: it.id, hash: it.id, data: d, step: s });
    }
  }
  const files = fileJobs(ctx, remote, only);
  steps.push(...files.steps);
  return {
    steps,
    notes: [],
    apply: async () => {
      if (items.length) await pushItems(ctx, 'media', items);
      if (files.jobs.length) await uploadFiles(ctx, files.jobs);
    },
  };
};

/** A teammate's item, as a remote item here: findable, its file a `pull --ids=` away when they shared it. */
const putRemote = (ctx: Ctx, r: SyncItem<MediaDetails>) => {
  const { lib } = ctx;
  const d = r.data;
  const kind = (KINDS as readonly string[]).includes(d.kind) ? d.kind : '_unsorted';
  const name = path.basename(d.path ?? r.file?.fileName ?? r.key.slice(0, 12));
  tx(lib.db, () => {
    lib.db
      .prepare(
        `INSERT INTO items (id, path, kind, subject, title, ext, bytes, width, height, duration, fps, has_audio, rating, status, role, confidence, added_at, lyrics)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'remote', 'other', 0.9, ?, ?)
         ON CONFLICT(id) DO UPDATE SET kind = excluded.kind, subject = excluded.subject, title = excluded.title, bytes = excluded.bytes, width = excluded.width,
           height = excluded.height, duration = excluded.duration, fps = excluded.fps, has_audio = excluded.has_audio, rating = excluded.rating, lyrics = excluded.lyrics
         WHERE items.status = 'remote'`,
      )
      .run(r.key, `remote:${ctx.channel}/${r.key}`, kind, n(d.subject), n(d.title), path.extname(name).toLowerCase(), d.bytes ?? r.file?.size ?? 0, n(d.width), n(d.height), n(d.duration), n(d.fps), d.hasAudio === null || d.hasAudio === undefined ? null : Number(d.hasAudio), n(d.rating), now(), n(d.lyrics));
    lib.db.prepare('DELETE FROM tags WHERE item_id = ?').run(r.key);
    lib.db.prepare('DELETE FROM notes WHERE item_id = ?').run(r.key);
    lib.db.prepare('DELETE FROM sources WHERE item_id = ?').run(r.key);
    addTags(lib, r.key, [...(d.tags ?? []), ctx.channel]);
    for (const note of d.notes ?? []) lib.db.prepare('INSERT INTO notes (item_id, at, text, production) VALUES (?, ?, ?, ?)').run(r.key, note.at, note.text, n(note.production));
    for (const s of d.sources ?? []) addSource(lib, r.key, s as Source, { beside: true });
    lib.db
      .prepare('INSERT OR REPLACE INTO remote (item_id, channel, project_id, url, file_name, mime, data, pulled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(r.key, ctx.channel, ctx.projectId, n(r.file?.url), n(r.file?.fileName ?? name), n(r.file?.contentType), JSON.stringify(d), now());
    reindex(lib.db, r.key);
  });
};

const mediaPull = async (ctx: Ctx): Promise<Plan> => {
  const remote = await remoteItems<MediaDetails>(ctx, 'media');
  const steps: Step[] = [];
  const fresh: SyncItem<MediaDetails>[] = [];
  for (const r of remote.values()) {
    if (!SHA256.test(r.key) || !r.data) continue;
    const local = getItem(ctx.lib.db, r.key);
    const had = local?.status === 'remote' ? (ctx.lib.db.prepare('SELECT data, url FROM remote WHERE item_id = ?').get(r.key) as { data: string; url: string | null } | undefined) : undefined;
    if ((local && local.status !== 'remote') || (had && had.data === JSON.stringify(r.data) && (had.url ?? undefined) === r.file?.url)) {
      steps.push(step('media', 'pull', 'same', r.key, { bulk: true }));
      continue;
    }
    steps.push(step('media', 'pull', 'pull', r.key, { bulk: true, detail: r.file ? 'details, file shared' : 'details' }));
    fresh.push(r);
  }
  const files = [...remote.values()].filter(r => r.file && getItem(ctx.lib.db, r.key)?.status !== 'online' && getItem(ctx.lib.db, r.key)?.status !== 'cold').length;
  return {
    steps,
    notes: files ? [`media: ${files} of the team's files can come here: ${isProjectId(ctx.channel) ? 'media find <words>' : `media find --channel=${ctx.channel}`}, then media sync pull --ids=<id>,… --yes`] : [],
    apply: async () => {
      for (const r of fresh) putRemote(ctx, r);
      for (const s of steps) if (s.action === 'pull') s.action = 'done';
    },
  };
};

/** A teammate's files (remote items) into _INBOX/mediamake-sync/<channel>/ with their sidecars, then filed. */
export const pullFiles = async (lib: Lib, cloud: Cloud, refs: string[], yes: boolean) => {
  const steps: Step[] = [];
  const jobs: { step: Step; url: string; dest: string; id: string; data: MediaDetails; channel: string }[] = [];
  for (const ref of refs) {
    const rows = lib.db.prepare('SELECT * FROM items WHERE id LIKE ? LIMIT 2').all(`${ref.toLowerCase()}%`) as Item[];
    if (rows.length !== 1) {
      steps.push(step('media', 'pull', 'skip', ref, { detail: rows.length ? 'matches more than one item: give more of the id' : 'no such item (media sync pull --what=media first)' }));
      continue;
    }
    const it = rows[0];
    if (it.status !== 'remote') {
      steps.push(step('media', 'pull', 'same', it.id.slice(0, 10), { detail: `already here: ${absOf(lib, it.path)}` }));
      continue;
    }
    const r = lib.db.prepare('SELECT channel, url, file_name, data FROM remote WHERE item_id = ?').get(it.id) as { channel: string; url: string | null; file_name: string | null; data: string } | undefined;
    if (!r?.url) {
      steps.push(step('media', 'pull', 'skip', it.id.slice(0, 10), { detail: "its file isn't shared, only its details: a teammate can media share it" }));
      continue;
    }
    const name = path.basename(r.file_name ?? `${it.id.slice(0, 12)}${it.ext}`).replace(/[/:\\]+/g, ' ');
    const s = step('media', 'pull', 'pull', `${it.id.slice(0, 10)} ${name}`, { bytes: it.bytes, detail: 'file' });
    steps.push(s);
    jobs.push({ step: s, url: r.url, dest: path.join(lib.cfg.inbox, 'mediamake-sync', r.channel, name), id: it.id, data: JSON.parse(r.data) as MediaDetails, channel: r.channel });
  }
  if (!yes || !jobs.length) return { steps, filed: [] as string[] };
  await runAll(
    jobs.map(j => ({
      step: j.step,
      run: async () => {
        const dest = fs.existsSync(j.dest) ? j.dest.replace(/(\.\w+)?$/, `-${j.id.slice(0, 8)}$1`) : j.dest;
        await cloud.download(j.url, dest);
        if ((await sha256File(dest)) !== j.id) {
          fs.rmSync(dest, { force: true });
          throw new Error("the download didn't match its SHA-256");
        }
        const first = (j.data.sources?.[0] as Source | undefined) ?? { tool: 'mediamake-sync', ref: j.id };
        writeJson(`${dest}.source.json`, { ...first, schema: 'mediamake.source/v1', channel: j.channel, library: j.data });
      },
    })),
  );
  return { steps, filed: await fileInbox(lib, 'mediamake-sync') };
};

/** File what a pull put in an inbox folder, under the heavy-work lock. */
const fileInbox = async (lib: Lib, tool: string) => {
  const dir = path.join(lib.cfg.inbox, tool);
  if (!fs.existsSync(dir)) return [];
  const release = lock(lib.catalog, 'heavy');
  try {
    return (await ingest(lib, [dir], { now: true })).filter(d => d.action === 'filed' || d.action === 'duplicate').map(d => `${path.basename(d.file)} → ${d.dest}`);
  } finally {
    release();
  }
};

// ---------- music (keeper Suno takes) ----------

/** A take as GET /api/generations has it (apps/mediamake/lib/generations), the fields read here. */
type Generation = {
  id: string;
  tool: string;
  ref: string;
  kind?: string;
  parentRef?: string | null;
  sourceItem?: string | null;
  batchId?: string | null;
  title?: string;
  styles?: string;
  excludeStyles?: string;
  lyrics?: string;
  instrumental?: boolean;
  model?: string;
  settings?: Record<string, unknown>;
  workspace?: { id?: string; name?: string } | null;
  status?: string;
  audioUrl?: string | null;
  credits?: number | null;
  /** SHA-256 of its library item, once someone filed it */
  libraryItem?: string | null;
  url?: string | null;
  createdAt?: string;
};
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** Every keeper on the project, page by page. */
const keepers = async (ctx: Ctx) => {
  const out: Generation[] = [];
  let cursor: string | undefined;
  do {
    const page = await ctx.cloud.get<{ items?: Generation[]; nextCursor?: string | null }>('/api/generations', { projectId: ctx.projectId, rating: 'keeper', limit: '200', cursor });
    out.push(...(page.items ?? []));
    cursor = page.nextCursor ?? undefined;
  } while (cursor && out.length < 10_000);
  return out;
};

/** A keeper as Browse Hack's suno_download saves a take (its sidecar's shape). */
const sunoSidecar = (g: Generation, channel: string) => ({
  schema: 'mediamake.source/v1',
  tool: 'suno',
  ref: g.ref,
  url: g.audioUrl,
  pageUrl: str(g.url) ?? `https://suno.com/song/${g.ref}`,
  title: str(g.title),
  prompt: str(g.styles),
  model: str(g.model),
  price: typeof g.credits === 'number' ? g.credits : undefined,
  downloadedAt: now(),
  lyrics: str(g.lyrics),
  excludeStyles: str(g.excludeStyles),
  instrumental: g.instrumental || undefined,
  settings: g.settings && Object.keys(g.settings).length ? g.settings : undefined,
  parentRef: str(g.parentRef),
  relation: g.kind && g.kind !== 'create' ? g.kind : undefined,
  sourceItem: str(g.sourceItem),
  workspace: g.workspace ?? undefined,
  channel,
});

const musicPull = async (ctx: Ctx): Promise<Plan> => {
  let list: Generation[];
  try {
    list = await keepers(ctx);
  } catch (err) {
    // a server without the route answers Next's page, not JSON
    if (err instanceof CloudError && err.status === 404 && !err.json) return { steps: [step('music', 'pull', 'pending', 'keepers', { detail: "/api/generations isn't on this server yet" })], notes: [] };
    throw err;
  }
  const steps: Step[] = [];
  const todo: { step: Step; run: () => Promise<void> }[] = [];
  for (const g of list) {
    if ((g.tool ?? 'suno') !== 'suno' || !str(g.ref)) continue;
    const title = (str(g.title) ?? 'Untitled').replace(/[/:\\\n\r]+/g, ' ').slice(0, 120);
    const key = `${title} [${g.ref.slice(0, 8)}]`;
    const have =
      ctx.lib.db.prepare("SELECT 1 FROM sources s JOIN items i ON i.id = s.item_id WHERE s.tool = 'suno' AND s.ref = ? AND i.status != 'remote'").get(g.ref) ||
      (g.libraryItem && ['online', 'cold'].includes(getItem(ctx.lib.db, g.libraryItem.toLowerCase())?.status ?? ''));
    if (have) {
      steps.push(step('music', 'pull', 'same', key, { bulk: true }));
      continue;
    }
    if (!g.audioUrl || !/^https?:\/\//.test(g.audioUrl)) {
      steps.push(step('music', 'pull', 'skip', key, { detail: g.status && g.status !== 'complete' ? `still ${g.status} on Suno` : 'no audio on MediaMake yet' }));
      continue;
    }
    const ext = path.extname(new URL(g.audioUrl).pathname).toLowerCase();
    const dest = path.join(ctx.lib.cfg.inbox, 'suno', ctx.channel, 'keepers', `${key}${['.mp3', '.wav', '.m4a', '.flac'].includes(ext) ? ext : '.mp3'}`);
    const s = step('music', 'pull', 'pull', key, { detail: 'keeper' });
    steps.push(s);
    todo.push({
      step: s,
      run: async () => {
        await ctx.cloud.download(g.audioUrl!, dest);
        writeJson(`${dest}.source.json`, sunoSidecar(g, ctx.channel));
      },
    });
  }
  return {
    steps,
    notes: list.length ? [] : ['music: no keeper takes on the project yet (rate takes keeper on the Projects page)'],
    apply: async () => {
      await runAll(todo);
      if (todo.some(t => t.step.action === 'done')) await fileInbox(ctx.lib, 'suno');
    },
  };
};

const musicPush = async (): Promise<Plan> => ({ steps: [], notes: ['music: keepers come from Suno takes rated on MediaMake (pull only)'] });

// ---------- one channel ----------

const PLANNERS: Record<Part, Record<Direction, (ctx: Ctx) => Promise<Plan>>> = {
  brand: { push: brandPush, pull: brandPull },
  skills: { push: skillsPush, pull: skillsPull },
  productions: { push: productionsPush, pull: productionsPull },
  media: { push: c => mediaPush(c), pull: mediaPull },
  music: { push: musicPush, pull: musicPull },
};

export type ChannelReport = { channel: string; status: ChannelSyncStatus; steps: Step[]; notes: string[] };

/** The key is a linked channel, or a cloud project's id (a project's shared assets need no channel). */
const connectChannel = async (lib: Lib, cloud: Cloud, channel: string, yes: boolean): Promise<Ctx> => {
  const projectId = projectOf(lib, channel);
  if (!projectId) throw new Error(`${channel} isn't linked to a cloud project yet: media channel link ${channel} <projectId> (media channel list shows yours), or name a project itself: --project=<id>`);
  const status = await cloud.get<ChannelSyncStatus>('/api/channel-sync', { projectId });
  return { lib, cloud, channel, projectId, status, yes };
};

/** status (both ways, nothing done), push or pull, for one channel. */
export const syncChannel = async (lib: Lib, cloud: Cloud, channel: string, mode: 'status' | Direction, o: { what?: Part[]; yes?: boolean } = {}): Promise<ChannelReport> => {
  const ctx = await connectChannel(lib, cloud, channel, !!o.yes && mode !== 'status');
  const steps: Step[] = [];
  const notes: string[] = [];
  for (const part of o.what ?? PARTS) {
    for (const dir of mode === 'status' ? (['push', 'pull'] as const) : [mode]) {
      try {
        const plan = await PLANNERS[part][dir](ctx);
        if (ctx.yes && plan.apply) await plan.apply();
        steps.push(...plan.steps);
        notes.push(...plan.notes);
      } catch (err) {
        steps.push(step(part, dir, 'failed', part, { detail: message(err) }));
      }
    }
  }
  return { channel, status: ctx.status, steps, notes };
};

/** `media share`: the user's OK for these items' files, then (with --yes) their details and files go up. */
export const pushShared = async (lib: Lib, cloud: Cloud, channel: string, ids: string[], yes: boolean) => {
  const ctx = await connectChannel(lib, cloud, channel, yes);
  const plan = await mediaPush(ctx, new Set(ids));
  if (yes && plan.apply) await plan.apply();
  return { channel, status: ctx.status, steps: plan.steps, notes: plan.notes };
};

/** `media unshare`: the team stops getting these files (their details stay). */
export const withdrawFiles = async (lib: Lib, cloud: Cloud, channel: string, ids: string[]) => {
  const ctx = await connectChannel(lib, cloud, channel, true);
  await cloud.del('/api/channel-sync/files', { projectId: ctx.projectId, sha256: ids.join(',') });
};
