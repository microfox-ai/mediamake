---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

In script.txt, humanize only this sentence with Phrasly and leave every other character of the script exactly as it is: "Deleting the commit doesn't fix it: a leaked key works until it's revoked or rotated." Phrasly needed at least 30 words, so it was sent with the next sentence as context; its 3 drafts are in drafts.json. Save the result as script-final.txt.

Input files: script.txt, drafts.json
