"""mlx-whisper word timestamps on the vocal stem: an independent cross-check for the
CTC alignment (Apple Silicon only; align.py runs without it).

The initial prompt lists the lyric's rare words (names, jargon) so Whisper spells them
the way the lyric does, which makes its words easier to match to lyric tokens.

Run:  uv run python whisper_run.py <slug> [turbo|large]
Out:  analysis/work/whisper.json
"""
import common
import re
import sys
from collections import Counter

import soundfile as sf

MODELS = {
    "turbo": "mlx-community/whisper-large-v3-turbo",
    "large": "mlx-community/whisper-large-v3-mlx",
}


def rare_words(lines, k=40):
    words = Counter(w.strip(".,!?;:\"'()") for l in lines for w in l["text"].split())
    caps = [w for w in words if w[:1].isupper() and len(w) > 3 and w.lower() not in COMMON]
    return sorted(caps, key=lambda w: -words[w])[:k]


COMMON = set("the and that this with from your what when where while there they them then just "
             "have been into about would could should never ever every".split())


def run(proj, which="turbo"):
    import mlx_whisper
    y, sr = proj.load_stem("vocals", sr=16000)
    wav16 = proj.work / "vocals16k.wav"
    sf.write(wav16, y, 16000)
    lines = proj.lyrics()
    prompt = "Song lyrics. " + ", ".join(rare_words(lines)) + "."
    res = mlx_whisper.transcribe(
        str(wav16), path_or_hf_repo=MODELS[which], language="en", word_timestamps=True,
        condition_on_previous_text=False, initial_prompt=prompt, temperature=0.0,
        no_speech_threshold=None, hallucination_silence_threshold=None,
    )
    common.write_json(proj.work / "whisper.json", res)
    n = sum(len(s.get("words", [])) for s in res["segments"])
    print(f"whisper ({which}): {len(res['segments'])} segments, {n} words")
    return res


def words(proj):
    """[(text, start, end)] from work/whisper.json, or [] when whisper was not run."""
    import json
    p = proj.work / "whisper.json"
    if not p.exists():
        return []
    W = json.loads(p.read_text())
    return [(re.sub(r"\s+", "", w["word"]), w["start"], w["end"])
            for s in W["segments"] for w in s.get("words", [])]


if __name__ == "__main__":
    proj = common.project_from_argv()
    run(proj, next((a for a in sys.argv[2:] if a in MODELS), "turbo"))
