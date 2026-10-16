import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { z } from 'zod';
import { CaptionSmearInput } from './input-schemas';

describe('CaptionSmearInput', () => {
  it('exposes typography/position style meta and smear settle fields', () => {
    const json = JSON.stringify(z.toJSONSchema(CaptionSmearInput));
    assert.match(json, /"textStyle":true/);
    assert.match(json, /"positionStyle":true/);
    assert.match(json, /"smearThreshold"/);
    assert.match(json, /"letterSpacingSettle"/);
    assert.match(json, /"Smear threshold"/);
  });
});
