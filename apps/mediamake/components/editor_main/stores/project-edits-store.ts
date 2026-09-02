import { create } from 'zustand';

export interface CloudProject {
  id: string;
  displayName: string;
  tags?: string[];
  updatedAt: string;
}

interface ProjectEditsState {
  cloudProject: CloudProject | null;
  editedProject: Partial<Pick<CloudProject, 'displayName' | 'tags'>> | null;
  localEditUpdatedAt: string | null;

  loadProject: (project: CloudProject) => void;
  updateProject: (updates: Partial<Pick<CloudProject, 'displayName' | 'tags'>>) => void;
  hasUnsavedProjectChanges: () => boolean;
  saveToDatabase: (clientId?: string) => Promise<void>;
  clear: () => void;
}

const STORAGE_KEY = 'project-edits-storage';

const loadFromStorage = (projectId: string | null): Partial<ProjectEditsState> | null => {
  if (typeof window === 'undefined' || !projectId) return null;
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}-${projectId}`);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading project edits from storage:', error);
    return null;
  }
};

const saveToStorage = (projectId: string | null, state: Partial<ProjectEditsState>) => {
  if (typeof window === 'undefined' || !projectId) return;
  try {
    localStorage.setItem(
      `${STORAGE_KEY}-${projectId}`,
      JSON.stringify({
        editedProject: state.editedProject ?? null,
        localEditUpdatedAt: state.localEditUpdatedAt ?? null,
      })
    );
  } catch (error) {
    console.error('Error saving project edits to storage:', error);
  }
};

export const useProjectEditsStore = create<ProjectEditsState>((set, get) => ({
  cloudProject: null,
  editedProject: null,
  localEditUpdatedAt: null,

  loadProject: (project) => {
    const stored = loadFromStorage(project.id);
    set({
      cloudProject: project,
      editedProject: stored?.editedProject ?? null,
      localEditUpdatedAt: stored?.localEditUpdatedAt ?? null,
    });
  },

  updateProject: (updates) => {
    const state = get();
    if (!state.cloudProject) return;

    const nextEditedProject = {
      ...(state.editedProject ?? {}),
      ...updates,
    };
    const localEditUpdatedAt = new Date().toISOString();
    const nextState = {
      editedProject: nextEditedProject,
      localEditUpdatedAt,
    };

    saveToStorage(state.cloudProject.id, nextState);
    set(nextState);
  },

  hasUnsavedProjectChanges: () => {
    const state = get();
    if (!state.localEditUpdatedAt || !state.cloudProject) {
      return false;
    }
    return (
      parseUpdatedAt(state.localEditUpdatedAt) >
      parseUpdatedAt(state.cloudProject.updatedAt)
    );
  },

  saveToDatabase: async (clientId) => {
    const state = get();
    if (!state.cloudProject) {
      throw new Error('No project loaded');
    }
    if (!state.hasUnsavedProjectChanges()) {
      return;
    }

    const displayName =
      state.editedProject?.displayName?.trim() || state.cloudProject.displayName;
    const tags = state.editedProject?.tags ?? state.cloudProject.tags ?? [];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (clientId) {
      headers['x-client-id'] = clientId;
    }

    const response = await fetch('/api/project', {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        id: state.cloudProject.id,
        displayName,
        tags,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to save project');
    }

    const savedProject = await response.json();
    const cloudProject: CloudProject = {
      id: savedProject.id ?? state.cloudProject.id,
      displayName: savedProject.displayName ?? displayName,
      tags: savedProject.tags ?? tags,
      updatedAt: savedProject.updatedAt ?? new Date().toISOString(),
    };

    const nextState = {
      cloudProject,
      editedProject: null,
      localEditUpdatedAt: null,
    };

    saveToStorage(cloudProject.id, nextState);
    set(nextState);
  },

  clear: () => {
    set({
      cloudProject: null,
      editedProject: null,
      localEditUpdatedAt: null,
    });
  },
}));

function parseUpdatedAt(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
