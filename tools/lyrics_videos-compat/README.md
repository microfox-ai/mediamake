# lyrics_videos (old name)

`apps/lyrics_videos` is now `apps/studio`, and its scripts run with `mm` (`mm help`). This package
keeps the old commands working for a while: `npm run <script> -w lyrics_videos -- …` forwards to
`mm <command> …` and prints the new command. Released items that print the old form (Browse Hack's
Suno download message before MCP 0.15.1) keep working through it.

Remove it after 2027-01-15, together with the workspace entry it gets from `tools/*`.
