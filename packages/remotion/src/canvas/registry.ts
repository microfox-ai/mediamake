import { CanvasOpDefinition } from './types';

/**
 * Canvas op registry — the canvas-level mirror of the component registry.
 * Presets reference ops by name in pipeline JSON; the runtime resolves them
 * here. Op schemas make the whole library introspectable by the editor UI
 * and the AI preset generator.
 */

const ops = new Map<string, CanvasOpDefinition>();

export const registerCanvasOp = <P, S>(
  def: CanvasOpDefinition<P, S>
): void => {
  ops.set(def.name, def as CanvasOpDefinition);
};

export const getCanvasOp = (name: string): CanvasOpDefinition | undefined =>
  ops.get(name);

export const getRegisteredCanvasOps = (): {
  name: string;
  displayName: string;
  description?: string;
  schema?: CanvasOpDefinition['schema'];
}[] =>
  Array.from(ops.values()).map(({ name, displayName, description, schema }) => ({
    name,
    displayName,
    description,
    schema,
  }));
