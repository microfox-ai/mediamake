"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Plus, ArrowLeftRight, Pencil, Repeat, UnfoldHorizontal, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { MediaPicker } from "@/components/editor/media/media-picker";
import { MediaItemThumb, PopupMediaPreview } from "@/components/editor/media/media-item-thumb";
import { MediaFile } from "@/app/types/media";
import { AnchoredEditPopover, OpenSourceButton } from "./anchored-edit-popover";
import { toMediaItem } from "../../dataTypes/media";
import { MediaLookFields } from "./media-look-fields";
import {
    audioMutedValue,
    clampTrim,
    isFullClip,
    readAudioPlayback,
    readVideoPlayback,
} from "./video-style";

type AtomValue = Record<string, unknown>;

function useSourceDuration(
    src?: string,
    declared?: number,
    media: "video" | "audio" = "video",
): number | undefined {
    const [probed, setProbed] = useState<number | undefined>();
    useEffect(() => {
        if (!src || (declared !== undefined && declared > 0)) {
            setProbed(undefined);
            return;
        }
        let cancelled = false;
        const element = document.createElement(media);
        element.preload = "metadata";
        const onMeta = () => {
            if (!cancelled && Number.isFinite(element.duration) && element.duration > 0 && element.duration !== Infinity) {
                setProbed(element.duration);
            }
        };
        element.addEventListener("loadedmetadata", onMeta);
        element.src = src;
        return () => {
            cancelled = true;
            element.removeEventListener("loadedmetadata", onMeta);
            element.removeAttribute("src");
            element.load();
        };
    }, [src, declared, media]);
    return declared !== undefined && declared > 0 ? declared : probed;
}

function TinyNumber({
    value,
    placeholder,
    title,
    min,
    max,
    step = 0.01,
    disabled,
    className,
    onCommit,
}: {
    value: number | undefined;
    placeholder?: string;
    title: string;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    className?: string;
    onCommit: (next: number | undefined) => void;
}) {
    const text = value === undefined ? "" : String(value);
    const [draft, setDraft] = useState(text);
    const [focused, setFocused] = useState(false);
    useEffect(() => {
        if (!focused) setDraft(text);
    }, [text, focused]);

    return (
        <Input
            type="number"
            min={min}
            max={max}
            step={step}
            title={title}
            placeholder={placeholder}
            disabled={disabled}
            value={draft}
            className={className}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(event) => {
                const raw = event.target.value;
                setDraft(raw);
                if (!raw.trim()) {
                    onCommit(undefined);
                    return;
                }
                const n = Number(raw);
                if (Number.isFinite(n)) onCommit(n);
            }}
        />
    );
}

function IconCell({
    label,
    pressed,
    disabled,
    onClick,
    children,
}: {
    label: string;
    pressed?: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <Button
            type="button"
            variant={pressed ? "secondary" : "outline"}
            size="sm"
            className="h-7 w-full px-0"
            title={label}
            aria-label={label}
            aria-pressed={pressed}
            disabled={disabled}
            onClick={onClick}
        >
            {children}
        </Button>
    );
}

export function VideoStyleSection({
    atom,
    onPatch,
    src,
    kind = "video",
    disabled = false,
}: {
    atom?: AtomValue;
    /** `null` deletes that atom field. `style` replaces the style object. */
    onPatch: (patch: Record<string, unknown>) => void;
    src?: string;
    /** Image keeps the look popup. Audio keeps trim, volume, and mute. */
    kind?: "video" | "image" | "audio";
    disabled?: boolean;
}) {
    const showLook = kind !== "audio";
    const showPlayback = kind !== "image";
    const showLoop = kind === "video";
    const noun = kind === "image" ? "image" : kind === "audio" ? "audio" : "video";
    const source = atom && typeof atom === "object" ? atom : {};
    const style = source.style && typeof source.style === "object"
        ? (source.style as Record<string, unknown>)
        : undefined;
    const playback = kind === "audio" ? readAudioPlayback(source) : readVideoPlayback(source);
    const duration = useSourceDuration(showPlayback ? src : undefined, playback.srcDuration, kind === "audio" ? "audio" : "video");
    const [open, setOpen] = useState(false);
    const [picking, setPicking] = useState(false);
    const item = src ? { src, type: kind } : undefined;
    const full = isFullClip(playback, duration);
    const startThumb = playback.startFrom ?? 0;
    const endThumb = playback.endAt ?? duration ?? Math.max(startThumb, 10);
    const rangeMax = Math.max(duration ?? endThumb, endThumb, startThumb, 0.01);

    const writeMuted = (muted: boolean) => {
        onPatch({ muted: kind === "audio" ? audioMutedValue(muted) : muted ? true : null });
    };

    const writeTrim = (start: number, end: number, stickToOpenEnd = false) => {
        const next = clampTrim(start, end, duration);
        const sittingOnOpenEnd = stickToOpenEnd
            && playback.endAt === undefined
            && (duration !== undefined ? end >= duration - 0.02 : Math.abs(end - rangeMax) < 0.02);
        onPatch({
            startFrom: next.startFrom,
            endAt: sittingOnOpenEnd ? null : next.endAt,
        });
    };

    const applyFile = (file: MediaFile) => {
        const media = toMediaItem(file);
        if (media.src) onPatch({ src: media.src });
        setPicking(false);
    };

    return (
        <div className="space-y-2 rounded-md border border-muted bg-muted p-3 text-sm">
            <p className="text-sm font-medium">{noun[0].toUpperCase()}{noun.slice(1)}</p>
            <div className="flex items-start gap-2">
                {src ? (
                    <AnchoredEditPopover
                        open={open}
                        onOpenChange={setOpen}
                        title={`Edit ${noun}`}
                        headerActions={<OpenSourceButton item={item} />}
                        anchor={
                            <div
                                className="group relative aspect-square w-24 shrink-0 cursor-pointer overflow-hidden rounded-md border bg-muted"
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
                                        title={`Swap ${noun}`}
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
                        <div className="min-w-0 space-y-3">
                            <PopupMediaPreview item={item} />
                            {showLook ? (
                                <MediaLookFields
                                    style={style}
                                    legacy={source}
                                    disabled={disabled}
                                    onStyle={(next) => onPatch({
                                        style: next,
                                        ...(kind === "video" ? { fit: null } : {}),
                                    })}
                                />
                            ) : null}
                            {showPlayback ? (
                            <div className="grid grid-cols-3 gap-2">
                                <div className="min-w-0 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">volume</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={2}
                                        step={0.05}
                                        className="h-8 text-xs"
                                        value={playback.volume}
                                        onChange={(event) => {
                                            const n = Number(event.target.value);
                                            if (!Number.isFinite(n)) return;
                                            const volume = Math.max(0, Math.min(2, n));
                                            onPatch({ volume: volume === 1 ? null : volume });
                                        }}
                                    />
                                </div>
                                <div className="min-w-0 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">muted</Label>
                                    <Button
                                        type="button"
                                        variant={playback.muted ? "secondary" : "outline"}
                                        className="h-8 w-full"
                                        aria-pressed={playback.muted}
                                        disabled={disabled}
                                        onClick={() => writeMuted(!playback.muted)}
                                    >
                                        {playback.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                                    </Button>
                                </div>
                            </div>
                            ) : null}
                            {showPlayback ? (
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">trim</Label>
                                <div className="flex items-center gap-1.5">
                                    <TinyNumber
                                        value={playback.startFrom}
                                        placeholder="0"
                                        title="Start (seconds)"
                                        min={0}
                                        max={rangeMax}
                                        disabled={disabled}
                                        className="h-6 w-12 shrink-0 px-1 text-center text-[10px]"
                                        onCommit={(next) => {
                                            onPatch({
                                                startFrom: clampTrim(next ?? 0, next ?? 0, duration).startFrom,
                                            });
                                        }}
                                    />
                                    <Slider
                                        min={0}
                                        max={rangeMax}
                                        step={0.01}
                                        value={[Math.min(startThumb, rangeMax), Math.min(Math.max(endThumb, startThumb), rangeMax)]}
                                        disabled={disabled}
                                        onValueChange={([start, end]) => writeTrim(start, end, true)}
                                        className="min-w-0 flex-1"
                                    />
                                    <TinyNumber
                                        value={playback.endAt}
                                        placeholder={duration ? String(Math.round(duration * 100) / 100) : "end"}
                                        title="End (seconds)"
                                        min={0}
                                        disabled={disabled}
                                        className="h-6 w-12 shrink-0 px-1 text-center text-[10px]"
                                        onCommit={(next) => {
                                            if (next === undefined) {
                                                onPatch({ endAt: null });
                                                return;
                                            }
                                            writeTrim(playback.startFrom ?? 0, next);
                                        }}
                                    />
                                </div>
                            </div>
                            ) : null}
                        </div>
                    </AnchoredEditPopover>
                ) : (
                    <button
                        type="button"
                        title={`Add ${noun}`}
                        disabled={disabled}
                        className="flex aspect-square w-24 shrink-0 items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 text-muted-foreground transition-colors hover:border-muted-foreground/70 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                        onClick={() => setPicking(true)}
                    >
                        <Plus className="h-6 w-6" />
                    </button>
                )}
                {src && showPlayback ? (
                    <div className="grid min-w-0 flex-1 grid-cols-3 gap-1">
                        <TinyNumber
                            value={playback.startFrom}
                            placeholder="0"
                            title="Trim start (seconds)"
                            min={0}
                            disabled={disabled}
                            className="h-7 px-1 text-xs"
                            onCommit={(next) => {
                                onPatch({
                                    startFrom: clampTrim(next ?? 0, next ?? 0, duration).startFrom,
                                });
                            }}
                        />
                        <IconCell
                            label="Full clip"
                            pressed={full}
                            disabled={disabled}
                            onClick={() => onPatch({ startFrom: null, endAt: null })}
                        >
                            <UnfoldHorizontal className="h-3.5 w-3.5" />
                        </IconCell>
                        <TinyNumber
                            value={playback.endAt}
                            placeholder="end"
                            title="Trim end (seconds)"
                            min={0}
                            disabled={disabled}
                            className="h-7 px-1 text-xs"
                            onCommit={(next) => {
                                if (next === undefined) {
                                    onPatch({ endAt: null });
                                    return;
                                }
                                writeTrim(playback.startFrom ?? 0, next);
                            }}
                        />
                        <div className="relative min-w-0">
                            <Volume2 className="pointer-events-none absolute left-1 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                            <TinyNumber
                                value={playback.volume === 1 ? undefined : playback.volume}
                                placeholder="1"
                                title="Volume"
                                min={0}
                                max={2}
                                step={0.05}
                                disabled={disabled}
                                className="h-7 pl-5 pr-1 text-xs"
                                onCommit={(next) => {
                                    if (next === undefined) {
                                        onPatch({ volume: null });
                                        return;
                                    }
                                    const volume = Math.max(0, Math.min(2, next));
                                    onPatch({ volume: volume === 1 ? null : volume });
                                }}
                            />
                        </div>
                        <IconCell
                            label={playback.muted ? "Unmute" : "Mute"}
                            pressed={playback.muted}
                            disabled={disabled}
                            onClick={() => writeMuted(!playback.muted)}
                        >
                            {playback.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                        </IconCell>
                        {showLoop ? (
                        <IconCell
                            label="Loop"
                            pressed={playback.loop}
                            disabled={disabled}
                            onClick={() => onPatch({ loop: playback.loop ? null : true })}
                        >
                            <Repeat className="h-3.5 w-3.5" />
                        </IconCell>
                        ) : null}
                    </div>
                ) : null}
            </div>
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
