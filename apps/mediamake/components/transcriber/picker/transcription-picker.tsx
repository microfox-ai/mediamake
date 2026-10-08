"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X as XIcon } from "lucide-react";
import { Transcription } from "@/app/types/transcription";
import { TranscriberProvider } from "../contexts/transcriber-context";
import { ExplorerUI } from "../explorer/explorer-ui";

interface TranscriptionPickerProps {
    open: boolean;
    onClose: () => void;
    onSelect: (transcription: Transcription) => void;
    initialSelectedId?: string | null;
}

export function TranscriptionPicker({ open, onClose, onSelect }: TranscriptionPickerProps) {
    const [isPanelVisible, setIsPanelVisible] = useState(open);

    useEffect(() => {
        setIsPanelVisible(open);
    }, [open]);

    if (!isPanelVisible) return null;

    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="fixed right-0 top-0 h-full w-[90vw] md:w-[80vw] lg:w-[70vw] bg-background border-l shadow-lg flex flex-col">
                <div className="p-4 border-b flex items-center gap-2">
                    <div>
                        <h2 className="text-lg font-semibold">Link Transcription</h2>
                        <p className="text-xs text-muted-foreground">
                            Select a transcription to create a caption version. It will not open the editor.
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <XIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="flex-1 min-h-0 flex">
                    <TranscriberProvider>
                        <ExplorerUI
                            pickMode
                            onPick={(transcription) => {
                                onSelect(transcription);
                                onClose();
                            }}
                        />
                    </TranscriberProvider>
                </div>
            </div>
        </div>
    );
}
