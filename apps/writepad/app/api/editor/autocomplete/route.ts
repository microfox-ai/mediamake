/**
 * POST /api/editor/autocomplete
 *
 * Fill-in-the-middle autocomplete for the Writepad editor.
 * Gives the AI surrounding context and lets it decide everything about
 * the completion — continuation style, spacing, newlines, formatting.
 *
 * Body:  { prefix: string; suffix: string; fileName?: string }
 * Reply: { completion: string }
 */

import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (!raw) return NextResponse.json({ completion: '' });
    const body = JSON.parse(raw) as { prefix?: string; suffix?: string; fileName?: string };
    const prefix = (body.prefix ?? '').slice(-1000);
    const suffix = (body.suffix ?? '').slice(0, 200);

    if (prefix.trim().length < 8) {
      return NextResponse.json({ completion: '' });
    }

    const { text } = await generateText({
      model: google('gemini-flash-latest'),
      maxOutputTokens: 180,
      temperature: 0.55,
      prompt: buildPrompt(prefix, suffix),
    });

    // Strip accidental code fences the model might add, trim trailing whitespace only.
    // Leading whitespace/newlines are intentional — the model decides whether to
    // continue inline or start a new line.
    const completion = text
      .replace(/^```[\w]*\n?/, '')
      .replace(/\n?```$/, '')
      .trimEnd();

    return NextResponse.json({ completion });
  } catch (err) {
    console.error('[autocomplete]', err);
    return NextResponse.json({ completion: '' }, { status: 200 });
  }
}

function buildPrompt(prefix: string, suffix: string): string {
  const lastChar = prefix.slice(-1);
  const midWord = /[a-zA-Z0-9']/.test(lastChar);

  // The only structural constraint the model needs to know: how to begin
  const startHint = midWord
    ? 'The cursor is mid-word — continue that word directly with no leading space.'
    : 'Continue seamlessly from the cursor.';

  return `You are completing a piece of creative writing. Insert text at [CURSOR] that flows naturally from what came before.

${prefix}[CURSOR]${suffix}

${startHint} Write flowing prose — do not add line breaks in the middle of sentences, only at genuine paragraph breaks. Match the author's voice and style. Output only the completion, nothing else.`;
}
