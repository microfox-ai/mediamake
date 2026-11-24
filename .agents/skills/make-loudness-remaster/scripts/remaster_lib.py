"""Shared measuring for make-loudness-remaster: loudness, true peak and loudness range of a file.

No engine is loaded here, so measure.py and review.py run anywhere ffmpeg is, with or without REAPER
or SoundCraft. Needs numpy, soundfile and pyloudnorm (the scripts name them for `uv run`; the
reaper-mcp-server tool's Python has them too).
"""
import json
import re
import subprocess

import pyloudnorm as pyln
import soundfile as sf


def lufs(path):
    x, sr = sf.read(str(path), always_2d=True)
    return float(pyln.Meter(sr).integrated_loudness(x))


def ffmpeg_meters(path):
    """(loudness range in LU, true peak in dBTP to two decimals), from one ffmpeg pass (slow: a few seconds a song).

    The true peak is loudnorm's reading, which takes the louder channel. ebur128's own summary line
    ("Peak:") reports the left channel only: a master whose right side peaks higher read up to
    several dB low with it, and passed a limit it was over.
    """
    out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path),
                          "-af", "ebur128,loudnorm=print_format=json", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    tail = out[out.rfind("Summary:"):]
    lra = float(re.search(r"LRA:\s+([-+\d.]+)", tail).group(1))
    block = re.search(r"\{[^{}]*\"input_tp\"[^{}]*\}", out, re.S)
    tp = json.loads(block.group(0))["input_tp"]
    return lra, (float("-inf") if "inf" in tp else float(tp))


def true_peak(path):
    """True peak in dBTP of the louder channel, to two decimals (catches the peaks between samples)."""
    return ffmpeg_meters(path)[1]


def true_peak_fast(path):
    """True peak in dBTP of the louder channel, to one decimal, in about a second a song: for tuning.

    ebur128 reads one channel right, so a stereo file is split and each side read by itself.
    """
    if sf.info(str(path)).channels != 2:
        return true_peak(path)
    out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-filter_complex",
                          "channelsplit=channel_layout=stereo[l][r];[l]ebur128=peak=true[lo];[r]ebur128=peak=true[ro]",
                          "-map", "[lo]", "-f", "null", "-", "-map", "[ro]", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    peaks = [float(p) for p in re.findall(r"^\s+Peak:\s+([-+\d.]+)", out, re.M)]
    return max(peaks) if len(peaks) == 2 else true_peak(path)


def sample_rate(path):
    return sf.info(str(path)).samplerate


def seconds(path):
    info = sf.info(str(path))
    return info.frames / info.samplerate
