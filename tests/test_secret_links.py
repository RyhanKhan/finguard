"""Provider symlinks are adapted only inside an operator-trusted secret root."""

import os
from pathlib import Path
import shutil
import pytest
from backend.app.provision import SECRET_FILES, _read_secret, stage_secret_files
from finguard_runtime import credit


def provider_links(root):
    root.mkdir()
    version = root / "..version"
    version.mkdir()
    (root / "..data").symlink_to(version.name, target_is_directory=True)
    return version


def test_render_style_relative_links(tmp_path):
    root = tmp_path / "secrets"
    version = provider_links(root)
    (version / "credit-model.txt").write_bytes(b"invented target bytes\n")
    (root / "credit-model.txt").symlink_to("..data/credit-model.txt")
    assert _read_secret(root, "credit-model.txt") == b"invented target bytes\n"


@pytest.mark.parametrize("name", ["../outside", "/outside", "nested/credit-model.txt", "other.txt"])
def test_unapproved_names_rejected_before_io(tmp_path, name):
    with pytest.raises(ValueError, match="Unapproved"):
        _read_secret(tmp_path, name)


@pytest.mark.parametrize("fault", ["outside", "outside-parent", "missing", "broken", "loop", "directory", "fifo", "hardlink", "oversized"])
def test_unsafe_or_missing_targets_rejected(tmp_path, fault):
    root = tmp_path / "secrets"
    root.mkdir()
    target = root / "credit-model.txt"
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "payload").write_bytes(b"invented")
    if fault == "outside":
        target.symlink_to(outside / "payload")
    elif fault == "outside-parent":
        (root / "..data").symlink_to(outside, target_is_directory=True)
        target.symlink_to("..data/payload")
    elif fault == "broken":
        target.symlink_to("missing")
    elif fault == "loop":
        target.symlink_to(target.name)
    elif fault == "directory":
        target.mkdir()
    elif fault == "fifo":
        os.mkfifo(target)
    elif fault == "hardlink":
        os.link(outside / "payload", target)
    elif fault == "oversized":
        target.write_bytes(b"x" * 33)
    with pytest.raises((OSError, ValueError, RuntimeError)):
        _read_secret(root, target.name, limit=32)


def test_directory_link_substitution_during_open_is_rejected(tmp_path, monkeypatch):
    root = tmp_path / "secrets"
    version = provider_links(root)
    (version / "credit-model.txt").write_bytes(b"inside")
    (root / "credit-model.txt").symlink_to("..data/credit-model.txt")
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "credit-model.txt").write_bytes(b"outside")
    original = os.open

    def substitute(path, flags, **kwargs):
        if path == "..version":
            version.rename(root / "..old-version")
            version.symlink_to(outside, target_is_directory=True)
        return original(path, flags, **kwargs)

    monkeypatch.setattr(os, "open", substitute)
    with pytest.raises(OSError):
        _read_secret(root, "credit-model.txt")


@pytest.mark.parametrize("fault", [None, "missing", "corrupt-model", "corrupt-manifest"])
def test_credit_render_links_preserve_verification_and_module_isolation(
    models, tmp_path, credit_input, fault, caplog
):
    root = tmp_path / "secrets"
    version = provider_links(root)
    for original, flat in SECRET_FILES["credit"].items():
        shutil.copyfile(models / "credit-inference-v1" / original, version / flat)
        (root / flat).symlink_to(Path("..data") / flat)
    if fault == "missing":
        (version / "credit-model.txt").unlink()
    elif fault == "corrupt-model":
        (version / "credit-model.txt").write_bytes(b"INVENTED_CORRUPTION")
    elif fault == "corrupt-manifest":
        (version / "credit-manifest.json").write_bytes(b"{}")
    destination = tmp_path / "staged"
    result = stage_secret_files(root, destination)
    assert result == {"fraud": False, "credit": fault is None}
    target = destination / "credit-inference-v1"
    if fault is None:
        for original in SECRET_FILES["credit"]:
            staged = target / original
            assert not staged.is_symlink()
            assert staged.stat().st_mode & 0o777 == 0o400
            assert staged.read_bytes() == (models / "credit-inference-v1" / original).read_bytes()
        score = credit.load_scorer(target).score_one(credit_input)
        assert score["raw_default_risk_score"] == 0.24888492804155674
        assert score["relative_risk_band"] == 4
    else:
        assert not target.exists()
    assert "INVENTED_CORRUPTION" not in caplog.text and str(tmp_path) not in caplog.text
