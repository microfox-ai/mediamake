"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Database, Code, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Preset, DatabasePreset } from "./types";
import { predefinedPresets } from "./registry/registry/presets-registry";

interface PresetsSidebarProps {
    selectedPreset: Preset | DatabasePreset | null;
    onSelectPreset: (preset: Preset | DatabasePreset | null) => void;
}

export function PresetsSidebar({ selectedPreset, onSelectPreset }: PresetsSidebarProps) {
    const [databasePresets, setDatabasePresets] = useState<DatabasePreset[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"predefined" | "database">("predefined");

    // Fetch database presets
    const fetchDatabasePresets = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/presets?type=database');
            const data = await response.json();
            setDatabasePresets(data.presets || []);
        } catch (error) {
            console.error('Failed to fetch database presets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDatabasePresets();
    }, []);

    const handlePresetSelect = (preset: Preset | DatabasePreset) => {
        onSelectPreset(preset);
    };

    const renderPresetCard = (preset: Preset | DatabasePreset) => {
        // Use _id for database presets, metadata.id for predefined presets
        const uniqueId = '_id' in preset && preset._id
            ? preset._id.toString()
            : preset.metadata.id;

        // Check if this preset is selected
        const isSelected = selectedPreset && (
            ('_id' in selectedPreset && '_id' in preset && selectedPreset._id?.toString() === preset._id?.toString()) ||
            selectedPreset.metadata.id === preset.metadata.id
        );

        return (
            <div
                key={uniqueId}
                className={`cursor-pointer hover:bg-muted/50 transition-colors border border-2 rounded-md p-2 ${isSelected ? 'ring-2 ring-primary' : ''
                    }`}
                onClick={() => handlePresetSelect(preset)}
            >
                <div className="pb-2">
                    <div className="flex items-start justify-between">
                        <CardTitle className="text-sm">{preset.metadata.title}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                            {preset.metadata.presetType}
                        </Badge>
                    </div>
                </div>
                <div>
                    {preset.metadata.tags && preset.metadata.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {preset.metadata.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                                    {tag}
                                </Badge>
                            ))}
                            {preset.metadata.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                    +{preset.metadata.tags.length - 3}
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="w-80 border-r bg-background">
            <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Presets</h2>
                        <Button size="sm" variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            New Preset
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "predefined" | "database")} className="h-full flex flex-col">
                        <div className="px-4 pt-4">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="predefined" className="flex items-center gap-2">
                                    <Code className="h-4 w-4" />
                                    Predefined
                                </TabsTrigger>
                                <TabsTrigger value="database" className="flex items-center gap-2">
                                    <Database className="h-4 w-4" />
                                    Database
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="predefined" className="flex-1 overflow-y-auto p-4 mt-0">
                            <div className="space-y-2">
                                {predefinedPresets.length > 0 ? (
                                    predefinedPresets
                                        .filter((preset) => !preset.metadata.deprecated)
                                        .map(renderPresetCard)
                                ) : (
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">No predefined presets</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-xs text-muted-foreground">
                                                No predefined presets available
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="database" className="flex-1 overflow-y-auto p-4 mt-0">
                            <div className="space-y-2">
                                {loading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : databasePresets.length > 0 ? (
                                    databasePresets.map(renderPresetCard)
                                ) : (
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">No database presets</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-xs text-muted-foreground">
                                                Create your first database preset to get started
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
