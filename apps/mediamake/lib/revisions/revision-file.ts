import { formatTime, padFrame } from './frames';
import {
  describeMark,
  describeSpot,
  sanitizeMarks,
  sanitizeSpot,
} from './marks';
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
  live?: { project: string },
): Revision {
  const now = new Date().toISOString();
  return {
    schema: REVISION_SCHEMA,
    id,
    title: `Revision ${Number(id.replace(/\D/g, '')) || 1}`,
    status: 'draft',
    video,
    map,
    ...(live ? { live } : {}),
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
    ...(r.live && typeof r.live.project === 'string'
      ? { live: { project: r.live.project } }
      : {}),
    createdAt: r.createdAt ?? now,
    updatedAt: r.updatedAt ?? now,
    comments: Array.isArray(r.comments)
      ? r.comments
          .filter(
            (c): c is RevisionComment =>
              !!c && typeof c === 'object' && typeof c.id === 'string',
          )
          .map(c => {
            const comment = {
              ...c,
              status: c.status === 'done' ? 'done' : 'open',
            } as RevisionComment;
            if (comment.kind !== 'point') return comment;
            // marks and spots that can't be drawn are dropped (people and Claude edit these files)
            const { drawing, spot, ...rest } = comment;
            const marks = sanitizeMarks(drawing);
            const at = sanitizeSpot(spot);
            return {
              ...rest,
              ...(marks ? { drawing: marks } : {}),
              ...(at ? { spot: at } : {}),
            };
          })
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

/** The 2× crop around a comment's spot, beside its still: "c01_h1.3_f000372_zoom.jpg". */
export const zoomFileName = (stillName: string) =>
  stillName.replace(/\.jpg$/, '_zoom.jpg');

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

/** Seconds into the video; general notes sort before everything. */
export function commentSortKey(c: RevisionComment): number {
  if (c.kind === 'general') return -1;
  return c.kind === 'point' ? c.time : c.from;
}

function shotsLabel(c: RevisionComment): string {
  if (c.kind === 'general') return 'the whole video';
  if (c.kind === 'point') return c.shot?.id ?? 'no shot';
  if (c.shots.length === 0) return 'no shot';
  return c.shots.length === 1
    ? c.shots[0]
    : `${c.shots[0]} → ${c.shots[c.shots.length - 1]}`;
}

/** The lyric kit's stills script for these seconds of a live-reviewed project, at full size. */
const stillsLine = (project: string, seconds: number[]) =>
  `\`mm stills ${project} ${seconds.map(t => t.toFixed(2)).join(',')} --only --scale=1\``;

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
  const live = revision.live?.project;
  if (live) {
    lines.push(
      `Live review of the project \`${live}\` (\`projects/${live}/\`), not of a render: the composition ` +
        `played in the browser from its code and \`video/edits.json\` · ${video.fps} fps · ${formatTime(video.duration)}` +
        (video.width && video.height
          ? ` · ${video.width}×${video.height}`
          : '') +
        ` · code as of ${new Date(video.lastModified).toISOString()}`,
    );
  } else {
    lines.push(
      `Video: \`${video.file}\` · ${video.fps} fps · ${formatTime(video.duration)}` +
        (video.width && video.height
          ? ` · ${video.width}×${video.height}`
          : '') +
        ` · modified ${new Date(video.lastModified).toISOString()}`,
    );
  }
  if (opts.sourcePath) lines.push(`Path: \`${opts.sourcePath}\``);
  lines.push(
    `Shot map: ${revision.map ? `\`${revision.map}\`` : 'none'}` +
      (live && revision.map?.endsWith('manifest.json')
        ? ' (one shot per lyric line, as a render of it gets)'
        : ''),
  );
  lines.push(`Updated: ${revision.updatedAt}`);
  lines.push('');
  lines.push(
    `${comments.length} comment${comments.length === 1 ? '' : 's'}: ${open} open, ${comments.length - open} done.`,
  );
  lines.push('');
  lines.push(
    `Written by the mediamake Video Revision screen. \`${revision.id}.json\` is the source of truth; ` +
      `to close a comment set its \`status\` to \`"done"\` and add a \`reply\` there. ` +
      `Stills of point comments are in \`${opts.revisionsDir}/${revision.id}/\`. ` +
      (live
        ? `They were rendered in the browser, which can miss some effects (radial gradients, some filters ` +
          `and blend modes): when the look matters, or a comment has no still, render its frames with the ` +
          `\`Render:\` line under it (run in the repo). Range comments have only that line.`
        : `Range comments have no stills: run the ffmpeg line from the video's folder to extract frames.`),
  );
  if (comments.some(c => c.kind === 'point' && (c.drawing?.length || c.spot))) {
    lines.push('');
    lines.push(
      `Marks are drawn into the stills. Their colour says what to do: red fix or remove, green add here, ` +
        `yellow move (an arrow shows where). Positions are fractions of the frame, so they hold at any render size; ` +
        `a spot's zoomed crop shows the frame around it at 2×.`,
    );
  }

  if (comments.some(c => c.kind === 'general')) {
    lines.push('');
    lines.push(
      `General comments come first: they are about the whole video (pacing, mood, a change for every place ` +
        `it applies), so act on them everywhere, not at one time.`,
    );
  }

  for (const c of comments) {
    lines.push('');
    if (c.kind === 'general') {
      lines.push(`## ${c.id} · General — ${c.status}`);
      lines.push('');
      lines.push(quote(c.text));
    } else if (c.kind === 'point') {
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
        lines.push(
          `- Still: \`${opts.revisionsDir}/${c.snapshot}\`${c.drawing?.length || c.spot ? ' (marks drawn in)' : ''}`,
        );
      if (live) lines.push(`- Render: ${stillsLine(live, [c.time])}`);
      if (c.drawing?.length)
        lines.push(`- Marks: ${c.drawing.map(describeMark).join('; ')}`);
      if (c.spot)
        lines.push(
          `- Spot: ${describeSpot(c.spot)}${c.zoom ? `; zoomed crop \`${opts.revisionsDir}/${c.zoom}\`` : ''}`,
        );
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
      if (live) {
        const n = Math.min(6, Math.max(2, Math.round(duration * 2)));
        const times = Array.from(
          { length: n },
          (_, i) => c.from + (duration * (i + 0.5)) / n,
        );
        lines.push(`- Render: ${stillsLine(live, times)}`);
      } else {
        lines.push(
          `- Frames: \`ffmpeg -ss ${c.from.toFixed(3)} -i "${video.file}" -t ${duration.toFixed(3)} -vf fps=${rate} -q:v 3 "${opts.revisionsDir}/${revision.id}/${c.id}_range_%02d.jpg"\``,
        );
      }
    }
    if (c.reply) {
      lines.push('');
      lines.push(`**Reply:** ${c.reply}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}
