'use client';

import * as React from 'react';
import { CloudIcon, MonitorIcon } from 'lucide-react';
import { CopyButton, CopyLine } from './copy-line';
import { CLOUD_LINE, cloudSetup, envLines, placeName, setupText, type SetupItem } from '@/lib/space/cloud-setup';
import type { LinkedItemView } from '@/lib/space/links';
import type { SpaceView } from '@/lib/space/space';

const list = (names: string[]) => (names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

function Step({ n, title, hint, action, children }: { n: number; title: string; hint: React.ReactNode; /** A button beside the title. */ action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background" aria-hidden>
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{title}</h3>
          {action}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        <div className="mt-2 flex flex-col gap-2">{children}</div>
      </div>
    </div>
  );
}

/** One thing to add: the line to copy, and under it what it is for. */
function Row({ line, label, children }: { line: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <CopyLine line={line} label={label} />
      <p className="mt-1 text-xs text-muted-foreground">{children}</p>
    </div>
  );
}

/**
 * What a Claude cloud environment needs to run this space (a cloud session, a routine): the repos to
 * add and the keys to set, read from what the space's computers reported (lib/space/cloud-setup). Names
 * only: a key's value is set in Claude and never comes here.
 */
export function CloudSetupCard({
  space,
  linked = [],
  personal = false,
  storage,
  name,
}: {
  space: SpaceView | null;
  linked?: LinkedItemView[];
  personal?: boolean;
  /** The host of MediaMake's file storage. */ storage?: string;
  /** The project's name, for the copied setup. */ name?: string;
}) {
  const setup = React.useMemo(() => {
    const items = (view: SpaceView | null): SetupItem[] => (view?.items ?? []).map(item => ({ kind: item.kind, name: item.name, title: item.title, needs: item.needs }));
    return cloudSetup({
      personal,
      space: space && { repo: space.repo, repoUrl: space.repoUrl, items: items(space) },
      linked: linked.map(item => ({ repo: item.repo, repoUrl: item.repoUrl, title: item.title, items: items(item.space) })),
      storage,
    });
  }, [space, linked, personal, storage]);
  const place = placeName(space?.repo);

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <CloudIcon className="size-4 text-muted-foreground" aria-hidden /> Run it in the cloud
        </h2>
        <CopyButton text={setupText(setup, { name: personal ? 'your space' : name, place })} label="the whole cloud setup">
          Copy setup instructions
        </CopyButton>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        For a Claude cloud session or a routine, with no computer switched on. Open the cloud environment&apos;s settings in Claude and add what is listed here; a new session picks it up.
      </p>

      <div className="mt-4 flex flex-col gap-5">
        <Step n={1} title="Add these repositories" hint="Under the environment's repositories. Claude's GitHub app needs access to each.">
          {setup.repos.map(repo => (
            <Row key={repo.repo} line={repo.repo} label={`the repository ${repo.repo}`}>
              {repo.why}
              {repo.url && (
                <>
                  {' · '}
                  <a href={repo.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                    Open on GitHub
                  </a>
                </>
              )}
            </Row>
          ))}
          {!space && (
            <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
              {personal ? 'Your space has no repository yet.' : 'This space has no repository yet.'} It gets one with its first skill (ask Claude to make one, or{' '}
              <span className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">mm space new skill &lt;name&gt;</span>), and shows here after.
            </p>
          )}
        </Step>

        <Step
          n={2}
          title="Set these keys"
          hint="As the environment's variables, by exactly these names. Only the names are known here: the values stay in Claude. Copy all keys copies them as .env lines with empty values."
          action={
            <CopyButton text={envLines(setup, place)} label="all keys as .env lines with empty values">
              Copy all keys
            </CopyButton>
          }
        >
          {setup.keys.map(key => (
            <Row key={key.env} line={key.env} label={`the name ${key.env}`}>
              {key.why ?? `${key.title} key`}
              {key.usedBy.length > 0 && ` · Used by ${list(key.usedBy)}`}
              {key.from && (
                <>
                  {' · '}
                  <a href={key.from} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                    Get one
                  </a>
                </>
              )}
            </Row>
          ))}
          <Row line={`MEDIAMAKE_PLACE=${place}`} label="the environment's name">
            A name for this environment, any you like. It shows under Where it runs.
          </Row>
          {setup.unknown.length > 0 && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
              {list(setup.unknown)} {setup.unknown.length === 1 ? "doesn't" : "don't"} say what {setup.unknown.length === 1 ? 'it needs' : 'they need'} yet, so a key may be missing from this list. Ask Claude to add a run sheet
              (&ldquo;Where it runs&rdquo;) to {setup.unknown.length === 1 ? 'that skill' : 'those skills'}.
            </p>
          )}
          {setup.hosts.length > 0 && (
            <p className="text-xs text-muted-foreground">
              If the environment&apos;s network access is Limited, also allow {setup.hosts.length === 1 ? 'this domain' : 'these domains'}:{' '}
              {setup.hosts.map((host, i) => (
                <React.Fragment key={host}>
                  {i > 0 && ', '}
                  <span className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{host}</span>
                </React.Fragment>
              ))}
              .
            </p>
          )}
        </Step>

        <Step n={3} title="Start each session with this line" hint="In the routine's instructions, or as your first message. It connects the space, links its skills and says what is still missing.">
          <CopyLine line={CLOUD_LINE} label="the cloud setup line" />
        </Step>
      </div>

      {setup.device.length > 0 && (
        <div className="mt-5 rounded-lg border bg-muted/30 p-3">
          <h3 className="flex items-center gap-2 text-xs font-semibold">
            <MonitorIcon className="size-3.5 text-muted-foreground" aria-hidden /> Stays on a computer
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">A cloud session can&apos;t have these, so the steps that need them run on a computer that does.</p>
          <ul className="mt-2 flex flex-col gap-1 text-xs">
            {setup.device.map(d => (
              <li key={d.need}>
                <span className="font-medium">{d.label.replace(/^./, c => c.toUpperCase())}</span>
                <span className="text-muted-foreground"> · {list(d.usedBy)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
