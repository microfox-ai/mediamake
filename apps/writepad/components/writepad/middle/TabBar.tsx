'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OpenTab } from './types';

interface TabBarProps {
  tabs: OpenTab[];
  activeFileId: string | null;
  unsavedIds: Set<string>;
  draftedIds?: Set<string>;
  onSelect: (fileId: string) => void;
  onClose: (fileId: string) => void;
}

export function TabBar({ tabs, activeFileId, unsavedIds, draftedIds, onSelect, onClose }: TabBarProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center overflow-x-auto bg-muted border-b border-border">
      {tabs.map((tab) => {
        const isActive = tab.fileId === activeFileId;
        const isUnsaved = unsavedIds.has(tab.fileId);
        const isDrafted = draftedIds?.has(tab.fileId) ?? false;

        return (
          <div
            key={tab.fileId}
            onClick={() => onSelect(tab.fileId)}
            className={cn(
              'group relative flex shrink-0 cursor-pointer items-center gap-1.5 border-r border-border px-3 py-2 text-[12px] transition-colors',
              isActive
                ? 'border-t border-t-violet-500 bg-background text-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <span className="max-w-[120px] truncate">{tab.name}</span>

            <button
              onClick={(e) => { e.stopPropagation(); onClose(tab.fileId); }}
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors',
                isUnsaved || isDrafted
                  ? 'text-muted-foreground'
                  : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground',
              )}
              title="Close tab"
            >
              {isUnsaved ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 group-hover:hidden" />
                  <X size={11} className="hidden group-hover:block" />
                </>
              ) : isDrafted ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400 group-hover:hidden" title="Has draft changes" />
                  <X size={11} className="hidden group-hover:block" />
                </>
              ) : (
                <X size={11} />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
