import type { WorkflowDraft } from './types';

// IndexedDB utility for persisting workflow drafts
class WorkflowIndexedDBManager {
  private dbName = 'WorkflowDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('workflowDrafts')) {
          const draftStore = db.createObjectStore('workflowDrafts', {
            keyPath: 'id',
          });
          draftStore.createIndex('name', 'name', { unique: false });
          draftStore.createIndex('lastSaved', 'lastSaved', { unique: false });
          draftStore.createIndex('syncedToMongo', 'syncedToMongo', {
            unique: false,
          });
        }
      };
    });
  }

  async saveDraft(workflow: WorkflowDraft): Promise<void> {
    if (!this.db) await this.init();

    // Strip Zod schemas from nodes before saving (they can't be cloned)
    const sanitizedNodes = workflow.nodes.map(node => {
      const { data, ...rest } = node;
      
      // For agent nodes, remove schema objects but keep the path so we can reconstruct
      if (node.type === 'agent' && data) {
        const { inputSchema, outputSchema, ...safeData } = data as any;
        return {
          ...rest,
          data: safeData,
        };
      }
      
      return node;
    });

    const draft: WorkflowDraft = {
      ...workflow,
      nodes: sanitizedNodes,
      lastSaved: new Date(),
      isDraft: true,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['workflowDrafts'],
        'readwrite',
      );
      const store = transaction.objectStore('workflowDrafts');
      const request = store.put(draft);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getDraft(id: string): Promise<WorkflowDraft | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['workflowDrafts'],
        'readonly',
      );
      const store = transaction.objectStore('workflowDrafts');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async listDrafts(): Promise<WorkflowDraft[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['workflowDrafts'],
        'readonly',
      );
      const store = transaction.objectStore('workflowDrafts');
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as WorkflowDraft[];
        // Sort by last saved, most recent first
        resolve(
          results.sort(
            (a, b) => b.lastSaved.getTime() - a.lastSaved.getTime(),
          ),
        );
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDraft(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['workflowDrafts'],
        'readwrite',
      );
      const store = transaction.objectStore('workflowDrafts');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async markAsSynced(id: string): Promise<void> {
    if (!this.db) await this.init();

    const draft = await this.getDraft(id);
    if (!draft) {
      throw new Error(`Draft with id ${id} not found`);
    }

    draft.syncedToMongo = true;
    await this.saveDraft(draft);
  }

  async getUnsyncedDrafts(): Promise<WorkflowDraft[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['workflowDrafts'],
        'readonly',
      );
      const store = transaction.objectStore('workflowDrafts');
      const request = store.getAll();

      request.onsuccess = () => {
        const allDrafts = request.result as WorkflowDraft[];
        // Filter for unsynced drafts
        const unsyncedDrafts = allDrafts.filter(draft => !draft.syncedToMongo);
        resolve(unsyncedDrafts);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllDrafts(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['workflowDrafts'],
        'readwrite',
      );
      const store = transaction.objectStore('workflowDrafts');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Auto-save functionality
  private autoSaveTimers = new Map<string, NodeJS.Timeout>();

  scheduleAutoSave(workflow: WorkflowDraft, delay: number = 3000): void {
    // Clear existing timer for this workflow
    const existingTimer = this.autoSaveTimers.get(workflow.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new save
    const timer = setTimeout(() => {
      this.saveDraft(workflow).catch(error => {
        console.error('Auto-save failed:', error);
      });
      this.autoSaveTimers.delete(workflow.id);
    }, delay);

    this.autoSaveTimers.set(workflow.id, timer);
  }

  cancelAutoSave(workflowId: string): void {
    const timer = this.autoSaveTimers.get(workflowId);
    if (timer) {
      clearTimeout(timer);
      this.autoSaveTimers.delete(workflowId);
    }
  }
}

export const workflowDB = new WorkflowIndexedDBManager();

