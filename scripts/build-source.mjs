import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

console.log("[esbuild] Building Zotero TaskFlow host bundle from src/index.ts...");

const result = await build({
  absWorkingDir: root,
  entryPoints: ["src/index.ts"],
  outfile: "chrome/content/scripts/index.js",
  bundle: true,
  format: "iife",
  target: ["firefox140"],
  charset: "utf8",
  treeShaking: true,
  minify: false,
  legalComments: "inline",
  write: false,
  metafile: true,
});

for (const file of result.outputFiles) {
  let bundledText = Buffer.from(file.contents).toString("utf8");
  bundledText = bundledText.replace(/\r\n/g, "\n");
  const finalBuffer = Buffer.from(bundledText, "utf8");
  const previous = await fs.readFile(file.path).catch(() => null);
  if (!previous?.equals(finalBuffer)) {
    await fs.writeFile(file.path, finalBuffer);
  }
  console.log(
    `[esbuild] Successfully compiled ${finalBuffer.length} bytes to ${file.path} (target: Firefox 140+ / Gecko 153+).`
  );
}

await fs.mkdir(path.join(root, "dist"), { recursive: true });
await fs.writeFile(
  path.join(root, "dist/build-metafile.json"),
  JSON.stringify(result.metafile, null, 2)
);
console.log("[esbuild] Wrote dist/build-metafile.json");
