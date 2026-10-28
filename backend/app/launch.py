"""Single-process portfolio launcher with platform PORT and optional private secrets."""

import os
from pathlib import Path
from tempfile import TemporaryDirectory
import uvicorn
from backend.app.settings import Settings, configured_port
from backend.app.provision import stage_secret_files


def serve():
    # Validate operator security configuration before loading or serving anything.
    Settings.from_environment()
    uvicorn.run(
        "backend.app.main:app",
        host="0.0.0.0",
        port=configured_port(),
        workers=1,
        proxy_headers=False,
        access_log=False,
        limit_concurrency=16,
        timeout_keep_alive=5,
    )


def main():
    Settings.from_environment()
    configured_port()
    source = os.environ.get("FINGUARD_SECRET_FILES_DIR")
    if source:
        with TemporaryDirectory(prefix="finguard-private-") as private:
            root = Path(private) / "models"
            stage_secret_files(source, root)
            os.environ["FINGUARD_INFERENCE_ROOT"] = str(root)
            serve()
    else:
        serve()


if __name__ == "__main__":
    main()
