---
title: "Contributing Guide"
description: "Engineering standards, PR workflows, issue claiming, anti-slop guidelines, and security policies for Weavetab contributors."
product: sdk
section: developers-contributors
order: 1
icon: GitPullRequest
slug: contributing
---

# Contributing to Weavetab SDK

We welcome community contributions across `@weavetab/mcp`, `@weavetab/sdk`, and `@weavetab/skills`. To maintain reliability across thousands of local browser sessions, all contributions must adhere to our engineering standards.

---

## 1. Claiming Issues (`/claim`)

We prevent duplicate efforts and collisions by letting contributors claim open issues before coding:

1. **Claiming**: Comment `/claim` on any open, unassigned issue in the repository.
   - The bot assigns the issue to you and attaches the `claimed` label.
   - You receive an exclusive **7-day claim window** to develop your PR.
2. **Releasing**: If you cannot finish or need to pause, comment `/unclaim` to release the issue for someone else.
3. **Automatic Expiry**: Claims without an active linked PR automatically expire after **7 days** (swept nightly by GitHub Actions).

---

## 2. Development Principles

1. **Zero Cloud Telemetry**: Weavetab runs locally. Never add background telemetry, analytics pings, or cloud API requirements without explicit, optional user opt-in.
2. **Deterministic Browser Automation**: Prefer deterministic CDP element targets (`browser_click`, `browser_fill`) over arbitrary script execution. Handle dynamic rendering, popups, and timeouts defensively.
3. **Tri-Package Lockstep Law**: Any architectural change affecting types, interfaces, or protocol contracts must keep `@weavetab/mcp`, `@weavetab/sdk`, and `@weavetab/skills` on the exact same version with zero API drift.
4. **Context Window Protection**: Never inject unconstrained prompts into agent context. All plugin instructions must respect the context budget (`<= 3200 chars`).
5. **Anti-AI Slop Standards**: Write human, idiomatic TypeScript. Avoid boilerplate layers, redundant comments, generic variable names (`data`, `result`, `item`), and generic buzzwords.

---

## 3. Pull Request Workflow & Sizing Gate

1. **Branch**: Create a branch off `main`:
   ```bash
   git checkout -b feature/my-feature
   ```
2. **Develop & Test**: Implement changes with typed tests:
   ```bash
   npm test
   ```
3. **Verify Anti-Drift**:
   ```bash
   npm run verify
   ```
4. **Hard Line-Budget Gate (+500 Lines)**:
   - PR additions must not exceed **+500 lines** of functional code (excluding lockfiles, compiled bundles, and fixtures).
   - PRs exceeding this limit will be automatically blocked by our **PR Guard** action (`size/blocked-over-500`).
   - If a feature is larger than 500 lines, split it into smaller logical PRs.
5. **Mandatory AI Agent Disclosure**:
   - In `.github/PULL_REQUEST_TEMPLATE.md`, select the primary AI assistant or workflow used (e.g. Antigravity, Claude Code, Cursor, Windsurf, Copilot, or 100% Human).
6. **Commit Style**: Use conventional commit prefixes:
   - `feat:` New tools, CLI commands, or capabilities.
   - `fix:` Bug fixes, error handling corrections.
   - `docs:` Documentation improvements in `/docs`.
   - `refactor:` Code improvements without behavioral changes.
7. **Submit PR**: Open a Pull Request referencing your claimed issue (`Fixes #123`).

---

## 4. Security & Vulnerability Disclosures

If you discover a security vulnerability (such as a CDP sandbox escape, path traversal, or credential leak), do NOT open a public GitHub issue.

Please report security issues directly via private vulnerability reporting on the GitHub repository or consult `SECURITY.md`.
