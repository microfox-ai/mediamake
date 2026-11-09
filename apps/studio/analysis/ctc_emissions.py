"""Frame-wise CTC log-probabilities (20 ms frames) of the vocal stem.

Two acoustic models give two independent alignments:
  mms   : torchaudio MMS_FA (multilingual, romanized chars, trained for alignment)
  lv60k : torchaudio WAV2VEC2_ASR_LARGE_LV60K_960H (English chars)
Each runs on the vocal stem's mono sum and its left / right channel. Emissions are
computed on overlapping chunks with context, stitched, and cached as
work/emission_<model>[_<source>].npy  (shape [frames, vocab]).

Run:  uv run python ctc_emissions.py <slug> [vocals vocL vocR]
"""
import common
import sys

import numpy as np
import torch
import torchaudio

HOP = 320  # samples @16k -> 20 ms
SOURCES = ("vocals", "vocL", "vocR")


def compute(proj, name, source="vocals", chunk_s=20.0, ctx_s=3.0, device=None):
    bundle = {"mms": torchaudio.pipelines.MMS_FA,
              "lv60k": torchaudio.pipelines.WAV2VEC2_ASR_LARGE_LV60K_960H}[name]
    model = bundle.get_model(with_star=False) if name == "mms" else bundle.get_model()
    device = device or ("mps" if torch.backends.mps.is_available() else "cpu")
    model = model.to(device).eval()
    y, _ = proj.load_vocal_source(source, sr=16000)
    y = y / (np.abs(y).max() + 1e-9)
    n_frames = len(y) // HOP
    chunk, ctx = int(chunk_s * 16000), int(ctx_s * 16000)
    out = None
    for s in range(0, len(y), chunk):
        a, b = max(0, s - ctx), min(len(y), s + chunk + ctx)
        x = torch.from_numpy(np.ascontiguousarray(y[a:b])).float()[None].to(device)
        with torch.inference_mode():
            em, _ = model(x)
            em = torch.log_softmax(em, dim=-1)[0].float().cpu().numpy()
        if out is None:
            out = np.full((n_frames, em.shape[1]), np.nan, np.float32)
        f0 = a // HOP
        lo, hi = s // HOP, min(n_frames, (s + chunk) // HOP)
        seg = em[lo - f0: hi - f0]
        out[lo: lo + len(seg)] = seg
    last = np.where(~np.isnan(out[:, 0]))[0].max()
    out[last + 1:] = out[last]
    tag = name if source == "vocals" else f"{name}_{source}"
    np.save(proj.work / f"emission_{tag}.npy", out)
    print(f"emission_{tag}: {out.shape[0]} frames x {out.shape[1]} labels")
    return out


if __name__ == "__main__":
    proj = common.project_from_argv()
    srcs = [a for a in sys.argv[2:] if a in SOURCES] or list(SOURCES)
    for n in ("mms", "lv60k"):
        for src in srcs:
            compute(proj, n, source=src)
