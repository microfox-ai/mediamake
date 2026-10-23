import React from 'react';
import { AbsoluteFill, Composition, Folder } from 'remotion';
import type { LogoCompositionProps, LogoGraphic, LogoScene, SceneProps } from './kit';

// Every brands/<brand>/graphics/index.tsx becomes a Studio folder of compositions (brands/ is
// gitignored: each brand's source lives with its kit). "_" folders are skipped.
const brandContext = require.context('../brands', true, /^\.\/[^_./][^/]*\/graphics\/index\.tsx$/);

const logos = brandContext.keys().map(key => {
  const brand = key.split('/')[1];
  const logo = brandContext<{ default: LogoGraphic }>(key).default;
  if (!logo?.id) throw new Error(`brands/${brand}/graphics/index.tsx must default-export defineLogo({ id, ... })`);
  return { ...logo, brand };
});
type Brand = (typeof logos)[number];

/** The scene over an optional backdrop (transparent unless a preview asks for one). */
const withBackdrop = (Scene: React.FC<SceneProps>): React.FC<LogoCompositionProps> => {
  const Wrapped: React.FC<LogoCompositionProps> = ({ background, guides }) => (
    <AbsoluteFill style={{ background: background ?? 'transparent' }}>
      <Scene guides={guides} />
    </AbsoluteFill>
  );
  return Wrapped;
};

const components = new Map<LogoScene, React.FC<LogoCompositionProps>>();
const componentFor = (scene: LogoScene) => {
  if (!components.has(scene)) components.set(scene, withBackdrop(scene.component));
  return components.get(scene)!;
};

const SceneComposition: React.FC<{ logo: Brand; scene: LogoScene }> = ({ logo, scene }) => (
  <Composition
    id={`${logo.id}-${scene.id}`}
    component={componentFor(scene)}
    fps={logo.fps}
    width={scene.width ?? logo.width}
    height={scene.height ?? logo.height}
    durationInFrames={Math.round(scene.seconds * logo.fps)}
    defaultProps={
      { transparent: scene.transparent ?? false, guides: false, preview: logo.preview, brand: logo.brand, scene: scene.id } satisfies LogoCompositionProps
    }
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
