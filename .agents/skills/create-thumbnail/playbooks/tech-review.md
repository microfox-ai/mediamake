# Tech review, gadgets

Channels read: @mkbhd, @Mrwhosetheboss, @LinusTechTips, @UnboxTherapy, @Dave2D
(`mm thumbs inspire tech-review @mkbhd @Mrwhosetheboss @LinusTechTips @UnboxTherapy @Dave2D`).

## What the hits share

- **The product is the hero** (21 of 40; a face leads only 8). On the misses a face leads 6 of 15:
  the host talking or pointing with no product in sight is the commonest miss.
- **Almost no words**: 26 of 40 have none (median 0, never more than 5). When there are words it is
  one or two in heavy sans caps, or a price (`$599`).
- **Held or floating**: a hand holding the thing toward the lens (15), or the product alone, lit,
  on a dark or white studio ground with a glowing edge (6).
- **No series badge on any of the 40.** A channel is recognised by how it frames the product.

## Archetypes for the board

1. **Hand-held product, host behind**: the device fills the front, eyes peek over it or the face
   is cropped or blurred behind (MKBHD, Unbox Therapy). No words.
2. **Product alone on a clean ground**: a studio-lit render or cutout on black, white or one
   gradient, a rim of light, nothing else (Dave2D).
3. **Giant word behind the product**: the product name or one claim huge, the device in front of
   it (Dave2D "STEAM", Unbox Therapy "FULL GYM").
4. **Price or number beside the product**: one figure the size of the device (MKBHD `$599`).
5. **Scale shot**: a tiny person beside a huge screen or in an empty room (Unbox Therapy).
6. **Host among many products**: a flat-lay or pile with the host grinning in the middle
   (Mrwhosetheboss); one-word plates when it is a comparison (REAL / FAKE).
7. **Split or versus**: two halves with a small labelled plate each (LTT "DLSS OFF / DLSS ON").
8. **Face reacts to one object**: a big face, the gadget, one word and an arrow (Mrwhosetheboss
   "SMUGGLED →"). The loudest option; keep it for a real twist.

## Type

Heavy grotesque sans, caps, white, at most a soft shadow or a tilt. A thin wide-tracked line over
a bold one is the calm alternative (Dave2D). Fonts: SKILL.md, "clean, tech".

## Colour and ground

Bright or studio-dark, never murky. One saturated accent, and it is usually **the product's own
colour** (an orange phone, a red arrow). Separation by a lit edge, shallow depth of field, or a
plain void.

## Title + thumbnail

The picture shows the thing; the title says what happened to it. Words on the thumbnail add the
twist the title does not have ("Testing North Korea's illegal smartphones" + SMUGGLED). 13 of the
14 hits with words complement the title; only 1 repeats it.

## Hits vs misses

Mostly the product: a new, famous or strange device wins in any layout. Visible misses: no product
(a talking head, a tweet card), a white ground with a generic laptop, two hosts and a prop.

## Build notes

- The product needs a clean cutout (`cutout --model=birefnet-general`) and room: frame it at 50–70 %
  of the frame height. Generated or stock product shots must be the real product when the video
  reviews a real one: use the user's own photos or frames.
- Ground: a `fill` with a radial gradient plus a `glow` on the cutout reads as a studio.
- A price is a `text` layer in the hero font, coloured with the accent, no plate.
