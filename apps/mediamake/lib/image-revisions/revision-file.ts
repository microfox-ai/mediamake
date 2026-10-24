import {
  IMAGE_REVISION_SCHEMA,
  formatOf,
  type ImageComment,
  type ImagePin,
  type ImageRevision,
  type ImageSetIndex,
} from './types';

export { nextRevisionId, revisionIdFromFile, STATUS_LABEL } from '@/lib/revisions/revision-file';

export const revisionsDirName = (job: string) => `${job}.revisions`;

export function nextCommentId(comments: ImageComment[]): string {
  const max = comments.reduce(
    (m, c) => Math.max(m, Number(c.id.replace(/\D/g, '')) || 0),
    0,
  );
  return `c${String(max + 1).padStart(2, '0')}`;
}

export function createRevision(id: string, job: string): ImageRevision {
  const now = new Date().toISOString();
  return {
    schema: IMAGE_REVISION_SCHEMA,
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

type LegacyComment = Partial<ImageComment> & { thumbs?: unknown; pin?: Partial<ImagePin> & { thumb?: string } };

/** Tolerates hand-edited files (Claude adds replies and statuses) and thumbnail-era files (`thumbs`, `pin.thumb`). */
export function normalizeRevision(raw: unknown, id: string): ImageRevision {
  const r = (raw ?? {}) as Partial<ImageRevision>;
  const base = createRevision(id, typeof r.job === 'string' ? r.job : '');
  return {
    ...base,
    ...r,
    schema: IMAGE_REVISION_SCHEMA,
    id,
    status:
      r.status === 'ready' || r.status === 'resolved' ? r.status : 'draft',
    final: strings(r.final),
    keep: strings(r.keep),
    drop: strings(r.drop),
    renders: r.renders && typeof r.renders === 'object' ? r.renders : {},
    comments: (Array.isArray(r.comments) ? (r.comments as LegacyComment[]) : []).map(c => {
      const { thumbs, pin, ...rest } = c;
      const image = pin?.image ?? pin?.thumb;
      return {
        ...rest,
        id: String(c.id ?? ''),
        createdAt: String(c.createdAt ?? ''),
        images: strings(c.images ?? thumbs),
        text: String(c.text ?? ''),
        status: c.status === 'done' ? 'done' : 'open',
        ...(pin && image ? { pin: { image, x: Number(pin.x ?? 0), y: Number(pin.y ?? 0), ...(pin.size ? { size: pin.size } : {}) } } : {}),
      };
    }),
  };
}

export function snapshotFileName(revisionId: string, c: ImageComment): string {
  return `${revisionId}/${c.id}_${(c.pin?.image ?? c.images[0] ?? 'x').replace(/[^\w.-]/g, '_')}.jpg`;
}

/** Images whose file changed after the revision last saw them (re-rendered). */
export function staleImages(
  revision: ImageRevision,
  renders: Record<string, number>,
): string[] {
  return Object.entries(revision.renders)
    .filter(([id, t]) => renders[id] !== undefined && renders[id] !== t)
    .map(([id]) => id);
}

const list = (ids: string[]) => (ids.length ? ids.join(', ') : '—');

/** The workflow-specific part of the instructions, when the set says which workflow made it. */
const howTo = (index: ImageSetIndex | null, job: string) => {
  const workflow = index?.workflow;
  if (workflow === 'make-thumbnail' || workflow === 'make-music-poster' || (!workflow && formatOf(index).thumbnail))
    return `Finals → \`npm run thumbs -w lyrics_videos -- pick ${job} <IDs>\`${index?.kind === 'poster' ? ' (add `--to=<release folder>` to copy the cover there as cover.jpg)' : ''}; keep → \`thumbs keep\`. Fix each comment as a change to that variant or as a new variant (IDs never change once seen) and re-render those IDs.`;
  return 'Act on finals, keeps and drops, and fix each comment, the way the workflow that made these images works (re-generate or edit those images, keeping their IDs).';
};

/** What Claude reads first. Regenerated on every save. */
export function revisionToMarkdown(
  revision: ImageRevision,
  index: ImageSetIndex | null,
  opts: { revisionsDir: string },
): string {
  const format = formatOf(index);
  const variants = new Map(
    (index?.styles ?? []).flatMap(s =>
      s.variants.map(v => [v.id, { ...v, style: s.name }] as const),
    ),
  );
  const describe = (id: string) => {
    const v = variants.get(id);
    return v ? `**${id}** (${v.style}${v.note ? `: ${v.note}` : ''}; \`${v.file}\`)` : `**${id}**`;
  };
  const lines: string[] = [
    `# ${revision.title} · ${format.noun} for ${index?.title ?? revision.job}`,
    '',
    `- Set: \`${revision.job}\`${index?.location ? ` (${index.location})` : ''}`,
    ...(index?.workflow ? [`- Made by: ${index.workflow}`] : []),
    ...(index?.source ? [`- Source: ${index.source}`] : []),
    `- Status: ${revision.status}`,
    `- Updated: ${revision.updatedAt}`,
    '',
    `For Claude${index?.workflow ? ` (${index.workflow} skill)` : ''}: act on this when the status is \`ready\`. ` +
      howTo(index, revision.job) +
      ' Dropped IDs are not worth more work. Then set each comment\'s `status` to `done` with a short `reply` and ' +
      'the revision\'s `status` to `resolved` in the JSON.',
    '',
  ];
  if (revision.final.length) {
    const heading = format.poster
      ? '## Cover'
      : format.thumbnail && revision.final.length > 1
        ? "## Finals for YouTube's A/B test (Test & Compare)"
        : revision.final.length > 1
          ? `## ${format.finalLabel}s`
          : `## ${format.finalLabel}`;
    lines.push(`${heading}\n\n${revision.final.map(id => `- ${describe(id)}`).join('\n')}`, '');
  }
  lines.push(`## Keep as is\n\n${list(revision.keep)}`, '');
  lines.push(`## Dropped\n\n${list(revision.drop)}`, '');
  lines.push('## Comments', '');
  if (!revision.comments.length) lines.push('None.', '');
  for (const c of revision.comments) {
    lines.push(
      `### ${c.id} · ${c.images.join(', ')}${c.status === 'done' ? ' · done' : ''}`,
      '',
      c.text,
      '',
    );
    if (c.images.length) lines.push(`- About: ${c.images.map(describe).join('; ')}`);
    if (c.pin) {
      const size = c.pin.size ?? index?.size;
      lines.push(
        `- Spot on ${c.pin.image}: ` +
          (size ? `x ${Math.round(c.pin.x * size[0])}, y ${Math.round(c.pin.y * size[1])} px of ${size[0]}×${size[1]} ` : '') +
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
 * A crop around a pinned spot at 2× (half the image's width and height), with a
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
