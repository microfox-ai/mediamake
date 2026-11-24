# /// script
# requires-python = ">=3.9"
# dependencies = ["numpy"]
# ///
"""Measure audio files, since an agent can't listen: levels, loudness, balance, bands, tails, null tests.

  uv run measure.py stats <file> [--start S] [--end S] [--windows N] [--json]
  uv run measure.py null <a> <b> [--gain-db G] [--a-start S] [--b-start S] [--seconds L]
                                                    # what is left of a - b, with G dB put on b (a null test);
                                                    # the starts line a piece up with its place in a longer file
  uv run measure.py spectro <file> <out.png>        # a spectrogram picture to look at
  uv run measure.py tone <file>                     # the strongest frequency (pitch / speed checks)
  uv run measure.py join <file> <seconds>           # is there a click at an edit point?

Needs ffmpeg and ffprobe on the PATH. Loudness (LUFS) and true peak come from ffmpeg's loudnorm.
"""
import argparse, json, re, subprocess, sys
import numpy as np

BANDS = [("sub <60", 0, 60), ("bass 60-250", 60, 250), ("low-mid 250-2k", 250, 2000),
         ("high-mid 2k-6k", 2000, 6000), ("air 6k+", 6000, 1e9)]


def db(x):
    return float(20 * np.log10(max(float(x), 1e-12)))


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries",
                          "stream=sample_rate,channels,codec_name,bits_per_raw_sample,bits_per_sample:format=duration",
                          "-of", "json", path], capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    s = j["streams"][0]
    bits = s.get("bits_per_raw_sample") or s.get("bits_per_sample") or 0
    return {"sample_rate": int(s["sample_rate"]), "channels": int(s["channels"]), "codec": s["codec_name"],
            "bits": int(bits) if str(bits).isdigit() else 0, "seconds": float(j["format"]["duration"])}


def load(path, start=None, end=None):
    info = probe(path)
    cmd = ["ffmpeg", "-v", "error"]
    if start is not None:
        cmd += ["-ss", str(start)]
    if end is not None:
        cmd += ["-to", str(end)]
    cmd += ["-i", path, "-f", "f32le", "-acodec", "pcm_f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).reshape(-1, info["channels"]).astype(np.float64)
    return x, info


def loudness(path, start=None, end=None):
    cmd = ["ffmpeg", "-hide_banner", "-nostats"]
    if start is not None:
        cmd += ["-ss", str(start)]
    if end is not None:
        cmd += ["-to", str(end)]
    cmd += ["-i", path, "-af", "loudnorm=print_format=json", "-f", "null", "-"]
    err = subprocess.run(cmd, capture_output=True, text=True).stderr
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", err, re.S)
    if not m:
        return None, None, None
    j = json.loads(m.group(0))
    f = lambda k: None if j[k] in ("-inf", "inf") else float(j[k])
    return f("input_i"), f("input_tp"), f("input_lra")


def bands(mono, sr):
    if len(mono) < 2:
        return {}
    n = min(len(mono), 65536)  # averaged frames (Welch): fast on a whole song
    frames = len(mono) // n
    win = np.hanning(n)
    spec = np.zeros(n // 2 + 1)
    for k in range(frames):
        spec += np.abs(np.fft.rfft(mono[k * n:(k + 1) * n] * win)) ** 2
    freqs = np.fft.rfftfreq(n, 1 / sr)
    total = spec.sum() or 1e-30
    out = {}
    for name, lo, hi in BANDS:
        e = spec[(freqs >= lo) & (freqs < hi)].sum()
        out[name] = round(float(10 * np.log10(max(e / total, 1e-12))), 1)
    return out


def stats(path, start=None, end=None, windows=0):
    x, info = load(path, start, end)
    sr = info["sample_rate"]
    mono = x.mean(axis=1)
    peak = [round(db(np.abs(x[:, c]).max() if len(x) else 0), 2) for c in range(x.shape[1])]
    rms = [round(db(np.sqrt((x[:, c] ** 2).mean()) if len(x) else 0), 2) for c in range(x.shape[1])]
    i, tp, lra = loudness(path, start, end)
    r = {"file": path, **info, "measured_seconds": round(len(x) / sr, 3), "peak_db": peak, "rms_db": rms,
         "lufs": i, "true_peak_db": tp, "lra": lra,
         "crest_db": round(max(peak) - db(np.sqrt((x ** 2).mean())), 2) if len(x) else None}
    if x.shape[1] == 2 and len(x):
        l, rr = x[:, 0], x[:, 1]
        den = np.sqrt((l ** 2).sum() * (rr ** 2).sum())
        r["lr_correlation"] = round(float((l * rr).sum() / den), 3) if den > 0 else None
        r["balance_db_r_minus_l"] = round(rms[1] - rms[0], 2)
        mid, side = (l + rr) / 2, (l - rr) / 2
        r["side_minus_mid_db"] = round(db(np.sqrt((side ** 2).mean())) - db(np.sqrt((mid ** 2).mean())), 1)
    r["bands_db_of_total"] = bands(mono, sr)
    r["dc_offset"] = round(float(mono.mean()), 6) if len(x) else None
    # where the sound starts and ends (above -60 dBFS)
    loud = np.where(np.abs(x).max(axis=1) > 10 ** (-60 / 20))[0]
    r["first_sound_s"] = round(float(loud[0] / sr), 3) if len(loud) else None
    r["last_sound_s"] = round(float(loud[-1] / sr), 3) if len(loud) else None
    if windows:
        n = len(x) // windows
        r["windows_rms_db"] = [[round(db(np.sqrt((x[k * n:(k + 1) * n, c] ** 2).mean())), 1) for c in range(x.shape[1])]
                               for k in range(windows)] if n else []
    return r


def null(a, b, gain_db=0.0, a_start=None, b_start=None, seconds=None):
    xa, ia = load(a, a_start, None if seconds is None else (a_start or 0) + seconds)
    xb, ib = load(b, b_start, None if seconds is None else (b_start or 0) + seconds)
    if ia["sample_rate"] != ib["sample_rate"] or xa.shape[1] != xb.shape[1]:
        return {"error": "sample rate or channel count differs", "a": ia, "b": ib}
    n = min(len(xa), len(xb))
    d = xa[:n] - xb[:n] * (10 ** (gain_db / 20))
    ref = db(np.sqrt((xa[:n] ** 2).mean()))
    res = db(np.sqrt((d ** 2).mean()))
    return {"a": a, "b": b, "compared_seconds": round(n / ia["sample_rate"], 3), "length_diff_samples": len(xa) - len(xb),
            "a_rms_db": round(ref, 2), "residual_rms_db": round(res, 2), "residual_peak_db": round(db(np.abs(d).max()), 2),
            "null_depth_db": round(ref - res, 1)}


def tone(path):
    x, info = load(path)
    mono = x.mean(axis=1)
    spec = np.abs(np.fft.rfft(mono * np.hanning(len(mono))))
    freqs = np.fft.rfftfreq(len(mono), 1 / info["sample_rate"])
    k = int(spec[1:].argmax()) + 1
    return {"file": path, "seconds": info["seconds"], "strongest_hz": round(float(freqs[k]), 2)}


def join(path, t):
    """The biggest sample-to-sample jump within 5 ms of an edit point, beside what is usual for the file."""
    x, info = load(path)
    sr = info["sample_rate"]
    d = np.abs(np.diff(x, axis=0)).max(axis=1)
    i = int(t * sr)
    w = d[max(i - sr // 200, 0):i + sr // 200]
    usual = float(np.percentile(d, 99.9))
    here = float(w.max()) if len(w) else 0.0
    return {"file": path, "at_s": t, "jump_at_join": round(here, 4), "usual_p999": round(usual, 4),
            "max_anywhere": round(float(d.max()), 4), "click_likely": bool(here > 2 * usual)}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("stats"); s.add_argument("file"); s.add_argument("--start", type=float); s.add_argument("--end", type=float)
    s.add_argument("--windows", type=int, default=0); s.add_argument("--json", action="store_true")
    n = sub.add_parser("null"); n.add_argument("a"); n.add_argument("b"); n.add_argument("--gain-db", type=float, default=0.0)
    n.add_argument("--a-start", type=float); n.add_argument("--b-start", type=float); n.add_argument("--seconds", type=float)
    p = sub.add_parser("spectro"); p.add_argument("file"); p.add_argument("out")
    t = sub.add_parser("tone"); t.add_argument("file")
    jn = sub.add_parser("join"); jn.add_argument("file"); jn.add_argument("seconds", type=float)
    a = ap.parse_args()
    if a.cmd == "stats":
        r = stats(a.file, a.start, a.end, a.windows)
        if a.json:
            print(json.dumps(r))
        else:
            for k, v in r.items():
                print(f"{k:24} {v}")
    elif a.cmd == "null":
        print(json.dumps(null(a.a, a.b, a.gain_db, a.a_start, a.b_start, a.seconds)))
    elif a.cmd == "spectro":
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.file, "-lavfi",
                        "showspectrumpic=s=1600x800:legend=1:scale=log:fscale=log", a.out], check=True)
        print(a.out)
    elif a.cmd == "tone":
        print(json.dumps(tone(a.file)))
    elif a.cmd == "join":
        print(json.dumps(join(a.file, a.seconds)))


if __name__ == "__main__":
    main()
