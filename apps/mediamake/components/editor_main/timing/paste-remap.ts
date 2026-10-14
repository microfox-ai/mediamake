import type { AppliedNode, TimingDiagnostic } from './types';

function collectIds(node: AppliedNode, into: Set<string>) {
  into.add(node.id);
  for (const child of node.children) collectIds(child, into);
}

/**
 * After a duplicate/paste, locks that pointed at nodes inside the copied
 * subtree follow the new ids. Locks that pointed outside the subtree are
 * kept and reported.
 */
export function remapLocksOnPaste(
  root: AppliedNode,
  idMap: Map<string, string>,
): { node: AppliedNode; diagnostics: TimingDiagnostic[] } {
  const originalIds = new Set<string>();
  collectIds(root, originalIds);
  const diagnostics: TimingDiagnostic[] = [];

  const remap = (node: AppliedNode): AppliedNode => {
    const nextId = idMap.get(node.id) ?? node.id;
    let timing = node.timing;
    if (timing.kind === 'lock' || timing.kind === 'durationLock') {
      const mapped = idMap.get(timing.refId);
      if (mapped) {
        timing = { ...timing, refId: mapped };
      } else if (!originalIds.has(timing.refId)) {
        diagnostics.push({
          nodeId: nextId,
          code: 'external-lock',
          message: `"${node.name}" locks to "${timing.refId}", which is outside the pasted subtree.`,
        });
      }
    }
    return {
      ...node,
      id: nextId,
      timing,
      children: node.children.map(remap),
    };
  };

  return { node: remap(root), diagnostics };
}
