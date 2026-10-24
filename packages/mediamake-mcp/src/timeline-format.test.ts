import { describe, expect, it } from 'vitest';
import {
  detectTimelineFormat,
  stripTimeline,
  summarizeTimeline,
} from './timeline-format';

const captions = Array.from({ length: 30 }, (_, i) => ({
  text: `line ${i}`,
  absoluteStart: i,
  absoluteEnd: i + 1,
}));

const flat = {
  id: 't1',
  projectId: 'p1',
  displayName: 'Old lyric video',
  configuration: {
    config: { fps: 30, width: 1080, height: 1920, duration: 20 },
  },
  defaultData: {
    references: [{ key: 'captions', type: 'captions', value: captions }],
  },
  presets: [
    {
      id: 'a',
      presetId: 'base-scene',
      presetType: 'full',
      presetInputData: { trackName: 'base-scene' },
    },
    {
      id: 'b',
      label: 'Words',
      presetId: 'sub-vertical-float',
      presetType: 'children',
      presetInputData: { inputCaptions: '{{captions}}' },
    },
    {
      id: 'c',
      presetId: 'text-overlay',
      presetType: 'children',
      presetInputData: { trackName: 'Title' },
      disabled: true,
    },
    {
      id: 'd',
      presetId: 'waveform',
      presetType: 'children',
      presetInfo: {
        metadata: { title: 'Waveform' },
        presetFunction: 'function x() {}',
        presetParams: {},
      },
      presetInputData: { trackName: 'Wave' },
    },
  ],
};

const tree = {
  ...flat,
  id: 't2',
  nodes: {
    id: '__virtual_root',
    presetId: '__virtual_root',
    name: 'root',
    role: 'scene',
    timing: { kind: 'autoRange' },
    input: {},
    children: [
      {
        id: 'a',
        presetId: 'base-scene',
        name: 'base-scene',
        role: 'scene',
        arrangement: 'aligned',
        timing: { kind: 'explicit', start: 0, duration: 20 },
        input: {},
        children: [
          {
            id: 'b',
            presetId: 'sub-vertical-float',
            name: 'Words',
            role: 'track',
            timing: { kind: 'hug', start: 0 },
            input: {},
            children: [],
          },
        ],
      },
    ],
  },
};

const legacy = {
  _id: 'l1',
  name: 'Legacy',
  presetData: {
    presets: [
      { presetId: 'waveform', presetType: 'full', presetInputData: {} },
    ],
    defaultData: { references: [] },
  },
};

describe('detectTimelineFormat', () => {
  it('tells the three formats apart', () => {
    expect(detectTimelineFormat(flat)).toBe('flat');
    expect(detectTimelineFormat(tree)).toBe('tree');
    expect(detectTimelineFormat(legacy)).toBe('legacy-preset-data');
    expect(detectTimelineFormat({ ...flat, nodes: null })).toBe('flat');
  });
});

describe('summarizeTimeline', () => {
  it('describes presets, references and warnings without the heavy data', () => {
    const s = summarizeTimeline(flat);
    expect(s.format).toBe('flat');
    expect(s.configuration).toEqual({
      fps: 30,
      width: 1080,
      height: 1920,
      duration: 20,
    });
    expect(s.references).toEqual([
      { key: 'captions', type: 'captions', value: 'array(30)' },
    ]);
    expect(s.presetCounts).toEqual({
      'base-scene': 1,
      'sub-vertical-float': 1,
      'text-overlay': 1,
      waveform: 1,
    });
    expect(s.presets[0].role).toBe('scene');
    expect(s.presets[1].trackName).toBe('Words');
    expect(s.presets[2].disabled).toBe(true);
    expect(s.presets[3].title).toBe('Waveform');
    expect(s.warnings.some(w => w.includes('text-overlay'))).toBe(true);
    expect(s.warnings.some(w => w.includes('legacy `label`'))).toBe(true);
    expect(JSON.stringify(s)).not.toContain('function x');
  });

  it('outlines the node tree and respects maxDepth', () => {
    const s = summarizeTimeline(tree);
    expect(s.format).toBe('tree');
    expect(s.tree!.children[0].arrangement).toBe('aligned');
    expect(s.tree!.children[0].children[0].presetId).toBe('sub-vertical-float');
    expect(summarizeTimeline(tree, { maxDepth: 0 }).tree!.children).toMatch(
      /1 children/,
    );
  });

  it('reads legacy presetData documents', () => {
    const s = summarizeTimeline(legacy);
    expect(s.format).toBe('legacy-preset-data');
    expect(s.displayName).toBe('Legacy');
    expect(s.presets).toHaveLength(1);
  });
});

describe('stripTimeline', () => {
  it('omits embedded preset code unless asked and truncates arrays', () => {
    const stripped = stripTimeline(flat, { maxArrayItems: 5 });
    expect(stripped.format).toBe('flat');
    expect(stripped.presets[3].presetInfo.presetFunction).toMatch(/omitted/);
    const refs = stripped.defaultData.references[0].value;
    expect(refs).toHaveLength(6);
    expect(refs[5]).toMatch(/25 more items/);

    const withCode = stripTimeline(flat, { includePresetCode: true });
    expect(withCode.presets[3].presetInfo.presetFunction).toBe(
      'function x() {}',
    );
  });
});
