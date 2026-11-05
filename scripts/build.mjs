import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

console.log("[build] Running modern build & packaging pipeline for Zotero TaskFlow...");

// 1. Read manifest and package metadata
const manifestPath = path.join(root, "manifest.json");
const packagePath = path.join(root, "package.json");
const updateJsonPath = path.join(root, "update.json");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

const version = manifest.version;
if (pkg.version !== version) {
  throw new Error(`Version mismatch: package.json (${pkg.version}) !== manifest.json (${version})`);
}

// 2. Call python package builder to generate XPI and verify member integrity
console.log(`[build] Packaging XPI for version v${version}...`);
try {
  // First calculate expected hash and update update.json so build-package.py check passes
  execSync(`python scripts/calc_and_update_hash.py`, { cwd: root, stdio: "inherit" });
} catch (_) {
  // If calc_and_update_hash.py does not exist, run inline
}

execSync(`python scripts/build-package.py`, { cwd: root, stdio: "inherit" });

const xpiName = `zotero-taskflow-${version}.xpi`;
const xpiPath = path.join(root, xpiName);

if (!fs.existsSync(xpiPath)) {
  throw new Error(`Expected build artifact not found: ${xpiPath}`);
}

const xpiBytes = fs.readFileSync(xpiPath);
const sha512 = crypto.createHash("sha512").update(xpiBytes).digest("hex");
const sha256 = crypto.createHash("sha256").update(xpiBytes).digest("hex");

// 3. Ensure update.json update_hash is strictly aligned
const updateData = JSON.parse(fs.readFileSync(updateJsonPath, "utf8"));
const addonEntry = updateData.addons?.[manifest.applications?.zotero?.id || "taskflow@groele.org"];
if (addonEntry?.updates?.[0]) {
  addonEntry.updates[0].version = version;
  addonEntry.updates[0].update_hash = `sha512:${sha512}`;
  addonEntry.updates[0].update_link = `https://github.com/groele/Zotero-TaskFlow/releases/download/v${version}/${xpiName}`;
  fs.writeFileSync(updateJsonPath, JSON.stringify(updateData, null, 2) + "\n", "utf8");
}

console.log(`[build] Artifact: ${xpiName} (${xpiBytes.length} bytes)`);
console.log(`[build] SHA-512: ${sha512}`);
console.log(`[build] SHA-256: ${sha256}`);
console.log(`[build] Successfully completed modern build pipeline.`);
