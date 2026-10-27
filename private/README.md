# private/

Your unreleased MCPs and apps go in this folder. Everything here except this
README is gitignored, and a CI check fails any pull request that commits a file
under `private/`, so the content stays off the public repository.

Skills don't go here: every skill is public and committed in `.agents/skills/`
(see [SKILLS.md](../SKILLS.md)). Only apps and MCPs go through gated releases.

```
private/
  mcps/
    browse-hack.mcpb
    browse-hack.catalog.json   # optional: title, summary, tags, visibility, install (dependencies)
    browse-hack.INSTALL.md     # optional: item-specific setup the installer follows
  apps/
    <name>/
      catalog.json
      INSTALL.md
```

Release one (packs it, uploads it to private storage, registers it):

```bash
cd apps/mediamake
npm run catalog -- release ../../private/mcps/browse-hack.mcpb --stage private
```

Paths are read from where you run the command, so from the repo root you can
write `npm run catalog --prefix apps/mediamake -- release private/mcps/browse-hack.mcpb`.

See `apps/mediamake/docs/catalog-releases.md` for stages, grants and invites.
