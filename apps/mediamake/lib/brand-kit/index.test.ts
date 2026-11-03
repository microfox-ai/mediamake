import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBrandKitPatch, BrandKitError, planKitUpload, primaryLogo, summarizeBrandKit, type BrandKit } from './index';

const url = (path: string) => `https://cdn.test/kit/${path}`;
const asset = (path: string) => ({ path, url: url(path) });

/** A kit like Omkara Swar's: a backup wordmark sorts before the real logo. */
const kit = (): BrandKit =>
  applyBrandKitPatch(null, {
    name: 'Omkara Swar',
    assets: [
      asset('logo/backup/omkara-wordmark-rozha.svg'),
      asset('logo/omkara-logo.svg'),
      asset('logo/omkara-mark.png'),
      asset('logo/animated/omkara-logo.webm'),
      asset('youtube/profile-picture.png'),
    ],
  });

describe('main logo', () => {
  it('without a choice, picks a still logo that is not a spare version', () => {
    assert.equal(primaryLogo(kit()), url('logo/omkara-logo.svg'));
  });

  it('a chosen logo (by path or URL) is the one shown, on the project list too', () => {
    const byPath = applyBrandKitPatch(kit(), { logo: './logo/omkara-mark.png' });
    assert.equal(byPath.logo, 'logo/omkara-mark.png');
    assert.equal(primaryLogo(byPath), url('logo/omkara-mark.png'));
    assert.equal(summarizeBrandKit(byPath)?.logo, url('logo/omkara-mark.png'));

    const byUrl = applyBrandKitPatch(kit(), { logo: url('youtube/profile-picture.png') });
    assert.equal(byUrl.logo, 'youtube/profile-picture.png');
  });

  it('refuses a logo that is not an image in the kit', () => {
    assert.throws(() => applyBrandKitPatch(kit(), { logo: 'logo/missing.svg' }), BrandKitError);
    assert.throws(() => applyBrandKitPatch(kit(), { logo: 'logo/animated/omkara-logo.webm' }), BrandKitError);
  });

  it('may name a file uploaded in the same save', () => {
    const saved = applyBrandKitPatch(null, { assets: [asset('logo/new.svg')], logo: 'logo/new.svg' });
    assert.equal(saved.logo, 'logo/new.svg');
  });

  it('stays through other edits; null or removing its file goes back to the automatic pick', () => {
    const chosen = applyBrandKitPatch(kit(), { logo: 'logo/omkara-mark.png' });
    assert.equal(applyBrandKitPatch(chosen, { name: 'Omkara' }).logo, 'logo/omkara-mark.png');
    assert.equal(applyBrandKitPatch(chosen, { logo: null }).logo, undefined);
    const removed = applyBrandKitPatch(chosen, { removeAssets: ['logo/omkara-mark.png'] });
    assert.equal(removed.logo, undefined);
    assert.equal(primaryLogo(removed), url('logo/omkara-logo.svg'));
  });
});

describe('planKitUpload', () => {
  const file = (path: string, body = '') => ({ path, size: body.length || 10, readText: async () => body });

  it("reads brand.json's logo when that image is going up", async () => {
    const plan = await planKitUpload([
      file('brand.json', JSON.stringify({ name: 'Get into Zone', logo: 'logo/get-into-zone-fist.png' })),
      file('logo/get-into-zone-fist.png'),
    ]);
    assert.equal(plan.patch.logo, 'logo/get-into-zone-fist.png');
  });

  it("leaves brand.json's logo out (with a note) when its image isn't in the upload", async () => {
    const plan = await planKitUpload([file('brand.json', JSON.stringify({ logo: 'graphics/fist.png' })), file('graphics/fist.png'), file('logo/a.svg')]);
    assert.equal(plan.patch.logo, undefined);
    assert.ok(plan.skipped.some(s => s.path === 'graphics/fist.png' && /brand\.json's logo/.test(s.reason)));
  });
});
