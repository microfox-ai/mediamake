"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";
import { Preset, DatabasePreset } from "@/components/editor/presets/types";
import { predefinedPresets } from "@/components/editor/presets/registry/registry/presets-registry";
import { Timeline } from "../../../stores/project-store";
import { cn } from "@/lib/utils";

interface PresetLibraryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    timeline: Timeline;
    onAddPreset: (preset: Preset | DatabasePreset) => void;
}

export function PresetLibraryDialog({
    open,
    onOpenChange,
    timeline,
    onAddPreset,
}: PresetLibraryDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [databasePresets, setDatabasePresets] = useState<DatabasePreset[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"predefined" | "database">("predefined");

    // Fetch database presets
    useEffect(() => {
        if (open && activeTab === "database") {
            setIsLoading(true);
            fetch("/api/presets?type=database")
                .then((res) => res.json())
                .then((data) => {
                    setDatabasePresets(data.presets || []);
                })
                .catch((error) => {
                    console.error("Failed to fetch database presets:", error);
                    setDatabasePresets([]);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [open, activeTab]);

    // Filter presets based on search query
    const filteredPredefinedPresets = predefinedPresets.filter((preset) =>
        preset.metadata.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.metadata.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.metadata.tags?.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    const filteredDatabasePresets = databasePresets.filter((preset) =>
        preset.metadata.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.metadata.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.metadata.tags?.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    const handlePresetSelect = (preset: Preset | DatabasePreset) => {
        onAddPreset(preset);
        onOpenChange(false);
        setSearchQuery("");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>
                        Preset Library - {timeline.displayName}
                    </DialogTitle>
                    <DialogDescription>
                        Browse and add presets to this timeline
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search presets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 border-b">
                        <button
                            onClick={() => setActiveTab("predefined")}
                            className={cn(
                                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                activeTab === "predefined"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Predefined
                        </button>
                        <button
                            onClick={() => setActiveTab("database")}
                            className={cn(
                                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                activeTab === "database"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Database
                        </button>
                    </div>

                    {/* Presets List */}
                    <ScrollArea className="h-[400px]">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : activeTab === "predefined" ? (
                            <div className="grid gap-3">
                                {filteredPredefinedPresets.length > 0 ? (
                                    filteredPredefinedPresets.map((preset) => (
                                        <div
                                            key={preset.metadata.id}
                                            className="cursor-pointer bg-accent/50 rounded-md hover:bg-black/10 transition-colors p-1"
                                            onClick={() => handlePresetSelect(preset)}
                                        >
                                            <div className="flex items-center justify-start gap-2">
                                                <h6 className="text-sm">
                                                    {preset.metadata.title}
                                                </h6>
                                                <div className="text-xs bg-primary/10 rounded-md px-2 py-1">
                                                    {preset.metadata.presetType}
                                                </div>
                                            </div>
                                            <div className="pt-0">
                                                {preset.metadata.description && (
                                                    <p className="text-xs text-muted-foreground mb-2">
                                                        {preset.metadata.description}
                                                    </p>
                                                )}
                                                {/* <div className="flex flex-wrap gap-1">
                                                    <Badge variant="secondary" className="text-xs">
                                                        {preset.metadata.presetType}
                                                    </Badge>
                                                    {preset.metadata.tags?.slice(0, 3).map((tag) => (
                                                        <Badge key={tag} variant="outline" className="text-xs">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div> */}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No presets found
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {filteredDatabasePresets.length > 0 ? (
                                    filteredDatabasePresets.map((preset) => (
                                        <Card
                                            key={preset.metadata.id}
                                            className="cursor-pointer hover:bg-accent transition-colors"
                                            onClick={() => handlePresetSelect(preset)}
                                        >
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm">
                                                    {preset.metadata.title}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                {preset.metadata.description && (
                                                    <p className="text-xs text-muted-foreground mb-2">
                                                        {preset.metadata.description}
                                                    </p>
                                                )}
                                                <div className="flex flex-wrap gap-1">
                                                    <Badge variant="secondary" className="text-xs">
                                                        {preset.metadata.presetType}
                                                    </Badge>
                                                    {preset.metadata.tags?.slice(0, 3).map((tag) => (
                                                        <Badge key={tag} variant="outline" className="text-xs">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No database presets found
                                    </div>
                                )}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
