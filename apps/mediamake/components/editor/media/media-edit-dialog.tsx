"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { MediaFile } from '@/app/types/media';
import { TagMultiSelect } from '@/components/ui/tag-multi-select';
import { toast } from 'sonner';

interface MediaEditDialogProps {
    isOpen: boolean;
    onClose: () => void;
    mediaFile: MediaFile | null;
    onSave: (fileId: string, updates: { tags: string[]; fileName?: string }) => Promise<void>;
}

export function MediaEditDialog({ isOpen, onClose, mediaFile, onSave }: MediaEditDialogProps) {
    const [fileName, setFileName] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && mediaFile) {
            setFileName(mediaFile.fileName || '');
            setSelectedTags(mediaFile.tags || []);
        }
    }, [isOpen, mediaFile]);

    const handleSave = async () => {
        if (!mediaFile?._id) return;
        try {
            setIsSaving(true);
            await onSave(mediaFile._id.toString(), {
                tags: selectedTags,
                fileName: fileName.trim() || undefined,
            });
            onClose();
            toast.success('Media file updated successfully');
        } catch (error) {
            console.error('Error saving media file:', error);
            toast.error('Failed to update media file');
        } finally {
            setIsSaving(false);
        }
    };

    if (!mediaFile) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Media Details</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="fileName">File Name</Label>
                        <Input
                            id="fileName"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            placeholder="Enter file name"
                        />
                    </div>

                    <Separator />

                    <TagMultiSelect
                        selectedTags={selectedTags}
                        onTagsChange={setSelectedTags}
                        label="Tags"
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
