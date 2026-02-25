import React, { useState } from "react";
import type { UniversalEffectData, AnimationRange } from "@microfox/remotion";

export interface GenericEffectEditorProps {
  value: Partial<UniversalEffectData>;
  onChange: (data: Partial<UniversalEffectData>) => void;
  className?: string;
  disabled?: boolean;
}

const EASING_TYPES = [
  "linear",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "spring",
] as const;

export function GenericEffectEditor({
  value,
  onChange,
  className = "",
  disabled = false,
}: GenericEffectEditorProps) {
  const ranges = value.ranges ?? [];
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [newProg, setNewProg] = useState("0");

  const update = (patch: Partial<UniversalEffectData>) => {
    onChange({ ...value, ...patch });
  };

  const updateRange = (index: number, patch: Partial<AnimationRange>) => {
    const next = [...ranges];
    next[index] = { ...next[index], ...patch };
    update({ ranges: next });
  };

  const removeRange = (index: number) => {
    update({ ranges: ranges.filter((_, i) => i !== index) });
  };

  const addRange = () => {
    const prog = parseFloat(newProg);
    if (newKey.trim() && !Number.isNaN(prog)) {
      update({
        ranges: [...ranges, { key: newKey.trim(), val: newVal.trim() || 0, prog }],
      });
      setNewKey("");
      setNewVal("");
      setNewProg("0");
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "6px 8px",
    fontSize: "12px",
    boxSizing: "border-box",
    minWidth: 0,
  };

  return (
    <div className={className} style={{ minWidth: 0 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <label
            style={{
              fontSize: "12px",
              display: "block",
              marginBottom: "4px",
            }}
          >
            Start (s)
          </label>
          <input
            type="number"
            step={0.1}
            value={value.start ?? 0}
            onChange={(e) => update({ start: parseFloat(e.target.value) || 0 })}
            disabled={disabled}
            style={{ width: "100%", ...inputStyle }}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <label
            style={{
              fontSize: "12px",
              display: "block",
              marginBottom: "4px",
            }}
          >
            Duration (s)
          </label>
          <input
            type="number"
            step={0.1}
            value={value.duration ?? 1}
            onChange={(e) =>
              update({ duration: parseFloat(e.target.value) || 1 })
            }
            disabled={disabled}
            style={{ width: "100%", ...inputStyle }}
          />
        </div>
        <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
          <label
            style={{
              fontSize: "12px",
              display: "block",
              marginBottom: "4px",
            }}
          >
            Easing type
          </label>
          <select
            value={value.type ?? "ease-in-out"}
            onChange={(e) =>
              update({ type: e.target.value as UniversalEffectData["type"] })
            }
            disabled={disabled}
            style={{ width: "100%", ...inputStyle }}
          >
            {EASING_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{ marginBottom: "8px", fontSize: "12px", fontWeight: 500 }}
      >
        Ranges (keyframes)
      </div>
      {ranges.map((r, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 80px auto",
            gap: "6px",
            alignItems: "end",
            marginBottom: "6px",
            minWidth: 0,
          }}
        >
          <input
            type="text"
            value={r.key}
            onChange={(e) => updateRange(i, { key: e.target.value })}
            disabled={disabled}
            placeholder="key"
            style={inputStyle}
          />
          <input
            type="text"
            value={typeof r.val === "string" ? r.val : String(r.val)}
            onChange={(e) => updateRange(i, { val: e.target.value })}
            disabled={disabled}
            placeholder="value"
            style={inputStyle}
          />
          <input
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={r.prog}
            onChange={(e) =>
              updateRange(i, { prog: parseFloat(e.target.value) || 0 })
            }
            disabled={disabled}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => removeRange(i)}
            disabled={disabled}
            style={{ padding: "6px 8px", fontSize: "12px" }}
          >
            Remove
          </button>
        </div>
      ))}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 80px auto",
          gap: "6px",
          alignItems: "end",
          marginTop: "8px",
          minWidth: 0,
        }}
      >
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          disabled={disabled}
          placeholder="key (e.g. opacity)"
          style={inputStyle}
        />
        <input
          type="text"
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          disabled={disabled}
          placeholder="value"
          style={inputStyle}
        />
        <input
          type="number"
          min={0}
          max={1}
          step={0.1}
          value={newProg}
          onChange={(e) => setNewProg(e.target.value)}
          disabled={disabled}
          placeholder="prog"
          style={inputStyle}
        />
        <button
          type="button"
          onClick={addRange}
          disabled={disabled || !newKey.trim()}
          style={{ padding: "6px 8px", fontSize: "12px" }}
        >
          Add keyframe
        </button>
      </div>
    </div>
  );
}

