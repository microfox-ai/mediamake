import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { paramInputTypes, paramMetaTypes } from '@microfox/remotion/param-meta';
import { z } from 'zod';
import { defineAtomPreset } from './define-atom-preset';
import { getPredefinedPresetById } from './registry/registry/presets-registry';

function runBuild(presetFunction: string, data: Record<string, unknown>) {
  const run = new Function(
    'data',
    'props',
    `return (${presetFunction})(data, props);`,
  ) as (data: Record<string, unknown>, props?: unknown) => {
    componentId: string;
    type: string;
    data: Record<string, unknown>;
  };
  return run(data);
}

describe('defineAtomPreset', () => {
  it('categories atoms by folder, with the atoms folder as BaseAtoms', () => {
    assert.equal(
      defineAtomPreset({ componentId: 'A', displayName: 'A', folder: 'atoms' }).metadata.category,
      'BaseAtoms',
    );
    assert.equal(
      defineAtomPreset({ componentId: 'B', displayName: 'B', folder: 'waveforms' }).metadata.category,
      'waveforms',
    );
    assert.equal(
      defineAtomPreset({
        componentId: 'C',
        displayName: 'C',
        folder: 'waveforms',
        category: 'Spectrum',
      }).metadata.category,
      'Spectrum',
    );
  });

  it('keeps inputType and rangeField meta on the generated schema', () => {
    const preset = defineAtomPreset({
      componentId: 'MetaAtom',
      displayName: 'Meta Atom',
      inputSchema: z.object({
        color: z
          .string()
          .meta({ [paramMetaTypes.inputType]: paramInputTypes.color }),
        rangeString: z
          .string()
          .meta({ [paramMetaTypes.rangeField]: true }),
      }),
    });

    const json = JSON.stringify(preset.presetParams);
    assert.match(json, /"inputType":"color"/);
    assert.match(json, /"rangeField":true/);
    assert.match(json, /"trackName"/);
  });

  it('copies schema fields onto data and leaves shell keys off it', () => {
    const preset = defineAtomPreset({
      componentId: 'MetaAtom',
      displayName: 'Meta Atom',
      inputSchema: z.object({
        label: z.string(),
      }),
    });

    const built = runBuild(preset.presetFunction, {
      label: 'hello',
      start: 1,
      duration: 4,
      trackName: 'meta',
      containerProps: { style: { overflow: 'hidden' } },
    });

    assert.equal(built.componentId, 'MetaAtom');
    assert.equal(built.type, 'atom');
    assert.deepEqual(built.data, { label: 'hello' });
    assert.equal('start' in built.data, false);
    assert.equal('duration' in built.data, false);
    assert.equal('trackName' in built.data, false);
    assert.equal('containerProps' in built.data, false);
  });

  it('uses a single data object when the atom has no schema', () => {
    const preset = defineAtomPreset({
      componentId: 'BareAtom',
      displayName: 'Bare Atom',
    });

    const properties = preset.presetParams.properties as Record<string, unknown>;
    assert.ok(properties.trackName);
    assert.ok(properties.data);
    assert.equal(properties.label, undefined);

    const built = runBuild(preset.presetFunction, {
      data: { foo: 1 },
      start: 3,
      duration: 4,
      trackName: 'bare',
    });
    assert.equal(built.componentId, 'BareAtom');
    assert.deepEqual(built.data, { foo: 1 });
  });
});

describe('atom block registry', () => {
  it('resolves a generated atom preset and hides demo atoms', () => {
    const text = getPredefinedPresetById('atom:TextAtom');
    assert.ok(text);
    assert.equal(text.metadata.placement, 'atom');
    assert.equal(text.metadata.title, 'TextAtom');
    assert.equal(text.metadata.category, 'BaseAtoms');
    assert.equal(getPredefinedPresetById('atom:WaveformHistogram')?.metadata.category, 'waveforms');
    const smear = getPredefinedPresetById('atom:CaptionSmear');
    assert.equal(smear?.metadata.category, 'captions');
    const smearJson = JSON.stringify(smear?.presetParams);
    assert.match(smearJson, /"textStyle":true/);
    assert.match(smearJson, /"positionStyle":true/);
    const beat = getPredefinedPresetById('atom:ImageBeat');
    assert.equal(beat?.metadata.category, 'beatmade');
    const beatJson = JSON.stringify(beat?.presetParams);
    assert.match(beatJson, /"blockStyle":true/);
    assert.match(beatJson, /"positionStyle":true/);
    assert.match(beatJson, /"imageStyle":true/);
    assert.equal(getPredefinedPresetById('atom:CanvasPipeline')?.metadata.category, 'canvas');
    assert.equal(getPredefinedPresetById('atom:WaveformHistogramRanged')?.metadata.category, 'waveforms');
    const json = JSON.stringify(text.presetParams);
    assert.match(json, /"inputType":"color"/);
    assert.match(json, /"inputType":"textarea"/);
    assert.match(json, /"textStyle":true/);
    assert.match(json, /"blockStyle":true/);
    assert.match(json, /"positionStyle":true/);
    for (const id of ["VideoAtom", "ImageAtom", "HTMLBlockAtom", "ShapeAtom"]) {
      const atomJson = JSON.stringify(getPredefinedPresetById(`atom:${id}`)?.presetParams);
      assert.match(atomJson, /"blockStyle":true/);
    }
    assert.match(JSON.stringify(getPredefinedPresetById("atom:HTMLBlockAtom")?.presetParams), /"positionStyle":true/);
    assert.match(JSON.stringify(getPredefinedPresetById("atom:ImageAtom")?.presetParams), /"positionStyle":true/);
    assert.match(JSON.stringify(getPredefinedPresetById("atom:VideoAtom")?.presetParams), /"videoStyle":true/);
    assert.match(JSON.stringify(getPredefinedPresetById("atom:AudioAtom")?.presetParams), /"audioStyle":true/);

    assert.equal(getPredefinedPresetById('atom:Rings'), undefined);
    assert.equal(getPredefinedPresetById('atom:NextjsLogo'), undefined);
    assert.ok(getPredefinedPresetById('text-atom'));
  });
});
