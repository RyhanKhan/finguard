"""Public packaging guard tests use only invented temporary content."""

import hashlib
import json
import pytest
from scripts.audit_public_source import audit


def inventory(root, files):
    (root / "release").mkdir(exist_ok=True)
    (root / "release/source_inventory.json").write_text(json.dumps({"files": files}))


def setup_source(root):
    (root / "README.md").write_text("Invented test source")
    files = {"README.md": hashlib.sha256((root / "README.md").read_bytes()).hexdigest()}
    inventory(root, files)
    return files


def test_small_reviewed_source_is_accepted(tmp_path):
    setup_source(tmp_path)
    assert audit(tmp_path)["verified_source_files"] == 2


@pytest.mark.parametrize("fault", ["extra", "checksum", "traversal", "symlink", "secret"])
def test_public_inventory_fails_closed(tmp_path, fault):
    files = setup_source(tmp_path)
    if fault == "extra":
        (tmp_path / "unexpected.txt").write_text("Unreviewed")
    elif fault == "checksum":
        (tmp_path / "README.md").write_text("Changed")
    elif fault == "traversal":
        inventory(tmp_path, {"../outside.txt": "0" * 64})
    elif fault == "symlink":
        (tmp_path / "README.md").unlink()
        (tmp_path / "README.md").symlink_to(tmp_path / "release/source_inventory.json")
    else:
        (tmp_path / "README.md").write_text("ghp_" + "A" * 36)
        files["README.md"] = hashlib.sha256((tmp_path / "README.md").read_bytes()).hexdigest()
        inventory(tmp_path, files)
    with pytest.raises(AssertionError):
        audit(tmp_path)


@pytest.mark.parametrize("directory", [".git", "private", "models"])
def test_private_or_history_tree_refused_even_if_empty(tmp_path, directory):
    setup_source(tmp_path)
    (tmp_path / directory).mkdir()
    with pytest.raises(AssertionError):
        audit(tmp_path)


def test_explicit_checkout_mode_does_not_certify_git_history(tmp_path):
    setup_source(tmp_path)
    (tmp_path / ".git").mkdir()
    (tmp_path / ".git/HEAD").write_text("Invented test metadata")
    result = audit(tmp_path, allow_git=True)
    assert result["verified_source_files"] == 2
    assert result["git_history"] == "not assessed; checkout metadata excluded"
