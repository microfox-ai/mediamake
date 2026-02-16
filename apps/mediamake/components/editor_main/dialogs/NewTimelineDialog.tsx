"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useProjectStore } from "../stores/project-store";
import useQueryState from "@/hooks/use-query-state";
import { useSession } from "@/components/session-provider";
import { useSearchParams } from "next/navigation";

interface NewTimelineDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const TIMELINE_TEMPLATES = [
    { id: "blank", name: "Blank", description: "Start with a clean timeline" },
];

export function NewTimelineDialog({ open, onOpenChange }: NewTimelineDialogProps) {
    const [name, setName] = useState("");
    const [template, setTemplate] = useState("blank");
    const [isLoading, setIsLoading] = useState(false);
    const params = useSearchParams();
    const projectIdFromQuery = params.get("id");
    const { setTimelines, currentProjectId } = useProjectStore();
    const session = useSession();

    // Use currentProjectId from store as fallback if query state isn't ready yet
    const projectId = projectIdFromQuery || currentProjectId;

    useEffect(() => {
        if (!open) {
            setName("");
            setTemplate("blank");
        }
    }, [open]);

    const handleCreate = async () => {
        if (!name.trim() || !projectId) return;

        setIsLoading(true);
        try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (session?.clientId) {
                headers['x-client-id'] = session.clientId;
            }
            const response = await fetch("/api/project/timeline", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    projectId,
                    displayName: name.trim(),
                    template,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to create timeline");
            }

            // Reload timelines for the project
            const timelineHeaders: Record<string, string> = {};
            if (session?.clientId) {
                timelineHeaders['x-client-id'] = session.clientId;
            }
            const timelinesResponse = await fetch(`/api/project/timeline?projectId=${projectId}`, {
                headers: timelineHeaders,
            });
            if (timelinesResponse.ok) {
                const timelines = await timelinesResponse.json();
                setTimelines(timelines);
            }

            onOpenChange(false);
            setName("");
        } catch (error) {
            console.error("Error creating timeline:", error);
            alert("Failed to create timeline. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!projectId) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>No Project Selected</DialogTitle>
                        <DialogDescription>
                            Please create or load a project first before creating a timeline.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => onOpenChange(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Timeline</DialogTitle>
                    <DialogDescription>
                        Create a new timeline. Choose a template to start with.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="timeline-name">Timeline Name</Label>
                        <Input
                            id="timeline-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter timeline name"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && name.trim()) {
                                    handleCreate();
                                }
                            }}
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Template</Label>
                        <RadioGroup value={template} onValueChange={setTemplate}>
                            {TIMELINE_TEMPLATES.map((tmpl) => (
                                <div key={tmpl.id} className="flex items-center space-x-2">
                                    <RadioGroupItem value={tmpl.id} id={tmpl.id} />
                                    <Label htmlFor={tmpl.id} className="cursor-pointer">
                                        <div>
                                            <div className="font-medium">{tmpl.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {tmpl.description}
                                            </div>
                                        </div>
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={!name.trim() || isLoading}>
                        {isLoading ? "Creating..." : "Create"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
