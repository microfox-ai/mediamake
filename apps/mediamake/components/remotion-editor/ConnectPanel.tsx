'use client';

import { FolderOpenIcon, ServerIcon, TriangleAlertIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/revisions/keyboard';
import { REPO_AVAILABLE, useEditor } from './store';

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60_000);
  if (m < 60) return m <= 1 ? 'just now' : `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};

/**
 * Where to open lyric projects from, shown on the stage until a source has projects: a folder
 * on this computer (any site, Chromium), or the repo itself on `next dev`.
 */
export function ConnectPanel() {
  const support = useEditor(s => s.support);
  const source = useEditor(s => s.source);
  const folders = useEditor(s => s.folders);
  const pending = useEditor(s => s.pendingFolder);
  const projectsError = useEditor(s => s.projectsError);
  const noProjects = useEditor(s => !!s.source && !s.projectsError && s.projects.length === 0);
  const pickFolder = useEditor(s => s.pickFolder);
  const openFolder = useEditor(s => s.openFolder);
  const forgetFolder = useEditor(s => s.forgetFolder);
  const openRepo = useEditor(s => s.openRepo);

  const unsupported = support && !support.supported;
  return (
    <div className="max-w-md space-y-5 px-6 text-center text-sm text-neutral-300">
      {pending && !source ? (
        <div>
          <p className="mb-4">
            Chrome needs one click to let this page read{' '}
            <span className="font-medium text-white">{pending.name}</span> again and save edits in it.
          </p>
          <Button
            className="bg-white text-neutral-950 hover:bg-neutral-200"
            onClick={() => void openFolder(pending.handle)}
          >
            <FolderOpenIcon className="size-4" /> Allow access to {pending.name}
          </Button>
        </div>
      ) : (
        <div>
          <p className="mb-1 text-base font-medium text-white">
            {source ? `No lyric projects in ${source.label}` : 'Open your lyrics_videos folder'}
          </p>
          <p className="mb-5 text-neutral-400">
            Pick <code className="text-neutral-200">apps/lyrics_videos</code> (or the repo). Projects
            compile here in the browser; nothing is uploaded. Edits are saved beside each project as{' '}
            <code className="text-neutral-200">video/edits.json</code>, and renders pick them up.
          </p>
          {unsupported ? (
            <p className="flex items-start gap-2 text-left text-amber-300">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
              {support.reason === 'insecure'
                ? 'Open this page over https or on localhost: browsers only allow folder access on secure pages.'
                : 'Opening a folder needs Chrome, Edge, Arc or Brave. This browser cannot open folders on your computer.'}
            </p>
          ) : (
            <Button
              className="bg-white text-neutral-950 hover:bg-neutral-200"
              onClick={() => void pickFolder()}
            >
              <FolderOpenIcon className="size-4" /> Choose folder…
            </Button>
          )}
        </div>
      )}

      {projectsError && (
        <p className="whitespace-pre-wrap break-words font-mono text-xs text-red-300">
          {projectsError}
        </p>
      )}
      {noProjects && (
        <p className="text-xs text-neutral-400">
          A project is a <code>projects/&lt;slug&gt;/video/index.tsx</code>; folders starting with “_”
          are skipped.
        </p>
      )}

      {!unsupported && folders.length > 0 && (
        <div className="text-left">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Opened before
          </p>
          <ul className="divide-y divide-neutral-800 rounded-md border border-neutral-800">
            {folders.map(f => (
              <li key={f.id} className="flex items-center gap-2 px-3 py-1.5">
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-neutral-200 hover:text-white"
                  onClick={() => void openFolder(f.handle)}
                >
                  {f.name}
                </button>
                <span className="shrink-0 text-[11px] text-neutral-500">{ago(f.openedAt)}</span>
                <Hint label="Forget this folder">
                  <button
                    type="button"
                    className="shrink-0 text-neutral-500 hover:text-neutral-200"
                    onClick={() => void forgetFolder(f.id)}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </Hint>
              </li>
            ))}
          </ul>
        </div>
      )}

      {REPO_AVAILABLE && source?.kind !== 'repo' && (
        <Button
          variant="ghost"
          size="sm"
          className="text-neutral-400 hover:text-white"
          onClick={() => void openRepo()}
        >
          <ServerIcon className="size-3.5" /> Use the local repo instead
        </Button>
      )}
    </div>
  );
}
