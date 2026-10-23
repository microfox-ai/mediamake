"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    ArrowDownToLine,
    ArrowUpToLine,
    ChevronLeft,
    ChevronRight,
    FoldVertical,
    List,
    ListOrdered,
    Minus,
    SlidersVertical,
    Strikethrough,
    Underline,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ColorInput } from "./color-input";
import { cssFontStack, findGoogleFont, FontPicker, useFontFace, useFontVariants } from "./font-picker";
import { TextFillControl } from "./text-fill-control";
import { TextShadowControl } from "./text-shadow-control";
import { TextStrokeControl } from "./text-stroke-control";
import { TEXT_FILL_STYLE_KEYS, textFillEffectStyle } from "./text-fill";
import {
    applyLength,
    formatCssLength,
    LENGTH_UNIT_OPTIONS,
    splitCssLength,
    unitLabel,
    type LengthMode,
    type LengthUnit,
} from "./typography-length";

export type StyleValue = Record<string, any>;

/** Matches the CSS variable TextAtom reads for the gap between `\n`-separated paragraphs. */
const PARAGRAPH_SPACING_VAR = "--paragraph-spacing";

/** CSS keys written by the Typography section. Schema children with these keys are not rendered twice. */
export const TYPOGRAPHY_STYLE_KEYS = new Set([
    "fontFamily", "fontWeight", "fontStyle", "fontSize", "lineHeight", "letterSpacing",
    "textAlign", "alignContent", "textDecorationLine", "textDecoration", "textDecorationStyle",
    "textDecorationColor", "textDecorationThickness", "textUnderlineOffset", "textDecorationSkipInk",
    "textTransform", "fontVariantCaps", "textBoxTrim", "textBoxEdge", "listStyleType",
    "listStylePosition", PARAGRAPH_SPACING_VAR, "overflow", "textOverflow", "display",
    "WebkitBoxOrient", "WebkitLineClamp", "textWrap", "textIndent", "fontVariantNumeric",
    "fontVariantLigatures", "fontFeatureSettings", "fontKerning", "textShadow",
    "WebkitTextStroke", "WebkitTextStrokeWidth", "WebkitTextStrokeColor", "paintOrder",
    ...TEXT_FILL_STYLE_KEYS,
]);

const WEIGHT_NAMES: Record<string, string> = {
    "100": "Thin",
    "200": "Extra Light",
    "300": "Light",
    "400": "Regular",
    "500": "Medium",
    "600": "Semi Bold",
    "700": "Bold",
    "800": "Extra Bold",
    "900": "Black",
};

const ALL_WEIGHTS = Object.keys(WEIGHT_NAMES);
const FALLBACK_VARIANTS = { normal: ALL_WEIGHTS, italic: ALL_WEIGHTS };

function variantLabel(weight: string, style: string) {
    const name = WEIGHT_NAMES[weight] ?? weight;
    if (style !== "italic") return name;
    return weight === "400" ? "Italic" : `${name} Italic`;
}

function normalizeWeight(value: unknown): string {
    if (value === "bold") return "700";
    if (value === "normal" || value === undefined || value === null || value === "") return "400";
    return String(value);
}

const round = (n: number) => Math.round(n * 10000) / 10000;

/** `undefined` clears the key; `null` means the input was not understood and nothing changes. */
type Parsed<T> = T | undefined | null;

function formatPx(value: unknown): string {
    if (value === undefined || value === null || value === "" || value === "auto") return "";
    const text = String(value).trim();
    return text.endsWith("px") ? text.slice(0, -2) : text;
}

function parsePositiveNumber(raw: string): Parsed<number> {
    const text = raw.trim().toLowerCase().replace(/px$/, "");
    if (!text) return undefined;
    const n = Number(text);
    if (!Number.isFinite(n) || n <= 0) return null;
    return round(n);
}

function parsePxString(raw: string, allowZero = true): Parsed<string> {
    const text = raw.trim().toLowerCase();
    if (!text || text === "auto") return undefined;
    const n = Number(text.replace(/px$/, ""));
    if (!Number.isFinite(n)) return null;
    if (n === 0 && !allowZero) return undefined;
    return `${round(n)}px`;
}

function tokensOf(value: unknown): string[] {
    return typeof value === "string" && value !== "normal" ? value.split(/\s+/).filter(Boolean) : [];
}

function swapToken(list: string[], group: string[], next?: string): string[] {
    const rest = list.filter((token) => !group.includes(token));
    return next ? [...rest, next] : rest;
}

const joinTokens = (list: string[]) => (list.length > 0 ? list.join(" ") : undefined);

const NUMERIC_FIGURE = ["lining-nums", "oldstyle-nums"];
const NUMERIC_SPACING = ["proportional-nums", "tabular-nums"];
const NUMERIC_FRACTIONS = ["diagonal-fractions", "stacked-fractions"];
const LIGATURES_COMMON = ["common-ligatures", "no-common-ligatures"];
const LIGATURES_DISCRETIONARY = ["discretionary-ligatures", "no-discretionary-ligatures"];
const LIGATURES_CONTEXTUAL = ["contextual", "no-contextual"];
const POSITION_FEATURES = ['"sups"', '"subs"'];

function featureListOf(value: unknown): string[] {
    return typeof value === "string" && value !== "normal"
        ? value.split(",").map((part) => part.trim()).filter(Boolean)
        : [];
}

function positionOf(value: unknown): "none" | "sups" | "subs" {
    for (const feature of featureListOf(value)) {
        if (feature.startsWith('"sups"')) return "sups";
        if (feature.startsWith('"subs"')) return "subs";
    }
    return "none";
}

/** Commits on blur or Enter so half-typed values ("1.", "12%") never reach the style. */
function DraftInput({
    value,
    onCommit,
    placeholder,
    icon,
    title,
    className,
}: {
    value: string;
    onCommit: (raw: string) => void;
    placeholder?: string;
    icon?: ReactNode;
    title?: string;
    className?: string;
}) {
    const [draft, setDraft] = useState(value);
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        if (!focused) setDraft(value);
    }, [value, focused]);

    return (
        <div className={cn("relative min-w-0", className)}>
            {icon && (
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
                    {icon}
                </span>
            )}
            <Input
                value={draft}
                title={title}
                placeholder={placeholder}
                className={cn("h-8 text-sm", icon ? "pl-8" : undefined)}
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
        </div>
    );
}

const UNIT_MENU_LABEL: Record<(typeof LENGTH_UNIT_OPTIONS)[number], string> = {
    int: "Integer",
    "%": "%",
    ch: "ch",
    em: "em",
};

function LengthField({
    value,
    mode,
    onCommit,
    icon,
    placeholder,
    title,
    className,
    units = "menu",
}: {
    value: unknown;
    mode: LengthMode;
    onCommit: (next: number | string | undefined) => void;
    icon?: ReactNode;
    placeholder?: string;
    title?: string;
    className?: string;
    /** Font size shows the units inline. The tighter fields keep them on a menu. */
    units?: "menu" | "toggle";
}) {
    const formatted = formatCssLength(value, mode);
    const external = splitCssLength(formatted);
    const [amount, setAmount] = useState(external.amount);
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        if (!focused) setAmount(external.amount);
    }, [external.amount, external.unit, focused]);

    const commit = (rawAmount: string, unit: LengthUnit, honorTypedUnit: boolean) => {
        const next = applyLength(rawAmount, unit, mode, honorTypedUnit);
        if (next !== null) onCommit(next);
    };

    const selectedUnit: (typeof LENGTH_UNIT_OPTIONS)[number] = external.unit === "px" ? "int" : external.unit;

    return (
        <div className={cn("flex min-w-0 items-center gap-1", className)}>
            <div className="relative min-w-0 flex-1">
                {icon && (
                    <span className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
                        {icon}
                    </span>
                )}
                <Input
                    value={amount}
                    title={title}
                    placeholder={placeholder}
                    className={cn("h-8 text-sm", icon ? "pl-7" : undefined, units === "menu" ? "pr-8" : undefined)}
                    onChange={(event) => setAmount(event.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => {
                        setFocused(false);
                        if (amount !== external.amount) commit(amount, external.unit, true);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                        if (event.key === "Escape") {
                            setAmount(external.amount);
                            event.currentTarget.blur();
                        }
                    }}
                />
                {units === "menu" && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                title="Unit: integer, %, ch, or em"
                                className="absolute right-0.5 top-1/2 flex h-6 min-w-6 -translate-y-1/2 items-center justify-center rounded px-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                {unitLabel(external.unit)}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-28">
                            {LENGTH_UNIT_OPTIONS.map((option) => (
                                <DropdownMenuItem
                                    key={option}
                                    onSelect={() => commit(amount, option, false)}
                                >
                                    {UNIT_MENU_LABEL[option]}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
            {units === "toggle" && (
                <OptionToggle
                    className="shrink-0"
                    itemClassName="h-8 w-7 px-0 text-[11px]"
                    value={selectedUnit}
                    onChange={(next) => commit(amount, next, false)}
                    options={LENGTH_UNIT_OPTIONS.map((option) => ({
                        value: option,
                        label: unitLabel(option),
                        title: UNIT_MENU_LABEL[option],
                    }))}
                />
            )}
        </div>
    );
}

type ToggleOption<T extends string> = { value: T; label: ReactNode; title: string };

type CaseValue = "none" | "uppercase" | "lowercase" | "capitalize" | "small-caps";

const CASE_OPTIONS: ToggleOption<CaseValue>[] = [
    { value: "none", label: <Minus />, title: "As typed" },
    { value: "uppercase", label: "AG", title: "Uppercase" },
    { value: "lowercase", label: "ag", title: "Lowercase" },
    { value: "capitalize", label: "Ag", title: "Title case" },
    {
        value: "small-caps",
        label: <span style={{ fontVariantCaps: "small-caps" }}>Ag</span>,
        title: "Small caps",
    },
];

function readCase(style: StyleValue): CaseValue {
    if (style.fontVariantCaps === "small-caps" || style.fontVariantCaps === "all-small-caps") return "small-caps";
    if (style.textTransform === "uppercase" || style.textTransform === "lowercase" || style.textTransform === "capitalize") {
        return style.textTransform;
    }
    return "none";
}

function writeCase(next: CaseValue): Record<string, unknown> {
    if (next === "small-caps") return { textTransform: undefined, fontVariantCaps: "small-caps" };
    return { textTransform: next === "none" ? undefined : next, fontVariantCaps: undefined };
}

function OptionToggle<T extends string>({
    value,
    options,
    onChange,
    className,
    itemClassName,
}: {
    value: T;
    options: ToggleOption<T>[];
    onChange: (value: T) => void;
    className?: string;
    itemClassName?: string;
}) {
    return (
        <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={value}
            onValueChange={(next) => {
                if (next) onChange(next as T);
            }}
            className={className}
        >
            {options.map((option) => (
                <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    title={option.title}
                    aria-label={option.title}
                    className={cn("h-7 min-w-7 px-1.5 text-sm", itemClassName)}
                >
                    {option.label}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex min-h-8 items-center justify-between gap-3">
            <Label className="text-sm font-normal text-muted-foreground">{label}</Label>
            <div className="flex items-center gap-1">{children}</div>
        </div>
    );
}

function FieldCaption({ children }: { children: ReactNode }) {
    return <p className="text-sm text-muted-foreground">{children}</p>;
}

type Patch = Record<string, unknown>;

function TypographyPreview({ style }: { style: StyleValue }) {
    const font = findGoogleFont(style.fontFamily);
    const family = useFontFace(font, {
        weight: normalizeWeight(style.fontWeight),
        style: style.fontStyle === "italic" ? "italic" : "normal",
    });

    const previewStyle: CSSProperties = {
        fontFamily: cssFontStack(family) ?? (typeof style.fontFamily === "string" ? style.fontFamily : undefined),
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
        letterSpacing: style.letterSpacing,
        textAlign: style.textAlign,
        textTransform: style.textTransform,
        fontVariantCaps: style.fontVariantCaps,
        textDecorationLine: style.textDecorationLine,
        textDecorationStyle: style.textDecorationStyle,
        textDecorationColor: style.textDecorationColor,
        textDecorationThickness: style.textDecorationThickness,
        textUnderlineOffset: style.textUnderlineOffset,
        textDecorationSkipInk: style.textDecorationSkipInk,
        fontVariantNumeric: style.fontVariantNumeric,
        fontVariantLigatures: style.fontVariantLigatures,
        fontFeatureSettings: style.fontFeatureSettings,
        fontKerning: style.fontKerning,
        textWrap: style.textWrap,
        WebkitTextStrokeWidth: style.WebkitTextStrokeWidth,
        WebkitTextStrokeColor: style.WebkitTextStrokeColor,
        WebkitTextStroke: style.WebkitTextStroke,
        paintOrder: style.paintOrder,
        color: style.color,
        backgroundImage: style.backgroundImage,
        backgroundClip: style.backgroundClip,
        WebkitBackgroundClip: style.WebkitBackgroundClip,
        WebkitTextFillColor: style.WebkitTextFillColor,
        backgroundPosition: style.backgroundPosition,
        backgroundSize: style.backgroundSize,
        backgroundRepeat: style.backgroundRepeat,
        ...textFillEffectStyle(style),
    };
    const clipped = style.backgroundClip === "text" || style.WebkitBackgroundClip === "text";

    return (
        <div className="flex h-20 items-center justify-center overflow-hidden rounded-md bg-muted">
            <p
                className={cn(
                    "truncate px-4 text-center text-2xl leading-tight text-muted-foreground",
                    clipped ? "inline-block max-w-full" : "w-full",
                )}
                style={previewStyle}
            >
                Preview
            </p>
        </div>
    );
}

function DecorationDetails({ style, patch, onBack }: { style: StyleValue; patch: (p: Patch) => void; onBack: () => void }) {
    return (
        <div className="space-y-1">
            <button
                type="button"
                className="mb-2 flex items-center gap-1 text-sm font-medium hover:text-muted-foreground"
                onClick={onBack}
            >
                <ChevronLeft className="h-4 w-4" />
                Decoration
            </button>
            <SettingRow label="Style">
                <Select
                    value={style.textDecorationStyle ?? "solid"}
                    onValueChange={(next) => patch({ textDecorationStyle: next === "solid" ? undefined : next })}
                >
                    <SelectTrigger className="h-7 w-32 text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {["solid", "double", "dotted", "dashed", "wavy"].map((option) => (
                            <SelectItem key={option} value={option} className="capitalize">
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </SettingRow>
            <SettingRow label="Skip ink">
                <Switch
                    checked={style.textDecorationSkipInk !== "none"}
                    onCheckedChange={(checked) => patch({ textDecorationSkipInk: checked ? undefined : "none" })}
                />
            </SettingRow>
            <SettingRow label="Thickness">
                <DraftInput
                    className="w-32"
                    value={formatPx(style.textDecorationThickness)}
                    placeholder="Auto"
                    title="Thickness in pixels (empty = auto)"
                    onCommit={(raw) => {
                        const next = parsePxString(raw, false);
                        if (next !== null) patch({ textDecorationThickness: next });
                    }}
                />
            </SettingRow>
            <SettingRow label="Offset">
                <DraftInput
                    className="w-32"
                    value={formatPx(style.textUnderlineOffset)}
                    placeholder="Auto"
                    title="Underline offset in pixels (empty = auto)"
                    onCommit={(raw) => {
                        const next = parsePxString(raw);
                        if (next !== null) patch({ textUnderlineOffset: next });
                    }}
                />
            </SettingRow>
            <div className="space-y-1 pt-1">
                <Label className="text-sm font-normal text-muted-foreground">Color</Label>
                <ColorInput
                    value={typeof style.textDecorationColor === "string" ? style.textDecorationColor : ""}
                    onChange={(next) => patch({ textDecorationColor: next || undefined })}
                    allowAlpha
                    compact
                    placeholder="Text color"
                />
            </div>
        </div>
    );
}

function BasicsTab({ style, patch, onOpenDecoration }: { style: StyleValue; patch: (p: Patch) => void; onOpenDecoration: () => void }) {
    const decoration = tokensOf(style.textDecorationLine ?? style.textDecoration);
    const decorationValue = decoration.includes("underline")
        ? "underline"
        : decoration.includes("line-through") ? "line-through" : "none";
    const listValue = style.listStyleType === "disc" || style.listStyleType === "decimal" ? style.listStyleType : "none";
    const truncated = style.textOverflow === "ellipsis";

    return (
        <div className="space-y-1">
            <SettingRow label="Alignment">
                <OptionToggle
                    value={style.textAlign ?? "left"}
                    onChange={(next) => patch({ textAlign: next })}
                    options={[
                        { value: "left", label: <AlignLeft />, title: "Align left" },
                        { value: "center", label: <AlignCenter />, title: "Align center" },
                        { value: "right", label: <AlignRight />, title: "Align right" },
                        { value: "justify", label: <AlignJustify />, title: "Justify" },
                    ]}
                />
            </SettingRow>
            <SettingRow label="Decoration">
                <OptionToggle
                    value={decorationValue}
                    onChange={(next) =>
                        patch({ textDecorationLine: next === "none" ? undefined : next, textDecoration: undefined })
                    }
                    options={[
                        { value: "none", label: <Minus />, title: "None" },
                        { value: "underline", label: <Underline />, title: "Underline" },
                        { value: "line-through", label: <Strikethrough />, title: "Strikethrough" },
                    ]}
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    title="Decoration settings"
                    onClick={onOpenDecoration}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </SettingRow>
            <SettingRow label="Case">
                <OptionToggle
                    value={readCase(style)}
                    onChange={(next) => patch(writeCase(next))}
                    options={CASE_OPTIONS}
                />
            </SettingRow>

            <Separator className="my-2" />

            <SettingRow label="Vertical trim">
                <OptionToggle
                    value={style.textBoxTrim === "trim-both" ? "cap" : "standard"}
                    onChange={(next) =>
                        patch(
                            next === "cap"
                                ? { textBoxTrim: "trim-both", textBoxEdge: "cap alphabetic" }
                                : { textBoxTrim: undefined, textBoxEdge: undefined },
                        )
                    }
                    options={[
                        { value: "standard", label: <span className="underline underline-offset-2">Ag</span>, title: "Standard" },
                        { value: "cap", label: <span className="border-y border-current leading-none">Ag</span>, title: "Cap height to baseline" },
                    ]}
                />
            </SettingRow>
            <SettingRow label="List style">
                <OptionToggle
                    value={listValue}
                    onChange={(next) =>
                        patch(
                            next === "none"
                                ? { listStyleType: undefined, listStylePosition: undefined }
                                : { listStyleType: next, listStylePosition: "inside" },
                        )
                    }
                    options={[
                        { value: "none", label: <Minus />, title: "None" },
                        { value: "disc", label: <List />, title: "Bulleted list" },
                        { value: "decimal", label: <ListOrdered />, title: "Numbered list" },
                    ]}
                />
            </SettingRow>
            <SettingRow label="Paragraph spacing">
                <DraftInput
                    className="w-28"
                    value={formatPx(style[PARAGRAPH_SPACING_VAR]) || "0"}
                    title="Space between lines separated by a line break, in pixels"
                    onCommit={(raw) => {
                        const next = parsePxString(raw, false);
                        if (next !== null) patch({ [PARAGRAPH_SPACING_VAR]: next });
                    }}
                />
            </SettingRow>
            <SettingRow label="Truncate text">
                <OptionToggle
                    value={truncated ? "ellipsis" : "none"}
                    onChange={(next) =>
                        patch(
                            next === "ellipsis"
                                ? {
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    display: "-webkit-box",
                                    WebkitBoxOrient: "vertical",
                                    WebkitLineClamp: style.WebkitLineClamp ?? 1,
                                }
                                : {
                                    overflow: undefined,
                                    textOverflow: undefined,
                                    display: undefined,
                                    WebkitBoxOrient: undefined,
                                    WebkitLineClamp: undefined,
                                },
                        )
                    }
                    options={[
                        { value: "none", label: <Minus />, title: "Off" },
                        { value: "ellipsis", label: "A…", title: "Truncate with ellipsis" },
                    ]}
                />
            </SettingRow>
            {truncated && (
                <SettingRow label="Max lines">
                    <DraftInput
                        className="w-28"
                        value={String(style.WebkitLineClamp ?? 1)}
                        onCommit={(raw) => {
                            const next = parsePositiveNumber(raw);
                            if (next !== null) patch({ WebkitLineClamp: next === undefined ? 1 : Math.round(next) });
                        }}
                    />
                </SettingRow>
            )}
            <SettingRow label="Wrap style">
                <Select
                    value={typeof style.textWrap === "string" ? style.textWrap : "auto"}
                    onValueChange={(next) => patch({ textWrap: next === "auto" ? undefined : next })}
                >
                    <SelectTrigger className="h-7 w-36 text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="balance">Balance</SelectItem>
                        <SelectItem value="pretty">Pretty</SelectItem>
                        <SelectItem value="nowrap">No wrap</SelectItem>
                    </SelectContent>
                </Select>
            </SettingRow>
        </div>
    );
}

function DetailsTab({ style, patch }: { style: StyleValue; patch: (p: Patch) => void }) {
    const numeric = tokensOf(style.fontVariantNumeric);
    const ligatures = tokensOf(style.fontVariantLigatures);
    const figure = NUMERIC_FIGURE.find((token) => numeric.includes(token)) ?? "default";
    const spacing = NUMERIC_SPACING.find((token) => numeric.includes(token)) ?? "default";

    const setNumeric = (group: string[], next?: string) =>
        patch({ fontVariantNumeric: joinTokens(swapToken(numeric, group, next)) });
    const setLigature = (group: string[], next?: string) =>
        patch({ fontVariantLigatures: joinTokens(swapToken(ligatures, group, next)) });

    return (
        <div className="space-y-1">
            <SettingRow label="Paragraph indent">
                <DraftInput
                    className="w-28"
                    value={formatPx(style.textIndent) || "0"}
                    title="First-line indent in pixels"
                    onCommit={(raw) => {
                        const next = parsePxString(raw, false);
                        if (next !== null) patch({ textIndent: next });
                    }}
                />
            </SettingRow>
            <SettingRow label="Kerning">
                <Switch
                    checked={style.fontKerning !== "none"}
                    onCheckedChange={(checked) => patch({ fontKerning: checked ? undefined : "none" })}
                />
            </SettingRow>

            <Separator className="my-2" />
            <FieldCaption>Letter case</FieldCaption>
            <SettingRow label="Position">
                <OptionToggle
                    value={positionOf(style.fontFeatureSettings)}
                    onChange={(next) => {
                        const rest = featureListOf(style.fontFeatureSettings).filter(
                            (feature) => !POSITION_FEATURES.some((tag) => feature.startsWith(tag)),
                        );
                        const list = next === "none" ? rest : [...rest, `"${next}" 1`];
                        patch({ fontFeatureSettings: list.length > 0 ? list.join(", ") : undefined });
                    }}
                    options={[
                        { value: "none", label: <Minus />, title: "Normal" },
                        { value: "sups", label: <span>X<sup>2</sup></span>, title: "Superscript" },
                        { value: "subs", label: <span>X<sub>2</sub></span>, title: "Subscript" },
                    ]}
                />
            </SettingRow>

            <Separator className="my-2" />
            <FieldCaption>Numbers</FieldCaption>
            <SettingRow label="Style">
                <OptionToggle
                    value={figure}
                    onChange={(next) => setNumeric(NUMERIC_FIGURE, next === "default" ? undefined : next)}
                    options={[
                        { value: "default", label: <Minus />, title: "Font default" },
                        { value: "lining-nums", label: "123", title: "Lining figures" },
                        { value: "oldstyle-nums", label: <span style={{ fontVariantNumeric: "oldstyle-nums" }}>123</span>, title: "Old-style figures" },
                    ]}
                />
            </SettingRow>
            <SettingRow label="Spacing">
                <OptionToggle
                    value={spacing}
                    onChange={(next) => setNumeric(NUMERIC_SPACING, next === "default" ? undefined : next)}
                    options={[
                        { value: "default", label: <Minus />, title: "Font default" },
                        { value: "proportional-nums", label: "Prop", title: "Proportional" },
                        { value: "tabular-nums", label: "Tab", title: "Tabular (monospaced)" },
                    ]}
                />
            </SettingRow>
            <SettingRow label="Fractions">
                <Switch
                    checked={numeric.includes("diagonal-fractions")}
                    onCheckedChange={(checked) => setNumeric(NUMERIC_FRACTIONS, checked ? "diagonal-fractions" : undefined)}
                />
            </SettingRow>
            <SettingRow label="Slashed zero">
                <Switch
                    checked={numeric.includes("slashed-zero")}
                    onCheckedChange={(checked) => setNumeric(["slashed-zero"], checked ? "slashed-zero" : undefined)}
                />
            </SettingRow>

            <Separator className="my-2" />
            <FieldCaption>Ligatures</FieldCaption>
            <SettingRow label="Common">
                <Switch
                    checked={!ligatures.includes("no-common-ligatures")}
                    onCheckedChange={(checked) => setLigature(LIGATURES_COMMON, checked ? undefined : "no-common-ligatures")}
                />
            </SettingRow>
            <SettingRow label="Contextual">
                <Switch
                    checked={!ligatures.includes("no-contextual")}
                    onCheckedChange={(checked) => setLigature(LIGATURES_CONTEXTUAL, checked ? undefined : "no-contextual")}
                />
            </SettingRow>
            <SettingRow label="Discretionary">
                <Switch
                    checked={ligatures.includes("discretionary-ligatures")}
                    onCheckedChange={(checked) => setLigature(LIGATURES_DISCRETIONARY, checked ? "discretionary-ligatures" : undefined)}
                />
            </SettingRow>
        </div>
    );
}

function TypeSettingsPopover({ style, patch }: { style: StyleValue; patch: (p: Patch) => void }) {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<"basics" | "details">("basics");
    const [view, setView] = useState<"main" | "decoration">("main");

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) setView("main");
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant={open ? "secondary" : "ghost"}
                    size="sm"
                    className={cn("h-7 w-7 shrink-0 p-0", open && "text-primary")}
                    title="Type settings"
                >
                    <SlidersVertical className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                side="left"
                align="start"
                sideOffset={8}
                collisionPadding={12}
                className="max-h-[min(80vh,44rem)] w-80 overflow-y-auto p-0"
                onOpenAutoFocus={(event) => event.preventDefault()}
                onInteractOutside={(event) => {
                    const target = event.target;
                    if (target instanceof Element && target.closest("[data-radix-popper-content-wrapper],[role='listbox']")) {
                        event.preventDefault();
                    }
                }}
            >
                <Tabs value={tab} onValueChange={(next) => setTab(next as "basics" | "details")}>
                    <div className="flex items-center justify-between border-b px-2.5 py-1.5">
                        <TabsList className="h-7">
                            <TabsTrigger value="basics" className="h-6 px-2.5 text-sm">Basics</TabsTrigger>
                            <TabsTrigger value="details" className="h-6 px-2.5 text-sm">Details</TabsTrigger>
                        </TabsList>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setOpen(false)}
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </div>
                    <div className="space-y-2 p-2.5">
                        <TypographyPreview style={style} />
                        <TabsContent value="basics" className="mt-0">
                            {view === "decoration" ? (
                                <DecorationDetails style={style} patch={patch} onBack={() => setView("main")} />
                            ) : (
                                <BasicsTab style={style} patch={patch} onOpenDecoration={() => setView("decoration")} />
                            )}
                        </TabsContent>
                        <TabsContent value="details" className="mt-0">
                            <DetailsTab style={style} patch={patch} />
                        </TabsContent>
                    </div>
                </Tabs>
            </PopoverContent>
        </Popover>
    );
}

/**
 * Figma-style Typography controls for a CSS `style` object. Every control writes
 * plain CSS properties; clearing a control removes its key.
 */
export function TypographySection({
    value,
    onChange,
}: {
    value: StyleValue | undefined;
    onChange: (next: StyleValue | undefined) => void;
}) {
    const style: StyleValue = value && typeof value === "object" ? value : {};
    const font = findGoogleFont(style.fontFamily);
    const variants = useFontVariants(font) ?? FALLBACK_VARIANTS;

    // A draft input commits on blur, and the click that caused the blur may patch
    // again before the parent re-renders; both must build on the latest style.
    const latestStyleRef = useRef(style);
    latestStyleRef.current = style;

    const patch = (changes: Patch) => {
        const next: StyleValue = { ...latestStyleRef.current };
        for (const [key, val] of Object.entries(changes)) {
            if (val === undefined || val === "") delete next[key];
            else next[key] = val;
        }
        latestStyleRef.current = next;
        onChange(Object.keys(next).length > 0 ? next : undefined);
    };

    const weight = normalizeWeight(style.fontWeight);
    const fontStyle = style.fontStyle === "italic" ? "italic" : "normal";
    const variantOptions = Object.entries(variants).flatMap(([variantStyle, weights]) =>
        weights.map((w) => ({ value: `${w}|${variantStyle}`, label: variantLabel(w, variantStyle), weight: Number(w), style: variantStyle })),
    ).sort((a, b) => a.weight - b.weight || (a.style === "italic" ? 1 : -1));
    const variantValue = `${weight}|${fontStyle}`;
    if (!variantOptions.some((option) => option.value === variantValue)) {
        variantOptions.unshift({ value: variantValue, label: variantLabel(weight, fontStyle), weight: Number(weight), style: fontStyle });
    }

    return (
        <div className="space-y-2 text-sm border border-muted rounded-md p-3 shadow-md">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Typography</p>
                <TypeSettingsPopover style={style} patch={patch} />
            </div>


            <div className="flex flex-col gap-2">
                <FontPicker
                    value={typeof style.fontFamily === "string" ? style.fontFamily : undefined}
                    onChange={(next) => patch({ fontFamily: next })}
                    valueFormat="fontFamily"
                    placeholder="Select font"
                    className="h-8 w-full text-sm"
                />
                <LengthField
                    mode="font"
                    units="toggle"
                    value={style.fontSize}
                    placeholder="64"
                    title="Font size: 64, 120%, 1.5em, or 2ch. Empty uses 64"
                    onCommit={(next) => {
                        if (next !== undefined) patch({ fontSize: next });
                    }}
                />
                <Select
                    value={variantValue}
                    onValueChange={(next) => {
                        const [nextWeight, nextStyle] = next.split("|");
                        patch({
                            fontWeight: nextWeight === "400" ? undefined : Number(nextWeight),
                            fontStyle: nextStyle === "italic" ? "italic" : undefined,
                        });
                    }}
                >
                    <SelectTrigger className="h-8 w-full min-w-0 text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {variantOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-1">
                <LengthField
                    className="min-w-0 flex-1"
                    mode="line"
                    icon={<span className="text-[11px] font-semibold underline">A</span>}
                    value={style.lineHeight}
                    placeholder="Auto"
                    title="Line height: 1.2, 120%, 1.2em, or 1ch. Empty is auto"
                    onCommit={(next) => patch({ lineHeight: next })}
                />
                <LengthField
                    className="min-w-0 flex-1"
                    mode="tracking"
                    icon={<span className="text-[11px] font-semibold">|A|</span>}
                    value={style.letterSpacing}
                    placeholder="0"
                    title="Letter spacing: 2, 2%, 0.05em, or 0.1ch"
                    onCommit={(next) => patch({ letterSpacing: next })}
                />
                <OptionToggle
                    className="shrink-0"
                    itemClassName="h-8 w-6 px-0 text-[11px]"
                    value={readCase(style)}
                    onChange={(next) => patch(writeCase(next))}
                    options={CASE_OPTIONS}
                />
            </div>

            <div className="space-y-1">
                <FieldCaption>Alignment</FieldCaption>
                <div className="flex items-center gap-2">
                    <OptionToggle
                        className="flex-1"
                        value={style.textAlign === "center" || style.textAlign === "right" ? style.textAlign : "left"}
                        onChange={(next) => patch({ textAlign: next })}
                        options={[
                            { value: "left", label: <AlignLeft />, title: "Align left" },
                            { value: "center", label: <AlignCenter />, title: "Align center" },
                            { value: "right", label: <AlignRight />, title: "Align right" },
                        ]}
                    />
                    <OptionToggle
                        className="flex-1"
                        value={style.alignContent === "center" || style.alignContent === "end" ? style.alignContent : "start"}
                        onChange={(next) => patch({ alignContent: next === "start" ? undefined : next })}
                        options={[
                            { value: "start", label: <ArrowUpToLine />, title: "Align top" },
                            { value: "center", label: <FoldVertical />, title: "Align middle" },
                            { value: "end", label: <ArrowDownToLine />, title: "Align bottom" },
                        ]}
                    />
                    <TypeSettingsPopover style={style} patch={patch} />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <div className="min-w-0 space-y-1">
                    <FieldCaption>Fill</FieldCaption>
                    <TextFillControl compact style={style} patch={patch} />
                </div>
                <div className="min-w-0 space-y-1">
                    <FieldCaption>Shadow</FieldCaption>
                    <TextShadowControl compact style={style} patch={patch} />
                </div>
                <div className="min-w-0 space-y-1">
                    <FieldCaption>Stroke</FieldCaption>
                    <TextStrokeControl compact style={style} patch={patch} />
                </div>
            </div>
        </div>
    );
}
