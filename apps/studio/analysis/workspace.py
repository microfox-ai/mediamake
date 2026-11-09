"""Where your work lives, for the studio's Python: the analysis, the AMV and kinetic type scripts, the
brand and thumbnail tools. The same rule as scripts/workspace.ts (read it for the why):

- A workspace is set by MEDIAMAKE_WORKSPACE, else by "workspace" in ~/.mediamake/config.json
  (MEDIAMAKE_CONFIG points at another file). Then every folder is <workspace>/<folder>.
- When none is set, projects, out, brands, thumbnails/jobs and overlays stay in apps/studio; notes,
  skills and extensions are in ~/MediaMake.

Standard library only, so any script can load it: the analysis has it on its path; the others add
apps/studio/analysis to the end of sys.path first. `python3 analysis/workspace.py` prints every folder
as JSON (scripts/workspace.test.ts checks it against the TypeScript).
"""
import json
import os
import sys
from pathlib import Path

STUDIO = Path(os.path.abspath(Path(__file__).parent.parent))  # apps/studio
DEFAULT_WORKSPACE = "~/MediaMake"

FOLDERS = {
    "projects": "projects",
    "out": "out",
    "brands": "brands",
    "thumbnailJobs": "thumbnails/jobs",
    "overlays": "overlays",
    "notes": "notes",
    "skills": "skills",
    "extensions": "extensions",
}
STUDIO_FOLDERS = ("projects", "out", "brands", "thumbnailJobs", "overlays")


def _expand_home(p: str) -> str:
    home = os.path.expanduser("~")
    return home if p == "~" else os.path.join(home, p[2:]) if p.startswith("~/") else p


def _absolute(p: str) -> Path:
    # abspath, like Node's path.resolve: links are not followed
    return Path(os.path.abspath(_expand_home(p)))


def config_file() -> Path:
    return Path(os.environ.get("MEDIAMAKE_CONFIG") or Path(os.path.expanduser("~")) / ".mediamake" / "config.json")


def workspace_setting():
    """(root, "env" | "config"), or None when nothing names a workspace."""
    env = (os.environ.get("MEDIAMAKE_WORKSPACE") or "").strip()
    if env:
        return _absolute(env), "env"
    try:
        value = json.loads(config_file().read_text()).get("workspace")
    except (OSError, ValueError, AttributeError):
        return None
    return (_absolute(value.strip()), "config") if isinstance(value, str) and value.strip() else None


def workspace_root() -> Path:
    s = workspace_setting()
    return s[0] if s else _absolute(DEFAULT_WORKSPACE)


def workspace_dir(name: str, studio: Path = STUDIO) -> Path:
    """Where one of the workspace's folders is (projects, out, brands, thumbnailJobs, overlays, notes, skills, extensions)."""
    if name not in FOLDERS:
        raise KeyError(f"No workspace folder {name!r} ({', '.join(FOLDERS)})")
    rel = FOLDERS[name].split("/")
    s = workspace_setting()
    if s:
        return s[0].joinpath(*rel)
    if name in STUDIO_FOLDERS:
        return Path(os.path.abspath(studio)).joinpath(*rel)
    return _absolute(DEFAULT_WORKSPACE).joinpath(*rel)


def shown(p) -> str:
    """A path to print: relative to apps/studio while it is in there, else in full with ~ for home."""
    p = Path(os.path.abspath(p))
    try:
        return str(p.relative_to(STUDIO))
    except ValueError:
        home = Path(os.path.expanduser("~"))
        try:
            return "~/" + str(p.relative_to(home))
        except ValueError:
            return str(p)


if __name__ == "__main__":
    json.dump({k: str(workspace_dir(k, Path(sys.argv[1]) if len(sys.argv) > 1 else STUDIO)) for k in FOLDERS}, sys.stdout)
