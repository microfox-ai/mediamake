import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  let fileName = 'untitled.md';
  try {
    const body = await req.json() as {
      prefix?: string;
      suffix?: string;
      fileName?: string;
      writepadRules?: string;
    };

    const prefix = (body.prefix ?? '').slice(-500);
    const suffix = (body.suffix ?? '').slice(0, 100);
    fileName = body.fileName ?? 'untitled.md';
    const writepadRules = body.writepadRules ?? null;

    if (prefix.trim().length < 8) return NextResponse.json({ completion: '' });

    const rulesBlock = writepadRules ? `\n\nSTYLE RULES:\n${writepadRules}` : '';
    const lastChar = prefix.slice(-1);
    const midWord = /[a-zA-Z0-9']/.test(lastChar);
    const startHint = midWord
      ? 'The cursor is mid-word — continue that word directly, no leading space.'
      : 'Continue seamlessly from the cursor.';

    const { text, usage } = await generateText({
      model: google('gemini-flash-latest'),
      maxOutputTokens: 100,
      temperature: 0.65,
      providerOptions: {
        google: { thinkingConfig: { thinkingBudget: 0 } },
      },
      prompt: `You are a creative writing autocomplete. Output ONLY the completion text — no preamble, no code fences.
Complete the current sentence or add one short paragraph. Match the author's voice.${rulesBlock}
File: ${fileName}

${prefix}[CURSOR]${suffix}

${startHint}`,
    });

    console.log('[autocomplete] finish', { fileName, usage });

    const completion = text
      .replace(/^```[\w]*\n?/, '')
      .replace(/\n?```$/, '')
      .trimEnd();

    return NextResponse.json({ completion });
  } catch (err) {
    console.error('[autocomplete] error', { fileName, err });
    return NextResponse.json({ completion: '' });
  }
}
