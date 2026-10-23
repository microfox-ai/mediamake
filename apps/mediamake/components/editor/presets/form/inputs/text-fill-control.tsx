"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ArrowLeftRight, Blend, Image as ImageIcon, Minus, Plus, RotateCw, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MediaPicker } from "@/components/editor/media/media-picker";
import type { MediaFile } from "@/app/types/media";
import { cn } from "@/lib/utils";
import { ColorInput, ColorSwatch } from "./color-input";
import { CHECKERBOARD_STYLE, parseColor, rgbaToHex } from "./color-utils";
import {
    IMAGE_POSITIONS,
    IMAGE_SIZES,
    type GradientStop,
    type ImageFill,
    type LinearFill,
    type RadialFill,
    type TextFill,
    colorAtStops,
    colorFromHexAndOpacity,
    cssUrl,
    defaultImageFill,
    fillPatch,
    gradientCss,
    readFill,
    stopHexAndOpacity,
    textFillEffectStyle,
} from "./text-fill";
import { blockFillChange, readBlockFill } from "./block-style";

type Tab = "solid" | "gradient" | "image";
type Stop = GradientStop & { id: string };

const PORTALED_MENU_SELECTOR = [
    "[data-radix-popper-content-wrapper]",
    "[data-slot='popover-content']",
    "[data-slot='select-content']",
    "[data-slot='dropdown-menu-content']",
    "[role='listbox']",
    "[data-media-picker-root]",
].join(",");

let stopSeq = 0;
function nextStopId() {
    stopSeq += 1;
    return `stop-${stopSeq}`;
}

function tabOf(fill: TextFill): Tab {
    if (fill.kind === "image") return "image";
    if (fill.kind === "linear" || fill.kind === "radial") return "gradient";
    return "solid";
}

function stopSignature(stops: GradientStop[]) {
    return stops.map((stop) => `${stop.position}|${stop.color}`).join(";");
}

function paintStyle(fill: TextFill): CSSProperties {
    if (fill.kind === "image" && !fill.src.trim()) return {};
    const patch = fillPatch(fill);
    const css: CSSProperties = {};
    const record: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) continue;
        record[key] = value;
        if (!key.startsWith("--")) (css as Record<string, unknown>)[key] = value;
    }
    return { ...css, ...textFillEffectStyle(record) };
}

function fillSummary(fill: TextFill): { title: string; detail: string } {
    if (fill.kind === "linear") {
        return { title: "Linear", detail: `${Math.round(fill.angle)}° · ${fill.stops.length} stops` };
    }
    if (fill.kind === "radial") {
        return { title: "Radial", detail: `${fill.stops.length} stops` };
    }
    if (fill.kind === "image") {
        const name = decodeURIComponent(fill.src.split("/").pop() || "").split("?")[0] || "Image";
        return { title: "Image", detail: name };
    }
    if (!fill.color) return { title: "Default", detail: "Solid" };
    const parsed = parseColor(fill.color);
    if (!parsed) return { title: fill.color, detail: "Solid" };
    const hex = rgbaToHex({ ...parsed, a: 1 }).slice(1).toUpperCase();
    return { title: hex, detail: `${Math.round(parsed.a * 100)}% · Solid` };
}

function FillSwatch({ fill }: { fill: TextFill }) {
    if (fill.kind === "linear" || fill.kind === "radial") {
        return (
            <span
                className="h-7 w-7 shrink-0 rounded-md border border-border"
                style={{ backgroundImage: gradientCss(fill) }}
            />
        );
    }
    if (fill.kind === "image" && fill.src) {
        return (
            <span
                className="h-7 w-7 shrink-0 rounded-md border border-border bg-cover bg-center"
                style={{ backgroundImage: cssUrl(fill.src) }}
            />
        );
    }
    return <ColorSwatch color={fill.kind === "solid" && fill.color ? fill.color : "transparent"} className="h-7 w-7 shrink-0" />;
}

function blockPreviewStyle(fill: TextFill): CSSProperties {
    if (fill.kind === "solid") return { backgroundColor: fill.color || "transparent" };
    if (fill.kind === "linear" || fill.kind === "radial") return { backgroundImage: gradientCss(fill) };
    if (!fill.src.trim()) return {};
    return {
        backgroundImage: cssUrl(fill.src),
        backgroundPosition: fill.position || "center",
        backgroundSize: fill.size || "cover",
        backgroundRepeat: "no-repeat",
    };
}

function ClipSample({ fill, surface }: { fill: TextFill; surface: "text" | "block" }) {
    if (surface === "block") {
        return <div className="h-14 rounded-md border" style={blockPreviewStyle(fill)} />;
    }
    return (
        <div className="flex h-14 items-center justify-center overflow-hidden rounded-md bg-muted">
            <span className="text-2xl font-semibold leading-none" style={{ display: "inline-block", ...paintStyle(fill) }}>
                Ag
            </span>
        </div>
    );
}

function CommitField({
    value,
    onCommit,
    className,
    suffix,
    label,
}: {
    value: string;
    onCommit: (raw: string) => void;
    className?: string;
    suffix?: string;
    label: string;
}) {
    const [draft, setDraft] = useState(value);
    const [focused, setFocused] = useState(false);
    useEffect(() => {
        if (!focused) setDraft(value);
    }, [value, focused]);

    return (
        <div className={cn("relative min-w-0", className)}>
            <Input
                value={draft}
                aria-label={label}
                className={cn("h-8 px-2 text-xs", suffix && "pr-5")}
                onChange={(event) => setDraft(event.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                    setFocused(false);
                    if (draft !== value) onCommit(draft);
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                    if (event.key === "Escape") {
                        setDraft(value);
                        event.currentTarget.blur();
                    }
                }}
            />
            {suffix && (
                <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                    {suffix}
                </span>
            )}
        </div>
    );
}

function AdjustRow({
    label,
    value,
    min,
    max,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
}) {
    return (
        <div className="grid grid-cols-[5.25rem_1fr_2.25rem] items-center gap-2">
            <span className="truncate text-xs text-muted-foreground">{label}</span>
            <Slider
                min={min}
                max={max}
                step={1}
                value={[value]}
                onValueChange={([next]) => onChange(next)}
                aria-label={label}
            />
            <span className="text-right text-[10px] tabular-nums text-muted-foreground">{value}</span>
        </div>
    );
}

function GradientEditor({
    fill,
    onChange,
    surface = "text",
}: {
    fill: LinearFill | RadialFill;
    onChange: (next: LinearFill | RadialFill) => void;
    surface?: "text" | "block";
}) {
    const incoming = stopSignature(fill.stops);
    const [stops, setStops] = useState<Stop[]>(() => fill.stops.map((stop) => ({ ...stop, id: nextStopId() })));
    const [selected, setSelected] = useState(stops[0]?.id ?? "");
    const emitted = useRef(incoming);
    const stopsRef = useRef(stops);
    const barRef = useRef<HTMLDivElement>(null);
    stopsRef.current = stops;

    useEffect(() => {
        if (incoming === emitted.current) return;
        emitted.current = incoming;
        const next = fill.stops.map((stop) => ({ ...stop, id: nextStopId() }));
        setStops(next);
        setSelected(next[0]?.id ?? "");
    }, [incoming, fill.stops]);

    const commit = (
        next: Stop[],
        fillPatch?: { kind?: "linear" | "radial"; angle?: number; opacity?: number },
    ) => {
        const sorted = [...next].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
        stopsRef.current = sorted;
        setStops(sorted);
        const plain = sorted.map(({ color, position }) => ({ color, position }));
        emitted.current = stopSignature(plain);
        if (fill.kind === "radial" || fillPatch?.kind === "radial") {
            onChange({
                kind: "radial",
                stops: plain,
                opacity: fillPatch?.opacity ?? fill.opacity,
            });
            return;
        }
        onChange({
            kind: "linear",
            angle: fillPatch?.angle ?? (fill.kind === "linear" ? fill.angle : 90),
            stops: plain,
            opacity: fillPatch?.opacity ?? fill.opacity,
        });
    };

    const updateStop = (id: string, partial: Partial<Stop>) => {
        commit(stopsRef.current.map((stop) => (stop.id === id ? { ...stop, ...partial } : stop)));
    };

    const addStop = (position: number) => {
        const color = colorAtStops(stopsRef.current, position);
        const id = nextStopId();
        commit([...stopsRef.current, { id, color, position }]);
        setSelected(id);
    };

    const onBarPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if ((event.target as HTMLElement).closest("[data-stop-handle]")) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const position = Math.min(100, Math.max(0, Math.round(((event.clientX - rect.left) / rect.width) * 100)));
        addStop(position);
    };

    const onHandlePointerDown = (event: PointerEvent<HTMLButtonElement>, id: string) => {
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        setSelected(id);
    };

    const onHandlePointerMove = (event: PointerEvent<HTMLButtonElement>, id: string) => {
        if (event.buttons !== 1 || !barRef.current) return;
        const rect = barRef.current.getBoundingClientRect();
        const position = Math.min(100, Math.max(0, Math.round(((event.clientX - rect.left) / rect.width) * 100)));
        updateStop(id, { position });
    };

    return (
        <div className="space-y-3">
            <ClipSample fill={fill} surface={surface} />
            <div className="flex items-center gap-1">
                <Select
                    value={fill.kind}
                    onValueChange={(next) => {
                        if (next === "radial") {
                            onChange({ kind: "radial", stops: fill.stops, opacity: fill.opacity });
                        } else {
                            onChange({
                                kind: "linear",
                                angle: fill.kind === "linear" ? fill.angle : 90,
                                stops: fill.stops,
                                opacity: fill.opacity,
                            });
                        }
                    }}
                >
                    <SelectTrigger className="h-8 flex-1 text-xs" aria-label="Gradient type">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="linear">Linear</SelectItem>
                        <SelectItem value="radial">Radial</SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    title="Reverse"
                    onClick={() => commit(stopsRef.current.map((stop) => ({ ...stop, position: 100 - stop.position })))}
                >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    title="Rotate 90°"
                    disabled={fill.kind !== "linear"}
                    onClick={() => {
                        if (fill.kind !== "linear") return;
                        onChange({ ...fill, angle: (fill.angle + 90) % 360 });
                    }}
                >
                    <RotateCw className="h-3.5 w-3.5" />
                </Button>
            </div>

            <div
                ref={barRef}
                className="relative h-8 cursor-copy rounded-md"
                style={CHECKERBOARD_STYLE}
                onPointerDown={onBarPointerDown}
            >
                <div
                    className="pointer-events-none absolute inset-x-1 top-1/2 h-3 -translate-y-1/2 rounded-full border border-black/10"
                    style={{ backgroundImage: gradientCss(fill) }}
                />
                {stops.map((stop) => (
                    <button
                        key={stop.id}
                        type="button"
                        data-stop-handle
                        title={`${Math.round(stop.position)}%`}
                        aria-label={`Gradient stop ${Math.round(stop.position)}%`}
                        className={cn(
                            "absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 shadow-sm",
                            selected === stop.id ? "border-primary ring-2 ring-primary/40" : "border-white",
                        )}
                        style={{ left: `${stop.position}%`, background: stop.color }}
                        onPointerDown={(event) => onHandlePointerDown(event, stop.id)}
                        onPointerMove={(event) => onHandlePointerMove(event, stop.id)}
                        onClick={(event) => {
                            event.stopPropagation();
                            setSelected(stop.id);
                        }}
                    />
                ))}
            </div>

            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Stops</span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="Add stop"
                        onClick={() => {
                            const sorted = [...stops].sort((a, b) => a.position - b.position);
                            let at = 50;
                            let gap = -1;
                            for (let i = 0; i < sorted.length - 1; i += 1) {
                                const size = sorted[i + 1].position - sorted[i].position;
                                if (size > gap) {
                                    gap = size;
                                    at = sorted[i].position + size / 2;
                                }
                            }
                            addStop(Math.round(at));
                        }}
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </Button>
                </div>
                {stops.map((stop) => {
                    const { hex, opacity } = stopHexAndOpacity(stop.color);
                    return (
                        <div
                            key={stop.id}
                            className={cn(
                                "grid grid-cols-[3.25rem_1.75rem_1fr_3.25rem_1.5rem] items-center gap-1 rounded-md px-1 py-0.5",
                                selected === stop.id && "bg-accent",
                            )}
                            onClick={() => setSelected(stop.id)}
                        >
                            <CommitField
                                value={String(Math.round(stop.position))}
                                label="Stop position"
                                suffix="%"
                                onCommit={(raw) => {
                                    const n = Number(raw.replace("%", "").trim());
                                    if (!Number.isFinite(n)) return;
                                    updateStop(stop.id, { position: Math.min(100, Math.max(0, Math.round(n))) });
                                }}
                            />
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button type="button" className="h-7 w-7" title="Stop color" aria-label="Edit stop color">
                                        <ColorSwatch color={stop.color} className="h-7 w-7" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    side="bottom"
                                    align="start"
                                    className="w-[268px] p-3"
                                    onOpenAutoFocus={(event) => event.preventDefault()}
                                >
                                    <ColorInput
                                        embedded
                                        value={stop.color}
                                        allowAlpha
                                        onChange={(next) => updateStop(stop.id, { color: next || stop.color })}
                                    />
                                </PopoverContent>
                            </Popover>
                            <CommitField
                                value={hex}
                                label="Stop hex"
                                onCommit={(raw) => {
                                    const next = colorFromHexAndOpacity(raw, opacity);
                                    if (next) updateStop(stop.id, { color: next });
                                }}
                            />
                            <CommitField
                                value={String(opacity)}
                                label="Stop opacity"
                                suffix="%"
                                onCommit={(raw) => {
                                    const n = Number(raw.replace("%", "").trim());
                                    if (!Number.isFinite(n)) return;
                                    const next = colorFromHexAndOpacity(hex, n);
                                    if (next) updateStop(stop.id, { color: next });
                                }}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Remove stop"
                                disabled={stops.length <= 2}
                                onClick={() => commit(stopsRef.current.filter((item) => item.id !== stop.id))}
                            >
                                <Minus className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Opacity</span>
                <CommitField
                    className="w-20"
                    value={String(Math.round(fill.opacity * 100))}
                    label="Gradient opacity"
                    suffix="%"
                    onCommit={(raw) => {
                        const n = Number(raw.replace("%", "").trim());
                        if (!Number.isFinite(n)) return;
                        const opacity = Math.min(100, Math.max(0, n)) / 100;
                        if (fill.kind === "radial") onChange({ ...fill, opacity });
                        else onChange({ ...fill, opacity });
                    }}
                />
            </div>
        </div>
    );
}

function ImageEditor({
    fill,
    onChange,
    onPick,
    surface,
}: {
    fill: ImageFill;
    onChange: (next: ImageFill) => void;
    onPick: () => void;
    surface: "text" | "block";
}) {
    const [url, setUrl] = useState(fill.src);
    const [focused, setFocused] = useState(false);
    useEffect(() => {
        if (!focused) setUrl(fill.src);
    }, [fill.src, focused]);

    const commitUrl = () => {
        const next = url.trim();
        if (next !== fill.src) onChange({ ...fill, src: next });
    };

    return (
        <div className="space-y-3">
            <button
                type="button"
                className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-md border bg-muted"
                onClick={onPick}
                title="Choose image"
            >
                {fill.src ? (
                    <img src={fill.src} alt="" className="h-full w-full object-cover" />
                ) : (
                    <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                        <ImageIcon className="h-5 w-5" />
                        Choose an image
                    </span>
                )}
            </button>
            <Input
                value={url}
                placeholder="Image URL"
                aria-label="Image URL"
                className="h-8 text-xs"
                onChange={(event) => setUrl(event.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                    setFocused(false);
                    commitUrl();
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                }}
            />
            {fill.src ? (
            <>
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Position</span>
                    <Select value={fill.position} onValueChange={(position) => onChange({ ...fill, position })}>
                        <SelectTrigger className="h-8 text-xs" aria-label="Image position">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {IMAGE_POSITIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                            {!IMAGE_POSITIONS.some((option) => option.value === fill.position) && (
                                <SelectItem value={fill.position}>{fill.position}</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Size</span>
                    <Select value={fill.size} onValueChange={(size) => onChange({ ...fill, size })}>
                        <SelectTrigger className="h-8 text-xs" aria-label="Image size">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {(surface === "block"
                                ? [
                                    { value: "cover", label: "Cover" },
                                    { value: "contain", label: "Contain" },
                                    { value: "100% 100%", label: "Stretch" },
                                    { value: "auto", label: "Auto" },
                                ]
                                : IMAGE_SIZES
                            ).map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                            {!IMAGE_SIZES.some((option) => option.value === fill.size) && surface === "text" && (
                                <SelectItem value={fill.size}>{fill.size}</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-2">
                <AdjustRow label="Exposure" min={-100} max={100} value={fill.exposure} onChange={(exposure) => onChange({ ...fill, exposure })} />
                <AdjustRow label="Contrast" min={-100} max={100} value={fill.contrast} onChange={(contrast) => onChange({ ...fill, contrast })} />
                <AdjustRow label="Saturation" min={-100} max={100} value={fill.saturation} onChange={(saturation) => onChange({ ...fill, saturation })} />
                <AdjustRow label="Temperature" min={-100} max={100} value={fill.temperature} onChange={(temperature) => onChange({ ...fill, temperature })} />
                <AdjustRow label="Tint" min={-100} max={100} value={fill.tint} onChange={(tint) => onChange({ ...fill, tint })} />
                <AdjustRow
                    label="Opacity"
                    min={0}
                    max={100}
                    value={Math.round(fill.opacity * 100)}
                    onChange={(opacity) => onChange({ ...fill, opacity: opacity / 100 })}
                />
            </div>
            </>
            ) : null}
            {fill.src ? <ClipSample fill={fill} surface={surface} /> : (
                <p className="text-[11px] leading-snug text-muted-foreground">
                    {surface === "block"
                        ? "The image fills the block background."
                        : "The image is clipped to the text. Line size uses one line-height of the picture."}
                </p>
            )}
        </div>
    );
}

const TABS: { id: Tab; title: string; icon: typeof Square }[] = [
    { id: "solid", title: "Solid", icon: Square },
    { id: "gradient", title: "Gradient", icon: Blend },
    { id: "image", title: "Image", icon: ImageIcon },
];

export function TextFillControl({
    style,
    patch,
    surface = "text",
    compact = false,
}: {
    style: Record<string, any>;
    patch: (changes: Record<string, unknown>) => void;
    /** `block` paints the element background. `text` clips the paint to the glyphs. */
    surface?: "text" | "block";
    /** Swatch plus a short label, so fill can sit beside shadow and stroke. */
    compact?: boolean;
}) {
    const fill = surface === "block" ? readBlockFill(style) : readFill(style);
    const fillTab = tabOf(fill);
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<Tab>(fillTab);
    const [picking, setPicking] = useState(false);

    // The open tab follows the stored fill while the popup is closed, so a preset
    // already set to image or gradient opens on that tab.
    useEffect(() => {
        if (!open) setTab(fillTab);
    }, [open, fillTab]);
    const summary = fillSummary(fill);
    const active = fill.kind !== "solid" || Boolean(fill.color);

    const apply = (next: TextFill) => {
        patch(surface === "block" ? blockFillChange(style, next) : fillPatch(next));
    };

    const choose = (next: Tab) => {
        setTab(next);
        if (next === "solid" && fill.kind !== "solid") {
            const seed = fill.kind === "image" ? "#ffffff" : fill.stops[0]?.color || "#ffffff";
            apply({ kind: "solid", color: seed === "transparent" ? "#ffffff" : seed });
            return;
        }
        if (next === "gradient" && fill.kind !== "linear" && fill.kind !== "radial") {
            const seed = fill.kind === "solid" && fill.color && fill.color !== "transparent" ? fill.color : "#ffffff";
            const second = seed.toLowerCase() === "#ffffff" ? "#999999" : "#ffffff";
            apply({
                kind: "linear",
                angle: 90,
                stops: [
                    { color: seed, position: 0 },
                    { color: second, position: 100 },
                ],
                opacity: 1,
            });
        }
    };

    const imageFill = fill.kind === "image"
        ? fill
        : defaultImageFill(surface === "block" ? { size: "cover" } : undefined);

    const ignoreOutside = (target: EventTarget | null) => {
        if (picking) return true;
        return target instanceof Element && Boolean(target.closest(PORTALED_MENU_SELECTOR));
    };

    return (
        <>
            <Popover
                open={open}
                onOpenChange={(next) => {
                    setOpen(next);
                    if (next) setTab(fillTab);
                }}
            >
                <div className={cn("flex items-center gap-1", compact && "relative min-w-0")}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            title={summary.detail}
                            className={cn(
                                compact
                                    ? "flex h-8 w-full min-w-0 items-center gap-1.5 rounded-md border bg-muted/30 px-1.5 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>span:first-child]:h-5 [&>span:first-child]:w-5"
                                    : "flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-muted/30 px-2 py-1 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                compact && active && "pr-6",
                                open && "ring-2 ring-ring",
                            )}
                        >
                            <FillSwatch fill={fill} />
                            {compact ? (
                                <span className="min-w-0 flex-1 truncate text-xs font-medium">{summary.title}</span>
                            ) : (
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium">{summary.title}</span>
                                    <span className="block truncate text-[10px] text-muted-foreground">{summary.detail}</span>
                                </span>
                            )}
                        </button>
                    </PopoverTrigger>
                    {active && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(compact ? "absolute right-0.5 top-1/2 h-5 w-5 -translate-y-1/2" : "h-7 w-7 shrink-0")}
                            title={surface === "block" ? "Remove background" : "Remove fill"}
                            onClick={() => apply({ kind: "solid", color: "" })}
                        >
                            <Minus className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
                        </Button>
                    )}
                </div>
                <PopoverContent
                    side="left"
                    align="start"
                    sideOffset={8}
                    collisionPadding={12}
                    className="w-[300px] max-h-[min(85vh,44rem)] overflow-y-auto p-3"
                    onOpenAutoFocus={(event) => event.preventDefault()}
                    onInteractOutside={(event) => {
                        if (ignoreOutside(event.target)) event.preventDefault();
                    }}
                    onFocusOutside={(event) => {
                        if (ignoreOutside(event.target)) event.preventDefault();
                    }}
                >
                    <div className="mb-3 flex items-center gap-1 border-b pb-2">
                        {TABS.map((item) => {
                            const Icon = item.icon;
                            const selected = tab === item.id;
                            return (
                                <Tooltip key={item.id}>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            aria-label={item.title}
                                            aria-pressed={selected}
                                            className={cn(
                                                "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                                                selected && "bg-muted text-foreground",
                                            )}
                                            onClick={() => choose(item.id)}
                                        >
                                            <Icon className="h-4 w-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">{item.title}</TooltipContent>
                                </Tooltip>
                            );
                        })}
                        <div className="flex-1" />
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </div>

                    {tab === "solid" && (
                        <ColorInput
                            embedded
                            allowAlpha
                            value={fill.kind === "solid" && fill.color ? fill.color : "#ffffff"}
                            onChange={(next) => apply({ kind: "solid", color: next })}
                        />
                    )}
                    {tab === "gradient" && (fill.kind === "linear" || fill.kind === "radial") && (
                        <GradientEditor fill={fill} surface={surface} onChange={apply} />
                    )}
                    {tab === "image" && (
                        <ImageEditor
                            fill={imageFill}
                            surface={surface}
                            onPick={() => setPicking(true)}
                            onChange={(next) => {
                                if (!next.src.trim()) return;
                                apply(next);
                            }}
                        />
                    )}
                </PopoverContent>
            </Popover>
            {picking && (
                <MediaPicker
                    pickerMode
                    singular
                    onSelect={(files) => {
                        const file = (Array.isArray(files) ? files[0] : files) as MediaFile | undefined;
                        const src = file?.filePath?.trim();
                        if (!src) return;
                        apply({ ...imageFill, src });
                        setTab("image");
                        setOpen(true);
                    }}
                    onClose={() => setPicking(false)}
                />
            )}
        </>
    );
}
