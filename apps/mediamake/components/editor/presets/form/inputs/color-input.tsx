"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Pipette, Check, Copy, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEyeDropper } from "./use-eyedropper";
import {
    CHECKERBOARD_STYLE,
    DEFAULT_SWATCHES,
    HARMONY_OFFSETS,
    type ColorFormat,
    type Hsva,
    detectFormat,
    formatColor,
    harmonyColors,
    hsvaToRgba,
    isDarkColor,
    parseColor,
    rgbaToHex,
    rgbaToHsva,
    shadeRamp,
} from "./color-utils";

const RECENT_COLORS_KEY = "mediamake:recentColors";
const MAX_RECENT = 18;

function readRecentColors(): string[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(RECENT_COLORS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((c) => typeof c === "string") : [];
    } catch {
        return [];
    }
}

function pushRecentColor(color: string) {
    if (typeof window === "undefined" || !color) return;
    try {
        const next = [color, ...readRecentColors().filter((c) => c !== color)].slice(0, MAX_RECENT);
        window.localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(next));
    } catch {
        /* storage unavailable — recents are best-effort */
    }
}

/** A small square showing a colour over a checkerboard so alpha reads correctly. */
export function ColorSwatch({
    color,
    className,
    style,
    title,
}: {
    color: string;
    className?: string;
    style?: React.CSSProperties;
    title?: string;
}) {
    return (
        <span
            className={cn("relative inline-block rounded border border-border overflow-hidden", className)}
            style={{ ...CHECKERBOARD_STYLE, ...style }}
            title={title ?? color}
        >
            <span className="absolute inset-0" style={{ background: color }} />
        </span>
    );
}

/**
 * Screen-sampling button. Always rendered, even where the API is missing, so the
 * feature is never silently absent — it explains itself instead.
 */
function EyeDropperButton({
    supported,
    isPicking,
    onPick,
    disabled,
    size = "md",
}: {
    supported: boolean;
    isPicking: boolean;
    onPick: () => void;
    disabled?: boolean;
    size?: "sm" | "md";
}) {
    const dimension = size === "sm" ? "h-8 w-8" : "h-9 w-9";
    const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {/* span keeps the tooltip working while the button is disabled */}
                <span className="shrink-0 inline-flex">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={cn(dimension, isPicking && "ring-2 ring-ring")}
                        onClick={onPick}
                        disabled={disabled || isPicking || !supported}
                        aria-label="Pick color from screen"
                    >
                        <Pipette className={icon} />
                    </Button>
                </span>
            </TooltipTrigger>
            <TooltipContent>
                {supported
                    ? "Pick from anywhere on screen — preview, panels, or another window"
                    : "Screen picking needs a Chromium browser (Chrome, Edge, Brave)"}
            </TooltipContent>
        </Tooltip>
    );
}

/**
 * Saturation/value plane. Pointer events are captured so a drag that leaves the
 * element keeps tracking until release.
 */
function SaturationArea({
    hsva,
    onChange,
}: {
    hsva: Hsva;
    onChange: (patch: Partial<Hsva>) => void;
}) {
    const ref = useRef<HTMLDivElement>(null);

    const apply = useCallback(
        (clientX: number, clientY: number) => {
            const el = ref.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
            const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
            onChange({
                s: rect.width ? (x / rect.width) * 100 : 0,
                v: rect.height ? 100 - (y / rect.height) * 100 : 0,
            });
        },
        [onChange]
    );

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        apply(e.clientX, e.clientY);
    };
    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.buttons !== 1) return;
        apply(e.clientX, e.clientY);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const step = e.shiftKey ? 10 : 2;
        if (e.key === "ArrowLeft") onChange({ s: Math.max(0, hsva.s - step) });
        else if (e.key === "ArrowRight") onChange({ s: Math.min(100, hsva.s + step) });
        else if (e.key === "ArrowUp") onChange({ v: Math.min(100, hsva.v + step) });
        else if (e.key === "ArrowDown") onChange({ v: Math.max(0, hsva.v - step) });
        else return;
        e.preventDefault();
    };

    const handleIsDark = isDarkColor(hsvaToRgba({ ...hsva, a: 1 }));

    return (
        <div
            ref={ref}
            role="slider"
            tabIndex={0}
            aria-label="Saturation and brightness"
            aria-valuetext={`Saturation ${Math.round(hsva.s)}%, brightness ${Math.round(hsva.v)}%`}
            className="relative h-36 w-full rounded-md cursor-crosshair touch-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ backgroundColor: `hsl(${hsva.h}, 100%, 50%)` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onKeyDown={handleKeyDown}
        >
            <div
                className="absolute inset-0 rounded-md"
                style={{ background: "linear-gradient(to right, #fff, rgba(255,255,255,0))" }}
            />
            <div
                className="absolute inset-0 rounded-md"
                style={{ background: "linear-gradient(to top, #000, rgba(0,0,0,0))" }}
            />
            <div
                className={cn(
                    "absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm pointer-events-none",
                    handleIsDark ? "border-white" : "border-black"
                )}
                style={{ left: `${hsva.s}%`, top: `${100 - hsva.v}%` }}
            />
        </div>
    );
}

/** Generic 1-D gradient slider used for both hue and alpha. */
function GradientSlider({
    value,
    max,
    onChange,
    background,
    label,
    thumbColor,
}: {
    value: number;
    max: number;
    onChange: (value: number) => void;
    background: string;
    label: string;
    thumbColor: string;
}) {
    const ref = useRef<HTMLDivElement>(null);

    const apply = useCallback(
        (clientX: number) => {
            const el = ref.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
            onChange(rect.width ? (x / rect.width) * max : 0);
        },
        [onChange, max]
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const step = (e.shiftKey ? 10 : 1) * (max / 100);
        if (e.key === "ArrowLeft") onChange(Math.max(0, value - step));
        else if (e.key === "ArrowRight") onChange(Math.min(max, value + step));
        else return;
        e.preventDefault();
    };

    return (
        <div
            ref={ref}
            role="slider"
            tabIndex={0}
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={Math.round(value)}
            className="relative h-3 w-full rounded-full cursor-pointer touch-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={CHECKERBOARD_STYLE}
            onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                apply(e.clientX);
            }}
            onPointerMove={(e) => {
                if (e.buttons !== 1) return;
                apply(e.clientX);
            }}
            onKeyDown={handleKeyDown}
        >
            <div className="absolute inset-0 rounded-full" style={{ background }} />
            <div
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ring-1 ring-black/20 pointer-events-none"
                style={{ left: `${(value / max) * 100}%`, background: thumbColor }}
            />
        </div>
    );
}

export interface ColorInputProps {
    value: string;
    onChange: (value: string) => void;
    /** Show the alpha slider and emit 8-digit hex / rgba(). Default true. */
    allowAlpha?: boolean;
    /** Extra swatches offered above the defaults (e.g. brand palette from a preset). */
    presets?: string[];
    /** Notation used when writing back. Defaults to whatever the value already used. */
    format?: ColorFormat;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    /** Rendered compactly for dense panels (layer props rows). */
    compact?: boolean;
}

/**
 * Colour field: swatch button opening a full picker, plus a free-text input so
 * non-literal values (CSS vars, `currentColor`, gradients) remain editable.
 */
export function ColorInput({
    value,
    onChange,
    allowAlpha = true,
    presets,
    format,
    placeholder = "#000000",
    disabled,
    className,
    compact,
}: ColorInputProps) {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState(value ?? "");
    const [recent, setRecent] = useState<string[]>([]);
    const [copied, setCopied] = useState(false);
    const { isSupported: eyeDropperSupported, isPicking, pick } = useEyeDropper();

    // The picker is HSVA-driven; RGB alone loses hue when saturation hits 0.
    const [hsva, setHsva] = useState<Hsva>(() => {
        const parsed = parseColor(value);
        return parsed ? rgbaToHsva(parsed) : { h: 0, s: 0, v: 0, a: 1 };
    });

    const parsedValue = useMemo(() => parseColor(value), [value]);
    const isParsable = parsedValue !== null;
    const activeFormat: ColorFormat = format ?? detectFormat(value);

    // Sync inward when the value changes elsewhere (undo, preset apply, drag).
    useEffect(() => {
        setText(value ?? "");
        const parsed = parseColor(value);
        if (!parsed) return;
        const next = rgbaToHsva(parsed);
        setHsva((prev) => {
            // Preserve hue/sat while the user drags through greys and blacks,
            // where those channels are not recoverable from RGB.
            const sameColor = rgbaToHex(hsvaToRgba(prev)) === rgbaToHex(parsed);
            return sameColor ? prev : next;
        });
    }, [value]);

    useEffect(() => {
        if (open) setRecent(readRecentColors());
    }, [open]);

    const commit = useCallback(
        (next: Hsva) => {
            setHsva(next);
            const rgba = hsvaToRgba(allowAlpha ? next : { ...next, a: 1 });
            const out = formatColor(rgba, activeFormat);
            setText(out);
            onChange(out);
        },
        [activeFormat, allowAlpha, onChange]
    );

    const patch = useCallback((p: Partial<Hsva>) => commit({ ...hsva, ...p }), [commit, hsva]);

    const applyRawColor = useCallback(
        (raw: string) => {
            const parsed = parseColor(raw);
            if (!parsed) {
                onChange(raw);
                setText(raw);
                return;
            }
            setHsva(rgbaToHsva(parsed));
            const out = formatColor(allowAlpha ? parsed : { ...parsed, a: 1 }, activeFormat);
            setText(out);
            onChange(out);
            pushRecentColor(out);
        },
        [activeFormat, allowAlpha, onChange]
    );

    const handleTextCommit = () => {
        const trimmed = text.trim();
        if (!trimmed) {
            onChange("");
            return;
        }
        applyRawColor(trimmed);
    };

    const handleEyeDropper = async () => {
        const picked = await pick();
        if (picked) applyRawColor(picked);
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value || "");
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
            /* clipboard blocked — non-critical */
        }
    };

    const currentRgba = hsvaToRgba(hsva);
    const currentCss = isParsable ? formatColor(currentRgba, activeFormat) : value;
    const swatchPreview = isParsable ? currentCss : "transparent";

    const hueBackground =
        "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)";
    const alphaBackground = `linear-gradient(to right, ${formatColor({ ...currentRgba, a: 0 }, "rgb")}, ${formatColor({ ...currentRgba, a: 1 }, "rgb")})`;

    const allPresets = useMemo(
        () => Array.from(new Set([...(presets ?? []), ...DEFAULT_SWATCHES])),
        [presets]
    );

    return (
        <div className={cn("flex gap-1 items-center", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        disabled={disabled}
                        aria-label="Open color picker"
                        className={cn(
                            "relative shrink-0 rounded-md border border-input overflow-hidden transition-shadow",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            "disabled:cursor-not-allowed disabled:opacity-50 hover:shadow-sm",
                            compact ? "h-8 w-8" : "h-9 w-9"
                        )}
                        style={CHECKERBOARD_STYLE}
                    >
                        <span className="absolute inset-0" style={{ background: swatchPreview }} />
                        {!isParsable && (
                            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-muted-foreground bg-background/80">
                                CSS
                            </span>
                        )}
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-[268px] p-3 space-y-3" align="start">
                    <SaturationArea hsva={hsva} onChange={patch} />

                    <div className="flex items-center gap-2">
                        <div className="flex-1 space-y-2">
                            <GradientSlider
                                value={hsva.h}
                                max={360}
                                onChange={(h) => patch({ h })}
                                background={hueBackground}
                                label="Hue"
                                thumbColor={`hsl(${hsva.h}, 100%, 50%)`}
                            />
                            {allowAlpha && (
                                <GradientSlider
                                    value={hsva.a * 100}
                                    max={100}
                                    onChange={(a) => patch({ a: a / 100 })}
                                    background={alphaBackground}
                                    label="Alpha"
                                    thumbColor={currentCss}
                                />
                            )}
                        </div>
                        <ColorSwatch color={currentCss} className="h-9 w-9 shrink-0" />
                    </div>

                    <div className="flex items-center gap-1">
                        <Input
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onBlur={handleTextCommit}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleTextCommit();
                                }
                            }}
                            className="h-8 font-mono text-xs flex-1 min-w-0"
                            placeholder={placeholder}
                            spellCheck={false}
                        />
                        <EyeDropperButton
                            supported={eyeDropperSupported}
                            isPicking={isPicking}
                            onPick={handleEyeDropper}
                            size="sm"
                        />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={handleCopy}
                                    aria-label="Copy color value"
                                >
                                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy value</TooltipContent>
                        </Tooltip>
                    </div>

                    <div className="flex gap-1">
                        {(["hex", "rgb", "hsl"] as ColorFormat[]).map((f) => (
                            <Button
                                key={f}
                                type="button"
                                variant={activeFormat === f ? "secondary" : "ghost"}
                                size="sm"
                                className="h-6 px-2 text-[10px] uppercase flex-1"
                                onClick={() => {
                                    const out = formatColor(
                                        hsvaToRgba(allowAlpha ? hsva : { ...hsva, a: 1 }),
                                        f
                                    );
                                    setText(out);
                                    onChange(out);
                                }}
                            >
                                {f}
                            </Button>
                        ))}
                    </div>

                    <div className="space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground">Shades</p>
                        <div className="flex gap-0.5">
                            {shadeRamp(hsva).map((shade, i) => {
                                const css = formatColor(hsvaToRgba(shade), activeFormat);
                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        className="h-5 flex-1 rounded-sm border border-border/50 hover:scale-110 transition-transform"
                                        style={{ background: css }}
                                        onClick={() => commit(shade)}
                                        title={css}
                                        aria-label={`Shade ${css}`}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground">Harmony</p>
                        <div className="space-y-1">
                            {Object.entries(HARMONY_OFFSETS).map(([name, offsets]) => (
                                <div key={name} className="flex items-center gap-1">
                                    <span className="text-[9px] text-muted-foreground w-16 shrink-0 truncate">
                                        {name}
                                    </span>
                                    {harmonyColors(hsva, offsets).map((c, i) => {
                                        const css = formatColor(hsvaToRgba(c), activeFormat);
                                        return (
                                            <button
                                                key={i}
                                                type="button"
                                                className="h-4 w-4 rounded-sm border border-border/50 hover:scale-125 transition-transform"
                                                style={{ background: css }}
                                                onClick={() => commit(c)}
                                                title={css}
                                                aria-label={`${name} ${css}`}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground">Swatches</p>
                        <div className="flex flex-wrap gap-1">
                            {allPresets.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    className="h-5 w-5 rounded-sm border border-border/50 relative overflow-hidden hover:scale-110 transition-transform"
                                    style={CHECKERBOARD_STYLE}
                                    onClick={() => applyRawColor(preset)}
                                    title={preset}
                                    aria-label={`Swatch ${preset}`}
                                >
                                    <span className="absolute inset-0" style={{ background: preset }} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {recent.length > 0 && (
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-medium text-muted-foreground">Recent</p>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => {
                                        window.localStorage.removeItem(RECENT_COLORS_KEY);
                                        setRecent([]);
                                    }}
                                    aria-label="Clear recent colors"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {recent.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        className="h-5 w-5 rounded-sm border border-border/50 relative overflow-hidden hover:scale-110 transition-transform"
                                        style={CHECKERBOARD_STYLE}
                                        onClick={() => applyRawColor(c)}
                                        title={c}
                                        aria-label={`Recent ${c}`}
                                    >
                                        <span className="absolute inset-0" style={{ background: c }} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </PopoverContent>
            </Popover>

            <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={handleTextCommit}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        handleTextCommit();
                    }
                }}
                placeholder={placeholder}
                disabled={disabled}
                spellCheck={false}
                className={cn("font-mono text-xs flex-1 min-w-0", compact && "h-8")}
            />

            <EyeDropperButton
                supported={eyeDropperSupported}
                isPicking={isPicking}
                onPick={handleEyeDropper}
                disabled={disabled}
                size={compact ? "sm" : "md"}
            />
        </div>
    );
}
