import type { CatalogKind } from '@/lib/catalog/types';

export const homeTabs = [
  { value: 'home', label: 'Home' },
  { value: 'mcps', label: 'MCPs', kind: 'mcp' },
  { value: 'skills', label: 'Skills', kind: 'skill' },
  { value: 'apps', label: 'Apps', kind: 'app' },
  { value: 'tutorials', label: 'Tutorials', kind: 'tutorial' },
] as const satisfies { value: string; label: string; kind?: CatalogKind }[];

export type HomeTab = (typeof homeTabs)[number]['value'];
