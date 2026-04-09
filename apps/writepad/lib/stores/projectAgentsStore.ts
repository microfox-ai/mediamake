'use client';

import { create } from 'zustand';

export interface LocalAgentStoreRecord {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

export interface ProjectAgentStoreRecord {
  id: string;
  name: string;
  prompt: string;
  baseAgentId?: string;
}

interface ProjectAgentsState {
  byProjectId: Record<
    string,
    {
      localAgents: LocalAgentStoreRecord[];
      projectAgents: ProjectAgentStoreRecord[];
      canEdit: boolean;
      loaded: boolean;
    }
  >;
  fetchAgents: (projectId: string, force?: boolean) => Promise<void>;
  upsertProjectAgent: (projectId: string, agent: ProjectAgentStoreRecord) => void;
  removeProjectAgent: (projectId: string, agentId: string) => void;
}

export const useProjectAgentsStore = create<ProjectAgentsState>((set, get) => ({
  byProjectId: {},

  async fetchAgents(projectId: string, force = false) {
    const cached = get().byProjectId[projectId];
    if (!force && cached?.loaded) return;

    const res = await fetch(`/api/projects/${projectId}/agents`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      localAgents?: LocalAgentStoreRecord[];
      projectAgents?: ProjectAgentStoreRecord[];
      canEdit?: boolean;
    };

    set((state) => ({
      byProjectId: {
        ...state.byProjectId,
        [projectId]: {
          localAgents: data.localAgents ?? [],
          projectAgents: data.projectAgents ?? [],
          canEdit: data.canEdit === true,
          loaded: true,
        },
      },
    }));
  },

  upsertProjectAgent(projectId, agent) {
    set((state) => {
      const current = state.byProjectId[projectId] ?? {
        localAgents: [],
        projectAgents: [],
        canEdit: false,
        loaded: true,
      };
      const exists = current.projectAgents.some((a) => a.id === agent.id);
      return {
        byProjectId: {
          ...state.byProjectId,
          [projectId]: {
            ...current,
            projectAgents: exists
              ? current.projectAgents.map((a) => (a.id === agent.id ? agent : a))
              : [agent, ...current.projectAgents],
          },
        },
      };
    });
  },

  removeProjectAgent(projectId, agentId) {
    set((state) => {
      const current = state.byProjectId[projectId];
      if (!current) return state;
      return {
        byProjectId: {
          ...state.byProjectId,
          [projectId]: {
            ...current,
            projectAgents: current.projectAgents.filter((a) => a.id !== agentId),
          },
        },
      };
    });
  },
}));
