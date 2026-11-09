"""Cut the subject out of a picture (rembg, isnet-anime for drawn art), for the type-behind-the-subject shots
(make-kinetictype). Called by `mm kinetictype cutout`.

  uv run --with "rembg[cpu]" --with scipy --with pillow python scripts/kinetictype/cutout.py \
      <in.png> <out.png> [--model=isnet-anime] [--all] [--size=2048]

Writes an RGBA PNG the same size as <in> (or resized to --size square, to match the plates) and a
check preview on green next to it (<out>.check.jpg). Without --all only the biggest part is kept.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = dict(a[2:].split("=", 1) if "=" in a else (a[2:], "1") for a in sys.argv[1:] if a.startswith("--"))
    src, dst = Path(args[0]), Path(args[1])
    img = Image.open(src).convert("RGB")
    if "size" in flags:
        s = int(flags["size"])
        img = img.resize((s, s), Image.LANCZOS)
    out = remove(img, session=new_session(flags.get("model", "isnet-anime")), post_process_mask=True)
    alpha = np.array(out.getchannel("A"))
    if "all" not in flags:
        labels, n = ndimage.label(alpha > 128)
        if n > 1:
            keep = 1 + int(np.argmax(ndimage.sum(np.ones_like(labels), labels, range(1, n + 1))))
            mask = ndimage.binary_dilation(labels == keep, iterations=3)
            alpha = np.where(mask, alpha, 0).astype(np.uint8)
    rgba = img.convert("RGBA")
    rgba.putalpha(Image.fromarray(alpha))
    dst.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(dst)
    check = Image.new("RGB", img.size, (0, 200, 60))
    check.paste(img, mask=Image.fromarray(alpha))
    check.thumbnail((700, 700))
    check.save(str(dst) + ".check.jpg", quality=80)
    print(dst, img.size, f"{(alpha > 128).mean():.0%} subject")


if __name__ == "__main__":
    main()
