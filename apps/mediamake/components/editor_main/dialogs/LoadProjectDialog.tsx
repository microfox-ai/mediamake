"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Share2Icon } from "lucide-react";
import { useSession } from "@/components/session-provider";
import { useProjectStore } from "../stores/project-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShareProjectDialog } from "./ShareProjectDialog";

interface Project {
  id: string;
  displayName: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  isOwned?: boolean;
  sharedRole?: 'editor' | 'viewer';
  sharedWith?: Array<{ clientId: string; role: string }>;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface LoadProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoadProjectDialog({ open, onOpenChange }: LoadProjectDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [shareTarget, setShareTarget] = useState<Project | null>(null);
  const router = useRouter();
  const { setCurrentProjectId, loadProjectTimelines } = useProjectStore();
  const session = useSession();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load all tags when dialog opens
  useEffect(() => {
    if (open) {
      loadAllTags();
    }
  }, [open]);

  // Load projects when search/tag/page changes
  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open, debouncedSearch, selectedTag, page]);

  const loadAllTags = async () => {
    try {
      const headers: Record<string, string> = {};
      if (session?.clientId) {
        headers['x-client-id'] = session.clientId;
      }
      const response = await fetch("/api/project", { headers });
      if (!response.ok) {
        throw new Error("Failed to load tags");
      }
      const data = await response.json();
      // Extract unique tags from all projects
      const tagsSet = new Set<string>();
      if (Array.isArray(data)) {
        data.forEach((project: Project) => {
          if (project.tags && Array.isArray(project.tags)) {
            project.tags.forEach((tag) => tagsSet.add(tag));
          }
        });
      } else if (data.projects && Array.isArray(data.projects)) {
        data.projects.forEach((project: Project) => {
          if (project.tags && Array.isArray(project.tags)) {
            project.tags.forEach((tag) => tagsSet.add(tag));
          }
        });
      }
      setAllTags(Array.from(tagsSet).sort());
    } catch (error) {
      console.error("Error loading tags:", error);
    }
  };

  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (debouncedSearch.trim()) {
        params.append("search", debouncedSearch.trim());
      }
      if (selectedTag && selectedTag !== "all") {
        params.append("tag", selectedTag);
      }

      const headers: Record<string, string> = {};
      if (session?.clientId) {
        headers['x-client-id'] = session.clientId;
      }
      const response = await fetch(`/api/project?${params.toString()}`, { headers });
      if (!response.ok) {
        throw new Error("Failed to load projects");
      }

      const data = await response.json();
      // Check if response has pagination structure (search/tag mode) or is array (no filters)
      if (data.projects && Array.isArray(data.projects)) {
        setProjects(data.projects);
        setPagination(data.pagination);
      } else if (Array.isArray(data)) {
        // Fallback for no filters (returns array directly)
        setProjects(data);
        setPagination(null);
      } else {
        setProjects([]);
        setPagination(null);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [debouncedSearch, selectedTag, page, session?.clientId]);

  const handleLoadProject = async (projectId: string) => {
    setIsLoading(true);
    try {
      // Set project in store and load timelines immediately
      setCurrentProjectId(projectId);
      await loadProjectTimelines(projectId, session?.clientId);
      
      router.push(`/editor?id=${projectId}`);
      onOpenChange(false);
    } catch (error) {
      console.error("Error loading project:", error);
      alert("Failed to load project. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Load Project</DialogTitle>
          <DialogDescription>
            Search and load an existing project to continue working on it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={selectedTag}
              onValueChange={(value) => {
                setSelectedTag(value);
                setPage(1); // Reset to first page on tag change
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="h-[400px]">
            {isLoadingProjects ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : projects.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No projects found. Create a new project to get started.
              </div>
            ) : (
              <div className="space-y-1">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center gap-1 rounded-md hover:bg-accent transition-colors group"
                  >
                    {/* Clickable load area */}
                    <button
                      className="flex-1 flex flex-col items-start text-left px-3 py-2 min-w-0"
                      onClick={() => handleLoadProject(project.id)}
                      disabled={isLoading}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{project.displayName}</span>
                        {project.isOwned === false && project.sharedRole && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {project.sharedRole}
                          </Badge>
                        )}
                        {project.isOwned && project.sharedWith && project.sharedWith.length > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                            <Share2Icon className="h-2.5 w-2.5" />
                            {project.sharedWith.length}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {project.tags && project.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {project.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Updated {new Date(project.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>

                    {/* Share button — only for owned projects */}
                    {project.isOwned !== false && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground mr-1"
                        title="Share project"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareTarget(project);
                        }}
                      >
                        <Share2Icon className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoadingProjects}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages || isLoadingProjects}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Share project dialog — rendered outside the scroll area to avoid z-index issues */}
      {shareTarget && (
        <ShareProjectDialog
          open={!!shareTarget}
          onOpenChange={(v) => { if (!v) setShareTarget(null); }}
          projectId={shareTarget.id}
          projectName={shareTarget.displayName}
        />
      )}
    </Dialog>
  );
}
