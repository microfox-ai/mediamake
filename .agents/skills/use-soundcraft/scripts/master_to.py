# /// script
# requires-python = ">=3.8"
# dependencies = []
# ///
"""Land a song on a loudness target with SoundCraft's Maximizer, true peak kept under a limit.

  uv run master_to.py <song.wav | session.scraft> <out.wav> --lufs -9 [--true-peak -1.0]
                      [--tail 0] [--bit-depth 24] [--tolerance 0.1] [--ladder -11,-10,-9,-8]

An audio file gets gain and one limiter, nothing else: its own mix is kept. A session keeps its
whole mix and gets its master's Maximizer set (one is added, on a new master track, when it has none).
The Maximizer limits sample peaks, so the ceiling is lowered until the measured true peak fits
(SoundCraft's reading and, when ffmpeg is installed, ffmpeg's: the higher of the two counts).
--ladder writes one file per target beside <out> ("<out> (-9 LUFS).wav") for picking by ear.
Prints one JSON line per result. Needs soundcraft-cli (on the PATH or in ~/.local/bin).
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile


def cli():
    for c in (shutil.which("soundcraft-cli"), os.path.expanduser("~/.local/bin/soundcraft-cli")):
        if c and os.path.exists(c):
            return c
    sys.exit("soundcraft-cli not found: install it first (the use-soundcraft skill says how)")


SC = cli()


def run(args):
    p = subprocess.run([SC] + args, capture_output=True, text=True)
    if p.returncode != 0:
        sys.exit("soundcraft-cli failed: " + (p.stderr.strip() or p.stdout.strip())[-600:])
    return p.stdout.strip().split("\n")


def last_json(lines):
    for l in reversed(lines):
        l = l.strip()
        if l.startswith("{"):
            return json.loads(l)
        if ": {" in l:
            return json.loads(l.split(": ", 1)[1])
    return {}


def ffmpeg_true_peak(path):
    """ffmpeg's true-peak reading of a file, or None without ffmpeg. It reads up to 0.4 dB above SoundCraft's."""
    if not shutil.which("ffmpeg"):
        return None
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "loudnorm=print_format=json",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.search(r'"input_tp"\s*:\s*"([-0-9.]+)"', err)
    return float(m.group(1)) if m else None


class Job:
    """Bounces the input with a given Maximizer threshold and ceiling."""

    def __init__(self, src, tail, tmp):
        self.src, self.tmp = os.path.abspath(src), tmp
        self.is_session = src.lower().endswith(".scraft")
        if self.is_session:
            d = json.loads(run(["run", "--in", self.src, "--inspect", "--compact"])[-1])
            self.length = d["length_samples"] / d["sample_rate"] + tail
            masters = [t for t in d["tracks"] if t["kind"] == "master"]
            self.pre = []
            self.track, self.slot = None, None
            for t in masters:
                for i in t["inserts"]:
                    if i and i["plugin"] == "maximizer":
                        self.track, self.slot = t["name"], i["slot"]
            if self.track is None:
                if masters:
                    self.track = masters[0]["name"]
                    self.slot = len([i for i in masters[0]["inserts"] if i])
                else:
                    self.track, self.slot = "MASTER", 0
                    self.pre.append(("track.new", {"kind": "master", "format": "stereo", "name": "MASTER"}))
                self.pre.append(("mix.insert", {"track": self.track, "slot": self.slot, "plugin": "maximizer"}))
        else:
            info = json.loads("\n".join(run(["info", self.src, "--compact"])))
            self.length = info["seconds"] + tail
            self.rate = info["sample_rate"]
            self.track, self.slot = "MASTER", 0
            self.pre = [("session.new", {"name": "master", "sample_rate": self.rate}),
                        ("file.import_audio", {"path": self.src}),
                        ("track.new", {"kind": "master", "format": "stereo", "name": "MASTER"}),
                        ("mix.insert", {"track": "MASTER", "slot": 0, "plugin": "maximizer"})]

    def bounce(self, threshold, ceiling, out, bit_depth="24", save=None):
        steps = list(self.pre) + [("mix.insert_params", {"track": self.track, "slot": self.slot,
                                                         "params": {"threshold": threshold, "ceiling": ceiling}})]
        script = os.path.join(self.tmp, "steps.txt")
        with open(script, "w") as f:
            for cid, params in steps:
                f.write(cid + " " + json.dumps(params) + "\n")
            f.write("file.bounce_mix " + json.dumps({"path": os.path.abspath(out), "bit_depth": bit_depth,
                                                     "start": {"seconds": 0}, "end": {"seconds": self.length}}) + "\n")
        args = ["script", script] + (["--in", self.src] if self.is_session else [])
        if save:
            args += ["--save", os.path.abspath(save)]
        lines = run(args)
        for l in reversed(lines):
            if l.startswith("file.bounce_mix"):
                return json.loads(l.split(": ", 1)[1])
        return last_json(lines)


def land(job, target, tp_limit, tol, tmp):
    """Bisect the threshold for the loudness, then lower the ceiling until the true peak fits."""
    probe = os.path.join(tmp, "probe.flac")
    ceiling = min(tp_limit - 0.5, -0.1)
    r0 = job.bounce(0.0, 0.0, probe)
    best = None
    for _ in range(5):                       # ceiling rounds
        lo, hi = -30.0, 0.0                  # threshold: lower is louder
        r = None
        for _ in range(9):
            mid = (lo + hi) / 2
            r = job.bounce(round(mid, 2), ceiling, probe)
            if abs(r["lufs"] - target) <= tol / 2:
                break
            if r["lufs"] < target:
                hi = mid
            else:
                lo = mid
        best = {"threshold": round(mid, 2), "ceiling": round(ceiling, 2), **{k: round(r[k], 2) for k in ("lufs", "peak_db", "true_peak_db")}}
        tp2 = ffmpeg_true_peak(probe)
        best["ffmpeg_true_peak_db"] = tp2
        worst = max(r["true_peak_db"], tp2) if tp2 is not None else r["true_peak_db"]
        over = worst - tp_limit
        if over <= 0.02:
            break
        ceiling -= over + 0.1
    best["source_lufs"] = round(r0["lufs"], 2)
    best["source_true_peak_db"] = round(r0["true_peak_db"], 2)
    worst = max(best["true_peak_db"], best["ffmpeg_true_peak_db"] if best["ffmpeg_true_peak_db"] is not None else -144)
    best["reached"] = abs(best["lufs"] - target) <= tol and worst <= tp_limit + 0.05
    return best


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src"); ap.add_argument("out")
    ap.add_argument("--lufs", type=float, default=-9.0)
    ap.add_argument("--true-peak", type=float, default=-1.0)
    ap.add_argument("--tail", type=float, default=0.0, help="seconds kept after the end, for reverb and delay tails")
    ap.add_argument("--bit-depth", default="24", choices=["16", "24", "32f"])
    ap.add_argument("--tolerance", type=float, default=0.1)
    ap.add_argument("--ladder", help="several targets, e.g. -11,-10,-9,-8: one file each")
    ap.add_argument("--save-session", help="also save the session with the final setting (a new .scraft)")
    a = ap.parse_args()
    if os.path.abspath(a.src) == os.path.abspath(a.out):
        sys.exit("the output would replace the input: choose another name")
    targets = [float(x) for x in a.ladder.split(",")] if a.ladder else [a.lufs]
    with tempfile.TemporaryDirectory() as tmp:
        job = Job(a.src, a.tail, tmp)
        for t in targets:
            best = land(job, t, a.true_peak, a.tolerance, tmp)
            out = a.out
            if a.ladder:
                base, ext = os.path.splitext(a.out)
                out = "%s (%g LUFS)%s" % (base, t, ext)
            if os.path.exists(out):
                sys.exit("%s is there already: earlier outputs stay, choose a new name" % out)
            final = job.bounce(best["threshold"], best["ceiling"], out, a.bit_depth,
                               save=a.save_session if not a.ladder else None)
            best.update({"target_lufs": t, "true_peak_limit": a.true_peak, "path": final.get("path", out),
                         "lufs": round(final["lufs"], 2), "true_peak_db": round(final["true_peak_db"], 2),
                         "seconds": final["seconds"]})
            print(json.dumps(best))


if __name__ == "__main__":
    main()
