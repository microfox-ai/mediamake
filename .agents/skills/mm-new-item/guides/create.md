# The guide for create- skills: images and artwork

MediaMake's standard for a skill that makes pictures: thumbnails, posters, covers, designs. Read
`general.md` first; this adds what is true for this kind.

**Kept by MediaMake's admins.** It changes only in a pull request, never in a session. A starter: it
holds what MediaMake's rules and its own create- skills already share, and admins add to it.

## Ask first

- Ask before building: what the picture is for, where it will be seen, its size, and what the user
  already has (a picture, a brand, a title).
- For a brand, read its kit first (the Spaces MCP's `get_brand_kit`): its logo, fonts and colours
  are not re-invented.

## Directions before finals

- Show a board of genuinely different ideas first, small and quick. The user picks.
- Develop only the picked ones into finished pictures, a few variants each.
- Every option carries an ID the user can say back ("B2"), so they pick in the chat.

## Review

- The review loop is `revise-image`: name it in `depends-on` and hand over to it. A skill does not
  write a review loop of its own.
- Make every set reviewable: write its `index.json` (`mediamake.image-set/v1`) so it opens in File
  Revisions.

## Making the pictures

- Search the media library before generating or downloading a picture.
- A generation that costs money shows the price and waits for the user's yes.
- Check the result against the rules of where it is going (a store's or a platform's sizes and
  limits) before showing it.

## Delivering

- The final goes to the user's folders only once they approve it (`mm media deliver`).
