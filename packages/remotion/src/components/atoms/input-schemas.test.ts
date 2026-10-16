import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { z } from 'zod';
import {
  AudioAtomDataProps,
  HTMLBlockAtomInput,
  ImageAtomInput,
  ShapeAtomInput,
  TextAtomInput,
  VideoAtomDataProps,
} from './input-schemas';

describe('atom style sections', () => {
  it('marks text with textStyle and blockStyle, and the other visual atoms with blockStyle', () => {
    const text = JSON.stringify(z.toJSONSchema(TextAtomInput));
    assert.match(text, /"textStyle":true/);
    assert.match(text, /"blockStyle":true/);
    assert.match(text, /"positionStyle":true/);

    for (const schema of [VideoAtomDataProps, ImageAtomInput, HTMLBlockAtomInput, ShapeAtomInput]) {
      assert.match(JSON.stringify(z.toJSONSchema(schema)), /"blockStyle":true/);
    }

    assert.match(JSON.stringify(z.toJSONSchema(HTMLBlockAtomInput)), /"positionStyle":true/);
    assert.match(JSON.stringify(z.toJSONSchema(ImageAtomInput)), /"positionStyle":true/);

    const video = JSON.stringify(z.toJSONSchema(VideoAtomDataProps));
    assert.match(video, /"videoStyle":true/);
    const audio = JSON.stringify(z.toJSONSchema(AudioAtomDataProps));
    assert.match(audio, /"audioStyle":true/);
  });

  it('keeps blockStyle when a component extends an atom schema', () => {
    const extended = ImageAtomInput.extend({
      caption: z.string().optional(),
    });
    assert.match(JSON.stringify(z.toJSONSchema(extended)), /"blockStyle":true/);
  });
});