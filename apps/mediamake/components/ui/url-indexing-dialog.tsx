"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { TagMultiSelect } from "./tag-multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMedia } from "@/components/editor/media/media-context";
import { useSession } from "@/components/session-provider";

interface Project {
  id: string;
  displayName: string;
  tags?: string[];
}

interface UrlIndexingDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (params: {
        url: string;
        indexingLimit: number;
        crawlVideos: boolean;
        tags: string[];
        projectId: string | null;
        projectDisplayName: string | null;
    }) => Promise<void> | void;
    loading?: boolean;
    preselectedTags?: string[];
}

interface IndexingProgress {
    indexingId: string;
    status: 'pending' | 'indexing' | 'completed' | 'error';
    progress: number;
    error?: string;
}

export function UrlIndexingDialog({
    isOpen,
    onClose,
    onSubmit,
    loading = false,
    preselectedTags = []
}: UrlIndexingDialogProps) {
    const { hashtagFilters } = useMedia();
    const session = useSession();
    const [url, setUrl] = useState("");
    const [indexingLimit, setIndexingLimit] = useState(10);
    const [crawlVideos, setCrawlVideos] = useState(true);
    const [selectedTags, setSelectedTags] = useState<string[]>(preselectedTags);
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectsLoading, setProjectsLoading] = useState(false);
    const [selectedProject, setSelectedProject] = useState<{ id: string; displayName: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            const headers: Record<string, string> = {};
            if (session?.clientId) headers["x-client-id"] = session.clientId;
            setProjectsLoading(true);
            fetch("/api/project", { headers })
                .then((res) => (res.ok ? res.json() : []))
                .then((data) => (Array.isArray(data) ? setProjects(data) : setProjects([])))
                .catch(() => setProjects([]))
                .finally(() => setProjectsLoading(false));
        }
    }, [isOpen, session?.clientId]);

    useEffect(() => {
        if (isOpen) {
            setUrl("");
            setIndexingLimit(10);
            setCrawlVideos(true);
            setSelectedProject(null);
            const tagsToUse =
                hashtagFilters.length > 0 ? hashtagFilters : preselectedTags;
            setSelectedTags(tagsToUse);
        }
    }, [isOpen, preselectedTags, hashtagFilters]);

    const startIndexing = async () => {
        if (!url.trim() || selectedTags.length === 0) return;

        try {
            await onSubmit({
                url: url.trim(),
                indexingLimit,
                crawlVideos,
                tags: selectedTags,
                projectId: selectedProject?.id ?? null,
                projectDisplayName: selectedProject?.displayName ?? null,
            });
        } catch (error) {
            console.error("Error starting indexing:", error);
            toast.error("Failed to start indexing");
        }
    };

    const handleClose = () => {
        setUrl("");
        setIndexingLimit(10);
        setCrawlVideos(true);
        setSelectedTags([]);
        onClose();
    };

    const canStartIndexing =
        url.trim().length > 0 && selectedTags.length > 0 && !loading;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Link className="h-5 w-5" />
                        URL Indexing
                    </DialogTitle>
                    <DialogDescription>
                        Index content from a URL and create media files from the results.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* URL Input */}
                    <div className="space-y-2">
                        <Label htmlFor="url">URL</Label>
                        <Input
                            id="url"
                            type="url"
                            placeholder="https://example.com"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                    </div>

                    {/* Indexing Limit */}
                    <div className="space-y-2">
                        <Label htmlFor="indexingLimit">Indexing Limit</Label>
                        <Input
                            id="indexingLimit"
                            type="number"
                            min="1"
                            max="100"
                            value={indexingLimit}
                            onChange={(e) => setIndexingLimit(parseInt(e.target.value) || 10)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Maximum number of items to index from the URL
                        </p>
                    </div>

                    {/* Project selector */}
                    <div className="space-y-2">
                        <Label>Project (optional)</Label>
                            <Select
                                value={selectedProject?.id ?? "stocksearch"}
                                onValueChange={(value) => {
                                    if (value === "stocksearch") {
                                        setSelectedProject(null);
                                    } else {
                                        const p = projects.find((x) => x.id === value);
                                        if (p) setSelectedProject({ id: p.id, displayName: p.displayName });
                                    }
                                }}
                                disabled={projectsLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={projectsLoading ? "Loading..." : "Stocksearch (shared namespace)"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="stocksearch">Stocksearch (shared namespace)</SelectItem>
                                {projects.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.displayName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Choose a project to index into, or use Default for the shared stock search.
                        </p>
                    </div>

                    {/* Crawl Videos Checkbox */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="crawlVideos"
                            checked={crawlVideos}
                            onCheckedChange={(checked) => setCrawlVideos(checked as boolean)}
                        />
                        <Label htmlFor="crawlVideos">Crawl Videos</Label>
                    </div>

                    {/* Tags Selector */}
                    <TagMultiSelect
                        selectedTags={selectedTags}
                        onTagsChange={setSelectedTags}
                        label="Tags"
                        required={true}
                    />

                </div>

                <DialogFooter className="flex flex-col gap-3">
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={startIndexing}
                            disabled={!canStartIndexing}
                            className="min-w-[120px]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Starting...
                                </>
                            ) : (
                                'Start Indexing'
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
