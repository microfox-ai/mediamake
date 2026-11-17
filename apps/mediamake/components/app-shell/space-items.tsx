import { ArrowDownIcon, ArrowUpIcon, CheckIcon } from 'lucide-react';
import type { SpaceItemView, SpaceView } from '@/lib/space/space';

/**
 * The items of one space (lib/space): a member's own, or a project's. Each
 * row says what the item is and, in one pill, where it stands: the same on
 * every computer, not sent yet, or older somewhere, with the one command
 * that settles it. Used by Mine and by a project's page.
 */

const KIND: Record<SpaceItemView['kind'], string> = { skill: 'Skill', mcp: 'MCP', app: 'App' };
const names = (devices: { name: string }[]) => devices.map(device => device.name).join(', ');

const pill = 'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium';

function SyncPill({ item, computers }: { item: SpaceItemView; computers: number }) {
  if (item.sync === 'unsent') {
    return (
      <span className={`${pill} bg-amber-500/15 text-amber-800 dark:text-amber-200`}>
        <ArrowUpIcon className="size-3" aria-hidden />
        Not sent yet
      </span>
    );
  }
  if (item.sync === 'behind') {
    return (
      <span className={`${pill} bg-sky-500/15 text-sky-800 dark:text-sky-200`}>
        <ArrowDownIcon className="size-3" aria-hidden />
        Update waiting
      </span>
    );
  }
  return (
    <span className={`${pill} bg-emerald-500/15 text-emerald-800 dark:text-emerald-200`}>
      <CheckIcon className="size-3" aria-hidden />
      {computers > 1 ? `Same on all ${computers} computers` : 'Up to date'}
    </span>
  );
}

const cmd = 'rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground';

/** What to do about an item that isn't the same everywhere, in one line. */
function NextStep({ item }: { item: SpaceItemView }) {
  if (item.sync === 'synced') return null;
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      {item.sync === 'unsent' ? (
        <>
          Changed on {names(item.unsentOn)}. Run <span className={cmd}>mm space sync --yes</span> there to send it.
        </>
      ) : (
        <>
          {names(item.behindOn)} {item.behindOn.length === 1 ? 'has' : 'have'} an older copy or none. Run <span className={cmd}>mm space sync</span> there.
        </>
      )}
    </p>
  );
}

export function SpaceItems({ space }: { space: SpaceView }) {
  return (
    <ul className="divide-y">
      {space.items.map(item => (
        <li key={item.key} className="py-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium">{item.title}</span>
            <span className="rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{KIND[item.kind]}</span>
            {item.version && <span className="text-xs tabular-nums text-muted-foreground">v{item.version.replace(/^v/, '')}</span>}
            <span className="ml-auto">
              <SyncPill item={item} computers={space.devices.length} />
            </span>
          </div>
          {item.summary && <p className="mt-0.5 line-clamp-2 max-w-prose text-xs text-muted-foreground">{item.summary}</p>}
          {item.media ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Uses {item.media} media file{item.media === 1 ? '' : 's'} from the media library.
            </p>
          ) : null}
          <NextStep item={item} />
        </li>
      ))}
    </ul>
  );
}
