import React from 'react';
import { Composition } from 'remotion';
import type { ProjectDefinition } from './kit/contract';
import { makeCalculateMetadata, makeProjectVideo } from './kit/ProjectVideo';
import { WaveLab, waveLabMetadata } from './mediamake/WaveLab';

// Every projects/<slug>/video/index.tsx becomes a composition, and every short cut from it,
// projects/<slug>/shorts/<id>/index.tsx, one per format it is made in (make-video-music-remix-shorts:
// '<slug>-<id>-9x16'). Folders starting with "_" are skipped.
const projectContext = require.context(
  '../projects',
  true,
  /^\.\/[^_./][^/]*\/(video|shorts\/[^_./][^/]*)\/index\.tsx$/,
);

const projects = projectContext.keys().flatMap(key => {
  const slug = key.split('/')[1];
  const made = projectContext<{ default: ProjectDefinition | ProjectDefinition[] }>(key).default;
  if (key.includes('/shorts/')) {
    const shorts = Array.isArray(made) ? made : [made];
    for (const short of shorts) {
      if (!short?.window || (short.slug ?? short.id) !== slug) {
        throw new Error(`${key.slice(2)} must default-export defineShorts(...) for the project '${slug}'`);
      }
    }
    return shorts;
  }
  const project = made as ProjectDefinition;
  if (!project || project.id !== slug) {
    throw new Error(
      `projects/${slug}/video/index.tsx must default-export defineProject({ id: '${slug}', ... })`,
    );
  }
  return [project];
});

export const Root: React.FC = () => (
  <>
    {projects.map(project => (
      <Composition
        key={project.id}
        id={project.id}
        component={makeProjectVideo(project)}
        fps={project.fps}
        width={project.width}
        height={project.height}
        durationInFrames={1}
        defaultProps={{ manifest: null, edits: null }}
        calculateMetadata={makeCalculateMetadata(project)}
      />
    ))}
    {/* waveform lyric video looks on any project: npm run wave-lab */}
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
  </>
);
