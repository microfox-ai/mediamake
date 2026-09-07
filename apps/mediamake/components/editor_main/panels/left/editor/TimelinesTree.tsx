"use client";

import { useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Loader2, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectStore } from "../../../stores/project-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { TimelineItem } from "./TimelineItem";
import { TimelineHistoryPanel } from "./TimelineHistoryPanel";
import { useSession } from "@/components/session-provider";

export function TimelinesTree() {
    const { timelines, currentProjectId, setTimelines } = useProjectStore();
    const { registerCloudTimelines } = useTimelineEditsStore();
    const session = useSession();
    const historyCount = useTimelineEditsStore((s) => s.history.length);
    const isDirty = useTimelineEditsStore(
        (s) =>
            s.isDirty ||
            (s.historyIndex >= 0 &&
                s.history.some((entry, index) => index <= s.historyIndex && !entry.published))
    );

    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const runSearch = useCallback(async () => {
        if (!currentProjectId) return;

        setIsSearching(true);
        try {
            const params = new URLSearchParams({
                projectId: currentProjectId,
                summary: "true",
                page: "1",
                limit: "100",
            });

            const trimmed = searchQuery.trim();
            if (trimmed) {
                params.set("search", trimmed);
            }

            const headers: Record<string, string> = {};
            if (session?.clientId) {
                headers["x-client-id"] = session.clientId;
            }

            const response = await fetch(`/api/project/timeline?${params.toString()}`, {
                headers,
            });

            if (!response.ok) {
                throw new Error("Failed to search timelines");
            }

            const data = await response.json();
            const nextTimelines = Array.isArray(data) ? data : data.timelines || [];
            setTimelines(nextTimelines);
            registerCloudTimelines(nextTimelines);
        } catch (error) {
            console.error("Error searching timelines:", error);
        } finally {
            setIsSearching(false);
        }
    }, [currentProjectId, searchQuery, session?.clientId, setTimelines, registerCloudTimelines]);

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            runSearch();
        }
    };

    const handleSearchClick = () => {
        if (searchQuery.trim()) {
            runSearch();
        }
    };

    const handleClearSearch = () => {
        setSearchQuery("");
        runSearch();
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-1 border-b flex items-center gap-1">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search timelines..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="h-7 pl-7 pr-16 text-xs"
                        disabled={showHistory}
                    />
                    {searchQuery && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground"
                            onClick={handleClearSearch}
                            disabled={isSearching}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground"
                        onClick={handleSearchClick}
                        disabled={isSearching}
                    >
                        {isSearching ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Search className="h-3 w-3" />
                        )}
                    </Button>
                </div>
                <Button
                    type="button"
                    variant={showHistory ? "default" : "outline"}
                    size="icon"
                    className="h-7 w-7 shrink-0 relative"
                    title={showHistory ? "Back to timelines" : "View timeline history"}
                    onClick={() => setShowHistory((v) => !v)}
                >
                    <History className="h-3.5 w-3.5" />
                    {!showHistory && (historyCount > 0 || isDirty) && (
                        <span className={cn(
                            "absolute -top-1 -right-1 h-2 w-2 rounded-full",
                            isDirty ? "bg-amber-400" : "bg-primary"
                        )} />
                    )}
                </Button>
            </div>
            {showHistory ? (
                <TimelineHistoryPanel />
            ) : (
                <ScrollArea className="flex-1 overflow-y-auto">
                    <div className="p-1 space-y-1">
                        {timelines.map((timeline) => (
                            <TimelineItem key={timeline.id} timeline={timeline} />
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>
    );
}