"""Display token -> pronunciation spelling for the CTC alignment.

A lyric line is split on spaces into display tokens; each token maps to one or more
sub-words of plain letters (and internal apostrophes). Hyphenated tokens split into
their parts (each part gets its own timing, `syl` in the output), digits are spelled
out, and lone letters become letter names ("S-Rank" -> "ess rank").

Per-project overrides: analysis/pron.json  {"Token": "spelling as said", ...}
(keys match the display token with or without its trailing punctuation).
"""
import json
import re

LETTERS = dict(b="bee", c="see", d="dee", e="ee", f="eff", g="gee", h="aitch", j="jay", k="kay",
               l="el", m="em", n="en", p="pee", q="cue", r="are", s="ess", t="tee", u="you",
               v="vee", w="double you", x="ex", y="why", z="zee")
ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen " \
       "fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def number_words(n: int) -> str:
    if n < 20:
        return ONES[n]
    if n < 100:
        return TENS[n // 10] + ("" if n % 10 == 0 else " " + ONES[n % 10])
    if n < 1000:
        rest = n % 100
        return ONES[n // 100] + " hundred" + ("" if rest == 0 else " " + number_words(rest))
    return " ".join(ONES[int(d)] for d in str(n))


class Pron:
    def __init__(self, overrides: dict | None = None):
        self.over = {}
        for k, v in (overrides or {}).items():
            self.over[k] = v
            self.over[k.lower()] = v

    @classmethod
    def for_project(cls, proj):
        p = proj.out / "pron.json"
        return cls(json.loads(p.read_text()) if p.exists() else {})

    def __call__(self, token: str) -> list[str]:
        bare = token.strip(".,!?;:\"“”()")
        for key in (token, bare, bare.lower()):
            if key in self.over:
                return self.over[key].split()
        w = bare.lower().replace("’", "'")
        w = re.sub(r"\d+", lambda m: " " + number_words(int(m.group())) + " ", w)
        w = re.sub(r"[^a-z' ]", " ", w)          # hyphens and the rest become breaks
        parts = [p.strip("'") for p in w.split() if p.strip("'")]
        out = []
        for p in parts:
            out.extend(LETTERS[p].split() if len(p) == 1 and p in LETTERS else [p])
        return out or ["a"]


if __name__ == "__main__":
    import common
    proj = common.project_from_argv()
    pron = Pron.for_project(proj)
    for l in proj.lyrics():
        print(l["text"], "->", " | ".join(" ".join(pron(w)) for w in l["text"].split()))
