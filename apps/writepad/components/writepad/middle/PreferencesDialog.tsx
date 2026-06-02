'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { EditorPreferences, EditorFont, EditorTheme } from '@/hooks/useEditorPreferences';
import { FONT_LABELS } from '@/hooks/useEditorPreferences';
import { Sun, Moon, AlignLeft, Hash, ClipboardList } from 'lucide-react';

interface PreferencesDialogProps {
  open: boolean;
  prefs: EditorPreferences;
  onClose: () => void;
  onChange: (update: Partial<EditorPreferences>) => void;
}

const FONTS = Object.keys(FONT_LABELS) as EditorFont[];

const THEMES: { value: EditorTheme; label: string; icon: React.ReactNode }[] = [
  { value: 'dark', label: 'Dark', icon: <Moon size={14} /> },
  { value: 'light', label: 'Light', icon: <Sun size={14} /> },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      {children}
    </div>
  );
}

export function PreferencesDialog({ open, prefs, onClose, onChange }: PreferencesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editor Preferences</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Theme */}
          <Row label="Theme">
            <div className="flex gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => onChange({ theme: t.value })}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors',
                    prefs.theme === t.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </Row>

          {/* Font family */}
          <Row label="Font">
            <div className="grid grid-cols-2 gap-2">
              {FONTS.map((font) => (
                <button
                  key={font}
                  onClick={() => onChange({ font })}
                  style={{ fontFamily: font }}
                  className={cn(
                    'rounded-md border px-3 py-2 text-left text-sm transition-colors',
                    prefs.font === font
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {FONT_LABELS[font]}
                </button>
              ))}
            </div>
          </Row>

          {/* Font size */}
          <Row label={`Font Size — ${prefs.fontSize}px`}>
            <Slider
              min={11}
              max={20}
              step={1}
              value={[prefs.fontSize]}
              onValueChange={([v]) => onChange({ fontSize: v })}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/60">
              <span>11px</span><span>20px</span>
            </div>
          </Row>

          {/* Line height */}
          <Row label={`Line Height — ${prefs.lineHeight.toFixed(1)}`}>
            <Slider
              min={1.2}
              max={2.2}
              step={0.1}
              value={[prefs.lineHeight]}
              onValueChange={([v]) => onChange({ lineHeight: parseFloat(v.toFixed(1)) })}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/60">
              <span>Compact (1.2)</span><span>Spacious (2.2)</span>
            </div>
          </Row>

          {/* Toggles */}
          <Row label="Editor Options">
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-4 py-2.5 transition-colors hover:bg-accent/40">
                <div className="flex items-center gap-2 text-sm">
                  <AlignLeft size={14} className="text-muted-foreground" />
                  Word Wrap
                </div>
                <input
                  type="checkbox"
                  checked={prefs.wordWrap}
                  onChange={(e) => onChange({ wordWrap: e.target.checked })}
                  className="h-4 w-4 accent-primary cursor-pointer"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-4 py-2.5 transition-colors hover:bg-accent/40">
                <div className="flex items-center gap-2 text-sm">
                  <Hash size={14} className="text-muted-foreground" />
                  Line Numbers
                </div>
                <input
                  type="checkbox"
                  checked={prefs.lineNumbers}
                  onChange={(e) => onChange({ lineNumbers: e.target.checked })}
                  className="h-4 w-4 accent-primary cursor-pointer"
                />
              </label>
            </div>
          </Row>

          {/* Plans */}
          <Row label="Plans">
            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-4 py-2.5 transition-colors hover:bg-accent/40">
              <div className="flex items-center gap-2 text-sm">
                <ClipboardList size={14} className="text-muted-foreground" />
                <div>
                  <div>Show plan files in explorer</div>
                  <div className="text-[10px] text-muted-foreground/60">.writepad/plans/ — created by Plan mode</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.showPlanFiles}
                onChange={(e) => onChange({ showPlanFiles: e.target.checked })}
                className="h-4 w-4 accent-primary cursor-pointer"
              />
            </label>
          </Row>

          {/* Preview */}
          <Row label="Preview">
            <div
              className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm"
              style={{
                fontFamily: prefs.font,
                fontSize: `${prefs.fontSize}px`,
                lineHeight: prefs.lineHeight,
              }}
            >
              <span className="text-violet-500"># </span>The quick brown fox<br />
              <span className="text-muted-foreground">jumped over the lazy dog.</span><br />
              <span className="text-emerald-500">**Bold**</span>{' '}
              <span className="text-amber-500">*italic*</span>
            </div>
          </Row>
        </div>
      </DialogContent>
    </Dialog>
  );
}
