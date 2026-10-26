#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11,<3.13"
# dependencies = ["numpy>=1.26", "pillow>=10.1", "torch>=2.4", "transformers>=4.45"]
# ///
"""DINOv2 image embeddings for segregate.py.

Reads image paths (one per line) from --list and writes an (n, d) float32 .npy of L2-normalized vectors to
--out. DINOv2 is used rather than CLIP because it matches what a place looks like (layout, textures,
props), not what it is about: two different kitchens stay apart, the same corridor from two angles
stays close.
"""
import argparse
import sys

import numpy as np
import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModel


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--model", default="facebook/dinov2-small")
    ap.add_argument("--batch", type=int, default=32)
    args = ap.parse_args()

    paths = [p for p in open(args.list).read().splitlines() if p]
    dev = "mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu"
    proc = AutoImageProcessor.from_pretrained(args.model)
    model = AutoModel.from_pretrained(args.model).to(dev).eval()

    # Keep the whole frame: resize to the video's aspect on a 14-px patch grid instead of a centre crop.
    w0, h0 = Image.open(paths[0]).size
    short = 224
    if w0 >= h0:
        size = {"height": short, "width": max(short, round(short * w0 / h0 / 14) * 14)}
    else:
        size = {"height": max(short, round(short * h0 / w0 / 14) * 14), "width": short}

    out = []
    for i in range(0, len(paths), args.batch):
        imgs = [Image.open(p).convert("RGB") for p in paths[i : i + args.batch]]
        inputs = proc(images=imgs, return_tensors="pt", do_center_crop=False, size=size).to(dev)
        with torch.inference_mode():
            res = model(**inputs)
        cls = torch.nn.functional.normalize(res.pooler_output.float(), dim=-1)
        patch = torch.nn.functional.normalize(res.last_hidden_state[:, 1:].float().mean(1), dim=-1)
        v = torch.nn.functional.normalize(torch.cat([cls, patch], dim=-1), dim=-1)
        out.append(v.cpu().numpy())
        print(f"  embedded {min(i + args.batch, len(paths))}/{len(paths)}", file=sys.stderr, flush=True)
    np.save(args.out, np.concatenate(out).astype(np.float32))


if __name__ == "__main__":
    main()
