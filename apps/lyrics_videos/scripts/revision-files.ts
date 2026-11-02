/**
 * revision-files: mediamake's review files (mediamake.revision/v1) from Node, for the scripts that
 * take part in the review loop (preflight, wait-revision, loop-stats). The Revisions screen in
 * apps/mediamake owns the format (lib/revisions/types.ts and revision-file.ts); this mirrors the
 * parts the scripts need, so keep the two in step.
 *
 *   out/<slug>/<slug>.mp4
 *   out/<slug>/<slug>.revisions/rev-001.json   the revision (source of truth)
 *   out/<slug>/<slug>.revisions/rev-001.md     the same for reading, rewritten on every save
 *
 * The screen keeps any extra field on a comment when it saves, so a machine note carries
 * `source: 'preflight'` and the `check` that found it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const REVISION_SCHEMA = 'mediamake.revision/v1';
export const REVISIONS_SUFFIX = '.revisions';
const REVISION_FILE = /^(rev-\d+)\.json$/;

export type RevisionStatus = 'draft' | 'ready' | 'resolved';
export type CommentStatus = 'open' | 'done';

type CommentBase = {
  id: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  status: CommentStatus;
  reply?: string;
  /** who wrote it: absent for the user's notes, 'preflight' for machine notes */
  source?: string;
  /** the machine check behind a preflight note (black, freeze, silence, …) */
  check?: string;
};
export type ShotRef = { id: string; label?: string; section?: string; from: number; to: number };
export type PointComment = CommentBase & { kind: 'point'; time: number; frame: number; shot: ShotRef | null; snapshot?: string };
export type RangeComment = CommentBase & {
  kind: 'range';
  from: number;
  to: number;
  fromFrame: number;
  /** last frame of the range, inclusive */
  toFrame: number;
  shots: string[];
};
export type RevisionComment = PointComment | RangeComment;
export type RevisionVideoInfo = { file: string; size: number; lastModified: number; duration: number; fps: number; width?: number; height?: number };
export type Revision = {
  schema: string;
  id: string;
  title: string;
  status: RevisionStatus;
  video: RevisionVideoInfo;
  map: string | null;
  createdAt: string;
  updatedAt: string;
  comments: RevisionComment[];
};

export const STATUS_LABEL: Record<RevisionStatus, string> = { draft: 'Draft', ready: 'Ready for Claude', resolved: 'Resolved' };

export const baseName = (file: string) => path.basename(file, path.extname(file));
export const revisionsDirFor = (videoPath: string) => path.join(path.dirname(videoPath), `${baseName(videoPath)}${REVISIONS_SUFFIX}`);
export const revisionNumber = (id: string) => Number(id.replace(/\D/g, '')) || 0;
export const isMachineNote = (c: RevisionComment) => c.source === 'preflight';

export function nextRevisionId(ids: string[]): string {
  const max = ids.reduce((m, id) => Math.max(m, revisionNumber(id)), 0);
  return `rev-${String(max + 1).padStart(3, '0')}`;
}

export function nextCommentId(comments: RevisionComment[]): string {
  const max = comments.reduce((m, c) => Math.max(m, Number(c.id.replace(/\D/g, '')) || 0), 0);
  return `c${String(max + 1).padStart(2, '0')}`;
}

/** What is on disk, with anything an older or hand-edited file lacks filled in (as the screen does). */
export function normalizeRevision(raw: unknown, id: string): Revision {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Revision>;
  const now = new Date().toISOString();
  return {
    schema: REVISION_SCHEMA,
    id,
    title: typeof r.title === 'string' && r.title.trim() ? r.title : id,
    status: r.status === 'ready' || r.status === 'resolved' ? r.status : 'draft',
    video: (r.video ?? { file: '', size: 0, lastModified: 0, duration: 0, fps: 30 }) as RevisionVideoInfo,
    map: typeof r.map === 'string' ? r.map : null,
    createdAt: r.createdAt ?? now,
    updatedAt: r.updatedAt ?? now,
    comments: Array.isArray(r.comments)
      ? r.comments
          .filter((c): c is RevisionComment => !!c && typeof c === 'object' && typeof c.id === 'string')
          .map(c => ({ ...c, status: c.status === 'done' ? 'done' : 'open' }) as RevisionComment)
      : [],
  };
}

/** Every rev-NNN.json in a revisions folder, oldest first. A file that does not parse (half-written) is skipped. */
export function readRevisions(dir: string): Revision[] {
  if (!fs.existsSync(dir)) return [];
  const revisions: Revision[] = [];
  for (const name of fs.readdirSync(dir)) {
    const id = REVISION_FILE.exec(name)?.[1];
    if (!id) continue;
    try {
      revisions.push(normalizeRevision(JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')), id));
    } catch {
      // being written right now: the next read gets it
    }
  }
  return revisions.sort((a, b) => revisionNumber(a.id) - revisionNumber(b.id));
}

/**
 * The video as the screen records it. `lastModified` is the browser's File.lastModified (whole
 * milliseconds), so a revision written here is not flagged as written against an older render.
 */
export function videoInfo(videoPath: string, probe: { duration: number; fps: number; width?: number; height?: number }): RevisionVideoInfo {
  const stat = fs.statSync(videoPath);
  return {
    file: path.basename(videoPath),
    size: stat.size,
    lastModified: Math.floor(stat.mtimeMs),
    duration: probe.duration,
    fps: probe.fps,
    width: probe.width,
    height: probe.height,
  };
}

/** Write through a hidden temp file and rename, so the open screen never reads half a file (it skips dot files). */
function writeAtomic(file: string, data: string) {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.tmp`);
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

/** Writes rev-NNN.json and its .md into the revisions folder (created when missing). */
export function writeRevision(dir: string, revision: Revision): string {
  fs.mkdirSync(dir, { recursive: true });
  const json = path.join(dir, `${revision.id}.json`);
  writeAtomic(json, `${JSON.stringify(revision, null, 2)}\n`);
  writeAtomic(path.join(dir, `${revision.id}.md`), revisionToMarkdown(revision, path.basename(dir)));
  return json;
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(2).padStart(5, '0')}`;
}

const commentTime = (c: RevisionComment) => (c.kind === 'point' ? c.time : c.from);

function shotsLabel(c: RevisionComment): string {
  if (c.kind === 'point') return c.shot?.id ?? 'no shot';
  if (c.shots.length === 0) return 'no shot';
  return c.shots.length === 1 ? c.shots[0] : `${c.shots[0]} → ${c.shots[c.shots.length - 1]}`;
}

/** One line per comment, for a terminal: "c03 · h1.3 · 0:12.40 — make the logo bigger" */
export function commentLine(c: RevisionComment, max = 160): string {
  const when = c.kind === 'point' ? formatTime(c.time) : `${formatTime(c.from)}–${formatTime(c.to)}`;
  const text = c.text.replace(/\s+/g, ' ').trim();
  return `${c.id} · ${shotsLabel(c)} · ${when} — ${text.length > max ? `${text.slice(0, max - 1)}…` : text}`;
}

/**
 * The review link for a video under out/ (the deployed screen; mediamake on localhost:3002 takes the
 * same query). Outside out/ there is no source folder to match, so it names the folder to open.
 */
export function reviewLink(videoPath: string): string {
  const folder = path.relative(path.join(ROOT, 'out'), path.dirname(path.resolve(videoPath))).split(path.sep).join('/');
  if (folder.startsWith('..') || path.isAbsolute(folder))
    return `https://mediamake.microfox.app/remotion-revision (open the folder ${path.dirname(path.resolve(videoPath))})`;
  const encoded = folder.split('/').map(encodeURIComponent).join('/');
  return `https://mediamake.microfox.app/remotion-revision?folder=${encoded}&video=${encodeURIComponent(path.basename(videoPath))}`;
}

const quote = (text: string) =>
  text
    .trim()
    .split('\n')
    .map(line => `> ${line}`)
    .join('\n');

/** The revision as Markdown, in the screen's layout (revisionToMarkdown in lib/revisions/revision-file.ts). */
export function revisionToMarkdown(revision: Revision, revisionsDir: string): string {
  const { video } = revision;
  const comments = [...revision.comments].sort((a, b) => commentTime(a) - commentTime(b));
  const open = comments.filter(c => c.status === 'open').length;
  const lines: string[] = [];
  lines.push(`# ${revision.title} (${revision.id}) — ${STATUS_LABEL[revision.status]}`, '');
  lines.push(
    `Video: \`${video.file}\` · ${video.fps} fps · ${formatTime(video.duration)}` +
      (video.width && video.height ? ` · ${video.width}×${video.height}` : '') +
      ` · modified ${new Date(video.lastModified).toISOString()}`,
  );
  lines.push(`Shot map: ${revision.map ? `\`${revision.map}\`` : 'none'}`);
  lines.push(`Updated: ${revision.updatedAt}`, '');
  lines.push(`${comments.length} comment${comments.length === 1 ? '' : 's'}: ${open} open, ${comments.length - open} done.`, '');
  lines.push(
    `Written by preflight (scripts/preflight.ts) in the Revisions screen's layout; the screen rewrites this file on its next save. ` +
      `Notes that start with "Preflight ·" are machine notes. ` +
      `\`${revision.id}.json\` is the source of truth; to close a comment set its \`status\` to \`"done"\` and add a \`reply\` there. ` +
      `Range comments have no stills: run the ffmpeg line from the video's folder to extract frames.`,
  );
  for (const c of comments) {
    lines.push('');
    if (c.kind === 'point') {
      lines.push(`## ${c.id} · ${shotsLabel(c)} · f${c.frame} (${formatTime(c.time)}) — ${c.status}`, '', quote(c.text), '');
      if (c.shot) lines.push(`- Shot: \`${c.shot.id}\`${c.shot.label ? ` ${c.shot.label}` : ''} (${c.shot.from.toFixed(2)}–${c.shot.to.toFixed(2)} s)`);
      lines.push(`- Time: ${c.time.toFixed(3)} s, frame ${c.frame}`);
      if (c.snapshot) lines.push(`- Still: \`${revisionsDir}/${c.snapshot}\``);
    } else {
      lines.push(
        `## ${c.id} · ${shotsLabel(c)} · f${c.fromFrame}–f${c.toFrame} (${formatTime(c.from)}–${formatTime(c.to)}) — ${c.status}`,
        '',
        quote(c.text),
        '',
      );
      if (c.shots.length) lines.push(`- Shots: ${c.shots.map(s => `\`${s}\``).join(', ')}`);
      lines.push(`- Range: ${c.from.toFixed(3)}–${c.to.toFixed(3)} s, frames ${c.fromFrame}–${c.toFrame} (inclusive)`);
      const duration = Math.max(c.to - c.from, 1 / (video.fps || 30));
      const rate = Math.min(8, Math.max(1, Math.round(8 / duration)));
      lines.push(
        `- Frames: \`ffmpeg -ss ${c.from.toFixed(3)} -i "${video.file}" -t ${duration.toFixed(3)} -vf fps=${rate} -q:v 3 "${revisionsDir}/${revision.id}/${c.id}_range_%02d.jpg"\``,
      );
    }
    if (c.reply) lines.push('', `**Reply:** ${c.reply}`);
  }
  lines.push('');
  return lines.join('\n');
}
