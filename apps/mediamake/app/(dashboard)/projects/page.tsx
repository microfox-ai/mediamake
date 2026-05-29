"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderIcon,
  Loader2Icon,
  RefreshCwIcon,
  Search as SearchIcon,
  Share2Icon,
  ExternalLinkIcon,
  PencilIcon,
} from "lucide-react";
import { useSession } from "@/components/session-provider";
import { ShareProjectDialog } from "@/components/editor_main/dialogs/ShareProjectDialog";

interface Project {
  id: string;
  displayName: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  isOwned?: boolean;
  sharedRole?: "editor" | "viewer";
  sharedWith?: Array<{ clientId: string; role: string }>;
}

type Tab = "all" | "owned" | "shared";

export default function ProjectsPage() {
  const router = useRouter();
  const session = useSession();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState<Tab>("all");
  const [shareTarget, setShareTarget] = React.useState<Project | null>(null);

  const fetch_ = React.useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (session?.clientId) headers["x-client-id"] = session.clientId;
      const res = await fetch("/api/project", { headers });
      if (!res.ok) {
        setProjects([]);
        return;
      }
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : (data.projects ?? []));
    } finally {
      setLoading(false);
    }
  }, [session?.clientId]);

  React.useEffect(() => { fetch_(); }, [fetch_]);

  // Stats
  const owned = projects.filter((p) => p.isOwned !== false);
  const shared = projects.filter((p) => p.isOwned === false);
  const totalMembers = owned.reduce((s, p) => s + (p.sharedWith?.length ?? 0), 0);

  // Apply filters
  let visible = projects;
  if (tab === "owned") visible = owned;
  else if (tab === "shared") visible = shared;
  if (search.trim()) {
    const q = search.toLowerCase();
    visible = visible.filter((p) =>
      p.displayName.toLowerCase().includes(q) ||
      (p.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }

  const open = (id: string) => router.push(`/editor?id=${id}`);

  return (
    <SidebarInset>
      <SiteHeader title="Projects" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">

            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FolderIcon className="h-5 w-5" /> Projects
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Manage your projects and control who has access.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={fetch_}
                disabled={loading}
              >
                {loading
                  ? <Loader2Icon className="h-4 w-4 animate-spin" />
                  : <RefreshCwIcon className="h-4 w-4" />}
                Refresh
              </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-3 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-1">
                  <CardDescription>Total projects</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">{projects.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-1">
                  <CardDescription>Shared with me</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">{shared.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-1">
                  <CardDescription>People I've invited</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">{totalMembers}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <SearchIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search projects…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-8 text-sm"
                    />
                  </div>
                  <Select value={tab} onValueChange={(v) => setTab(v as Tab)}>
                    <SelectTrigger className="w-40 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All ({projects.length})</SelectItem>
                      <SelectItem value="owned">Owned ({owned.length})</SelectItem>
                      <SelectItem value="shared">Shared with me ({shared.length})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading && (
                  <div className="p-4 grid gap-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-md" />)}
                  </div>
                )}

                {!loading && visible.length === 0 && (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    {search || tab !== "all"
                      ? "No projects match your filters."
                      : "No projects yet — open the editor to create one."}
                  </p>
                )}

                {!loading && visible.length > 0 && (
                  <div className="divide-y">
                    {visible.map((p) => {
                      const isOwned = p.isOwned !== false;
                      return (
                        <div
                          key={p.id}
                          className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                        >
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => open(p.id)}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-sm">{p.displayName}</span>
                              {!isOwned && p.sharedRole && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  shared · {p.sharedRole}
                                </Badge>
                              )}
                              {isOwned && p.sharedWith && p.sharedWith.length > 0 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                                  <Share2Icon className="h-2.5 w-2.5" />
                                  {p.sharedWith.length} member{p.sharedWith.length === 1 ? "" : "s"}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {(p.tags ?? []).map((tag) => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                  {tag}
                                </span>
                              ))}
                              <span className="text-[11px] text-muted-foreground">
                                Updated {new Date(p.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isOwned && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title="Share & manage members"
                                onClick={(e) => { e.stopPropagation(); setShareTarget(p); }}
                              >
                                <Share2Icon className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Open in editor"
                              onClick={() => open(p.id)}
                            >
                              <ExternalLinkIcon className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {shareTarget && (
              <ShareProjectDialog
                open={!!shareTarget}
                onOpenChange={(v) => {
                  if (!v) {
                    setShareTarget(null);
                    fetch_(); // refresh member badge count on close
                  }
                }}
                projectId={shareTarget.id}
                projectName={shareTarget.displayName}
              />
            )}
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}
