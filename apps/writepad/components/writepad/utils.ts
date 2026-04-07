import type { FileNode } from './left/types';

/** Recursively flatten a file tree into a list of file entries. */
export function flattenFiles(
  nodes: FileNode[],
): Array<{ id: string; name: string; content: string }> {
  const result: Array<{ id: string; name: string; content: string }> = [];
  for (const node of nodes) {
    if (node.type === 'file') {
      result.push({ id: node.id, name: node.name, content: node.content ?? '' });
    } else if (node.children) {
      result.push(...flattenFiles(node.children));
    }
  }
  return result;
}
