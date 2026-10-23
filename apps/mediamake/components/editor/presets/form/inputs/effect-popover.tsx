"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { ColorInput, ColorSwatch } from "./color-input";
import { colorFromHexAndOpacity, stopHexAndOpacity } from "./text-fill";

const PORTALED_MENU_SELECTOR = [
    "[data-radix-popper-content-wrapper]",
    "[data-slot='popover-content']",
    "[data-slot='select-content']",
    "[data-slot='dropdown-menu-content']",
    "[role='listbox']",
].join(",");

export function EffectPopover({
    swatch,
    title,
    detail,
    active,
    clearLabel,
    onClear,
    children,
    compact = false,
}: {
    swatch: ReactNode;
    title: string;
    detail: string;
    active: boolean;
    clearLabel: string;
    onClear: () => void;
    children: ReactNode;
    /** Swatch plus a short label, so three of these fit on one row. */
    compact?: boolean;
}) {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <div className={cn("flex items-center gap-1", compact && "relative min-w-0")}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        title={detail}
                        className={cn(
                            compact
                                ? "flex h-8 w-full min-w-0 items-center gap-1.5 rounded-md border bg-muted/30 px-1.5 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>span:first-child]:h-5 [&>span:first-child]:w-5"
                                : "flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-muted/30 px-2 py-1 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            compact && active && "pr-6",
                            open && "ring-2 ring-ring",
                        )}
                    >
                        {swatch}
                        {compact ? (
                            <span className="min-w-0 flex-1 truncate text-xs font-medium">{title}</span>
                        ) : (
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{title}</span>
                                <span className="block truncate text-[10px] text-muted-foreground">{detail}</span>
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
                        title={clearLabel}
                        onClick={onClear}
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
                    if (event.target instanceof Element && event.target.closest(PORTALED_MENU_SELECTOR)) {
                        event.preventDefault();
                    }
                }}
                onFocusOutside={(event) => {
                    if (event.target instanceof Element && event.target.closest(PORTALED_MENU_SELECTOR)) {
                        event.preventDefault();
                    }
                }}
            >
                <div className="mb-3 flex items-center gap-2 border-b pb-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{title}</p>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </Button>
                </div>
                {children}
            </PopoverContent>
        </Popover>
    );
}

export function AdjustRow({
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

export function ShadowSwatch({ color }: { color?: string }) {
    return <ColorSwatch color={color && color.trim() ? color : "transparent"} className="h-7 w-7 shrink-0" />;
}

function CommitField({
    value,
    onCommit,
    suffix,
    label,
}: {
    value: string;
    onCommit: (raw: string) => void;
    suffix?: string;
    label: string;
}) {
    const [draft, setDraft] = useState(value);
    const [focused, setFocused] = useState(false);
    useEffect(() => {
        if (!focused) setDraft(value);
    }, [value, focused]);

    return (
        <div className="relative min-w-0">
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

/** One color property on a single row: swatch, hex, and opacity, same as a gradient stop. */
export function PopupColor({
    value,
    onChange,
}: {
    value: string;
    onChange: (next: string) => void;
}) {
    const color = value || "#000000";
    const { hex, opacity } = stopHexAndOpacity(color);
    return (
        <div className="grid grid-cols-[5.25rem_1.75rem_minmax(0,1fr)_3.25rem] items-center gap-1">
            <span className="truncate text-xs text-muted-foreground">Color</span>
            <Popover>
                <PopoverTrigger asChild>
                    <button type="button" className="h-7 w-7" title="Color" aria-label="Edit color">
                        <ColorSwatch color={color} className="h-7 w-7" />
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
                        allowAlpha
                        value={color}
                        onChange={(next) => onChange(next || color)}
                    />
                </PopoverContent>
            </Popover>
            <CommitField
                value={hex}
                label="Color hex"
                onCommit={(raw) => {
                    const next = colorFromHexAndOpacity(raw, opacity);
                    if (next) onChange(next);
                }}
            />
            <CommitField
                value={String(opacity)}
                label="Color opacity"
                suffix="%"
                onCommit={(raw) => {
                    const n = Number(raw.replace("%", "").trim());
                    if (!Number.isFinite(n)) return;
                    const next = colorFromHexAndOpacity(hex, n);
                    if (next) onChange(next);
                }}
            />
        </div>
    );
}
