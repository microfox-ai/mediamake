# /// script
# requires-python = ">=3.8"
# dependencies = []
# ///
"""Turn a folder of stems into a routed SoundCraft session, ready to mix.

  uv run stems_session.py <stems folder> <out.scraft> [--name "Song"] [--headroom-db -4] [--rate 48000] [--dry]

One track a stem, named by what it is; drums, vocals and everything else each summed on a bus and heard
through a group aux (the group's fader and inserts); a master track; colours by group. The step list is
written beside the session (<out>.steps.txt) so the build can be read, changed and run again.
A stem that comes in several formats is taken once (wav, then flac, aiff, mp3). --dry writes the steps only.
Saving copies every stem into "Audio Files/" beside the session: give each song its own folder.
"""
import argparse, json, os, re, shutil, subprocess, sys

AUDIO = [".wav", ".flac", ".aif", ".aiff", ".mp3", ".m4a", ".ogg"]
GROUPS = [  # first match wins
    ("vox", ["vocal", "vox", "backing", "bv", "choir", "lead voc", "harmon", "adlib", "ad-lib"]),
    ("drums", ["drum", "perc", "kick", "snare", "hat", "cymbal", "tom", "clap", "shaker", "loop"]),
]
COLOURS = {"vox": [240, 196, 60], "drums": [214, 92, 62], "music": [70, 150, 220]}
BUS = {"vox": ("Vox Sum", "VOX BUS"), "drums": ("Drums Sum", "DRUM BUS"), "music": ("Music Sum", "MUSIC BUS")}


def cli():
    for c in (shutil.which("soundcraft-cli"), os.path.expanduser("~/.local/bin/soundcraft-cli")):
        if c and os.path.exists(c):
            return c
    sys.exit("soundcraft-cli not found: install it first (the use-soundcraft skill says how)")


def short_name(stem, common):
    m = re.findall(r"\(([^()]+)\)", stem)
    name = m[-1] if m else stem[len(common):]
    name = re.sub(r"^[\s\-_.]+|[\s\-_.]+$", "", name) or stem
    return name[:24]


def group_of(name):
    low = name.lower()
    for g, words in GROUPS:
        if any(w in low for w in words):
            return g
    return "music"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("folder"); ap.add_argument("out")
    ap.add_argument("--name"); ap.add_argument("--rate", type=int, default=48000)
    ap.add_argument("--headroom-db", type=float, default=-4.0, help="each group aux starts here, so the sum doesn't clip")
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()
    if not a.out.endswith(".scraft"):
        sys.exit("the session's name ends in .scraft")
    if os.path.exists(a.out):
        sys.exit("%s is there already: a new build is a new file" % a.out)
    by_stem = {}
    for f in sorted(os.listdir(a.folder)):
        stem, ext = os.path.splitext(f)
        if ext.lower() in AUDIO and not f.startswith("."):
            if stem not in by_stem or AUDIO.index(ext.lower()) < AUDIO.index(os.path.splitext(by_stem[stem])[1].lower()):
                by_stem[stem] = f
    if not by_stem:
        sys.exit("no audio files in " + a.folder)
    stems = sorted(by_stem)
    common = os.path.commonprefix(stems) if len(stems) > 1 else ""
    names, used = {}, set()
    for s in stems:
        n = short_name(s, common)
        k, base = 2, n
        while n.lower() in used:
            n = "%s %d" % (base, k); k += 1
        used.add(n.lower()); names[s] = n
    groups = {}
    for s in stems:
        groups.setdefault(group_of(names[s]), []).append(names[s])
    steps = [("session.new", {"name": a.name or os.path.splitext(os.path.basename(a.out))[0], "sample_rate": a.rate}),
             ("file.import_audio", {"paths": [os.path.abspath(os.path.join(a.folder, by_stem[s])) for s in stems]})]
    steps += [("track.rename", {"track": s, "name": names[s]}) for s in stems if names[s] != s]
    order = [g for g in ("drums", "music", "vox") if g in groups]
    steps += [("mix.new_bus", {"name": BUS[g][0]}) for g in order]
    steps.append(("track.new", {"rows": [{"kind": "aux", "format": "stereo", "name": BUS[g][1]} for g in order]
                                + [{"kind": "master", "format": "stereo", "name": "MASTER"}]}))
    for g in order:
        steps.append(("track.input", {"tracks": [BUS[g][1]], "input": BUS[g][0]}))
        steps.append(("track.output", {"tracks": groups[g], "output": BUS[g][0]}))
        steps.append(("track.color", {"tracks": groups[g] + [BUS[g][1]], "color": COLOURS[g]}))
        steps.append(("mix.volume", {"tracks": [BUS[g][1]], "db": a.headroom_db}))
    script = os.path.splitext(a.out)[0] + ".steps.txt"
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(script, "w") as f:
        f.write("# built by stems_session.py from %d stems: run again with soundcraft-cli script <this file> --save <new.scraft>\n" % len(stems))
        for cid, params in steps:
            f.write(cid + " " + json.dumps(params) + "\n")
    summary = {"steps": script, "tracks": len(stems), "groups": groups}
    if not a.dry:
        p = subprocess.run([cli(), "script", script, "--save", os.path.abspath(a.out)], capture_output=True, text=True)
        if p.returncode != 0:
            sys.exit("soundcraft-cli failed: " + (p.stderr.strip() or p.stdout.strip())[-600:])
        summary["session"] = os.path.abspath(a.out)
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
