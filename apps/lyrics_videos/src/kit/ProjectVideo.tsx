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

/** Turns a project's layers into Sequences, with the song playing underneath. */
export const makeProjectVideo = (
  project: ProjectDefinition,
): React.FC<ProjectVideoProps> => {
  const keys = layerKeys(project.layers);
  const ProjectVideo: React.FC<ProjectVideoProps> = ({ manifest, edits }) => {
    const { fps } = useVideoConfig();
    const layerProps = useMemo(
      () => project.layers.map((l, i) => applyPropEdits(l.props, edits?.props?.[keys[i]])),
      [edits],
    );
    if (!manifest) throw new Error(`No manifest for ${project.id}`);

    return (
      // CompositionProvider lets @microfox/remotion atoms (waveforms, captions, ...) be used inside scenes.
      <CompositionProvider
        value={{ root: [], duration: manifest.audio.duration }}
      >
        <ManifestContext.Provider value={manifest}>
          <AbsoluteFill style={{ backgroundColor: 'black' }}>
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
            <Audio src={asset(manifest.audio.src)} />
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
    const manifest =
      props.manifest ?? (await loadManifest(project.id, abortSignal));
    const edits = props.edits ?? (await loadEdits(project.id, abortSignal));
    return {
      durationInFrames: Math.max(
        1,
        Math.ceil((manifest.audio.duration + (project.tail ?? 0)) * project.fps),
      ),
      props: { ...props, manifest, edits },
    };
  };
