"""
cutout: segment the subject of a thumbnail picture, locally and free (rembg + BiRefNet).

Writes a transparent PNG the same size as the source, so a `cutout` layer lines up exactly with
the `photo` layer it was cut from (both use the variant's `hero`). Keeps only the biggest
connected part (or the part under --point), so specks of background don't float around the subject.
A green-background preview goes next to it (<name>.check.jpg) to look at before using it.

Usage (from apps/lyrics_videos):
  uv run --with "rembg[cpu]" --with scipy --with pillow python thumbnails/tools/cutout.py <job> input/photo.jpg
    [--model=birefnet-portrait]   people (default birefnet-general; also isnet-anime for drawn art)
    [--point=0.5,0.4]             keep the part under this point (fractions of width, height)
    [--all]                       keep every part (groups, several objects)
  → thumbnails/jobs/<job>/cutouts/<name>.png and <name>.check.jpg
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = dict(a[2:].split("=", 1) if "=" in a else (a[2:], "1") for a in sys.argv[1:] if a.startswith("--"))
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)
    job, rel = args[0], args[1]
    job_dir = ROOT / "jobs" / job
    src = job_dir / rel
    img = Image.open(src).convert("RGB")
    model = flags.get("model", "birefnet-general")
    out = remove(img, session=new_session(model), post_process_mask=True)
    alpha = np.array(out.getchannel("A"))

    if "all" not in flags:
        labels, n = ndimage.label(alpha > 128)
        if n > 1:
            if "point" in flags:
                px, py = (float(v) for v in flags["point"].split(","))
                keep = labels[int(py * (alpha.shape[0] - 1)), int(px * (alpha.shape[1] - 1))]
            else:
                keep = 1 + int(np.argmax(ndimage.sum(np.ones_like(labels), labels, range(1, n + 1))))
            if keep:
                # grow the kept part a little so its soft edge survives
                mask = ndimage.binary_dilation(labels == keep, iterations=6)
                alpha = (alpha * mask).astype(np.uint8)

    rgba = np.dstack([np.array(img), alpha])
    dst = job_dir / "cutouts" / f"{Path(rel).stem}.png"
    dst.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, "RGBA").save(dst)

    check = Image.new("RGB", img.size, (0, 160, 60))
    check.paste(img, mask=Image.fromarray(alpha))
    check.thumbnail((960, 960))
    check.save(dst.with_suffix(".check.jpg"), quality=85)
    print(f"✔ {dst.relative_to(ROOT.parent)} ({model})")
    print(f"✔ {dst.with_suffix('.check.jpg').relative_to(ROOT.parent)}")


if __name__ == "__main__":
    main()
