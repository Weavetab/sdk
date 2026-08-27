---
title: "Contributing Guide"
description: "Code standards, pull request workflow, and security disclosures."
product: sdk
section: developers-contributors
icon: GitPullRequest
slug: contributing
---

# Contributing to Weavetab

We welcome contributions from the community!

## Contribution Workflow

1. Fork the repository on GitHub
2. Create a feature branch: `git checkout -b feature/my-enhancement`
3. Commit your changes: `git commit -m "feat: add support for new feature"`
4. Run tests: `npm test`
5. Open a Pull Request on GitHub

## Code Guidelines

- All tools must adhere to strict Zod runtime argument validation.
- Every tool action must execute through the `withSecurity()` pipeline.
- Maintain zero-cloud computation: no remote data transmissions without explicit opt-in.
