import React, { useEffect, useState } from 'react';
import { Composition, continueRender, delayRender } from 'remotion';
import type { ProjectDefinition } from './kit/contract';
import { makeCalculateMetadata, makeProjectVideo, type ProjectVideoProps } from './kit/ProjectVideo';
import { WaveLab, waveLabMetadata } from './mediamake/WaveLab';
import { AmvLab, amvLabMetadata } from './amv/Lab';

// Every projects/<slug>/video/index.tsx becomes a composition, and every short cut from it,
// projects/<slug>/shorts/<id>/index.tsx, one per format it is made in (make-video-music-remix-shorts:
// '<slug>-<id>-9x16'). Folders starting with "_" are skipped.

/** A project's video/index.tsx must default-export defineProject({ id: '<slug>' }). */
const checkProject = (slug: string, made: ProjectDefinition | ProjectDefinition[] | undefined): ProjectDefinition => {
  const project = made as ProjectDefinition;
  if (!project || project.id !== slug) {
    throw new Error(`projects/${slug}/video/index.tsx must default-export defineProject({ id: '${slug}', ... })`);
  }
  return project;
};

/** A short's index.tsx must default-export defineShorts(...) (one definition per format) for its own project. */
const checkShorts = (key: string, slug: string, made: ProjectDefinition | ProjectDefinition[]): ProjectDefinition[] => {
  const shorts = Array.isArray(made) ? made : [made];
  for (const short of shorts) {
    if (!short?.window || (short.slug ?? short.id) !== slug) {
      throw new Error(`${key.slice(2)} must default-export defineShorts(...) for the project '${slug}'`);
    }
  }
  return shorts;
};

const slugOf = (key: string) => key.split('/')[1];
const isShort = (key: string) => key.includes('/shorts/');
type Made = { default: ProjectDefinition | ProjectDefinition[] };

const ProjectComposition: React.FC<{ project: ProjectDefinition }> = ({ project }) => (
  <Composition
    id={project.id}
    component={makeProjectVideo(project)}
    fps={project.fps}
    width={project.width}
    height={project.height}
    durationInFrames={1}
    defaultProps={{ manifest: null, edits: null }}
    calculateMetadata={makeCalculateMetadata(project)}
  />
);

/** The two lab compositions every bundle has. */
const Labs: React.FC = () => (
  <>
    {/* waveform lyric video looks on any project: mm wave-lab */}
    <Composition
      id="wave-lab"
      component={WaveLab}
      fps={30}
      width={1920}
      height={1080}
      durationInFrames={1}
      defaultProps={{ manifest: null, look: null, label: null }}
      calculateMetadata={waveLabMetadata}
    />
    {/* one GPU device of the AMV engine on a project's footage: mm amv <slug> --lab */}
    <Composition
      id="amv-lab"
      component={AmvLab}
      fps={30}
      width={1920}
      height={1080}
      durationInFrames={30}
      defaultProps={{ slug: null, device: null, a: null }}
      calculateMetadata={amvLabMetadata}
    />
  </>
);

let Root: React.FC;

if (process.env.NODE_ENV === 'development') {
  // Remotion Studio (refactor step B1, P12). Every project's code used to load when Studio started, each
  // with its Google fonts: slow with 100+ projects, and fonts timed out. Here a project's video loads when
  // its composition is opened (webpack compiles it then too), from a lazy context. Its size and frame rate
  // come from its definition at that moment, through calculateMetadata. Shorts load when Studio starts,
  // since their composition ids come from their code; few projects have them. Renders (production
  // bundles) take the plain path below, unchanged. `mm preview <slug>` opens Studio with one project.
  const videos = require.context('../projects', true, /^\.\/[^_./][^/]*\/video\/index\.tsx$/, 'lazy');
  const shortsContext = require.context('../projects', true, /^\.\/[^_./][^/]*\/shorts\/[^_./][^/]*\/index\.tsx$/, 'lazy');
  // `mm preview <slug>` narrows both contexts to the project's video and shorts (scripts/only-project.ts)
  const videoKeys = videos.keys().filter(k => !isShort(k));
  const shortKeys = shortsContext.keys().filter(isShort);

  const loaded = new Map<string, Promise<ProjectDefinition>>();
  const load = (key: string) => {
    if (!loaded.has(key)) loaded.set(key, (videos(key) as unknown as Promise<Made>).then(m => checkProject(slugOf(key), m.default)));
    return loaded.get(key)!;
  };

  const LazyProject: React.FC<{ k: string }> = ({ k }) => {
    const slug = slugOf(k);
    const lazyComponent = (): Promise<{ default: React.ComponentType<ProjectVideoProps> }> => load(k).then(project => ({ default: makeProjectVideo(project) }));
    return (
      <Composition
        id={slug}
        lazyComponent={lazyComponent}
        // placeholders until the project loads: calculateMetadata gives its own
        fps={30}
        width={1920}
        height={1080}
        durationInFrames={1}
        defaultProps={{ manifest: null, edits: null }}
        calculateMetadata={async args => {
          const project = await load(k);
          const meta = await makeCalculateMetadata(project)(args);
          return { ...meta, fps: project.fps, width: project.width, height: project.height };
        }}
      />
    );
  };

  Root = () => {
    const [shorts, setShorts] = useState<ProjectDefinition[] | null>(shortKeys.length ? null : []);
    const [handle] = useState(() => (shortKeys.length ? delayRender('Loading the projects’ shorts') : null));
    useEffect(() => {
      if (!shortKeys.length) return;
      Promise.all(shortKeys.map(k => (shortsContext(k) as unknown as Promise<Made>).then(m => checkShorts(k, slugOf(k), m.default))))
        .then(all => setShorts(all.flat()))
        .finally(() => handle !== null && continueRender(handle));
    }, [handle]);
    return (
      <>
        {videoKeys.map(k => (
          <LazyProject key={k} k={k} />
        ))}
        {(shorts ?? []).map(short => (
          <ProjectComposition key={short.id} project={short} />
        ))}
        <Labs />
      </>
    );
  };
} else {
  // renders: every project the bundle holds (render-project bundles one: scripts/only-project.ts)
  const projectContext = require.context('../projects', true, /^\.\/[^_./][^/]*\/(video|shorts\/[^_./][^/]*)\/index\.tsx$/);
  const projects = projectContext.keys().flatMap(key => {
    const made = projectContext<Made>(key).default;
    return isShort(key) ? checkShorts(key, slugOf(key), made) : [checkProject(slugOf(key), made)];
  });
  Root = () => (
    <>
      {projects.map(project => (
        <ProjectComposition key={project.id} project={project} />
      ))}
      <Labs />
    </>
  );
}

export { Root };
