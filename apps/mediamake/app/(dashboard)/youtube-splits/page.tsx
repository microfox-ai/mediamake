"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TagsSelector } from "@/components/ui/tags-selector";
import { useWorkflowJob } from "@/hooks/useWorkflowJob";
import { useSession } from "@/components/session-provider";
import { toast } from "sonner";
import { ExternalLink, Loader2, RefreshCcw, Image as ImageIcon } from "lucide-react";
import { MediaPicker } from "@/components/editor/media/media-picker";
import { MediaProvider } from "@/components/editor/media/media-context";
import type { MediaFile as MediaFileType } from "@/app/types/media";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MediaFileDoc = {
  _id: string;
  tags?: string[];
  clientId?: string;
  projectId?: string;
  createdAt?: string;
  updatedAt?: string;
  contentSource?: string;
  contentSourceUrl?: string;
  fileName?: string;
  fileSize?: number;
  filePath?: string;
  metadata?: any;
};

type SplitGroup = {
  key: string;
  splitBatchId: string | null;
  title: string | null;
  youtubeUrl: string | null;
  videoId: string | null;
  createdAt: string | null;
  count: number;
  items: MediaFileDoc[];
};

export default function YoutubeSplitsPage() {
  const session = useSession();

  const [videoUrl, setVideoUrl] = useState("");
  const [sceneThreshold, setSceneThreshold] = useState(0.3);
  const [folder, setFolder] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>(["video-splitter"]);

  const [projects, setProjects] = useState<{ id: string; displayName: string }[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<{ id: string; displayName: string } | null>(null);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<SplitGroup[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaFileType | null>(null);

  const {
    trigger,
    jobId,
    status,
    output,
    error,
    loading,
    polling,
    reset,
  } = useWorkflowJob({
    type: "worker",
    workerId: "video-splitter",
    pollIntervalMs: 3000,
    pollTimeoutMs: 900_000,
    autoPoll: true,
    onComplete: () => {
      void refreshHistory();
    },
  });

  const headers = useMemo(() => {
    const h: Record<string, string> = {};
    if (session?.clientId) h["x-client-id"] = session.clientId;
    return h;
  }, [session?.clientId]);

  const refreshHistory = useCallback(async () => {
    if (!session?.clientId) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(
        "/api/media-files?contentSource=url&limit=200&sort=createdAt&order=desc",
        { headers },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const files: MediaFileDoc[] = Array.isArray(data?.files) ? data.files : [];

      const byKey = new Map<string, MediaFileDoc[]>();
      for (const f of files) {
        const splitBatchId = (f as any)?.metadata?.splitBatchId as string | undefined;
        const videoId = (f as any)?.metadata?.videoId as string | undefined;
        const key = splitBatchId || (videoId ? `video:${videoId}` : `url:${f.contentSourceUrl ?? "unknown"}`);
        const arr = byKey.get(key) ?? [];
        arr.push(f);
        byKey.set(key, arr);
      }

      const groups: SplitGroup[] = [];
      for (const [key, items] of byKey.entries()) {
        const sorted = [...items].sort((a, b) => {
          const ai = Number(new Date(a.createdAt ?? 0));
          const bi = Number(new Date(b.createdAt ?? 0));
          return bi - ai;
        });
        const first = sorted[0];
        const title = (first as any)?.metadata?.title ?? null;
        const youtubeUrl0 = (first as any)?.contentSourceUrl ?? null;
        const videoId0 = (first as any)?.metadata?.videoId ?? null;
        const splitBatchId0 = (first as any)?.metadata?.splitBatchId ?? null;
        const createdAt0 = first?.createdAt ?? null;
        groups.push({
          key,
          splitBatchId: splitBatchId0,
          title,
          youtubeUrl: youtubeUrl0,
          videoId: videoId0,
          createdAt: createdAt0,
          count: sorted.length,
          items: sorted.sort((a, b) => {
            const ai = Number((a as any)?.metadata?.sceneIndex ?? 0);
            const bi = Number((b as any)?.metadata?.sceneIndex ?? 0);
            return ai - bi;
          }),
        });
      }

      groups.sort((a, b) => Number(new Date(b.createdAt ?? 0)) - Number(new Date(a.createdAt ?? 0)));
      setHistory(groups);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load video split history");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [headers, session?.clientId]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    const loadProjects = async () => {
      if (!session?.clientId) return;
      setProjectsLoading(true);
      try {
        const res = await fetch("/api/project", { headers });
        const data = res.ok ? await res.json() : [];
        setProjects(Array.isArray(data) ? data : []);
      } catch {
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };
    void loadProjects();
  }, [headers, session?.clientId]);

  const canRun = videoUrl.trim().length > 0 && !loading;

  const workerOutput = (output as any)?.output as
    | { title?: string; sceneUrls?: string[]; segmentCount?: number; error?: string }
    | undefined;

  const runSplit = async () => {
    if (!session?.clientId) {
      toast.error("Missing clientId");
      return;
    }
    if (!videoUrl.trim()) return;
    if (!Number.isFinite(sceneThreshold) || sceneThreshold < 0 || sceneThreshold > 1) {
      toast.error("Scene threshold must be between 0 and 1");
      return;
    }
    if (selectedTags.length === 0) {
      toast.error("Please select at least one tag");
      return;
    }

    try {
      await trigger({
        videoUrl: videoUrl.trim(),
        clientId: session.clientId,
        sceneThreshold,
        ...(folder.trim() ? { folder: folder.trim() } : {}),
        tags: selectedTags,
        ...(selectedProject?.id ? { projectId: selectedProject.id } : {}),
      });
      toast.success("Split job queued");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to queue job");
    }
  };

  const handleMediaSelect = (files: MediaFileType | MediaFileType[]) => {
    const file = Array.isArray(files) ? files[0] : files;
    if (!file) return;
    setSelectedMedia(file);
    const src = file.filePath || file.contentSourceUrl || "";
    if (src) {
      setVideoUrl(src);
    }
    // Auto-select project based on media
    if (file.projectId) {
      const p = projects.find((x) => x.id === file.projectId);
      if (p) {
        setSelectedProject({ id: p.id, displayName: p.displayName });
      }
    } else {
      setSelectedProject(null);
    }
    // Auto-select tags based on media
    if (Array.isArray(file.tags) && file.tags.length > 0) {
      setSelectedTags(file.tags);
    }
    setShowMediaPicker(false);
  };

  return (
    <MediaProvider>
      <SidebarInset>
        <SiteHeader title="Video Splits" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Card>
          <CardHeader>
            <CardTitle>Split a video from URL</CardTitle>
              <CardDescription>
                Download a video from a direct URL, detect scene changes, upload each scene to S3, and save each split in MongoDB.
              </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="yt-url">Video URL</Label>
              <div className="relative">
                <Input
                  id="yt-url"
                  placeholder="https://example.com/path/to/video.mp4"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="pr-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-1 my-auto h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowMediaPicker(true)}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </div>
              {selectedMedia && (
                <p className="text-xs text-muted-foreground">
                  Selected media:{' '}
                  <span className="font-medium">
                    {selectedMedia.fileName ?? selectedMedia._id?.toString?.() ?? String(selectedMedia._id)}
                  </span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="threshold">Scene threshold (0-1)</Label>
                <Input
                  id="threshold"
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={sceneThreshold}
                  onChange={(e) => setSceneThreshold(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Lower = more cuts, higher = fewer cuts.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="folder">S3 folder (optional)</Label>
                <Input
                  id="folder"
                  placeholder={`mediamake/${session?.clientId ?? "default"}/video-scenes`}
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Project (optional)</Label>
              <Select
                value={selectedProject?.id ?? "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    setSelectedProject(null);
                  } else {
                    const p = projects.find((x) => x.id === value);
                    if (p) setSelectedProject({ id: p.id, displayName: p.displayName });
                  }
                }}
                disabled={projectsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={projectsLoading ? "Loading..." : "No project"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TagsSelector selectedTags={selectedTags} onTagsChange={setSelectedTags} required />

            <div className="flex flex-wrap gap-2">
              <Button onClick={runSplit} disabled={!canRun} className="min-w-[160px]">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Queuing...
                  </>
                ) : (
                  "Split video"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  reset();
                  toast.message("Reset job state");
                }}
              >
                Reset
              </Button>
            </div>

            <div className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <span className="text-muted-foreground">Status:</span> <span className="font-medium">{status}</span>
                </div>
                {polling && (
                  <div className="text-muted-foreground">Polling...</div>
                )}
                {jobId && (
                  <div className="text-muted-foreground">Job: <span className="font-mono">{jobId}</span></div>
                )}
              </div>
              {(error || (workerOutput as any)?.error) && (
                <div className="mt-2 text-red-600">
                  {(error as any)?.message ?? (workerOutput as any)?.error}
                </div>
              )}

              {Array.isArray(workerOutput?.sceneUrls) && workerOutput.sceneUrls.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-muted-foreground">
                    Output scenes: <span className="font-medium">{workerOutput.sceneUrls.length}</span>
                  </div>
                  <div className="space-y-1">
                    {workerOutput.sceneUrls.slice(0, 10).map((u) => (
                      <div key={u} className="flex items-center justify-between gap-2">
                        <div className="truncate font-mono text-xs">{u}</div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigator.clipboard.writeText(u)}
                          >
                            Copy
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <a href={u} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                    {workerOutput.sceneUrls.length > 10 && (
                      <div className="text-xs text-muted-foreground">
                        Showing first 10. Full list is stored in history below.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            </CardContent>
          </Card>

          <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>History</CardTitle>
              <CardDescription>Past video split runs and their scene outputs.</CardDescription>
            </div>
            <Button variant="outline" onClick={refreshHistory} disabled={historyLoading}>
              {historyLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : history.length === 0 ? (
              <div className="text-sm text-muted-foreground">No splits found yet.</div>
            ) : (
              <Accordion type="multiple" className="w-full">
                {history.map((g) => (
                  <AccordionItem key={g.key} value={g.key}>
                    <AccordionTrigger>
                      <div className="flex w-full flex-col gap-1">
                        <div className="flex w-full items-center justify-between gap-3">
                          <div className="truncate font-medium">
                            {g.title ?? g.videoId ?? "Video split"}
                          </div>
                          <div className="shrink-0 text-xs text-muted-foreground">
                            {g.count} scenes
                          </div>
                        </div>
                        <div className="flex w-full items-center justify-between gap-3">
                          <div className="truncate text-xs text-muted-foreground">
                            {g.youtubeUrl ?? ""}
                          </div>
                          <div className="shrink-0 text-xs text-muted-foreground">
                            {g.createdAt ? new Date(g.createdAt).toLocaleString() : ""}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 px-1">
                        <div className="flex flex-wrap gap-2">
                          {g.youtubeUrl && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={g.youtubeUrl} target="_blank" rel="noreferrer">
                                Open YouTube <ExternalLink className="ml-2 h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          {g.splitBatchId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigator.clipboard.writeText(g.splitBatchId!)}
                            >
                              Copy batch id
                            </Button>
                          )}
                        </div>

                        <div className="space-y-2">
                          {g.items.map((f) => {
                            const u = f.filePath ?? "";
                            const idx = (f as any)?.metadata?.sceneIndex as number | undefined;
                            return (
                              <div key={f._id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium">
                                    Scene {idx ?? "?"} — {f.fileName ?? "video.mp4"}
                                  </div>
                                  <div className="truncate font-mono text-xs text-muted-foreground">{u}</div>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(u)}>
                                    Copy
                                  </Button>
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={u} target="_blank" rel="noreferrer">
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
          </Card>
        </div>
        {showMediaPicker && (
          <MediaPicker
            pickerMode
            singular
            onSelect={handleMediaSelect}
            onClose={() => setShowMediaPicker(false)}
          />
        )}
      </SidebarInset>
    </MediaProvider>
  );
}

