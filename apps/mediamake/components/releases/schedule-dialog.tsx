'use client';

import { useEffect, useState } from 'react';
import type { CatalogItemRecord } from '@/lib/catalog/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatDate } from './model';

const PRESETS = [7, 14, 30, 60, 90];

/** Starts or changes the gate after which a community item goes public. */
export function ScheduleDialog({
  item,
  defaultDays,
  onClose,
  onSchedule,
}: {
  item: CatalogItemRecord | null;
  defaultDays: number;
  onClose: () => void;
  onSchedule: (item: CatalogItemRecord, body: { label: string; request: { days: number } }) => Promise<void>;
}) {
  const [days, setDays] = useState(defaultDays);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) setDays(defaultDays);
  }, [item, defaultDays]);

  const valid = Number.isFinite(days) && days >= 1 && days <= 365;
  const publicOn = valid ? formatDate(Date.now() + days * 86_400_000) : '–';

  return (
    <Dialog open={!!item} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item?.publicAt ? 'Change gate' : 'Start gate'}</DialogTitle>
          <DialogDescription>
            {item?.title} {item?.visibility === 'private' ? 'becomes a community item now and ' : ''}goes public by itself when the gate ends. Until then only
            the community, private testers and people you grant can open it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => setDays(preset)}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm transition',
                  days === preset ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {preset} days
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gate-days">Days from now</Label>
              <Input id="gate-days" type="number" min={1} max={365} value={days} onChange={e => setDays(Number(e.target.value))} />
            </div>
            <div className="pb-2 text-sm">
              <span className="text-muted-foreground">Public on </span>
              <span className="font-medium">{publicOn}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!valid || saving || !item}
            onClick={async () => {
              if (!item) return;
              setSaving(true);
              await onSchedule(item, { label: `on ${publicOn}`, request: { days } });
              setSaving(false);
            }}
          >
            {item?.publicAt ? 'Update gate' : 'Start gate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
