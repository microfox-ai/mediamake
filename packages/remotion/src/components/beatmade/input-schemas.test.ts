import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { z } from 'zod';
import { ImageBeatInput } from './input-schemas';

describe('ImageBeatInput', () => {
  it('exposes audio, image, and style metas', () => {
    const json = JSON.stringify(z.toJSONSchema(ImageBeatInput));
    assert.match(json, /"src"/);
    assert.match(json, /"audio"/);
    assert.match(json, /"blockStyle":true/);
    assert.match(json, /"positionStyle":true/);
    assert.match(json, /"imageStyle":true/);
    assert.match(json, /"zoomIntensity"/);
    assert.match(json, /"originSpread"/);
  });
});
