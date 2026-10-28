"""Stage eight operator-provisioned secret files; no downloads, archives or requests."""

import logging
from pathlib import Path
import shutil
from finguard_runtime import credit, fraud
from finguard_runtime.integrity import read_regular

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
                # Fixed names, regular files/no links, bounded reads; native verifier remains unchanged.
                data = read_regular(source / secret, 1024 * 1024)
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
