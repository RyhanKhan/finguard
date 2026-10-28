"""Verify fixed local bundles against independently reviewed release-catalog pins."""

import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import stat
import sys

from lightgbm import Booster
from .catalog import CATALOG
from .contracts import DataValidationError, ArtifactManifest

VERSIONS = {
    "numpy": "2.2.6",
    "pandas": "2.2.3",
    "scipy": "1.14.1",
    "lightgbm": "4.6.0",
    "threadpoolctl": "3.7.0",
}
FILES = {
    "fraud": {"model.txt", "contract.json", "policy.json"},
    "credit": {"model.txt", "contract.json", "bands.json"},
}


def digest(contents):
    return hashlib.sha256(contents).hexdigest()


def json_bytes(contents):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise DataValidationError("Duplicate JSON keys")
            result[key] = value
        return result

    def invalid(value):
        raise DataValidationError("Nonfinite JSON constant")

    return json.loads(contents, object_pairs_hook=pairs, parse_constant=invalid)


def read_regular(path, limit):
    fd = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    try:
        info = os.fstat(fd)
        if (
            not stat.S_ISREG(info.st_mode)
            or info.st_nlink != 1
            or info.st_size > limit
            or path.is_symlink()
        ):
            raise DataValidationError("Unsafe artifact file")
        with os.fdopen(fd, "rb", closefd=False) as stream:
            data = stream.read(limit + 1)
        if len(data) > limit:
            raise DataValidationError("Artifact exceeds size limit")
        return data
    finally:
        os.close(fd)


def load_bundle(directory, kind):
    """Return one verified model plus decoded payloads; no second model-file read."""
    try:
        root = Path(directory)
        if root.is_symlink() or not root.is_dir():
            raise DataValidationError("Unsafe or missing artifact directory")
        if kind not in CATALOG:
            raise DataValidationError("Unapproved inference release")
        allowed = FILES[kind] | {"manifest.json"}
        if {p.name for p in root.iterdir()} != allowed:
            raise DataValidationError("Missing or unexpected artifact files")
        contents = read_regular(root / "manifest.json", 65536)
        if digest(contents) != CATALOG[kind]["manifest_sha256"]:
            raise DataValidationError("Untrusted manifest SHA-256")
        manifest = ArtifactManifest.model_validate(json_bytes(contents)).model_dump()
        if (
            manifest["schema_version"] != 1
            or manifest["release_id"] != f"{kind}-inference-v1"
            or manifest["module"] != kind
        ):
            raise DataValidationError("Inference manifest contract mismatch")
        if set(manifest["payloads"]) != FILES[kind]:
            raise DataValidationError("Unsafe payload inventory")
        if sys.version_info[:2] != (3, 12) or manifest["runtime_versions"] != VERSIONS:
            raise DataValidationError("Unsupported runtime contract")
        for package, expected in VERSIONS.items():
            if importlib.metadata.version(package) != expected:
                raise DataValidationError("Incompatible runtime version")
        data = {}
        for name, entry in manifest["payloads"].items():
            # Fixed inventory above excludes absolute paths, traversal and nested paths.
            raw = read_regular(root / name, 8 * 1024 * 1024)
            if len(raw) != entry["size"] or digest(raw) != entry["sha256"]:
                raise DataValidationError("Payload SHA-256 or size mismatch")
            data[name] = raw
        model = Booster(model_str=data["model.txt"].decode("utf8"))
        dump = model.dump_model()
        if (
            dump["objective"] != "binary sigmoid:1"
            or model.num_trees() != manifest["trees"]
            or model.feature_name() != manifest["transformed_features"]
            or model.num_feature() != len(manifest["transformed_features"])
        ):
            raise DataValidationError("Native model contract mismatch")
        if manifest["trees"] != (300 if kind == "fraud" else 200):
            raise DataValidationError("Unapproved native tree count")
        return (
            model,
            {name: json_bytes(raw) for name, raw in data.items() if name != "model.txt"},
            manifest,
        )
    except DataValidationError:
        raise
    except Exception:
        raise DataValidationError("Cannot load verified portable inference artifacts") from None


def export_metadata(service, kind):
    return dict(
        portable_release_id=service.manifest["release_id"],
        portable_manifest_sha256=CATALOG[kind]["manifest_sha256"],
        native_model_sha256=service.manifest["payloads"]["model.txt"]["sha256"],
    )
