"""QA plots: vocal spectrogram + pitch + envelopes with word boundaries of several
alignments, on the song's beat grid (analysis/audio.json when it exists)."""
import json

import common
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import librosa

_cache = {}
COLORS = ["tab:red", "tab:blue", "tab:green", "tab:purple", "tab:orange", "k"]


def _vocal(proj):
    if _cache.get("slug") != proj.slug:
        _cache["y"], _cache["sr"] = proj.load_stem("vocals", sr=16000)
        _cache["f"] = dict(np.load(proj.work / "vocal_feats.npz"))
        a = proj.out / "audio.json"
        _cache["beats"] = np.array(json.loads(a.read_text())["beats"]) if a.exists() else np.array([])
        _cache["slug"] = proj.slug
    return _cache["y"], _cache["sr"], _cache["f"], _cache["beats"]


def eighths(beats, t0, t1):
    """(time, is_beat) for every 8th note of the grid inside [t0, t1]."""
    out = []
    for a, b in zip(beats[:-1], beats[1:]):
        for t, on in ((a, True), ((a + b) / 2, False)):
            if t0 <= t <= t1:
                out.append((t, on))
    return out


def plot(proj, t0, t1, tracks, out, title="", marks=None):
    """tracks: list of (name, [(label, start, end), ...])."""
    y, sr, f, beats = _vocal(proj)
    t0 = max(0.0, t0)
    t1 = min(t1, len(y) / sr - 0.01)
    a, b = int(t0 * sr), int(t1 * sr)
    hop = 80  # 5 ms
    S = librosa.amplitude_to_db(np.abs(librosa.stft(y[a:b], n_fft=1024, hop_length=hop)), ref=np.max)
    fr = librosa.fft_frequencies(sr=sr, n_fft=1024)
    n_tr = len(tracks)
    fig, axes = plt.subplots(3, 1, figsize=(22, 11), sharex=True,
                             gridspec_kw=dict(height_ratios=[3, 1.4, 0.55 * n_tr + 0.4]))
    ax = axes[0]
    ax.imshow(S[fr <= 5000], origin="lower", aspect="auto", cmap="magma", vmin=-70, vmax=0,
              extent=[t0, t0 + S.shape[1] * hop / sr, 0, 5000])
    ht = float(f["hop_s"])
    i0, i1 = int(t0 / ht), min(int(t1 / ht), len(f["f0"]))
    tt = np.arange(i0, i1) * ht
    f0 = np.where(f["voiced"][i0:i1] > 0, f["f0"][i0:i1], np.nan)
    ax.plot(tt, f0 * 2, color="cyan", lw=1.5)
    ax.set_ylim(0, 5000)
    ax.set_ylabel("Hz  (cyan = f0 x2)")
    ax.set_title(title)
    ax2 = axes[1]
    ax2.plot(tt, f["rms_db"][i0:i1], color="k", lw=1, label="rms dB")
    ax2.plot(tt, f["hi_db"][i0:i1] - 30, color="tab:orange", lw=0.8, label="hi(>2.5k) dB-30")
    ax2.plot(tt, np.clip(f["sib_ratio"][i0:i1], -60, 10) - 10, color="tab:blue", lw=0.8, label="sib ratio -10")
    ax2b = ax2.twinx()
    ax2b.fill_between(tt, 0, f["onset"][i0:i1] / (np.percentile(f["onset"], 99.5) + 1e-9),
                      color="tab:green", alpha=0.35)
    ax2b.set_ylim(0, 1.5)
    ax2.set_ylim(-70, 0)
    ax2.legend(loc="upper left", fontsize=7)
    ax3 = axes[2]
    for k, (name, words) in enumerate(tracks):
        yk = n_tr - k
        c = COLORS[k % len(COLORS)]
        for (lab, s, e) in words:
            if s is None or e is None or np.isnan(s) or e < t0 or s > t1:
                continue
            ax3.plot([s, e], [yk, yk], color=c, lw=5, alpha=0.6, solid_capstyle="butt")
            ax3.plot([s, s], [yk - 0.25, yk + 0.15], color=c, lw=1.5)
            ax3.text(s, yk + 0.18, lab, fontsize=9, color=c, clip_on=True)
            for a_ in axes[:2]:
                a_.axvline(s, color=c, lw=0.9, alpha=0.8, ls="-" if k == 0 else "--")
        ax3.text(t0, yk - 0.3, name, fontsize=8, color=c)
    for tb, on in eighths(beats, t0, t1):
        axes[2].axvline(tb, color="gray", lw=1.0 if on else 0.5, ls="-" if on else ":", alpha=0.7)
    for m in marks or []:
        for a_ in axes:
            a_.axvline(m, color="w" if a_ is axes[0] else "gray", lw=0.6, ls=":")
    ax3.set_ylim(0.3, n_tr + 0.8)
    ax3.set_yticks([])
    ax3.set_xlim(t0, t1)
    ax3.set_xticks(np.arange(np.ceil(t0 * 10) / 10, t1, 0.1), minor=True)
    ax3.set_xticks(np.arange(np.ceil(t0 * 2) / 2, t1, 0.5))
    ax3.grid(True, which="both", axis="x", alpha=0.3)
    fig.tight_layout()
    fig.savefig(out, dpi=70)
    plt.close(fig)
