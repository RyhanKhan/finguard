"""Stage eight operator-provisioned secret files; no downloads, archives or requests."""

import logging
import os
import stat
from pathlib import Path
import shutil
from finguard_runtime import credit, fraud

logger = logging.getLogger(__name__)
SECRET_FILES = {
    "fraud": {
        "manifest.json": "fraud-manifest.json",
        "model.txt": "fraud-model.txt",
        "contract.json": "fraud-contract.json",
        "policy.json": "fraud-policy.json",
    },
    "credit": {
        "manifest.json": "credit-manifest.json",
        "model.txt": "credit-model.txt",
        "contract.json": "credit-contract.json",
        "bands.json": "credit-bands.json",
    },
}


def _read_secret(source, name, limit=1024 * 1024):
    """Adapt trusted provider links to bytes; staged bundles retain strict verification."""
    if name not in {n for names in SECRET_FILES.values() for n in names.values()}:
        raise ValueError("Unapproved secret filename")
    root = source.resolve(strict=True)
    relative = (root / name).resolve(strict=True).relative_to(root)
    # Resolve Render's links within the provider root, then walk the resolved path
    # by directory descriptors. O_NOFOLLOW on every component prevents a link
    # substitution between resolution and opening from escaping that root.
    directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    directory = os.open(root, directory_flags)
    try:
        for part in relative.parts[:-1]:
            child = os.open(part, directory_flags, dir_fd=directory)
            os.close(directory)
            directory = child
        fd = os.open(
            relative.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory
        )
        try:
            info = os.fstat(fd)
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size > limit:
                raise ValueError("Unsafe secret target")
            with os.fdopen(fd, "rb", closefd=False) as stream:
                data = stream.read(limit + 1)
            if len(data) > limit:
                raise ValueError("Secret exceeds size limit")
            return data
        finally:
            os.close(fd)
    finally:
        os.close(directory)


def stage_secret_files(source, destination):
    """Only a fresh private destination is accepted. Each module verifies independently."""
    source, destination = Path(source), Path(destination)
    if destination.exists():
        raise ValueError("Fresh staging directory required")
    destination.mkdir(mode=0o700)
    status = {}
    for kind, filenames in SECRET_FILES.items():
        target = destination / f"{kind}-inference-v1"
        try:
            target.mkdir(mode=0o700)
            for filename, secret in filenames.items():
                # Only trusted in-directory provider links; native verifier remains unchanged.
                data = _read_secret(source, secret)
                with (target / filename).open("xb") as stream:
                    stream.write(data)
                (target / filename).chmod(0o400)
            (fraud if kind == "fraud" else credit).load_scorer(target)
            status[kind] = True
        except Exception:
            shutil.rmtree(target)
            logger.error("%s secret provisioning failed; module remains unavailable.", kind.title())
            status[kind] = False
    return status
