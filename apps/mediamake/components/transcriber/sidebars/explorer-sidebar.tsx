"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Search,
    Database,
    Settings,
    Plus,
    Mic,
    Captions
} from "lucide-react";
import { useTranscriber } from "../contexts/transcriber-context";

const navigationItems = [
    { id: 'explorer', label: 'Explore', icon: Search },
    { id: 'captions', label: 'Captions', icon: Captions },
    { id: 'assembly', label: 'Assembly', icon: Database },
    { id: 'elevenlabs', label: 'ElevenLabs', icon: Mic },
    { id: 'settings', label: 'Settings', icon: Settings },
] as const;

export function ExplorerSidebar() {
    const { currentView, setCurrentView } = useTranscriber();
    console.log('ExplorerSidebar rendered, currentView:', currentView);

    return (
        <div className="w-48 h-full bg-background border-r border-border flex flex-col">
            {/* Navigation Items */}
            <div className="flex-1 p-2 space-y-1 w-full text-left">
                {navigationItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Button
                            key={item.id}
                            variant={currentView === item.id ? "default" : "ghost"}
                            size="sm"
                            className={cn(
                                "w-full h-10 flex flex-row items-left justify-left gap-1 p-0",
                                currentView === item.id && "bg-neutral-200 text-primary-background hover:bg-neutral-100"
                            )}
                            onClick={() => setCurrentView(item.id as any)}
                        >
                            <Icon className="h-4 w-4" />
                            <span className="text-xs font-medium">{item.label}</span>
                        </Button>
                    );
                })}
            </div>

            {/* New Transcription Button */}
            <div className="p-2 border-t border-border">
                <Button
                    variant="default"
                    size="sm"
                    className="w-full h-10 flex flex-row items-center justify-left gap-1 p-0"
                    onClick={() => setCurrentView('new')}
                >
                    <Plus className="h-4 w-4" />
                    <span className="text-xs font-medium">New</span>
                </Button>
            </div>
        </div>
    );
}
