import React from 'react';
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
import { asset, ManifestContext, SectionContext } from './hooks';
import { ManifestSchema, type Manifest } from './manifest';

export type ProjectVideoProps = {
  /** null in Studio: loaded from projects/<slug>/manifest.json. Pass it as inputProps to render elsewhere. */
  manifest: Manifest | null;
};

/** Turns a project's layers into Sequences, with the song playing underneath. */
export const makeProjectVideo = (
  project: ProjectDefinition,
): React.FC<ProjectVideoProps> => {
  const ProjectVideo: React.FC<ProjectVideoProps> = ({ manifest }) => {
    const { fps } = useVideoConfig();
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
                  <SectionContext.Provider value={section}>
                    <Scene {...l.props} manifest={manifest} section={section} />
                  </SectionContext.Provider>
                </Sequence>
              );
            })}
            <Audio src={asset(manifest.audio.src)} />
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
    return {
      durationInFrames: Math.max(
        1,
        Math.ceil((manifest.audio.duration + (project.tail ?? 0)) * project.fps),
      ),
      props: { ...props, manifest },
    };
  };
