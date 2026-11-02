import type { CatalogKind } from '@/lib/catalog/types';

export const homeTabs = [
  { value: 'home', label: 'Home' },
  { value: 'mcps', label: 'MCPs', kinds: ['mcp'] },
  { value: 'skills', label: 'Skills', kinds: ['skill'] },
  { value: 'apps', label: 'Apps', kinds: ['app'] },
  // courses are tutorials played in order: they share the tab
  { value: 'tutorials', label: 'Tutorials', kinds: ['course', 'tutorial'] },
] as const satisfies { value: string; label: string; kinds?: readonly CatalogKind[] }[];

export type HomeTab = (typeof homeTabs)[number]['value'];
