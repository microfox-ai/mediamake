"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Clock,
    Tag,
    Loader2,
    CheckCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MidjourneyPromptRecord } from "@/app/ai/agents/midjourney/helpers";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface MidjourneyDialogProps {
    recordId: string | null;
    recordData: MidjourneyPromptRecord | null;
    onClose: () => void;
}

export function MidjourneyDialog({ recordId, recordData, onClose }: MidjourneyDialogProps) {
    const [record, setRecord] = useState<MidjourneyPromptRecord | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [copiedAllPrompts, setCopiedAllPrompts] = useState(false);
    const [copiedId, setCopiedId] = useState(false);
    const [indexRange, setIndexRange] = useState<[number, number]>([0, 0]);
    const [variationCount, setVariationCount] = useState<number>(1);
    const [showIndexRangePopover, setShowIndexRangePopover] = useState(false);
    const [showVariationCountPopover, setShowVariationCountPopover] = useState(false);
    const [includeTag, setIncludeTag] = useState(true);

    useEffect(() => {
        if (recordId) {
            if (recordData && recordData.prompts) {
                // Use the data passed from sidebar if available
                setRecord(recordData);
            } else {
                // Otherwise fetch from API
                fetchRecord(recordId);
            }
        } else {
            setRecord(null);
        }
    }, [recordId, recordData]);

    // Initialize index range when record changes
    useEffect(() => {
        if (record && record.prompts && record.prompts.length > 0) {
            const maxIndex = record.prompts.length - 1;
            setIndexRange([0, maxIndex]);
        }
    }, [record]);

    const fetchRecord = async (id: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/midjourney-prompts/${id}`);
            if (response.ok) {
                const data: MidjourneyPromptRecord = await response.json();
                setRecord(data);
            } else {
                console.error('Failed to fetch midjourney prompt record');
                toast.error('Failed to load record');
            }
        } catch (error) {
            console.error('Error fetching midjourney prompt record:', error);
            toast.error('Error loading record');
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = async (text: string, index: number) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedIndex(index);
            toast.success('Copied to clipboard');
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch (error) {
            toast.error('Failed to copy');
        }
    };

    const copyRecordId = async () => {
        const idToCopy = record?._id?.toString() || recordId;
        if (!idToCopy) {
            toast.error('No record id to copy');
            return;
        }
        try {
            await navigator.clipboard.writeText(idToCopy);
            setCopiedId(true);
            toast.success('Record id copied');
            setTimeout(() => setCopiedId(false), 2000);
        } catch (error) {
            toast.error('Failed to copy id');
        }
    };

    const copyAllPrompts = async () => {
        if (!record || !record.prompts || record.prompts.length === 0) {
            toast.error('No prompts to copy');
            return;
        }

        try {
            const firstTag = includeTag ? record.tags?.[0] : undefined;
            const promptsArray = record.prompts.map((p, _index) => ({
                ...p,
                pIndex: _index,
                ...(firstTag ? { tag: firstTag } : {}),
            }));
            const jsonString = JSON.stringify(promptsArray, null, 2);
            await navigator.clipboard.writeText(jsonString);
            setCopiedAllPrompts(true);
            toast.success('All prompts copied as JSON array');
            setTimeout(() => setCopiedAllPrompts(false), 2000);
        } catch (error) {
            toast.error('Failed to copy prompts');
        }
    };

    const copyPromptsByIndex = async () => {
        if (!record || !record.prompts || record.prompts.length === 0) {
            toast.error('No prompts to copy');
            return;
        }

        const [startIndex, endIndex] = indexRange;
        if (startIndex > endIndex) {
            toast.error('Start index must be less than or equal to end index');
            return;
        }

        try {
            const firstTag = includeTag ? record.tags?.[0] : undefined;
            const promptsArray = record.prompts
                .slice(startIndex, endIndex + 1)
                .map((p, relativeIndex) => ({
                    ...p,
                    pIndex: startIndex + relativeIndex,
                    ...(firstTag ? { tag: firstTag } : {}),
                }));
            const jsonString = JSON.stringify(promptsArray, null, 2);
            await navigator.clipboard.writeText(jsonString);
            toast.success(`Copied prompts from index ${startIndex} to ${endIndex}`);
            setShowIndexRangePopover(false);
        } catch (error) {
            toast.error('Failed to copy prompts');
        }
    };

    const copyPromptsByVariationCount = async () => {
        if (!record || !record.prompts || record.prompts.length === 0) {
            toast.error('No prompts to copy');
            return;
        }

        if (variationCount < 1) {
            toast.error('Variation count must be at least 1');
            return;
        }

        const generatedIndexes = record.generatedIndexes || [];

        // Group prompts by shotIndex
        const promptsByShot: { [shotIndex: number]: Array<{ prompt: any; index: number }> } = {};

        record.prompts.forEach((prompt, index) => {
            // Only include unprocessed prompts
            if (!generatedIndexes.includes(index)) {
                const shotIndex = prompt.shotIndex ?? 0;
                if (!promptsByShot[shotIndex]) {
                    promptsByShot[shotIndex] = [];
                }
                promptsByShot[shotIndex].push({ prompt, index });
            }
        });

        // Take up to variationCount prompts per shot
        const selectedPrompts: Array<any> = [];
        const firstTag = includeTag ? record.tags?.[0] : undefined;
        Object.keys(promptsByShot)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .forEach((shotIndexStr) => {
                const shotPrompts = promptsByShot[parseInt(shotIndexStr)];
                const selected = shotPrompts.slice(0, variationCount);
                selected.forEach(({ prompt, index }) => {
                    selectedPrompts.push({
                        ...prompt,
                        pIndex: index,
                        ...(firstTag ? { tag: firstTag } : {}),
                    });
                });
            });

        if (selectedPrompts.length === 0) {
            toast.error('No unprocessed prompts found');
            return;
        }

        try {
            const jsonString = JSON.stringify(selectedPrompts, null, 2);
            await navigator.clipboard.writeText(jsonString);
            toast.success(`Copied ${selectedPrompts.length} unprocessed prompts (${variationCount} per shot)`);
            setShowVariationCountPopover(false);
        } catch (error) {
            toast.error('Failed to copy prompts');
        }
    };

    const markPromptAsProcessed = async (promptIndex: number) => {
        if (!recordId) return;

        try {
            const response = await fetch(`/api/midjourney-prompts/${recordId}/mark-processed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ promptIndex }),
            });

            if (response.ok) {
                const updatedRecord = await response.json();
                setRecord(updatedRecord);
                toast.success('Prompt marked as processed');
            } else {
                toast.error('Failed to mark prompt as processed');
            }
        } catch (error) {
            console.error('Error marking prompt as processed:', error);
            toast.error('Error marking prompt as processed');
        }
    };

    const formatDate = (date: Date | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Dialog open={!!recordId} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-6xl w-[95vw] h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : record ? (
                    <>
                        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div>
                                    <DialogTitle className="text-2xl">
                                        {record.title || 'Untitled Record'}
                                    </DialogTitle>
                                    <div className="flex items-center gap-2 mt-2">
                                        {record.isGenerated ? (
                                            <Badge variant="default" className="gap-1">
                                                <CheckCircle className="h-3 w-3" />
                                                Generated
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="gap-1">
                                                <Clock className="h-3 w-3" />
                                                {record.generationProgress}% Complete
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={copyRecordId}
                                    className="gap-2"
                                >
                                    {copiedId ? (
                                        <>
                                            <Check className="h-4 w-4 text-green-500" />
                                            ID Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4" />
                                            Copy ID
                                        </>
                                    )}
                                </Button>
                            </div>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
                            <div className="space-y-6">
                                {record.tags && record.tags.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Tag className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">Tags</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {record.tags.map((tag, idx) => (
                                                <Badge key={idx} variant="secondary">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Separator />

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Created:</span>
                                        <div className="flex items-center gap-1 mt-1">
                                            <Clock className="h-3 w-3" />
                                            {formatDate(record.createdAt)}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Updated:</span>
                                        <div className="flex items-center gap-1 mt-1">
                                            <Clock className="h-3 w-3" />
                                            {formatDate(record.updatedAt)}
                                        </div>
                                    </div>
                                </div>

                                {record.inputParams && Object.keys(record.inputParams).length > 0 && (
                                    <>
                                        <Separator />
                                        <div>
                                            <span className="text-sm font-medium mb-2 block">Input Parameters</span>
                                            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                                                {JSON.stringify(record.inputParams, null, 2)}
                                            </pre>
                                        </div>
                                    </>
                                )}

                                {record.prompts && record.prompts.length > 0 && (
                                    <>
                                        <Separator />
                                        <div>
                                            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                                <h3 className="text-lg font-semibold">Prompts ({record.prompts.length})</h3>
                                                <div className="flex gap-3 flex-wrap items-center">
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox
                                                            id="include-tag"
                                                            checked={includeTag}
                                                            onCheckedChange={(checked) => setIncludeTag(!!checked)}
                                                        />
                                                        <Label htmlFor="include-tag" className="text-xs text-muted-foreground">
                                                            Include tag in copied prompts
                                                        </Label>
                                                    </div>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={copyAllPrompts}
                                                        className="gap-2"
                                                    >
                                                        {copiedAllPrompts ? (
                                                            <>
                                                                <Check className="h-4 w-4 text-green-500" />
                                                                Copied!
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="h-4 w-4" />
                                                                Copy All Prompts
                                                            </>
                                                        )}
                                                    </Button>

                                                    <Popover open={showIndexRangePopover} onOpenChange={setShowIndexRangePopover}>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="outline" size="sm" className="gap-2">
                                                                <Copy className="h-4 w-4" />
                                                                Copy by Index
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-80">
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <Label>Range: {indexRange[0]} to {indexRange[1]}</Label>
                                                                    <Slider
                                                                        value={indexRange}
                                                                        onValueChange={(value) => setIndexRange(value as [number, number])}
                                                                        min={0}
                                                                        max={record.prompts.length - 1}
                                                                        step={1}
                                                                        className="mt-2"
                                                                    />
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <div className="flex-1">
                                                                        <Label>From Index</Label>
                                                                        <Input
                                                                            type="number"
                                                                            min={0}
                                                                            max={record.prompts.length - 1}
                                                                            value={indexRange[0]}
                                                                            onChange={(e) => {
                                                                                const val = Math.max(0, Math.min(parseInt(e.target.value) || 0, record.prompts.length - 1));
                                                                                setIndexRange([val, indexRange[1]]);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <Label>To Index</Label>
                                                                        <Input
                                                                            type="number"
                                                                            min={0}
                                                                            max={record.prompts.length - 1}
                                                                            value={indexRange[1]}
                                                                            onChange={(e) => {
                                                                                const val = Math.max(0, Math.min(parseInt(e.target.value) || 0, record.prompts.length - 1));
                                                                                setIndexRange([indexRange[0], val]);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <Button onClick={copyPromptsByIndex} className="w-full">
                                                                    Copy Prompts
                                                                </Button>
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>

                                                    <Popover open={showVariationCountPopover} onOpenChange={setShowVariationCountPopover}>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="outline" size="sm" className="gap-2">
                                                                <Copy className="h-4 w-4" />
                                                                Copy by Variation
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-80">
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <Label>Variation Count per Shot</Label>
                                                                    <Input
                                                                        type="number"
                                                                        min={1}
                                                                        value={variationCount}
                                                                        onChange={(e) => setVariationCount(Math.max(1, parseInt(e.target.value) || 1))}
                                                                        className="mt-2"
                                                                    />
                                                                    <p className="text-xs text-muted-foreground mt-1">
                                                                        Copies only unprocessed prompts
                                                                    </p>
                                                                </div>
                                                                <Button onClick={copyPromptsByVariationCount} className="w-full">
                                                                    Copy Prompts
                                                                </Button>
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                {record.prompts.map((promptItem, index) => (
                                                    <Card key={index} className="bg-muted/50">
                                                        <CardContent className="p-4">
                                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <Badge variant="outline">
                                                                            #{index + 1}
                                                                        </Badge>
                                                                        {promptItem.shotIndex !== undefined && (
                                                                            <Badge variant="secondary">
                                                                                Shot: {promptItem.shotIndex}
                                                                            </Badge>
                                                                        )}
                                                                        {promptItem.captionIndex !== undefined && (
                                                                            <Badge variant="secondary">
                                                                                Caption: {promptItem.captionIndex}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    {promptItem.shotDescription && (
                                                                        <p className="text-sm text-muted-foreground mb-1">
                                                                            <strong>Shot:</strong> {promptItem.shotDescription}
                                                                        </p>
                                                                    )}
                                                                    {promptItem.captionText && (
                                                                        <p className="text-sm text-muted-foreground mb-2">
                                                                            <strong>Caption:</strong> {promptItem.captionText}
                                                                        </p>
                                                                    )}
                                                                    <p className="text-sm font-medium">{promptItem.prompt}</p>
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => copyToClipboard(promptItem.prompt, index)}
                                                                        className="shrink-0"
                                                                    >
                                                                        {copiedIndex === index ? (
                                                                            <Check className="h-4 w-4 text-green-500" />
                                                                        ) : (
                                                                            <Copy className="h-4 w-4" />
                                                                        )}
                                                                    </Button>
                                                                    {record.generatedIndexes && !record.generatedIndexes.includes(index) && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => markPromptAsProcessed(index)}
                                                                            className="text-xs"
                                                                        >
                                                                            Mark Processed
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

