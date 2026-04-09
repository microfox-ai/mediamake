'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { ThemeToggle } from '@/components/theme-toggle';
import { useSession } from '@/components/session-provider';
import { ShareProjectDialog } from '@/components/writepad/ShareProjectDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  LogOut, Plus, Search, Loader2, Users, Pencil, Trash2, Copy, ExternalLink, UserPlus,
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  type: string;
  ownerId: string;
  members: Array<{ clientId: string; role: string }>;
  updatedAt: string;
}

const PROJECT_TYPES = [
  { value: 'screenplay', label: 'Screenplay' },
  { value: 'novel', label: 'Novel' },
  { value: 'short-story', label: 'Short Story' },
  { value: 'blog', label: 'Blog / Articles' },
  { value: 'youtube', label: 'YouTube Scripts' },
  { value: 'other', label: 'Other' },
];

const TYPE_COLORS: Record<string, string> = {
  screenplay: 'bg-violet-500/15 text-violet-500 border-violet-500/25 dark:text-violet-300 dark:border-violet-400/25',
  novel: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-300 dark:border-emerald-400/25',
  'short-story': 'bg-blue-500/15 text-blue-600 border-blue-500/25 dark:text-blue-300 dark:border-blue-400/25',
  blog: 'bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-300 dark:border-amber-400/25',
  youtube: 'bg-red-500/15 text-red-600 border-red-500/25 dark:text-red-300 dark:border-red-400/25',
  other: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/25 dark:text-zinc-300 dark:border-zinc-400/25',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ── Edit dialog ───────────────────────────────────────────────────────────────

function EditProjectDialog({
  project,
  onClose,
  onSaved,
}: {
  project: Project;
  onClose: () => void;
  onSaved: (updated: Partial<Project>) => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [type, setType] = useState(project.type);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), type }),
      });
      if (!res.ok) { setError('Failed to save.'); return; }
      onSaved({ name: name.trim(), description: description.trim(), type });
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
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Type</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    type === t.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={14} className="animate-spin mr-1.5" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete dialog ─────────────────────────────────────────────────────────────

function DeleteProjectDialog({
  project,
  onClose,
  onDeleted,
}: {
  project: Project;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
      if (!res.ok) { setError('Failed to delete.'); return; }
      onDeleted();
      onClose();
    } catch {
      setError('Network error.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Project</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          Are you sure you want to delete <strong className="text-foreground">"{project.name}"</strong>?
          This will permanently delete all files and chat history. This cannot be undone.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2 size={14} className="animate-spin mr-1.5" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function ProjectsContent() {
  const router = useRouter();
  const session = useSession();
  const clientId = session?.session?.clientId ?? '';
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [shareProject, setShareProject] = useState<Project | null>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data: Project[]) => setProjects(data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase()),
  );

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  const handleDuplicate = async (project: Project) => {
    setDuplicatingId(project.id);
    try {
      const res = await fetch(`/api/projects/${project.id}/duplicate`, { method: 'POST' });
      const json = await res.json() as { id?: string };
      if (json.id) {
        // Reload list so the copy appears
        const r2 = await fetch('/api/projects');
        const data = await r2.json() as Project[];
        setProjects(data ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDuplicatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="text-lg font-bold tracking-tight transition-opacity hover:opacity-80"
            >
              write<span className="text-primary">pad</span>
            </button>
            <span className="text-border">|</span>
            <span className="text-sm text-muted-foreground">Projects</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:block">{clientId}</span>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">
                {isLoggingOut ? 'Logging out…' : 'Logout'}
              </span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Title + actions */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading ? 'Loading…' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Button onClick={() => router.push('/projects/new')} className="gap-1.5">
            <Plus size={15} />
            New Project
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
            <p className="text-sm">
              {projects.length === 0 ? 'No projects yet — create one to get started.' : 'No projects match your search.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((project) => {
              const colorClass = TYPE_COLORS[project.type] ?? TYPE_COLORS.other;
              const isOwn = project.ownerId === clientId;
              const isDuplicating = duplicatingId === project.id;
              return (
                <div
                  key={project.id}
                  className="group relative flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                >
                  {/* Type badge + shared badge */}
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`self-start rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${colorClass}`}>
                      {project.type.replace('-', ' ')}
                    </span>
                    {!isOwn && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                        shared
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <h3
                    className="mb-1.5 cursor-pointer text-sm font-semibold transition-colors hover:text-primary"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    {project.name}
                  </h3>

                  {/* Description */}
                  <p className="mb-4 flex-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {project.description || 'No description'}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground/60">
                    <div className="flex items-center gap-1">
                      <Users size={10} />
                      <span>{project.members.length + 1}</span>
                    </div>
                    <span>{relativeTime(project.updatedAt)}</span>
                  </div>

                  {/* Action buttons — visible on hover */}
                  <div className="absolute right-3 top-3 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    {/* Open */}
                    <button
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      title="Open project"
                    >
                      <ExternalLink size={13} />
                    </button>

                    {/* Edit — owners only */}
                    {isOwn && (
                      <button
                        onClick={() => setEditProject(project)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title="Edit project"
                      >
                        <Pencil size={13} />
                      </button>
                    )}

                    {/* Duplicate */}
                    <button
                      onClick={() => handleDuplicate(project)}
                      disabled={isDuplicating}
                      className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40"
                      title="Duplicate project"
                    >
                      {isDuplicating ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
                    </button>

                    {/* Share — owners only */}
                    {isOwn && (
                      <button
                        onClick={() => setShareProject(project)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title="Share project"
                      >
                        <UserPlus size={13} />
                      </button>
                    )}

                    {/* Delete — owners only */}
                    {isOwn && (
                      <button
                        onClick={() => setDeleteProject(project)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                        title="Delete project"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* New project card */}
            <button
              onClick={() => router.push('/projects/new')}
              className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-muted-foreground transition-all hover:border-primary/40 hover:text-primary focus:outline-none"
            >
              <Plus size={22} />
              <span className="text-sm">New Project</span>
            </button>
          </div>
        )}
      </main>

      {/* Edit dialog */}
      {editProject && (
        <EditProjectDialog
          project={editProject}
          onClose={() => setEditProject(null)}
          onSaved={(updated) =>
            setProjects((prev) =>
              prev.map((p) => (p.id === editProject.id ? { ...p, ...updated } : p)),
            )
          }
        />
      )}

      {/* Delete dialog */}
      {deleteProject && (
        <DeleteProjectDialog
          project={deleteProject}
          onClose={() => setDeleteProject(null)}
          onDeleted={() =>
            setProjects((prev) => prev.filter((p) => p.id !== deleteProject.id))
          }
        />
      )}

      {shareProject && (
        <ShareProjectDialog
          projectId={shareProject.id}
          open={true}
          onOpenChange={(o) => !o && setShareProject(null)}
        />
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <ProtectedPage>
      <ProjectsContent />
    </ProtectedPage>
  );
}
