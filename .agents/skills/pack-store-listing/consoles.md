# Filling the store consoles (checked 2026-11-13, with Claude in Chrome)

Every field Google Play Console, YouTube Studio and App Store Connect ask for, in the order to fill
them, how each takes input, and who answers it. The app's answers live in its listing guide
(`STORE_LISTING.md`, step 7 of SKILL.md), so filling is copying, not deciding. Portal (TheMoonDevs)
was filled this way end to end on 2026-11-13; its guide is the worked example.

## Before starting

- **The right Chrome.** Claude in Chrome names connected profiles "Browser 1", "Browser 2". Open
  `myaccount.google.com` in each to see whose it is, and use the one signed in to the store
  accounts (`select_browser`). Close any tab you opened in the wrong one.
- **Order.** Play listing → YouTube (the promo) → Play's video link → App Store version page →
  App Information (name, subtitle, categories, age rating) → App Privacy.
- **The user's part.** Sign-ins and two-step codes; every password (the App Review demo account's
  too); declarations (Play's AI asset declaration, Apple's content rights, export compliance); and
  anything that publishes or submits (Apple's App Privacy Publish and Add for Review, Play's Send
  for review and releases). Say what's filled and ask before each Save.
- **Save before leaving a page in App Store Connect**: it drops unsaved edits on navigation. Play
  keeps a draft (Save as draft).
- **Uploads** go through `file_upload` on the page's file input, at most 10 MB per call (paths in
  the session's scratchpad work). An App Store preview over 10 MB: re-encode the same spec smaller
  (`-b:v 2.6M -maxrate 4M`: 26 s → 6 MB).
- **The extension can drop** mid-task ("not connected", no browsers listed). Unsaved forms survive
  in the open tabs: ask the user to reopen the Claude panel and reconnect, then check the fields
  are still there before going on.
- **Long scripts time out** after 45 s in `javascript_tool`: one dialog flow per call.

## Google Play Console

### Store listing (Grow users → Store presence → Store listings → Default, `…/store-listings/default/edit`)

Step 1, Assets:

| Field | Limit | How it takes input |
| --- | --- | --- |
| App name | 30 | `form_input` (the counter updates) |
| Short description | 80 | `form_input` |
| Full description | 4000 | `form_input` |
| App icon | 512×512 PNG/JPEG, ≤1 MB | the asset panel (below) |
| Feature graphic | 1024×500, ≤15 MB | the asset panel |
| Video | a YouTube URL | `form_input`: `https://www.youtube.com/watch?v=<id>` |
| Phone screenshots | 2–8, 9:16 or 16:9, ≤8 MB each | the asset panel |
| 7" / 10" tablet, Chromebook, Android XR | optional | the asset panel (marked "Required field" but the listing saves without them when there are phone screenshots) |

The asset panel: click the slot's **Add assets** first. It opens the library in that slot's mode,
with a hidden file input; `file_upload` to it drops the upload straight into the slot. An asset
uploaded in another slot's mode shows greyed ("too small"): reopen the panel from the right slot,
then click the asset (a real click: a script click doesn't select) and the panel's **Add**.

Screenshot order: several files uploaded at once land in the order they finish uploading. To set
the order, remove them from the slot (their `Remove <file>` buttons take a script click), reopen
the panel from the slot, click the assets in order 1…N, then **Add** once: Play keeps the click
order. Check with the slot's `Remove …` buttons, which list the files in slot order.

Step 2, Review: the **AI asset declaration** ("Don't label assets" / "Label assets as created or
edited using AI"; the user's call) and **Save**. The change then waits in Publishing overview for
Send for review.

### App content (Policy → App content)

Privacy policy URL, app access (the reviewers' test sign-in), ads, content rating questionnaire,
target audience, Data safety (with the account deletion URL), government apps, financial features,
health. Answer from the guide; the dashboard's "Set up your app" list shows what's left.

## YouTube Studio (the Play promo)

On the channel the user named (check the channel name in Studio's top bar):

1. **Upload videos** → `file_upload` the promo to the dialog's file input. It saves as private at once
   and shows its link (`youtu.be/<id>`).
2. **Title**: a contenteditable box: click, `cmd+a`, type. **Description**: no links until the channel
   has done YouTube's one-off verification (the box turns red); leave them out.
3. **Made for Kids**: No (required).
4. **Next** ×3 (Video elements, Checks) → **Visibility: Unlisted** → **Save**.
5. Ads must be off: an upload flow with no Monetization step means the channel isn't monetised.
   Embedding is on by default.

## App Store Connect

### The version page (Distribution → iOS App → "1.0 Prepare for Submission")

Product Page Information has two tabs:

- **Header and Search Results** (iOS 27 creative assets, optional but they lead the page):
  - **Header**: 1 asset, PNG or video (.mp4/.m4v/.mov), **5244×2950 or 3840×1646**. It's the top of the
    product page, behind the back and share buttons and above the icon, name and Get button, cropped
    per device and orientation. Keep text out and the focal point in the middle.
  - **Search Results**: 1 asset, **5244×2950, 3840×2560 or 1920×1280**. It's shown under the app's name
    in search instead of the first screenshots (on iPhone, cropped to about 16:9).
  - A single 5244×2950 image works for both (Apple calls it a universal asset). Apple's Photoshop and
    Pixelmator templates (the "Explore templates" link) hold the safe areas.
  - The assets are stored as soon as they upload: the page's Save stays grey.
  - **Preview** (top right of the box) shows the product page and the search results page on iPhone,
    iPhone Duo and iPad, portrait or landscape, light or dark. Its "App Store" picker (Product Page /
    Search Results Page) is a native `<select>`: set it by script (the value setter, then a `change`
    event). The iPad preview stays grey until the iPad 13" tab has screenshots.
  - Clicking near an uploaded thumbnail opens a full-screen lightbox: close it with its ×.
  - `file_upload` reads only this session's folders: copy the assets into the app's store-listing
    folder first.
- **App Previews and Screenshots**: device tabs **iPhone with Dynamic Island (medium display)**,
  **iPhone Duo** (new; optional, earns a badge), **iPad 13"**, **Apple Watch**. The medium-display
  slot is for **6.1"/6.3" iPhones: screenshots 1206×2622 or 1179×2556, previews 886×1920**, and
  Apple uses it for every iPhone size. One upload box takes up to 3 previews and 10 screenshots;
  files uploaded together keep their order. An info notice ("App Previews, Screenshots, and
  Localizations") opens after the first upload: OK.
- **iPad 13"** (only when the build supports iPad, `supportsTablet`): screenshots **2064×2752**
  (also 2048×2732 and landscape), previews 1200×1600. Apple uses the 13" set for every iPad. Open
  the tab first: the page has one media file input, and it uploads to the tab that's open. Its
  notice ("We'll use your 13" display … for all iPad display sizes") opens after the first upload: OK.
- A version that's **Waiting for Review** is locked: no uploads, and no + for a new version until
  it's released. To change its media, the user removes it from review (their call: it goes back
  to Prepare for Submission and keeps everything). A first version has no "What's New" field.

| Field | Limit | Input |
| --- | --- | --- |
| Promotional Text | 170 | `form_input` |
| Description | 4000 | `form_input` |
| Keywords | 100 bytes | `form_input` |
| Support URL, Marketing URL | | `form_input` |
| Version, Copyright | | `form_input` |
| Build | | **Add Build**: needs a build in TestFlight (`eas submit`) |
| App Review: Sign-in required, User name, **Password** (the user), contact First/Last name, Phone, Email, Notes (4000), Attachment | | `form_input`; the password is typed by the user |
| Version release | | Manual / Automatic after approval (the default) / Scheduled |

`form_input` works on this page: the **Save** button lighting up confirms the page took it.

### App Information

| Field | Input |
| --- | --- |
| Name (30), Subtitle (30) | **typed** (click, `cmd+a`, type): `form_input` is ignored here. Apple checks the name is free on Save |
| Category: Primary, Secondary | `<select>`: `form_input` with the option's text |
| Content Rights | a declaration: the user |
| Age Ratings → Set Up Age Ratings | a 7-step dialog (below); its radios take script clicks |

Age rating questionnaire (2026):

1. **Features**: In-App Controls (Parental Controls, Age Assurance) and Capabilities (Unrestricted Web
   Access, User-Generated Content, Social Media, Social Media Disabled for Users Under 13, Messaging
   and Chat, Advertising): yes / no (`true` / `false`).
2. **Mature Themes**: Profanity or Crude Humor, Horror/Fear Themes, Alcohol, Tobacco, or Drug Use or
   References: None / Infrequent / Frequent.
3. **Medical or Wellness**: Medical or Treatment Information (frequency), Health or Wellness Topics (yes / no).
4. **Sexuality or Nudity**: Mature or Suggestive Themes, Sexual Content or Nudity, Graphic Sexual
   Content and Nudity (frequency).
5. **Violence**: Cartoon or Fantasy, Realistic, Prolonged Graphic or Sadistic, Guns or Other Weapons (frequency).
6. **Chance-Based Activities**: Simulated Gambling, Contests (frequency); Gambling, Loot Boxes (yes / no).
7. **Additional Information**: the calculated rating, then Not Applicable / Made for Kids / **Override to
   Higher Age Rating** (9+, 13+, 16+, 18+) and an optional Age Suitability URL. **Save** in the
   dialog, then **Save** on the page.

### App Privacy

1. **Privacy Policy → Edit**: Privacy Policy URL (typed: click the field itself), optional User
   Privacy Choices URL, Save.
2. **Get Started**: "Do you or your third-party partners collect data from this app?" Yes / No.
3. **Data types** (35 checkboxes): Contact Info (Name, Email Address, Phone Number, Physical Address,
   Other User Contact Info), Health and Fitness, Financial Info (Payment, Credit, Other), Location
   (Precise, Coarse), Sensitive Info, Contacts, User Content (Emails or Text Messages, Photos or
   Videos, Audio Data, Gameplay Content, Customer Support, Other User Content), Browsing History,
   Search History, Identifiers (User ID, Device ID), Purchases, Usage Data (Product Interaction,
   Advertising Data, Other Usage Data), Diagnostics (Crash Data, Performance Data, Other Diagnostic
   Data), Surroundings (Environment Scanning), Body (Hands, Head), Other Data. In-app chat counts
   as Emails or Text Messages.
4. Each type's **Set Up**: purposes (Third-Party Advertising, Developer's Advertising or Marketing,
   Analytics, Product Personalization, App Functionality, Other Purposes) → linked to the user's
   identity? → two pages defining tracking → used for tracking? → Save.
5. **Publish** (the user): the label shows on the product page.

The page keeps hidden `[role=dialog]` elements: always pick the visible one.

## What a store-fill tool in Browse Hack would add

Claude in Chrome filled every field above. A Browse Hack tool (reading the answers from the guide)
would make it one step and remove the rough edges: the extension dropping mid-task, the 10 MB
upload cap, Play's asset panel needing real clicks and a re-order pass, and the App Store fields
that only take typing.
