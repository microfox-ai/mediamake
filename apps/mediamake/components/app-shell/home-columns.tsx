import Link from 'next/link';
import { HealthBadge } from '@/components/catalog/health';
import { KIND_LABEL, type HomeColumn, type HomeRow, type MemberKind } from '@/lib/app-shell/member';
import { detailsKey } from '@/lib/app-shell/details-key';
import { BetaBadge, ItemActions, TierBadge } from './item-bits';
import { DetailsButton } from './item-details';

/** Home's three columns (lib/app-shell/member › homeColumns): most used, then installed lately. */

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const times = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function whyLine({ why }: HomeRow): string {
  if (why.type === 'installed') return `Installed ${day(why.at)}`;
  if (why.type === 'opens') return `Opened ${times(why.count ?? 0, 'time')}, last ${day(why.at)}`;
  const via = why.via?.length ? ` of ${why.via.length === 1 ? why.via[0] : `${why.via.length} skills that use it`}` : '';
  return `${times(why.count ?? 0, 'run')}${via}, last ${day(why.at)}`;
}

const EMPTY: Record<MemberKind, { text: string; link: string }> = {
  skill: {
    text: 'No runs reported yet. A computer with MediaMake reports each skill you run (its name and time only, mm usage shows what is sent); in the Claude apps, mm-use does.',
    link: 'Find a skill',
  },
  mcp: { text: 'MCPs count through your skills: each run of a skill counts for the MCPs it works with.', link: 'Find an MCP' },
  app: { text: 'Open an app from here, Explore or Mine and it is counted.', link: 'Find an app' },
};

function Row({ row }: { row: HomeRow }) {
  const { item } = row;
  return (
    <li className="flex items-center gap-2 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {item ? (
            <DetailsButton detailsKey={detailsKey.catalog(item.id)} href={item.page} className="truncate text-sm font-medium">
              {item.title}
            </DetailsButton>
          ) : (
            <DetailsButton detailsKey={detailsKey.local(row.name)} className="truncate font-mono text-sm">
              {row.name}
            </DetailsButton>
          )}
          {item?.beta && <BetaBadge />}
          {item && <TierBadge item={item} />}
          {item?.failed && <HealthBadge health="failed" note={item.healthNote} />}
          {row.updateAvailable && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium">Update out</span>}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {whyLine(row)}
          {!item && (
            <>
              {' · '}
              <Link href="/app/mine" className="underline underline-offset-2">
                your own skill
              </Link>
            </>
          )}
        </p>
      </div>
      {item && <ItemActions item={item} updateAvailable={row.updateAvailable} />}
    </li>
  );
}

function Rows({ label, rows }: { label: string; rows: HomeRow[] }) {
  if (!rows.length) return null;
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <ul className="divide-y">
        {rows.map(row => (
          <Row key={`${row.item?.id ?? row.name}:${row.why.type}`} row={row} />
        ))}
      </ul>
    </div>
  );
}

export function HomeColumns({ columns, days }: { columns: HomeColumn[]; days: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {columns.map(column => {
        const empty = !column.mostUsed.length && !column.recent.length;
        const explore = `/app/explore?kind=${column.kind}`;
        return (
          <section key={column.kind} className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4" aria-label={KIND_LABEL[column.kind].many}>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold">{KIND_LABEL[column.kind].many}</h2>
              <Link href={explore} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Explore all
              </Link>
            </div>
            <Rows label={`Most used, last ${days} days`} rows={column.mostUsed} />
            <Rows label="Installed lately" rows={column.recent} />
            {(empty || !column.mostUsed.length) && (
              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                <p>{EMPTY[column.kind].text}</p>
                {empty && (
                  <Link href={explore} className="mt-2 inline-block font-medium text-foreground underline underline-offset-4">
                    {EMPTY[column.kind].link}
                  </Link>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
