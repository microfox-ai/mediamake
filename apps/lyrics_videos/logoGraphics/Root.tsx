import React from 'react';
import { AbsoluteFill, Composition, Folder } from 'remotion';
import type { LogoCompositionProps, LogoGraphic, LogoScene } from './kit';

// Every logoGraphics/<slug>/index.tsx becomes a Studio folder of compositions. "_" folders are skipped.
const logoContext = require.context('.', true, /^\.\/[^_./][^/]*\/index\.tsx$/);

const logos = logoContext.keys().map(key => {
  const slug = key.split('/')[1];
  const logo = logoContext<{ default: LogoGraphic }>(key).default;
  if (!logo || logo.id !== slug) {
    throw new Error(`logoGraphics/${slug}/index.tsx must default-export defineLogo({ id: '${slug}', ... })`);
  }
  return logo;
});

/** The scene over an optional backdrop (transparent unless a preview asks for one). */
const withBackdrop = (Scene: React.FC): React.FC<LogoCompositionProps> => {
  const Wrapped: React.FC<LogoCompositionProps> = ({ background }) => (
    <AbsoluteFill style={{ background: background ?? 'transparent' }}>
      <Scene />
    </AbsoluteFill>
  );
  return Wrapped;
};

const components = new Map<LogoScene, React.FC<LogoCompositionProps>>();
const componentFor = (scene: LogoScene) => {
  if (!components.has(scene)) components.set(scene, withBackdrop(scene.component));
  return components.get(scene)!;
};

const SceneComposition: React.FC<{ logo: LogoGraphic; scene: LogoScene }> = ({ logo, scene }) => (
  <Composition
    id={`${logo.id}-${scene.id}`}
    component={componentFor(scene)}
    fps={logo.fps}
    width={logo.width}
    height={logo.height}
    durationInFrames={Math.round(scene.seconds * logo.fps)}
    defaultProps={{ transparent: scene.transparent ?? false } satisfies LogoCompositionProps}
  />
);

export const Root: React.FC = () => (
  <>
    {logos.map(logo => {
      const folders = [...new Set(logo.scenes.map(s => s.folder).filter((f): f is string => !!f))];
      return (
        <Folder key={logo.id} name={logo.id}>
          {logo.scenes
            .filter(s => !s.folder)
            .map(scene => (
              <SceneComposition key={scene.id} logo={logo} scene={scene} />
            ))}
          {folders.map(folder => (
            <Folder key={folder} name={folder}>
              {logo.scenes
                .filter(s => s.folder === folder)
                .map(scene => (
                  <SceneComposition key={scene.id} logo={logo} scene={scene} />
                ))}
            </Folder>
          ))}
        </Folder>
      );
    })}
  </>
);
