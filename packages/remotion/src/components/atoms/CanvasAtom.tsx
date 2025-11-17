import React from 'react';
import { z } from 'zod';
import { BaseRenderableProps, ComponentConfig } from '../../core/types';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export const CanvasAtomDataProps = z.object({
  className: z.string().optional(),
  style: z.record(z.string(), z.any()).optional(),
});

export type CanvasAtomDataProps = z.infer<typeof CanvasAtomDataProps>;

// The component's direct props should be simple.
// It doesn't need the full BaseRenderableProps when used by another component.
interface CanvasAtomProps {
    data: CanvasAtomDataProps;
    id?: string;
}

export const Atom = React.forwardRef<HTMLCanvasElement, CanvasAtomProps>(({ data, id }, ref) => {
  const { className, style } = data;

  return (
    <canvas ref={ref} className={className} style={style} id={id}>
    </canvas>
  );
});

export const config: ComponentConfig = {
  displayName: 'CanvasAtom',
  type: 'atom',
  isInnerSequence: false,
  props: CanvasAtomDataProps, // The config points to the Zod schema for data
};
