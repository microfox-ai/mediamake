'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { ArrowLeft, Loader2 } from 'lucide-react';

const PROJECT_TYPES = [
  { value: 'screenplay', label: 'Screenplay' },
  { value: 'novel', label: 'Novel' },
  { value: 'short-story', label: 'Short Story' },
  { value: 'blog', label: 'Blog / Articles' },
  { value: 'youtube', label: 'YouTube Scripts' },
  { value: 'other', label: 'Other' },
];

function NewProjectContent() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('other');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) { setError('Project name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), type }),
      });
      const json = await res.json() as { id?: string; error?: string };
      if (!res.ok) { setError(json.error ?? 'Failed to create project'); return; }
      router.push(`/projects/${json.id}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-3">
          <button
            onClick={() => router.push('/projects')}
            className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-lg font-bold tracking-tight">
            write<span className="text-primary">pad</span>
          </span>
          <span className="text-border">|</span>
          <span className="text-sm text-muted-foreground">New Project</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="mb-2 text-2xl font-bold">Create a project</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Projects hold your files and AI chat history. You can invite collaborators after creation.
        </p>

        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Project name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Midnight Protocol"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short summary of what this project is about…"
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>

          {/* Type */}
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
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button onClick={handleCreate} disabled={saving} className="gap-1.5">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Creating…' : 'Create project'}
            </Button>
            <Button variant="ghost" onClick={() => router.push('/projects')} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <ProtectedPage>
      <NewProjectContent />
    </ProtectedPage>
  );
}
