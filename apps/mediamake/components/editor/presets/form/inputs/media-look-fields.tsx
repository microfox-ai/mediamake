"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ColorInput } from "./color-input";
import {
    IMAGE_BLEND_MODES,
    IMAGE_FILTERS,
    IMAGE_FITS,
    adjustmentsToCss,
    commitVideoLook,
    presetAdjust,
    readPresetLookStyle,
    readVideoLook,
    type FilterAdjustKey,
    type ImageBlendMode,
    type ImageFit,
    type VideoFilterName,
    type VideoLookDraft,
} from "./video-style";

const FILTER_OPTIONS = ["custom", ...IMAGE_FILTERS] as const;

const ADJUST_ROWS: {
    key: FilterAdjustKey;
    label: string;
    min: number;
    max: number;
    step: number;
    toDisplay: (value: number) => number;
    fromDisplay: (value: number) => number;
}[] = [
    { key: "blur", label: "Blur", min: 0, max: 20, step: 0.1, toDisplay: (n) => n, fromDisplay: (n) => n },
    { key: "brightness", label: "Brightness", min: 0, max: 2, step: 0.01, toDisplay: (n) => Math.round(n * 100), fromDisplay: (n) => n / 100 },
    { key: "contrast", label: "Contrast", min: 0, max: 2, step: 0.01, toDisplay: (n) => Math.round(n * 100), fromDisplay: (n) => n / 100 },
    { key: "saturate", label: "Saturate", min: 0, max: 3, step: 0.01, toDisplay: (n) => Math.round(n * 100), fromDisplay: (n) => n / 100 },
    { key: "grayscale", label: "Grayscale", min: 0, max: 1, step: 0.01, toDisplay: (n) => Math.round(n * 100), fromDisplay: (n) => n / 100 },
    { key: "sepia", label: "Sepia", min: 0, max: 1, step: 0.01, toDisplay: (n) => Math.round(n * 100), fromDisplay: (n) => n / 100 },
    { key: "hueRotate", label: "Hue", min: 0, max: 360, step: 1, toDisplay: (n) => Math.round(n), fromDisplay: (n) => n },
    { key: "invert", label: "Invert", min: 0, max: 1, step: 0.01, toDisplay: (n) => Math.round(n * 100), fromDisplay: (n) => n / 100 },
];

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
        <div className="min-w-0 space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="h-8 w-full min-w-0 text-xs">
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

/** Fit, blend, tint, filter, opacity, and the filter ranges shared by image and video looks. */
export function MediaLookFields({
    style,
    legacy,
    disabled = false,
    onStyle,
}: {
    style?: Record<string, unknown>;
    /** Flat fit / filter / blend / opacity / tint from before the style object. */
    legacy?: Record<string, unknown>;
    disabled?: boolean;
    onStyle: (next: Record<string, unknown>) => void;
}) {
    const view = readPresetLookStyle(style, legacy);
    const look = readVideoLook(view, legacy?.fit);
    const writeLook = (patch: Partial<VideoLookDraft>) => {
        onStyle(commitVideoLook(style, { ...look, ...patch }));
    };

    return (
        <div className="min-w-0 space-y-3">
            <div className="grid grid-cols-4 gap-2">
                <LookSelect
                    label="fit"
                    value={look.fit}
                    options={IMAGE_FITS}
                    onChange={(fit) => writeLook({ fit: fit as ImageFit })}
                />
                <LookSelect
                    label="blend"
                    value={look.blendMode}
                    options={IMAGE_BLEND_MODES}
                    onChange={(blendMode) => writeLook({ blendMode: blendMode as ImageBlendMode })}
                />
                <div className="min-w-0 space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">tint</Label>
                    <ColorInput
                        compact
                        className="min-w-0"
                        value={look.colorTint ?? ""}
                        onChange={(next) => writeLook({ colorTint: next?.trim() ? next : undefined })}
                        placeholder=""
                    />
                </div>
                <LookSelect
                    label="filter"
                    value={look.filter}
                    options={FILTER_OPTIONS}
                    onChange={(filter) => {
                        const name = filter as VideoFilterName;
                        if (name === "custom") {
                            writeLook({ filter: "custom", adjust: look.adjust });
                            return;
                        }
                        writeLook({ filter: name, adjust: presetAdjust(name) });
                    }}
                />
            </div>
            <div className="grid grid-cols-3 gap-2">
                <div className="min-w-0 space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">opacity</Label>
                    <Input
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        disabled={disabled}
                        className="h-8 text-xs"
                        value={look.opacity}
                        onChange={(event) => {
                            const n = Number(event.target.value);
                            if (Number.isFinite(n)) {
                                writeLook({ opacity: Math.max(0, Math.min(1, n)) });
                            }
                        }}
                    />
                </div>
            </div>
            <div className="space-y-2 rounded-md border bg-background p-2">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">Filters</p>
                    <p className="truncate text-[10px] text-muted-foreground">{look.filter}</p>
                </div>
                {ADJUST_ROWS.map((row) => {
                    const amount = look.adjust[row.key];
                    const shown = row.toDisplay(amount);
                    return (
                        <div key={row.key} className="grid grid-cols-[4.5rem_minmax(0,1fr)_2.75rem] items-center gap-2">
                            <span className="truncate text-[10px] text-muted-foreground">{row.label}</span>
                            <Slider
                                min={row.min}
                                max={row.max}
                                step={row.step}
                                value={[Math.min(row.max, Math.max(row.min, amount))]}
                                disabled={disabled}
                                onValueChange={([next]) => {
                                    writeLook({
                                        filter: "custom",
                                        adjust: { ...look.adjust, [row.key]: next },
                                    });
                                }}
                            />
                            <Input
                                type="number"
                                min={row.toDisplay(row.min)}
                                max={row.toDisplay(row.max)}
                                step={row.key === "hueRotate" || row.key === "blur" ? row.step : 1}
                                disabled={disabled}
                                value={shown}
                                title={row.label}
                                className="h-6 px-1 text-center text-[10px]"
                                onChange={(event) => {
                                    const n = Number(event.target.value);
                                    if (!Number.isFinite(n)) return;
                                    const raw = Math.min(row.max, Math.max(row.min, row.fromDisplay(n)));
                                    writeLook({
                                        filter: "custom",
                                        adjust: { ...look.adjust, [row.key]: raw },
                                    });
                                }}
                            />
                        </div>
                    );
                })}
                {adjustmentsToCss(look.adjust) ? null : (
                    <p className="text-[10px] text-muted-foreground">No filter applied.</p>
                )}
            </div>
        </div>
    );
}
