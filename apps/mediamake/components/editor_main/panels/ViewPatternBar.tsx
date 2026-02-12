"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SparkleIcon } from "lucide-react";
import { FolderOpenIcon } from "lucide-react";
import { VideoIcon } from "lucide-react";
import { RocketIcon } from "lucide-react";
import { useViewPatternStore } from "../stores/view-pattern-store";
import { cn } from "@/lib/utils";

export const ViewPatternBar = () => {
    const { currentPattern, setPattern } = useViewPatternStore();

    const patterns = [
        { id: 'make' as const, icon: SparkleIcon, label: 'Make' },
        { id: 'media' as const, icon: FolderOpenIcon, label: 'Media' },
        { id: 'edit' as const, icon: VideoIcon, label: 'Editor' },
        { id: 'render' as const, icon: RocketIcon, label: 'Render' },
    ];

    return (
        <div className="flex items-center justify-center gap-2">
            {patterns.map((pattern, index) => {
                const Icon = pattern.icon;
                const isActive = currentPattern === pattern.id;

                return (
                    <div key={pattern.id} className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant={isActive ? "secondary" : "ghost"}
                            onClick={() => setPattern(pattern.id)}
                            className={cn(
                                "transition-colors",
                                isActive && "bg-accent text-accent-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {pattern.label}
                        </Button>
                        {index < patterns.length - 1 && (
                            <Separator orientation="vertical" className="h-4 w-1" />
                        )}
                    </div>
                );
            })}
        </div>
    );
};