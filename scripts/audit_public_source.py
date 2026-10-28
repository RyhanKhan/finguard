"""Verify the reviewed source allowlist; never stage, copy or rewrite a manifest."""

import argparse
import hashlib
import json
from pathlib import Path
import re

GENERATED = {
    ".venv",
    "node_modules",
    ".next",
    "__pycache__",
    ".pytest_cache",
    "build",
    "dist",
    "test-results",
    "playwright-report",
    "coverage",
}
FORBIDDEN_DIRS = {".git", ".aws", ".codex", "private", "models", "artifacts", "data", "datasets"}
FORBIDDEN_SUFFIXES = {
    ".csv",
    ".xls",
    ".xlsx",
    ".npz",
    ".npy",
    ".pkl",
    ".pickle",
    ".joblib",
    ".pem",
    ".key",
}
MANIFEST = "release/source_inventory.json"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_files(root, allow_git=False):
    for p in sorted(root.rglob("*")):
        rel = p.relative_to(root)
        if allow_git and ".git" in rel.parts:
            continue
        if any(part in GENERATED or part.endswith(".egg-info") for part in rel.parts):
            continue
        if p.name.endswith(".tsbuildinfo") or p.name == "next-env.d.ts":
            continue
        if any(part in FORBIDDEN_DIRS for part in rel.parts):
            raise AssertionError("Private/data/history directory present: " + str(rel))
        if p.is_symlink():
            raise AssertionError("Source symlink refused: " + str(rel))
        if p.is_file():
            yield p


def audit(root, allow_git=False):
    root = Path(root).resolve()
    manifest = json.loads((root / MANIFEST).read_text())
    expected = manifest["files"]
    for name, sha in expected.items():
        rel = Path(name)
        if (
            rel.is_absolute()
            or ".." in rel.parts
            or rel.as_posix() != name
            or not re.fullmatch(r"[0-9a-f]{64}", sha)
        ):
            raise AssertionError("Unsafe inventory entry")
    actual = {str(p.relative_to(root)): p for p in source_files(root, allow_git=allow_git)}
    if set(actual) != set(expected) | {MANIFEST}:
        raise AssertionError(
            "Source inventory mismatch: "
            + json.dumps(
                {
                    "extra": sorted(set(actual) - set(expected) - {MANIFEST}),
                    "missing": sorted(set(expected) - set(actual)),
                }
            )
        )
    for name, p in actual.items():
        if name != MANIFEST and digest(p) != expected[name]:
            raise AssertionError("Source checksum mismatch: " + name)
        if p.suffix.lower() in FORBIDDEN_SUFFIXES or p.name == "model.txt":
            raise AssertionError("Private data/model/credential file refused: " + name)
        if p.name.startswith(".env") and name not in {".env.example", "frontend/.env.example"}:
            raise AssertionError("Local environment file refused: " + name)
        try:
            text = p.read_text()
        except UnicodeError:
            if p.suffix != ".png":
                raise AssertionError("Unreviewed binary file: " + name)
            continue
        for label, pattern in [
            ("developer home path", r"/(?:Users|home)/[^/\s\"']+"),
            ("developer temp path", r"/(?:private/tmp|var/folders)/[^\s\"']+"),
            ("private key", r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
            ("service token", r"(?:ghp_|github_pat_|sk-proj-|xox[baprs]-)[A-Za-z0-9_-]{20,}"),
            ("AWS access key", r"(?:AKIA|ASIA)[A-Z0-9]{16}"),
            ("credential URL", r"https?://[^/\s:@]+:[^/\s@]+@"),
        ]:
            if re.search(pattern, text):
                raise AssertionError(label + " pattern: " + name)
        if p.suffix == ".md" and re.search(
            r"(?i)\b(?:record_id|row_id|quarantined[_ -]?record)[\s_*:=]{1,12}\d{4,}\b", text
        ):
            raise AssertionError("Unnecessary individual record identifier: " + name)
    return {
        "verified_source_files": len(actual),
        "git_history": "not assessed; checkout metadata excluded" if allow_git else False,
        "private_payloads": False,
        "note": "Allowlist/hash and heuristic text checks; visual/content review and legal/security decisions remain independent.",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path, nargs="?", default=Path(__file__).resolve().parents[1])
    parser.add_argument(
        "--allow-git",
        action="store_true",
        help="Audit source in an authorized Git checkout; does not assess history safety",
    )
    args = parser.parse_args()
    print(json.dumps(audit(args.root, allow_git=args.allow_git), indent=2))
