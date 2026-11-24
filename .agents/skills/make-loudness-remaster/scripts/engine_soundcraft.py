"""The SoundCraft engine for the ladder: the mix on one track, the Maximizer on the master, nothing else.

Nothing has to be open: soundcraft-cli runs the steps with no window and no audio device (on a Mac,
Windows or Linux, and in a cloud session). Its signal path is bit-exact when the limiter is idle: the
mix imported and bounced with no plugin nulls against the file.
"""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from remaster_lib import sample_rate, seconds

NAME = "SoundCraft"
LIMITER = "Maximizer"
RELEASES = (100, 50, 20)   # ms; a longer release limits more gently and stops lower, so the slowest comes first
RELEASE_UNIT = "ms"
CEILING = -1.5             # the Maximizer's ceiling is a sample peak; the ladder lowers it until the true peak fits
MAX_DRIVE = 30.0           # the Maximizer's threshold stops at -30 dB

_job = {}


def cli():
    for c in (shutil.which("soundcraft-cli"), os.path.expanduser("~/.local/bin/soundcraft-cli")):
        if c and os.path.exists(c):
            return c
    sys.exit("The SoundCraft engine needs soundcraft-cli (the use-soundcraft skill says how to install it). "
             "Or build this ladder with --engine=reaper.")


def session_file(out, title):
    return Path(out) / f"{title} - original louder (SoundCraft).steps.txt"


def start(mix, out, title):
    _job.update(cli=cli(), mix=str(Path(mix).resolve()), rate=sample_rate(mix), length=seconds(mix),
                steps=session_file(out, title), scratch=Path(out) / ".ladder-temp")


def _steps(drive, ceiling, release):
    """The whole session: the mix at its own sample rate, a master, one limiter."""
    drive = min(max(drive, 0.0), 30.0)   # the Maximizer's threshold runs from 0 to -30 dB
    return [("session.new", {"name": "original louder", "sample_rate": _job["rate"], "bit_depth": 24}),
            ("file.import_audio", {"path": _job["mix"]}),
            ("track.new", {"kind": "master", "format": "stereo", "name": "MASTER"}),
            ("mix.insert", {"track": "MASTER", "plugin": "maximizer",
                            "params": {"threshold": round(-drive, 3), "ceiling": round(ceiling, 3), "release": release}})]


def _write(path, steps, note):
    with open(path, "w") as f:
        f.write(f"# {note}\n")
        for cid, params in steps:
            f.write(cid + " " + json.dumps(params) + "\n")


def render(drive, ceiling, release, target, rate):
    """Bounce the whole mix to a 24-bit WAV at target, at the mix's own sample rate, no dither."""
    target = Path(target).with_suffix(".wav")
    assert not target.exists(), f"{target} exists: renders are never overwritten"
    steps = _steps(drive, ceiling, release) + [
        ("file.bounce_mix", {"path": str(target), "bit_depth": "24", "dither": False,
                             "start": {"seconds": 0}, "end": {"seconds": _job["length"]}})]
    script = _job["scratch"] / "soundcraft-steps.txt"
    _write(script, steps, "one render of the ladder")
    p = subprocess.run([_job["cli"], "script", str(script)], capture_output=True, text=True)
    assert p.returncode == 0 and target.is_file(), f"SoundCraft did not write {target}: {p.stderr.strip()[-400:]}"


def settings(drive, ceiling, release):
    return f"Maximizer threshold {-min(max(drive, 0.0), 30.0):.2f}, ceiling {ceiling:.1f}, release {release} ms"


def finish(drive, ceiling, release):
    """Keep the last step's session as a step list: soundcraft-cli script "<it>" --save "<name>.scraft" opens in SoundCraft."""
    _write(_job["steps"], _steps(drive, ceiling, release),
           'the ladder\'s last step. To open it in SoundCraft: soundcraft-cli script "<this file>" --save "<name>.scraft"')
