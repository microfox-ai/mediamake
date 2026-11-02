import React from 'react';
import { AbsoluteFill, OffthreadVideo } from 'remotion';
import type { SceneProps } from '../../../../src/kit';
import { src } from '../theme';

/** 5.2–19.2 s: the approved series opener, as it is (picture and sound). */
export const Opener: React.FC<SceneProps> = () => (
  <AbsoluteFill>
    <OffthreadVideo src={src('kit2/opener.mp4')} style={{ width: '100%', height: '100%' }} />
  </AbsoluteFill>
);
