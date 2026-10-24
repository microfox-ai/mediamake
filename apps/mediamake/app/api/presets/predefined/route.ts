import { NextRequest, NextResponse } from 'next/server';
import { predefinedPresets } from '@/components/editor/presets/registry/registry/presets-registry';
import { presetReplacement } from '@/components/editor/presets/registry/registry/deprecated-presets';

// GET /api/presets/predefined
// - Without query: metadata of every predefined (code registry) preset
// - With ?id=...: one preset's metadata plus its input JSON schema (presetParams)
// - With ?id=...&includeCode=true: also the stringified presetFunction
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const includeCode = searchParams.get('includeCode') === 'true';

  const withReplacement = (
    metadata: (typeof predefinedPresets)[number]['metadata'],
  ) => {
    const replacement = presetReplacement(metadata.id);
    return replacement
      ? { ...metadata, deprecated: true, replacedBy: replacement.presetId }
      : metadata;
  };

  if (id) {
    const preset = predefinedPresets.find(p => p.metadata.id === id);
    if (!preset) {
      return NextResponse.json(
        { error: `Predefined preset '${id}' not found` },
        { status: 404 },
      );
    }
    return NextResponse.json({
      metadata: withReplacement(preset.metadata),
      presetParams: preset.presetParams,
      ...(includeCode ? { presetFunction: preset.presetFunction } : {}),
    });
  }

  return NextResponse.json({
    presets: predefinedPresets.map(p => withReplacement(p.metadata)),
    total: predefinedPresets.length,
  });
}
