"use client";

import { create } from "zustand";

export interface SavedActionChoice {
  id: string;
  actionId: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  values: Record<string, unknown>;
  createdAt: string;
}

interface SavedChoicesState {
  byActionId: Record<string, SavedActionChoice[]>;
  loading: Record<string, boolean>;
  errors: Record<string, string | undefined>;
  load: (actionId: string, options?: { force?: boolean }) => Promise<void>;
  create: (input: {
    actionId: string;
    name: string;
    description?: string;
    thumbnailUrl?: string;
    values: Record<string, unknown>;
  }) => Promise<SavedActionChoice>;
  remove: (actionId: string, id: string) => Promise<void>;
}

async function readError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => null);
  return data?.error || fallback;
}

/** Shared saved choices per choice action. Visible to every user, in every project. */
export const useSavedChoicesStore = create<SavedChoicesState>((set, get) => ({
  byActionId: {},
  loading: {},
  errors: {},

  load: async (actionId, options) => {
    const state = get();
    if (state.loading[actionId]) return;
    if (!options?.force && state.byActionId[actionId]) return;
    set((s) => ({ loading: { ...s.loading, [actionId]: true } }));
    try {
      const response = await fetch(
        `/api/action-choices?actionId=${encodeURIComponent(actionId)}`,
      );
      if (!response.ok) {
        throw new Error(await readError(response, "Failed to load saved choices"));
      }
      const choices = (await response.json()) as SavedActionChoice[];
      set((s) => ({
        byActionId: { ...s.byActionId, [actionId]: choices },
        errors: { ...s.errors, [actionId]: undefined },
      }));
    } catch (err) {
      set((s) => ({
        errors: {
          ...s.errors,
          [actionId]: err instanceof Error ? err.message : "Failed to load saved choices",
        },
      }));
    } finally {
      set((s) => ({ loading: { ...s.loading, [actionId]: false } }));
    }
  },

  create: async (input) => {
    const response = await fetch("/api/action-choices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error(await readError(response, "Failed to save choice"));
    }
    const choice = (await response.json()) as SavedActionChoice;
    set((s) => ({
      byActionId: {
        ...s.byActionId,
        [input.actionId]: [...(s.byActionId[input.actionId] ?? []), choice],
      },
    }));
    return choice;
  },

  remove: async (actionId, id) => {
    const response = await fetch(`/api/action-choices?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(await readError(response, "Failed to delete choice"));
    }
    set((s) => ({
      byActionId: {
        ...s.byActionId,
        [actionId]: (s.byActionId[actionId] ?? []).filter((c) => c.id !== id),
      },
    }));
  },
}));
