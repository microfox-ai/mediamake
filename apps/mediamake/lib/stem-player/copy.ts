import type { LoopRange } from './types';

/*
 * The selection as text to paste into Claude: the tracks loaded in the player, the file each one
 * is and the folder it is in, with where the playhead and the loop are. A request written under it
 * ("bring the keyboard in from here, louder") then names real files and a real moment.
 */

export interface CopyTrack {
  /** The short name on its row ("Vocals"). */
  label: string;
  /** The file that plays. */
  file: string;
  /** Its folder: the full path when the screen knows it, else its path from the folder that was opened. */
  folder: string;
  /** Whether `folder` is a full path. */
  fullPath: boolean;
  /** Seconds, once the track is loaded. */
  length?: number;
}

/** A note left on some tracks, at a moment when it has one. */
export interface CopyNote {
  /** The labels of the tracks it is about. */
  tracks: string[];
  /** Seconds into the audio. */
  t?: number;
  text: string;
}

export interface CopyInput {
  tracks: CopyTrack[];
  /** The open notes of the folder the selection is in. */
  notes?: CopyNote[];
  /** Where the playhead is, and the length of what is heard (0 while nothing is loaded). */
  position: number;
  duration: number;
  loop?: LoopRange | null;
}

/** "1:23.4" */
export function stamp(seconds: number): string {
  const tenths = Math.max(0, Math.round(seconds * 10));
  return `${Math.floor(tenths / 600)}:${String(Math.floor((tenths % 600) / 10)).padStart(2, '0')}.${tenths % 10}`;
}

export function selectionText({ tracks, position, duration, loop, notes }: CopyInput): string {
  const n = tracks.length;
  const lines = [`Stem Player: ${n} track${n === 1 ? '' : 's'}${n > 1 ? ' playing together' : ''}`];
  const at = [`Playhead ${stamp(position)}${duration > 0 ? ` of ${stamp(duration)}` : ''}`];
  if (loop) at.push(`loop ${stamp(loop.start)}–${stamp(loop.end)}`);
  lines.push(at.join(' · '));
  const folders: string[] = [];
  for (const t of tracks) if (!folders.includes(t.folder)) folders.push(t.folder);
  for (const folder of folders) {
    lines.push('', `${folder.replace(/\/$/, '')}/`);
    for (const t of tracks.filter(x => x.folder === folder)) {
      // a lone file's label is its own name: say it once
      const named = t.label && !t.file.startsWith(t.label) ? `${t.label}: ` : '';
      lines.push(`- ${named}${t.file}${typeof t.length === 'number' ? ` (${stamp(t.length)})` : ''}`);
    }
  }
  if (notes?.length) {
    lines.push('', `Notes (${notes.length}):`);
    // by time, the ones about a whole track last
    for (const note of [...notes].sort((a, b) => (a.t ?? Infinity) - (b.t ?? Infinity))) {
      const where = [typeof note.t === 'number' ? stamp(note.t) : null, note.tracks.join(' + ') || null].filter(Boolean).join(' · ');
      lines.push(`- ${where ? `${where}: ` : ''}${note.text.trim().replace(/\s*\n\s*/g, ' / ')}`);
    }
  }
  if (tracks.some(t => !t.fullPath)) lines.push('', '(Folders are named as they were opened in the browser, which does not give their full path.)');
  return lines.join('\n');
}
