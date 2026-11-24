# Recipes

Step lists that were run and measured. Copy one into the job's folder (beside the session when there
is one; the two that start from a song file save none), replace the `<WORDS>`, run it with
`soundcraft-cli script`. Each says what to replace and how to check it in its first lines.

| Recipe | Makes | Starts from |
|---|---|---|
| `teaser.txt` | one part of a song at the start of a new session, faded in and out | a song file |
| `shorten.txt` | the song with one section taken out and the join crossfaded | a song file |
| `returns.txt` | a plate reverb and an echo on their own returns, with sends from one track | a session |
| `vocal-chain.txt` | high-pass and EQ, de-esser and compressor on one track | a session |

The bigger jobs are scripts, because they depend on what they are given:

| Script | Makes |
|---|---|
| `scripts/stems_session.py <stems folder> <out>.scraft` | a session from a folder of stems: a track each, drums, music and vocals on group buses with an aux each, a master, colours; the steps it ran saved beside it |
| `scripts/master_to.py <song or session> <out>.wav --lufs -9 --true-peak -1` | a master on a loudness target, or `--ladder -11,-10,-9,-8` for one file a step |

A step list has no variables: a value used twice is written twice, and an id comes from a first run
with `--inspect`. Keep the list you ran beside its session, so the build can be read and run again.
