---
title: "Testing Suites"
description: "Unit, integration, E2E, and benchmark tests."
product: sdk
section: developers-contributors
icon: FlaskConical
slug: dev-testing
---

# Testing Suites

```
tests/
├── unit/           # Unit tests (Zod schemas, delta engine, config merge)
├── integration/    # CDP connection and security pipeline tests
├── e2e/            # Smoke tests running real browser automation
└── benchmarks/     # Latency and token efficiency benchmarks
```

```bash
# Run unit tests
npm run test:unit

# Run full test suite
npm test
```
