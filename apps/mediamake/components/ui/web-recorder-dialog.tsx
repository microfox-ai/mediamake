"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TagMultiSelect } from "./tag-multi-select";
import { cn } from "@/lib/utils";
import {
    Video,
    X,
    Plus,
    Check,
    AlertCircle,
    Loader2,
    Palette
} from "lucide-react";
import { toast } from "sonner";
import {
    createRecordingJob,
    buildSimpleRecordingRequest,
    parseAdvancedRecordingRequest,
    getRecordingJobStatus,
} from "@/lib/web-recorder";

interface WebRecorderDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onRecordingComplete?: () => void;
    preselectedTags?: string[];
    initialJsonContent?: string;
    initialMode?: 'simple' | 'advanced';
}

interface TextHighlight {
    id: string;
    text: string;
    color: string;
}

const DEFAULT_COLORS = [
    '#FFFF00', // Yellow
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#95E1D3', // Mint
    '#FF6B9D', // Pink
    '#C7F0DB', // Light Green
];

export function WebRecorderDialog({
    isOpen,
    onClose,
    onRecordingComplete,
    preselectedTags = [],
    initialJsonContent = "",
    initialMode = 'simple'
}: WebRecorderDialogProps) {
    // Mode toggle
    const [mode, setMode] = useState<'simple' | 'advanced'>(initialMode);
    
    // Simple mode state
    const [url, setUrl] = useState("");
    const [highlights, setHighlights] = useState<TextHighlight[]>([]);
    
    // Advanced mode state
    const [jsonInput, setJsonInput] = useState("");
    const [jsonError, setJsonError] = useState("");
    
    // Common state
    const [selectedTags, setSelectedTags] = useState<string[]>(preselectedTags);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingStatus, setRecordingStatus] = useState("");
    const [jobId, setJobId] = useState<string | null>(null);

    // Initialize with initial values when dialog opens
    useEffect(() => {
        if (isOpen) {
            if (initialJsonContent) {
                setJsonInput(initialJsonContent);
                setMode('advanced');
            } else {
                setMode(initialMode);
            }
        } else {
            // Reset state when dialog closes
            setUrl("");
            setHighlights([]);
            setJsonInput("");
            setJsonError("");
            setSelectedTags(preselectedTags);
            setIsRecording(false);
            setRecordingStatus("");
            setJobId(null);
        }
    }, [isOpen, preselectedTags, initialJsonContent, initialMode]);

    // Validate JSON in advanced mode
    useEffect(() => {
        if (mode === 'advanced' && jsonInput.trim()) {
            try {
                parseAdvancedRecordingRequest(jsonInput);
                setJsonError("");
            } catch (error) {
                setJsonError(error instanceof Error ? error.message : "Invalid JSON");
            }
        } else {
            setJsonError("");
        }
    }, [jsonInput, mode]);

    const addHighlight = () => {
        const newHighlight: TextHighlight = {
            id: `highlight-${Date.now()}`,
            text: "",
            color: DEFAULT_COLORS[highlights.length % DEFAULT_COLORS.length],
        };
        setHighlights([...highlights, newHighlight]);
    };

    const updateHighlight = (id: string, field: 'text' | 'color', value: string) => {
        setHighlights(highlights.map(h => 
            h.id === id ? { ...h, [field]: value } : h
        ));
    };

    const removeHighlight = (id: string) => {
        setHighlights(highlights.filter(h => h.id !== id));
    };

    const handleStartRecording = async () => {
        // Validate inputs
        if (selectedTags.length === 0) {
            toast.error("Please select at least one tag");
            return;
        }

        if (mode === 'simple') {
            if (!url.trim()) {
                toast.error("Please enter a URL");
                return;
            }

            // Validate URL format
            try {
                new URL(url);
            } catch {
                toast.error("Please enter a valid URL");
                return;
            }
        } else {
            if (!jsonInput.trim()) {
                toast.error("Please enter a JSON configuration");
                return;
            }

            if (jsonError) {
                toast.error("Please fix JSON errors before submitting");
                return;
            }
        }

        setIsRecording(true);
        setRecordingStatus("Submitting recording job...");

        try {
            let request;
            
            if (mode === 'simple') {
                // Filter out empty highlights
                const validHighlights = highlights
                    .filter(h => h.text.trim())
                    .map(h => ({ text: h.text, color: h.color }));
                
                request = buildSimpleRecordingRequest(url, validHighlights);
            } else {
                request = parseAdvancedRecordingRequest(jsonInput);
            }

            // Client ID is now handled by the API route
            const result = await createRecordingJob(request, selectedTags);

            if (result.success && result.jobId) {
                setJobId(result.jobId);
                setRecordingStatus("Recording job submitted successfully!");
                toast.success("Recording job submitted. You'll be notified when it's complete.");
                
                // Close dialog after a short delay
                setTimeout(() => {
                    onClose();
                    if (onRecordingComplete) {
                        onRecordingComplete();
                    }
                }, 2000);
            } else {
                throw new Error(result.error || "Failed to create recording job");
            }
        } catch (error) {
            console.error("Error starting recording:", error);
            toast.error(error instanceof Error ? error.message : "Failed to start recording");
            setRecordingStatus("");
            setIsRecording(false);
        }
    };

    const handleClose = () => {
        if (!isRecording) {
            onClose();
        }
    };

    const canSubmit = 
        !isRecording && 
        selectedTags.length > 0 && 
        (mode === 'simple' 
            ? url.trim().length > 0 
            : jsonInput.trim().length > 0 && !jsonError);

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Video className="h-5 w-5" />
                        Web Recorder
                    </DialogTitle>
                    <DialogDescription>
                        Record website interactions as video. Use simple mode for basic URL + highlights, or advanced mode for custom actions.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={mode} onValueChange={(v) => setMode(v as 'simple' | 'advanced')}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="simple">Simple Mode</TabsTrigger>
                        <TabsTrigger value="advanced">Advanced Mode</TabsTrigger>
                    </TabsList>

                    <TabsContent value="simple" className="space-y-4">
                        {/* URL Input */}
                        <div className="space-y-2">
                            <Label htmlFor="url">URL *</Label>
                            <Input
                                id="url"
                                type="url"
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                disabled={isRecording}
                            />
                            <p className="text-xs text-muted-foreground">
                                The website URL to record
                            </p>
                        </div>

                        {/* Text Highlights */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Text Highlights (Optional)</Label>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={addHighlight}
                                    disabled={isRecording}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Highlight
                                </Button>
                            </div>

                            {highlights.length > 0 && (
                                <div className="space-y-3 border rounded-md p-3">
                                    {highlights.map((highlight, index) => (
                                        <div key={highlight.id} className="flex gap-2 items-start">
                                            <div className="flex-1 space-y-2">
                                                <Input
                                                    placeholder={`Text to highlight ${index + 1}`}
                                                    value={highlight.text}
                                                    onChange={(e) => updateHighlight(highlight.id, 'text', e.target.value)}
                                                    disabled={isRecording}
                                                />
                                                <div className="flex gap-2 items-center">
                                                    <Palette className="h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        type="color"
                                                        value={highlight.color}
                                                        onChange={(e) => updateHighlight(highlight.id, 'color', e.target.value)}
                                                        className="w-20 h-8"
                                                        disabled={isRecording}
                                                    />
                                                    <span className="text-xs text-muted-foreground">{highlight.color}</span>
                                                </div>
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => removeHighlight(highlight.id)}
                                                disabled={isRecording}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {highlights.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Add text highlights to emphasize specific content on the page
                                </p>
                            )}
                        </div>

                        {/* Tags Selector */}
                        <TagMultiSelect
                            selectedTags={selectedTags}
                            onTagsChange={setSelectedTags}
                            label="Tags"
                            required={true}
                        />

                        {/* Status */}
                        {isRecording && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {recordingStatus}
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-4">
                        {/* JSON Input */}
                        <div className="space-y-2">
                            <Label htmlFor="json">Recording Configuration (JSON) *</Label>
                            <Textarea
                                id="json"
                                placeholder={`{
  "url": "https://example.com",
  "actions": [
    { "type": "goto", "url": "https://example.com", "waitUntil": "load" },
    { "type": "click", "selector": "#button" },
    { "type": "wait", "duration": 2000 }
  ],
  "highlights": [
    { "type": "text", "value": "Example", "color": "#FFFF00" }
  ],
  "viewport": { "width": 1280, "height": 720 }
}`}
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                                className="font-mono text-sm min-h-[300px]"
                                disabled={isRecording}
                            />
                            {jsonError && (
                                <div className="flex items-start gap-2 text-sm text-destructive">
                                    <AlertCircle className="h-4 w-4 mt-0.5" />
                                    <span>{jsonError}</span>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Enter a custom recording configuration. See{" "}
                                <a 
                                    href="https://docs.webactionrecorder.com" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="underline"
                                >
                                    API documentation
                                </a>{" "}
                                for details.
                            </p>
                        </div>

                        {/* Tags Selector */}
                        <TagMultiSelect
                            selectedTags={selectedTags}
                            onTagsChange={setSelectedTags}
                            label="Tags"
                            required={true}
                        />

                        {/* Status */}
                        {isRecording && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {recordingStatus}
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isRecording}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleStartRecording}
                        disabled={!canSubmit}
                    >
                        {isRecording ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Recording...
                            </>
                        ) : (
                            <>
                                <Video className="h-4 w-4 mr-2" />
                                Start Recording
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

