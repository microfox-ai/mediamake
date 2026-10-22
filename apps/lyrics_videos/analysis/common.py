"""Shared paths, project lookup and audio/lyrics loading for the analysis scripts.

Import this module FIRST (before torch / huggingface / mlx imports) so that every
model download lands in analysis/.cache/ (gitignored, delete it to reclaim ~4 GB).

Every script takes a project slug: projects/<slug>/input/ is read (never written),
and everything produced goes to projects/<slug>/analysis/:

  analysis/
    work/mix.wav        the reference decode of the song (44.1 kHz stereo float)
    stems/*.wav         Demucs stems, sample-aligned with work/mix.wav
    work/*.npy|json     intermediates (CTC emissions, whisper, vocal features)
    qa/*.png            plots for checking the results by eye
    audio.json          beat grid, downbeats, sections, envelopes, onsets
    lyrics.aligned.json word-level timings from the CTC forced alignment
    config.json         optional per-project overrides (see README)

Time reference: the same file the video plays (input/project.json "audio", else the
first audio file in input/, the rule scripts/prepare.ts uses), decoded once with
ffmpeg. Stems are separated from that decode, so stems, analysis and the video share
one timeline and no encoder-delay offset is needed (pdoom-video had to correct 23 ms
for an mp3 decoded two different ways).
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent            # apps/lyrics_videos/analysis
APP = ROOT.parent                                 # apps/lyrics_videos
PROJECTS = APP / "projects"
CACHE = ROOT / ".cache"
for var, sub in [("TORCH_HOME", "torch"), ("HF_HOME", "hf"), ("HF_HUB_CACHE", "hf/hub"),
                 ("XDG_CACHE_HOME", "xdg"), ("HUGGINGFACE_HUB_CACHE", "hf/hub"),
                 ("MPLCONFIGDIR", "mpl"), ("NUMBA_CACHE_DIR", "numba")]:
    os.environ.setdefault(var, str(CACHE / sub))
    (CACHE / sub).mkdir(parents=True, exist_ok=True)
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")
try:  # python.org builds ship without a CA bundle; model downloads need one
    import certifi
    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
except ImportError:
    pass

AUDIO_EXT = re.compile(r"\.(mp3|wav|m4a|aac|ogg|flac|webm)$", re.I)
SR = 44100


class Project:
    def __init__(self, slug: str):
        self.slug = slug
        self.dir = PROJECTS / slug
        self.input = self.dir / "input"
        if not self.input.is_dir():
            sys.exit(f"Missing {self.input.relative_to(APP)}/")
        self.out = self.dir / "analysis"
        self.work = self.out / "work"
        self.stems = self.out / "stems"
        self.qa = self.out / "qa"
        for d in (self.out, self.work, self.stems, self.qa):
            d.mkdir(parents=True, exist_ok=True)

    # -- inputs ----------------------------------------------------------------
    def project_json(self) -> dict:
        p = self.input / "project.json"
        return json.loads(p.read_text()) if p.exists() else {}

    def config(self) -> dict:
        """analysis/config.json: optional overrides (tempo range, downbeat phase, ...)."""
        p = self.out / "config.json"
        return json.loads(p.read_text()) if p.exists() else {}

    def audio_file(self) -> Path:
        name = self.project_json().get("audio")
        if not name:
            files = sorted(str(p.relative_to(self.input)) for p in self.input.rglob("*")
                           if p.is_file() and not p.name.startswith("."))
            name = next((f for f in files if AUDIO_EXT.search(f)), None)
        if not name or not (self.input / name).exists():
            sys.exit("No song found in input/ (mp3, wav, m4a, ...). A song is required.")
        return self.input / name

    def lyrics(self) -> list[dict]:
        """input/lyrics.json in any format prepare.ts accepts -> [{text, start, end, words}]."""
        p = self.input / "lyrics.json"
        if not p.exists():
            sys.exit("No input/lyrics.json. A timed transcription of the song is required.")
        raw = json.loads(p.read_text())
        if isinstance(raw, dict):
            raw = raw.get("lines") or raw.get("captions") or []
        out = []
        for i, l in enumerate(raw):
            start = l.get("absoluteStart", l.get("start"))
            end = l.get("absoluteEnd", l.get("end"))
            words = [dict(text=w["text"], start=w.get("absoluteStart", w.get("start")),
                          end=w.get("absoluteEnd", w.get("end"))) for w in l.get("words") or []]
            out.append(dict(i=i, text=l["text"].strip(), start=start, end=end, words=words))
        out.sort(key=lambda l: l["start"])
        return out

    # -- audio -----------------------------------------------------------------
    @property
    def mix_wav(self) -> Path:
        return self.work / "mix.wav"

    def ensure_mix(self) -> Path:
        """Decode the song once (ffmpeg, 44.1 kHz stereo float) as the shared time reference."""
        src = self.audio_file()
        if not self.mix_wav.exists() or self.mix_wav.stat().st_mtime < src.stat().st_mtime:
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ac", "2", "-ar", str(SR),
                            "-c:a", "pcm_f32le", str(self.mix_wav)], check=True)
        return self.mix_wav

    def load_mix(self, sr=SR, mono=True):
        import soundfile as sf
        y, s = sf.read(self.ensure_mix(), dtype="float32", always_2d=True)
        y = y.mean(axis=1) if mono else y.T
        return _resample(y, s, sr, mono), sr or s

    def load_stem(self, name, sr=None, mono=True):
        import soundfile as sf
        p = self.stems / f"{name}.wav"
        if not p.exists():
            sys.exit(f"Missing stem {p.relative_to(APP)}. Run: uv run python separate.py {self.slug}")
        y, s = sf.read(p, dtype="float32", always_2d=True)
        y = y.mean(axis=1) if mono else y.T
        return _resample(y, s, sr, mono), sr or s

    def load_vocal_source(self, name, sr=None):
        """'vocals' = Demucs vocal stem (mono sum); 'vocL' / 'vocR' = one channel of it
        (double-tracked parts are often panned, so one channel is closer to one voice)."""
        if name in ("vocL", "vocR"):
            y, s = self.load_stem("vocals", sr=sr, mono=False)
            return y[0 if name == "vocL" else 1], s
        return self.load_stem("vocals", sr=sr)


def _resample(y, s, sr, mono):
    if not sr or sr == s:
        return y
    import numpy as np
    import soxr
    return soxr.resample(y, s, sr) if mono else np.stack([soxr.resample(c, s, sr) for c in y])


def project_from_argv() -> Project:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit(f"Usage: uv run python {Path(sys.argv[0]).name} <slug> [options]")
    return Project(args[0])


def write_json(path: Path, doc, compact=False):
    path.write_text(json.dumps(doc, separators=(",", ":")) if compact
                    else json.dumps(doc, indent=1, ensure_ascii=False))
