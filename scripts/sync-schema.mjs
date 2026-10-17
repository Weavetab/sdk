#!/usr/bin/env node
// Syncs sdk/schema/*.json → website/public/schema/ (+ v1 aliases).
// Run on every SDK release so https://weavetab.dev/schema/* stays canonical.
// Usage: npm run sync:schema
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sdkRoot = path.resolve(__dirname, "..");
const webSchema = path.resolve(sdkRoot, "..", "website", "public", "schema");

const files = [
  { src: "plugin.json", latestId: "https://weavetab.dev/schema/plugin.json", v1Id: "https://weavetab.dev/schema/v1/plugin.json" },
  { src: "tool.json", latestId: "https://weavetab.dev/schema/tool.json", v1Id: "https://weavetab.dev/schema/v1/tool.json" },
];

for (const f of files) {
  const srcPath = path.join(sdkRoot, "schema", f.src);
  const raw = JSON.parse(fs.readFileSync(srcPath, "utf-8"));
  if (raw.$id !== f.latestId) {
    console.warn(`[sync:schema] WARN ${f.src} $id is "${raw.$id}", expected "${f.latestId}" — fix sdk/schema first.`);
  }
  const latestDest = path.join(webSchema, f.src);
  const v1Dest = path.join(webSchema, "v1", f.src);
  fs.mkdirSync(path.dirname(v1Dest), { recursive: true });
  fs.writeFileSync(latestDest, JSON.stringify({ ...raw, $id: f.latestId }, null, 2) + "\n");
  fs.writeFileSync(v1Dest, JSON.stringify({ ...raw, $id: f.v1Id }, null, 2) + "\n");
  console.log(`[sync:schema] ${f.src} → ${latestDest} + ${v1Dest}`);
}
console.log("[sync:schema] done.");
