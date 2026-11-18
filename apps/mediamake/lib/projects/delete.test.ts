import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deleteRefusal, nameMatches, projectFileKeys, repoChoice } from './delete';

const PROJECT = '6742a1b2c3d4e5f601234567';
const OTHER = '6742a1b2c3d4e5f601234568';

describe('deleting a space', () => {
  it('takes the name as typed, give or take the spaces around it', () => {
    assert.equal(nameMatches(' Anime Music Zone ', 'Anime Music Zone'), true);
    assert.equal(nameMatches('anime music zone', 'Anime Music Zone'), false);
    assert.equal(nameMatches('', ''), false);
    assert.equal(nameMatches(undefined, 'Zone'), false);
  });

  it('is for the owner only, never a personal space, and needs the name', () => {
    const zone = { clientId: 'asha', displayName: 'Zone' };
    assert.equal(deleteRefusal(zone, 'asha', 'Zone', 'personal'), null);
    assert.equal(deleteRefusal(null, 'asha', 'Zone', 'personal')?.status, 404);
    assert.equal(deleteRefusal(zone, 'meera', 'Zone', 'personal')?.status, 403);
    assert.match(deleteRefusal(zone, 'asha', 'zone', 'personal')!.error, /Type the name of the space, Zone/);
    assert.deepEqual(deleteRefusal({ clientId: 'asha', personal: true, displayName: 'Personal' }, 'asha', 'Personal', 'personal'), { status: 400, error: 'personal' });
    assert.equal(deleteRefusal({ clientId: 'asha', personal: true, displayName: 'Personal' }, 'meera', 'Personal', 'personal')?.status, 404);
  });

  it('keeps the repo unless asked', () => {
    assert.deepEqual([repoChoice('delete'), repoChoice('keep'), repoChoice(undefined), repoChoice('yes')], ['delete', 'keep', 'keep', 'keep']);
  });

  it("names only the project's own stored files", () => {
    const cdn = 'https://cdn.mm.test';
    assert.deepEqual(
      projectFileKeys(PROJECT, [
        `${cdn}/mediamake/asha/projects/${PROJECT}/media/1-song.mp3`,
        `${cdn}/mediamake/meera/brand-kits/${PROJECT}/intros/1-intro%20six.mp4`,
        `${cdn}/mediamake/asha/projects/${PROJECT}/media/1-song.mp3`,
        `${cdn}/mediamake/asha/projects/${OTHER}/media/1-other.mp3`,
        `${cdn}/mediamake/asha/brand-kits/${OTHER}/logo.png`,
        `${cdn}/mediamake/asha/1-loose.png`,
        `${cdn}/elsewhere/projects/${PROJECT}/media/x.png`,
        `https://youtube.com/watch?v=${PROJECT}`,
        'not a link',
        undefined,
      ]),
      [`mediamake/asha/projects/${PROJECT}/media/1-song.mp3`, `mediamake/meera/brand-kits/${PROJECT}/intros/1-intro six.mp4`],
    );
    assert.deepEqual(projectFileKeys(PROJECT, [`https://s3.test/bucket/mediamake/a/projects/${PROJECT}/media/x.png`], 'bucket'), [`mediamake/a/projects/${PROJECT}/media/x.png`]);
    assert.deepEqual(projectFileKeys(PROJECT, [`${cdn}/mediamake/a/projects/${PROJECT}/media/%2E%2E/%2E%2E/x.png`]), []);
  });
});
