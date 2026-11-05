# -*- coding: utf-8 -*-
"""
Helper script to calculate the exact XPI hash before build-package.py validation.
"""
import zipfile
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REQUIRED_FILES = (
    "bootstrap.js",
    "chrome.manifest",
    "manifest.json",
    "prefs.js",
    "icon.png",
    "icon@2x.png",
    "chrome/content/scripts/index.js",
    "chrome/content/scripts/itemPane.js",
    "chrome/content/js/taskRules.js",
    "chrome/content/js/literatureWorkflow.js",
    "chrome/content/js/diagnostics.js",
    "chrome/content/js/taskCard.js",
    "chrome/content/index.html",
    "locale/en-US/taskflow.ftl",
    "locale/zh-CN/taskflow.ftl",
    "chrome/content/icons/taskflow.svg",
)
PACKAGE_ROOTS = ("chrome", "locale")

files = [ROOT / relative for relative in REQUIRED_FILES]
for directory in PACKAGE_ROOTS:
    files.extend(path for path in (ROOT / directory).rglob("*") if path.is_file())
files = sorted(set(files), key=lambda path: path.relative_to(ROOT).as_posix())

temp_zip = ROOT / "calc_hash.tmp"
try:
    with zipfile.ZipFile(temp_zip, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            archive.write(path, path.relative_to(ROOT).as_posix())

    sha512 = hashlib.sha512(temp_zip.read_bytes()).hexdigest()

    update_file = ROOT / "update.json"
    with open(update_file, "r", encoding="utf-8") as f:
        update_data = json.load(f)

    update_data["addons"]["taskflow@groele.org"]["updates"][0]["update_hash"] = f"sha512:{sha512}"

    with open(update_file, "w", encoding="utf-8") as f:
        json.dump(update_data, f, indent=2, ensure_ascii=False)
        f.write("\n")
finally:
    if temp_zip.exists():
        temp_zip.unlink()
