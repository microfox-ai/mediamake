import { create } from 'zustand';
import { Preset, DatabasePreset } from '@/components/editor/presets/types';
import { predefinedPresets } from '@/components/editor/presets/registry/registry/presets-registry';

interface PresetsState {
  // Predefined presets (from registry)
  predefinedPresets: Preset[];
  
  // Database presets
  databasePresets: DatabasePreset[];
  isLoadingDatabase: boolean;
  
  // Filtered presets by tags
  basicBlocksPresets: (Preset | DatabasePreset)[];
  captionPresets: (Preset | DatabasePreset)[];
  
  // Actions
  fetchDatabasePresets: () => Promise<void>;
  refreshPresets: () => void;
}

export const usePresetsStore = create<PresetsState>((set, get) => {
  // Initialize with predefined presets
  const initialPredefined = predefinedPresets;
  
  // Filter presets by tags
  const filterPresetsByTag = (presets: (Preset | DatabasePreset)[], tag: string) => {
    return presets.filter(p => 
      p.metadata.tags?.some(t => t.toLowerCase() === tag.toLowerCase())
    );
  };
  
  // Calculate filtered presets
  const calculateFilteredPresets = (predefined: Preset[], database: DatabasePreset[]) => {
    const allPresets = [...predefined, ...database];
    return {
      basicBlocksPresets: filterPresetsByTag(allPresets, 'basic'),
      captionPresets: filterPresetsByTag(allPresets, 'captions'),
    };
  };
  
  const initialFiltered = calculateFilteredPresets(initialPredefined, []);
  
  return {
    predefinedPresets: initialPredefined,
    databasePresets: [],
    isLoadingDatabase: false,
    basicBlocksPresets: initialFiltered.basicBlocksPresets,
    captionPresets: initialFiltered.captionPresets,
    
    fetchDatabasePresets: async () => {
      set({ isLoadingDatabase: true });
      try {
        const response = await fetch('/api/presets?type=database');
        const data = await response.json();
        const databasePresets = data.presets || [];
        
        const state = get();
        const filtered = calculateFilteredPresets(state.predefinedPresets, databasePresets);
        
        set({
          databasePresets,
          isLoadingDatabase: false,
          basicBlocksPresets: filtered.basicBlocksPresets,
          captionPresets: filtered.captionPresets,
        });
      } catch (error) {
        console.error('Failed to fetch database presets:', error);
        set({ isLoadingDatabase: false });
      }
    },
    
    refreshPresets: () => {
      const state = get();
      const filtered = calculateFilteredPresets(state.predefinedPresets, state.databasePresets);
      set({
        basicBlocksPresets: filtered.basicBlocksPresets,
        captionPresets: filtered.captionPresets,
      });
    },
  };
});
