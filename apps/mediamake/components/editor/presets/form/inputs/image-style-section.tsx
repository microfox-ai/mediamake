"use client";

import { useState } from "react";
import { ArrowLeftRight, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaPicker } from "@/components/editor/media/media-picker";
import { MediaItemThumb, PopupMediaPreview } from "@/components/editor/media/media-item-thumb";
import { MediaFile } from "@/app/types/media";
import { AnchoredEditPopover, OpenSourceButton } from "./anchored-edit-popover";
import { ColorInput } from "./color-input";
import {
    IMAGE_BLEND_MODES,
    IMAGE_FILTERS,
    IMAGE_FITS,
    commitImageLook,
    readImageLookSafe,
    type ImageBlendMode,
    type ImageFilter,
    type ImageFit,
} from "./image-style";
import { toMediaItem } from "../../dataTypes/media";

type StyleValue = Record<string, unknown>;
type MediaKind = "image" | "video" | "audio";

const MEDIA_LABEL: Record<MediaKind, string> = {
    image: "Image",
    video: "Video",
    audio: "Audio",
};

export function ImageStyleSection({
    value,
    onChange,
    src,
    onSrcChange,
    kind = "image",
    title,
    disabled = false,
}: {
    value?: StyleValue;
    onChange: (next: StyleValue | undefined) => void;
    src?: string;
    onSrcChange?: (src: string) => void;
    kind?: MediaKind;
    title?: string;
    disabled?: boolean;
}) {
    const style: StyleValue = value && typeof value === "object" ? value : {};
    const look = readImageLookSafe(style);
    const [open, setOpen] = useState(false);
    const [picking, setPicking] = useState(false);
    const label = title ?? MEDIA_LABEL[kind];
    const showLook = kind !== "audio";
    const item = src ? { src, type: kind } : undefined;

    const write = (patch: Partial<typeof look>) => {
        onChange(commitImageLook(style, { ...look, ...patch }));
    };

    const applyFile = (file: MediaFile) => {
        const media = toMediaItem(file);
        if (media.src) onSrcChange?.(media.src);
        setPicking(false);
    };

    return (
        <div className="space-y-2 text-sm border border-muted rounded-md p-3 bg-muted">
            <p className="text-sm font-medium">{label}</p>
            {src ? (
                <AnchoredEditPopover
                    open={open}
                    onOpenChange={setOpen}
                    title={`Edit ${label.toLowerCase()}`}
                    headerActions={<OpenSourceButton item={item} />}
                    anchor={
                        <div
                            className="group relative aspect-square w-24 shrink-0 overflow-hidden rounded-md border bg-muted cursor-pointer"
                            onClick={() => {
                                if (!disabled) setOpen(true);
                            }}
                        >
                            <MediaItemThumb
                                item={item}
                                className="absolute inset-0 h-full w-full object-cover"
                            />
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/35">
                                <Pencil className="h-5 w-5 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
                            </div>
                            <div className="absolute right-1 top-1 opacity-90">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    title={`Swap ${label.toLowerCase()}`}
                                    disabled={disabled}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        if (!disabled) setPicking(true);
                                    }}
                                >
                                    <ArrowLeftRight className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-3">
                        <PopupMediaPreview item={item} />
                        {showLook && <>
                        <div className="grid grid-cols-3 gap-2">
                            <LookSelect
                                label="fit"
                                value={look.fit}
                                options={IMAGE_FITS}
                                onChange={(fit) => write({ fit: fit as ImageFit })}
                            />
                            <LookSelect
                                label="filter"
                                value={look.filter}
                                options={IMAGE_FILTERS}
                                onChange={(filter) => write({ filter: filter as ImageFilter })}
                            />
                            <LookSelect
                                label="blendMode"
                                value={look.blendMode}
                                options={IMAGE_BLEND_MODES}
                                onChange={(blendMode) => write({ blendMode: blendMode as ImageBlendMode })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">
                                    opacity
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    className="h-8 text-xs"
                                    value={look.opacity}
                                    onChange={(event) => {
                                        const n = Number(event.target.value);
                                        if (Number.isFinite(n)) write({ opacity: Math.max(0, Math.min(1, n)) });
                                    }}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">
                                    colorTint
                                </Label>
                                <ColorInput
                                    value={look.colorTint ?? ""}
                                    onChange={(next) => write({ colorTint: next?.trim() ? next : undefined })}
                                    placeholder=""
                                />
                            </div>
                        </div>
                        </>}
                    </div>
                </AnchoredEditPopover>
            ) : (
                <button
                    type="button"
                    title={`Add ${label.toLowerCase()}`}
                    disabled={disabled}
                    className="flex aspect-square w-24 items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 text-muted-foreground transition-colors hover:border-muted-foreground/70 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    onClick={() => setPicking(true)}
                >
                    <Plus className="h-6 w-6" />
                </button>
            )}
            {picking && (
                <MediaPicker
                    pickerMode={true}
                    singular={true}
                    onSelect={(files) => {
                        const file = Array.isArray(files) ? files[0] : files;
                        if (file) applyFile(file);
                    }}
                    onClose={() => setPicking(false)}
                />
            )}
        </div>
    );
}

function LookSelect({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: readonly string[];
    onChange: (next: string) => void;
}) {
    return (
        <div className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option} value={option}>
                            {option}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
