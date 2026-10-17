# IMPROVISATION TO DO

Resolve composition duration without a browser, then let agents render directly.

## Why this is blocked today

AWS Lambda render was a 20 second video with the first group removed. That group is a lock scene locked to its child. Preview was correct.

The preview clock is taken in the browser, after media lengths are probed. `compile-store` stamps the tree a second time with those lengths. A scene locked to its child has no window until the child's length is known, so the earlier tree is still the default 20 second composition and the group is missing.

The render button now forwards that browser result (`calculatedMetadata`) instead of the pre-probe tree. Lambda then uses `config.duration` from those props. If that duration is missing, the registered `DataMotion` composition falls back to 20 seconds.

That fix only works when a browser has already compiled the timeline.

## What has to change

Duration must be resolved before a render is forwarded, and that resolution cannot depend on the editor.

Agents and future automation pipelines do not have a browser. They cannot open the player, wait for `calculateCompositionLayoutMetadata`, and then submit the probed props. A pipeline has to send timeline or composition data and render directly.

Headless resolution needs to cover:

- Probed media lengths for intrinsic tracks (the same lengths the browser fetches before the second stamp).
- Lock-to-child scene windows, including a group locked to its own child.
- The composition clock written onto `config.duration`, so Lambda does not fall back to 20 seconds.

Until that exists, any agent that posts the unprobed tree to the render API will drop unresolved lock groups and render the default duration.
