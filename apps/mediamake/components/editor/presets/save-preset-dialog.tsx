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
import { Loader2, Save, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface SavePresetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (name: string, overwriteId?: string, sharedWithClientIds?: string[]) => Promise<void>;
    isLoading?: boolean;
    currentLoadedPreset?: string | null;
    currentLoadedPresetName?: string;
    availableClientIds?: string[];
    initialSharedWithClientIds?: string[];
    isOwner?: boolean; // Whether the current user is the owner of the loaded preset
}

export function SavePresetDialog({
    open,
    onOpenChange,
    onSave,
    isLoading = false,
    currentLoadedPreset = null,
    currentLoadedPresetName = "",
    availableClientIds = [],
    initialSharedWithClientIds = [],
    isOwner = false,
}: SavePresetDialogProps) {
    const [presetName, setPresetName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saveMode, setSaveMode] = useState<'new' | 'overwrite'>('new');
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>(initialSharedWithClientIds);

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            // When dialog opens, set default values
            setPresetName("");
            setSaveMode('new');
            setIsSaving(false);
            setSelectedClientIds(initialSharedWithClientIds);
        } else {
            // When dialog closes, reset all state
            setPresetName("");
            setSaveMode('new');
            setIsSaving(false);
            setSelectedClientIds([]);
        }
    }, [open, initialSharedWithClientIds]);

    const handleSave = async () => {
        if (!presetName.trim()) {
            toast.error("Please enter a preset name");
            return;
        }

        // For overwrite mode, validate that the name matches
        if (saveMode === 'overwrite' && presetName.trim() !== currentLoadedPresetName) {
            toast.error(`Please enter the exact name "${currentLoadedPresetName}" to confirm overwrite`);
            return;
        }

        try {
            setIsSaving(true);
            const overwriteId = saveMode === 'overwrite' ? (currentLoadedPreset || undefined) : undefined;
            await onSave(
                presetName.trim(),
                overwriteId,
                selectedClientIds.length > 0 ? selectedClientIds : undefined
            );
            setPresetName("");
            setSaveMode('new');
            setSelectedClientIds([]);
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save preset:", error);
            toast.error("Failed to save preset");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setPresetName("");
        setSaveMode('new');
        setSelectedClientIds([]);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Save className="h-5 w-5" />
                        Save Preset
                    </DialogTitle>
                    <DialogDescription>
                        Save your current preset configuration with a custom name.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Save Mode Selection - Only show if there's a loaded preset AND user is the owner */}
                    {currentLoadedPreset && isOwner && (
                        <div className="grid gap-3">
                            <Label className="text-sm font-medium">Save Options</Label>
                            <RadioGroup
                                value={saveMode}
                                onValueChange={(value) => setSaveMode(value as 'new' | 'overwrite')}
                                disabled={isSaving}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="new" id="new" />
                                    <Label htmlFor="new" className="text-sm">
                                        Save as new preset
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="overwrite" id="overwrite" />
                                    <Label htmlFor="overwrite" className="text-sm">
                                        Overwrite "{currentLoadedPresetName}"
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    )}
                    
                    {/* Info message for shared users */}
                    {currentLoadedPreset && !isOwner && (
                        <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                            <p>
                                You're editing a preset shared with you. Saving will create a new copy for you, not modify the original.
                            </p>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="preset-name">
                            {saveMode === 'overwrite' ? 'Confirm preset name' : 'Preset Name'}
                        </Label>
                        <Input
                            id="preset-name"
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                            placeholder={
                                saveMode === 'overwrite'
                                    ? `Enter "${currentLoadedPresetName}" to confirm overwrite`
                                    : "Enter preset name..."
                            }
                            disabled={isSaving}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !isSaving) {
                                    handleSave();
                                }
                            }}
                        />
                        {saveMode === 'overwrite' && (
                            <p className="text-xs text-muted-foreground">
                                Type the exact name "{currentLoadedPresetName}" to confirm you want to overwrite this preset.
                            </p>
                        )}
                    </div>

                    {/* Sharing control: multi-select dropdown of client IDs */}
                    <div className="grid gap-2">
                        <Label>
                            Share with client IDs
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex w-full items-center justify-between"
                                    disabled={isSaving}
                                >
                                    <span className="truncate text-left text-sm">
                                        {selectedClientIds.length > 0
                                            ? `${selectedClientIds.length} client(s) selected`
                                            : "Select client IDs"}
                                    </span>
                                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-2" align="start">
                                <div className="max-h-56 overflow-y-auto space-y-2">
                                    {availableClientIds && availableClientIds.length > 0 ? (
                                        availableClientIds.map((id) => (
                                            <label
                                                key={id}
                                                className="flex items-center gap-2 text-sm cursor-pointer"
                                            >
                                                <Checkbox
                                                    checked={selectedClientIds.includes(id)}
                                                    onCheckedChange={(checked) => {
                                                        setSelectedClientIds((prev) => {
                                                            if (checked) {
                                                                if (prev.includes(id)) return prev;
                                                                return [...prev, id];
                                                            }
                                                            return prev.filter((v) => v !== id);
                                                        });
                                                    }}
                                                />
                                                <span className="truncate">{id}</span>
                                            </label>
                                        ))
                                    ) : (
                                        <p className="text-xs text-muted-foreground">
                                            No client IDs available yet. Presets you or others save will appear here.
                                        </p>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                        <p className="text-xs text-muted-foreground">
                            Select which client IDs can load this preset. Leave empty to keep it private to you.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={
                            isSaving ||
                            !presetName.trim() ||
                            (saveMode === 'overwrite' && presetName.trim() !== currentLoadedPresetName)
                        }
                        className="flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {saveMode === 'overwrite' ? 'Overwriting...' : 'Saving...'}
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                {saveMode === 'overwrite' ? 'Overwrite Preset' : 'Save Preset'}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
