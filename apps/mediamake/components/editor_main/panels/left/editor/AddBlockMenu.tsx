"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Library, Plus } from "lucide-react";
import {
    ContextMenuItem,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getPredefinedPresetById } from "@/components/editor/presets/registry/registry/presets-registry";
import { DatabasePreset, Preset } from "@/components/editor/presets/types";
import { usePresetsStore } from "../../../stores/presets-store";
import { cn } from "@/lib/utils";

type BlockPreset = Preset | DatabasePreset;

const BASIC_BLOCK_IDS = [
    "htmlBlockAtom",
    "text-overlay",
    "second-counter",
    "custom-theme-background",
] as const;

const TRACK_BLOCK_IDS = ["media-track", "imageloop"] as const;

const CAPTION_BLOCK_IDS = [
    "sub-vertical-float",
    "sub-fast-rap-static",
    "sub-kinetic-motion",
] as const;

const MENU_LABELS: Record<string, string> = {
    imageloop: "Image Loop",
};

type MenuItemProps = {
    disabled?: boolean;
    onClick?: () => void;
    children?: ReactNode;
};

type MenuBranchProps = {
    children?: ReactNode;
    className?: string;
};

type MenuParts = {
    Item: ComponentType<MenuItemProps>;
    Sub: ComponentType<{ children?: ReactNode }>;
    SubTrigger: ComponentType<{ children?: ReactNode }>;
    SubContent: ComponentType<MenuBranchProps>;
    Separator: ComponentType<{ className?: string }>;
};

function presetLabel(preset: BlockPreset) {
    return MENU_LABELS[preset.metadata.id] ?? preset.metadata.title;
}

function presetsByIds(ids: readonly string[]): BlockPreset[] {
    return ids.flatMap((id) => {
        const preset = getPredefinedPresetById(id);
        return preset ? [preset] : [];
    });
}

function useAddBlockCatalog() {
    const { basicBlocksPresets, fetchDatabasePresets, isLoadingDatabase } = usePresetsStore();

    useEffect(() => {
        fetchDatabasePresets();
    }, [fetchDatabasePresets]);

    const scene = getPredefinedPresetById("scene");

    const basicById = new Map<string, BlockPreset>();
    for (const preset of presetsByIds(BASIC_BLOCK_IDS)) {
        basicById.set(preset.metadata.id, preset);
    }
    for (const preset of basicBlocksPresets) {
        basicById.set(preset.metadata.id, preset);
    }

    return {
        scene,
        basic: [...basicById.values()],
        tracks: presetsByIds(TRACK_BLOCK_IDS),
        captions: presetsByIds(CAPTION_BLOCK_IDS),
        isLoadingDatabase,
    };
}

function AddBlockMenuItems({
    parts,
    onAdd,
    onOpenLibrary,
}: {
    parts: MenuParts;
    onAdd: (preset: BlockPreset) => void;
    onOpenLibrary?: () => void;
}) {
    const { Item, Sub, SubTrigger, SubContent, Separator } = parts;
    const { scene, basic, tracks, captions, isLoadingDatabase } = useAddBlockCatalog();

    const renderGroup = (presets: BlockPreset[], emptyLabel: string) => {
        if (isLoadingDatabase && presets.length === 0) {
            return <Item disabled>Loading...</Item>;
        }
        if (presets.length === 0) {
            return <Item disabled>{emptyLabel}</Item>;
        }
        return presets.map((preset) => (
            <Item key={preset.metadata.id} onClick={() => onAdd(preset)}>
                {presetLabel(preset)}
            </Item>
        ));
    };

    return (
        <>
            <Item disabled={!scene} onClick={() => scene && onAdd(scene)}>
                Add Scene Block
            </Item>
            <Sub>
                <SubTrigger>Add Basic Blocks</SubTrigger>
                <SubContent>
                    {renderGroup(basic, "No basic blocks found")}
                </SubContent>
            </Sub>
            <Sub>
                <SubTrigger>Add Track Blocks</SubTrigger>
                <SubContent>
                    {renderGroup(tracks, "No track blocks found")}
                </SubContent>
            </Sub>
            <Sub>
                <SubTrigger>Add Caption Blocks</SubTrigger>
                <SubContent>
                    {renderGroup(captions, "No caption blocks found")}
                </SubContent>
            </Sub>
            {onOpenLibrary && (
                <>
                    <Separator />
                    <Item onClick={onOpenLibrary}>
                        <Library className="h-4 w-4 mr-2" />
                        Add From Library
                    </Item>
                </>
            )}
        </>
    );
}

const contextParts: MenuParts = {
    Item: ContextMenuItem,
    Sub: ContextMenuSub,
    SubTrigger: ContextMenuSubTrigger,
    SubContent: ContextMenuSubContent,
    Separator: ContextMenuSeparator,
};

const dropdownParts: MenuParts = {
    Item: DropdownMenuItem,
    Sub: DropdownMenuSub,
    SubTrigger: DropdownMenuSubTrigger,
    SubContent: DropdownMenuSubContent,
    Separator: DropdownMenuSeparator,
};

export function AddBlockContextMenuItems({
    onAdd,
    onOpenLibrary,
}: {
    onAdd: (preset: BlockPreset) => void;
    onOpenLibrary?: () => void;
}) {
    return (
        <AddBlockMenuItems
            parts={contextParts}
            onAdd={onAdd}
            onOpenLibrary={onOpenLibrary}
        />
    );
}

export function AddBlockDropdownMenuItems({
    onAdd,
    onOpenLibrary,
}: {
    onAdd: (preset: BlockPreset) => void;
    onOpenLibrary?: () => void;
}) {
    return (
        <AddBlockMenuItems
            parts={dropdownParts}
            onAdd={onAdd}
            onOpenLibrary={onOpenLibrary}
        />
    );
}

/** Plus control shown on the Blocks header, styled like a block row action icon. */
export function BlocksHeaderAddButton({
    onAdd,
    onOpenLibrary,
}: {
    onAdd: (preset: BlockPreset) => void;
    onOpenLibrary?: () => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div
            className={cn(
                "h-full",
                open ? "flex" : "hidden group-hover/blocks:flex",
            )}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
        >
            <Tooltip open={open ? false : undefined}>
                <TooltipTrigger asChild>
                    <span className="inline-flex h-full">
                        <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className={cn(
                                        "p-0 px-1 h-full flex items-center justify-center border-0 bg-transparent",
                                        "text-foreground hover:text-muted-foreground hover:bg-black/10 cursor-pointer",
                                        "data-[state=open]:bg-black/10",
                                    )}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="bottom" className="w-56">
                                <AddBlockDropdownMenuItems onAdd={onAdd} onOpenLibrary={onOpenLibrary} />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Add block</p>
                </TooltipContent>
            </Tooltip>
        </div>
    );
}
