import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Sequence,
  staticFile,
  useVideoConfig,
  type CalculateMetadataFunction,
} from 'remotion';
import { Audio } from '@remotion/media';
import { CompositionProvider } from '@microfox/remotion';
import { resolveAt, type ProjectDefinition } from './contract';
import {
  applyPropEdits,
  editable,
  EditsApplier,
  layerKeys,
  loadEdits,
  type Edits,
} from './edits';
import { asset, ManifestContext, SectionContext } from './hooks';
import { ManifestSchema, type Manifest } from './manifest';

export type ProjectVideoProps = {
  /** null in Studio: loaded from projects/<slug>/manifest.json. Pass it as inputProps to render elsewhere. */
  manifest: Manifest | null;
  /** null or missing: loaded from projects/<slug>/video/edits.json when there is one. */
  edits?: Edits | null;
};

/** Turns a project's layers into Sequences, with the song playing underneath. With `window`, the
 *  whole song timeline is shifted so the video shows only that stretch (a short). */
export const makeProjectVideo = (
  project: ProjectDefinition,
): React.FC<ProjectVideoProps> => {
  const keys = layerKeys(project.layers);
  const ProjectVideo: React.FC<ProjectVideoProps> = ({ manifest, edits }) => {
    const { fps } = useVideoConfig();
    const win = project.window;
    const start = win ? Math.round(win.from * fps) : 0;
    const end = win ? Math.round(win.to * fps) : Infinity;
    const fadeIn = (win?.fadeIn ?? 0) * fps;
    const fadeOut = (win?.fadeOut ?? 0.4) * fps;
    const layerProps = useMemo(
      () => project.layers.map((l, i) => applyPropEdits(l.props, edits?.props?.[keys[i]])),
      [edits],
    );
    if (!manifest) throw new Error(`No manifest for ${project.id}`);

    const song = (
      <>
            {project.layers.map((l, i) => {
              const section = resolveAt(l.at, manifest, l.name);
              const from = Math.round(section.from * fps);
              const durationInFrames = Math.max(
                1,
                Math.round(section.to * fps) - from,
              );
              const Scene = l.scene;
              return (
                <Sequence
                  key={i}
                  from={from}
                  durationInFrames={durationInFrames}
                  name={l.name ?? section.label}
                >
                  {/* the whole layer can be moved in the editor; this adds no stacking context until it is */}
                  <AbsoluteFill
                    {...editable(`layer:${keys[i]}`, { label: l.name ?? section.label })}
                    data-edit-layer={keys[i]}
                  >
                    <SectionContext.Provider value={section}>
                      <Scene {...layerProps[i]} manifest={manifest} section={section} />
                    </SectionContext.Provider>
                  </AbsoluteFill>
                </Sequence>
              );
            })}
            {/* frames here are song frames (the window's shift is undone): fade in after `start`, out before `end` */}
            <Audio
              src={asset(manifest.audio.src)}
              volume={win ? f => Math.min(1, fadeIn > 0 ? Math.max(0, (f - start) / fadeIn) : 1, fadeOut > 0 ? Math.max(0, (end - f) / fadeOut) : 1) : undefined}
            />
      </>
    );

    return (
      // CompositionProvider lets @microfox/remotion atoms (waveforms, captions, ...) be used inside scenes.
      <CompositionProvider
        value={{ root: [], duration: manifest.audio.duration }}
      >
        <ManifestContext.Provider value={manifest}>
          <AbsoluteFill style={{ backgroundColor: 'black' }}>
            {win ? (
              <Sequence from={-start} name={`song ${win.from.toFixed(2)}–${win.to.toFixed(2)} s`}>
                {song}
              </Sequence>
            ) : song}
            <EditsApplier elements={edits?.elements} />
          </AbsoluteFill>
        </ManifestContext.Provider>
      </CompositionProvider>
    );
  };
  ProjectVideo.displayName = `Project(${project.id})`;
  return ProjectVideo;
};

const loadManifest = async (
  slug: string,
  signal: AbortSignal,
): Promise<Manifest> => {
  const res = await fetch(staticFile(`${slug}/manifest.json`), {
    signal,
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(
      `No manifest for "${slug}". Run: npm run prepare-project -w lyrics_videos -- ${slug}`,
    );
  }
  return ManifestSchema.parse(await res.json());
};

export const makeCalculateMetadata =
  (project: ProjectDefinition): CalculateMetadataFunction<ProjectVideoProps> =>
  async ({ props, abortSignal }) => {
    const slug = project.slug ?? project.id;
    const manifest =
      props.manifest ?? (await loadManifest(slug, abortSignal));
    // a short shares its project's folder, not its edits (those are laid out for the full video)
    const edits = props.edits ?? (project.window ? null : await loadEdits(slug, abortSignal));
    // a window ends on the song frame before `to` (rounded like its start, which the video is shifted by):
    // rounding the length up showed the next section's first frame at the end
    const frames = project.window
      ? Math.round(project.window.to * project.fps) - Math.round(project.window.from * project.fps)
      : Math.ceil((manifest.audio.duration + (project.tail ?? 0)) * project.fps);
    return {
      durationInFrames: Math.max(1, frames),
      props: { ...props, manifest, edits },
    };
  };
