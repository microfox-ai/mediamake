import { z } from "zod";
import { DataTypeDefinition, paramInputTypes, paramMetaTypes } from "./types";

/** Object-fit for image/video frames. */
export const mediaFitEnum = z.enum([
  "cover",
  "contain",
  "fill",
  "none",
  "scale-down",
]);

export const mediaFilterEnum = z.enum([
  "none",
  "blur",
  "brightness",
  "contrast",
  "saturate",
  "grayscale",
  "sepia",
  "hue-rotate",
  "invert",
  "distorted",
  "vintage",
  "dramatic",
  "soft",
  "sharp",
]);

export const mediaBlendModeEnum = z.enum([
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
]);

export const mediaKindEnum = z.enum(["image", "video", "audio"]);

/**
 * Shared media item shape for `media` / `medias` references.
 * Supports image, video, and audio with optional playback / visual params.
 * Extra keys (e.g. from MediaFile picks) are allowed via passthrough.
 */
export const mediaItemSchema = z
  .object({
    src: z.string().describe("Media source URL or file path"),
    type: mediaKindEnum
      .optional()
      .meta({ [paramMetaTypes.groupEditable]: false })
      .describe("Media kind (image | video | audio)"),
    rangeString: z
      .string()
      .optional()
      .meta({
        [paramMetaTypes.rangeField]: true,
        [paramMetaTypes.groupEditable]: false,
      })
      .describe("Active range MM:SS-MM:SS"),
    // Visual (image / video)
    fit: mediaFitEnum
      .optional()
      .meta({ [paramMetaTypes.groupEditable]: true })
      .describe("Object fit (default: cover)"),
    filter: mediaFilterEnum
      .optional()
      .meta({ [paramMetaTypes.groupEditable]: true })
      .describe("CSS filter preset"),
    blendMode: mediaBlendModeEnum
      .optional()
      .meta({ [paramMetaTypes.groupEditable]: true })
      .describe("Blend mode"),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .meta({ [paramMetaTypes.groupEditable]: true })
      .describe("Opacity 0–1"),
    colorTint: z
      .string()
      .optional()
      .meta({
        [paramMetaTypes.inputType]: paramInputTypes.color,
        [paramMetaTypes.groupEditable]: true,
      })
      .describe("Optional color tint overlay"),
    // Playback (video / audio)
    volume: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .meta({ [paramMetaTypes.groupEditable]: true })
      .describe("Volume 0–1"),
    muted: z
      .boolean()
      .optional()
      .meta({ [paramMetaTypes.groupEditable]: true })
      .describe("Mute playback"),
    playbackRate: z
      .number()
      .min(0.1)
      .max(4)
      .optional()
      .meta({ [paramMetaTypes.groupEditable]: true })
      .describe("Playback rate"),
    startFrom: z
      .number()
      .min(0)
      .optional()
      .meta({ [paramMetaTypes.groupEditable]: false })
      .describe("Trim start offset in seconds"),
  })
  .passthrough();

export type MediaItem = z.infer<typeof mediaItemSchema>;
export type MediaKind = z.infer<typeof mediaKindEnum>;

export const mediaDataType: DataTypeDefinition = {
  id: "media",
  title: "Media",
  description: "Single media item (image, video, or audio) with optional params.",
  referenceType: "media",
  defaultValue: { src: "" },
  schema: mediaItemSchema,
};

export const mediasDataType: DataTypeDefinition = {
  id: "medias",
  title: "Medias (Array)",
  description:
    "Array of media items (image / video / audio) with optional visual and playback params.",
  referenceType: "medias",
  defaultValue: [],
  schema: z.array(mediaItemSchema).meta({
    [paramMetaTypes.mediasGroup]: true,
    [paramMetaTypes.nestedRangeField]: "[].rangeString",
  }),
};

/** Guess media kind from explicit type or src extension. */
export function detectMediaKind(item: any): MediaKind {
  const explicit = item?.type ?? item?.contentType;
  if (explicit === "image" || explicit === "video" || explicit === "audio") {
    return explicit;
  }
  const src = String(
    item?.src || item?.filePath || item?.url || item?.metadata?.src || "",
  ).toLowerCase();
  if (/\.(mp4|webm|mov|mkv|m4v|avi)(\?|$)/i.test(src)) return "video";
  if (/\.(mp3|wav|ogg|m4a|aac|flac|wma)(\?|$)/i.test(src)) return "audio";
  return "image";
}

/** Normalize a picker MediaFile (or loose object) into a mediaItemSchema-shaped value. */
export function toMediaItem(input: any): MediaItem {
  if (!input || typeof input !== "object") {
    return { src: typeof input === "string" ? input : "" };
  }
  const src =
    input.src ||
    input.filePath ||
    input.url ||
    input.metadata?.src ||
    "";
  const type = detectMediaKind(input);
  return {
    ...input,
    src: String(src),
    type,
  };
}
