"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { X, Plus, Loader2, Tag, RefreshCw, Check } from 'lucide-react';
import { TagMultiSelect } from '@/components/ui/tag-multi-select';
import { toast } from 'sonner';

interface BulkEditToolbarProps {
    selectedFiles: Set<string>;
    onClearSelection: () => void;
    onBulkUpdate: (fileIds: string[], operation: 'add' | 'remove' | 'replace', tags: string[]) => Promise<void>;
    isUpdating?: boolean;
}

export function BulkEditToolbar({
    selectedFiles,
    onClearSelection,
    onBulkUpdate,
    isUpdating = false,
}: BulkEditToolbarProps) {
    const [showBulkDialog, setShowBulkDialog] = useState(false);
    const [operation, setOperation] = useState<'add' | 'remove' | 'replace'>('add');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const selectedCount = selectedFiles.size;

    const handleBulkUpdate = async () => {
        if (selectedCount === 0 || selectedTags.length === 0) return;
        try {
            await onBulkUpdate(Array.from(selectedFiles), operation, selectedTags);
            setShowBulkDialog(false);
            setSelectedTags([]);
            toast.success(`Updated ${selectedCount} file${selectedCount > 1 ? 's' : ''}`);
        } catch (error) {
            console.error('Error in bulk update:', error);
            toast.error('Failed to update files');
        }
    };

    const getOperationDescription = () => {
        switch (operation) {
            case 'add': return 'Add tags to selected files';
            case 'remove': return 'Remove tags from selected files';
            case 'replace': return 'Replace all tags on selected files';
            default: return '';
        }
    };

    if (selectedCount === 0) return null;

    return (
        <>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">
                                {selectedCount} file{selectedCount > 1 ? 's' : ''} selected
                            </span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowBulkDialog(true)}
                            disabled={isUpdating}
                        >
                            <Tag className="h-4 w-4 mr-2" />
                            Edit Tags
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearSelection}
                            disabled={isUpdating}
                        >
                            Clear Selection
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Bulk Edit Tags</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label>Operation</Label>
                            <Select
                                value={operation}
                                onValueChange={(value: 'add' | 'remove' | 'replace') => setOperation(value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="add">
                                        <div className="flex items-center gap-2">
                                            <Plus className="h-4 w-4" />
                                            Add Tags
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="remove">
                                        <div className="flex items-center gap-2">
                                            <X className="h-4 w-4" />
                                            Remove Tags
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="replace">
                                        <div className="flex items-center gap-2">
                                            <RefreshCw className="h-4 w-4" />
                                            Replace All Tags
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">{getOperationDescription()}</p>
                        </div>

                        <Separator />

                        <TagMultiSelect
                            selectedTags={selectedTags}
                            onTagsChange={setSelectedTags}
                            label={`Tags to ${operation === 'add' ? 'Add' : operation === 'remove' ? 'Remove' : 'Set'}`}
                        />

                        <div className="bg-muted/50 rounded-lg p-4">
                            <Label className="text-sm font-medium">Preview</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                {operation === 'add' && 'Will add the selected tags to all selected files'}
                                {operation === 'remove' && 'Will remove the selected tags from all selected files'}
                                {operation === 'replace' && 'Will replace all tags on selected files with the selected tags'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Affecting {selectedCount} file{selectedCount > 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBulkUpdate}
                            disabled={selectedTags.length === 0 || isUpdating}
                        >
                            {isUpdating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Updating...
                                </>
                            ) : (
                                `Update ${selectedCount} File${selectedCount > 1 ? 's' : ''}`
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
