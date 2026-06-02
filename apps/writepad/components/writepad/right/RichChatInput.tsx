'use client';

/**
 * RichChatInput — contentEditable input that supports inline attachment chips,
 * model selection, and a web-search toggle (globe icon).
 *
 * Chips are <span contentEditable="false" data-attachment-id="..."> nodes
 * injected at the cursor position. On submit the DOM is walked to produce a
 * RichSegment[] array the parent uses to build the AI prompt.
 *
 * Keyboard:  Enter → send,  Shift+Enter → newline,  Ctrl+L → attach pending
 */

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Send, Square, Globe, Check, ChevronsUpDown, GitBranch, FileText, Search, MessageSquare, Bot, Sparkles, ListChecks, Image, Video, Music, FileIcon, Loader2, Folder, FolderTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContextAttachment, RichSegment, ProjectFile, ChatMode, MediaAttachment, ChatContextRef } from './types';
import { CHAT_MODELS, getModelDef } from '@/lib/ai-models';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface RichChatInputProps {
  /** New attachment waiting to be inserted into the input. */
  pendingAttachment: ContextAttachment | null;
  onAttachmentConsumed: () => void;
  isLoading: boolean;
  onStop: () => void;
  onSend: (
    segments: RichSegment[],
    plainText: string,
    attachments: Record<string, ContextAttachment>,
    mediaAttachments: Record<string, MediaAttachment>,
    chatContexts: Record<string, ChatContextRef>,
  ) => void;
  selectedModelId: string;
  onModelChange: (id: string) => void;
  selectedAgentId: string;
  onAgentChange: (id: string) => void;
  agentOptions: Array<{ id: string; label: string }>;
  webSearchEnabled: boolean;
  onWebSearchToggle: () => void;
  chatMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  canUseChat: boolean;
  projectId: string;
  currentSessionId: string;
  /** @-mention support */
  getAllFiles?: () => ProjectFile[];
  getFileContent?: (fileId: string) => string;
  allBranches?: string[];
  currentBranch?: string;
  contextBranches?: string[];
  onBranchAdd?: (branch: string) => void;
}

// ── Mediamake media item (from /api/mediamake-media) ─────────────────────────

interface MediaItem {
  id: string;
  filePath: string;
  fileName?: string | null;
  contentType?: string | null;
  contentMimeType?: string | null;
}

// ── Past session (from /api/projects/{id}/chats) ──────────────────────────────

interface PastSession {
  id: string;
  title: string;
  updatedAt: number;
}

// ── Mode config ───────────────────────────────────────────────────────────────

const CHAT_MODES: Array<{
  id: ChatMode;
  label: string;
  icon: React.ElementType;
  tooltip: string;
  placeholder: string;
}> = [
  {
    id: 'ask',
    label: 'Ask',
    icon: MessageSquare,
    tooltip: 'Ask — conversational replies, no file editing',
    placeholder: "Ask anything — I'll respond conversationally (no file edits)",
  },
  {
    id: 'agent',
    label: 'Agent',
    icon: Bot,
    tooltip: 'Agent — full file read/write/create/delete access',
    placeholder: 'Ask anything… Ctrl+L attaches editor selection inline',
  },
  {
    id: 'auto',
    label: 'Auto',
    icon: Sparkles,
    tooltip: 'Auto — best agent selected automatically for your request',
    placeholder: "Ask anything — I'll pick the best agent for your request",
  },
  {
    id: 'plan',
    label: 'Plan',
    icon: ListChecks,
    tooltip: 'Plan — creates a structured TODO plan (no file editing)',
    placeholder: "Describe what you want to build — I'll create a step-by-step plan",
  },
];

// ── @-mention detection helpers ───────────────────────────────────────────────

function getAtMentionState(div: HTMLDivElement): { query: string; rect: DOMRect } | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !div.contains(sel.anchorNode)) return null;

  // Build text from start of div to cursor
  const preRange = document.createRange();
  preRange.setStart(div, 0);
  try { preRange.setEnd(sel.anchorNode!, sel.anchorOffset); } catch { return null; }
  const textBefore = preRange.toString();

  const match = textBefore.match(/@(\S*)$/);
  if (!match) return null;

  const cursorRect = sel.getRangeAt(0).getBoundingClientRect();
  return { query: match[1], rect: cursorRect };
}

function deleteAtMentionText(query: string): void {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0).cloneRange();
  const charsToDelete = 1 + query.length; // '@' + query
  try {
    range.setStart(sel.anchorNode!, sel.anchorOffset - charsToDelete);
    range.deleteContents();
  } catch { /* skip */ }
}

// ── @-mention dropdown ────────────────────────────────────────────────────────

type MentionTab = 'files' | 'branches' | 'chats' | 'media';

const MEDIA_ICONS: Record<string, React.ElementType> = {
  image: Image,
  video: Video,
  audio: Music,
  document: FileIcon,
};

function AtMentionDropdown({
  query,
  rect,
  files,
  branches,
  contextBranches,
  currentBranch,
  projectId,
  currentSessionId,
  onSelectFile,
  onSelectFolder,
  onSelectRoot,
  onSelectBranch,
  onSelectMedia,
  onSelectChat,
  onClose,
}: {
  query: string;
  rect: DOMRect;
  files: ProjectFile[];
  branches: string[];
  contextBranches: string[];
  currentBranch?: string;
  projectId: string;
  currentSessionId: string;
  onSelectFile: (file: ProjectFile) => void;
  onSelectFolder: (folder: ProjectFile) => void;
  onSelectRoot: () => void;
  onSelectBranch: (branch: string) => void;
  onSelectMedia: (item: MediaItem) => void;
  onSelectChat: (session: PastSession) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<MentionTab>(files.length > 0 ? 'files' : 'branches');
  const dropRef = useRef<HTMLDivElement>(null);

  // Media async state
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  // Chats async state
  const [chatSessions, setChatSessions] = useState<PastSession[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Fetch media when on media tab
  useEffect(() => {
    if (tab !== 'media') return;
    setMediaLoading(true);
    const params = new URLSearchParams({ limit: '24' });
    if (query) params.set('q', query);
    fetch(`/api/mediamake-media?${params}`)
      .then((r) => r.json())
      .then((d: { files?: MediaItem[] }) => setMediaItems(d.files ?? []))
      .catch(() => setMediaItems([]))
      .finally(() => setMediaLoading(false));
  }, [tab, query]);

  // Fetch chats when on chats tab
  useEffect(() => {
    if (tab !== 'chats') return;
    setChatsLoading(true);
    fetch(`/api/projects/${projectId}/chats`)
      .then((r) => r.json())
      .then((data: Array<{ id: string; title: string; updatedAt: string }>) => {
        const sessions: PastSession[] = (data ?? [])
          .filter((s) => s.id !== currentSessionId)
          .map((s) => ({ id: s.id, title: s.title, updatedAt: new Date(s.updatedAt).getTime() }))
          .slice(0, 30);
        setChatSessions(sessions);
      })
      .catch(() => setChatSessions([]))
      .finally(() => setChatsLoading(false));
  }, [tab, projectId, currentSessionId]);

  const filteredFiles = useMemo(() => {
    const q = query.toLowerCase();
    return files.filter((f) => f.type === 'file' && f.fileName.toLowerCase().includes(q)).slice(0, 20);
  }, [files, query]);

  const filteredFolders = useMemo(() => {
    const q = query.toLowerCase();
    return files.filter((f) => f.type === 'folder' && f.fileName.toLowerCase().includes(q)).slice(0, 10);
  }, [files, query]);

  const showRoot = useMemo(() => {
    const q = query.toLowerCase();
    return q === '' || 'root'.includes(q) || 'all'.includes(q) || 'project'.includes(q);
  }, [query]);

  const totalFilesCount = useMemo(
    () => files.filter((f) => f.type === 'file').length,
    [files],
  );

  const filteredBranches = useMemo(() => {
    const q = query.toLowerCase();
    return branches.filter((b) => b.toLowerCase().includes(q));
  }, [branches, query]);

  const filteredChats = useMemo(() => {
    const q = query.toLowerCase();
    return chatSessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [chatSessions, query]);

  const filteredMedia = useMemo(() => {
    if (!query) return mediaItems;
    const q = query.toLowerCase();
    return mediaItems.filter((m) => (m.fileName ?? m.filePath).toLowerCase().includes(q));
  }, [mediaItems, query]);

  // Position above cursor
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const DROPDOWN_W = 300;
  const DROPDOWN_H = 320;
  let left = rect.left;
  let top = rect.top - DROPDOWN_H - 6;
  if (top < 8) top = rect.bottom + 6;
  if (left + DROPDOWN_W > vw - 8) left = vw - DROPDOWN_W - 8;
  if (left < 8) left = 8;

  const TABS: Array<{ id: MentionTab; icon: React.ElementType; label: string; count?: number }> = [
    { id: 'files', icon: FileText, label: 'Files', count: filteredFiles.length + filteredFolders.length },
    { id: 'branches', icon: GitBranch, label: 'Branches', count: filteredBranches.length },
    { id: 'chats', icon: MessageSquare, label: 'Chats' },
    { id: 'media', icon: Image, label: 'Media' },
  ];

  return (
    <div
      ref={dropRef}
      style={{ position: 'fixed', top, left, width: DROPDOWN_W, zIndex: 9998 }}
      className="rounded-lg border border-border bg-popover shadow-2xl overflow-hidden"
    >
      {/* Search display */}
      <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
        <Search size={11} className="text-muted-foreground/50 shrink-0" />
        <span className="flex-1 text-[11px] text-muted-foreground/70 truncate">
          {query || <span className="text-muted-foreground/40">type to filter…</span>}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex shrink-0 items-center gap-1 px-2.5 py-1 text-[10px] font-medium transition-colors',
                tab === t.id
                  ? 'border-b border-violet-500 bg-violet-500/10 text-violet-300'
                  : 'text-muted-foreground/60 hover:bg-accent',
              )}
            >
              <Icon size={9} />
              {t.label}
              {t.count !== undefined && <span className="text-muted-foreground/40">({t.count})</span>}
            </button>
          );
        })}
      </div>

      {/* Results */}
      <div className="max-h-[220px] overflow-y-auto">
        {/* Files */}
        {tab === 'files' && (
          (filteredFiles.length === 0 && filteredFolders.length === 0 && !showRoot)
            ? <p className="py-6 text-center text-[10px] text-muted-foreground/50">No files found</p>
            : (
              <>
                {showRoot && totalFilesCount > 0 && (
                  <button
                    onMouseDown={(e) => { e.preventDefault(); onSelectRoot(); }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] hover:bg-accent transition-colors border-b border-border/40"
                  >
                    <FolderTree size={11} className="shrink-0 text-violet-400/70" />
                    <span className="truncate text-foreground">All project files</span>
                    <span className="ml-auto text-[9px] text-muted-foreground/40">{totalFilesCount}</span>
                  </button>
                )}
                {filteredFolders.map((f) => (
                  <button
                    key={f.fileId}
                    onMouseDown={(e) => { e.preventDefault(); onSelectFolder(f); }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] hover:bg-accent transition-colors"
                  >
                    <Folder size={11} className="shrink-0 text-amber-400/70" />
                    <span className="truncate text-foreground">{f.fileName}/</span>
                  </button>
                ))}
                {filteredFiles.map((f) => (
                  <button
                    key={f.fileId}
                    onMouseDown={(e) => { e.preventDefault(); onSelectFile(f); }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] hover:bg-accent transition-colors"
                  >
                    <FileText size={11} className="shrink-0 text-muted-foreground/50" />
                    <span className="truncate text-foreground">{f.fileName}</span>
                  </button>
                ))}
              </>
            )
        )}

        {/* Branches */}
        {tab === 'branches' && (
          filteredBranches.length === 0
            ? <p className="py-6 text-center text-[10px] text-muted-foreground/50">No branches found</p>
            : filteredBranches.map((b) => {
              const isCurrent = b === currentBranch;
              const alreadyAdded = isCurrent || contextBranches.includes(b);
              return (
                <button
                  key={b}
                  onMouseDown={(e) => { e.preventDefault(); if (!alreadyAdded) onSelectBranch(b); }}
                  disabled={alreadyAdded}
                  className={cn(
                    'flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] transition-colors',
                    alreadyAdded ? 'opacity-40 cursor-default' : 'hover:bg-accent',
                  )}
                >
                  <GitBranch size={11} className="shrink-0 text-muted-foreground/50" />
                  <span className="truncate text-foreground">{b}</span>
                  {isCurrent && <span className="ml-auto text-[9px] text-violet-400/70">current</span>}
                  {!isCurrent && alreadyAdded && <span className="ml-auto text-[9px] text-muted-foreground/50">added</span>}
                </button>
              );
            })
        )}

        {/* Chats */}
        {tab === 'chats' && (
          chatsLoading
            ? <div className="flex items-center justify-center py-6"><Loader2 size={14} className="animate-spin text-muted-foreground/40" /></div>
            : filteredChats.length === 0
              ? <p className="py-6 text-center text-[10px] text-muted-foreground/50">No past chats</p>
              : filteredChats.map((s) => (
                <button
                  key={s.id}
                  onMouseDown={(e) => { e.preventDefault(); onSelectChat(s); }}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] hover:bg-accent transition-colors"
                >
                  <MessageSquare size={11} className="shrink-0 text-amber-400/60" />
                  <span className="flex-1 truncate text-foreground">{s.title}</span>
                  <span className="shrink-0 text-[9px] text-muted-foreground/40">
                    {new Date(s.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </button>
              ))
        )}

        {/* Media */}
        {tab === 'media' && (
          mediaLoading
            ? <div className="flex items-center justify-center py-6"><Loader2 size={14} className="animate-spin text-muted-foreground/40" /></div>
            : filteredMedia.length === 0
              ? <p className="py-6 text-center text-[10px] text-muted-foreground/50">No media found</p>
              : filteredMedia.map((m) => {
                const isImage = m.contentType === 'image';
                const Icon = MEDIA_ICONS[m.contentType ?? 'document'] ?? FileIcon;
                const name = m.fileName || m.filePath.split('/').pop() || 'media';
                return (
                  <button
                    key={m.id}
                    onMouseDown={(e) => { e.preventDefault(); onSelectMedia(m); }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] hover:bg-accent transition-colors"
                  >
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.filePath}
                        alt=""
                        className="size-7 rounded object-cover shrink-0 border border-border/40"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="size-7 shrink-0 flex items-center justify-center rounded bg-muted border border-border/40">
                        <Icon size={13} className="text-muted-foreground/60" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-foreground text-[10px]">{name}</p>
                      <p className="text-[9px] text-muted-foreground/50 capitalize">{m.contentType ?? 'file'}</p>
                    </div>
                  </button>
                );
              })
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function RichChatInput({
  pendingAttachment,
  onAttachmentConsumed,
  isLoading,
  onStop,
  onSend,
  selectedModelId,
  onModelChange,
  selectedAgentId,
  onAgentChange,
  agentOptions,
  webSearchEnabled,
  onWebSearchToggle,
  chatMode,
  onModeChange,
  canUseChat,
  projectId,
  currentSessionId,
  getAllFiles,
  getFileContent,
  allBranches = [],
  currentBranch = '',
  contextBranches = [],
  onBranchAdd,
}: RichChatInputProps) {
  const editableRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const attachmentsRef = useRef<Record<string, ContextAttachment>>({});
  const mediaAttachmentsRef = useRef<Record<string, MediaAttachment>>({});
  const chatContextsRef = useRef<Record<string, ChatContextRef>>({});
  /**
   * Folder/multi-file groups — one chip in the DOM, many underlying
   * ContextAttachments. Keys are group IDs (`grp_<rand>`), values list the
   * member attachment IDs in the order they should appear in the prompt.
   */
  const folderGroupsRef = useRef<Record<string, { label: string; attachmentIds: string[] }>>({});
  const savedRangeRef = useRef<Range | null>(null);
  const [hasContent, setHasContent] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentScope, setAgentScope] = useState<'all' | 'local' | 'project'>('all');
  // @-mention state
  const [atMention, setAtMention] = useState<{ query: string; rect: DOMRect } | null>(null);

  const selectedModel = getModelDef(selectedModelId);
  const selectedAgentLabel =
    agentOptions.find((a) => a.id === selectedAgentId)?.label ?? 'Select Agent';
  const currentModeConfig = CHAT_MODES.find((m) => m.id === chatMode) ?? CHAT_MODES[1];
  const showAgentSelector = chatMode === 'agent';

  const filteredAgents = useMemo(() => {
    if (agentScope === 'all') return agentOptions;
    if (agentScope === 'local') return agentOptions.filter((a) => a.id.startsWith('local:'));
    return agentOptions.filter((a) => a.id.startsWith('project:'));
  }, [agentOptions, agentScope]);

  // ── Chip builder ─────────────────────────────────────────────────────────

  const buildChip = useCallback((att: ContextAttachment): HTMLSpanElement => {
    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.dataset.attachmentId = att.id;
    chip.style.cssText = [
      'display:inline-flex',
      'align-items:center',
      'gap:3px',
      'background:rgba(139,92,246,0.18)',
      'border:1px solid rgba(139,92,246,0.35)',
      'border-radius:4px',
      'padding:1px 5px',
      'font-size:10px',
      'color:rgb(196,181,253)',
      'margin:0 2px',
      'vertical-align:middle',
      'cursor:default',
      'user-select:none',
      'white-space:nowrap',
    ].join(';');

    const label = document.createElement('span');
    label.textContent = `${att.fileName}:${att.startLine}–${att.endLine}`;
    chip.appendChild(label);

    const close = document.createElement('button');
    close.textContent = '×';
    close.style.cssText =
      'font-size:12px;line-height:1;color:rgba(196,181,253,0.5);background:none;border:none;cursor:pointer;padding:0 0 1px 2px;';
    close.addEventListener('mousedown', (e) => {
      e.preventDefault();
      chip.remove();
      syncHasContent();
    });
    chip.appendChild(close);

    return chip;
  }, []);

  // ── Folder group chip builder ────────────────────────────────────────────

  /**
   * Build a single chip representing a folder (or any multi-file group).
   * `attachments` are stored on attachmentsRef as usual; the chip only carries
   * the group id, which parseDOM later expands into individual attachment
   * segments.
   */
  const buildFolderChip = useCallback(
    (label: string, attachments: ContextAttachment[]): HTMLSpanElement => {
      const groupId = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const ids = attachments.map((a) => a.id);

      // Stash attachments + group metadata in refs.
      const nextAttachments = { ...attachmentsRef.current };
      for (const a of attachments) nextAttachments[a.id] = a;
      attachmentsRef.current = nextAttachments;
      folderGroupsRef.current = {
        ...folderGroupsRef.current,
        [groupId]: { label, attachmentIds: ids },
      };

      const chip = document.createElement('span');
      chip.contentEditable = 'false';
      chip.dataset.folderGroupId = groupId;
      chip.style.cssText = [
        'display:inline-flex', 'align-items:center', 'gap:3px',
        'background:rgba(245,158,11,0.15)', 'border:1px solid rgba(245,158,11,0.35)',
        'border-radius:4px', 'padding:1px 5px', 'font-size:10px',
        'color:rgb(252,211,77)', 'margin:0 2px', 'vertical-align:middle',
        'cursor:default', 'user-select:none', 'white-space:nowrap',
      ].join(';');

      const labelEl = document.createElement('span');
      labelEl.textContent = `📁 ${label} (${attachments.length} file${attachments.length === 1 ? '' : 's'})`;
      labelEl.title = attachments.map((a) => a.fileName).join('\n');
      chip.appendChild(labelEl);

      const close = document.createElement('button');
      close.textContent = '×';
      close.style.cssText =
        'font-size:12px;line-height:1;color:rgba(252,211,77,0.5);background:none;border:none;cursor:pointer;padding:0 0 1px 2px;';
      close.addEventListener('mousedown', (e) => {
        e.preventDefault();
        // Drop the group AND its underlying attachments from the refs.
        const group = folderGroupsRef.current[groupId];
        if (group) {
          const nextAtts = { ...attachmentsRef.current };
          for (const id of group.attachmentIds) delete nextAtts[id];
          attachmentsRef.current = nextAtts;
          const nextGroups = { ...folderGroupsRef.current };
          delete nextGroups[groupId];
          folderGroupsRef.current = nextGroups;
        }
        chip.remove();
        syncHasContent();
      });
      chip.appendChild(close);

      return chip;
    },
    [],
  );

  // ── Media chip builder ───────────────────────────────────────────────────

  const buildMediaChip = useCallback((att: MediaAttachment): HTMLSpanElement => {
    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.dataset.mediaAttachmentId = att.id;
    chip.style.cssText = [
      'display:inline-flex', 'align-items:center', 'gap:3px',
      'background:rgba(14,165,233,0.15)', 'border:1px solid rgba(14,165,233,0.35)',
      'border-radius:4px', 'padding:1px 5px', 'font-size:10px',
      'color:rgb(125,211,252)', 'margin:0 2px', 'vertical-align:middle',
      'cursor:default', 'user-select:none', 'white-space:nowrap',
    ].join(';');

    if (att.contentType === 'image') {
      const thumb = document.createElement('img');
      thumb.src = att.filePath;
      thumb.style.cssText = 'width:14px;height:14px;object-fit:cover;border-radius:2px;';
      chip.appendChild(thumb);
    }
    const label = document.createElement('span');
    label.textContent = att.fileName || att.filePath.split('/').pop() || 'media';
    chip.appendChild(label);

    const close = document.createElement('button');
    close.textContent = '×';
    close.style.cssText = 'font-size:12px;line-height:1;color:rgba(125,211,252,0.5);background:none;border:none;cursor:pointer;padding:0 0 1px 2px;';
    close.addEventListener('mousedown', (e) => { e.preventDefault(); chip.remove(); syncHasContent(); });
    chip.appendChild(close);
    return chip;
  }, []);

  // ── Chat context chip builder ─────────────────────────────────────────────

  const buildChatChip = useCallback((ref: ChatContextRef): HTMLSpanElement => {
    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.dataset.chatContextId = ref.id;
    chip.style.cssText = [
      'display:inline-flex', 'align-items:center', 'gap:3px',
      'background:rgba(245,158,11,0.15)', 'border:1px solid rgba(245,158,11,0.35)',
      'border-radius:4px', 'padding:1px 5px', 'font-size:10px',
      'color:rgb(252,211,77)', 'margin:0 2px', 'vertical-align:middle',
      'cursor:default', 'user-select:none', 'white-space:nowrap',
    ].join(';');

    const label = document.createElement('span');
    label.textContent = `💬 ${ref.chatTitle}`;
    chip.appendChild(label);

    const close = document.createElement('button');
    close.textContent = '×';
    close.style.cssText = 'font-size:12px;line-height:1;color:rgba(252,211,77,0.5);background:none;border:none;cursor:pointer;padding:0 0 1px 2px;';
    close.addEventListener('mousedown', (e) => { e.preventDefault(); chip.remove(); syncHasContent(); });
    chip.appendChild(close);
    return chip;
  }, []);

  // ── Insert chip at cursor (or append) ────────────────────────────────────

  const insertChipAtCursor = useCallback(
    (att: ContextAttachment) => {
      const div = editableRef.current;
      if (!div) return;

      attachmentsRef.current = { ...attachmentsRef.current, [att.id]: att };

      const chip = buildChip(att);
      const sel = window.getSelection();

      // Prefer the saved range (last known cursor in this div) over the live
      // selection, which may point elsewhere after the user clicked the editor.
      const savedRange = savedRangeRef.current;
      let targetRange: Range | null = null;

      if (savedRange && div.contains(savedRange.commonAncestorContainer)) {
        targetRange = savedRange;
      } else if (sel && sel.rangeCount > 0 && div.contains(sel.anchorNode)) {
        targetRange = sel.getRangeAt(0);
      }

      if (targetRange) {
        targetRange.deleteContents();
        targetRange.insertNode(chip);
        const after = document.createRange();
        after.setStartAfter(chip);
        after.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(after);
        savedRangeRef.current = after.cloneRange();
      } else {
        div.appendChild(chip);
        // Place cursor after appended chip
        const after = document.createRange();
        after.setStartAfter(chip);
        after.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(after);
        savedRangeRef.current = after.cloneRange();
      }

      div.focus();
      syncHasContent();
    },
    [buildChip],
  );

  // ── Insert media / chat chips ─────────────────────────────────────────────

  const insertChipGeneric = useCallback(
    (chip: HTMLSpanElement) => {
      const div = editableRef.current;
      if (!div) return;
      const sel = window.getSelection();
      const savedRange = savedRangeRef.current;
      let targetRange: Range | null = null;
      if (savedRange && div.contains(savedRange.commonAncestorContainer)) targetRange = savedRange;
      else if (sel && sel.rangeCount > 0 && div.contains(sel.anchorNode)) targetRange = sel.getRangeAt(0);
      if (targetRange) {
        targetRange.deleteContents();
        targetRange.insertNode(chip);
        const after = document.createRange();
        after.setStartAfter(chip);
        after.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(after);
        savedRangeRef.current = after.cloneRange();
      } else {
        div.appendChild(chip);
        const after = document.createRange();
        after.setStartAfter(chip);
        after.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(after);
        savedRangeRef.current = after.cloneRange();
      }
      div.focus();
      syncHasContent();
    },
    [],
  );

  const insertMediaChipAtCursor = useCallback(
    (att: MediaAttachment) => {
      mediaAttachmentsRef.current = { ...mediaAttachmentsRef.current, [att.id]: att };
      insertChipGeneric(buildMediaChip(att));
    },
    [buildMediaChip, insertChipGeneric],
  );

  const insertChatChipAtCursor = useCallback(
    (ref: ChatContextRef) => {
      chatContextsRef.current = { ...chatContextsRef.current, [ref.id]: ref };
      insertChipGeneric(buildChatChip(ref));
    },
    [buildChatChip, insertChipGeneric],
  );

  // ── Consume pending attachment from parent ───────────────────────────────

  useEffect(() => {
    if (!pendingAttachment) return;
    insertChipAtCursor(pendingAttachment);
    onAttachmentConsumed();
  }, [pendingAttachment, insertChipAtCursor, onAttachmentConsumed]);

  // ── DOM → segment parser ─────────────────────────────────────────────────

  function parseDOM(): {
    segments: RichSegment[];
    plainText: string;
    attachments: Record<string, ContextAttachment>;
    mediaAttachments: Record<string, MediaAttachment>;
    chatContexts: Record<string, ChatContextRef>;
  } {
    const div = editableRef.current;
    if (!div) return { segments: [], plainText: '', attachments: {}, mediaAttachments: {}, chatContexts: {} };

    const segments: RichSegment[] = [];
    const usedAttachments: Record<string, ContextAttachment> = {};
    const usedMedia: Record<string, MediaAttachment> = {};
    const usedChats: Record<string, ChatContextRef> = {};

    function appendText(t: string) {
      const last = segments[segments.length - 1];
      if (last?.type === 'text') last.text += t;
      else if (t) segments.push({ type: 'text', text: t });
    }

    function walk(node: Node, isFirstBlock: boolean) {
      if (node.nodeType === Node.TEXT_NODE) {
        appendText(node.textContent ?? '');
        return;
      }
      if (!(node instanceof HTMLElement)) return;

      const attId = node.dataset.attachmentId;
      if (attId) {
        segments.push({ type: 'attachment', attachmentId: attId });
        const att = attachmentsRef.current[attId];
        if (att) usedAttachments[attId] = att;
        return;
      }

      const folderGroupId = node.dataset.folderGroupId;
      if (folderGroupId) {
        const group = folderGroupsRef.current[folderGroupId];
        if (group) {
          for (const id of group.attachmentIds) {
            const att = attachmentsRef.current[id];
            if (!att) continue;
            segments.push({ type: 'attachment', attachmentId: id });
            usedAttachments[id] = att;
          }
        }
        return;
      }

      const mediaId = node.dataset.mediaAttachmentId;
      if (mediaId) {
        const m = mediaAttachmentsRef.current[mediaId];
        if (m) {
          usedMedia[mediaId] = m;
          appendText(`[media:${m.fileName || mediaId}]`);
        }
        return;
      }

      const chatId = node.dataset.chatContextId;
      if (chatId) {
        const c = chatContextsRef.current[chatId];
        if (c) {
          usedChats[chatId] = c;
          appendText(`[chat:"${c.chatTitle}"]`);
        }
        return;
      }

      const isBlock =
        node !== div &&
        (node.tagName === 'DIV' || node.tagName === 'P' || node.tagName === 'BLOCKQUOTE');
      if (isBlock && !isFirstBlock) appendText('\n');
      if (node.tagName === 'BR') { appendText('\n'); return; }

      let first = true;
      node.childNodes.forEach((child) => { walk(child, isBlock && first); first = false; });
    }

    let firstChild = true;
    div.childNodes.forEach((child) => { walk(child, firstChild); firstChild = false; });

    const plainText = segments
      .map((s) => s.type === 'text' ? s.text : (() => {
        const a = usedAttachments[s.attachmentId];
        return a ? `[${a.fileName}:L${a.startLine}-${a.endLine}]` : '[context]';
      })())
      .join('');

    return { segments, plainText, attachments: usedAttachments, mediaAttachments: usedMedia, chatContexts: usedChats };
  }

  // ── Save cursor on blur / selection change ───────────────────────────────

  const saveRange = useCallback(() => {
    const div = editableRef.current;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && div && div.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  // ── Sync hasContent ──────────────────────────────────────────────────────

  function syncHasContent() {
    const div = editableRef.current;
    if (!div) return;
    const hasText = (div.textContent?.trim() ?? '') !== '';
    const hasChip = !!div.querySelector('[data-attachment-id], [data-media-attachment-id], [data-chat-context-id], [data-folder-group-id]');
    setHasContent(hasText || hasChip);
  }

  // ── Drag-and-drop file/folder ingestion ──────────────────────────────────

  const [isDragging, setIsDragging] = useState(false);

  /** Read a File as UTF-8 text, capped to keep huge files from blowing the input. */
  const readFileAsText = useCallback(async (file: File, maxBytes: number): Promise<string> => {
    const slice = file.size > maxBytes ? file.slice(0, maxBytes) : file;
    return await slice.text();
  }, []);

  /** Recursively read every file in a FileSystemEntry tree, returning [relativePath, File][]. */
  const readEntryTree = useCallback(async (
    entry: FileSystemEntry,
    prefix = '',
  ): Promise<Array<{ path: string; file: File }>> => {
    if (entry.isFile) {
      const f = await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject),
      );
      return [{ path: prefix + entry.name, file: f }];
    }
    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const children: FileSystemEntry[] = [];
      while (true) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
          reader.readEntries(resolve, reject),
        );
        if (batch.length === 0) break;
        children.push(...batch);
      }
      const out: Array<{ path: string; file: File }> = [];
      for (const child of children) {
        const sub = await readEntryTree(child, prefix + entry.name + '/');
        out.push(...sub);
      }
      return out;
    }
    return [];
  }, []);

  /** Common binary extensions we know we can't usefully treat as text. */
  const isBinaryFile = useCallback((file: File): boolean => {
    const ext = (file.name.split('.').pop() ?? '').toLowerCase();
    if ([
      'exe', 'dll', 'so', 'bin', 'dat', 'class', 'o', 'a', 'lib',
      'zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar',
      'mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac',
      'mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv',
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'ttf', 'otf', 'woff', 'woff2', 'eot',
    ].includes(ext)) return true;
    if (file.type.startsWith('audio/')) return true;
    if (file.type.startsWith('video/')) return true;
    if (file.type === 'application/pdf') return true;
    if (file.type === 'application/zip') return true;
    return false;
  }, []);

  const MAX_DROP_FILE_BYTES = 1 * 1024 * 1024; // 1 MB per file

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!canUseChat || !e.dataTransfer) return;

    // Save cursor position at drop point so chips land where the user dropped.
    if (document.caretRangeFromPoint) {
      const r = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (r && editableRef.current?.contains(r.commonAncestorContainer)) {
        savedRangeRef.current = r.cloneRange();
      }
    }

    // ── In-app drag from the file explorer ────────────────────────────────
    const writepadPayload = e.dataTransfer.getData('application/x-writepad-file');
    if (writepadPayload) {
      try {
        const dragged = JSON.parse(writepadPayload) as {
          id: string;
          name: string;
          type: 'file' | 'folder';
        };
        const all = getAllFiles ? getAllFiles() : [];

        if (dragged.type === 'folder') {
          // Collect every file descendant of the dropped folder.
          const childrenOf = new Map<string | null, ProjectFile[]>();
          for (const f of all) {
            const p = f.parentId ?? null;
            const arr = childrenOf.get(p) ?? [];
            arr.push(f);
            childrenOf.set(p, arr);
          }
          const descendants: ProjectFile[] = [];
          const stack: (string | null)[] = [dragged.id];
          while (stack.length > 0) {
            const id = stack.pop()!;
            const kids = childrenOf.get(id) ?? [];
            for (const k of kids) {
              if (k.type === 'folder') stack.push(k.fileId);
              else descendants.push(k);
            }
          }
          if (descendants.length === 0) return;
          const now = Date.now();
          const attachments: ContextAttachment[] = descendants.map((file, idx) => {
            const content = getFileContent ? getFileContent(file.fileId) : '';
            const lineCount = content ? content.split('\n').length : 1;
            return {
              id: `drop_proj_${file.fileId}_${now}_${idx}`,
              fileId: file.fileId,
              fileName: file.fileName,
              startLine: 1,
              endLine: lineCount,
              content,
            };
          });
          insertChipGeneric(buildFolderChip(dragged.name, attachments));
          return;
        }

        // Single-file in-app drop.
        const file = all.find((f) => f.fileId === dragged.id);
        if (!file) return;
        const content = getFileContent ? getFileContent(file.fileId) : '';
        const lineCount = content ? content.split('\n').length : 1;
        insertChipAtCursor({
          id: `drop_proj_${file.fileId}_${Date.now()}`,
          fileId: file.fileId,
          fileName: file.fileName,
          startLine: 1,
          endLine: lineCount,
          content,
        });
        return;
      } catch {
        // Malformed payload — fall through to OS file handling.
      }
    }

    /** One drop "group" — a top-level dropped item (file or whole folder). */
    type DropGroup = {
      /** Folder name if this group came from a directory entry, else null. */
      folderName: string | null;
      entries: Array<{ path: string; file: File }>;
    };

    const items = e.dataTransfer.items;
    const groups: DropGroup[] = [];

    if (items && items.length > 0) {
      const fsEntries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind !== 'file') continue;
        const entry = (item as DataTransferItem & {
          webkitGetAsEntry?: () => FileSystemEntry | null;
        }).webkitGetAsEntry?.();
        if (entry) fsEntries.push(entry);
      }
      if (fsEntries.length > 0) {
        for (const entry of fsEntries) {
          try {
            const sub = await readEntryTree(entry);
            if (entry.isDirectory) {
              groups.push({ folderName: entry.name, entries: sub });
            } else {
              for (const e2 of sub) groups.push({ folderName: null, entries: [e2] });
            }
          } catch {
            // Skip unreadable entries
          }
        }
      } else {
        // Fallback: just files, no folder traversal
        for (let i = 0; i < items.length; i++) {
          const f = items[i].getAsFile();
          if (f) groups.push({ folderName: null, entries: [{ path: f.name, file: f }] });
        }
      }
    } else {
      const fl = e.dataTransfer.files;
      for (let i = 0; i < fl.length; i++) {
        groups.push({ folderName: null, entries: [{ path: fl[i].name, file: fl[i] }] });
      }
    }

    const now = Date.now();
    let idx = 0;

    /** Turn a single dropped file entry into a chip (image → media, text → context). */
    const fileToAttachment = async (
      path: string,
      file: File,
    ): Promise<{ kind: 'media'; att: MediaAttachment } | { kind: 'text'; att: ContextAttachment } | null> => {
      if (file.size === 0) return null;
      if (file.type.startsWith('image/')) {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
        if (!dataUrl) return null;
        return {
          kind: 'media',
          att: {
            id: `drop_media_${now}_${idx++}`,
            mediaId: `drop_${now}_${idx}`,
            filePath: dataUrl,
            fileName: path,
            contentType: 'image',
            contentMimeType: file.type || 'image/png',
          },
        };
      }
      if (isBinaryFile(file)) return null;
      const content = await readFileAsText(file, MAX_DROP_FILE_BYTES);
      const lineCount = content ? content.split('\n').length : 1;
      return {
        kind: 'text',
        att: {
          id: `drop_${now}_${idx++}`,
          fileId: `drop_${now}_${idx}`,
          fileName: path,
          startLine: 1,
          endLine: lineCount,
          content,
        },
      };
    };

    for (const group of groups) {
      if (group.folderName) {
        // Bundle the folder's text files under one folder chip. Images inside
        // a folder still drop as their own media chips since they need
        // separate rendering.
        const textAtts: ContextAttachment[] = [];
        for (const { path, file } of group.entries) {
          const r = await fileToAttachment(path, file);
          if (!r) continue;
          if (r.kind === 'media') {
            mediaAttachmentsRef.current = { ...mediaAttachmentsRef.current, [r.att.id]: r.att };
            insertChipGeneric(buildMediaChip(r.att));
          } else {
            textAtts.push(r.att);
          }
        }
        if (textAtts.length > 0) {
          insertChipGeneric(buildFolderChip(group.folderName, textAtts));
        }
      } else {
        // Top-level single file — usual chip per file.
        const { path, file } = group.entries[0];
        const r = await fileToAttachment(path, file);
        if (!r) continue;
        if (r.kind === 'media') {
          mediaAttachmentsRef.current = { ...mediaAttachmentsRef.current, [r.att.id]: r.att };
          insertChipGeneric(buildMediaChip(r.att));
        } else {
          insertChipAtCursor(r.att);
        }
      }
    }
  }, [canUseChat, getAllFiles, getFileContent, readEntryTree, readFileAsText, isBinaryFile, insertChipAtCursor, insertChipGeneric, buildMediaChip, buildFolderChip]);

  // Drag handlers are wired via useEffect with native event listeners — React's
  // synthetic drag system can drop events on contentEditable elements.
  useEffect(() => {
    const zone = dropZoneRef.current;
    if (!zone) return;

    const dragDepth = { count: 0 };
    // Sticky accept flag — dragover sometimes ships an empty types list
    // (browsers hide types cross-origin during dragover), so we lock the
    // decision when dragenter fires with usable types.
    let accepted = false;

    const isAccepted = (e: DragEvent): boolean => {
      const types = e.dataTransfer?.types;
      if (!types) return false;
      return Array.from(types).some(
        (t) =>
          t === 'Files' ||
          t === 'application/x-moz-file' ||
          t === 'application/x-writepad-file',
      );
    };

    const onDragEnter = (e: DragEvent) => {
      if (!canUseChat) return;
      if (!isAccepted(e)) return;
      accepted = true;
      e.preventDefault();
      dragDepth.count += 1;
      setIsDragging(true);
    };

    const onDragOver = (e: DragEvent) => {
      if (!canUseChat || !accepted) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };

    const onDragLeave = (e: DragEvent) => {
      // dragleave fires every time we cross any child boundary; count
      // enter/leave pairs so we only clear when we truly leave the zone.
      dragDepth.count = Math.max(0, dragDepth.count - 1);
      if (dragDepth.count === 0) {
        setIsDragging(false);
        accepted = false;
      }
      void e;
    };

    const onDrop = (e: DragEvent) => {
      dragDepth.count = 0;
      accepted = false;
      void handleDrop(e);
    };

    zone.addEventListener('dragenter', onDragEnter);
    zone.addEventListener('dragover', onDragOver);
    zone.addEventListener('dragleave', onDragLeave);
    zone.addEventListener('drop', onDrop);
    return () => {
      zone.removeEventListener('dragenter', onDragEnter);
      zone.removeEventListener('dragover', onDragOver);
      zone.removeEventListener('dragleave', onDragLeave);
      zone.removeEventListener('drop', onDrop);
    };
  }, [canUseChat, handleDrop]);

  // ── @-mention detection ──────────────────────────────────────────────────

  const syncAtMention = useCallback(() => {
    const div = editableRef.current;
    if (!div) { setAtMention(null); return; }
    const state = getAtMentionState(div);
    setAtMention(state);
  }, []);

  const handleAtSelectFile = useCallback((file: ProjectFile) => {
    const query = atMention?.query ?? '';
    setAtMention(null);
    deleteAtMentionText(query);
    const content = getFileContent ? getFileContent(file.fileId) : '';
    const lineCount = content ? content.split('\n').length : 1;
    const att: ContextAttachment = {
      id: `at_${file.fileId}_${Date.now()}`,
      fileId: file.fileId,
      fileName: file.fileName,
      startLine: 1,
      endLine: lineCount,
      content,
    };
    insertChipAtCursor(att);
  }, [atMention, getFileContent, insertChipAtCursor]);

  /**
   * Insert a single folder-group chip that bundles every file under `folderId`
   * (null = whole project root). The chip surfaces just the folder label and
   * file count; expansion to per-file attachments happens at send time.
   */
  const attachFilesUnder = useCallback((folderId: string | null, label: string) => {
    if (!getAllFiles) return;
    const all = getAllFiles();
    const childrenOf = new Map<string | null, ProjectFile[]>();
    for (const f of all) {
      const parent = f.parentId ?? null;
      const arr = childrenOf.get(parent) ?? [];
      arr.push(f);
      childrenOf.set(parent, arr);
    }
    const descendants: ProjectFile[] = [];
    const stack: (string | null)[] = [folderId];
    while (stack.length > 0) {
      const id = stack.pop()!;
      const kids = childrenOf.get(id) ?? [];
      for (const k of kids) {
        if (k.type === 'folder') stack.push(k.fileId);
        else descendants.push(k);
      }
    }
    if (descendants.length === 0) return;
    const now = Date.now();
    const attachments: ContextAttachment[] = descendants.map((file, idx) => {
      const content = getFileContent ? getFileContent(file.fileId) : '';
      const lineCount = content ? content.split('\n').length : 1;
      return {
        id: `at_${file.fileId}_${now}_${idx}`,
        fileId: file.fileId,
        fileName: file.fileName,
        startLine: 1,
        endLine: lineCount,
        content,
      };
    });
    insertChipGeneric(buildFolderChip(label, attachments));
  }, [getAllFiles, getFileContent, insertChipGeneric, buildFolderChip]);

  const handleAtSelectFolder = useCallback((folder: ProjectFile) => {
    const query = atMention?.query ?? '';
    setAtMention(null);
    deleteAtMentionText(query);
    attachFilesUnder(folder.fileId, folder.fileName);
  }, [atMention, attachFilesUnder]);

  const handleAtSelectRoot = useCallback(() => {
    const query = atMention?.query ?? '';
    setAtMention(null);
    deleteAtMentionText(query);
    attachFilesUnder(null, 'All project files');
  }, [atMention, attachFilesUnder]);

  const handleAtSelectBranch = useCallback((branch: string) => {
    const query = atMention?.query ?? '';
    setAtMention(null);
    deleteAtMentionText(query);
    onBranchAdd?.(branch);
    editableRef.current?.focus();
  }, [atMention, onBranchAdd]);

  const handleAtSelectMedia = useCallback((item: MediaItem) => {
    const query = atMention?.query ?? '';
    setAtMention(null);
    deleteAtMentionText(query);
    const att: MediaAttachment = {
      id: `media_${item.id}_${Date.now()}`,
      mediaId: item.id,
      filePath: item.filePath,
      fileName: item.fileName || item.filePath.split('/').pop() || 'media',
      contentType: item.contentType || 'document',
      contentMimeType: item.contentMimeType || 'application/octet-stream',
    };
    insertMediaChipAtCursor(att);
  }, [atMention, insertMediaChipAtCursor]);

  const handleAtSelectChat = useCallback((session: PastSession) => {
    const query = atMention?.query ?? '';
    setAtMention(null);
    deleteAtMentionText(query);
    const ref: ChatContextRef = {
      id: `chat_${session.id}_${Date.now()}`,
      chatId: session.id,
      chatTitle: session.title,
    };
    insertChatChipAtCursor(ref);
  }, [atMention, insertChatChipAtCursor]);

  // ── Send ─────────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    if (!canUseChat || !hasContent || isLoading) return;
    const { segments, plainText, attachments, mediaAttachments, chatContexts } = parseDOM();
    const hasAnyContent = plainText.trim() || Object.keys(attachments).length > 0 || Object.keys(mediaAttachments).length > 0 || Object.keys(chatContexts).length > 0;
    if (!hasAnyContent) return;

    onSend(segments, plainText, attachments, mediaAttachments, chatContexts);

    // Clear editor and all attachment refs
    if (editableRef.current) editableRef.current.innerHTML = '';
    attachmentsRef.current = {};
    mediaAttachmentsRef.current = {};
    chatContextsRef.current = {};
    folderGroupsRef.current = {};
    savedRangeRef.current = null;
    setHasContent(false);
  }, [canUseChat, hasContent, isLoading, onSend]);

  // ── Keyboard ─────────────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape' && atMention) {
        e.preventDefault();
        setAtMention(null);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        if (atMention) { e.preventDefault(); return; } // dropdown handles Enter
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, atMention],
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="shrink-0 border-t border-border p-2">
      <div
        ref={dropZoneRef}
        className={cn(
          'rounded-md border bg-muted transition-colors',
          'focus-within:border-violet-500/50 border-border',
          isDragging && 'border-violet-500 ring-2 ring-violet-500/30',
        )}
      >
        {/* ContentEditable area */}
        <div
          ref={editableRef}
          contentEditable={canUseChat}
          suppressContentEditableWarning
          onInput={() => { syncHasContent(); syncAtMention(); }}
          onKeyDown={handleKeyDown}
          onKeyUp={saveRange}
          onClick={saveRange}
          onBlur={saveRange}
          data-placeholder={
            canUseChat
              ? currentModeConfig.placeholder
              : 'View-only access: chat is disabled for this project'
          }
          className={cn(
            'min-h-[72px] max-h-[200px] overflow-y-auto px-3 py-2.5',
            'text-[12px] text-foreground leading-relaxed outline-none',
            'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50 empty:before:pointer-events-none',
          )}
        />

        {/* Toolbar */}
        <div className="border-t border-border/60">

          {/* Agent selector row — full-width, only visible in Agent mode */}
          {showAgentSelector && (
            <div className="flex items-center gap-1.5 border-b border-border/40 px-1.5 py-1">
              <span className="shrink-0 text-[9px] font-medium text-muted-foreground/40 uppercase tracking-wide">
                Agent
              </span>
              <Popover open={agentOpen} onOpenChange={setAgentOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={isLoading || !canUseChat}
                    className="h-5 flex-1 justify-between px-1.5 text-[9px] text-muted-foreground"
                  >
                    <span className="truncate">{selectedAgentLabel}</span>
                    <ChevronsUpDown className="ml-1 size-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[230px] p-0">
                  <div className="flex items-center gap-1 border-b px-2 py-1.5">
                    {(['all', 'local', 'project'] as const).map((scope) => (
                      <button
                        key={scope}
                        onClick={() => setAgentScope(scope)}
                        className={cn(
                          'rounded px-1 py-0.5 text-[9px] capitalize transition-colors',
                          agentScope === scope
                            ? 'bg-violet-500/20 text-violet-300'
                            : 'text-muted-foreground/70 hover:bg-accent',
                        )}
                      >
                        {scope}
                      </button>
                    ))}
                  </div>
                  <Command>
                    <CommandInput placeholder="Search agents..." className="h-8 text-[11px]" />
                    <CommandList>
                      <CommandEmpty>No agent found.</CommandEmpty>
                      <CommandGroup>
                        {filteredAgents.map((a) => (
                          <CommandItem
                            key={a.id}
                            value={`${a.label} ${a.id}`}
                            onSelect={() => {
                              onAgentChange(a.id);
                              setAgentOpen(false);
                            }}
                          >
                            <Check className={cn('mr-2 size-3', selectedAgentId === a.id ? 'opacity-100' : 'opacity-0')} />
                            <span className="truncate text-[11px]">{a.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Main controls row — mode + model + web search + send */}
          <div className="flex items-center justify-between gap-1 px-1.5 py-1">
            {/* Left: mode selector + model selector + web search */}
            <div className="flex items-center gap-1">
              {/* Mode selector pills */}
              <div className="flex items-center rounded border border-border/60 overflow-hidden">
                {CHAT_MODES.map((m) => {
                  const Icon = m.icon;
                  const active = chatMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => onModeChange(m.id)}
                      disabled={isLoading || !canUseChat}
                      title={m.tooltip}
                      className={cn(
                        'flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium transition-colors',
                        'disabled:opacity-40 disabled:cursor-not-allowed',
                        active
                          ? 'bg-violet-500/20 text-violet-300'
                          : 'text-muted-foreground/50 hover:bg-accent hover:text-muted-foreground',
                      )}
                    >
                      <Icon size={9} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Model selector */}
              <Popover open={modelOpen} onOpenChange={setModelOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={isLoading || !canUseChat}
                    className="h-5 w-[120px] justify-between px-1 text-[9px] text-muted-foreground"
                  >
                    <span className="truncate">{selectedModel.label}</span>
                    <ChevronsUpDown className="ml-1 size-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[210px] p-0">
                  <Command>
                    <CommandInput placeholder="Search models..." className="h-8 text-[11px]" />
                    <CommandList>
                      <CommandEmpty>No model found.</CommandEmpty>
                      <CommandGroup>
                        {CHAT_MODELS.map((m) => (
                          <CommandItem
                            key={m.id}
                            value={`${m.label} ${m.id}`}
                            onSelect={() => {
                              onModelChange(m.id);
                              setModelOpen(false);
                            }}
                          >
                            <Check className={cn('mr-2 size-3', selectedModelId === m.id ? 'opacity-100' : 'opacity-0')} />
                            <span className="truncate text-[11px]">{m.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Web search toggle — only shown if the selected model supports it */}
              {selectedModel.supportsWebSearch && (
                <button
                  onClick={onWebSearchToggle}
                  disabled={isLoading || !canUseChat}
                  title={webSearchEnabled ? 'Web search on' : 'Web search off'}
                  className={cn(
                    'flex items-center justify-center rounded p-0.5 transition-colors',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    webSearchEnabled
                      ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                      : 'text-muted-foreground/40 hover:bg-accent hover:text-muted-foreground',
                  )}
                >
                  <Globe size={11} />
                </button>
              )}
            </div>

            {/* Right: stop / send */}
            {isLoading ? (
              <button
                onClick={onStop}
                className="flex items-center gap-1 rounded bg-destructive/10 px-2 py-1 text-[10px] text-destructive hover:bg-destructive/20 transition-colors"
              >
                <Square size={10} />
                Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canUseChat || !hasContent}
                className="flex items-center justify-center rounded bg-violet-600 p-1.5 text-white transition-colors hover:bg-violet-500 disabled:opacity-25"
                title="Send (Enter)"
              >
                <Send size={13} />
              </button>
            )}
          </div>
        </div>
        {!canUseChat && (
          <div className="border-t border-border/60 px-2 py-1 text-[10px] text-muted-foreground/70">
            Viewer permission detected. Ask an editor/owner for edit access to use chat.
          </div>
        )}
      </div>

      {/* @-mention dropdown (rendered as fixed overlay) */}
      {atMention && (
        <AtMentionDropdown
          query={atMention.query}
          rect={atMention.rect}
          files={getAllFiles ? getAllFiles() : []}
          branches={allBranches}
          contextBranches={contextBranches}
          currentBranch={currentBranch}
          projectId={projectId}
          currentSessionId={currentSessionId}
          onSelectFile={handleAtSelectFile}
          onSelectFolder={handleAtSelectFolder}
          onSelectRoot={handleAtSelectRoot}
          onSelectBranch={handleAtSelectBranch}
          onSelectMedia={handleAtSelectMedia}
          onSelectChat={handleAtSelectChat}
          onClose={() => setAtMention(null)}
        />
      )}
    </div>
  );
}
