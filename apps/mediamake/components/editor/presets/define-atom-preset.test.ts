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
    });

    assert.equal(built.componentId, 'MetaAtom');
    assert.equal(built.type, 'atom');
    assert.deepEqual(built.data, { label: 'hello' });
    assert.equal('start' in built.data, false);
    assert.equal('duration' in built.data, false);
    assert.equal('trackName' in built.data, false);
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
    const json = JSON.stringify(text.presetParams);
    assert.match(json, /"inputType":"color"/);
    assert.match(json, /"inputType":"textarea"/);

    assert.equal(getPredefinedPresetById('atom:Rings'), undefined);
    assert.equal(getPredefinedPresetById('atom:NextjsLogo'), undefined);
    assert.ok(getPredefinedPresetById('text-atom'));
  });
});
