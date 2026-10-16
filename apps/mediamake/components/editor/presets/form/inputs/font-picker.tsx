"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { getAvailableFonts } from "@remotion/google-fonts";
import { Check, ChevronDown, CircleX, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type GoogleFontEntry = ReturnType<typeof getAvailableFonts>[number];

/** style ("normal" | "italic") -> weights the font ships, e.g. { normal: ["400", "700"] }. */
export type GoogleFontVariants = Record<string, string[]>;

export const availableFonts = getAvailableFonts();

const normalizeFontKey = (name: string) =>
    name.trim().toLowerCase().replace(/["']/g, "").replace(/[\s_-]+/g, "");

const fontsByKey = new Map<string, GoogleFontEntry>();
for (const font of availableFonts) {
    fontsByKey.set(normalizeFontKey(font.importName), font);
    fontsByKey.set(normalizeFontKey(font.fontFamily), font);
}

/** Matches an import name ("BebasNeue") or a family name ("Bebas Neue"). */
export function findGoogleFont(value: unknown): GoogleFontEntry | undefined {
    if (typeof value !== "string" || !value.trim()) return undefined;
    return fontsByKey.get(normalizeFontKey(value));
}

/** Loaded families can start with a digit ("42dot Sans"), which is invalid unquoted. */
export function cssFontStack(family: string | null | undefined): string | undefined {
    if (!family) return undefined;
    const quoted = /^["']/.test(family) ? family : `"${family}"`;
    return `${quoted}, sans-serif`;
}

const variantCache = new Map<string, GoogleFontVariants>();
const variantLoads = new Map<string, Promise<GoogleFontVariants | null>>();

function loadFontVariants(font: GoogleFontEntry): Promise<GoogleFontVariants | null> {
    const cached = variantCache.get(font.importName);
    if (cached) return Promise.resolve(cached);
    const inflight = variantLoads.get(font.importName);
    if (inflight) return inflight;

    const pending = font
        .load()
        .then((mod) => {
            const variants: GoogleFontVariants = {};
            for (const [style, weights] of Object.entries(mod.getInfo().fonts)) {
                variants[style] = Object.keys(weights).sort((a, b) => Number(a) - Number(b));
            }
            variantCache.set(font.importName, variants);
            return variants;
        })
        .catch(() => null);
    variantLoads.set(font.importName, pending);
    return pending;
}

export function useFontVariants(font: GoogleFontEntry | undefined): GoogleFontVariants | null {
    const importName = font?.importName;
    const [variants, setVariants] = useState<GoogleFontVariants | null>(() =>
        importName ? variantCache.get(importName) ?? null : null,
    );

    useEffect(() => {
        if (!font) {
            setVariants(null);
            return;
        }
        const cached = variantCache.get(font.importName);
        if (cached) {
            setVariants(cached);
            return;
        }
        let cancelled = false;
        setVariants(null);
        void loadFontVariants(font).then((next) => {
            if (!cancelled) setVariants(next);
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [importName]);

    return variants;
}

type FaceRequest = { weight?: string | number; style?: string };

const faceFamilies = new Map<string, string>();
const faceLoads = new Map<string, Promise<string | null>>();

const faceKey = (font: GoogleFontEntry, req: FaceRequest = {}) =>
    `${font.importName}:${req.style ?? ""}:${req.weight ?? ""}`;

/** Loads one face for UI previews, narrowed to a style / weight / subset the font ships. */
function loadFontFace(font: GoogleFontEntry, req: FaceRequest = {}): Promise<string | null> {
    const key = faceKey(font, req);
    const cached = faceFamilies.get(key);
    if (cached) return Promise.resolve(cached);
    const inflight = faceLoads.get(key);
    if (inflight) return inflight;

    const pending = font
        .load()
        .then((mod) => {
            const info = mod.getInfo();
            const styles = Object.keys(info.fonts);
            const style = req.style && info.fonts[req.style]
                ? req.style
                : info.fonts.normal ? "normal" : styles[0];
            const weights = Object.keys(info.fonts[style] ?? {});
            const wanted = String(req.weight ?? "400");
            const weight = weights.includes(wanted)
                ? wanted
                : weights.includes("400") ? "400" : weights[0];
            const subsets = info.subsets.includes("latin") ? ["latin"] : info.subsets.slice(0, 1);
            const loaded = mod.loadFont(style, {
                weights: weight ? [weight] : undefined,
                subsets,
                ignoreTooManyRequestsWarning: true,
            });
            return loaded.waitUntilDone().then(() => loaded.fontFamily);
        })
        .then((family) => {
            faceFamilies.set(key, family);
            return family;
        })
        .catch(() => null);
    faceLoads.set(key, pending);
    return pending;
}

/** CSS family for a font face, or null until loaded. `delayMs` skips rows scrolled past quickly. */
export function useFontFace(
    font: GoogleFontEntry | undefined,
    req: FaceRequest = {},
    delayMs = 0,
): string | null {
    const key = font ? faceKey(font, req) : null;
    const [family, setFamily] = useState<string | null>(() => (key ? faceFamilies.get(key) ?? null : null));

    useEffect(() => {
        if (!font || !key) {
            setFamily(null);
            return;
        }
        const cached = faceFamilies.get(key);
        if (cached) {
            setFamily(cached);
            return;
        }
        let cancelled = false;
        setFamily(null);
        const timer = setTimeout(() => {
            void loadFontFace(font, req).then((next) => {
                if (!cancelled) setFamily(next);
            });
        }, delayMs);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, delayMs]);

    return family;
}

const RECENT_FONTS_KEY = "mediamake:recent-fonts";
const RECENT_FONTS_LIMIT = 16;

function readRecentFonts(): string[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(RECENT_FONTS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
        return [];
    }
}

function pushRecentFont(importName: string) {
    if (typeof window === "undefined") return;
    const next = [importName, ...readRecentFonts().filter((name) => name !== importName)].slice(0, RECENT_FONTS_LIMIT);
    try {
        window.localStorage.setItem(RECENT_FONTS_KEY, JSON.stringify(next));
    } catch {
        // Storage full or blocked: recents are optional.
    }
}

const PORTALED_MENU_SELECTOR = [
    "[data-radix-popper-content-wrapper]",
    "[data-slot='select-content']",
    "[role='listbox']",
].join(",");

function isPortaledMenuTarget(target: EventTarget | null) {
    return target instanceof Element && Boolean(target.closest(PORTALED_MENU_SELECTOR));
}

const ROW_HEIGHT = 36;
const LIST_HEIGHT = 360;
const OVERSCAN = 6;
const HOVER_PREVIEW_MS = 120;

type FontFilter = "all" | "recent";

function FontRow({
    font,
    top,
    selected,
    highlighted,
    onSelect,
    onHover,
}: {
    font: GoogleFontEntry;
    top: number;
    selected: boolean;
    highlighted: boolean;
    onSelect: () => void;
    onHover: () => void;
}) {
    const family = useFontFace(font, {}, 150);
    return (
        <button
            type="button"
            role="option"
            aria-selected={selected}
            className={cn(
                "absolute left-0 right-0 flex items-center gap-2 px-3 text-left text-lg outline-none",
                (selected || highlighted) ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                !family && !selected && !highlighted && "text-muted-foreground",
            )}
            style={{ top, height: ROW_HEIGHT }}
            onClick={onSelect}
            onPointerMove={onHover}
            title={font.fontFamily}
        >
            <span className="flex w-4 shrink-0 justify-center">
                {selected && <Check className="h-4 w-4" />}
            </span>
            <span className="truncate" style={{ fontFamily: cssFontStack(family) }}>
                {font.fontFamily}
            </span>
        </button>
    );
}

/**
 * Google Font picker. Opens a panel to the left of the field. Hovering or arrowing
 * through rows previews the font live; clicking or Enter commits it, and closing
 * without committing restores the original value.
 */
export function FontPicker({
    value,
    onChange,
    valueFormat = "importName",
    placeholder = "Select font",
    className,
}: {
    value: string | undefined;
    onChange: (value: string) => void;
    /** What is written back: the import name ("BebasNeue") or the CSS family ("Bebas Neue"). */
    valueFormat?: "importName" | "fontFamily";
    placeholder?: string;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [queryDirty, setQueryDirty] = useState(false);
    const [filter, setFilter] = useState<FontFilter>("all");
    const [recent, setRecent] = useState<string[]>([]);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const [scrollTop, setScrollTop] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const openedValueRef = useRef<string>(value ?? "");
    const committedRef = useRef(false);
    const previewedRef = useRef(false);
    const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [openedValue, setOpenedValue] = useState<string>(value ?? "");
    const currentFont = findGoogleFont(value);
    const selectedFont = open ? findGoogleFont(openedValue) : currentFont;
    const toValue = (font: GoogleFontEntry) => (valueFormat === "fontFamily" ? font.fontFamily : font.importName);

    const fonts = useMemo(() => {
        const source = filter === "recent"
            ? recent.map((name) => findGoogleFont(name)).filter((font): font is GoogleFontEntry => Boolean(font))
            : availableFonts;
        const needle = queryDirty ? query.trim().toLowerCase() : "";
        if (!needle) return source;
        return source.filter((font) =>
            font.fontFamily.toLowerCase().includes(needle) || font.importName.toLowerCase().includes(needle),
        );
    }, [filter, recent, query, queryDirty]);

    const selectedIndex = selectedFont ? fonts.findIndex((font) => font.importName === selectedFont.importName) : -1;

    const scrollToIndex = (index: number, center = false) => {
        const list = listRef.current;
        if (!list || index < 0) return;
        const rowTop = index * ROW_HEIGHT;
        if (center) {
            list.scrollTop = Math.max(0, rowTop - LIST_HEIGHT / 2 + ROW_HEIGHT / 2);
        } else if (rowTop < list.scrollTop) {
            list.scrollTop = rowTop;
        } else if (rowTop + ROW_HEIGHT > list.scrollTop + LIST_HEIGHT) {
            list.scrollTop = rowTop + ROW_HEIGHT - LIST_HEIGHT;
        }
        setScrollTop(list.scrollTop);
    };

    useEffect(() => {
        if (!open) return;
        const frame = requestAnimationFrame(() => scrollToIndex(selectedIndex, true));
        return () => cancelAnimationFrame(frame);
        // Only on open: later highlight changes scroll themselves.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => () => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    }, []);

    const preview = (font: GoogleFontEntry) => {
        const next = toValue(font);
        if (next === value) return;
        previewedRef.current = true;
        onChange(next);
    };

    const commitValue = (next: string, font?: GoogleFontEntry) => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        committedRef.current = true;
        if (font) pushRecentFont(font.importName);
        if (next !== value) onChange(next);
        setOpen(false);
    };

    const handleOpenChange = (next: boolean) => {
        if (next) {
            openedValueRef.current = value ?? "";
            setOpenedValue(value ?? "");
            committedRef.current = false;
            previewedRef.current = false;
            setRecent(readRecentFonts());
            setQuery(currentFont?.fontFamily ?? value ?? "");
            setQueryDirty(false);
            setHighlightIndex(-1);
        } else {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            if (!committedRef.current && previewedRef.current) {
                onChange(openedValueRef.current);
            }
        }
        setOpen(next);
    };

    const handleHover = (index: number) => {
        if (index === highlightIndex) return;
        setHighlightIndex(index);
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        const font = fonts[index];
        hoverTimerRef.current = setTimeout(() => font && preview(font), HOVER_PREVIEW_MS);
    };

    const moveHighlight = (delta: number) => {
        if (fonts.length === 0) return;
        const from = highlightIndex >= 0 ? highlightIndex : selectedIndex;
        const next = Math.min(fonts.length - 1, Math.max(0, from + delta));
        setHighlightIndex(next);
        scrollToIndex(next);
        preview(fonts[next]);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            moveHighlight(event.key === "ArrowDown" ? 1 : -1);
        } else if (event.key === "Enter") {
            event.preventDefault();
            const font = fonts[highlightIndex >= 0 ? highlightIndex : 0];
            if (font && (highlightIndex >= 0 || queryDirty)) {
                commitValue(toValue(font), font);
            } else if (queryDirty && query.trim()) {
                commitValue(query.trim());
            }
        }
    };

    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const end = Math.min(fonts.length, Math.ceil((scrollTop + LIST_HEIGHT) / ROW_HEIGHT) + OVERSCAN);
    const rawQuery = query.trim();

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className={cn("h-9 w-full justify-between px-3 font-normal", className)}
                >
                    <span className={cn("truncate", !value && "text-muted-foreground")}>
                        {currentFont?.fontFamily || value || placeholder}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                side="left"
                align="start"
                sideOffset={8}
                collisionPadding={12}
                className="w-72 p-0"
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    inputRef.current?.focus();
                    inputRef.current?.select();
                }}
                onInteractOutside={(event) => {
                    if (isPortaledMenuTarget(event.target)) event.preventDefault();
                }}
                onFocusOutside={(event) => {
                    if (isPortaledMenuTarget(event.target)) event.preventDefault();
                }}
            >
                <div className="flex items-center justify-between px-3 pt-3 pb-2">
                    <p className="text-sm font-medium">Fonts</p>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleOpenChange(false)}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </Button>
                </div>
                <div className="space-y-2 border-b px-3 pb-3">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            ref={inputRef}
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setQueryDirty(true);
                                setHighlightIndex(-1);
                                setScrollTop(0);
                                if (listRef.current) listRef.current.scrollTop = 0;
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Search fonts"
                            className="h-9 pl-8 pr-8"
                        />
                        {query && (
                            <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                    setQuery("");
                                    setQueryDirty(true);
                                    inputRef.current?.focus();
                                }}
                                title="Clear search"
                            >
                                <CircleX className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <Select value={filter} onValueChange={(next) => setFilter(next as FontFilter)}>
                        <SelectTrigger className="h-9 w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All fonts</SelectItem>
                            <SelectItem value="recent">Recently used</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div
                    ref={listRef}
                    role="listbox"
                    className="relative overflow-y-auto py-1"
                    style={{ height: fonts.length === 0 ? undefined : Math.min(LIST_HEIGHT, fonts.length * ROW_HEIGHT + 8) }}
                    onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
                >
                    {fonts.length === 0 ? (
                        <div className="space-y-2 px-3 py-6 text-center text-sm text-muted-foreground">
                            <p>{filter === "recent" && !rawQuery ? "No recently used fonts." : "No fonts found."}</p>
                            {queryDirty && rawQuery && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => commitValue(rawQuery)}
                                >
                                    Use &ldquo;{rawQuery}&rdquo;
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="relative" style={{ height: fonts.length * ROW_HEIGHT }}>
                            {fonts.slice(start, end).map((font, offset) => {
                                const index = start + offset;
                                return (
                                    <FontRow
                                        key={font.importName}
                                        font={font}
                                        top={index * ROW_HEIGHT}
                                        selected={index === selectedIndex}
                                        highlighted={index === highlightIndex}
                                        onSelect={() => commitValue(toValue(font), font)}
                                        onHover={() => handleHover(index)}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
