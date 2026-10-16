"use client";

import { useState } from "react";
import { readTextStroke, textStrokePatch, type TextStroke } from "./text-stroke";
import { AdjustRow, EffectPopover, PopupColor, ShadowSwatch } from "./effect-popover";

const EMPTY: TextStroke = { width: 2, color: "#000000" };

export function TextStrokeControl({
    style,
    patch,
}: {
    style: Record<string, unknown>;
    patch: (changes: Record<string, unknown>) => void;
}) {
    const stroke = readTextStroke(style);
    const [draft, setDraft] = useState<TextStroke>(stroke ?? EMPTY);

    const shown = stroke ?? draft;
    const write = (next: TextStroke) => {
        setDraft(next);
        patch(textStrokePatch(next));
    };

    return (
        <EffectPopover
            swatch={<ShadowSwatch color={stroke?.color} />}
            title={stroke ? `${stroke.width}px` : "None"}
            detail={stroke ? stroke.color : "Text stroke"}
            active={Boolean(stroke)}
            clearLabel="Remove text stroke"
            onClear={() => patch(textStrokePatch(undefined))}
        >
            <div className="space-y-3">
                <div
                    className="flex h-14 items-center justify-center rounded-md bg-muted text-2xl font-semibold"
                    style={{
                        color: "#111111",
                        WebkitTextStrokeWidth: shown.width,
                        WebkitTextStrokeColor: shown.color,
                        paintOrder: "stroke fill",
                    }}
                >
                    Ag
                </div>
                <PopupColor value={shown.color} onChange={(color) => write({ ...shown, color })} />
                <AdjustRow label="Width" min={0} max={32} value={shown.width} onChange={(width) => write({ ...shown, width })} />
            </div>
        </EffectPopover>
    );
}
