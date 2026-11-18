import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hasLaunchVideo, launchVideoGaps, launchVideoPromptFor, type LaunchVideoFacts } from './launch-video';

const facts = (extra: Partial<LaunchVideoFacts> = {}): LaunchVideoFacts => ({
  id: 'skill/pack-brand-kit',
  kind: 'skill',
  title: 'Pack Brand Kit',
  about: 'Builds a brand kit\nfrom a logo.',
  version: '1.4.0',
  tier: 'public',
  readiness: 'ready',
  proof: [{ title: 'The Microfox brand kit', url: 'https://example.com/microfox' }, { title: 'Cook with Claude kit' }],
  installable: true,
  site: 'https://mediamake.microfox.app',
  asOf: '16 Nov 2026',
  ...extra,
});

describe('hasLaunchVideo', () => {
  it('is for skills, MCPs and apps, not for videos', () => {
    assert.deepEqual(['skill', 'mcp', 'app', 'tutorial', 'course'].map(kind => hasLaunchVideo(kind as LaunchVideoFacts['kind'])), [true, true, true, false, false]);
  });
});

describe('launchVideoPromptFor', () => {
  it('names the skill, the item and its facts', () => {
    const prompt = launchVideoPromptFor(facts({ code: 'https://github.com/microfox-ai/mediamake/tree/HEAD/.agents/skills/pack-brand-kit' }));
    assert.match(prompt, /^Make the Cook with Claude launch video for Pack Brand Kit \(skill\/pack-brand-kit, v1\.4\.0\) with the make-cwc-tutorial skill\./);
    assert.match(prompt, /catalog on 16 Nov 2026/);
    assert.match(prompt, /in the Cook with Claude project's space, so run mm space sync, or mm space join "Cook with Claude"/);
    assert.match(prompt, /- What it is: Builds a brand kit from a logo\./);
    assert.match(prompt, /- Who can open it: Public \(everyone\)/);
    assert.match(prompt, /- Readiness: Ready\n/);
    assert.match(prompt, /- Its first prompt: \/pack-brand-kit /);
    assert.match(prompt, /- Code: https:\/\/github\.com\/microfox-ai\/mediamake\/tree/);
    assert.match(prompt, /- Its page for viewers: https:\/\/mediamake\.microfox\.app\/skills\/pack-brand-kit\n/);
  });

  it("leaves a skill's trigger phrases out of what it is", () => {
    const prompt = launchVideoPromptFor(facts({ about: 'Builds a brand kit from a logo. Use when the user says "make a brand kit". New user feedback goes in your notes.' }));
    assert.match(prompt, /- What it is: Builds a brand kit from a logo\.\n/);
    assert.match(prompt, /Catalog id: skill\/pack-brand-kit \(a skill, v1\.4\.0\)/);
    assert.match(launchVideoPromptFor(facts({ id: 'mcp/x', kind: 'mcp' })), /\(an MCP, v1\.4\.0\)/);
  });

  it('shows the plain install prompt, with no code in it', () => {
    const prompt = launchVideoPromptFor(facts());
    assert.match(prompt, /Install prompt to show \(for a computer without MediaMake\): Set up skill\/pack-brand-kit from MediaMake/);
    assert.doesNotMatch(prompt, /install code/);
  });

  it("links an MCP's own page for viewers", () => {
    const prompt = launchVideoPromptFor(facts({ id: 'mcp/browse-hack', kind: 'mcp' }));
    assert.match(prompt, /- Its page for viewers: https:\/\/mediamake\.microfox\.app\/mcps\/browse-hack\n/);
  });

  it('lists what was made with it, and asks when nothing is on record', () => {
    const made = launchVideoPromptFor(facts());
    assert.match(made, /- The Microfox brand kit: https:\/\/example\.com\/microfox\n- Cook with Claude kit\n- Ask me which of these are public/);
    const none = launchVideoPromptFor(facts({ proof: [], readiness: 'beta' }));
    assert.match(none, /Nothing is on record\. Ask me which finished productions/);
    assert.match(none, /Never use a test render or a demo/);
    assert.match(none, /Readiness: Beta \(not marked Ready yet/);
  });

  it('says how the finished video becomes the intro', () => {
    const prompt = launchVideoPromptFor(facts());
    assert.match(prompt, /catalog_set_video: item skill\/pack-brand-kit, url the YouTube link/);
    assert.match(prompt, /paste under "Intro video" on https:\/\/mediamake\.microfox\.app\/app\/releases\/skill\/pack-brand-kit\.\n- Then give me that page's link\.$/);
    assert.doesNotMatch(prompt, /It has an intro now/);
    const again = launchVideoPromptFor(facts({ video: { title: 'Ep. 1', youtubeId: 'dQw4w9WgXcQ' } }));
    assert.match(again, /It has an intro now \(Ep\. 1, https:\/\/www\.youtube\.com\/watch\?v=dQw4w9WgXcQ\)\. The new video replaces it only after I say so\./);
  });

  it('carries what an MCP works inside, and holds back a hidden item', () => {
    const prompt = launchVideoPromptFor(
      facts({
        id: 'mcp/browse-hack',
        kind: 'mcp',
        title: 'Browse Hack',
        tier: 'cohort',
        uses: [{ id: 'mcp/elevenlabs', title: 'ElevenLabs', need: 'optional', for: 'voices' }],
        usedBy: [{ id: 'skill/pack-youtube', title: 'Pack YouTube' }],
      }),
    );
    assert.doesNotMatch(prompt, /Its first prompt/);
    assert.match(prompt, /Works with\n- ElevenLabs \(mcp\/elevenlabs\), optional: voices/);
    assert.match(prompt, /Used by \(an episode about an MCP shows it at work inside these\)\n- Pack YouTube \(skill\/pack-youtube\)/);
    assert.match(prompt, /It is not public\. Ask me before uploading/);
  });

  it('sets itself up with the sign-in, and shows members the signed-in install', () => {
    const prompt = launchVideoPromptFor(facts({ id: 'mcp/browse-hack', kind: 'mcp', tier: 'pro' }));
    assert.match(prompt, /mm update, then mm items install --yes \(mm login first/);
    assert.match(prompt, /Don't ask me for a site address or an install prompt\./);
    assert.match(prompt, /mm items install mcp\/browse-hack --yes \(show this way in for members, since it is not open to everyone\)/);
  });

  it('lists open known issues and keeps feedback out', () => {
    const prompt = launchVideoPromptFor(facts({ knownIssues: ['Intros render without sound on Windows'] }));
    assert.match(prompt, /Known issues open now[^\n]*\n- Intros render without sound on Windows/);
    assert.match(prompt, /feedback on \/app\/feedback is private: never quote it/);
    assert.doesNotMatch(launchVideoPromptFor(facts()), /Known issues open now/);
    assert.match(launchVideoGaps(facts({ knownIssues: ['a'] }))[0], /1 open known issue\./);
  });

  it('says so when there is nothing to install', () => {
    assert.match(launchVideoPromptFor(facts({ id: 'app/library', kind: 'app', installable: false })), /Nothing to install: it opens as a page/);
  });
});

describe('launchVideoGaps', () => {
  it('is empty for a Ready, public, installable item with its proof', () => {
    assert.deepEqual(launchVideoGaps(facts()), []);
  });

  it('names each thing the prompt lacks', () => {
    const gaps = launchVideoGaps(facts({ proof: undefined, readiness: 'beta', tier: 'admin', installable: false }));
    assert.equal(gaps.length, 4);
    assert.match(gaps[0], /No finished production/);
    assert.match(gaps[2], /the vault/);
  });
});
