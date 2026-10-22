import { AiRouter } from "@microfox/ai-router";
import { z } from "zod/v4";
import { appendUsage } from "@/app/ai/middlewares/usageCapture";
import { saveCaptionsFix } from "../helpers";
import { loadCaption } from "../middlewares/loadTranscription";
import { runSpellingFix } from "../lib/spellingCore";
import { getReferenceLyrics } from "../lib/lyricsReference";
import { preserveCaptionOriginalState } from "@/lib/captions/original-state";
import type { Caption } from "@/app/types/transcription";

/**
 * Correct wording on a captions document.
 *
 * The linked transcription's lyrics are the authority for what was said.
 * Line boundaries stay; timing comes from the audio. The transcription document is never written.
 */

const aiRouter = new AiRouter();

const captionSpellingFixerAgent = aiRouter
  .before("/", loadCaption)
  .agent("/", async (ctx) => {
    try {
      const {
        captionId,
        transcriptionId,
        userRequest,
        applyToDatabase = false,
      } = ctx.request.params as {
        captionId: string;
        transcriptionId?: string;
        userRequest?: string;
        applyToDatabase?: boolean;
      };

      if (!transcriptionId) {
        throw new Error(
          "Spelling correct needs a transcription linked to this captions document",
        );
      }

      const transcription = ctx.state.transcription;
      if (!transcription) {
        throw new Error("Linked transcription was not found");
      }

      const reference = getReferenceLyrics(transcription);
      if (!reference) {
        throw new Error(
          "Spelling correct only runs when the linked transcription has lyrics",
        );
      }

      console.log("CAPTION SPELLING FIXER: Starting...", {
        captionId,
        transcriptionId,
        lyricWords: reference.wordCount,
      });

      ctx.response.writeMessageMetadata({
        loader: "Correcting caption wording against the saved lyrics...",
      });

      const captionDocument = ctx.state.captionDocument;
      const captions = (captionDocument?.captions || []) as Caption[];
      if (captions.length === 0) {
        throw new Error("The captions document has no lines to correct");
      }
      const result = await runSpellingFix(captions, {
        referenceLyrics: reference,
        useReference: true,
        allowWordRemoval: false,
        userRequest,
      });

      for (const usage of result.usage) {
        appendUsage(ctx.state, "google/gemini-2.5-pro", usage);
      }

      const fixedCaptions = preserveCaptionOriginalState(
        captions,
        result.fixedCaptions,
      );

      let savedDocument = captionDocument;
      const shouldSave = applyToDatabase && result.changes.length > 0;
      if (shouldSave) {
        savedDocument = await saveCaptionsFix(captionId, fixedCaptions);
      } else {
        savedDocument = {
          ...captionDocument,
          captions: fixedCaptions,
        };
      }

      return {
        success: true,
        appliedToDatabase: shouldSave,
        captionId,
        transcriptionId,
        captions: savedDocument,
        changes: result.changes,
        reviewNotes: result.reviewNotes,
        usedReferenceLyrics: true,
        confidence: result.confidence,
        summary: result.summary,
      };
    } catch (error) {
      console.error("Caption spelling fixer error:", error);
      throw error;
    }
  })
  .actAsTool("/", {
    id: "captionSpellingFixer",
    name: "Spelling Correct",
    description:
      "Fix wording on a captions document using the lyrics saved on its linked transcription. The transcription is not updated.",
    inputSchema: z.object({
      captionId: z.string().describe("Captions document ID to correct"),
      transcriptionId: z
        .string()
        .describe(
          "Linked transcription ID. Read only, for its saved lyrics. The transcription is not updated.",
        ),
      userRequest: z
        .string()
        .optional()
        .describe("Extra direction for the wording fixes"),
      applyToDatabase: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "Save corrected lines onto the captions document. Never writes the transcription.",
        ),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      appliedToDatabase: z.boolean(),
      captionId: z.string(),
      changes: z.array(z.any()),
      reviewNotes: z.array(z.any()),
      usedReferenceLyrics: z.boolean(),
      confidence: z.number().min(0).max(1),
      summary: z.string(),
    }),
    metadata: {
      category: "caption",
      tags: ["caption", "caption-autofix", "spelling"],
      icon: "✏️",
      title: "Spelling Correct",
      description: "Fix caption wording from the linked transcription lyrics",
      hideUI: false,
    },
  });

export default captionSpellingFixerAgent;
