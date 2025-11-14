"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SchemaForm } from "@/components/editor/presets/form/schema-form";
import { Input } from "@/components/ui/input";
import { JsonEditor } from "@/components/editor/player/json-editor";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export function MetaDataCard({
    sentenceIndex,
    data,
    isActive,
    onSave,
    isSelected,
    onToggleSelect,
}: {
    sentenceIndex: number;
    data: any;
    isActive: boolean;
    onSave: (updated: any) => Promise<void> | void;
    isSelected: boolean;
    onToggleSelect: () => void;
}) {
    const ref = useRef<HTMLDivElement | null>(null);
    const [activeTab, setActiveTab] = useState<"json" | "form">("json");
    const [jsonText, setJsonText] = useState<string>(() => JSON.stringify(data?.metadata ?? {}, null, 2));
    const [formData, setFormData] = useState<any>(data?.metadata ?? {});
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (isActive && ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [isActive]);

    useEffect(() => {
        setJsonText(JSON.stringify(data?.metadata ?? {}, null, 2));
        setFormData(data?.metadata ?? {});
        setHasChanges(false);
    }, [data]);

    const derivedSchema = useMemo(() => {
        const derive = (obj: any): any => {
            if (obj === null || obj === undefined) return { type: "null" };
            if (Array.isArray(obj)) {
                return { type: "array", items: obj.length > 0 ? derive(obj[0]) : {} };
            }
            switch (typeof obj) {
                case "string": return { type: "string" };
                case "number": return { type: "number" };
                case "boolean": return { type: "boolean" };
                case "object": {
                    const properties: Record<string, any> = {};
                    const required: string[] = [];
                    Object.keys(obj).forEach((key) => {
                        properties[key] = derive(obj[key]);
                        required.push(key);
                    });
                    return { type: "object", properties, required };
                }
                default: return { type: "string" };
            }
        };
        return derive(formData);
    }, [formData]);

    const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setJsonText(text);
        try {
            const parsed = JSON.parse(text);
            setFormData(parsed);
            setHasChanges(JSON.stringify(parsed) !== JSON.stringify(data));
        } catch {
            // keep text, mark as changed but invalid JSON will disable save
            setHasChanges(true);
        }
    };

    const handleFormChange = useCallback((newData: any) => {
        setFormData(newData);
        setJsonText(JSON.stringify(newData, null, 2));
        setHasChanges(JSON.stringify(newData) !== JSON.stringify(data?.metadata ?? {}));
    }, [data]);

    const isJsonValid = useMemo(() => {
        try { JSON.parse(jsonText); return true; } catch { return false; }
    }, [jsonText]);

    const handleSave = async () => {
        if (!hasChanges || !isJsonValid) return;
        setIsSaving(true);
        try {
            const metadataPayload = JSON.parse(jsonText);
            // Wrap the metadata in the full sentence structure
            const payload = {
                ...data,
                metadata: metadataPayload
            };
            await onSave(payload);
            setHasChanges(false);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div ref={ref} className={isActive ? "rounded-md" : undefined}>
            <Card className={`py-1 px-0 mx-2 ${isActive ?
                "ring-2 ring-primary" : ""
                }`}>
                <CardHeader
                    className="px-1 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-1 min-w-0">
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={onToggleSelect}
                            className="h-4 w-4 ml-1"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsExpanded(v => !v)}>
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                        <CardTitle
                            onClick={() => {
                                setIsExpanded((e) => !e)
                            }}
                            className="text-sm truncate cursor-pointer">
                            {sentenceIndex + 1}. {data?.originalText || ""}
                        </CardTitle>
                    </div>
                    {isExpanded && (
                        <div className="flex items-center gap-2">
                            {hasChanges && <Button size="sm" disabled={!hasChanges || !isJsonValid || isSaving} onClick={handleSave}>
                                {isSaving ? "Saving..." : "Save Changes"}
                            </Button>}
                        </div>
                    )}
                </CardHeader>
                {isExpanded && (
                    <CardContent>
                        <div className="max-h-[320px] overflow-auto">
                            <SchemaForm
                                schema={derivedSchema}
                                value={formData}
                                onChange={handleFormChange}
                                onReset={() => handleFormChange(data?.metadata ?? {})}
                                title="Metadata"
                                showTabs={true}
                                showResetButton={true}
                            />
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}


