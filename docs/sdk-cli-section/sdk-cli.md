---
title: "SDK Developer CLI"
description: "Reference manual for the Weavetab developer CLI: init, build, manifest, dev, preflight, validate, doctor, and publish."
product: sdk
section: sdk-cli-section
order: 1
icon: Terminal
slug: sdk-cli
---

# SDK Developer CLI Reference

The `@weavetab/sdk` package provides a command-line interface for scaffolding, building, testing, auditing, and publishing Weavetab plugins.

You can run the CLI via `npx @weavetab/sdk <command>` or `weavetab <command>` when installed globally or in your npm scripts.

```bash
# Common workflow
weavetab init my-plugin      # 1. Scaffold project
cd my-plugin
weavetab dev                # 2. Develop in watch mode
weavetab preflight          # 3. Audit permissions & instructions budget
weavetab publish            # 4. Ship to registry & npm
```

---

## Command Reference

### `weavetab init <name>`
Scaffolds a new plugin repository with strict TypeScript configuration, Zod validation, and a schema-compliant `weavetab.json` declaring inline agent instructions.

```bash
# Scaffold into a new directory
weavetab init my-custom-plugin

# Scaffold into current directory
weavetab init .
```

---

### `weavetab build`
Compiles TypeScript source code (`src/` -> `dist/`), runs preflight audits, and automatically updates `weavetab.json` with extracted tool, command, prompt, and resource schemas.

```bash
weavetab build
```

---

### `weavetab dev`
Runs the TypeScript compiler in watch mode with automatic manifest synchronization on file change.

```bash
weavetab dev
```

---

### `weavetab manifest` (alias: `weavetab schema`)
Scans the compiled plugin entrypoint (`dist/index.js`) and synchronizes exported `tools`, `commands`, `prompts`, and `resources` directly into `weavetab.json`.

```bash
weavetab manifest
```

---

### `weavetab preflight`
Performs comprehensive quality, security, and context budget audits before publishing:
1. **Context Window Audit**: Verifies that agent instructions are declared in `weavetab.json` (or fallback `AGENTS.md`) and do not violate budget limits (`>= 20 chars`, `<= 3200 chars`, `<= 80 lines`).
2. **Permission Check**: Verifies that all registered tools, commands, and hooks have matching permissions declared in `weavetab.json` with valid `reason` strings.
3. **Anti-Squatting Check**: Validates package name against npm registry standards.
4. **Binary Target Check**: Ensures entrypoint files exist and export a valid plugin definition.

```bash
# Standard preflight audit
weavetab preflight

# Strict mode (warnings treated as fatal errors)
weavetab preflight --strict
```

---

### `weavetab validate`
Validates `weavetab.json` against the official JSON Schema (`https://weavetab.dev/schema/plugin.json`).

```bash
# Standard schema validation
weavetab validate

# Offline mode (skips remote schema fetch)
weavetab validate --offline
```

---

### `weavetab doctor`
Runs environment diagnostics across the current system:
- Verifies Node.js engine compatibility (`>= 18.0.0`).
- Checks TypeScript compiler presence and version.
- Validates local `~/.weavetab/` storage directory permissions.
- Inspects workspace plugins and reports configuration warnings.

```bash
weavetab doctor
```

---

### `weavetab publish`
Executes preflight audit, compiles production assets, verifies git tag status, and publishes the package to the npm registry while dispatching metadata to `weavetab.dev/discover`.

```bash
# Preview build and manifest without publishing
weavetab publish --dry-run

# Publish to npm (requires interactive confirmation)
weavetab publish
```

---

### `weavetab version`
Prints the active `@weavetab/sdk` version.

```bash
weavetab version
```

---

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success / All checks passed. |
| `1` | Validation or audit error (manifest schema error, instructions over budget, missing permission). |
| `2` | Build or compilation failure (TypeScript compiler error). |
| `127` | Command or entrypoint file not found. |
