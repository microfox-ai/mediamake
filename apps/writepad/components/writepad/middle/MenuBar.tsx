'use client';

/**
 * MenuBar — Windows/VS Code-style application menu for Writepad.
 *
 * Menus:  File · Edit · Selection · View · Help
 *
 * Receives callbacks from the parent (page.tsx / EditorPane) so it stays
 * purely presentational with no internal state beyond the dialog toggles.
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
  MenubarRadioGroup,
  MenubarRadioItem,
} from '@/components/ui/menubar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PreferencesDialog } from './PreferencesDialog';
import type { EditorPreferences, EditorTheme } from '@/hooks/useEditorPreferences';
import { Loader2 } from 'lucide-react';

// ── Keyboard shortcut dialog ──────────────────────────────────────────────────

const SHORTCUTS = [
  { key: 'Ctrl+S', desc: 'Save active file' },
  { key: 'Ctrl+Shift+S', desc: 'Save all files' },
  { key: 'Ctrl+F', desc: 'Find / replace in file' },
  { key: 'Ctrl+L', desc: 'Send selected text to AI chat' },
  { key: 'Ctrl+P', desc: 'Toggle markdown preview' },
  { key: 'Ctrl+Z', desc: 'Undo' },
  { key: 'Ctrl+Y', desc: 'Redo' },
  { key: 'Ctrl+A', desc: 'Select all' },
  { key: 'Ctrl+B', desc: 'Bold' },
  { key: 'Ctrl+I', desc: 'Italic' },
  { key: 'Enter (chat)', desc: 'Send AI message' },
  { key: 'Shift+Enter (chat)', desc: 'New line in chat' },
];

// ── Project settings dialog ───────────────────────────────────────────────────

interface ProjectSettingsDialogProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onSaved: (name: string) => void;
}

function ProjectSettingsDialog({ projectId, projectName, onClose, onSaved }: ProjectSettingsDialogProps) {
  const [name, setName] = useState(projectName);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [genre, setGenre] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load current project data on open
  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((data: { name?: string; description?: string; tags?: string[]; genre?: string; status?: string }) => {
        if (data.name) setName(data.name);
        if (data.description) setDescription(data.description);
        if (data.tags) setTags(Array.isArray(data.tags) ? data.tags.join(', ') : data.tags);
        if (data.genre) setGenre(data.genre);
        if (data.status) setStatus(data.status);
      })
      .catch(() => {});
  }, [projectId]);

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const tagsArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          tags: tagsArray,
          genre: genre.trim(),
          status: status.trim(),
        }),
      });
      if (!res.ok) { setError('Failed to save.'); return; }
      onSaved(name.trim());
      onClose();
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Project Settings</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Project Name</Label>
            <Input id="proj-name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">Description</Label>
            <Textarea
              id="proj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief project description…"
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="proj-genre">Genre</Label>
              <Input id="proj-genre" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. Fantasy, Sci-Fi…" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proj-tags">Tags</Label>
            <Input
              id="proj-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma-separated: novel, romance, chapter-1…"
            />
            <p className="text-[11px] text-muted-foreground">Separate tags with commas</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={14} className="animate-spin mr-1.5" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Go to line dialog ─────────────────────────────────────────────────────────

interface GoToLineDialogProps {
  onClose: () => void;
  onGo: (line: number) => void;
}

function GoToLineDialog({ onClose, onGo }: GoToLineDialogProps) {
  const [value, setValue] = useState('');

  const handleGo = () => {
    const n = parseInt(value, 10);
    if (n > 0) { onGo(n); onClose(); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader><DialogTitle>Go to Line</DialogTitle></DialogHeader>
        <div className="py-2">
          <Input
            type="number"
            min={1}
            placeholder="Line number…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGo()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleGo}>Go</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete project confirmation dialog ────────────────────────────────────────

interface DeleteProjectDialogProps {
  projectName: string;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteProjectDialog({ projectName, onClose, onConfirm }: DeleteProjectDialogProps) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Delete Project</DialogTitle></DialogHeader>
        <p className="py-2 text-sm text-muted-foreground">
          Permanently delete <strong className="text-foreground">"{projectName}"</strong>?
          All files and chat history will be erased. This cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={() => { onConfirm(); onClose(); }}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Shortcuts dialog ──────────────────────────────────────────────────────────

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Keyboard Shortcuts</DialogTitle></DialogHeader>
        <div className="py-2">
          <table className="w-full text-sm">
            <tbody>
              {SHORTCUTS.map(({ key, desc }) => (
                <tr key={key} className="border-b border-border/40 last:border-0">
                  <td className="py-2 pr-4">
                    <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{key}</kbd>
                  </td>
                  <td className="py-2 text-muted-foreground">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── MenuBar props ─────────────────────────────────────────────────────────────

export interface MenuBarProps {
  // Project info
  projectId: string;
  projectName: string;
  unsavedCount: number;
  draftedCount: number;
  // File actions
  onNewFile: () => void;
  onNewFolder: () => void;
  onSave: () => void;
  onSaveAll: () => void;
  onSaveDraft: () => void;
  onRevertDraft: () => void;
  onShowDiff: () => void;
  onCloseTab: () => void;
  onDuplicateProject: () => void;
  onDeleteProject: () => void;
  onProjectNameChanged: (name: string) => void;
  // Edit actions (forwarded to editor ref)
  onFormat: (type: string) => void;
  onSelectAll: () => void;
  onGoToLine: (line: number) => void;
  onToggleSearch: () => void;
  onSendToChat: () => void;
  // View actions
  previewMode: boolean;
  onTogglePreview: () => void;
  wordWrap: boolean;
  lineNumbers: boolean;
  // Preferences
  prefs: EditorPreferences;
  onPrefsChange: (update: Partial<EditorPreferences>) => void;
}

export function MenuBar({
  projectId,
  projectName,
  unsavedCount,
  draftedCount,
  onNewFile,
  onNewFolder,
  onSave,
  onSaveAll,
  onSaveDraft,
  onRevertDraft,
  onShowDiff,
  onCloseTab,
  onDuplicateProject,
  onDeleteProject,
  onProjectNameChanged,
  onFormat,
  onSelectAll,
  onGoToLine,
  onToggleSearch,
  onSendToChat,
  previewMode,
  onTogglePreview,
  wordWrap,
  lineNumbers,
  prefs,
  onPrefsChange,
}: MenuBarProps) {
  const router = useRouter();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [showGoToLine, setShowGoToLine] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-2 py-0.5">
        {/* Logo + breadcrumb */}
        <div className="flex items-center gap-2 mr-4">
          <button
            onClick={() => router.push('/')}
            className="text-sm font-bold tracking-tight transition-opacity hover:opacity-70 shrink-0"
          >
            write<span className="text-primary">pad</span>
          </button>
          <span className="text-border text-xs">/</span>
          <button
            onClick={() => router.push('/projects')}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            Projects
          </button>
          <span className="text-border text-xs hidden sm:block">/</span>
          <span className="text-xs text-foreground/70 max-w-[140px] truncate hidden sm:block">{projectName}</span>
        </div>

        {/* Menubar */}
        <Menubar className="border-0 shadow-none bg-transparent h-auto p-0 gap-0 rounded-none flex-1">

          {/* ── FILE ─────────────────────────────────────────────────── */}
          <MenubarMenu>
            <MenubarTrigger className="text-xs px-2.5 py-1.5 rounded-sm">File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onSelect={onNewFile}>
                New File <MenubarShortcut>Ctrl+N</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={onNewFolder}>
                New Folder
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={onSave}>
                Save <MenubarShortcut>Ctrl+S</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={onSaveAll}>
                Save All
                {unsavedCount > 0 && (
                  <span className="ml-2 rounded-full bg-amber-500/20 px-1.5 text-[10px] text-amber-500">{unsavedCount}</span>
                )}
                <MenubarShortcut>Ctrl+⇧S</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={onSaveDraft}>
                Save as Draft
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={onRevertDraft}>
                Revert Draft
                {draftedCount > 0 && (
                  <span className="ml-2 rounded-full bg-violet-500/20 px-1.5 text-[10px] text-violet-400">{draftedCount}</span>
                )}
              </MenubarItem>
              <MenubarItem onSelect={onShowDiff}>
                Show Changes
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => setShowProjectSettings(true)}>
                Project Settings…
              </MenubarItem>
              <MenubarItem onSelect={onDuplicateProject}>
                Duplicate Project
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={onCloseTab}>
                Close Tab <MenubarShortcut>Ctrl+W</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem variant="destructive" onSelect={() => setShowDeleteConfirm(true)}>
                Delete Project…
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* ── EDIT ─────────────────────────────────────────────────── */}
          <MenubarMenu>
            <MenubarTrigger className="text-xs px-2.5 py-1.5 rounded-sm">Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onSelect={() => document.execCommand('undo')}>
                Undo <MenubarShortcut>Ctrl+Z</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => document.execCommand('redo')}>
                Redo <MenubarShortcut>Ctrl+Y</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarSub>
                <MenubarSubTrigger>Format</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem onSelect={() => onFormat('bold')}>
                    Bold <MenubarShortcut>Ctrl+B</MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem onSelect={() => onFormat('italic')}>
                    Italic <MenubarShortcut>Ctrl+I</MenubarShortcut>
                  </MenubarItem>
                  <MenubarSeparator />
                  <MenubarItem onSelect={() => onFormat('h1')}>Heading 1</MenubarItem>
                  <MenubarItem onSelect={() => onFormat('h2')}>Heading 2</MenubarItem>
                  <MenubarItem onSelect={() => onFormat('h3')}>Heading 3</MenubarItem>
                  <MenubarSeparator />
                  <MenubarItem onSelect={() => onFormat('quote')}>Blockquote</MenubarItem>
                  <MenubarItem onSelect={() => onFormat('code')}>Code Block</MenubarItem>
                  <MenubarItem onSelect={() => onFormat('hr')}>Horizontal Rule</MenubarItem>
                  <MenubarItem onSelect={() => onFormat('ul')}>Bullet List</MenubarItem>
                  <MenubarItem onSelect={() => onFormat('ol')}>Numbered List</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
              <MenubarSeparator />
              <MenubarItem onSelect={onToggleSearch}>
                Find / Replace <MenubarShortcut>Ctrl+F</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => setShowGoToLine(true)}>
                Go to Line… <MenubarShortcut>Ctrl+G</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={onSelectAll}>
                Select All <MenubarShortcut>Ctrl+A</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* ── SELECTION ────────────────────────────────────────────── */}
          <MenubarMenu>
            <MenubarTrigger className="text-xs px-2.5 py-1.5 rounded-sm">Selection</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onSelect={onSelectAll}>
                Select All <MenubarShortcut>Ctrl+A</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={onSendToChat}>
                Send Selection to AI Chat <MenubarShortcut>Ctrl+L</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => onFormat('bold')}>
                Toggle Bold on Selection
              </MenubarItem>
              <MenubarItem onSelect={() => onFormat('italic')}>
                Toggle Italic on Selection
              </MenubarItem>
              <MenubarItem onSelect={() => onFormat('quote')}>
                Quote Selection
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* ── VIEW ─────────────────────────────────────────────────── */}
          <MenubarMenu>
            <MenubarTrigger className="text-xs px-2.5 py-1.5 rounded-sm">View</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem checked={previewMode} onCheckedChange={onTogglePreview}>
                Markdown Preview <MenubarShortcut>Ctrl+P</MenubarShortcut>
              </MenubarCheckboxItem>
              <MenubarItem onSelect={onShowDiff}>
                Show Changes
              </MenubarItem>
              <MenubarSeparator />
              <MenubarSub>
                <MenubarSubTrigger>Theme</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarRadioGroup
                    value={prefs.theme}
                    onValueChange={(v) => onPrefsChange({ theme: v as EditorTheme })}
                  >
                    <MenubarRadioItem value="dark">Dark</MenubarRadioItem>
                    <MenubarRadioItem value="light">Light</MenubarRadioItem>
                  </MenubarRadioGroup>
                </MenubarSubContent>
              </MenubarSub>
              <MenubarSeparator />
              <MenubarCheckboxItem
                checked={prefs.wordWrap}
                onCheckedChange={(v) => onPrefsChange({ wordWrap: v })}
              >
                Word Wrap
              </MenubarCheckboxItem>
              <MenubarCheckboxItem
                checked={prefs.lineNumbers}
                onCheckedChange={(v) => onPrefsChange({ lineNumbers: v })}
              >
                Line Numbers
              </MenubarCheckboxItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => setShowPrefs(true)}>
                Preferences… <MenubarShortcut>Ctrl+,</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* ── HELP ─────────────────────────────────────────────────── */}
          <MenubarMenu>
            <MenubarTrigger className="text-xs px-2.5 py-1.5 rounded-sm">Help</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onSelect={() => setShowShortcuts(true)}>
                Keyboard Shortcuts
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem inset onSelect={() => router.push('/projects')}>
                Back to Projects
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem inset disabled>
                Writepad — AI Writing IDE
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>

        {/* Right side — status indicators */}
        <div className="ml-auto flex items-center gap-2 pl-3 shrink-0">
          {unsavedCount > 0 && (
            <span className="text-[10px] text-amber-500">{unsavedCount} unsaved</span>
          )}
          {draftedCount > 0 && (
            <span className="text-[10px] text-violet-400">{draftedCount} drafted</span>
          )}
        </div>
      </div>

      {/* ── Dialogs ───────────────────────────────────────────────────── */}

      {showShortcuts && <ShortcutsDialog onClose={() => setShowShortcuts(false)} />}

      {showPrefs && (
        <PreferencesDialog
          open
          prefs={prefs}
          onClose={() => setShowPrefs(false)}
          onChange={onPrefsChange}
        />
      )}

      {showProjectSettings && (
        <ProjectSettingsDialog
          projectId={projectId}
          projectName={projectName}
          onClose={() => setShowProjectSettings(false)}
          onSaved={onProjectNameChanged}
        />
      )}

      {showGoToLine && (
        <GoToLineDialog
          onClose={() => setShowGoToLine(false)}
          onGo={onGoToLine}
        />
      )}

      {showDeleteConfirm && (
        <DeleteProjectDialog
          projectName={projectName}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={onDeleteProject}
        />
      )}
    </>
  );
}
