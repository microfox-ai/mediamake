import { create } from 'zustand';
import type { RenderRequest } from '@/lib/render-history';

/**
 * Selection + cross-panel sync for the editor's "Renders" tab.
 *
 * The Renders tab coordinates three panels:
 *  - left   (RendersTree): owns the paginated list + filters, drives selection
 *  - middle (RenderPreviewPanel): shows the rendered output for the selection
 *  - right  (HistoryContent): shows full details for the selection
 *
 * The list lives locally in RendersTree; this store only carries the current
 * selection plus lightweight signals so the list can react to updates/deletes
 * that originate in the details panel (status refresh, delete/archive).
 */
interface RendersState {
  selectedRenderId: string | null;
  selectedRequest: RenderRequest | null;

  /** Last request patched by the details panel (e.g. a status refresh). */
  lastUpdatedRequest: RenderRequest | null;
  /** Id of a render just deleted/archived from the details panel. */
  deletedRenderId: string | null;

  selectRender: (id: string | null, request: RenderRequest | null) => void;
  applyUpdatedRequest: (request: RenderRequest) => void;
  markDeleted: (id: string) => void;
  clearDeleted: () => void;
}

export const useRendersStore = create<RendersState>(set => ({
  selectedRenderId: null,
  selectedRequest: null,
  lastUpdatedRequest: null,
  deletedRenderId: null,

  selectRender: (id, request) =>
    set({ selectedRenderId: id, selectedRequest: request }),

  applyUpdatedRequest: request =>
    set(state => ({
      lastUpdatedRequest: request,
      selectedRequest:
        state.selectedRenderId === request.id ? request : state.selectedRequest,
    })),

  markDeleted: id =>
    set(state => ({
      deletedRenderId: id,
      selectedRenderId: state.selectedRenderId === id ? null : state.selectedRenderId,
      selectedRequest: state.selectedRenderId === id ? null : state.selectedRequest,
    })),

  clearDeleted: () => set({ deletedRenderId: null }),
}));
