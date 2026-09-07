"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, X, Plus, ArrowUp, ArrowDown, Layers } from "lucide-react";
import { getRegisteredCanvasOps } from "@microfox/remotion";
import type { CanvasOpNode, CanvasPipelineData } from "@microfox/remotion";
import { toJSONSchema } from "zod";
import { SchemaForm } from "@/components/editor/presets/form/schema-form";
import { ColorInput } from "@/components/editor/presets/form/inputs/color-input";
import { SliderInput } from "@/components/editor/presets/form/inputs/slider-input";
import { MediaPicker } from "@/components/editor/media/media-picker";
import type { MediaFile } from "@/app/types/media";

/**
 * Editor for `CanvasPipeline` atom data.
 *
 * The canvas system is registry-driven: every op ships a zod schema, so rather
 * than hand-writing a form per op we resolve the op definition, convert its
 * schema to JSON Schema and hand it to the shared SchemaForm. Ops therefore
 * become editable the moment they are registered, and colour params inside them
 * pick up the colour widget for free.
 */

const OP_GROUP_ORDER = ["draw", "clip", "mask", "particles", "glitch", "post", "group", "other"];

function opGroup(name: string): string {
    const prefix = name.split(":")[0];
    return OP_GROUP_ORDER.includes(prefix) ? prefix : "other";
}

/** Timing values may be numbers (seconds) or '%' strings — keep both editable as text. */
function timingToText(v: number | string | undefined): string {
    return v === undefined || v === null ? "" : String(v);
}
function textToTiming(raw: string): number | string | undefined {
    const s = raw.trim();
    if (!s) return undefined;
    if (s.endsWith("%")) return s;
    const n = Number(s);
    return Number.isNaN(n) ? s : n;
}

function OpNodeEditor({
    node,
    onChange,
    onRemove,
    onMove,
    disabled,
    depth = 0,
    isFirst,
    isLast,
}: {
    node: CanvasOpNode;
    onChange: (next: CanvasOpNode) => void;
    onRemove: () => void;
    onMove: (direction: -1 | 1) => void;
    disabled?: boolean;
    depth?: number;
    isFirst: boolean;
    isLast: boolean;
}) {
    const [open, setOpen] = useState(depth === 0);
    const ops = useMemo(() => getRegisteredCanvasOps(), []);
    const definition = ops.find((o) => o.name === node.op);

    // `io: "input"` keeps defaults and optionality as the author wrote them, and
    // `unrepresentable: "any"` degrades constructs JSON Schema cannot express
    // (z.custom, transforms) to a free-form field instead of throwing away the
    // whole form. The catch is the last resort for genuinely broken schemas.
    const paramsSchema = useMemo(() => {
        if (!definition?.schema) return null;
        try {
            return toJSONSchema(definition.schema, { io: "input", unrepresentable: "any" });
        } catch {
            return null;
        }
    }, [definition]);

    const children = node.children ?? [];

    const updateChildren = (next: CanvasOpNode[]) =>
        onChange({ ...node, children: next.length ? next : undefined });

    return (
        <div className="rounded-md border bg-background/50">
            <Collapsible open={open} onOpenChange={setOpen}>
                <div className="flex items-center gap-1 p-1.5">
                    <CollapsibleTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </Button>
                    </CollapsibleTrigger>
                    <Select
                        value={node.op}
                        onValueChange={(v) => onChange({ ...node, op: v, params: {} })}
                        disabled={disabled}
                    >
                        <SelectTrigger className="h-7 flex-1 min-w-0 text-xs">
                            <SelectValue placeholder="Select op" />
                        </SelectTrigger>
                        <SelectContent>
                            {OP_GROUP_ORDER.map((group) => {
                                const groupOps = ops.filter((o) => opGroup(o.name) === group);
                                if (!groupOps.length) return null;
                                return (
                                    <SelectGroup key={group}>
                                        <SelectLabel className="text-[10px] uppercase">{group}</SelectLabel>
                                        {groupOps.map((o) => (
                                            <SelectItem key={o.name} value={o.name} className="text-xs">
                                                {o.displayName}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                );
                            })}
                        </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onMove(-1)} disabled={disabled || isFirst} title="Move up">
                        <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onMove(1)} disabled={disabled || isLast} title="Move down">
                        <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onRemove} disabled={disabled} title="Remove op">
                        <X className="h-3 w-3" />
                    </Button>
                </div>

                <CollapsibleContent className="px-2 pb-2 space-y-2">
                    {definition?.description && (
                        <p className="text-[10px] text-muted-foreground">{definition.description}</p>
                    )}
                    {!definition && (
                        <p className="text-[10px] text-destructive">
                            Unknown op &quot;{node.op}&quot; — not in the registry. Params are editable as raw JSON only.
                        </p>
                    )}

                    <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Timing (seconds or %)</Label>
                        <div className="grid grid-cols-3 gap-1">
                            <Input
                                className="h-7 text-xs"
                                placeholder="start"
                                value={timingToText(node.timing?.start)}
                                onChange={(e) =>
                                    onChange({ ...node, timing: { ...node.timing, start: textToTiming(e.target.value) } })
                                }
                                disabled={disabled}
                            />
                            <Input
                                className="h-7 text-xs"
                                placeholder="duration"
                                value={timingToText(node.timing?.duration)}
                                onChange={(e) =>
                                    onChange({ ...node, timing: { ...node.timing, duration: textToTiming(e.target.value) } })
                                }
                                disabled={disabled}
                            />
                            <Select
                                value={node.timing?.easing ?? "__none__"}
                                onValueChange={(v) =>
                                    onChange({
                                        ...node,
                                        timing: {
                                            ...node.timing,
                                            easing: v === "__none__" ? undefined : (v as NonNullable<CanvasOpNode["timing"]>["easing"]),
                                        },
                                    })
                                }
                                disabled={disabled}
                            >
                                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="easing" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">easing —</SelectItem>
                                    <SelectItem value="linear">linear</SelectItem>
                                    <SelectItem value="ease-in">ease-in</SelectItem>
                                    <SelectItem value="ease-out">ease-out</SelectItem>
                                    <SelectItem value="ease-in-out">ease-in-out</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {paramsSchema ? (
                        <div className="min-w-0">
                            <SchemaForm
                                schema={paramsSchema}
                                value={node.params ?? {}}
                                onChange={(params) => onChange({ ...node, params })}
                                title="Params"
                                showTabs={false}
                                showResetButton={false}
                            />
                        </div>
                    ) : (
                        <p className="text-[10px] text-muted-foreground">
                            This op exposes no editable params.
                        </p>
                    )}

                    <div className="space-y-1 pt-1 border-t">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Layers className="h-3 w-3" /> Children ({children.length})
                            </Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px]"
                                onClick={() => updateChildren([...children, { op: "draw:image", params: {} }])}
                                disabled={disabled}
                            >
                                <Plus className="h-3 w-3 mr-1" /> Add child
                            </Button>
                        </div>
                        {children.length > 0 && (
                            <div className="space-y-1 pl-2 border-l">
                                {children.map((child, i) => (
                                    <OpNodeEditor
                                        key={i}
                                        node={child}
                                        depth={depth + 1}
                                        isFirst={i === 0}
                                        isLast={i === children.length - 1}
                                        disabled={disabled}
                                        onChange={(next) => updateChildren(children.map((c, j) => (j === i ? next : c)))}
                                        onRemove={() => updateChildren(children.filter((_, j) => j !== i))}
                                        onMove={(dir) => {
                                            const target = i + dir;
                                            if (target < 0 || target >= children.length) return;
                                            const next = [...children];
                                            [next[i], next[target]] = [next[target], next[i]];
                                            updateChildren(next);
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}

export function CanvasPipelineEditor({
    data,
    onChange,
    disabled,
}: {
    data: Partial<CanvasPipelineData>;
    onChange: (patch: Partial<CanvasPipelineData>) => void;
    disabled?: boolean;
}) {
    const [pickingSourceFor, setPickingSourceFor] = useState<string | null>(null);
    const pipeline = data.pipeline ?? [];
    const sources = data.sources ?? {};

    const updatePipeline = (next: CanvasOpNode[]) => onChange({ pipeline: next });

    const renameSource = (from: string, to: string) => {
        if (!to.trim() || to === from || sources[to]) return;
        const next: NonNullable<CanvasPipelineData["sources"]> = {};
        // Rebuild in order so the rename does not reshuffle the list.
        for (const [k, v] of Object.entries(sources)) next[k === from ? to : k] = v;
        onChange({ sources: next });
    };

    return (
        <div className="space-y-3">
            <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">Canvas</h4>
                <div className="space-y-1">
                    <Label className="text-xs">Background</Label>
                    <ColorInput
                        value={data.background ?? ""}
                        onChange={(v) => onChange({ background: v || undefined })}
                        disabled={disabled}
                        compact
                        placeholder="transparent"
                    />
                    <p className="text-[10px] text-muted-foreground">
                        Fill drawn before the pipeline. Leave empty for a transparent canvas.
                    </p>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Render scale</Label>
                    <SliderInput
                        value={data.renderScale ?? 1}
                        onChange={(v) => onChange({ renderScale: v })}
                        min={0.1}
                        max={1}
                        step={0.05}
                        disabled={disabled}
                    />
                    <p className="text-[10px] text-muted-foreground">
                        Backing-resolution multiplier. Lower is faster and blurrier; preview also adapts to player zoom.
                    </p>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Seed</Label>
                    <Input
                        className="h-8 text-xs"
                        value={data.seed !== undefined ? String(data.seed) : ""}
                        onChange={(e) => {
                            const raw = e.target.value;
                            if (!raw.trim()) return onChange({ seed: undefined });
                            const n = Number(raw);
                            onChange({ seed: Number.isNaN(n) ? raw : n });
                        }}
                        placeholder="defaults to component id"
                        disabled={disabled}
                    />
                    <p className="text-[10px] text-muted-foreground">
                        Controls deterministic randomness — change it to reroll particles, grain and glitch patterns.
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-medium text-muted-foreground">Sources</h4>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => {
                            let name = "image";
                            let i = 1;
                            while (sources[name]) name = `image${++i}`;
                            onChange({ sources: { ...sources, [name]: { type: "image", src: "" } } });
                        }}
                        disabled={disabled}
                    >
                        <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                </div>
                {Object.keys(sources).length === 0 ? (
                    <p className="text-[10px] text-muted-foreground">
                        No sources. Ops like <code>draw:image</code> reference these by name.
                    </p>
                ) : (
                    <div className="space-y-1">
                        {Object.entries(sources).map(([name, source]) => (
                            <div key={name} className="flex gap-1 items-center">
                                <Input
                                    className="h-8 w-24 shrink-0 text-xs font-mono"
                                    defaultValue={name}
                                    onBlur={(e) => renameSource(name, e.target.value)}
                                    disabled={disabled}
                                    title="Source name referenced by ops"
                                />
                                <Input
                                    className="h-8 flex-1 min-w-0 text-xs"
                                    value={source.src}
                                    onChange={(e) =>
                                        onChange({ sources: { ...sources, [name]: { ...source, src: e.target.value } } })
                                    }
                                    placeholder="Image URL"
                                    disabled={disabled}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 shrink-0"
                                    onClick={() => setPickingSourceFor(name)}
                                    disabled={disabled}
                                >
                                    Pick
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => {
                                        const next = { ...sources };
                                        delete next[name];
                                        onChange({ sources: next });
                                    }}
                                    disabled={disabled}
                                    title="Remove source"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
                {pickingSourceFor && (
                    <MediaPicker
                        pickerMode
                        singular
                        onSelect={(fileOrFiles: MediaFile | MediaFile[]) => {
                            const file = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles;
                            const existing = sources[pickingSourceFor];
                            if (file?.filePath && existing) {
                                onChange({
                                    sources: { ...sources, [pickingSourceFor]: { ...existing, src: file.filePath } },
                                });
                            }
                            setPickingSourceFor(null);
                        }}
                        onClose={() => setPickingSourceFor(null)}
                    />
                )}
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-medium text-muted-foreground">Pipeline ({pipeline.length})</h4>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => updatePipeline([...pipeline, { op: "draw:image", params: {} }])}
                        disabled={disabled}
                    >
                        <Plus className="h-3 w-3 mr-1" /> Add op
                    </Button>
                </div>
                {pipeline.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground">
                        Empty pipeline — nothing is drawn. Add an op to start.
                    </p>
                ) : (
                    <div className="space-y-1.5">
                        {pipeline.map((node, i) => (
                            <OpNodeEditor
                                key={i}
                                node={node}
                                isFirst={i === 0}
                                isLast={i === pipeline.length - 1}
                                disabled={disabled}
                                onChange={(next) => updatePipeline(pipeline.map((n, j) => (j === i ? next : n)))}
                                onRemove={() => updatePipeline(pipeline.filter((_, j) => j !== i))}
                                onMove={(dir) => {
                                    const target = i + dir;
                                    if (target < 0 || target >= pipeline.length) return;
                                    const next = [...pipeline];
                                    [next[i], next[target]] = [next[target], next[i]];
                                    updatePipeline(next);
                                }}
                            />
                        ))}
                    </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                    Ops draw in order, top to bottom. Group/clip ops render their children.
                </p>
            </div>
        </div>
    );
}
