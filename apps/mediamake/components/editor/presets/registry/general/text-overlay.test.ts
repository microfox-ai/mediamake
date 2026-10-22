import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { textOverlayPreset, migrateTextOverlayInputData } from './text-overlay';

function runBuild(data: Record<string, unknown>) {
  const run = new Function(
    'data',
    'props',
    '__name',
    `return (${textOverlayPreset.presetFunction})(data, props);`,
  ) as (
    data: Record<string, unknown>,
    props: unknown,
    name: (target: unknown) => unknown,
  ) => {
    children: Array<{ data: { style: Record<string, unknown>; font?: { family?: string; weights?: string[] } } }>;
    containerProps: { style: Record<string, unknown> };
  };
  return run(data, undefined, (target) => target);
}

describe('text overlay style', () => {
  it('exposes typography and the text block, and drops the old style fields', () => {
    const json = JSON.stringify(textOverlayPreset.presetParams);
    assert.match(json, /"textStyle":true/);
    assert.match(json, /"blockStyle":true/);
    assert.match(json, /"textarea"/);

    const properties = textOverlayPreset.presetParams.properties as Record<string, unknown>;
    assert.equal(properties.fontFamily, undefined);
    assert.equal(properties.fontSize, undefined);
    assert.equal(properties.letterSpacing, undefined);

    const style = properties.style as { properties?: Record<string, unknown> };
    assert.equal(style.properties?.textColor, undefined);
    assert.equal(style.properties?.textShadow, undefined);
    assert.equal(style.properties?.backgroundColor, undefined);
    assert.equal(style.properties?.border, undefined);
    assert.ok(style.properties?.opacity);
    assert.ok(style.properties?.padding);
  });

  it('paints typography and block CSS from the style object', () => {
    const built = runBuild({
      text: 'Hello',
      style: {
        fontFamily: 'Inter',
        fontWeight: 600,
        fontSize: 32,
        color: '#FFFFFF',
        letterSpacing: '0.05em',
        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        backgroundColor: '#111111',
        borderRadius: 12,
        opacity: 0.8,
      },
    });
    const atom = built.children[0]?.data;
    assert.equal(atom?.style.fontFamily, 'Inter');
    assert.equal(atom?.style.fontWeight, 600);
    assert.equal(atom?.style.fontSize, 32);
    assert.equal(atom?.style.color, '#FFFFFF');
    assert.equal(atom?.style.letterSpacing, '0.05em');
    assert.equal(atom?.style.backgroundColor, '#111111');
    assert.equal(atom?.style.borderRadius, '12px');
    assert.equal(atom?.style.opacity, 0.8);
    assert.deepEqual(atom?.font, { family: 'Inter', weights: ['600'] });
  });

  it('still renders overlays saved with the old font and textColor fields', () => {
    const built = runBuild({
      text: 'Watermark',
      fontSize: 20,
      letterSpacing: 10,
      color: '#FFFFFF',
      fontFamily: 'Inter:500',
      style: {
        textTransform: 'uppercase',
        padding: '10px 40px',
        backgroundColor: '#FFFFFF80',
        borderRadius: '0 0 40px 40px',
        textColor: '#000',
        backdropFilter: 'blur(10px)',
        filter: 'blur(2px)',
        otherProps: { textAlign: 'center', lineHeight: 1 },
      },
    });
    const atom = built.children[0]?.data;
    assert.equal(atom?.style.color, '#000');
    assert.equal(atom?.style.fontFamily, 'Inter');
    assert.equal(atom?.style.fontWeight, 500);
    assert.equal(atom?.style.fontSize, 20);
    assert.equal(atom?.style.letterSpacing, '10px');
    assert.equal(atom?.style.textTransform, 'uppercase');
    assert.equal(atom?.style.padding, '10px 40px');
    assert.equal(atom?.style.backgroundColor, '#FFFFFF80');
    assert.equal(atom?.style.borderRadius, '0 0 40px 40px');
    assert.equal(atom?.style.backdropFilter, 'blur(10px)');
    assert.equal(atom?.style.textAlign, 'center');
    assert.equal(atom?.style.lineHeight, 1);
    assert.equal(atom?.style.textColor, undefined);
    assert.equal(built.containerProps.style.filter, 'blur(2px)');
    assert.equal(built.containerProps.style.textAlign, 'center');
    assert.deepEqual(atom?.font, { family: 'Inter', weights: ['500'] });
  });

  it('folds saved font and textColor fields into the style object', () => {
    const migrated = migrateTextOverlayInputData({
      trackName: 'text-overlay',
      fontFamily: 'Inter:900:Italic',
      fontSize: 200,
      letterSpacing: 4,
      color: '#FFFFFF',
      opacity: 1,
      style: {
        textColor: '#000',
        textShadow: '0 1px 2px #000',
        otherProps: { textAlign: 'center', lineHeight: 1 },
      },
    });

    assert.equal('fontFamily' in migrated, false);
    assert.equal('fontSize' in migrated, false);
    assert.equal('letterSpacing' in migrated, false);
    assert.equal('color' in migrated, false);
    assert.equal('opacity' in migrated, false);
    assert.deepEqual(migrated.style, {
      fontFamily: 'Inter',
      fontWeight: 900,
      fontStyle: 'italic',
      fontSize: 200,
      letterSpacing: '4px',
      color: '#000',
      opacity: 1,
      textShadow: '0 1px 2px #000',
      textAlign: 'center',
      lineHeight: 1,
    });
  });
});
