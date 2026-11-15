import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { Entitlements } from '@/lib/access/rules';
import { staticRecord } from '@/lib/catalog/items';
import { MCP_CONNECTORS, connectorOfResource, mayUseConnector, type McpConnector } from './connectors';

function viewer(over: Partial<Entitlements> = {}): Entitlements {
  return { clientId: 'someone', isAdmin: false, groups: [], all: false, itemIds: new Set(), memberships: [], ...over };
}
const pro = viewer({ memberships: [{ membershipId: 'mem_x', clientId: 'someone', tier: 'pro', source: 'admin', grantedAt: '2026-11-01T00:00:00.000Z' }] });
const cohort = viewer({ memberships: [{ membershipId: 'mem_y', clientId: 'someone', tier: 'cohort', source: 'admin', grantedAt: '2026-11-01T00:00:00.000Z' }] });
const KINDS = Object.keys(MCP_CONNECTORS) as McpConnector[];

describe('the hosted connectors', () => {
  afterEach(() => {
    delete process.env.MEDIAMAKE_PUBLIC_RELEASES;
  });

  it('are each a catalog item the repo defines, at the address it installs from', () => {
    for (const kind of KINDS) {
      const { item, path, name, fallback } = MCP_CONNECTORS[kind];
      const record = staticRecord(item);
      assert.ok(record, `${item} is in lib/catalog/items.ts`);
      const source = record.install?.source;
      assert.ok(source?.type === 'mcp-server' && source.remote?.url.endsWith(path), `${item} installs from ${path}`);
      assert.equal(source.name, name);
      // the fallback is the repo's item, for when the catalog can't be read
      assert.deepEqual([fallback.tier, !!(fallback as { neverPublish?: boolean }).neverPublish], [record.tier, !!record.neverPublish], item);
    }
  });

  it('opens mm-use to every signed-in account, also while public releases are locked', () => {
    for (const releases of [undefined, 'open']) {
      if (releases) process.env.MEDIAMAKE_PUBLIC_RELEASES = releases;
      for (const who of [viewer(), pro, cohort, viewer({ isAdmin: true })]) assert.equal(mayUseConnector('use', who, staticRecord('mcp/mm-use')), true);
    }
    assert.equal(mayUseConnector('use', viewer(), null), true);
    assert.equal(mayUseConnector('use', viewer({ clientId: null }), null), false);
  });

  it('keeps mm-release and the old MCP for admins, and for a grant that names them', () => {
    for (const kind of ['release', 'legacy'] as const) {
      const item = staticRecord(MCP_CONNECTORS[kind].item);
      for (const who of [viewer(), pro, cohort, viewer({ all: true })]) {
        assert.equal(mayUseConnector(kind, who, item), false, kind);
        assert.equal(mayUseConnector(kind, who, null), false, kind);
      }
      assert.equal(mayUseConnector(kind, viewer({ isAdmin: true }), item), true);
      assert.equal(mayUseConnector(kind, viewer({ itemIds: new Set([MCP_CONNECTORS[kind].item]) }), item), true);
    }
    // a grant for one is not a grant for the other
    assert.equal(mayUseConnector('release', viewer({ itemIds: new Set(['mcp/mediamake']) }), null), false);
  });

  it('tells which connector a sign-in is for from the address the client names', () => {
    assert.equal(connectorOfResource('https://mediamake.microfox.app/mcp/use'), 'use');
    assert.equal(connectorOfResource('https://mediamake.microfox.app/mcp/release/'), 'release');
    assert.equal(connectorOfResource('https://mediamake.microfox.app/mcp'), 'legacy');
    assert.equal(connectorOfResource(undefined), null);
    assert.equal(connectorOfResource('https://mediamake.microfox.app/api'), null);
    assert.equal(connectorOfResource('not a url'), null);
  });
});
