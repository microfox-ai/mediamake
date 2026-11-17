'use client';

import * as React from 'react';
import { FileTextIcon, Loader2Icon } from 'lucide-react';
import { BrandKitSheet } from '@/components/projects/BrandKitSheet';
import type { BrandAsset, BrandKit } from '@/lib/brand-kit';
import { formatBytes } from '@/lib/projects/storage';

/**
 * The Brand tab of a space's page (project-detail.tsx): everything in the space's brand kit, a card per
 * file, with its colours and fonts. The owner and editors open the brand kit dialog to change it.
 */

const button =
  'inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted';

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
    {children}
  </p>
);

const isImage = (asset: BrandAsset) =>
  (asset.mimeType ?? '').startsWith('image/') ||
  /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(asset.path);
const isVideo = (asset: BrandAsset) =>
  (asset.mimeType ?? '').startsWith('video/') ||
  /\.(mp4|webm|mov)$/i.test(asset.path);

/** The space's brand kit: colours, fonts, then a card per file. */
export function BrandTab({
  projectId,
  projectName,
  canEdit,
  me,
}: {
  projectId: string;
  projectName: string;
  canEdit: boolean;
  me?: string;
}) {
  const [kit, setKit] = React.useState<BrandKit | null | undefined>(undefined);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);

  const load = React.useCallback(() => {
    fetch(`/api/project/brand-kit?projectId=${encodeURIComponent(projectId)}`)
      .then(async res => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(json.error ?? `Could not load (${res.status})`);
        setKit((json.brandKit as BrandKit | null) ?? null);
      })
      .catch(e => setError(e.message));
  }, [projectId]);
  React.useEffect(load, [load]);

  if (error) return <Empty>{error}</Empty>;
  if (kit === undefined)
    return (
      <p className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2Icon className="size-3.5 animate-spin" /> Loading
      </p>
    );

  const edit = canEdit && (
    <button type="button" className={button} onClick={() => setEditing(true)}>
      {kit ? 'Change the brand kit' : 'Add a brand kit'}
    </button>
  );
  const sheet = editing && (
    <BrandKitSheet
      open
      onOpenChange={open => !open && setEditing(false)}
      projectId={projectId}
      projectName={projectName}
      clientId={me}
      onSaved={load}
    />
  );

  if (!kit || (!kit.assets.length && !kit.colors.length && !kit.fonts.length))
    return (
      <div className="flex flex-col gap-3">
        <Empty>
          No brand kit yet. Logos, intros, end screens, fonts and colours the
          productions use show here. Ask Claude to pack a brand kit, or add one
          {canEdit ? ' here' : ''}.
        </Empty>
        {edit && <div>{edit}</div>}
        {sheet}
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm">
          <span className="font-semibold">{kit.name ?? projectName}</span>
          {kit.summary && (
            <span className="text-muted-foreground"> · {kit.summary}</span>
          )}
        </p>
        {edit && <div className="ml-auto">{edit}</div>}
      </div>

      {(kit.colors.length > 0 || kit.fonts.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {kit.colors.map(color => (
            <div
              key={`${color.name}-${color.hex}`}
              className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2"
            >
              <span
                className="size-6 rounded-md border"
                style={{ background: color.hex }}
                aria-hidden
              />
              <span className="text-xs">
                <span className="font-medium">{color.name}</span>{' '}
                <span className="font-mono text-muted-foreground">
                  {color.hex}
                </span>
              </span>
            </div>
          ))}
          {kit.fonts.map(font => (
            <div
              key={`${font.family}-${font.role ?? ''}`}
              className="flex items-center rounded-xl border bg-card px-3 py-2 text-xs"
            >
              <span className="font-medium">{font.family}</span>
              {font.role && (
                <span className="text-muted-foreground"> · {font.role}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {kit.assets.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {kit.assets.map(asset => (
            <li
              key={asset.path}
              className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-xs"
            >
              <a
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex aspect-video items-center justify-center bg-muted/40"
              >
                {isImage(asset) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.url}
                    alt=""
                    loading="lazy"
                    className="max-h-full max-w-full object-contain p-2"
                  />
                ) : isVideo(asset) ? (
                  <video
                    src={asset.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="max-h-full max-w-full"
                  />
                ) : (
                  <FileTextIcon
                    className="size-6 text-muted-foreground"
                    aria-hidden
                  />
                )}
              </a>
              <div className="min-w-0 p-2.5">
                <p className="truncate text-xs font-medium" title={asset.path}>
                  {asset.label ?? asset.path.split('/').pop()}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {asset.kind}
                  {asset.size ? ` · ${formatBytes(asset.size)}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No files in the brand kit yet.</Empty>
      )}
      {sheet}
    </div>
  );
}
