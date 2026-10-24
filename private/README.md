# private/

Your unreleased skills, MCPs and apps go in this folder. Everything here except
this README is gitignored, and a CI check fails any pull request that commits a
file under `private/`, so the content stays off the public repository.

```
private/
  skills/
    lyric-video/
      SKILL.md          # name, description and version in the front matter
      catalog.json      # optional: title, summary, tags, cover, visibility, listed
      references/...
  mcps/
  apps/
```

Release a folder (packs it, uploads it to private storage, registers it):

```bash
cd apps/mediamake
npm run catalog -- release ../../private/skills/lyric-video --stage private
```

Paths are read from where you run the command, so from the repo root you can
write `npm run catalog --prefix apps/mediamake -- release private/skills/lyric-video`.

See `apps/mediamake/docs/catalog-releases.md` for stages, grants and invites.
