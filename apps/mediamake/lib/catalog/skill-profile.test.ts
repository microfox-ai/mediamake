import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  needDependencies,
  parseProfileChange,
  readmeChecks,
  readmeProfile,
  readmeTemplate,
  registryDependencies,
  registrySkillFiles,
  skillDetailsView,
  spaceItemFiles,
  suggestedType,
  itemUsers,
  useDependencies,
} from './skill-profile';

describe('skillDetailsView', () => {
  it('a store skill is shared use, whatever was set', () => {
    const view = skillDetailsView({ key: 'catalog:skill/pack-brand-kit', profile: { nature: 'private-use', type: 'superset' }, tags: ['logo', 'pack'], ownTags: ['pack'] });
    assert.deepEqual(view, { nature: 'shared-use', natureFixed: true, type: 'superset', tags: ['logo'], ownTags: ['pack'] });
  });

  it('a private skill is private use until someone says otherwise', () => {
    assert.equal(skillDetailsView({ key: 'space:s1:skill/mine' }).nature, 'private-use');
    assert.equal(skillDetailsView({ key: 'space:s1:skill/mine', stated: { nature: 'shared-use' } }).nature, 'shared-use');
    const set = skillDetailsView({ key: 'space:s1:skill/mine', stated: { nature: 'shared-use', type: 'subset' }, profile: { nature: 'private-use', tags: ['anime'] }, suggested: 'internal' });
    assert.deepEqual(set, { nature: 'private-use', natureFixed: false, type: 'subset', tags: ['anime'], ownTags: [] });
  });

  it('suggests a type from what the registry knows', () => {
    assert.equal(suggestedType({ internal: true }, true), 'internal');
    assert.equal(suggestedType({ variantOf: 'make-x' }), 'subset');
    assert.equal(suggestedType({}, true), 'superset');
    assert.equal(suggestedType({}), undefined);
  });

  it('a subset names its superset: what was set, else its README, else what it was forked from', () => {
    const view = (input: object) => skillDetailsView({ key: 'catalog:skill/make-x-like-y', ...input }).superset;
    assert.equal(view({ suggested: 'subset', variantOf: 'make-x' }), 'make-x');
    assert.equal(view({ suggested: 'subset', variantOf: 'make-x', stated: { superset: 'make-z' } }), 'make-z');
    assert.equal(view({ profile: { type: 'subset', superset: 'make-w' }, variantOf: 'make-x' }), 'make-w');
    // only a subset has one
    assert.equal(view({ profile: { type: 'internal', superset: 'make-w' } }), undefined);
    assert.deepEqual(readmeProfile('---\ntype: subset\nsuperset: make-kinetictype\n---\n'), { type: 'subset', superset: 'make-kinetictype' });
  });

  it('reads nature and type from a README frontmatter', () => {
    assert.deepEqual(readmeProfile('---\ntags: a, b\nnature: shared-use\ntype: "mcp-use"\n---\n# T'), { nature: 'shared-use', type: 'mcp-use' });
    assert.deepEqual(readmeProfile('---\nnature: public\n---\n'), {});
    assert.deepEqual(readmeProfile('# No frontmatter\nnature: shared-use'), {});
  });
});

describe('parseProfileChange', () => {
  it('takes tags, nature and type', () => {
    assert.deepEqual(parseProfileChange({ key: 'space:personal:abc:skill/my-intro', tags: ['Lyric Video', 'lyric-video', '!!'], nature: 'shared-use', type: null }), {
      key: 'space:personal:abc:skill/my-intro',
      tags: ['lyric-video'],
      nature: 'shared-use',
      type: null,
      superset: null,
    });
  });

  it('refuses what is not a skill, a nature or a type', () => {
    assert.ok('error' in parseProfileChange({ key: 'catalog:mcp/browse-hack', type: 'internal' }));
    assert.ok('error' in parseProfileChange({ key: 'local:mine', type: 'internal' }));
    assert.ok('error' in parseProfileChange({ key: 'linked:abc', nature: 'public' }));
    assert.ok('error' in parseProfileChange({ key: 'linked:abc', type: 'huge' }));
    assert.ok('error' in parseProfileChange({ key: 'linked:abc' }));
    assert.ok('error' in parseProfileChange({ key: 'linked:abc', type: 'subset' }));
    assert.ok('error' in parseProfileChange({ key: 'linked:abc', type: 'subset', superset: 'Not A Name' }));
    assert.deepEqual(parseProfileChange({ key: 'linked:abc', type: 'subset', superset: 'make-kinetictype' }), { key: 'linked:abc', type: 'subset', superset: 'make-kinetictype' });
    assert.deepEqual(parseProfileChange({ key: 'linked:abc', type: 'superset', superset: 'make-kinetictype' }), { key: 'linked:abc', type: 'superset', superset: null });
    assert.ok('error' in parseProfileChange({ key: 'catalog:skill/x', nature: 'private-use' }));
    assert.ok('error' in parseProfileChange({ key: 'linked:abc', tags: Array.from({ length: 13 }, (_, i) => `tag-${i}`) }));
  });
});

describe('files', () => {
  it("lists a space item's own folder", () => {
    const code = { files: ['README.md', 'skills/my-intro/SKILL.md', 'skills/my-intro/engine/scene.tsx', 'skills/other/SKILL.md'], repoUrl: 'https://github.com/me/mediamake-space', branch: 'main' };
    assert.deepEqual(spaceItemFiles(code, 'skill', 'my-intro'), {
      roots: [{ label: 'my-intro', kind: 'skill', files: ['SKILL.md', 'engine/scene.tsx'], url: 'https://github.com/me/mediamake-space/blob/main/skills/my-intro' }],
    });
    assert.equal(spaceItemFiles(code, 'skill', 'gone'), null);
  });

  it("takes a linked item's whole repo", () => {
    const files = spaceItemFiles({ files: ['SKILL.md', 'README.md'], branch: 'main' }, 'skill', 'my-intro');
    assert.deepEqual(files, { roots: [{ label: 'my-intro', kind: 'skill', files: ['SKILL.md', 'README.md'] }] });
  });

  it("lists a registry skill's folder, then its engine and setup", () => {
    const files = registrySkillFiles(
      {
        name: 'make-amv',
        path: '.agents/skills/make-amv',
        paths: ['SKILL.md'],
        uses: [
          { kind: 'engine', label: 'src/amv', path: 'apps/studio/src/amv', files: ['index.ts'] },
          { kind: 'setup', label: 'scripts/amv.ts', path: 'apps/studio/scripts/amv.ts' },
        ],
      },
      'https://github.com/o/r',
    );
    assert.deepEqual(files?.roots, [
      { label: 'make-amv', kind: 'skill', files: ['SKILL.md'], url: 'https://github.com/o/r/blob/main/.agents/skills/make-amv' },
      { label: 'src/amv', kind: 'engine', files: ['index.ts'], url: 'https://github.com/o/r/blob/main/apps/studio/src/amv' },
      { label: 'scripts', kind: 'setup', files: ['amv.ts'], url: 'https://github.com/o/r/blob/main/apps/studio/scripts' },
    ]);
    assert.equal(registrySkillFiles({ name: 'x', path: 'p' }, 'https://github.com/o/r'), null);
  });
});

describe('dependencies', () => {
  it('puts required MCPs first, then the skills it runs', () => {
    const depends = registryDependencies(
      {
        mcps: [
          { id: 'mcp/fal', need: 'optional', for: 'Art', without: '' },
          { id: 'app/figcraft', need: 'recommended', for: 'Final edit', without: '' },
          { id: 'mcp/browse-hack', need: 'required', for: 'Research', without: '' },
        ],
        dependsOn: ['revise-video'],
      },
      name => `${name} summary`,
    );
    assert.deepEqual(
      depends.map(entry => `${entry.kind}/${entry.name}`),
      ['mcp/browse-hack', 'app/figcraft', 'mcp/fal', 'skill/revise-video'],
    );
    assert.equal(depends[3].note, 'revise-video summary');
  });

  it("reads a space item's MCPs and apps from what it needs", () => {
    assert.deepEqual(needDependencies(['render', 'key:elevenlabs', 'mcp:browse-hack', 'app:figcraft', 'mcp:browse-hack']), [
      { kind: 'mcp', name: 'browse-hack' },
      { kind: 'app', name: 'figcraft' },
    ]);
    assert.deepEqual(needDependencies(undefined), []);
  });
});

describe('readmeChecks', () => {
  const full = readmeTemplate('Pack brand kit');

  it('passes the template', () => {
    const checks = readmeChecks(full, 'shared-use', true);
    assert.deepEqual(
      checks.map(check => [check.id, check.ok, check.required]),
      [
        ['title', true, true],
        ['what', true, true],
        ['picture', true, false],
        ['how', true, true],
        ['uses', true, true],
        ['outputs', true, true],
      ],
    );
  });

  it('wants the outputs last, with an example', () => {
    const outputs = (markdown: string) => readmeChecks(markdown, 'shared-use').find(check => check.id === 'outputs')!.ok;
    assert.equal(outputs('# T\n\nWhat.\n\n## What the skill outputs\n\nA video.\n\n## How to use\n\n1. Go'), false);
    assert.equal(outputs('# T\n\nWhat.\n\n## How to use\n\n1. Go\n\n## What the skill outputs\n\nA video.'), false);
    assert.equal(outputs('# T\n\nWhat.\n\n## How to use\n\n1. Go\n\n## What the skill outputs\n\nA video: https://youtu.be/dQw4w9WgXcQ'), true);
  });

  it('asks nothing of a private-use skill, and nothing about uses of one that depends on nothing', () => {
    const checks = readmeChecks(null, 'private-use');
    assert.deepEqual(checks.map(check => check.id), ['title', 'what', 'picture', 'how', 'outputs']);
    assert.ok(checks.every(check => !check.ok && !check.required));
  });

  it('suggests a picture that explains it, never a video', () => {
    const picture = (markdown: string) => readmeChecks(markdown, 'shared-use').find(check => check.id === 'picture')!;
    assert.equal(picture('# T\n\nWhat.\n\n## How to use\n').ok, false);
    assert.equal(picture('# T\n\nWhat.\n\n## How to use\n').required, false);
    assert.equal(picture('---\nheadshot: headshot.jpg\n---\n\n# T\n\nWhat.\n').ok, true);
    assert.equal(picture('# T\n\nWhat.\n\n![How it works](shots/how.png)\n\n## How to use\n').ok, true);
    // an example under the outputs is not the picture that explains it
    assert.equal(picture('# T\n\nWhat.\n\n## What the skill outputs\n\n![One](a.png)\n').ok, false);
    assert.ok(readmeChecks(null, 'shared-use').every(check => !/video/i.test(check.label)));
  });

  it('does not take a video link for what the skill is', () => {
    assert.equal(readmeChecks('https://youtu.be/dQw4w9WgXcQ\n\n# T\n\n## How to use\n', 'shared-use').find(check => check.id === 'what')!.ok, false);
  });
});

describe('itemUsers', () => {
  const skills = [
    { name: 'make-lyrics-video', summary: 'Lyric videos', mcps: [{ id: 'mcp/elevenlabs', need: 'required' as const, for: 'Timed words', without: 'No words' }], dependsOn: ['revise-video'] },
    { name: 'revise-video', summary: 'Review rounds' },
  ];

  it('lists what uses an MCP: the skills that name it, then the catalog items that work with it', () => {
    const users = itemUsers('mcp/elevenlabs', [{ id: 'app/studio', uses: [{ id: 'mcp/elevenlabs', need: 'optional', for: 'Voice takes' }] }, { id: 'skill/make-lyrics-video', uses: [{ id: 'mcp/elevenlabs', need: 'required', for: 'again' }] }], skills);
    assert.deepEqual(users, [
      { kind: 'skill', name: 'make-lyrics-video', need: 'required', note: 'Timed words' },
      { kind: 'app', name: 'studio', need: 'optional', note: 'Voice takes' },
    ]);
  });

  it('lists the skills that run a skill as a step, and never the item itself', () => {
    assert.deepEqual(itemUsers('skill/revise-video', [{ id: 'skill/revise-video', uses: [{ id: 'skill/revise-video' }] }], skills), [{ kind: 'skill', name: 'make-lyrics-video', note: 'Lyric videos' }]);
    assert.deepEqual(itemUsers('mcp/nobody', [], skills), []);
  });

  it("reads an MCP's or an app's dependencies from what it works with", () => {
    assert.deepEqual(useDependencies([{ id: 'mcp/figcraft', need: 'required', for: 'Editable layers' }, { id: 'tutorial/x' }]), [{ kind: 'mcp', name: 'figcraft', need: 'required', note: 'Editable layers' }]);
    assert.deepEqual(useDependencies(undefined), []);
  });
});
