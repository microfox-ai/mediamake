"""Music analysis -> analysis/audio.json

  * constant-tempo beat grid: tempo + phase fitted to drum / mix onset envelopes
    (coarse search around a tempogram estimate, then fine), phase refined on kick
    attacks; drift is checked per 15 s window,
  * downbeats: bar phase scored from kick-on-1, snare-on-2&4, bass onsets and
    harmonic (chroma) change, which resolves the half-bar ambiguity that the snare
    alone leaves,
  * 100 fps normalized envelopes: mix rms / low / mid / high, stem rms
    (vocal / drums / bass / other),
  * onsets [time, strength 0..1]: kick / snare / hat from the drums stem, vocal note
    onsets (log-mel flux peaks + legato pitch jumps) from the vocal stem.

Sections are not decided here: prepare.ts snaps the project's sections to this grid.

Overrides in analysis/config.json (all optional):
  {"tempo_range": [130, 150], "beats_per_bar": 4, "downbeat_phase": 0..3,
   "constant_tempo": true}

Run:  uv run python analyze.py <slug> [--plots]
"""
import common
import math
import sys

import numpy as np
import librosa
from scipy.ndimage import maximum_filter1d, median_filter, uniform_filter1d
from scipy.signal import butter, find_peaks, sosfiltfilt

SR = 44100
FPS = 100


# ---------------------------------------------------------------------------
def band_sos(lo, hi, sr):
    if lo and hi:
        return butter(4, [lo, hi], btype="band", fs=sr, output="sos")
    if hi:
        return butter(4, hi, btype="low", fs=sr, output="sos")
    return butter(4, lo, btype="high", fs=sr, output="sos")


def frame_rms(x, sr, fps=FPS, win=2048):
    hop = sr / fps
    n = int(math.ceil(len(x) / sr * fps))
    pad = np.pad(x, (win // 2, win // 2 + int(hop) + 2))
    idx = (np.arange(n) * hop).astype(int)
    c = np.concatenate([[0.0], np.cumsum(pad.astype(np.float64) ** 2)])
    e = (c[idx + win] - c[idx]) / win
    return np.sqrt(np.maximum(e, 0))


def smooth_env(x, fps=FPS, attack=0.010, release=0.090):
    """One-pole follower: fast attack, slower release (visual friendly)."""
    aa = math.exp(-1 / (attack * fps))
    ar = math.exp(-1 / (release * fps))
    y = np.empty_like(x)
    s = 0.0
    for i, v in enumerate(x):
        a = aa if v > s else ar
        s = a * s + (1 - a) * v
        y[i] = s
    return y


def norm01(x, pct=99.0):
    ref = np.percentile(x, pct)
    return np.clip(x / (ref + 1e-12), 0, 1)


# ---------------------------------------------------------------------------
def onset_env(drums, mix, sr):
    hop = 32
    od = librosa.onset.onset_strength(y=librosa.resample(drums, orig_sr=sr, target_sr=22050),
                                      sr=22050, hop_length=hop, lag=1, max_size=1)
    om = librosa.onset.onset_strength(y=librosa.resample(mix, orig_sr=sr, target_sr=22050),
                                      sr=22050, hop_length=hop, lag=1, max_size=1)
    o = od / (np.percentile(od, 99) + 1e-9) + om / (np.percentile(om, 99) + 1e-9)
    return o, 22050 / hop


def rough_tempo(o, ofps, lo=60, hi=200):
    """Tempogram estimate, folded into [lo, hi), returned with its octave alternatives."""
    hop = 512 // 32
    oe = uniform_filter1d(o, hop)[::hop]
    t = librosa.feature.tempo(onset_envelope=oe, sr=ofps / hop * 512, hop_length=512,
                              start_bpm=120, aggregate=np.median, max_tempo=hi)[0]
    while t < lo:
        t *= 2
    while t >= hi:
        t /= 2
    return float(t)


def fit_grid(drums, mix, sr, duration, tempo_range=None):
    """Constant-tempo grid: coarse tempo/phase search on spectral-flux onset envelopes,
    then fine, then phase refinement on kick attack times."""
    o, ofps = onset_env(drums, mix, sr)

    def score(P, off):
        ts = off + P * np.arange(int(duration / P) + 1)
        idx = np.round(ts * ofps).astype(int)
        idx = idx[(idx > 2) & (idx < len(o) - 2)]
        return np.maximum.reduce([o[idx - 1], o[idx], o[idx + 1]]).mean()

    if tempo_range:
        lo, hi = tempo_range
    else:
        t = rough_tempo(o, ofps)
        lo, hi = t * 0.96, t * 1.04
    best = (0, None, None)
    for bpm in np.arange(lo, hi, 0.02):
        P = 60 / bpm
        for off in np.arange(0, P, 0.004):
            s = score(P, off)
            if s > best[0]:
                best = (s, bpm, off)
    _, bpm, off = best
    for b2 in np.arange(bpm - 0.02, bpm + 0.02, 0.001):
        P = 60 / b2
        for o2 in np.arange(off - 0.01, off + 0.01, 0.001):
            s = score(P, o2)
            if s > best[0]:
                best = (s, b2, o2)
    _, bpm, off = best
    P = 60 / bpm
    kick_t, _ = band_onsets(drums, sr, None, 120, win=0.012, min_gap=0.2, rel_db=12)
    n = np.round((kick_t - off) / P)
    res = kick_t - (off + n * P)
    res = res[np.abs(res) < 0.06]
    if len(res) > 8:
        off = off + float(np.median(res))
    off = off - P * math.floor(off / P)
    # drift check: best local phase per 15 s window
    drift = []
    for w0 in np.arange(0, duration - 15, 15):
        cands = np.arange(-0.03, 0.03, 0.002)
        sc = []
        for d in cands:
            ts = off + d + P * np.arange(int(w0 / P), int((w0 + 15) / P))
            idx = np.round(ts * ofps).astype(int)
            idx = idx[(idx > 2) & (idx < len(o) - 2)]
            sc.append(o[idx].mean() if len(idx) else 0)
        drift.append(float(cands[int(np.argmax(sc))]))
    return bpm, P, off, res, drift, (o, ofps)


def grid_score(o, ofps, ts):
    idx = np.round(np.asarray(ts) * ofps).astype(int)
    idx = idx[(idx > 2) & (idx < len(o) - 2)]
    if len(idx) == 0:
        return 0.0
    return float(np.maximum.reduce([o[idx - 1], o[idx], o[idx + 1]]).mean())


def track_grid(o, ofps, P0, off0, duration, win=16, hop=4, max_dP=0.015, max_dt=0.06):
    """Drift-following beat grid, for songs whose tempo wanders (common in generated
    music). Beat k keeps its integer index; each window of `win` beats fits a local
    period and phase (period within +-max_dP of the neighbour's, phase within +-max_dt
    of the neighbour's extrapolation, so it can never slip half a beat). Tracking
    starts from the best-locked window and runs forward and backward; overlapping
    window predictions are blended with triangular weights."""
    n = int((duration - off0) / P0) + 1
    starts = list(range(0, max(1, n - win + 1), hop))
    centers = [s + win / 2 for s in starts]

    def fit(k_c, t_c, P, dP=max_dP, dt=max_dt):
        best = (-1.0, P, t_c)
        ks = np.arange(int(k_c - win / 2), int(k_c + win / 2)) - k_c
        for P2 in np.linspace(P * (1 - dP), P * (1 + dP), 31):
            for d in np.arange(-dt, dt + 1e-9, 0.002):
                s = grid_score(o, ofps, t_c + d + ks * P2)
                if s > best[0]:
                    best = (s, P2, t_c + d)
        return best

    sharp = []
    for c in centers:
        s, _, _ = fit(c, off0 + c * P0, P0, dP=0.0, dt=0.0)
        sharp.append(s)
    a = int(np.argmax(sharp))
    fits = {a: fit(centers[a], off0 + centers[a] * P0, P0, dP=max_dP, dt=P0 / 2)}
    for direction in (1, -1):
        w = a
        while 0 <= w + direction < len(starts):
            s0, P, t_c = fits[w]
            nxt = w + direction
            k_gap = centers[nxt] - centers[w]
            fits[nxt] = fit(centers[nxt], t_c + k_gap * P, P)
            w = nxt
    # blend window predictions per beat
    num = np.zeros(n)
    den = np.zeros(n)
    for w, s in enumerate(starts):
        sc, P, t_c = fits[w]
        ks = np.arange(s, min(n, s + win))
        wt = (1 - np.abs(ks + 0.5 - centers[w]) / (win / 2 + 1)) * max(sc, 1e-3)
        num[ks] += wt * (t_c + (ks - centers[w]) * P)
        den[ks] += wt
    beats = np.empty(n)
    have = den > 0
    beats[have] = num[have] / den[have]
    # beats past the last window: extrapolate with the last window's period
    if not have.all():
        last = np.where(have)[0].max()
        P_last = fits[len(starts) - 1][1]
        beats[last + 1:] = beats[last] + P_last * np.arange(1, n - last)
    beats = beats[(beats >= 0) & (beats < duration)]
    periods = [fits[w][1] for w in range(len(starts))]
    return beats, np.array(periods), np.array([fits[w][0] for w in range(len(starts))])


def band_onsets(x, sr, lo, hi, win=0.010, hop_s=0.002, min_gap=0.08, rel_db=10.0):
    """Onsets in a frequency band: steepest rise of the band's log-energy envelope;
    strength = peak dB.  Returns (times, peak_db)."""
    xb = sosfiltfilt(band_sos(lo, hi, sr), x)
    h = int(hop_s * sr)
    w = int(win * sr)
    e = np.convolve(xb.astype(np.float64) ** 2, np.ones(w) / w, mode="same")[::h]
    db = 10 * np.log10(e + 1e-10)
    fps = sr / h
    d = np.diff(db, prepend=db[0])
    d = uniform_filter1d(d, 3)
    lag = int(0.02 * fps)
    rise = db - np.concatenate([np.full(lag, db[0]), db[:-lag]])
    floor = median_filter(db, int(1.0 * fps) | 1)
    pk, _ = find_peaks(rise, height=rel_db, distance=int(min_gap * fps))
    times, strength = [], []
    for p in pk:
        a = max(0, p - lag)
        q = a + int(np.argmax(d[a:p + 1]))
        peak_db = db[p:p + int(0.03 * fps)].max()
        if peak_db < floor[p] + 3:
            continue
        times.append(q / fps)
        strength.append(peak_db)
    return np.array(times), np.array(strength)


def drum_onsets(d, sr):
    """Kick / snare / hat onsets from the drums stem."""
    kt, kdb = band_onsets(d, sr, None, 120, win=0.012, min_gap=0.15, rel_db=12)
    # SNARE: 1.5-5 kHz attacks with a long noisy 0.5-5 kHz tail 40-120 ms later, within
    # 8 dB of the loudest tail in +-2.5 s and 25 dB of the song-wide level (rejects
    # bleed); kick-only beats and hats have tails 12-30 dB lower.
    st, sdb = band_onsets(d, sr, 1500, 5000, win=0.010, min_gap=0.15, rel_db=10)
    xb = sosfiltfilt(band_sos(500, 5000, sr), d)
    e = np.sqrt(np.convolve(xb.astype(np.float64) ** 2, np.ones(441) / 441, mode="same"))
    tail = np.array([20 * np.log10(e[int((t + 0.04) * sr):int((t + 0.12) * sr)].mean() + 1e-9)
                     if int((t + 0.12) * sr) <= len(e) else -200.0 for t in st])
    if len(st):
        rel = np.array([tail[i] - tail[np.abs(st - st[i]) < 2.5].max() for i in range(len(st))])
        thr = np.percentile(tail, 95) - 25
        keep = (rel > -8) & (tail > thr)
        st, stail = st[keep], tail[keep]
    else:
        stail = tail
    # HAT: >7 kHz, short; drop those within 40 ms of a snare or 30 ms of a kick
    ht, hdb = band_onsets(d, sr, 7000, None, win=0.006, min_gap=0.06, rel_db=9)
    for other, gap in ((st, 0.04), (kt, 0.03)):
        if len(other) and len(ht):
            dist = np.min(np.abs(ht[:, None] - other[None, :]), axis=1)
            keep = dist > gap
            ht, hdb = ht[keep], hdb[keep]
    return (kt, kdb), (st, stail), (ht, hdb)


def strength01(db_vals, lo_pct=5, hi_pct=95):
    if len(db_vals) == 0:
        return db_vals
    lo, hi = np.percentile(db_vals, lo_pct), np.percentile(db_vals, hi_pct)
    return np.clip((db_vals - lo) / (hi - lo + 1e-9) * 0.8 + 0.2, 0, 1)


def vocal_onsets(proj):
    """Vocal note onsets: log-mel spectral flux peaks (5 ms hop) plus pitch jumps
    > 0.8 semitone while voiced, restricted to active vocal frames."""
    f = dict(np.load(proj.work / "vocal_feats.npz"))
    hop = float(f["hop_s"])
    on = f["onset"]
    rms = f["rms_db"]
    loc = maximum_filter1d(rms, int(2.0 / hop))
    active = (rms > -45) & (rms > loc - 25)
    thr = uniform_filter1d(on, int(0.4 / hop)) * 1.5 + 0.15 * np.percentile(on, 99)
    pk, _ = find_peaks(on, height=0, distance=int(0.09 / hop))
    pk = [p for p in pk if on[p] > thr[p] and active[min(len(active) - 1, p + int(0.03 / hop))]]
    t_flux = np.array(pk) * hop
    s_flux = np.array([on[p] for p in pk])
    midi = librosa.hz_to_midi(np.where(f["voiced"] > 0, f["f0"], np.nan))
    med = median_filter(np.nan_to_num(midi, nan=0), 9)
    w = int(0.04 / hop)
    jumps = [i for i in range(w, len(med) - w)
             if med[i - w] > 0 and med[i + w] > 0 and abs(med[i + w] - med[i - w]) > 0.8 and active[i]]
    t_pitch, last = [], -1e9
    for i in jumps:
        if i - last > int(0.1 / hop):
            t_pitch.append(i * hop)
        last = i
    ts = list(zip(t_flux, s_flux / (np.percentile(s_flux, 95) + 1e-9))) if len(s_flux) else []
    for t in t_pitch:
        if len(t_flux) == 0 or np.min(np.abs(t_flux - t)) > 0.08:
            ts.append((t, 0.35))
    ts.sort()
    return [(float(t), float(min(1.0, max(0.1, s)))) for t, s in ts]


def bar_phase(beats, kicks, snares, bass, harm, sr, bpb=4, line_starts=()):
    """Score each candidate downbeat phase p (beat index i is a downbeat when
    (i - p) % bpb == 0). Returns (best p, table of evidence).

    Evidence: kick on 1, snare on 2 & 4, bass onsets on 1, chord change on 1, and
    lyric lines starting on beat 1 or as a pickup in the last beat of the bar
    (sung lines rarely start mid-bar)."""
    P = np.median(np.diff(beats))

    def near(ts, strengths=None):
        """per-beat max strength of events within 1/8 beat of it"""
        out = np.zeros(len(beats))
        if len(ts) == 0:
            return out
        ts = np.asarray(ts)
        j = np.clip(np.searchsorted(beats, ts), 1, len(beats) - 1)
        idx = np.where(np.abs(ts - beats[j - 1]) < np.abs(ts - beats[j]), j - 1, j)
        res = np.abs(ts - beats[idx])
        s = np.ones(len(ts)) if strengths is None else np.asarray(strengths)
        for i, r, v in zip(idx, res, s):
            if r < P / 8:
                out[i] = max(out[i], v)
        return out

    K, S, B = near(*kicks), near(*snares), near(*bass)
    # harmonic change at each beat: cosine distance of beat-synchronous chroma
    C = librosa.feature.chroma_cqt(y=harm, sr=sr, hop_length=512)
    frames = librosa.time_to_frames(beats, sr=sr, hop_length=512)
    frames = np.clip(frames, 0, C.shape[1] - 1)
    Cb = librosa.util.sync(C, np.concatenate([frames, [C.shape[1]]]), aggregate=np.median)[:, :len(beats)]
    Cn = Cb / (np.linalg.norm(Cb, axis=0, keepdims=True) + 1e-9)
    H = np.concatenate([[0], 1 - (Cn[:, 1:] * Cn[:, :-1]).sum(0)])
    ls = np.asarray(line_starts, float)
    ls = ls[(ls > beats[0]) & (ls < beats[-1])]
    lk = np.searchsorted(beats, ls) - 1
    lfrac = (ls - beats[lk]) / (beats[lk + 1] - beats[lk]) if len(ls) else ls
    rows = []
    for p in range(bpb):
        on1 = (np.arange(len(beats)) - p) % bpb == 0
        backbeat = np.isin((np.arange(len(beats)) - p) % bpb, [1, 3]) if bpb == 4 else ~on1
        pos = ((lk - p) % bpb) + lfrac
        chance = (0.9 + 1.0) / bpb
        rows.append(dict(phase=p,
                         kick1=float(K[on1].mean() - K[~on1].mean()),
                         snare24=float(S[backbeat].mean() - S[~backbeat].mean()),
                         bass1=float(B[on1].mean() - B[~on1].mean()),
                         harm1=float(H[on1].mean() / (H.mean() + 1e-9) - 1),
                         lyric1=float(((pos < 0.9) | (pos >= bpb - 1)).mean() - chance) if len(ls) else 0.0))
    for r in rows:
        r["score"] = r["kick1"] + r["snare24"] + 0.7 * r["bass1"] + 0.4 * r["harm1"] + 1.0 * r["lyric1"]
    best = max(rows, key=lambda r: r["score"])["phase"]
    return best, rows


# ---------------------------------------------------------------------------
def main(proj, plots=False):
    cfg = proj.config()
    mix, _ = proj.load_mix(SR)
    duration = len(mix) / SR
    stems = {n: proj.load_stem(n, sr=SR)[0][: len(mix)] for n in ("vocals", "drums", "bass", "other")}
    for n in stems:
        if len(stems[n]) < len(mix):
            stems[n] = np.pad(stems[n], (0, len(mix) - len(stems[n])))

    bpm, P, off, kick_res, drift, (o, ofps) = fit_grid(stems["drums"], mix, SR, duration, cfg.get("tempo_range"))
    const = off + P * np.arange(int((duration - off) / P) + 1)
    print(f"constant grid: {bpm:.3f} BPM  period {P:.5f}s  first beat {off:.4f}s  "
          f"kick residual sd {kick_res.std() * 1000:.1f} ms  best phase per 15 s window: "
          f"{min(drift) * 1000:+.0f}..{max(drift) * 1000:+.0f} ms")
    tracked, periods, wscore = track_grid(o, ofps, P, off, duration)
    win_s = 12
    rows_cmp = []
    for w0 in np.arange(0, duration - win_s / 2, win_s):
        sel = lambda b: b[(b >= w0) & (b < w0 + win_s)]
        rows_cmp.append((w0, grid_score(o, ofps, sel(const)), grid_score(o, ofps, sel(tracked))))
    gain = max(t / (c + 1e-9) for _, c, t in rows_cmp)
    mode = cfg.get("tempo_mode") or ("tracked" if gain > 1.08 or max(np.abs(drift)) > 0.02 else "constant")
    print(f"tracked grid: {60 / periods.min():.2f}..{60 / periods.max():.2f} BPM over the song; "
          f"best window gain over the constant grid x{gain:.2f} -> using the {mode} grid")
    for w0, c, t in rows_cmp:
        print(f"  {w0:6.0f}s  constant {c:.3f}  tracked {t:.3f}  local {60 / np.median(np.diff(tracked[(tracked >= w0) & (tracked < w0 + win_s)])):.2f} BPM")
    beats = tracked if mode == "tracked" else const
    bpm = 60 / float(np.median(np.diff(beats)))

    (kt, kdb), (st, sdb), (ht, hdb) = drum_onsets(stems["drums"], SR)
    bt, bdb = band_onsets(stems["bass"], SR, None, 250, win=0.015, min_gap=0.15, rel_db=10)
    bpb = int(cfg.get("beats_per_bar", 4))
    line_starts = [l["words"][0]["start"] if l["words"] and l["words"][0]["start"] is not None else l["start"]
                   for l in proj.lyrics()]
    phase, rows = bar_phase(beats, (kt, strength01(kdb)), (st, strength01(sdb)), (bt, strength01(bdb)),
                            stems["other"] + stems["bass"], SR, bpb, line_starts)
    print(f"bar phase evidence (beat i is a downbeat when (i - phase) % {bpb} == 0):")
    for r in rows:
        print("  phase %d  kick-on-1 %+.3f  snare-on-2&4 %+.3f  bass-on-1 %+.3f  chord-change-on-1 %+.3f  "
              "lines-start-on-1 %+.3f  -> %+.3f"
              % (r["phase"], r["kick1"], r["snare24"], r["bass1"], r["harm1"], r["lyric1"], r["score"]))
    if "downbeat_phase" in cfg:
        phase = int(cfg["downbeat_phase"])
        print(f"  downbeat phase {phase} (config.json)")
    else:
        print(f"  downbeat phase {phase}")
    downbeats = beats[(np.arange(len(beats)) - phase) % bpb == 0]

    # per-beat strength: onset envelope at the beat, normalized
    idx = np.clip(np.round(beats * ofps).astype(int), 1, len(o) - 2)
    bstr = np.maximum.reduce([o[idx - 1], o[idx], o[idx + 1]])
    bstr = np.clip(bstr / (np.percentile(bstr, 95) + 1e-9), 0, 1)

    n = int(math.ceil(duration * FPS))
    env = {"rms": frame_rms(mix, SR)[:n]}
    for name, (lo, hi) in {"low": (None, 150), "mid": (150, 2000), "high": (4000, None)}.items():
        env[name] = frame_rms(sosfiltfilt(band_sos(lo, hi, SR), mix), SR)[:n]
    for s in ("vocal", "drums", "bass", "other"):
        env[s] = frame_rms(stems["vocals" if s == "vocal" else s], SR)[:n]
    for k in env:
        env[k] = [round(float(x), 3) for x in norm01(smooth_env(env[k]))]

    onsets = {
        "kick": [[round(float(t), 3), round(float(s), 3)] for t, s in zip(kt, strength01(kdb))],
        "snare": [[round(float(t), 3), round(float(s), 3)] for t, s in zip(st, strength01(sdb))],
        "hat": [[round(float(t), 3), round(float(s), 3)] for t, s in zip(ht, strength01(hdb))],
        "vocal": [[round(t, 3), round(s, 3)] for t, s in vocal_onsets(proj)],
    }

    def pos_hist(ts):
        ts = np.asarray(ts)
        k = np.searchsorted(beats, ts) - 1
        ok = (k >= 0) & (k < len(beats) - 1)
        frac = (ts[ok] - beats[k[ok]]) / (beats[k[ok] + 1] - beats[k[ok]])
        ph = (((k[ok] - phase) % bpb) * 2 + np.round(frac * 2).astype(int)) % (2 * bpb)
        return np.bincount(ph, minlength=2 * bpb).tolist()
    print("8th-note positions in the bar (1 & 2 & 3 & 4 &):")
    print("  kick ", pos_hist(kt))
    print("  snare", pos_hist(st))
    print("  hat  ", pos_hist(ht))

    grid_note = (
        f"Constant tempo {bpm:.3f} BPM fitted over the whole song on drum + mix onset envelopes, phase refined "
        f"on kick attacks (residual sd {kick_res.std() * 1000:.1f} ms)." if mode == "constant" else
        f"Tempo wanders ({60 / periods.min():.2f}-{60 / periods.max():.2f} BPM), so the grid is tracked: "
        f"16-beat windows fit a local period (+-1.5 %) and phase (+-60 ms of the neighbouring window), "
        f"starting from the best-locked window, blended with triangular weights; beat indices stay integer.")
    doc = dict(
        duration=round(duration, 3), bpm=round(bpm, 3), beat_period=round(60 / bpm, 5), beats_per_bar=bpb,
        tempo_mode=mode,
        beats=[round(float(t), 3) for t in beats],
        beat_strength=[round(float(s), 2) for s in bstr],
        downbeats=[round(float(t), 3) for t in downbeats],
        fps=FPS, envelopes=env, onsets=onsets,
        notes=(f"{grid_note} Bar phase {phase} of {bpb} "
               f"from kick / snare / bass / chord-change evidence. Envelopes: {FPS} fps, frame i centred at i/{FPS} s, "
               "46 ms RMS window, one-pole smoothing (10 ms attack / 90 ms release), each divided by its own 99th "
               "percentile and clipped to 0..1. low <150 Hz, mid 150-2000 Hz, high >4 kHz of the mix; vocal / "
               "drums / bass / other = Demucs stem RMS. Onsets [t, strength]: kick = <120 Hz attacks, snare = "
               "1.5-5 kHz attacks with a noisy tail, hat = >7 kHz attacks away from kicks / snares, vocal = note "
               "onsets of the vocal stem (incl. backing vocals and ad-libs)."),
    )
    common.write_json(proj.out / "audio.json", doc, compact=True)
    print(f"wrote {(proj.out / 'audio.json').relative_to(common.APP)}: {len(beats)} beats, {len(downbeats)} "
          f"downbeats, {len(kt)} kicks, {len(st)} snares, {len(ht)} hats, {len(onsets['vocal'])} vocal onsets")
    if plots:
        make_plots(proj, doc, stems)
    return doc


def make_plots(proj, doc, stems):
    import json
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    sections = []
    pj = proj.project_json().get("sections") or []
    for s in pj:
        sections.append((s["label"], s["from"]))
    t = np.arange(len(doc["envelopes"]["rms"])) / FPS
    dur = doc["duration"]
    wins = [(a, min(dur, a + 10)) for a in np.arange(0, dur, 30)]
    for (t0, t1) in wins:
        fig, ax = plt.subplots(3, 1, figsize=(22, 11), sharex=True, gridspec_kw=dict(height_ratios=[2, 1.6, 1.4]))
        d = stems["drums"][int(t0 * SR):int(t1 * SR)]
        S = librosa.amplitude_to_db(np.abs(librosa.stft(d, n_fft=1024, hop_length=128)), ref=np.max)
        ax[0].imshow(S, origin="lower", aspect="auto", cmap="magma", vmin=-60, vmax=0,
                     extent=[t0, t0 + S.shape[1] * 128 / SR, 0, SR / 2])
        ax[0].set_ylim(0, 12000)
        ax[0].set_ylabel("drums stem")
        m = (t >= t0) & (t <= t1)
        for k, c in [("rms", "k"), ("low", "tab:red"), ("mid", "tab:green"), ("high", "tab:blue")]:
            ax[1].plot(t[m], np.array(doc["envelopes"][k])[m], color=c, lw=1, label=k)
        ax[1].legend(loc="upper left", fontsize=8)
        for k, c in [("vocal", "tab:purple"), ("drums", "tab:orange"), ("bass", "tab:brown"), ("other", "tab:olive")]:
            ax[2].plot(t[m], np.array(doc["envelopes"][k])[m], color=c, lw=1, label=k)
        ax[2].legend(loc="upper left", fontsize=8)
        for b in doc["beats"]:
            if t0 <= b <= t1:
                for a_ in ax:
                    a_.axvline(b, color="gray", lw=0.6, alpha=0.6)
        for b in doc["downbeats"]:
            if t0 <= b <= t1:
                for a_ in ax:
                    a_.axvline(b, color="c" if a_ is ax[0] else "k", lw=1.8)
        for name, y, c in [("kick", 1500, "tab:red"), ("snare", 5000, "w"), ("hat", 9500, "yellow")]:
            for (ot, s) in doc["onsets"][name]:
                if t0 <= ot <= t1:
                    ax[0].plot([ot], [y], marker="v", color=c, ms=4 + 8 * s)
        for (ot, s) in doc["onsets"]["vocal"]:
            if t0 <= ot <= t1:
                ax[2].plot([ot], [1.02], marker="v", color="tab:purple", ms=3 + 6 * s)
        for name, s0 in sections:
            if t0 <= s0 <= t1:
                ax[1].text(s0, 1.02, name, fontsize=14, color="tab:red")
                for a_ in ax:
                    a_.axvline(s0, color="tab:red", lw=2.5)
        ax[2].set_xlim(t0, t1)
        ax[2].set_xticks(np.arange(np.ceil(t0), t1, 0.5))
        fig.tight_layout()
        fig.savefig(proj.qa / f"audio_{int(t0):03d}.png", dpi=60)
        plt.close(fig)
    fig, ax = plt.subplots(2, 1, figsize=(24, 7), sharex=True)
    for k, c in [("rms", "k"), ("low", "tab:red"), ("high", "tab:blue")]:
        ax[0].plot(t, doc["envelopes"][k], color=c, lw=0.6, label=k)
    for k, c in [("vocal", "tab:purple"), ("drums", "tab:orange"), ("bass", "tab:brown"), ("other", "tab:olive")]:
        ax[1].plot(t, doc["envelopes"][k], color=c, lw=0.6, label=k)
    for name, s0 in sections:
        for a_ in ax:
            a_.axvline(s0, color="tab:red", lw=1.5)
        ax[0].text(s0 + 0.2, 1.03, name, fontsize=10, color="tab:red")
    for a_ in ax:
        a_.legend(loc="upper right", fontsize=8)
    ax[1].set_xticks(np.arange(0, dur, 5))
    fig.tight_layout()
    fig.savefig(proj.qa / "audio_overview.png", dpi=60)
    plt.close(fig)
    print(f"QA plots: {proj.qa.relative_to(common.APP)}/audio_*.png")


if __name__ == "__main__":
    main(common.project_from_argv(), plots="--plots" in sys.argv)
