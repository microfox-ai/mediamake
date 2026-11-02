'use client';

import { useMemo } from 'react';
import { filterMedia, filterProductions, filterSkills, inMode } from '@/lib/library/filter';
import { useLibraryStore } from './store';

export function useMatchingProductions() {
  const library = useLibraryStore(s => s.library);
  const query = useLibraryStore(s => s.queries.productions);
  const f = useLibraryStore(s => s.productionFilters);
  return useMemo(() => filterProductions(library, query, f), [library, query, f]);
}

export function useMatchingSkills() {
  const library = useLibraryStore(s => s.library);
  const query = useLibraryStore(s => s.queries.skills);
  const f = useLibraryStore(s => s.skillFilters);
  return useMemo(() => filterSkills(library, query, f), [library, query, f]);
}

export function useMatchingMedia() {
  const library = useLibraryStore(s => s.library);
  const query = useLibraryStore(s => s.queries.media);
  const mode = useLibraryStore(s => s.mediaMode);
  const f = useLibraryStore(s => s.facets);
  const sort = useLibraryStore(s => s.mediaSort);
  return useMemo(() => filterMedia(library, library.media.filter(m => inMode(m, mode)), query, mode === 'inbox' ? { ...f, kind: [] } : f, sort), [library, query, mode, f, sort]);
}
