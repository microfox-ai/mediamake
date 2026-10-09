'use client';

import { useEffect, useRef, useState } from 'react';
import { Captions, ChevronDown, Folder, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { DefaultCard } from '@/components/editor/presets/form/default-card';
import type { DefaultPresetData } from '@/components/editor/presets/types';
import type { CaptionsDocument } from '@/app/types/transcription';
import { captionsReferenceValue, updateCaptionsDocument } from '@/lib/captions/captions-client';
import { useSession } from '@/components/session-provider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProjectFolder {
  id: string;
  displayName: string;
}

function captionInfoData(doc: CaptionsDocument): DefaultPresetData {
  return {
    references: [
      {
        key: doc.title || 'captions',
        type: 'captions',
        dataType: 'captions',
        value: captionsReferenceValue(doc),
      },
    ],
  };
}

function CaptionInfo({
  doc,
  onChange,
}: {
  doc: CaptionsDocument;
  onChange: (next: CaptionsDocument) => void;
}) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const apply = (next: CaptionsDocument) => {
    onChange(next);
    const id = next._id?.toString();
    if (!id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void updateCaptionsDocument(id, {
        title: next.title,
        description: next.description,
        captions: next.captions,
      }).catch(error => {
        toast.error(
          `Failed to save captions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      });
    }, 400);
  };

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Title
        </Label>
        <Input
          value={doc.title ?? ''}
          className="h-8 text-xs"
          placeholder="Caption title"
          onChange={e => apply({ ...doc, title: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Description
        </Label>
        <Textarea
          value={doc.description ?? ''}
          rows={3}
          className="text-xs"
          placeholder="What this caption version is for"
          onChange={e => apply({ ...doc, description: e.target.value })}
        />
      </div>
      <DefaultCard
        defaultData={captionInfoData(doc)}
        onDefaultDataChange={next => {
          const value = next.references[0]?.value ?? {};
          apply({
            ...doc,
            title: typeof value.title === 'string' ? value.title : doc.title,
            description:
              typeof value.description === 'string' ? value.description : doc.description,
            captions: Array.isArray(value.captions) ? value.captions : doc.captions,
          });
        }}
        isExpanded
        singleReferenceMode
        hideIdentityFields
      />
    </div>
  );
}

function CaptionCard({
  doc,
  folder,
  onChange,
}: {
  doc: CaptionsDocument;
  folder?: string;
  onChange: (next: CaptionsDocument) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = doc._id?.toString() ?? '';
  const count = doc.captions?.length ?? 0;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn('border rounded-lg', open && 'col-span-full')}
    >
      <CollapsibleTrigger className="flex w-full items-start gap-2 p-3 text-left">
        <Captions className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start gap-2">
            <h3 className="font-medium text-sm line-clamp-2 flex-1">
              {doc.title || 'Untitled Captions'}
            </h3>
            <Badge variant="outline" className="text-xs shrink-0">
              {count}
            </Badge>
          </div>
          {doc.description ? (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {doc.description}
            </p>
          ) : null}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {folder ? (
              <span className="inline-flex items-center gap-1">
                <Folder className="h-3 w-3" />
                {folder}
              </span>
            ) : (
              <span>No project folder</span>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        {open ? <CaptionInfo doc={doc} onChange={onChange} /> : null}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CaptionsUI() {
  const session = useSession();
  const [captions, setCaptions] = useState<CaptionsDocument[]>([]);
  const [projects, setProjects] = useState<ProjectFolder[]>([]);
  const [projectId, setProjectId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (session?.clientId) headers['x-client-id'] = session.clientId;
    fetch('/api/project', { headers })
      .then(res => (res.ok ? res.json() : []))
      .then(data => (Array.isArray(data) ? setProjects(data) : setProjects([])))
      .catch(() => setProjects([]));
  }, [session?.clientId]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ limit: '50' });
        if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
        if (projectId !== 'all') params.set('projectId', projectId);
        const response = await fetch(`/api/captions?${params.toString()}`);
        if (!response.ok) {
          setCaptions([]);
          return;
        }
        const data = await response.json();
        setCaptions(Array.isArray(data.captions) ? data.captions : []);
      } catch {
        setCaptions([]);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [debouncedSearch, projectId]);

  const projectName = (id?: string) =>
    projects.find(project => project.id === id)?.displayName;

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          <Captions className="h-5 w-5" />
          <h1 className="text-xl font-bold">Captions</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search captions"
              className="pl-8"
            />
          </div>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-[220px]">
              <Folder className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Project folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All project folders</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading captions
          </div>
        ) : captions.length === 0 ? (
          <div className="text-center py-12">
            <Captions className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No captions found</h3>
            <p className="text-sm text-muted-foreground">
              Caption versions created from transcriptions show up here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {captions.map(doc => {
              const id = doc._id?.toString() ?? '';
              return (
                <CaptionCard
                  key={id}
                  doc={doc}
                  folder={projectName(doc.projectId)}
                  onChange={next =>
                    setCaptions(current =>
                      current.map(item =>
                        item._id?.toString() === id ? next : item,
                      ),
                    )
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
