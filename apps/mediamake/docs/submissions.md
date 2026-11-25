# Store submissions and earned memberships

How something a member built gets into the store, and how contributing earns a
membership. The rule is the one everything else follows: **we publish nothing
we don't use.**

## The path

1. **The member asks Claude to make it public.** The `mm-submit-to-store` skill
   finds the item in their space or workspace, runs the leak checks and sends
   it: `mm submit <name> --yes [--made="<production>" [--made-url=<link>]]`
   (`tools/submit.mjs`). A member below Cohort names the finished production
   made with it (the server refuses one without it, `productionNeeded`);
   Cohort members and admins may leave it out. Where there is no repo (Claude
   on the web or a phone), mm-use's `submit_item` takes the files instead.
2. **It arrives privately.** `POST /api/submissions` checks it again
   (`checkFiles` in `lib/submissions/submission.ts`: keys, tokens, paths on a
   computer) and keeps the record in MongoDB `submissions` and its files in
   `submission_files`. Admins and the sender see it, nobody else. The same item
   sent again before a decision replaces what was sent.
3. **An admin reviews it** on `/app/submissions`: what it does, the production
   (when one was named), the checks, every file. They pick the lowest
   membership that opens it (Public, Plus, Pro or Cohort) and approve, ask for
   changes or decline. The sender is mailed each time.

   **An admin's own item skips the review.** `mm submit <name> --yes
   --tier=<public|plus|pro|cohort>` sends `publish`: the route saves it like
   any submission, then the same admin approves it at once at that membership
   (`publishOwnSubmission` in `lib/submissions/actions.ts`), with no
   membership earned and no mail. What would stop an approval (a leak check, a
   version already released) leaves it waiting on `/app/submissions` and the
   answer says why. A member who sends `publish` is refused.

   **An update goes out directly too.** A new version of an item already in
   the store (at Public, Plus, Pro or Cohort, a Public skill in the repo
   included), sent by an admin or by a Cohort member who is one of its
   authors (below), is approved at once at the membership it has
   (`directUpdateTier`, `publishDirectly`): `mm submit <name> --yes`, no
   `--tier`. An author below Cohort sends it for review as before. Someone
   who is not an author cannot send another version of an item already
   accepted: its name is taken.
4. **Approving delivers it** (`lib/submissions/actions.ts`):

   | Item | Goes to | Live when |
   | --- | --- | --- |
   | A Public skill | A pull request on the public repo (`.agents/skills/<name>`, linked from `.claude/skills`), from branch `submission/<id>`, with the production under "Made with this" | An admin merges it (`feedback-shipped.yml` tells MediaMake) |
   | A Plus, Pro or Cohort skill, and every MCP and app at any tier | One commit on `main` of the private store repo, in `skills/`, `mcps/` or `apps/`, with a `catalog.json`; then its package in the catalog at that tier | At once |

   An MCP installs from a built `.mcpb`. When its folder has one at the top it
   is released with the approval. Without one its files still go to the store
   repo, and an admin builds and releases it from a checkout
   (`npm run catalog -- release <folder>/<name>.mcpb --tier <tier>`), then
   presses **I released it by hand** on the submission.
5. **A skill's listing comes from its package.** A Public skill's page reads
   its README.md from the repo. A Plus, Pro or Cohort skill is a package, so
   each release puts the README.md in its folder on the item's listing
   (`fillListingFromPackage` in `lib/submissions/package-listing.ts`), with
   nothing to set by hand:

   | From the package | Goes to |
   | --- | --- |
   | The README's frontmatter `description` (300 characters, cut at a word) | The listing's description |
   | `tags` (12 at most; the item's own are not kept again) | The listing's tags |
   | `headshot`: a picture in the folder (uploaded where a listing's pictures are kept, `catalog-thumbnails/<item>`), or an https link (taken only from an admin's release or approval: an author's own update takes a picture in the folder, never a link to somewhere else) | The listing's headshot |
   | The README's text, without its frontmatter. Each picture it shows from the folder (`![…](shots/a.png)`, 16 at most) is uploaded the same way and its link rewritten | The listing's README |
   | `type`, and a subset's `superset` | The skill's details (`skill_profiles`) |

   `nature` is only checked: a skill in the store is shared use, always.

   **What was set by hand stays.** A field is the package's until someone
   changes it. Each release writes down a fingerprint of what it put in each
   field (MongoDB `catalog_listing_marks`). The next release sets a field
   when it is empty, or when it still holds what the last release put there;
   a field that holds anything else (an admin's or an author's own words or
   picture, set on the item's page, Edit card or `catalog_set_listing`) is
   left as it is, for every later release. Clearing a field hands it back to
   the package: the next release fills it. A listing filled by hand before
   releases wrote anything down is all set by hand, so only its empty fields
   are filled. A release fills and refreshes, it never clears: a field the
   new README no longer names stays as it was.

   The answer says what happened: `listing` names what the listing took, and
   `notes` what was left because it was set by hand and what could not be
   taken (a headshot that is not in the package, a picture that could not be
   uploaded). `mm submit` prints both, and its dry run notes a skill with no
   README.md or a headshot that would not be sent. A listing that cannot be
   filled never undoes the release.

   An MCP's or an app's listing is not read from its package (its README.md is
   often its code's): it is set on its release page, as before. A package
   released from a checkout (`npm run catalog -- release`) sends no README
   either: set that listing on its page.
6. **It enters as Beta.** An admin marks it Ready later, on its release page,
   with the production (`catalog_set_readiness`).

## Authors

Every store item has authors, like the collaborators on a git repo
(`lib/catalog/authors.ts`, `lib/submissions/authors.ts`):

- **The first** is the sender of its first accepted submission, written down
  when it is approved (`settleAuthors`, either route). An item accepted
  before authors existed counts the sender of its first accepted submission
  until its authors are first changed.
- **An author or an admin adds or removes others** by their MediaMake
  account's email: `mm submit authors <name>` lists them,
  `--add=<email>` or `--remove=<email or the name the list shows>` changes
  them (a dry run, then `--yes`), through `GET`/`POST
  /api/submissions/authors`. The person needs a MediaMake account with that
  email. An item always keeps one author; one can remove themself while
  another remains.
- **What it gives**: any author may send a new version (for review), and a
  Cohort author's is published directly (above). Any author also edits the
  item's card (its description, headshot and icon), live at once: Edit card
  on its page, or mm-use's `set_item_listing` and `upload_item_picture`
  (`GET`/`POST /api/catalog/listing`). An author sets only a picture uploaded
  for that item, never a link to somewhere else. Admins can do all of it for
  every item.
- **Where an author finds them**: My store items in the app (`/app/my-items`,
  under Account) lists every store item the account is an author of
  (`itemsAuthoredBy`), each with Edit card, Authors (add by email, remove) and
  Send an update (the `mm submit` line to copy: a new version goes from the
  computer that has the files). Below them, what the account sent that is
  not in the store yet.
- **Where they show**: the item's page (`/skills`, `/mcps`, `/apps`) and its
  release page name each one by GitHub login (linked) when their account has
  GitHub linked, else by display name; never an email, and the API answers
  with names only. Only the item's authors and admins can read the list
  through the API.

They are kept in MongoDB `catalog_authors`, by item id, apart from the items:
a Public skill lives in the repo with no stored record.

Limits: 400 files, 1 MB a file, 3 MB in all, 10 submissions a day. Builds and
media stay out; media travels through the media library.

## What accepting earns

An accepted submission gives its sender a membership for **3 months**
(`grantContribution` in `lib/memberships/admin.ts`: one more record with
source `contribution` and the item as its `ref`).

| Accepted at | Earns, unless the admin picks another |
| --- | --- |
| Public | Plus |
| Plus | Plus |
| Pro | Pro |
| Cohort | Pro (the cohort is given by an admin, never earned) |

- **Contributing again renews it**: each accepted item adds a record with its
  own 3 months, and a person's tier is their highest live record.
- Nothing the person already holds ends, so a contribution never lowers anyone.
- **An admin can make it permanent**: Make permanent on Manage Memberships.
- An admin, and someone who already holds as much with no end date, gets no
  new record.

### Suggested grants

Manage Memberships has a **Suggested** tab: pull requests merged in the last 90
days on the public repositories by people whose MediaMake account has that
GitHub account linked, which no membership counts yet
(`lib/memberships/suggestions.ts`). **Grant Plus** gives Plus for 3 months with
the pull request as its `ref` (or renews it); **Dismiss** stops suggesting it.
Nothing is given until an admin confirms. Pull requests opened from a
submission are the store token's, so they are never counted twice.

## Setup

| Variable | What it is |
| --- | --- |
| `STORE_GITHUB_TOKEN` | A fine-grained GitHub token with **Contents** and **Pull requests** read and write on the public repo and the store repo. Without it approving is off (`FEEDBACK_GITHUB_TOKEN` is used when it is not set, if that one token has these permissions too). |
| `STORE_REPO` | The private store repo. Default `microfox-ai/mediamake-store`. It needs a first commit so it has a `main` branch. |
| `STORE_PUBLIC_REPO` | Where a Public skill's pull request opens. Default `microfox-ai/mediamake`. |
| `CONTRIBUTION_REPOS` | The repositories whose merged pull requests suggest a membership, comma separated. Default `microfox-ai/mediamake,microfox-ai/extensions`. |

A merged submission is marked live by the same report as shipped feedback
(`.github/workflows/feedback-shipped.yml`, which needs `FEEDBACK_HOOK_SECRET`).
Until that is set, the submission stays "Accepted" after its pull request
merges; nothing else depends on it.

## Where the code is

| What | Where |
| --- | --- |
| Rules, limits, checks, who earns what | `lib/submissions/submission.ts` |
| Pull request and store texts, `catalog.json`, the package | `lib/submissions/delivery.ts`, `tar.ts` |
| A released skill's listing from its package's README.md, and what stays when it was set by hand | `lib/submissions/package-listing.ts` (the rules), `listingStore` in `lib/submissions/actions.ts`, `listingMarksDB` in `lib/catalog/store.ts`, `putPublicUpload` in `lib/spaces-upload.ts` |
| GitHub calls | `lib/submissions/github.ts` |
| Send, approve, ask for changes, decline, withdraw, merged | `lib/submissions/actions.ts` |
| Authors: the rules, who they are, changing them | `lib/catalog/authors.ts`, `lib/submissions/authors.ts`, `app/api/submissions/authors` |
| An item's card (description, headshot, icon), set by its authors | `lib/catalog/author-listing.ts` (who may, what each request does), `lib/catalog/listing.ts` (`parseAuthorListing`, `withAuthorListing`), `app/api/catalog/listing`, `components/catalog/item-card-editor.tsx` |
| My store items | `app/app/(account)/my-items`, `components/my-items`, `itemsAuthoredBy` in `lib/submissions/authors.ts` |
| Member API, admin API | `app/api/submissions`, `app/api/admin/submissions` |
| The page | `components/submissions`, `app/app/(admin)/submissions` |
| Suggested grants | `lib/memberships/suggestions.ts`, `suggestions-store.ts`, `components/memberships/suggested.tsx` |
| The command, the skill, the mm-use tools | `tools/submit.mjs`, `.agents/skills/mm-submit-to-store`, `packages/mediamake-mcp/src/tools/use.ts` |

Tests: `npx tsx --test lib/submissions/submissions.test.ts lib/submissions/package-listing.test.ts lib/catalog/authors.test.ts lib/catalog/author-listing.test.ts`,
`node --test tools/submit.test.mjs`.
