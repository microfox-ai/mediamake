"""Stem separation: work/mix.wav -> stems/{vocals,drums,bass,other}.wav (Demucs htdemucs_ft).

The fine-tuned 4-model Demucs bag gives much cleaner vocal and drum stems than
htdemucs, which matters for everything downstream: drum onsets, the beat grid and
the CTC alignment all run on stems, not on the mix.

Runs on the Apple GPU (MPS) when available, else CPU (a 4-minute song takes a few
minutes either way). Writes 44.1 kHz stereo float WAVs sample-aligned to work/mix.wav.

Run:  uv run python separate.py <slug> [--model htdemucs_ft] [--cpu]
"""
import common
import sys
import time

import numpy as np
import soundfile as sf
import torch
from demucs.apply import apply_model
from demucs.pretrained import get_model


def main():
    proj = common.project_from_argv()
    name = sys.argv[sys.argv.index("--model") + 1] if "--model" in sys.argv else "htdemucs_ft"
    device = "cpu" if "--cpu" in sys.argv or not torch.backends.mps.is_available() else "mps"
    mix, sr = proj.load_mix(sr=common.SR, mono=False)              # (2, n)
    model = get_model(name)
    model.eval()
    if model.samplerate != sr:
        sys.exit(f"{name} expects {model.samplerate} Hz")
    wav = torch.from_numpy(np.ascontiguousarray(mix))
    ref = wav.mean(0)
    mean, std = ref.mean(), ref.std() + 1e-8
    t0 = time.time()
    with torch.inference_mode():
        out = apply_model(model, ((wav - mean) / std)[None], device=device, shifts=1,
                          split=True, overlap=0.25, progress=True)[0]
    out = out * std + mean
    for src, y in zip(model.sources, out):
        sf.write(proj.stems / f"{src}.wav", y.T.cpu().numpy().astype(np.float32), sr, subtype="FLOAT")
    print(f"wrote {', '.join(model.sources)} to {proj.stems.relative_to(common.APP)} "
          f"({time.time() - t0:.0f} s on {device})")


if __name__ == "__main__":
    main()
