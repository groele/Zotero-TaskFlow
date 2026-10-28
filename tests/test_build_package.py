import importlib.util
import hashlib
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("build_package", ROOT / "scripts" / "build-package.py")
build_package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_package)
matching_update_entry = build_package.matching_update_entry
validate_update_hash = build_package.validate_update_hash


class MatchingUpdateEntryTests(unittest.TestCase):
    def test_release_requires_matching_public_feed_entry(self):
        with self.assertRaisesRegex(ValueError, "matching manifest.json version"):
            matching_update_entry([], "12.6.5", candidate=False)

    def test_unreleased_candidate_can_be_built_without_public_feed_entry(self):
        self.assertIsNone(matching_update_entry([], "12.6.5", candidate=True))

    def test_existing_entry_is_returned_for_release_validation(self):
        entry = {"version": "12.6.5", "update_link": "https://example.invalid/taskflow.xpi"}
        self.assertIs(matching_update_entry([entry], "12.6.5", candidate=False), entry)

    def test_release_checksum_must_match_package_bytes(self):
        content = b"test xpi bytes"
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            package = Path(directory) / "package.xpi"
            package.write_bytes(content)
            validate_update_hash({"update_hash": "sha256:" + hashlib.sha256(content).hexdigest()}, package)

    def test_release_checksum_mismatch_is_rejected(self):
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            package = Path(directory) / "package.xpi"
            package.write_bytes(b"test xpi bytes")
            with self.assertRaisesRegex(ValueError, "does not match"):
                validate_update_hash({"update_hash": "sha256:" + "0" * 64}, package)


if __name__ == "__main__":
    unittest.main()
