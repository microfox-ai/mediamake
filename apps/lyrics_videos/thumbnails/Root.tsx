/**
 * Every thumbnails/jobs/<job>/thumbs.json becomes a Studio folder: one 1280×720 still per variant
 * (`<job>-<ID>`), plus `<job>-sheet` (all of them, labelled) and `<job>-sheet-small` (feed size).
 * jobs/ is gitignored; "_" folders are skipped. A spec that doesn't resolve shows as `<job>-error`.
 */
import React from 'react';
import { Folder, Still } from 'remotion';
import { Sheet, type SheetProps, type SheetStyle, sheetSize } from './Sheet.tsx';
import { Thumbnail, type ThumbnailProps } from './Thumbnail.tsx';
import { CANVAS, type JobSpec, resolveJob } from './spec.ts';

const jobContext = require.context('./jobs', true, /^\.\/[^_./][^/]*\/thumbs\.json$/);

const ErrorCard: React.FC<{ message: string }> = ({ message }) => (
  <div style={{ background: '#300', color: '#fcc', font: '28px Menlo, monospace', padding: 40, width: '100%', height: '100%', whiteSpace: 'pre-wrap' }}>{message}</div>
);

const jobs = jobContext.keys().map(key => {
  const folder = key.split('/')[1];
  const spec = jobContext<JobSpec>(key);
  try {
    if (spec.job !== folder) throw new Error(`thumbs.json "job" is "${spec.job}" but the folder is "${folder}"`);
    const variants = resolveJob(spec);
    const styles: SheetStyle[] = spec.styles.map(s => ({ id: s.id, name: s.name, idea: s.idea, variants: variants.filter(v => v.style === s.id) }));
    return { job: folder, spec, variants, styles, error: undefined };
  } catch (err) {
    return { job: folder, spec, variants: [], styles: [], error: String(err instanceof Error ? err.message : err) };
  }
});

const SHEETS = { sheet: 560, 'sheet-small': 246 } as const;

export const Root: React.FC = () => (
  <>
    {jobs.map(({ job, spec, variants, styles, error }) => (
      <Folder key={job} name={job}>
        {error ? (
          <Still id={`${job}-error`} component={ErrorCard} width={CANVAS.w} height={CANVAS.h} defaultProps={{ message: error }} />
        ) : (
          <>
            {Object.entries(SHEETS).map(([name, tile]) => {
              const { w, h } = sheetSize(styles, tile);
              return (
                <Still
                  key={name}
                  id={`${job}-${name}`}
                  component={Sheet}
                  width={w}
                  height={h}
                  defaultProps={{ job, title: spec.title, styles, fonts: spec.fonts ?? [], tile } satisfies SheetProps}
                />
              );
            })}
            {variants.map(v => (
              <Still
                key={v.id}
                id={`${job}-${v.id}`}
                component={Thumbnail}
                width={CANVAS.w}
                height={CANVAS.h}
                defaultProps={{ job, variant: v, fonts: spec.fonts ?? [], guides: false } satisfies ThumbnailProps}
              />
            ))}
          </>
        )}
      </Folder>
    ))}
  </>
);
