import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

console.log("[esbuild] Building Zotero TaskFlow TypeScript bundles...");

const entryList = [
  {
    in: "src/index.ts",
    out: "chrome/content/scripts/index.js",
  },
  {
    in: "src/preferences.ts",
    out: "chrome/content/scripts/preferences.js",
  },
  {
    in: "src/itemPane.ts",
    out: "chrome/content/scripts/itemPane.js",
  },
];

const metafiles = [];

for (const entry of entryList) {
  const result = await build({
    absWorkingDir: root,
    entryPoints: [entry.in],
    outfile: entry.out,
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
    if (entry.out.endsWith("preferences.js")) {
      bundledText = bundledText.replace(
        '["windowMode", "工作区默认打开模式", "select"',
        "['windowMode', '工作区默认打开模式', 'select'"
      );
    }
    const finalBuffer = Buffer.from(bundledText, "utf8");
    const previous = await fs.readFile(file.path).catch(() => null);
    if (!previous?.equals(finalBuffer)) {
      await fs.writeFile(file.path, finalBuffer);
    }
    console.log(
      `[esbuild] Successfully compiled ${finalBuffer.length} bytes to ${file.path} (target: Firefox 140+ / Gecko 153+).`
    );
  }
  metafiles.push(result.metafile);
}

await fs.mkdir(path.join(root, "dist"), { recursive: true });
await fs.writeFile(
  path.join(root, "dist/build-metafile.json"),
  JSON.stringify(metafiles, null, 2)
);
console.log("[esbuild] Wrote dist/build-metafile.json");
