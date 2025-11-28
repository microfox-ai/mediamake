/**
 * In-memory store for tracking local render progress
 * This is a simple implementation - for production, consider Redis or a database
 */

export interface LocalRenderProgress {
  id: string;
  compositionId: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-1
  currentFrame?: number;
  totalFrames?: number;
  estimatedTimeRemaining?: number; // milliseconds
  outputPath?: string;
  fileName: string;
  error?: string;
  startTime: number;
  endTime?: number;
  checkpointPath?: string;
  renderType: 'video' | 'audio' | 'still';
  codec: string;
  audioCodec?: string;
  quality: 'fast' | 'balanced' | 'high';
  concurrency: number;
  inputProps?: Record<string, any>;
}

// In-memory store
const localRenders = new Map<string, LocalRenderProgress>();

export class LocalRenderStore {
  /**
   * Create a new render entry
   */
  static create(data: Omit<LocalRenderProgress, 'startTime' | 'status' | 'progress'>): LocalRenderProgress {
    const render: LocalRenderProgress = {
      ...data,
      status: 'pending',
      progress: 0,
      startTime: Date.now(),
    };
    
    localRenders.set(data.id, render);
    console.log(`📝 Created local render: ${data.id}`);
    return render;
  }

  /**
   * Update render progress
   */
  static update(id: string, updates: Partial<LocalRenderProgress>): LocalRenderProgress | null {
    const existing = localRenders.get(id);
    if (!existing) {
      console.warn(`⚠️ Render not found: ${id}`);
      return null;
    }

    const updated = { ...existing, ...updates };
    localRenders.set(id, updated);
    return updated;
  }

  /**
   * Get render by ID
   */
  static get(id: string): LocalRenderProgress | null {
    return localRenders.get(id) || null;
  }

  /**
   * Get all renders
   */
  static getAll(): LocalRenderProgress[] {
    return Array.from(localRenders.values())
      .sort((a, b) => b.startTime - a.startTime); // Most recent first
  }

  /**
   * Get active renders (pending or rendering)
   */
  static getActive(): LocalRenderProgress[] {
    return Array.from(localRenders.values())
      .filter(r => r.status === 'pending' || r.status === 'rendering')
      .sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Delete a render
   */
  static delete(id: string): boolean {
    const deleted = localRenders.delete(id);
    if (deleted) {
      console.log(`🗑️ Deleted local render: ${id}`);
    }
    return deleted;
  }

  /**
   * Mark render as completed
   */
  static complete(id: string, outputPath: string): LocalRenderProgress | null {
    return this.update(id, {
      status: 'completed',
      progress: 1,
      endTime: Date.now(),
      outputPath,
    });
  }

  /**
   * Mark render as failed
   */
  static fail(id: string, error: string, checkpointPath?: string): LocalRenderProgress | null {
    return this.update(id, {
      status: 'failed',
      endTime: Date.now(),
      error,
      checkpointPath,
    });
  }

  /**
   * Mark render as cancelled
   */
  static cancel(id: string): LocalRenderProgress | null {
    return this.update(id, {
      status: 'cancelled',
      endTime: Date.now(),
    });
  }

  /**
   * Clean up old completed/failed renders (older than 24 hours)
   */
  static cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, render] of localRenders.entries()) {
      if (
        (render.status === 'completed' || render.status === 'failed' || render.status === 'cancelled') &&
        render.endTime &&
        now - render.endTime > maxAgeMs
      ) {
        localRenders.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old local renders`);
    }
    return cleaned;
  }
}

// Auto-cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    LocalRenderStore.cleanup();
  }, 60 * 60 * 1000); // 1 hour
}


