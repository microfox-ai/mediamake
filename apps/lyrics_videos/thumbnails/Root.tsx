/**
 * Every thumbnails/jobs/<job>/thumbs.json (thumbnails) or poster.json (music posters) becomes a
 * Studio folder: one still per variant (`<job>-<ID>`, at the job's canvas size), plus `<job>-sheet`
 * (all of them, labelled) and `<job>-sheet-small` (feed / streaming-list size). jobs/ is
 * gitignored; "_" folders are skipped. A spec that doesn't resolve shows as `<job>-error`.
 */
import React from 'react';
import { Composition, Folder, Still } from 'remotion';
import { Canvas, type CanvasProps } from './SpotifyCanvas.tsx';
import { Sheet, type SheetProps, type SheetStyle, sheetSize } from './Sheet.tsx';
import { Thumbnail, type ThumbnailProps } from './Thumbnail.tsx';
import { CANVAS, type JobSpec, jobKind, jobSize, resolveJob } from './spec.ts';

const jobContext = require.context('./jobs', true, /^\.\/[^_./][^/]*\/(thumbs|poster)\.json$/);

const ErrorCard: React.FC<{ message: string }> = ({ message }) => (
  <div style={{ background: '#300', color: '#fcc', font: '28px Menlo, monospace', padding: 40, width: '100%', height: '100%', whiteSpace: 'pre-wrap' }}>{message}</div>
);

const jobs = jobContext.keys().map(key => {
  const folder = key.split('/')[1];
  const spec = jobContext<JobSpec>(key);
  try {
    if (spec.job !== folder) throw new Error(`${key.split('/')[2]} "job" is "${spec.job}" but the folder is "${folder}"`);
    if (key.endsWith('poster.json') && jobKind(spec) !== 'poster') throw new Error('poster.json needs "kind": "poster"');
    const variants = resolveJob(spec);
    const styles: SheetStyle[] = spec.styles.map(s => ({ id: s.id, name: s.name, idea: s.idea, variants: variants.filter(v => v.style === s.id) }));
    return { job: folder, spec, variants, styles, error: undefined };
  } catch (err) {
    return { job: folder, spec, variants: [], styles: [], error: String(err instanceof Error ? err.message : err) };
  }
});

/** Tile widths and tiles per row: thumbnails at review / feed size, posters at review / streaming-list size. */
const SHEETS = {
  thumbnail: { sheet: { tile: 560, perRow: 99 }, 'sheet-small': { tile: 246, perRow: 99 } },
  poster: { sheet: { tile: 420, perRow: 4 }, 'sheet-small': { tile: 160, perRow: 6 } },
} as const;

export const Root: React.FC = () => (
  <>
    {jobs.map(({ job, spec, variants, styles, error }) => {
      const size = jobSize(spec);
      const kind = jobKind(spec);
      return (
      <Folder key={job} name={job}>
        {error ? (
          <Still id={`${job}-error`} component={ErrorCard} width={CANVAS.w} height={CANVAS.h} defaultProps={{ message: error }} />
        ) : (
          <>
            {Object.entries(SHEETS[kind]).map(([name, { tile, perRow }]) => {
              const { w, h } = sheetSize(styles, tile, size, perRow);
              return (
                <Still
                  key={name}
                  id={`${job}-${name}`}
                  component={Sheet}
                  width={w}
                  height={h}
                  defaultProps={
                    {
                      job,
                      title: spec.title,
                      styles,
                      fonts: spec.fonts ?? [],
                      tile,
                      size,
                      perRow,
                      hint: kind === 'poster' ? 'pick the cover' : 'pick 1, or 3 for an A/B test',
                    } satisfies SheetProps
                  }
                />
              );
            })}
            {spec.canvas && (
              <Composition
                id={`${job}-canvas`}
                component={Canvas}
                width={1080}
                height={1920}
                fps={spec.canvas.fps ?? 30}
                durationInFrames={Math.round(Math.min(8, Math.max(3, spec.canvas.seconds ?? 8)) * (spec.canvas.fps ?? 30))}
                defaultProps={{ job, canvas: spec.canvas } satisfies CanvasProps}
              />
            )}
            {variants.map(v => (
              <Still
                key={v.id}
                id={`${job}-${v.id}`}
                component={Thumbnail}
                width={size[0]}
                height={size[1]}
                defaultProps={{ job, variant: v, fonts: spec.fonts ?? [], guides: false, size } satisfies ThumbnailProps}
              />
            ))}
          </>
        )}
      </Folder>
      );
    })}
  </>
);
