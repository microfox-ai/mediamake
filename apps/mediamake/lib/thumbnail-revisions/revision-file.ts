import {
  THUMB_REVISION_SCHEMA,
  type ThumbComment,
  type ThumbIndex,
  type ThumbRevision,
} from './types';

export { nextRevisionId, revisionIdFromFile, STATUS_LABEL } from '@/lib/revisions/revision-file';

export const revisionsDirName = (job: string) => `${job}.revisions`;

export function nextCommentId(comments: ThumbComment[]): string {
  const max = comments.reduce(
    (m, c) => Math.max(m, Number(c.id.replace(/\D/g, '')) || 0),
    0,
  );
  return `c${String(max + 1).padStart(2, '0')}`;
}

export function createRevision(id: string, job: string): ThumbRevision {
  const now = new Date().toISOString();
  return {
    schema: THUMB_REVISION_SCHEMA,
    id,
    title: `Revision ${Number(id.replace(/\D/g, '')) || 1}`,
    status: 'draft',
    job,
    createdAt: now,
    updatedAt: now,
    final: [],
    keep: [],
    drop: [],
    comments: [],
    renders: {},
  };
}

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/** Tolerates hand-edited files (Claude adds replies and statuses). */
export function normalizeRevision(raw: unknown, id: string): ThumbRevision {
  const r = (raw ?? {}) as Partial<ThumbRevision>;
  const base = createRevision(id, typeof r.job === 'string' ? r.job : '');
  return {
    ...base,
    ...r,
    schema: THUMB_REVISION_SCHEMA,
    id,
    status:
      r.status === 'ready' || r.status === 'resolved' ? r.status : 'draft',
    final: strings(r.final),
    keep: strings(r.keep),
    drop: strings(r.drop),
    renders: r.renders && typeof r.renders === 'object' ? r.renders : {},
    comments: (Array.isArray(r.comments) ? r.comments : []).map(c => ({
      ...c,
      thumbs: strings(c.thumbs),
      text: String(c.text ?? ''),
      status: c.status === 'done' ? 'done' : 'open',
    })),
  };
}

export function snapshotFileName(revisionId: string, c: ThumbComment): string {
  return `${revisionId}/${c.id}_${c.pin?.thumb ?? c.thumbs[0] ?? 'x'}.jpg`;
}

/** Thumbnails whose render changed after the revision last saw them. */
export function staleThumbs(
  revision: ThumbRevision,
  renders: Record<string, number>,
): string[] {
  return Object.entries(revision.renders)
    .filter(([id, t]) => renders[id] !== undefined && renders[id] !== t)
    .map(([id]) => id);
}

const list = (ids: string[]) => (ids.length ? ids.join(', ') : '—');

/** What Claude reads first. Regenerated on every save. */
export function revisionToMarkdown(
  revision: ThumbRevision,
  index: ThumbIndex | null,
  opts: { revisionsDir: string },
): string {
  const variants = new Map(
    (index?.styles ?? []).flatMap(s =>
      s.variants.map(v => [v.id, { ...v, style: s.name }] as const),
    ),
  );
  const describe = (id: string) => {
    const v = variants.get(id);
    return v ? `**${id}** (${v.style}${v.note ? `: ${v.note}` : ''})` : `**${id}**`;
  };
  const [w, h] = index?.size ?? [1280, 720];
  const lines: string[] = [
    `# ${revision.title} · thumbnails for ${index?.title ?? revision.job}`,
    '',
    `- Job: \`${revision.job}\` (apps/lyrics_videos/thumbnails/jobs/${revision.job}/thumbs.json)`,
    `- Status: ${revision.status}`,
    `- Updated: ${revision.updatedAt}`,
    '',
    'For Claude (make-thumbnail skill): act on this when the status is `ready`. Finals → ' +
      '`thumbs pick`; keep → `thumbs keep`; dropped IDs are not worth more work. Fix each ' +
      'comment as a change to that variant or as a new variant (IDs never change once seen), ' +
      're-render the IDs, then set each comment\'s `status` to `done` with a short `reply` and ' +
      'the revision\'s `status` to `resolved` in the JSON.',
    '',
  ];
  if (revision.final.length) {
    lines.push(
      revision.final.length === 1
        ? `## Final\n\n- ${describe(revision.final[0])}`
        : `## Finals for YouTube's A/B test (Test & Compare)\n\n${revision.final.map(id => `- ${describe(id)}`).join('\n')}`,
      '',
    );
  }
  lines.push(`## Keep as is\n\n${list(revision.keep)}`, '');
  lines.push(`## Dropped\n\n${list(revision.drop)}`, '');
  lines.push('## Comments', '');
  if (!revision.comments.length) lines.push('None.', '');
  for (const c of revision.comments) {
    lines.push(
      `### ${c.id} · ${c.thumbs.join(', ')}${c.status === 'done' ? ' · done' : ''}`,
      '',
      c.text,
      '',
    );
    if (c.thumbs.length) lines.push(`- About: ${c.thumbs.map(describe).join('; ')}`);
    if (c.pin) {
      lines.push(
        `- Spot on ${c.pin.thumb}: x ${Math.round(c.pin.x * w)}, y ${Math.round(c.pin.y * h)} px of ${w}×${h} ` +
          `(${Math.round(c.pin.x * 100)}% across, ${Math.round(c.pin.y * 100)}% down)`,
      );
    }
    if (c.snapshot) lines.push(`- Zoomed crop: \`${opts.revisionsDir}/${c.snapshot}\``);
    if (c.reply) lines.push(`- Reply: ${c.reply}`);
    lines.push('');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

/**
 * A crop around a pinned spot at 2× (640×360 of a 1280×720 thumbnail), with a
 * ring on the spot, so Claude sees exactly what the comment is about.
 */
export async function pinSnapshot(
  image: HTMLImageElement,
  pin: { x: number; y: number },
): Promise<Blob> {
  const iw = image.naturalWidth;
  const ih = image.naturalHeight;
  const cw = Math.round(iw / 2);
  const ch = Math.round(ih / 2);
  const px = pin.x * iw;
  const py = pin.y * ih;
  const sx = Math.min(Math.max(px - cw / 2, 0), iw - cw);
  const sy = Math.min(Math.max(py - ch / 2, 0), ih - ch);
  const canvas = document.createElement('canvas');
  canvas.width = cw * 2;
  canvas.height = ch * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, sx, sy, cw, ch, 0, 0, canvas.width, canvas.height);
  const x = (px - sx) * 2;
  const y = (py - sy) * 2;
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#000';
  ctx.beginPath();
  ctx.arc(x, y, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffcc00';
  ctx.stroke();
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.9),
  );
}
