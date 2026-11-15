import { ExternalLinkIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { proofOf, RULE, type ReadinessMark } from '@/lib/catalog/types';

/**
 * "Made with this": the proof behind the rule (RULE), on every item's page.
 * A Ready item lists the finished productions made with it, as an admin
 * recorded them (catalog_set_readiness). A Beta item says that none is on
 * record yet, so nobody takes it for proven.
 */
export function MadeWithThis({ mark }: { mark: ReadinessMark | null }) {
  const proof = proofOf(mark);
  const ready = proof.length > 0;
  return (
    <section id="made-with-this" className="flex scroll-mt-6 flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">Made with this</h2>
        <Badge variant={ready ? 'default' : 'secondary'} title={ready ? 'Proven: a finished production was made with it' : 'Not proven yet: no finished production is on record'}>
          {ready ? 'Ready' : 'Beta'}
        </Badge>
        <p className="ml-auto text-xs font-medium text-muted-foreground">{RULE}</p>
      </div>
      {ready ? (
        <>
          <ul className="flex flex-col gap-1.5">
            {proof.map((entry, i) => (
              <li key={i} className="text-sm">
                {entry.url ? (
                  <a href={entry.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium hover:underline">
                    {entry.title} <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground" />
                  </a>
                ) : (
                  <span className="font-medium">{entry.title}</span>
                )}
              </li>
            ))}
          </ul>
          {mark?.at && (
            <p className="text-xs text-muted-foreground">
              Ready since{' '}
              <time dateTime={mark.at}>{new Date(mark.at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</time>.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nothing on record yet. It stays Beta until a finished production made with it is linked here.
        </p>
      )}
    </section>
  );
}
