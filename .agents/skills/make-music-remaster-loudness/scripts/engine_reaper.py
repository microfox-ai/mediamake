"""The REAPER engine for the ladder: the mix on one track, ReaLimit on the master, nothing else.

Runs in the reaper-mcp-server tool environment, which has reapy:
    "$(uv tool dir)/reaper-mcp-server/bin/python" ladder.py ... --engine=reaper
REAPER must be open with reapy's distant API enabled (see SKILL.md, "Setup").
"""
import base64
import re
import sys
from pathlib import Path

from remaster_lib import sample_rate

try:
    import reapy
    from reapy import reascript_api as R
    reapy.connect()
except Exception as e:  # reapy missing, or REAPER closed
    sys.exit("The REAPER engine needs REAPER open and the reaper-mcp-server tool's Python "
             f"(SKILL.md, Setup): {type(e).__name__}: {e}\n"
             "Or build this ladder with --engine=soundcraft, which needs nothing open.")

NAME = "REAPER"
LIMITER = "ReaLimit"
RELEASES = (40, 80, 150)   # dB/s; 40 is the cleanest, faster ones get past the stall near -8.7
RELEASE_UNIT = "dB/s"
CEILING = -1.5             # ReaLimit's ceiling is a sample peak; -1.5 keeps the true peak near -1.0
MAX_DRIVE = 40.0           # dB of gain into the limiter, far past any step a ladder asks for

NEW_PROJECT_TAB = 40859        # File: New project tab (never touches the project the user has open)
SELECT_ALL_ITEMS = 40182
SET_MEDIA_ONLINE = 40439       # REAPER can leave items offline after a reload: silent renders
UNSELECT_ALL_ITEMS = 40289
RENDER_PROJECT = 42230         # render with the most recent settings, auto-close the render dialog


def session_file(out, title):
    return Path(out) / f"{title} - original louder.rpp"


def start(mix, out, title):
    """Open the ladder's session in a new project tab; build it when it isn't there yet.

    A project with no file path must never be saved with Main_SaveProject: that opens REAPER's
    Save As dialog, which freezes REAPER and every reapy call until someone clicks Cancel.
    """
    rpp = session_file(out, title)
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


def _shown(tr, fx, i, v):
    s = R.TrackFX_FormatParamValueNormalized(tr, fx, i, v, "", 64)[5]
    if "inf" in s:
        return float("-inf") if "-" in s else float("inf")
    m = re.search(r"[-+]?\d+(\.\d+)?", s)
    return float(m.group()) if m else 0.0


def _set_display(tr, fx, i, target):
    """Set a plugin parameter so REAPER shows target (bisection over REAPER's own formatter)."""
    rising = _shown(tr, fx, i, 0.25) < _shown(tr, fx, i, 0.75)
    lo, hi = 0.0, 1.0
    for _ in range(40):
        mid = (lo + hi) / 2
        short = _shown(tr, fx, i, mid) < target if rising else _shown(tr, fx, i, mid) > target
        lo, hi = (mid, hi) if short else (lo, mid)
    R.TrackFX_SetParamNormalized(tr, fx, i, hi)
    return R.TrackFX_GetFormattedParamValue(tr, fx, i, "", 64)[4]


def _set_limiter(drive, ceiling, release):
    """The master's only effect: ReaLimit. Its threshold drives the level in (CEILING - threshold = drive)."""
    with reapy.inside_reaper():          # without this, a backgrounded REAPER answers ~1 call per cycle
        m = R.GetMasterTrack(0)
        for i in range(R.TrackFX_GetCount(m) - 1, -1, -1):
            R.TrackFX_Delete(m, i)
        fx = R.TrackFX_AddByName(m, "ReaLimit", False, -1)
        return [_set_display(m, fx, i, v) for i, v in ((0, CEILING - drive), (1, ceiling), (2, release))]


def render(drive, ceiling, release, target, rate):
    """Render the whole project to a 24-bit WAV at target (REAPER adds the extension).

    An existing file there would raise REAPER's overwrite prompt, which blocks it like a dialog,
    so that is refused before REAPER is asked.
    """
    _set_limiter(drive, ceiling, release)
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


def settings(drive, ceiling, release):
    return f"ReaLimit threshold {CEILING - drive:.2f}, ceiling {ceiling:.1f}, release {release} dB/s"


def finish(drive, ceiling, release):
    """Leave the session on the last step's settings and save it."""
    _set_limiter(drive, ceiling, release)
    with reapy.inside_reaper():
        R.Main_SaveProject(0, False)                 # safe: start() always gives the tab a path
