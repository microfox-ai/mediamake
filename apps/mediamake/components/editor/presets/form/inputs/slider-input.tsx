"use client";

import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SliderInputProps {
    value: number | undefined;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    disabled?: boolean;
    className?: string;
}

/**
 * Numeric slider with a paired number box, for fields annotated with
 * `paramInputTypes.slider` or carrying JSON-schema minimum/maximum bounds.
 */
export function SliderInput({
    value,
    onChange,
    min = 0,
    max = 100,
    step,
    unit,
    disabled,
    className,
}: SliderInputProps) {
    // Fall back to a step that gives ~100 stops across the range, so fractional
    // ranges (0–1 opacity) stay usable without the author specifying one.
    const resolvedStep = step ?? (max - min <= 2 ? 0.01 : 1);
    const current = typeof value === "number" && !Number.isNaN(value) ? value : min;

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <Slider
                value={[Math.min(Math.max(current, min), max)]}
                min={min}
                max={max}
                step={resolvedStep}
                disabled={disabled}
                onValueChange={([next]) => onChange(next)}
                className="flex-1 min-w-0"
            />
            <div className="flex items-center gap-1 shrink-0">
                <Input
                    type="number"
                    value={current}
                    min={min}
                    max={max}
                    step={resolvedStep}
                    disabled={disabled}
                    onChange={(e) => {
                        const next = parseFloat(e.target.value);
                        if (!Number.isNaN(next)) onChange(next);
                    }}
                    className="h-8 w-[72px] text-xs"
                />
                {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
            </div>
        </div>
    );
}
