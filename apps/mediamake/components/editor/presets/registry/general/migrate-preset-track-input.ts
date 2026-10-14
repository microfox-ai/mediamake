import { migrateHtmlBlockInputData } from "./htmlBlockAtom";
import { migrateImageLoopInputData } from "./imageloop";
import { migrateSecondCounterInputData } from "./second-counter";
import { migrateTextOverlayInputData } from "./text-overlay";
import { migrateWaveformInputData } from "./waveform";

/** Move a saved preset onto lock / sequence / aligned timing when it has that model. */
export function migratePresetTrackInput<T>(presetId: string | undefined, data: T): T {
  if (presetId === "imageloop") return migrateImageLoopInputData(data);
  if (presetId === "waveform-audio") return migrateWaveformInputData(data);
  if (presetId === "text-overlay") return migrateTextOverlayInputData(data);
  if (presetId === "htmlBlockAtom") return migrateHtmlBlockInputData(data);
  if (presetId === "second-counter") return migrateSecondCounterInputData(data);
  return data;
}
