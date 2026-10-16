"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
    AlignCenterHorizontal,
    AlignCenterVertical,
    AlignEndHorizontal,
    AlignEndVertical,
    AlignStartHorizontal,
    AlignStartVertical,
    ArrowDownFromLine,
    Bug,
    ChartScatter,
    ChevronDown,
    FlipHorizontal2,
    FlipVertical2,
    Fullscreen,
    Link2,
    RotateCw,
    Unlink2,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
    commitPlacement,
    formatLength,
    parseLength,
    readPlacement,
    rotateBy90,
    type AxisAlign,
    type PlacementDraft,
    type PlacementMode,
} from "./position-style";

type StyleValue = Record<string, unknown>;

const DEBUG_BORDER = "1px solid #ef4444";

function IconTip({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent side="top">{label}</TooltipContent>
        </Tooltip>
    );
}

const EDGE_FIELDS: { key: "left" | "right" | "top" | "bottom"; prefix: string; title: string }[] = [
    { key: "left", prefix: "L", title: "Left" },
    { key: "right", prefix: "R", title: "Right" },
    { key: "top", prefix: "T", title: "Top" },
    { key: "bottom", prefix: "B", title: "Bottom" },
];

function DraftInput({
    value,
    onCommit,
    placeholder,
    prefix,
    adornment,
    suffix,
    title,
    className,
}: {
    value: string;
    onCommit: (raw: string) => void;
    placeholder?: string;
    prefix?: string;
    adornment?: ReactNode;
    suffix?: string;
    title?: string;
    className?: string;
}) {
    const [draft, setDraft] = useState(value);
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        if (!focused) setDraft(value);
    }, [value, focused]);

    const clear = () => {
        setDraft("");
        if (value !== "") onCommit("");
    };

    return (
        <div className={cn("group relative min-w-0", className)}>
            {(prefix || adornment) && (
                <span className="pointer-events-none absolute left-1.5 top-1/2 z-10 flex -translate-y-1/2 items-center text-[10px] font-medium text-muted-foreground">
                    {adornment ?? prefix}
                </span>
            )}
            <Input
                value={draft}
                title={title}
                placeholder={placeholder}
                className={cn("h-7 text-sm pr-6", (prefix || adornment) && "pl-6")}
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
                <span
                    className={cn(
                        "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground",
                        draft !== "" && "group-hover:opacity-0",
                    )}
                >
                    {suffix}
                </span>
            )}
            {draft !== "" && (
                <button
                    type="button"
                    title="Clear"
                    className="absolute right-0.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={clear}
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </div>
    );
}

function EdgeGrid({
    draft,
    onEdge,
}: {
    draft: PlacementDraft;
    onEdge: (key: "left" | "right" | "top" | "bottom", raw: string) => void;
}) {
    return (
        <div className="grid grid-cols-4 gap-1">
            {EDGE_FIELDS.map((field) => (
                <DraftInput
                    key={field.key}
                    prefix={field.prefix}
                    value={draft[field.key] ?? ""}
                    placeholder="—"
                    title={`${field.title} in pixels or percent. Empty clears it.`}
                    onCommit={(raw) => onEdge(field.key, raw)}
                />
            ))}
        </div>
    );
}

function MotionRow({
    draft,
    onRotate,
    onFlip,
    onScale,
    onLink,
}: {
    draft: PlacementDraft;
    onRotate: (next: number) => void;
    onFlip: (axis: "flipX" | "flipY") => void;
    onScale: (scaleX: number, scaleY: number) => void;
    onLink: (linked: boolean) => void;
}) {
    const writeScale = (axis: "x" | "y", raw: string) => {
        const text = raw.trim();
        const n = text ? Number(text) : 1;
        if (!Number.isFinite(n)) return;
        if (draft.scaleLinked) onScale(n, n);
        else if (axis === "x") onScale(n, draft.scaleY);
        else onScale(draft.scaleX, n);
    };

    const linkLabel = draft.scaleLinked ? "Unlock scale X and Y" : "Lock scale X and Y";

    return (
        <div className="grid grid-cols-3 items-center gap-1">
            <DraftInput
                className="min-w-0"
                value={draft.rotate ? String(draft.rotate) : ""}
                placeholder="0"
                adornment={<RotateCw className="h-3 w-3" />}
                suffix="°"
                title="Rotation in degrees"
                onCommit={(raw) => {
                    const text = raw.trim();
                    if (!text) {
                        onRotate(0);
                        return;
                    }
                    const n = Number(text.replace(/°$/, ""));
                    if (Number.isFinite(n)) onRotate(n);
                }}
            />
            <div className="flex items-center justify-center gap-0.5">
                <IconTip label="Rotate 90°">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        aria-label="Rotate 90°"
                        onClick={() => onRotate(rotateBy90(draft.rotate))}
                    >
                        <RotateCw className="h-3.5 w-3.5" />
                    </Button>
                </IconTip>
                <IconTip label="Flip horizontal">
                    <Button
                        type="button"
                        variant={draft.flipX ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 w-7 p-0"
                        aria-label="Flip horizontal"
                        aria-pressed={draft.flipX}
                        onClick={() => onFlip("flipX")}
                    >
                        <FlipHorizontal2 className="h-3.5 w-3.5" />
                    </Button>
                </IconTip>
                <IconTip label="Flip vertical">
                    <Button
                        type="button"
                        variant={draft.flipY ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 w-7 p-0"
                        aria-label="Flip vertical"
                        aria-pressed={draft.flipY}
                        onClick={() => onFlip("flipY")}
                    >
                        <FlipVertical2 className="h-3.5 w-3.5" />
                    </Button>
                </IconTip>
            </div>
            <div className="flex min-w-0 items-center gap-0.5">
                <DraftInput
                    className="min-w-0 flex-1"
                    prefix="X"
                    value={draft.scaleX === 1 ? "" : String(draft.scaleX)}
                    placeholder="1"
                    title="Scale X. 1 leaves the layer at its own width."
                    onCommit={(raw) => writeScale("x", raw)}
                />
                <IconTip label={linkLabel}>
                    <Button
                        type="button"
                        variant={draft.scaleLinked ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 w-7 shrink-0 p-0"
                        aria-label={linkLabel}
                        aria-pressed={draft.scaleLinked}
                        onClick={() => onLink(!draft.scaleLinked)}
                    >
                        {draft.scaleLinked ? <Link2 className="h-3.5 w-3.5" /> : <Unlink2 className="h-3.5 w-3.5" />}
                    </Button>
                </IconTip>
                <DraftInput
                    className="min-w-0 flex-1"
                    prefix="Y"
                    value={draft.scaleY === 1 ? "" : String(draft.scaleY)}
                    placeholder="1"
                    title="Scale Y. 1 leaves the layer at its own height."
                    onCommit={(raw) => writeScale("y", raw)}
                />
            </div>
        </div>
    );
}

function AlignmentIcons({
    horizontal,
    vertical,
    onHorizontal,
    onVertical,
}: {
    horizontal?: AxisAlign;
    vertical?: AxisAlign;
    onHorizontal: (next: AxisAlign | undefined) => void;
    onVertical: (next: AxisAlign | undefined) => void;
}) {
    const horizontalOptions: { value: AxisAlign; icon: ReactNode; title: string }[] = [
        { value: "start", icon: <AlignStartVertical />, title: "Align left" },
        { value: "center", icon: <AlignCenterVertical />, title: "Align center" },
        { value: "end", icon: <AlignEndVertical />, title: "Align right" },
    ];
    const verticalOptions: { value: AxisAlign; icon: ReactNode; title: string }[] = [
        { value: "start", icon: <AlignStartHorizontal />, title: "Align top" },
        { value: "center", icon: <AlignCenterHorizontal />, title: "Align middle" },
        { value: "end", icon: <AlignEndHorizontal />, title: "Align bottom" },
    ];

    return (
        <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Alignment</p>
            <div className="flex gap-2">
                <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={horizontal ?? ""}
                    onValueChange={(next) => onHorizontal(next === "start" || next === "center" || next === "end" ? next : undefined)}
                    className="flex-1"
                >
                    {horizontalOptions.map((option) => (
                        <IconTip key={option.value} label={option.title}>
                            <ToggleGroupItem
                                value={option.value}
                                aria-label={option.title}
                                className="h-7 flex-1 px-0 [&_svg]:h-3.5 [&_svg]:w-3.5"
                            >
                                {option.icon}
                            </ToggleGroupItem>
                        </IconTip>
                    ))}
                </ToggleGroup>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={vertical ?? ""}
                    onValueChange={(next) => onVertical(next === "start" || next === "center" || next === "end" ? next : undefined)}
                    className="flex-1"
                >
                    {verticalOptions.map((option) => (
                        <IconTip key={option.value} label={option.title}>
                            <ToggleGroupItem
                                value={option.value}
                                aria-label={option.title}
                                className="h-7 flex-1 px-0 [&_svg]:h-3.5 [&_svg]:w-3.5"
                            >
                                {option.icon}
                            </ToggleGroupItem>
                        </IconTip>
                    ))}
                </ToggleGroup>
            </div>
        </div>
    );
}

function SectionHeader({
    title,
    open,
    onOpen,
    onToggle,
    accessory,
}: {
    title: string;
    open: boolean;
    onOpen: () => void;
    onToggle: () => void;
    accessory?: ReactNode;
}) {
    return (
        <div
            className="group flex items-center gap-2 rounded-md px-1.5 hover:bg-muted"
            onClick={() => {
                if (!open) onOpen();
            }}
        >
            <span className="py-2 text-sm font-medium">{title}</span>
            {accessory ? (
                <div className="flex items-center" onClick={(event) => event.stopPropagation()}>
                    {accessory}
                </div>
            ) : null}
            <div className="min-h-8 min-w-0 flex-1 self-stretch" />
            <IconTip label={open ? "Collapse" : "Expand"}>
                <button
                    type="button"
                    aria-label={open ? "Collapse" : "Expand"}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggle();
                    }}
                >
                    <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")} />
                </button>
            </IconTip>
        </div>
    );
}

function PlacementControls({
    title,
    value,
    onChange,
    layout,
}: {
    title: string;
    value: StyleValue | undefined;
    onChange: (next: StyleValue | undefined) => void;
    layout: boolean;
}) {
    const clipId = useId();
    const style: StyleValue = value && typeof value === "object" ? value : {};
    const draft = readPlacement(style);
    const [open, setOpen] = useState(true);
    const tab = draft.mode;

    const latestRef = useRef(style);
    latestRef.current = style;
    const tabRef = useRef(tab);
    tabRef.current = tab;

    const commit = (patch: Partial<PlacementDraft>, mode: PlacementMode = tabRef.current) => {
        const current = readPlacement(latestRef.current);
        const nextDraft: PlacementDraft = { ...current, ...patch, mode };
        const next = commitPlacement(latestRef.current, nextDraft, { layout });
        latestRef.current = next ?? {};
        onChange(next);
    };

    const onEdge = (key: "left" | "right" | "top" | "bottom" | "width" | "height", raw: string) => {
        const parsed = parseLength(raw);
        if (parsed === null) return;
        commit({ [key]: parsed === undefined ? undefined : formatLength(parsed) });
    };

    const debugOn = style["--mm-debug"] === "1";
    const toggleDebug = () => {
        const next: StyleValue = { ...latestRef.current };
        if (debugOn) {
            if (next["--mm-debug"] === "1") delete next.border;
            delete next["--mm-debug"];
        } else {
            next.border = DEBUG_BORDER;
            next["--mm-debug"] = "1";
        }
        latestRef.current = next;
        onChange(Object.keys(next).length > 0 ? next : undefined);
    };

    return (
        <div className="space-y-2 text-sm border border-muted rounded-md p-3 bg-muted">
            <SectionHeader
                title={title}
                open={open}
                onOpen={() => setOpen(true)}
                onToggle={() => setOpen((current) => !current)}
                accessory={
                    layout ? (
                        <div className="flex items-center gap-1.5">
                            <Checkbox
                                id={clipId}
                                checked={draft.clip}
                                onCheckedChange={(checked) => commit({ clip: checked === true })}
                            />
                            <Label htmlFor={clipId} className="text-xs font-normal">
                                Clip content
                            </Label>
                        </div>
                    ) : undefined
                }
            />
            {open && <div className="space-y-2 px-1.5 pb-1">
                <Tabs
                    value={tab}
                    onValueChange={(next) => {
                        commit({}, next as PlacementMode);
                    }}
                    className="w-full "
                >
                    <div className="flex items-center gap-1">
                        <TabsList className="grid h-7 min-w-0 flex-1 grid-cols-3 bg-white">
                            <TabsTrigger value="normal" className="h-6 gap-1 px-1 text-xs">
                                <ChartScatter className="h-3 w-3" />
                                Position
                            </TabsTrigger>
                            <TabsTrigger value="absolute" className="h-6 gap-1 px-1 text-xs">
                                <Fullscreen className="h-3 w-3" />
                                Frame-Fit
                            </TabsTrigger>
                            <TabsTrigger value="relative" className="h-6 gap-1 px-1 text-xs">
                                <ArrowDownFromLine className="h-3 w-3" />
                                Inherit
                            </TabsTrigger>
                        </TabsList>
                        <IconTip label={debugOn ? "Hide bounding box" : "Show bounding box"}>
                            <Button
                                type="button"
                                variant={debugOn ? "secondary" : "outline"}
                                size="sm"
                                className="h-7 w-7 shrink-0 p-0"
                                aria-label={debugOn ? "Hide bounding box" : "Show bounding box"}
                                aria-pressed={debugOn}
                                onClick={toggleDebug}
                            >
                                <Bug className="h-3.5 w-3.5" />
                            </Button>
                        </IconTip>
                    </div>
                    <TabsContent value="normal" className="mt-2">
                        <div className="grid grid-cols-4 gap-1">
                            <DraftInput
                                prefix="X"
                                value={draft.left ?? ""}
                                placeholder="—"
                                title="X position in pixels or percent. Empty clears it."
                                onCommit={(raw) => onEdge("left", raw)}
                            />
                            <DraftInput
                                prefix="Y"
                                value={draft.bottom ?? ""}
                                placeholder="—"
                                title="Y position from the bottom, in pixels or percent. Empty clears it."
                                onCommit={(raw) => onEdge("bottom", raw)}
                            />
                            <DraftInput
                                prefix="W"
                                value={draft.width ?? ""}
                                placeholder="—"
                                title="Width in pixels or percent. Empty clears it."
                                onCommit={(raw) => onEdge("width", raw)}
                            />
                            <DraftInput
                                prefix="H"
                                value={draft.height ?? ""}
                                placeholder="—"
                                title="Height in pixels or percent. Empty clears it."
                                onCommit={(raw) => onEdge("height", raw)}
                            />
                        </div>
                    </TabsContent>
                    <TabsContent value="absolute" className="mt-2">
                        <EdgeGrid draft={draft} onEdge={onEdge} />
                    </TabsContent>
                    <TabsContent value="relative" className="mt-2">
                        <div className="grid grid-cols-2 gap-1">
                            <DraftInput
                                prefix="W"
                                value={draft.width ?? ""}
                                placeholder="—"
                                title="Width in pixels or percent. Empty clears it."
                                onCommit={(raw) => onEdge("width", raw)}
                            />
                            <DraftInput
                                prefix="H"
                                value={draft.height ?? ""}
                                placeholder="—"
                                title="Height in pixels or percent. Empty clears it."
                                onCommit={(raw) => onEdge("height", raw)}
                            />
                        </div>
                    </TabsContent>
                </Tabs>
                <MotionRow
                    draft={draft}
                    onRotate={(rotate) => commit({ rotate })}
                    onFlip={(axis) => commit({ [axis]: !draft[axis] })}
                    onScale={(scaleX, scaleY) => commit({ scaleX, scaleY })}
                    onLink={(scaleLinked) =>
                        commit(scaleLinked ? { scaleLinked: true, scaleY: draft.scaleX } : { scaleLinked: false })
                    }
                />
                {layout && (
                    <AlignmentIcons
                        horizontal={draft.layoutX}
                        vertical={draft.layoutY}
                        onHorizontal={(layoutX) => commit({ layoutX })}
                        onVertical={(layoutY) => commit({ layoutY })}
                    />
                )}
            </div>}
        </div>
    );
}

/** Writes position, size, rotation, and scale onto a CSS `style` object. */
export function PositionStyleSection({
    value,
    onChange,
}: {
    value?: StyleValue;
    onChange: (next: StyleValue | undefined) => void;
}) {
    return <PlacementControls title="Atomic Position ( Advanced )" value={value} onChange={onChange} layout={false} />;
}

/**
 * Same placement controls as Position, plus child alignment and clip.
 * The result is stored on `containerProps.style`.
 */
export function LayoutStyleSection({
    value,
    onChange,
    title = "Layout",
}: {
    value?: StyleValue;
    onChange: (next: StyleValue | undefined) => void;
    title?: string;
}) {
    return <PlacementControls title={title} value={value} onChange={onChange} layout />;
}
