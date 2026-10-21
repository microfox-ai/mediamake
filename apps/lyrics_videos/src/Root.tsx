import React from 'react';
import { Composition } from 'remotion';
import type { ProjectDefinition } from './kit/contract';
import { makeCalculateMetadata, makeProjectVideo } from './kit/ProjectVideo';

// Every projects/<slug>/video/index.tsx becomes a composition. Folders starting with "_" are skipped.
const projectContext = require.context(
  '../projects',
  true,
  /^\.\/[^_./][^/]*\/video\/index\.tsx$/,
);

const projects = projectContext.keys().map(key => {
  const slug = key.split('/')[1];
  const project = projectContext<{ default: ProjectDefinition }>(key).default;
  if (!project || project.id !== slug) {
    throw new Error(
      `projects/${slug}/video/index.tsx must default-export defineProject({ id: '${slug}', ... })`,
    );
  }
  return project;
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
        defaultProps={{ manifest: null }}
        calculateMetadata={makeCalculateMetadata(project)}
      />
    ))}
  </>
);
