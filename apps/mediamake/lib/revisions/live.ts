import type React from 'react';
import {
  changedFiles,
  compileProject,
  type CompiledProject,
} from '@/lib/remotion-editor/compile';
import type { FolderSource } from '@/lib/remotion-editor/folder-source';
import { swapManifestAssets } from '@/lib/remotion-editor/edits';
import {
  emptyEdits,
  type Edits,
  type LyricManifest,
} from '@/lib/remotion-editor/types';
import { getSubdir } from './fs';
import { buildLiveMap } from './live-map';
import type { VideoMap } from './types';

/*
 * Reviewing a lyric project live: the composition plays in a Remotion Player, compiled in the
 * browser from the project's folder (the way /remotion-editor does it), so notes can be left on a
 * video that was never rendered. Revisions go where a render's would, beside the renders:
 *
 *   out/<slug>/live.revisions/rev-001.json   (and .md, and rev-001/ with the stills)
 *
 * Stills are rendered in the browser (@remotion/web-renderer) when a comment is added.
 */

/** The name a live review goes by where a video's file name would be: live.revisions/. */
export const LIVE_VIDEO = 'live';

export interface LiveProject {
  slug: string;
  title: string;
  source: FolderSource;
  compiled: CompiledProject;
  Video: React.ComponentType<Record<string, unknown>>;
  /** asset paths already turned into URLs the page can load */
  manifest: LyricManifest;
  edits: Edits;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  map: VideoMap;
  /** where the shots came from (manifest.json: one per lyric line), named where a render's map file would be */
  mapSource: string;
  /** out/<slug>/, created when missing: live.revisions/ goes in it */
  outDir: FileSystemDirectoryHandle;
  /** the newest modified time of the code it was compiled from */
  codeTime: number;
  /** modified time of video/edits.json (0 without one) */
  editsMtime: number;
}

type Windowed = { window?: { from: number; to: number }; tail?: number };

const withAssetUrls = (
  source: FolderSource,
  m: LyricManifest,
): LyricManifest => ({
  ...m,
  audio: { ...m.audio, src: source.assetUrl(m.audio.src) },
  assets: Object.fromEntries(
    Object.entries(m.assets ?? {}).map(([k, v]) => [k, source.assetUrl(v)]),
  ),
});

/** Compiles a project from the folder and reads what reviewing it needs. */
export async function loadLiveProject(
  source: FolderSource,
  slug: string,
  onProgress?: (message: string) => void,
): Promise<LiveProject> {
  await source.prepare(slug, onProgress);
  onProgress?.('Compiling…');
  const compiled = await compileProject(source, slug);
  const base = `projects/${slug}`;
  const texts = await source.readTexts([
    `${base}/manifest.json`,
    `${base}/video/edits.json`,
    `${base}/video/shots.json`,
  ]);
  const manifestText = texts[`${base}/manifest.json`];
  if (!manifestText) {
    throw new Error(
      `${slug} has no manifest. Run: npm run prepare-project -w lyrics_videos -- ${slug}`,
    );
  }
  const manifest = JSON.parse(manifestText) as LyricManifest;
  let rawEdits: unknown = {};
  try {
    rawEdits = JSON.parse(texts[`${base}/video/edits.json`] ?? '{}');
  } catch {
    // a broken edits.json: review without it, as a render would
  }
  const { project, kit } = compiled;
  const edits = { ...emptyEdits(), ...kit.parseEdits(rawEdits) } as Edits;
  const { window: win, tail = 0 } = project as typeof project & Windowed;
  const fps = project.fps;
  const durationInFrames = Math.max(
    1,
    win
      ? Math.round(win.to * fps) - Math.round(win.from * fps)
      : Math.ceil((manifest.audio.duration + tail) * fps),
  );
  const editsMtime =
    (await source.listFiles(slug).catch(() => [])).find(
      f => f.path === `${base}/video/edits.json`,
    )?.mtime ?? 0;
  const { map, fromShotsJson } = buildLiveMap({
    slug,
    manifest,
    shotsJson: texts[`${base}/video/shots.json`] ?? null,
    fps,
    duration: durationInFrames / fps,
    width: project.width,
    height: project.height,
    window: win,
  });
  const out = await getSubdir(source.root, 'out', true);
  const outDir = out ? await getSubdir(out, slug, true) : null;
  if (!outDir) throw new Error('Could not create out/ in the folder');
  return {
    slug,
    title: manifest.title || slug,
    source,
    compiled,
    Video: kit.makeProjectVideo(project) as React.ComponentType<
      Record<string, unknown>
    >,
    // files swapped in the editor in place of the ones the manifest names
    manifest: withAssetUrls(source, swapManifestAssets(manifest, edits.assets)),
    edits,
    fps,
    width: project.width,
    height: project.height,
    durationInFrames,
    map,
    mapSource: fromShotsJson
      ? `${base}/video/shots.json`
      : `${base}/manifest.json`,
    outDir,
    codeTime: Math.max(0, ...Object.values(compiled.files)),
    editsMtime,
  };
}

/** Code or edits.json of the project changed on disk since it compiled (Claude fixed notes). */
export async function liveChangedOnDisk(live: LiveProject): Promise<boolean> {
  const files = await live.source.listFiles(live.slug).catch(() => null);
  if (!files) return false;
  const now = new Map(files.map(f => [f.path, f.mtime]));
  const editsPath = `projects/${live.slug}/video/edits.json`;
  return (
    changedFiles(live.compiled, now).length > 0 ||
    (now.get(editsPath) ?? 0) !== live.editsMtime
  );
}

let mediaTags: Promise<void> | null = null;

/**
 * One frame of the composition, rendered in the browser at full size. The Player shows DOM, which
 * a canvas can't read; this renders the same component again, off screen, into pixels.
 */
export async function renderLiveFrame(
  live: LiveProject,
  frame: number,
  signal?: AbortSignal,
): Promise<HTMLCanvasElement> {
  const { renderStillOnWeb } = await import('@remotion/web-renderer');
  // @microfox/remotion atoms play media through tags registered from @remotion/media
  mediaTags ??= Promise.all([
    import('@remotion/media'),
    import('@microfox/remotion'),
  ]).then(([media, microfox]) =>
    microfox.registerClientSideMediaTags({
      Audio: media.Audio,
      Video: media.Video,
    }),
  );
  await mediaTags;
  const still = await renderStillOnWeb({
    composition: {
      component: live.Video,
      id: `live-${live.slug}`,
      width: live.width,
      height: live.height,
      fps: live.fps,
      durationInFrames: live.durationInFrames,
      defaultProps: {},
    },
    inputProps: { manifest: live.manifest, edits: live.edits },
    frame: Math.min(live.durationInFrames - 1, Math.max(0, frame)),
    delayRenderTimeoutInMilliseconds: 20_000,
    signal: signal ?? null,
  } as Parameters<typeof renderStillOnWeb>[0]);
  const pixels = await still.canvas();
  const canvas = document.createElement('canvas');
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  canvas.getContext('2d')!.drawImage(pixels, 0, 0);
  return canvas;
}
