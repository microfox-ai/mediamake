import { formatTime, padFrame } from './frames';
import {
  REVISION_SCHEMA,
  type Revision,
  type RevisionComment,
  type RevisionStatus,
  type RevisionVideoInfo,
} from './types';

const REVISION_FILE = /^(rev-\d+)\.json$/;

export const STATUS_LABEL: Record<RevisionStatus, string> = {
  draft: 'Draft',
  ready: 'Ready for Claude',
  resolved: 'Resolved',
};

export function revisionIdFromFile(name: string): string | null {
  return REVISION_FILE.exec(name)?.[1] ?? null;
}

export function nextRevisionId(existing: string[]): string {
  const max = existing.reduce(
    (m, id) => Math.max(m, Number(id.replace(/\D/g, '')) || 0),
    0,
  );
  return `rev-${String(max + 1).padStart(3, '0')}`;
}

export function nextCommentId(comments: RevisionComment[]): string {
  const max = comments.reduce(
    (m, c) => Math.max(m, Number(c.id.replace(/\D/g, '')) || 0),
    0,
  );
  return `c${String(max + 1).padStart(2, '0')}`;
}

export function createRevision(
  id: string,
  video: RevisionVideoInfo,
  map: string | null,
): Revision {
  const now = new Date().toISOString();
  return {
    schema: REVISION_SCHEMA,
    id,
    title: `Revision ${Number(id.replace(/\D/g, '')) || 1}`,
    status: 'draft',
    video,
    map,
    createdAt: now,
    updatedAt: now,
    comments: [],
  };
}

/** Accepts what is on disk, filling anything an older or hand-edited file lacks. */
export function normalizeRevision(raw: unknown, id: string): Revision {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Revision>;
  const now = new Date().toISOString();
  return {
    schema: REVISION_SCHEMA,
    id,
    title: typeof r.title === 'string' && r.title.trim() ? r.title : id,
    status:
      r.status === 'ready' || r.status === 'resolved' ? r.status : 'draft',
    video: (r.video ?? {
      file: '',
      size: 0,
      lastModified: 0,
      duration: 0,
      fps: 30,
    }) as RevisionVideoInfo,
    map: typeof r.map === 'string' ? r.map : null,
    createdAt: r.createdAt ?? now,
    updatedAt: r.updatedAt ?? now,
    comments: Array.isArray(r.comments)
      ? r.comments
          .filter(
            (c): c is RevisionComment =>
              !!c && typeof c === 'object' && typeof c.id === 'string',
          )
          .map(
            c =>
              ({
                ...c,
                status: c.status === 'done' ? 'done' : 'open',
              }) as RevisionComment,
          )
      : [],
  };
}

export function snapshotFileName(
  commentId: string,
  shotId: string | undefined,
  frame: number,
): string {
  const shot = (shotId ?? 'noshot').replace(/[^\w.-]+/g, '-');
  return `${commentId}_${shot}_f${padFrame(frame)}.jpg`;
}

/** True when the video on disk is not the render this revision was written against. */
export function isStaleRevision(
  revision: Revision,
  current: { size: number; lastModified: number },
): boolean {
  if (!revision.video.size || revision.comments.length === 0) return false;
  return (
    revision.video.size !== current.size ||
    revision.video.lastModified !== current.lastModified
  );
}

export function commentSortKey(c: RevisionComment): number {
  return c.kind === 'point' ? c.time : c.from;
}

function shotsLabel(c: RevisionComment): string {
  if (c.kind === 'point') return c.shot?.id ?? 'no shot';
  if (c.shots.length === 0) return 'no shot';
  return c.shots.length === 1
    ? c.shots[0]
    : `${c.shots[0]} → ${c.shots[c.shots.length - 1]}`;
}

function quote(text: string): string {
  return text
    .trim()
    .split('\n')
    .map(line => `> ${line}`)
    .join('\n');
}

/**
 * The revision as Markdown, for reading. Regenerated from the JSON on every
 * save — edit the JSON, not this.
 */
export function revisionToMarkdown(
  revision: Revision,
  opts: { revisionsDir: string; sourcePath?: string },
): string {
  const { video } = revision;
  const comments = [...revision.comments].sort(
    (a, b) => commentSortKey(a) - commentSortKey(b),
  );
  const open = comments.filter(c => c.status === 'open').length;
  const lines: string[] = [];
  lines.push(
    `# ${revision.title} (${revision.id}) — ${STATUS_LABEL[revision.status]}`,
  );
  lines.push('');
  lines.push(
    `Video: \`${video.file}\` · ${video.fps} fps · ${formatTime(video.duration)}` +
      (video.width && video.height ? ` · ${video.width}×${video.height}` : '') +
      ` · modified ${new Date(video.lastModified).toISOString()}`,
  );
  if (opts.sourcePath) lines.push(`Path: \`${opts.sourcePath}\``);
  lines.push(`Shot map: ${revision.map ? `\`${revision.map}\`` : 'none'}`);
  lines.push(`Updated: ${revision.updatedAt}`);
  lines.push('');
  lines.push(
    `${comments.length} comment${comments.length === 1 ? '' : 's'}: ${open} open, ${comments.length - open} done.`,
  );
  lines.push('');
  lines.push(
    `Written by the mediamake Revisions screen. \`${revision.id}.json\` is the source of truth; ` +
      `to close a comment set its \`status\` to \`"done"\` and add a \`reply\` there. ` +
      `Stills of point comments are in \`${opts.revisionsDir}/${revision.id}/\`. Range comments have no stills: ` +
      `run the ffmpeg line from the video's folder to extract frames.`,
  );

  for (const c of comments) {
    lines.push('');
    if (c.kind === 'point') {
      lines.push(
        `## ${c.id} · ${shotsLabel(c)} · f${c.frame} (${formatTime(c.time)}) — ${c.status}`,
      );
      lines.push('');
      lines.push(quote(c.text));
      lines.push('');
      if (c.shot) {
        lines.push(
          `- Shot: \`${c.shot.id}\`${c.shot.label ? ` ${c.shot.label}` : ''} (${c.shot.from.toFixed(2)}–${c.shot.to.toFixed(2)} s)`,
        );
      }
      lines.push(`- Time: ${c.time.toFixed(3)} s, frame ${c.frame}`);
      if (c.snapshot)
        lines.push(`- Still: \`${opts.revisionsDir}/${c.snapshot}\``);
    } else {
      lines.push(
        `## ${c.id} · ${shotsLabel(c)} · f${c.fromFrame}–f${c.toFrame} (${formatTime(c.from)}–${formatTime(c.to)}) — ${c.status}`,
      );
      lines.push('');
      lines.push(quote(c.text));
      lines.push('');
      if (c.shots.length)
        lines.push(`- Shots: ${c.shots.map(s => `\`${s}\``).join(', ')}`);
      lines.push(
        `- Range: ${c.from.toFixed(3)}–${c.to.toFixed(3)} s, frames ${c.fromFrame}–${c.toFrame} (inclusive)`,
      );
      const duration = Math.max(c.to - c.from, 1 / (video.fps || 30));
      const rate = Math.min(8, Math.max(1, Math.round(8 / duration)));
      lines.push(
        `- Frames: \`ffmpeg -ss ${c.from.toFixed(3)} -i "${video.file}" -t ${duration.toFixed(3)} -vf fps=${rate} -q:v 3 "${opts.revisionsDir}/${revision.id}/${c.id}_range_%02d.jpg"\``,
      );
    }
    if (c.reply) {
      lines.push('');
      lines.push(`**Reply:** ${c.reply}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}
