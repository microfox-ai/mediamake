---
'@microfox/mediamake-mcp': minor
---

The catalog tools speak the membership ladder (Public, Plus, Pro, Cohort, Admin; each tier opens everything below it). `catalog_set_stage` sets the lowest membership that opens an item (public, plus, pro, cohort or vault) and `catalog_items` filters by it and by readiness. `catalog_set_health` works for every kind and has `failed`, which needs its reason. New `catalog_set_readiness` marks items Ready with the finished productions that prove it, or back to Beta. `catalog_people` shows who holds each membership, how they got it and how long it lasts; `catalog_set_tier` gives Plus, Pro or Cohort with a source, a reference, a length or permanence; new `catalog_membership` makes one permanent, renews it for a new contribution or ends it. `catalog_invite` takes `tier` instead of `group`.
