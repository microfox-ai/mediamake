"""Shared helpers for make-loudness-remaster: drive REAPER through reapy, measure loudness and true peak.

Runs in the reaper-mcp-server tool environment, which has reapy, numpy, soundfile and pyloudnorm:
    "$(uv tool dir)/reaper-mcp-server/bin/python" <script> ...
REAPER must be open with reapy's distant API enabled (see SKILL.md, "Setup").
"""
import base64
import re
import subprocess
from pathlib import Path

import pyloudnorm as pyln
import soundfile as sf
import reapy
from reapy import reascript_api as R

reapy.connect()

NEW_PROJECT_TAB = 40859        # File: New project tab (never touches the project the user has open)
SELECT_ALL_ITEMS = 40182
SET_MEDIA_ONLINE = 40439       # REAPER can leave items offline after a reload: silent renders
UNSELECT_ALL_ITEMS = 40289
RENDER_PROJECT = 42230         # render with the most recent settings, auto-close the render dialog


def lufs(path):
    x, sr = sf.read(str(path), always_2d=True)
    return pyln.Meter(sr).integrated_loudness(x)


def true_peak(path):
    """True peak in dBTP from ffmpeg's EBU R128 meter (catches the peaks between samples)."""
    out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path),
                          "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    return float(re.search(r"Peak:\s+([-+\d.]+)", out[out.rfind("Summary:"):]).group(1))


def sample_rate(path):
    return sf.info(str(path)).samplerate


def open_session(rpp, mix=None):
    """Open rpp in a new project tab; with mix and no rpp yet, build it: the mix on one track, nothing else.

    A project with no file path must never be saved with Main_SaveProject: that opens REAPER's
    Save As dialog, which freezes REAPER and every reapy call until someone clicks Cancel.
    """
    rpp = Path(rpp)
    with reapy.inside_reaper():
        R.Main_OnCommand(NEW_PROJECT_TAB, 0)
        if rpp.exists():
            R.Main_openProject("noprompt:" + str(rpp))
            return
        sr = float(sample_rate(mix))
        R.GetSetProjectInfo(0, "PROJECT_SRATE", sr, True)
        R.GetSetProjectInfo(0, "PROJECT_SRATE_USE", 1.0, True)
        R.InsertTrackAtIndex(0, True)
        tr = R.GetTrack(0, 0)
        R.GetSetMediaTrackInfo_String(tr, "P_NAME", "Original mix", True)
        R.SetOnlyTrackSelected(tr)
        R.SetEditCurPos(0, False, False)
        R.InsertMedia(str(mix), 0)
        R.Main_SaveProjectEx(0, str(rpp), 0)
    with reapy.inside_reaper():
        R.Main_openProject("noprompt:" + str(rpp))   # reopen so the tab owns the file path


def save():
    with reapy.inside_reaper():
        R.Main_SaveProject(0, False)                 # safe: open_session always gives the tab a path


def _shown(tr, fx, i, v):
    s = R.TrackFX_FormatParamValueNormalized(tr, fx, i, v, "", 64)[5]
    if "inf" in s:
        return float("-inf") if "-" in s else float("inf")
    m = re.search(r"[-+]?\d+(\.\d+)?", s)
    return float(m.group()) if m else 0.0


def set_display(tr, fx, i, target):
    """Set a plugin parameter so REAPER shows target (bisection over REAPER's own formatter)."""
    rising = _shown(tr, fx, i, 0.25) < _shown(tr, fx, i, 0.75)
    lo, hi = 0.0, 1.0
    for _ in range(40):
        mid = (lo + hi) / 2
        short = _shown(tr, fx, i, mid) < target if rising else _shown(tr, fx, i, mid) > target
        lo, hi = (mid, hi) if short else (lo, mid)
    R.TrackFX_SetParamNormalized(tr, fx, i, hi)
    return R.TrackFX_GetFormattedParamValue(tr, fx, i, "", 64)[4]


def set_limiter(threshold, ceiling, release):
    """The master's only effect: ReaLimit. Its threshold drives the level in (ceiling - threshold = gain)."""
    with reapy.inside_reaper():          # without this, a backgrounded REAPER answers ~1 call per cycle
        m = R.GetMasterTrack(0)
        for i in range(R.TrackFX_GetCount(m) - 1, -1, -1):
            R.TrackFX_Delete(m, i)
        fx = R.TrackFX_AddByName(m, "ReaLimit", False, -1)
        return [set_display(m, fx, i, v) for i, v in ((0, threshold), (1, ceiling), (2, release))]


def render(target, rate):
    """Render the whole project to a 24-bit WAV at target (REAPER adds the extension).

    An existing file there would raise REAPER's overwrite prompt, which blocks it like a dialog,
    so that is refused before REAPER is asked.
    """
    target = Path(target).with_suffix("")
    assert not target.with_suffix(".wav").exists(), f"{target}.wav exists: renders are never overwritten"
    with reapy.inside_reaper():
        R.Main_OnCommand(SELECT_ALL_ITEMS, 0)
        R.Main_OnCommand(SET_MEDIA_ONLINE, 0)
        R.Main_OnCommand(UNSELECT_ALL_ITEMS, 0)
        src = R.GetMediaItemTake_Source(R.GetActiveTake(R.GetMediaItem(0, 0)))
        assert R.GetMediaSourceLength(src, False)[0] > 1, "the mix is offline in REAPER"
        R.GetSetProjectInfo_String(0, "RENDER_FILE", str(target.parent), True)
        R.GetSetProjectInfo_String(0, "RENDER_PATTERN", target.stem, True)
        R.GetSetProjectInfo_String(0, "RENDER_FORMAT", base64.b64encode(b"evaw" + bytes([24, 0, 1])).decode(), True)
        R.GetSetProjectInfo(0, "RENDER_SRATE", float(rate), True)
        R.GetSetProjectInfo(0, "RENDER_CHANNELS", 2.0, True)
        R.GetSetProjectInfo(0, "RENDER_BOUNDSFLAG", 1.0, True)   # entire project
        R.GetSetProjectInfo(0, "RENDER_ADDTOPROJ", 0.0, True)
    R.Main_OnCommand(RENDER_PROJECT, 0)
    assert target.with_suffix(".wav").is_file(), f"REAPER did not write {target}"
