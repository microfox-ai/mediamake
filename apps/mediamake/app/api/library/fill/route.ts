import { NextRequest, NextResponse } from 'next/server';
import { SLUG } from '@/lib/cloud-library';
import { FillRefused, fillCeiling, fillConfigured, fillCost, fillFields, fitFiles, type FillFile } from '@/lib/cloud-library/fill';
import { caller, failed, refuse, placeOf, through } from '@/lib/cloud-library/http';
import { libraryDB, logUsage } from '@/lib/cloud-library/store';

/**
 * Claude suggests an entry's fields from the files dropped on its form (docs/library.md › Filling
 * with Claude). Nothing is saved: the form shows the answer and the person saves.
 *
 * POST { space, collection, files: [{ name, slot?, size?, text? }], have: { <field>: <value> } }
 *      → { fields, notes?, unread: [<file names too large to read>], left: <US dollars this month> }
 *      → { off: "<why>" } when it is not set up or the person's month is spent: the form stays quiet.
 *
 * `text` is a small text file's content, read by the browser; other files go by name only. One
 * usage line is kept per call: the tokens, never the files' names or words.
 */
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { clientId, usage } = caller(req, body);
  if (!clientId) return refuse('Sign in first', 401);
  if (!SLUG.test(String(body?.collection ?? ''))) return refuse('Which collection?');
  const sent: FillFile[] = (Array.isArray(body?.files) ? body.files : [])
    .filter((file: FillFile) => typeof file?.name === 'string' && file.name.trim())
    .map((file: FillFile) => ({ name: file.name.slice(0, 300), ...(typeof file.slot === 'string' && SLUG.test(file.slot) && { slot: file.slot }), ...(typeof file.text === 'string' && { text: file.text }) }));
  if (!sent.length) return refuse('No files to read');
  try {
    const at = await placeOf(clientId, body?.space, body?.collection, 'write');
    if ('response' in at) return at.response;
    if (!fillConfigured()) return NextResponse.json({ off: 'Filling with Claude is not set up' });
    const collection = await libraryDB.collection(at.space.id, at.collection);
    if (!collection) return refuse('No such collection', 404);

    const month = `${new Date().toISOString().slice(0, 7)}-01`;
    const [spent, prices] = await Promise.all([libraryDB.usageOf(clientId, month), libraryDB.prices()]);
    const ceiling = fillCeiling();
    const before = fillCost(spent.total, prices);
    if (before >= ceiling) return NextResponse.json({ off: 'You have used this month’s filling with Claude. It starts again next month.', left: 0 });

    const { files, unread } = fitFiles(sent);
    const { template } = collection;
    const learned = Object.fromEntries(Object.entries(collection.learned ?? {}).map(([list, values]) => [list, Object.entries(values).sort((a, b) => b[1] - a[1]).map(([value]) => value)]));
    const line = { ...through(usage, at), space: at.space.id, collection: collection.slug, action: 'fill' as const };
    try {
      const filled = await fillFields({
        collection: { name: collection.name, noun: template.noun, titleField: template.titleField, fields: template.fields, guide: template.guide, prefs: collection.prefs, learned },
        files,
        have: body.have && typeof body.have === 'object' ? body.have : {},
      });
      await logUsage({ ...line, tokensIn: filled.tokensIn, tokensOut: filled.tokensOut });
      const left = Math.max(0, ceiling - before - fillCost(filled, prices));
      return NextResponse.json({ fields: filled.fields, ...(filled.notes && { notes: filled.notes }), unread, left });
    } catch (error) {
      if (!(error instanceof FillRefused)) throw error;
      await logUsage({ ...line, ...error.tokens });
      return NextResponse.json({ fields: {}, notes: 'Claude did not read these files.', unread, left: Math.max(0, ceiling - before - fillCost(error.tokens, prices)) });
    }
  } catch (error) {
    return failed('fill the fields', error);
  }
}
