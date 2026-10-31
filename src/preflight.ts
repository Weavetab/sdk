import fs from "node:fs";
import path from "node:path";

export interface PreflightResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

export function runPreflight(cwd = process.cwd()): PreflightResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const manifestPath = path.join(cwd, "weavetab.json");
  const pkgJsonPath = path.join(cwd, "package.json");
  const readmePath = path.join(cwd, "README.md");

  // 1. package.json checks
  if (!fs.existsSync(pkgJsonPath)) {
    errors.push("missing package.json in plugin root");
    return { success: false, errors, warnings };
  }

  let pkgJson: Record<string, any> = {};
  try {
    pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
  } catch (err: any) {
    errors.push(`invalid package.json: ${err.message}`);
    return { success: false, errors, warnings };
  }

  // 2. weavetab.json checks
  if (!fs.existsSync(manifestPath)) {
    errors.push("missing weavetab.json manifest in plugin root");
    return { success: false, errors, warnings };
  }

  let manifest: Record<string, any> = {};
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  } catch (err: any) {
    errors.push(`invalid weavetab.json: ${err.message}`);
    return { success: false, errors, warnings };
  }

  const pkgName = pkgJson.name || manifest.name || "";
  if (!pkgName) {
    errors.push("manifest or package.json must define a 'name'");
  }

  // Namespace spoofing guard: only official first-party packages can use @weavetab/
  if (pkgName.startsWith("@weavetab/") && !process.env.WEAVETAB_OFFICIAL_RELEASE) {
    warnings.push("package uses official '@weavetab/' scope; reserved for first-party plugins");
  }

  // Anti-squatting rule: no arbitrary short id in weavetab.json
  if (manifest.id) {
    warnings.push("field 'id' in weavetab.json is ignored; package identity is strictly its npm package name");
  }

  // Version check
  if (!manifest.version && !pkgJson.version) {
    errors.push("missing version in weavetab.json and package.json");
  }

  // Engine dependency
  if (!manifest.engines?.weavetab && !pkgJson.engines?.weavetab) {
    warnings.push("missing 'engines.weavetab' declaration; defaults to latest runtime");
  }

  // 3. README check
  if (!fs.existsSync(readmePath)) {
    errors.push("missing README.md; required for marketplace indexing and discoverability");
  } else {
    const readmeContent = fs.readFileSync(readmePath, "utf-8").trim();
    if (readmeContent.length < 40) {
      warnings.push("README.md is very brief; consider documenting tools and usage");
    }
  }

  // 4. Permissions Reason Audit
  const perms = manifest.permissions;
  if (perms && typeof perms === "object" && !Array.isArray(perms)) {
    for (const [category, val] of Object.entries(perms)) {
      if (val && typeof val === "object") {
        const reason = (val as any).reason;
        if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
          errors.push(`permission category '${category}' must declare a descriptive 'reason'`);
        }
      }
    }
  }

  // 5. Build Artifact & Entry point check
  const entryRel = manifest.entry || pkgJson.main || "dist/index.js";
  const entryAbs = path.join(cwd, entryRel);
  if (!fs.existsSync(entryAbs)) {
    errors.push(`entry point '${entryRel}' not found on disk; run 'npm run build' first`);
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}
