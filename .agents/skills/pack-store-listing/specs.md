# Store specs (checked 2026-11-13 in both consoles; scripts/check-assets.py follows this file)

The stores change sizes now and then. When App Store Connect or Play Console refuses a file, read the
error, check the store's help page (App Store Connect Help → Screenshot specifications / App preview
specifications; Play Console Help → Add preview assets), and update this file and the checker.

## Apple App Store (App Store Connect)

| Asset | Spec | Needed |
| --- | --- | --- |
| iPhone 6.3" screenshots | **1206×2622** or 1179×2556 (or landscape). PNG or JPEG, RGB, **no transparency**. 1 to 10. | **Yes** for an iPhone app. App Store Connect's "iPhone with Dynamic Island (medium display)" slot takes only these sizes and uses them for every iPhone |
| iPhone 6.9" / 6.5" screenshots | 1320×2868, 1290×2796 or 1260×2736 / 1284×2778 or 1242×2688 | Optional: only through Media Manager, to give big iPhones their own set |
| iPhone Duo screenshots and previews | its own slot (new in 2026, iOS 27.1 SDK) | Optional; earns a "made for iPhone Duo" badge |
| iPad 13" screenshots | 2064×2752 or 2048×2732 | **Yes** if the app runs on iPad (`supportsTablet`), else none |
| App icon | 1024×1024 PNG, no alpha, square (Apple rounds it) | Comes from the build: nothing to upload |
| Product page header (iOS 27) | **5244×2950** or 3840×1646, PNG or video. Cropped per device: no text, focal point in the middle | Optional; it leads the product page |
| Search results asset (iOS 27) | **5244×2950**, 3840×2560 or 1920×1280 | Optional; replaces the first screenshots in search |
| App preview video | iPhone (the medium-display slot): **886×1920** (or 1920×886). iPad 13": 1200×1600. 15–30 s, at most 30 fps, H.264 or ProRes 422 HQ (.mov/.m4v/.mp4), **an audio track** (stereo AAC 256 kb/s, 44.1 or 48 kHz; silent is fine), up to 500 MB. Up to 3 per size | Optional. It autoplays muted before the screenshots |

**Previews must be the app itself** (App Review guideline 2.3.4): screen captures of the app, with
text overlays and narration allowed. No people holding the phone, no hands, no footage that isn't the
app. A framed or scaled-down capture on a brand background is fine; a slideshow of marketing stills
risks rejection. Pick the poster frame (the still before it plays) after upload.

| Text | Limit |
| --- | --- |
| Name | 30 characters |
| Subtitle | 30 |
| Promotional text | 170 (changes without a new version) |
| Description | 4000 |
| Keywords | 100 bytes, comma separated, no spaces after commas; leave out words in the name and subtitle |
| What's New | 4000 |

URLs: **Privacy Policy** (required, on the App Privacy page), **Support URL** (required: a page with a
way to reach you), Marketing URL (optional).

Age rating (2026): a 7-step questionnaire (features and capabilities, then content frequencies), a
calculated rating, and an optional override to 9+, 13+, 16+ or 18+. App Privacy: data types, then for
each its purposes, whether it's linked to the person, and whether it's used for tracking. The fields
and their answers: consoles.md. Forms: App Privacy (data types, linked to the person, tracking), age rating,
export compliance (`ITSAppUsesNonExemptEncryption`), App Review sign-in (a demo account and steps).
Sign in with Apple is required when another social sign-in is offered; in-app account deletion is
required when accounts can be made.

## Google Play (Play Console)

| Asset | Spec | Needed |
| --- | --- | --- |
| App icon | 512×512, 32-bit PNG **with alpha**, up to 1 MB. Full-bleed square: Play rounds the corners and adds the shadow | **Yes** |
| Feature graphic | 1024×500, JPEG or 24-bit PNG, **no alpha**. Keep the key content in the middle; a play button covers the centre when there's a promo video | **Yes** |
| Phone screenshots | 2 to 8, JPEG or 24-bit PNG, no alpha, each side 320–3840 px, the long side at most twice the short. **To be featured: 4 or more, 1080 px or more** (1080×1920 portrait) | **Yes** (2+) |
| 7" / 10" tablet screenshots | Up to 8 each, sides 320–3840 (7") / 1080–7680 (10") | Optional |
| Promo video | A YouTube link: public or unlisted, ads off, not age-restricted, embeddable. Landscape, 30 s to 2 min suggested | Optional. Plays over the feature graphic |

| Text | Limit |
| --- | --- |
| App name | 30 characters |
| Short description | 80 |
| Full description | 4000 |

The store listing's Review step asks for an **AI asset declaration** (label assets made or edited
with AI, or not) before it saves.

Required pages: a **privacy policy URL**, and an **account deletion URL** (a page saying how to delete
an account and its data without the app) when people can make accounts. Forms (App content): app
access (test sign-in for reviewers), ads, content rating, target audience, Data safety. A personal
developer account made after Nov 2023 needs a 14-day closed test with 12 testers before production;
an organisation account doesn't.

## What a store-listing folder holds (what check-assets.py reads)

```
ios/iphone-6.3/1-<screen>.png …   ios/iphone-6.9/… ios/iphone-6.5/… (optional)   ios/ipad-13/… (iPad apps)
ios/app-icon-1024.png             ios/app-preview.mp4
ios/creative/header-5244x2950.png ios/creative/search-3840x2560.png  (optional)
android/play-icon-512.png         android/feature-graphic.png
android/phone/1-<screen>.png …    android/tablet-7/… android/tablet-10/… (optional)
android/promo-video.mp4           (uploaded to YouTube; Play takes the link)
```
