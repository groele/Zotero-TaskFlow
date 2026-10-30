#!/usr/bin/env python3
"""Build a ZIP-based Zotero XPI from the current project sources."""

from __future__ import annotations

import json
import argparse
import hashlib
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACKAGE_ROOTS = ("chrome", "locale")
PACKAGE_FILES = ("bootstrap.js", "chrome.manifest", "manifest.json", "prefs.js", "icon.png", "icon@2x.png")
REQUIRED_FILES = (
    "bootstrap.js",
    "chrome.manifest",
    "manifest.json",
    "prefs.js",
    "icon.png",
    "icon@2x.png",
    "chrome/content/scripts/index.js",
    "chrome/content/js/taskRules.js",
    "chrome/content/js/literatureWorkflow.js",
    "chrome/content/js/diagnostics.js",
    "chrome/content/index.html",
    "locale/en-US/taskflow.ftl",
    "locale/zh-CN/taskflow.ftl",
    "chrome/content/icons/taskflow.svg",
)


def matching_update_entry(update_entries: list[dict], version: str, candidate: bool) -> dict | None:
    """Require a public feed entry for releases, but not for explicit local candidates."""
    matching = next((entry for entry in update_entries if entry.get("version") == version), None)
    if not matching and not candidate:
        raise ValueError("update.json must contain an entry matching manifest.json version")
    return matching


def validate_update_hash(update_entry: dict, package_path: Path) -> None:
    """Reject a release package whose feed checksum does not match its bytes."""
    declared = update_entry.get("update_hash", "")
    algorithm, separator, expected = declared.partition(":")
    if not separator or algorithm not in ("sha256", "sha512"):
        raise ValueError("update.json update_hash must use sha256 or sha512")
    actual = hashlib.new(algorithm, package_path.read_bytes()).hexdigest()
    if actual.lower() != expected.lower():
        raise ValueError("update.json update_hash does not match the built XPI")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, help='Write the XPI to this path instead of the repository default')
    parser.add_argument('--candidate', action='store_true',
                        help='Build an unreleased candidate without adding it to the public update feed')
    args = parser.parse_args()
    if args.candidate and not args.output:
        parser.error('--candidate requires --output so it cannot overwrite a release asset')
    manifest_path = ROOT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    version = manifest.get("version")
    if not isinstance(version, str) or not version.strip():
        raise ValueError("manifest.json must contain a non-empty version")

    update_feed = json.loads((ROOT / "update.json").read_text(encoding="utf-8"))
    addon_id = manifest.get("applications", {}).get("zotero", {}).get("id")
    update_url = manifest.get("applications", {}).get("zotero", {}).get("update_url")
    browser_zotero = manifest.get("browser_specific_settings", {}).get("zotero", {})
    if not addon_id or browser_zotero.get("id") != addon_id:
        raise ValueError("Zotero add-on IDs must match in both manifest sections")
    expected_update_url = "https://raw.githubusercontent.com/groele/Zotero-TaskFlow/main/update.json"
    if update_url != expected_update_url or browser_zotero.get("update_url") != expected_update_url:
        raise ValueError("Both manifest update URLs must point to the repository's main branch")
    update_entries = update_feed.get("addons", {}).get(addon_id, {}).get("updates", [])
    matching_update = matching_update_entry(update_entries, version, args.candidate)
    update_app = update_browser = None
    if matching_update:
        expected_update_link = (
            f"https://github.com/groele/Zotero-TaskFlow/releases/download/v{version}/"
            f"zotero-taskflow-{version}.xpi"
        )
        if matching_update.get("update_link") != expected_update_link:
            raise ValueError("update.json update_link must match the versioned GitHub Release asset")
        update_app = matching_update.get("applications", {}).get("zotero", {})
        update_browser = matching_update.get("browser_specific_settings", {}).get("zotero", {})

    for key in ("strict_min_version", "strict_max_version"):
        expected = manifest.get("applications", {}).get("zotero", {}).get(key)
        if key == "strict_min_version" and expected != "10.0.0":
            raise ValueError("This release line requires Zotero 10.0.0 or newer")
        if expected != browser_zotero.get(key):
            raise ValueError(f"Manifest Zotero compatibility fields do not match: {key}")
        if matching_update and (expected != update_app.get(key) or expected != update_browser.get(key)):
            raise ValueError(f"update.json compatibility fields do not match manifest.json: {key}")

    for relative in REQUIRED_FILES:
        if not (ROOT / relative).is_file():
            raise FileNotFoundError(f"Required package file is missing: {relative}")

    files = [ROOT / relative for relative in PACKAGE_FILES]
    for directory in PACKAGE_ROOTS:
        files.extend(path for path in (ROOT / directory).rglob("*") if path.is_file())
    files = sorted(set(files), key=lambda path: path.relative_to(ROOT).as_posix())

    target = args.output.resolve() if args.output else ROOT / f"zotero-taskflow-{version}.xpi"
    target.parent.mkdir(parents=True, exist_ok=True)
    temp_target = target.with_suffix(target.suffix + ".tmp")
    try:
        with zipfile.ZipFile(temp_target, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for path in files:
                archive.write(path, path.relative_to(ROOT).as_posix())
        with zipfile.ZipFile(temp_target, "r") as archive:
            bad_member = archive.testzip()
            if bad_member:
                raise zipfile.BadZipFile(f"Corrupt package member: {bad_member}")
            packaged_manifest = json.loads(archive.read("manifest.json"))
            if packaged_manifest.get("version") != version:
                raise ValueError("Packaged manifest version does not match source")
        if matching_update:
            validate_update_hash(matching_update, temp_target)
        temp_target.replace(target)
    finally:
        if temp_target.exists():
            temp_target.unlink()

    print(f"Built {target.name} ({target.stat().st_size} bytes, {len(files)} files)")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"XPI build failed: {error}", file=sys.stderr)
        raise SystemExit(1)
