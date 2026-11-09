/** The design canvas of the job being drawn (1280×720 for thumbnails, 1000×1000 for posters). */
import { createContext, useContext } from 'react';
import { CANVAS, type Box } from './spec.ts';

export const CanvasContext = createContext<{ w: number; h: number }>(CANVAS);

export const useCanvas = () => useContext(CanvasContext);

/** The whole canvas as a box. */
export const useFull = (): Box => {
  const { w, h } = useCanvas();
  return [0, 0, w, h];
};
